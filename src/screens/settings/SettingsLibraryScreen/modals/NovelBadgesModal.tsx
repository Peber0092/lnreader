import React from 'react';

import { Checkbox, Dialog } from '@components';
import { getString } from '@i18n/translations';
import { ThemeColors } from '@theme/types';
import { useLibrarySettings } from '@hooks/persisted';

interface NovelBadgesModalProps {
  novelBadgesModalVisible: boolean;
  hideNovelBadgesModal: () => void;
  theme: ThemeColors;
}

const NovelBadgesModal: React.FC<NovelBadgesModalProps> = ({
  novelBadgesModalVisible,
  hideNovelBadgesModal,
  theme,
}) => {
  const {
    showNumberOfNovels = false,
    showUnreadBadges = true,
    showStatusBadges = false,
    showContinueReadingButton = false,
    setLibrarySettings,
  } = useLibrarySettings();
  return (
    <Dialog.Root
      visible={novelBadgesModalVisible}
      onDismiss={hideNovelBadgesModal}
    >
      <Dialog.Title>
        {getString('libraryScreen.bottomSheet.display.overlays')}
      </Dialog.Title>
      <Dialog.List>
        <Checkbox
          label={getString('libraryScreen.bottomSheet.display.unreadBadges')}
          status={showUnreadBadges}
          onPress={() =>
            setLibrarySettings({
              showUnreadBadges: !showUnreadBadges,
            })
          }
          theme={theme}
        />
        <Checkbox
          label={getString('libraryScreen.bottomSheet.display.statusBadges')}
          status={showStatusBadges}
          onPress={() =>
            setLibrarySettings({
              showStatusBadges: !showStatusBadges,
            })
          }
          theme={theme}
        />
        <Checkbox
          label={getString('libraryScreen.bottomSheet.display.showNoOfItems')}
          status={showNumberOfNovels}
          onPress={() =>
            setLibrarySettings({
              showNumberOfNovels: !showNumberOfNovels,
            })
          }
          theme={theme}
        />
        <Checkbox
          label={getString(
            'libraryScreen.bottomSheet.display.continueReadingButton',
          )}
          status={showContinueReadingButton}
          onPress={() =>
            setLibrarySettings({
              showContinueReadingButton: !showContinueReadingButton,
            })
          }
          theme={theme}
        />
      </Dialog.List>
    </Dialog.Root>
  );
};

export default NovelBadgesModal;
