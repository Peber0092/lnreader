import { ScrollView, StyleSheet } from 'react-native';

import { Appbar, List, SafeAreaView } from '@components';
import { useBoolean } from '@hooks';
import {
  useAppSettings,
  useCategories,
  useLibrarySettings,
  useTheme,
} from '@hooks/persisted';
import { getString } from '@i18n/translations';
import type { StringMap } from '@i18n/types';
import { LibrarySettingsScreenProps } from '@navigators/types';
import {
  DisplayModes,
  displayModesList,
  LibrarySortOrder,
} from '@screens/library/constants/constants';
import { Portal } from 'react-native-paper';

import DefaultChapterSortModal from '../components/DefaultChapterSortModal';
import SettingSwitch from '../components/SettingSwitch';
import DefaultCategoryDialog from './DefaultCategoryDialog';
import DisplayModeModal from './modals/DisplayModeModal';
import GridSizeModal from './modals/GridSizeModal';
import NovelBadgesModal from './modals/NovelBadgesModal';
import NovelSortModal from './modals/NovelSortModal';

type LibrarySortLabel = Extract<
  keyof StringMap,
  `libraryScreen.bottomSheet.sortOrders.${string}`
>;

const SORT_ORDER_LABELS: Record<string, LibrarySortLabel> = {
  name: 'libraryScreen.bottomSheet.sortOrders.alphabetically',
  chaptersDownloaded: 'libraryScreen.bottomSheet.sortOrders.download',
  chaptersUnread: 'libraryScreen.bottomSheet.sortOrders.totalChapters',
  id: 'libraryScreen.bottomSheet.sortOrders.dateAdded',
  lastReadAt: 'libraryScreen.bottomSheet.sortOrders.lastRead',
  lastUpdatedAt: 'libraryScreen.bottomSheet.sortOrders.lastUpdated',
};

const SettingsLibraryScreen = ({ navigation }: LibrarySettingsScreenProps) => {
  const theme = useTheme();
  const {
    displayMode = DisplayModes.Comfortable,
    novelsPerRow = 3,
    showNumberOfNovels = false,
    showUnreadBadges = true,
    showStatusBadges = false,
    showContinueReadingButton = false,
    sortOrder = LibrarySortOrder.DateAdded_DESC,
    defaultCategoryId,
    promptForCategoryOnAdd = false,
    setLibrarySettings,
  } = useLibrarySettings();
  const { defaultChapterSort, setAppSettings, useLibraryFAB } =
    useAppSettings();
  const { categories } = useCategories();

  const displayModal = useBoolean();
  const defaultCategoryDialog = useBoolean();
  const gridSizeModal = useBoolean();
  const novelBadgesModal = useBoolean();
  const novelSortModal = useBoolean();
  const defaultChapterSortModal = useBoolean();
  const appDefaultCategory = categories.find(category => category.id === 1);
  const selectedDefaultCategory = categories.find(
    category => category.id === defaultCategoryId,
  );
  const selectableCategories = categories.filter(
    category => category.id === 1 || category.id > 2,
  );

  const setDefaultCategory = (categoryId: number) => {
    setLibrarySettings({
      defaultCategoryId: categoryId === 1 ? undefined : categoryId,
      promptForCategoryOnAdd: false,
    });
    defaultCategoryDialog.setFalse();
  };

  const setPromptForCategoryOnAdd = () => {
    setLibrarySettings({
      defaultCategoryId: undefined,
      promptForCategoryOnAdd: true,
    });
    defaultCategoryDialog.setFalse();
  };

  const sortOrderParts = sortOrder.split(' ');
  const sortOrderLabel =
    SORT_ORDER_LABELS[sortOrderParts[0]] ??
    'libraryScreen.bottomSheet.sortOrders.dateAdded';

  const badgeDescription = [
    showUnreadBadges
      ? getString('libraryScreen.bottomSheet.display.unread')
      : null,
    showStatusBadges
      ? getString('libraryScreen.bottomSheet.display.statusBadges')
      : null,
    showNumberOfNovels
      ? getString('libraryScreen.bottomSheet.display.numberOfItems')
      : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <SafeAreaView excludeTop>
      <Appbar
        title={getString('library')}
        handleGoBack={navigation.goBack}
        theme={theme}
      />
      <ScrollView contentContainerStyle={styles.paddingBottom}>
        <List.Section>
          <List.SubHeader theme={theme}>
            {getString('common.display')}
          </List.SubHeader>
          <List.Item
            title={getString('generalSettingsScreen.displayMode')}
            description={displayModesList[displayMode].label}
            onPress={displayModal.setTrue}
            theme={theme}
          />
          <List.Item
            title={getString('generalSettingsScreen.itemsPerRowLibrary')}
            description={`${novelsPerRow} ${getString(
              'generalSettingsScreen.itemsPerRow',
            )}`}
            onPress={gridSizeModal.setTrue}
            theme={theme}
          />
          <List.Item
            title={getString('generalSettingsScreen.novelBadges')}
            description={badgeDescription}
            onPress={novelBadgesModal.setTrue}
            theme={theme}
          />
          <SettingSwitch
            label={getString('generalSettingsScreen.showContinueReadingButton')}
            value={showContinueReadingButton}
            onPress={() =>
              setLibrarySettings({
                showContinueReadingButton: !showContinueReadingButton,
              })
            }
            theme={theme}
          />
          <List.Item
            title={getString('generalSettingsScreen.novelSort')}
            description={`${getString(sortOrderLabel)} ${sortOrderParts[1]}`}
            onPress={novelSortModal.setTrue}
            theme={theme}
          />
          <List.SubHeader theme={theme}>{getString('library')}</List.SubHeader>
          <List.Item
            title={getString('categories.header')}
            description={`${categories.length} ${getString(
              'common.categories',
            ).toLowerCase()}`}
            onPress={() => navigation.navigate('Categories')}
            theme={theme}
          />
          <List.Item
            title={getString('categories.defaultCategory')}
            description={
              promptForCategoryOnAdd
                ? getString('categories.alwaysAsk')
                : selectedDefaultCategory?.name ?? appDefaultCategory?.name
            }
            onPress={defaultCategoryDialog.setTrue}
            theme={theme}
          />
          <SettingSwitch
            label={getString('generalSettingsScreen.useFAB')}
            description={getString('generalSettingsScreen.useFABDescription')}
            value={useLibraryFAB}
            onPress={() => setAppSettings({ useLibraryFAB: !useLibraryFAB })}
            theme={theme}
          />
          <List.Item
            title={getString('generalSettingsScreen.chapterSort')}
            description={`${getString('generalSettingsScreen.bySource')} ${
              defaultChapterSort === 'positionAsc'
                ? getString('generalSettingsScreen.asc')
                : getString('generalSettingsScreen.desc')
            }`}
            onPress={defaultChapterSortModal.setTrue}
            theme={theme}
          />
        </List.Section>
      </ScrollView>
      <DisplayModeModal
        displayMode={displayMode}
        displayModalVisible={displayModal.value}
        hideDisplayModal={displayModal.setFalse}
        theme={theme}
      />
      <DefaultChapterSortModal
        defaultChapterSort={defaultChapterSort}
        displayModalVisible={defaultChapterSortModal.value}
        hideDisplayModal={defaultChapterSortModal.setFalse}
        setAppSettings={setAppSettings}
        theme={theme}
      />
      <GridSizeModal
        novelsPerRow={novelsPerRow}
        gridSizeModalVisible={gridSizeModal.value}
        hideGridSizeModal={gridSizeModal.setFalse}
        theme={theme}
      />
      <NovelBadgesModal
        novelBadgesModalVisible={novelBadgesModal.value}
        hideNovelBadgesModal={novelBadgesModal.setFalse}
        theme={theme}
      />
      <NovelSortModal
        novelSortModalVisible={novelSortModal.value}
        hideNovelSortModal={novelSortModal.setFalse}
        theme={theme}
      />
      <Portal>
        <DefaultCategoryDialog
          categories={selectableCategories}
          defaultCategoryId={selectedDefaultCategory?.id ?? 1}
          promptForCategoryOnAdd={promptForCategoryOnAdd}
          setPromptForCategoryOnAdd={setPromptForCategoryOnAdd}
          visible={defaultCategoryDialog.value}
          hideDialog={defaultCategoryDialog.setFalse}
          setDefaultCategory={setDefaultCategory}
        />
      </Portal>
    </SafeAreaView>
  );
};

export default SettingsLibraryScreen;

const styles = StyleSheet.create({
  paddingBottom: {
    paddingBottom: 24,
  },
});
