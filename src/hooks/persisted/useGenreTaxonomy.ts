import { useMemo } from 'react';
import { useMMKVObject } from 'react-native-mmkv';
import { GENRE_TAXONOMY, TaxonomyNode } from '@screens/GenreStatsScreen/taxonomy';
import { normalizeGenre } from '@screens/GenreStatsScreen/utils';
import { getMMKVObject, setMMKVObject } from '@utils/mmkv/mmkv';

export const TAXONOMY_KEY = 'GENRE_TAXONOMY';

export const registerGenresToTaxonomy = (rawGenres: string) => {
  if (!rawGenres || !rawGenres.trim()) return;

  const currentTaxonomy = getMMKVObject<TaxonomyNode[]>(TAXONOMY_KEY) || GENRE_TAXONOMY;
  const tags = rawGenres.split(',').map(t => t.trim()).filter(Boolean);
  if (!tags.length) return;

  // Collect all known normalized genres across parents and children
  const knownGenres = new Set<string>();
  for (const node of currentTaxonomy) {
    knownGenres.add(normalizeGenre(node.parent));
    for (const child of node.children) {
      knownGenres.add(normalizeGenre(child));
    }
  }

  // Find unknown tags
  const newTags: string[] = [];
  for (const tag of tags) {
    const normalized = normalizeGenre(tag);
    if (!knownGenres.has(normalized)) {
      newTags.push(tag);
      knownGenres.add(normalized);
    }
  }

  if (newTags.length > 0) {
    let otherNode = currentTaxonomy.find(t => normalizeGenre(t.parent) === normalizeGenre('Other'));
    let updatedTaxonomy: TaxonomyNode[];

    if (otherNode) {
      updatedTaxonomy = currentTaxonomy.map(t =>
        t === otherNode
          ? { ...t, children: [...t.children, ...newTags] }
          : t
      );
    } else {
      updatedTaxonomy = [
        ...currentTaxonomy,
        { parent: 'Other', children: newTags },
      ];
    }
    setMMKVObject(TAXONOMY_KEY, updatedTaxonomy);
  }
};

export const useGenreTaxonomy = () => {
  const [taxonomyRaw, setTaxonomyRaw] =
    useMMKVObject<TaxonomyNode[]>(TAXONOMY_KEY);

  const taxonomy = useMemo(() => {
    if (!taxonomyRaw || taxonomyRaw.length === 0) {
      return GENRE_TAXONOMY;
    }
    // If it's the old 3-item default from previous test builds, upgrade to the full 6-pillar taxonomy
    if (
      taxonomyRaw.length === 3 &&
      taxonomyRaw.some(t => t.parent === 'Lead') &&
      taxonomyRaw.some(t => t.parent === 'Romance')
    ) {
      setMMKVObject(TAXONOMY_KEY, GENRE_TAXONOMY);
      return GENRE_TAXONOMY;
    }
    return taxonomyRaw;
  }, [taxonomyRaw]);

  const setTaxonomy = (value: TaxonomyNode[]) => setTaxonomyRaw(value);

  return { taxonomy, setTaxonomy } as const;
};
