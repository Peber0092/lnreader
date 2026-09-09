import React, {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { SceneMap, TabDescriptor, TabView } from 'react-native-tab-view';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';

import { useLibrarySettings, useTheme } from '@hooks/persisted';
import { useGenreTaxonomy } from '@hooks/persisted/useGenreTaxonomy';
import { buildGenreTree, GenreTreeNode } from '@screens/GenreStatsScreen/utils';
import {
  getNovelsWithGenresFromDb,
  NovelWithGenres,
} from '@database/queries/StatsQueries';
import { NovelInfo } from '@database/types';
import { getString } from '@i18n/translations';
import { Checkbox, SortItem } from '@components/Checkbox/Checkbox';
import {
  DisplayModes,
  displayModesList,
  LibraryFilter,
  libraryFilterList,
  LibrarySortOrder,
  librarySortOrderList,
} from '@screens/library/constants/constants';
import { RadioButton } from '@components/RadioButton/RadioButton';
import { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import BottomSheet from '@components/BottomSheet/BottomSheet';
import { TopTabBar } from '@components';
import { BottomSheetModalMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { LegendList } from '@legendapp/list/react-native';

interface LibraryBottomSheetProps {
  bottomSheetRef: RefObject<BottomSheetModalMethods | null>;
  style?: StyleProp<ViewStyle>;
  library?: NovelInfo[];
}

const FirstRoute = () => {
  const theme = useTheme();
  const {
    filter,
    setLibrarySettings,
    downloadedOnlyMode = false,
  } = useLibrarySettings();

  return (
    <View style={styles.flex}>
      <LegendList
        recycleItems
        estimatedItemSize={4}
        extraData={[filter]}
        data={libraryFilterList}
        keyExtractor={item => `filter_${item.filter}`}
        renderItem={({ item }) => (
          <Checkbox
            label={item.label}
            theme={theme}
            status={filter === item.filter}
            onPress={() =>
              setLibrarySettings({
                filter: filter === item.filter ? undefined : item.filter,
              })
            }
            disabled={
              item.filter === LibraryFilter.Downloaded && downloadedOnlyMode
            }
          />
        )}
      />
    </View>
  );
};

interface GenresRouteProps {
  library?: NovelInfo[];
}

const GenresRoute: React.FC<GenresRouteProps> = ({ library: propLibrary }) => {
  const theme = useTheme();
  const { taxonomy } = useGenreTaxonomy();
  const { selectedGenres = [], setLibrarySettings } = useLibrarySettings();

  const [dbNovels, setDbNovels] = useState<NovelWithGenres[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (!propLibrary || propLibrary.length === 0) {
      getNovelsWithGenresFromDb().then(setDbNovels).catch(() => {});
    }
  }, [propLibrary]);

  const activeNovels = useMemo(() => {
    if (propLibrary && propLibrary.length > 0) {
      return propLibrary;
    }
    return dbNovels;
  }, [propLibrary, dbNovels]);

  const genreTree = useMemo(() => {
    const tree = buildGenreTree(activeNovels as any, taxonomy);
    return tree.filter(n => n.name.toLowerCase() !== 'unknown');
  }, [activeNovels, taxonomy]);

  const toggleExpand = useCallback((categoryName: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
  }, []);

  const handleParentToggle = useCallback(
    (node: GenreTreeNode, isAllSelected: boolean) => {
      const childNames: string[] = [];
      if (node.count > 0 || !node.children?.length) {
        childNames.push(node.name);
      }
      if (node.children) {
        for (const child of node.children) {
          if (!childNames.some(n => n.toLowerCase() === child.name.toLowerCase())) {
            childNames.push(child.name);
          }
        }
      }

      const childNamesLower = new Set(childNames.map(c => c.toLowerCase()));

      if (isAllSelected) {
        setLibrarySettings({
          selectedGenres: selectedGenres.filter(
            g => !childNamesLower.has(g.toLowerCase()),
          ),
        });
      } else {
        const missing = childNames.filter(
          name =>
            !selectedGenres.some(g => g.toLowerCase() === name.toLowerCase()),
        );
        setLibrarySettings({
          selectedGenres: [...selectedGenres, ...missing],
        });
      }
    },
    [selectedGenres, setLibrarySettings],
  );

  const handleChildToggle = useCallback(
    (genreName: string) => {
      const isSelected = selectedGenres.some(
        g => g.toLowerCase() === genreName.toLowerCase(),
      );
      if (isSelected) {
        setLibrarySettings({
          selectedGenres: selectedGenres.filter(
            g => g.toLowerCase() !== genreName.toLowerCase(),
          ),
        });
      } else {
        setLibrarySettings({
          selectedGenres: [...selectedGenres, genreName],
        });
      }
    },
    [selectedGenres, setLibrarySettings],
  );

  const clearAll = useCallback(() => {
    setLibrarySettings({ selectedGenres: [] });
  }, [setLibrarySettings]);

  if (genreTree.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.onSurfaceVariant }]}>
          No genres found in library novels
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {selectedGenres.length > 0 && (
        <View style={styles.genresHeader}>
          <Text
            style={[styles.selectedCountText, { color: theme.onSurfaceVariant }]}
          >
            {`${selectedGenres.length} selected`}
          </Text>
          <Pressable
            onPress={clearAll}
            android_ripple={{ color: theme.rippleColor }}
            style={styles.clearBtn}
          >
            <Text style={[styles.clearBtnText, { color: theme.primary }]}>
              Clear all
            </Text>
          </Pressable>
        </View>
      )}
      <BottomSheetScrollView contentContainerStyle={styles.genresScrollContent}>
        {genreTree.map(node => {
          const hasChildren = Boolean(node.children && node.children.length > 0);
          const isExpanded = Boolean(expandedCategories[node.name]);

          const childNames: string[] = [];
          if (node.count > 0 || !hasChildren) {
            childNames.push(node.name);
          }
          if (node.children) {
            for (const c of node.children) {
              if (!childNames.some(n => n.toLowerCase() === c.name.toLowerCase())) {
                childNames.push(c.name);
              }
            }
          }

          const selectedCount = childNames.filter(name =>
            selectedGenres.some(g => g.toLowerCase() === name.toLowerCase()),
          ).length;

          const isAllSelected =
            childNames.length > 0 && selectedCount === childNames.length;
          const isSomeSelected =
            selectedCount > 0 && selectedCount < childNames.length;

          const checkboxStatus = isAllSelected
            ? true
            : isSomeSelected
            ? ('indeterminate' as const)
            : false;

          return (
            <View key={node.name} style={styles.categoryContainer}>
              <View style={styles.categoryRow}>
                <View style={styles.categoryCheckboxContainer}>
                  <Checkbox
                    label={`${node.name} (${node.categoryTotal})`}
                    status={checkboxStatus}
                    theme={theme}
                    onPress={() => handleParentToggle(node, isAllSelected)}
                  />
                </View>
                {hasChildren && (
                  <Pressable
                    style={styles.expandButton}
                    onPress={() => toggleExpand(node.name)}
                    hitSlop={8}
                    android_ripple={{
                      color: theme.rippleColor,
                      borderless: true,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={24}
                      color={theme.onSurfaceVariant}
                    />
                  </Pressable>
                )}
              </View>

              {isExpanded &&
                node.children?.map(child => {
                  const isChildSelected = selectedGenres.some(
                    g => g.toLowerCase() === child.name.toLowerCase(),
                  );
                  return (
                    <View key={child.name} style={styles.childRow}>
                      <Checkbox
                        label={`${child.name} (${child.count})`}
                        status={isChildSelected}
                        theme={theme}
                        onPress={() => handleChildToggle(child.name)}
                        viewStyle={styles.childCheckbox}
                      />
                    </View>
                  );
                })}
            </View>
          );
        })}
      </BottomSheetScrollView>
    </View>
  );
};

const SecondRoute = () => {
  const theme = useTheme();
  const { sortOrder = LibrarySortOrder.DateAdded_DESC, setLibrarySettings } =
    useLibrarySettings();

  return (
    <View style={styles.flex}>
      <LegendList
        recycleItems
        data={librarySortOrderList}
        extraData={[sortOrder]}
        estimatedItemSize={5}
        keyExtractor={(item, index) => `sort_${index}_${item.ASC}`}
        renderItem={({ item }) => (
          <SortItem
            label={item.label}
            theme={theme}
            status={
              sortOrder === item.ASC
                ? 'asc'
                : sortOrder === item.DESC
                ? 'desc'
                : undefined
            }
            onPress={() =>
              setLibrarySettings({
                sortOrder: sortOrder === item.ASC ? item.DESC : item.ASC,
              })
            }
          />
        )}
      />
    </View>
  );
};

const ThirdRoute = () => {
  const theme = useTheme();
  const {
    showDownloadBadges = true,
    showNumberOfNovels = false,
    showUnreadBadges = true,
    displayMode = DisplayModes.Comfortable,
    setLibrarySettings,
  } = useLibrarySettings();

  return (
    <View style={styles.flex}>
      <Text style={[styles.sectionHeader, { color: theme.onSurfaceVariant }]}>
        {getString('libraryScreen.bottomSheet.display.badges')}
      </Text>
      <Checkbox
        label={getString('libraryScreen.bottomSheet.display.downloadBadges')}
        status={showDownloadBadges}
        onPress={() =>
          setLibrarySettings({
            showDownloadBadges: !showDownloadBadges,
          })
        }
        theme={theme}
      />
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
        label={getString('libraryScreen.bottomSheet.display.showNoOfItems')}
        status={showNumberOfNovels}
        onPress={() =>
          setLibrarySettings({
            showNumberOfNovels: !showNumberOfNovels,
          })
        }
        theme={theme}
      />
      <Text style={[styles.sectionHeader, { color: theme.onSurfaceVariant }]}>
        {getString('libraryScreen.bottomSheet.display.displayMode')}
      </Text>
      <LegendList
        recycleItems
        estimatedItemSize={4}
        data={displayModesList}
        extraData={[displayMode]}
        keyExtractor={item => `display_mode_${item.value}`}
        renderItem={({ item }) => (
          <RadioButton
            label={item.label}
            status={displayMode === item.value}
            onPress={() => setLibrarySettings({ displayMode: item.value })}
            theme={theme}
          />
        )}
      />
    </View>
  );
};

const LibraryBottomSheet: React.FC<LibraryBottomSheetProps> = ({
  bottomSheetRef,
  style,
  library,
}) => {
  const theme = useTheme();
  const { selectedGenres = [] } = useLibrarySettings();

  const layout = useWindowDimensions();

  const renderScene = useCallback(
    ({ route: tabRoute }: { route: { key: string } }) => {
      switch (tabRoute.key) {
        case 'first':
          return <FirstRoute />;
        case 'genres':
          return <GenresRoute library={library} />;
        case 'second':
          return <SecondRoute />;
        case 'third':
          return <ThirdRoute />;
        default:
          return null;
      }
    },
    [library],
  );

  const renderTabBar = useCallback(
    (props: any) => (
      <TopTabBar
        {...props}
        indicatorStyle={{ backgroundColor: theme.primary }}
        style={[
          {
            backgroundColor: theme.surfaceContainerLow ?? theme.surface,
            borderBottomColor: theme.outlineVariant,
          },
          styles.tabBar,
          style,
        ]}
        inactiveColor={theme.onSurfaceVariant}
        activeColor={theme.primary}
        pressColor={theme.rippleColor}
      />
    ),
    [
      theme.primary,
      theme.surface,
      theme.surfaceContainerLow,
      theme.onSurfaceVariant,
      theme.rippleColor,
      theme.outlineVariant,
      style,
    ],
  );

  const [index, setIndex] = useState(0);
  const routes = useMemo(
    () => [
      { key: 'first', title: getString('common.filter') },
      {
        key: 'genres',
        title:
          selectedGenres.length > 0
            ? `Genres (${selectedGenres.length})`
            : 'Genres',
      },
      { key: 'second', title: getString('common.sort') },
      { key: 'third', title: getString('common.display') },
    ],
    [selectedGenres.length],
  );

  const renderCommonOptions = useCallback(
    ({ route, color: col }: { route: any; color: string }) => (
      <Text style={{ color: col }} numberOfLines={1}>
        {route.title}
      </Text>
    ),
    [],
  );

  const commonOptions: TabDescriptor<{
    key: string;
    title: string;
  }> = useMemo(() => {
    return {
      label: renderCommonOptions,
    };
  }, [renderCommonOptions]);

  return (
    <BottomSheet bottomSheetRef={bottomSheetRef} snapPoints={[540]}>
      <BottomSheetView style={styles.bottomSheetCtn}>
        <TabView
          commonOptions={commonOptions}
          navigationState={{ index, routes }}
          renderTabBar={renderTabBar}
          renderScene={renderScene}
          onIndexChange={setIndex}
          initialLayout={{ width: layout.width }}
          style={styles.tabView}
        />
      </BottomSheetView>
    </BottomSheet>
  );
};

export default LibraryBottomSheet;

const styles = StyleSheet.create({
  bottomSheetCtn: {
    flex: 1,
  },
  sectionHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  tabBar: {
    borderBottomWidth: 1,
    elevation: 0,
  },
  tabView: {
    height: 540,
  },
  flex: { flex: 1 },
  genresHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectedCountText: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  genresScrollContent: {
    paddingBottom: 24,
  },
  categoryContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.15)',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryCheckboxContainer: {
    flex: 1,
  },
  expandButton: {
    padding: 12,
    marginRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childRow: {
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
  },
  childCheckbox: {
    paddingLeft: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
