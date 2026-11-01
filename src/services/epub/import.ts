import dayjs from 'dayjs';
import {
  updateNovelCategoryById,
  updateNovelInfo,
} from '@database/queries/NovelQueries';
import { LOCAL_PLUGIN_ID } from '@plugins/pluginManager';
import { getString } from '@i18n/translations';
import { NOVEL_STORAGE } from '@utils/Storages';
import { dbManager } from '@database/db';
import { novelSchema, chapterSchema } from '@database/schema';
import type {
  BackgroundTaskMetadata,
  EpubImportFile,
  TaskProgressUpdater,
} from '@services/backgroundTasks/contracts';
import NativeFile from '@modules/native-file';
import NativeZipArchive from '@modules/native-zip-archive';
import { epub } from '@modules/nitro-epub';
import { showToast } from '@utils/showToast';
import { createImportProgressReporter } from './importProgress';
import { registerGenresToTaxonomy } from '@hooks/persisted/useGenreTaxonomy';

const decodePath = (path: string) => {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
};

const insertLocalNovel = async (
  name: string,
  path: string,
  cover?: string,
  author?: string,
  artist?: string,
  summary?: string,
  genres?: string,
  comment?: string,
) => {
  const { insertId } = await dbManager.write(async tx => {
    return tx
      .insert(novelSchema)
      .values({ name, path, pluginId: 'local', inLibrary: true, isLocal: true })
      .run();
  });

  if (insertId !== undefined && insertId >= 0) {
    await updateNovelCategoryById(insertId, [2]);
    const novelDir = NOVEL_STORAGE + '/local/' + insertId;
    await NativeFile.mkdir(novelDir);
    const newCoverPath = `file://${novelDir}/${cover?.split(/[/\\]/).pop()}`;

    if (cover) {
      const decodedPath = decodePath(cover);
      if (await NativeFile.exists(decodedPath)) {
        await NativeFile.moveFile(decodedPath, newCoverPath);
      }
    }
    await updateNovelInfo({
      id: insertId,
      pluginId: LOCAL_PLUGIN_ID,
      author: author,
      artist: artist,
      summary: summary,
      genres: genres,
      comment: comment,
      path: NOVEL_STORAGE + '/local/' + insertId,
      cover: newCoverPath,
      name: name,
      inLibrary: true,
      isLocal: true,
      totalPages: 0,
    });
    if (genres) {
      registerGenresToTaxonomy(genres);
    }
    return insertId;
  }
  throw new Error(getString('advancedSettingsScreen.novelInsertFailed'));
};

const FILE_CONCURRENCY = 8;
const ASSET_CONCURRENCY = 8;
const DB_BATCH_SIZE = 100;

const findOpfPath = async (dir: string): Promise<string | null> => {
  try {
    const containerPath = dir + '/META-INF/container.xml';
    if (await NativeFile.exists(containerPath)) {
      const xml = await NativeFile.readFile(containerPath);
      const match = xml.match(/full-path=["']([^"']+\.opf)["']/i);
      if (match && match[1]) {
        const full = dir + '/' + match[1];
        if (await NativeFile.exists(full)) {
          return full;
        }
      }
    }
  } catch {}
  for (const candidate of [
    dir + '/content.opf',
    dir + '/EPUB/content.opf',
    dir + '/OEBPS/content.opf',
  ]) {
    if (await NativeFile.exists(candidate)) {
      return candidate;
    }
  }
  return null;
};

const extractCommentFromOpf = async (
  opfPath: string | null,
): Promise<string | undefined> => {
  if (!opfPath) return undefined;
  try {
    const xml = await NativeFile.readFile(opfPath);
    // 1. <meta name="comment">value</meta>
    const matchTag = xml.match(
      /<meta[^>]*name=["']comment["'][^>]*>([\s\S]*?)<\/meta>/i,
    );
    if (matchTag && matchTag[1].trim()) return matchTag[1].trim();

    // 2. <meta property="comment">value</meta>
    const matchProp = xml.match(
      /<meta[^>]*property=["']comment["'][^>]*>([\s\S]*?)<\/meta>/i,
    );
    if (matchProp && matchProp[1].trim()) return matchProp[1].trim();

    // 3. <meta name="comment" content="value" />
    const matchContent = xml.match(
      /<meta[^>]*name=["']comment["'][^>]*content=["']([^"']*)["']/i,
    );
    if (matchContent && matchContent[1].trim()) return matchContent[1].trim();

    // 4. <comment>value</comment>
    const matchCustom = xml.match(/<comment>([\s\S]*?)<\/comment>/i);
    if (matchCustom && matchCustom[1].trim()) return matchCustom[1].trim();
  } catch (e) {
    console.warn('Failed to extract comment from OPF:', e);
  }
  return undefined;
};

export const importEpub = async (
  { uri, filename }: EpubImportFile,
  setMeta: TaskProgressUpdater,
) => {
  setMeta(meta => ({
    ...meta,
    isRunning: true,
    progress: 0,
  }));

  const epubFilePath = NativeFile.ExternalCachesDirectoryPath + '/novel.epub';
  const epubDirPath = NativeFile.ExternalCachesDirectoryPath + '/epub';

  try {
    if (await NativeFile.exists(epubDirPath)) {
      await NativeFile.unlink(epubDirPath);
    }
    await NativeFile.mkdir(epubDirPath);
    await NativeFile.copyFile(uri, epubFilePath);
    await NativeZipArchive.unzip(epubFilePath, epubDirPath);

    const opfPath = await findOpfPath(epubDirPath);
    const comment = await extractCommentFromOpf(opfPath);

    const novel = await epub.parseNovelAndChapters(epubDirPath);
    if (!novel.name) {
      novel.name = filename.replace('.epub', '') || 'Untitled';
    }
    const novelId = await insertLocalNovel(
      novel.name,
      epubDirPath + novel.name, // temporary
      novel.cover || '',
      novel.author || '',
      novel.artist || '',
      novel.summary || '',
      novel.genres || '',
      comment,
    );
    const novelDir = `${NOVEL_STORAGE}/local/${novelId}`;
    const now = dayjs().toISOString();

    if (novel.chapters && novel.chapters.length > 0) {
      const totalChapters = novel.chapters.length;
      const reportProgress = createImportProgressReporter(setMeta);

      const chapterRows = novel.chapters.map((chapter, i) => ({
        novelId,
        name: chapter.name || chapter.path.split(/[/\\]/).pop() || 'unknown',
        path: `${NOVEL_STORAGE}/local/${novelId}/${i}`,
        releaseTime: now,
        position: i,
        isDownloaded: true,
      }));

      // 1. Batch insert all chapters into SQLite in a single transaction
      const chapterIdByPosition = new Map<number, number>();

      await dbManager.write(async tx => {
        for (let i = 0; i < chapterRows.length; i += DB_BATCH_SIZE) {
          const batch = chapterRows.slice(i, i + DB_BATCH_SIZE);
          const inserted = await tx
            .insert(chapterSchema)
            .values(batch)
            .returning({
              id: chapterSchema.id,
              position: chapterSchema.position,
            })
            .all();

          for (const row of inserted) {
            chapterIdByPosition.set(row.position, row.id);
          }
        }
      });

      if (chapterIdByPosition.size !== totalChapters) {
        throw new Error(getString('advancedSettingsScreen.chapterInsertFailed'));
      }

      // 2. Concurrently read, rewrite URLs, and write chapter HTML files
      let nextChapterIdx = 0;
      let completedChapters = 0;

      const processChapterWorker = async () => {
        while (nextChapterIdx < totalChapters) {
          const idx = nextChapterIdx++;
          const chapter = novel.chapters![idx];
          const chapterId = chapterIdByPosition.get(idx);

          if (chapterId !== undefined) {
            try {
              const chapterText = await NativeFile.readFile(
                decodePath(chapter.path),
              );
              if (chapterText) {
                const processedText = chapterText.replace(
                  /[=](?<= href=| src=)(["'])([^]*?)\1/g,
                  (_, __, $2: string) =>
                    `="file://${novelDir}/${$2.split(/[/\\]/).pop()}"`,
                );
                const chapterDir = `${novelDir}/${chapterId}`;
                await NativeFile.mkdir(chapterDir);
                await NativeFile.writeFile(
                  `${chapterDir}/index.html`,
                  processedText,
                );
              }
            } catch {
              // Ignore non-fatal individual chapter read/write error
            }
          }

          completedChapters++;
          reportProgress(
            completedChapters,
            totalChapters,
            chapter.name || chapterRows[idx].name,
          );
        }
      };

      const workerCount = Math.min(FILE_CONCURRENCY, totalChapters);
      await Promise.all(
        Array.from({ length: workerCount }, () => processChapterWorker()),
      );
    }

    // 3. Move static assets (images and stylesheets) concurrently
    const staticFiles = [
      ...(novel.imagePaths || []),
      ...(novel.cssPaths || []),
    ];

    if (staticFiles.length > 0) {
      setMeta(meta => ({
        ...meta,
        progressText: getString('advancedSettingsScreen.importStaticFiles'),
      }));

      let nextAssetIdx = 0;
      const moveAssetWorker = async () => {
        while (nextAssetIdx < staticFiles.length) {
          const filePath = staticFiles[nextAssetIdx++];
          const decodedPath = decodePath(filePath);
          try {
            if (await NativeFile.exists(decodedPath)) {
              await NativeFile.moveFile(
                decodedPath,
                `${novelDir}/${filePath.split(/[/\\]/).pop()}`,
              );
            }
          } catch {
            // Ignore non-fatal individual asset move error
          }
        }
      };

      const assetWorkerCount = Math.min(ASSET_CONCURRENCY, staticFiles.length);
      await Promise.all(
        Array.from({ length: assetWorkerCount }, () => moveAssetWorker()),
      );
    }

    // 4. Clean up temporary unzipped EPUB cache
    try {
      if (await NativeFile.exists(epubDirPath)) {
        await NativeFile.unlink(epubDirPath);
      }
      if (await NativeFile.exists(epubFilePath)) {
        await NativeFile.unlink(epubFilePath);
      }
    } catch {
      // Non-fatal cache cleanup
    }
  } catch (error) {
    showToast(
      getString('advancedSettingsScreen.importFailed'),
      (error as Error).message,
    );
  }

  setMeta(meta => ({
    ...meta,
    progress: 1,
    isRunning: false,
  }));
};

export const importEpubBatch = async (
  { files }: { files: EpubImportFile[] },
  setMeta: TaskProgressUpdater,
) => {
  if (!files.length) return;

  const failures: string[] = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    let fileMeta: BackgroundTaskMetadata = {
      name: file.filename,
      isRunning: true,
      progress: 0,
      progressText: undefined,
    };
    let progressError: unknown;
    const updateFileProgress: TaskProgressUpdater = transformer => {
      fileMeta = transformer(fileMeta);
      try {
        setMeta(meta => ({
          ...meta,
          isRunning: true,
          progress: (index + (fileMeta.progress ?? 0)) / files.length,
          progressText: `${index + 1}/${files.length} · ${file.filename}${
            fileMeta.progressText ? ` · ${fileMeta.progressText}` : ''
          }`,
        }));
      } catch (error) {
        progressError = error;
        throw error;
      }
    };

    try {
      await importEpub(file, updateFileProgress);
    } catch (error) {
      if (error === progressError) throw error;

      failures.push(
        `${file.filename}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  setMeta(meta => ({
    ...meta,
    progress: 1,
    isRunning: false,
  }));

  if (failures.length) {
    throw new Error(
      `${failures.length} of ${
        files.length
      } EPUB imports failed: ${failures.join('; ')}`,
    );
  }
};
