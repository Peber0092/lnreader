import React, { memo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { Dialog } from '@components';
import { ThemeColors } from '@theme/types';
import { getString } from '@i18n/translations';

interface NovelCommentModalProps {
  theme: ThemeColors;
  visible: boolean;
  comment?: string | null;
  onDismiss: () => void;
  onEdit: () => void;
}

const NovelCommentModal = ({
  theme,
  visible,
  comment,
  onDismiss,
  onEdit,
}: NovelCommentModalProps) => {
  const hasComment = Boolean(comment && comment.trim().length > 0);

  return (
    <Dialog.Root visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>{getString('novelScreen.comment')}</Dialog.Title>
      <Dialog.ScrollArea>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {hasComment ? (
            <Text style={[{ color: theme.onSurface }, styles.commentText]}>
              {comment}
            </Text>
          ) : (
            <Text
              style={[{ color: theme.onSurfaceVariant }, styles.emptyComment]}
            >
              {getString('novelScreen.noComment')}
            </Text>
          )}
        </ScrollView>
      </Dialog.ScrollArea>
      <Dialog.Actions>
        <Dialog.Action
          title={getString('common.edit')}
          onPress={() => {
            onDismiss();
            onEdit();
          }}
        />
        <Dialog.Action
          title={getString('common.close')}
          onPress={onDismiss}
        />
      </Dialog.Actions>
    </Dialog.Root>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    paddingVertical: 8,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
  },
  emptyComment: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default memo(NovelCommentModal);
