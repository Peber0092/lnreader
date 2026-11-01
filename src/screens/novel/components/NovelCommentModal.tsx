import React, { memo, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import { Dialog } from '@components';
import { ThemeColors } from '@theme/types';
import { NovelInfo } from '@database/types';
import { getString } from '@i18n/translations';
import { updateNovelInfo } from '@database/queries/NovelQueries';
import { showToast } from '@utils/showToast';

interface NovelCommentModalProps {
  theme: ThemeColors;
  visible: boolean;
  novel?: NovelInfo;
  setNovel?: (novel: NovelInfo | undefined) => void;
  onDismiss: () => void;
}

const NovelCommentModal = ({
  theme,
  visible,
  novel,
  setNovel,
  onDismiss,
}: NovelCommentModalProps) => {
  const [commentText, setCommentText] = useState(novel?.comment || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setCommentText(novel?.comment || '');
    }
  }, [novel?.comment, visible]);

  const handleSave = async () => {
    if (!novel) return;
    setSaving(true);
    try {
      const nextComment = commentText.trim() || null;
      const updatedNovel: NovelInfo = {
        ...novel,
        comment: nextComment,
      };
      await updateNovelInfo(updatedNovel);
      setNovel?.(updatedNovel);
      showToast(getString('common.done') || 'Saved');
      onDismiss();
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root visible={visible} onDismiss={() => !saving && onDismiss()}>
      <Dialog.Title>{getString('novelScreen.comment')}</Dialog.Title>
      <Dialog.Content>
        <TextInput
          value={commentText}
          placeholder={getString('novelScreen.comment')}
          mode="outlined"
          multiline
          numberOfLines={4}
          theme={{ colors: { ...theme } }}
          onChangeText={setCommentText}
          style={styles.textInput}
        />
      </Dialog.Content>
      <Dialog.Actions>
        <Dialog.Action
          title={getString('common.cancel')}
          disabled={saving}
          onPress={onDismiss}
        />
        <Dialog.Action
          title={getString('common.save')}
          disabled={saving}
          onPress={handleSave}
        />
      </Dialog.Actions>
    </Dialog.Root>
  );
};

const styles = StyleSheet.create({
  textInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});

export default memo(NovelCommentModal);
