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
import { TabDescriptor, TabView } from 'react-native-tab-view';
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
  TriStateCheckbox,
  type TriState,
} from '@components/Checkbox/TriStateCheckbox';
import {
  DisplayModes,
  displayModesList,
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

interface FilterOption {
  key: string;
  label: string;
}

const READING_STATUS_FILTERS: FilterOption[] = [
  {
    key: 'unread',
    label: getString('libraryScreen.bottomSheet.filters.unread'),
  },
  {
    key: 'started',
    label: getString('libraryScreen.bottomSheet.filters.started'),
  },
  {
    key: 'read',
    label: getString('libraryScreen.bottomSheet.filters.read'),
  },
];

const PUBLICATION_STATUS_FILTERS: FilterOption[] = [
  {
    key: 'ongoing',
    label: getString('libraryScreen.bottomSheet.filters.ongoing'),
  },
  {
    key: 'completed',
    label: getString('libraryScreen.bottomSheet.filters.completed'),
  },
  {
    key: 'onHiatus',
    label: getString('libraryScreen.bottomSheet.filters.onHiatus'),
  },
  {
    key: 'cancelled',
    label: getString('libraryScreen.bottomSheet.filters.cancelled'),
  },
  {
    key: 'publishingFinished',
    label: getString('libraryScreen.bottomSheet.filters.publishingFinished'),
  },
];

const FirstRoute = () => {
  const theme = useTheme();
  const {
    includedFilters = [],
    excludedFilters = [],
    setLibrarySettings,
  } = useLibrarySettings();

  const handleFilterPress = useCallback(
    (key: string) => {
      const isInc = includedFilters.includes(key);
      const isExc = excludedFilters.includes(key);

      if (!isInc && !isExc) {
        setLibrarySettings({
          filter: undefined,
          includedFilters: [...includedFilters, key],
          excludedFilters: excludedFilters.filter(f => f !== key),
        });
      } else if (isInc) {
        setLibrarySettings({
          filter: undefined,
          includedFilters: includedFilters.filter(f => f !== key),
          excludedFilters: [...excludedFilters, key],
        });
      } else {
        setLibrarySettings({
          filter: undefined,
          includedFilters: includedFilters.filter(f => f !== key),
          excludedFilters: excludedFilters.filter(f => f !== key),
        });
      }
    },
    [includedFilters, excludedFilters, setLibrarySettings],
  );

  const clearAllFilters = useCallback(() => {
    setLibrarySettings({
      filter: undefined,
      includedFilters: [],
      excludedFilters: [],
    });
  }, [setLibrarySettings]);

  const activeFilterCount = includedFilters.length + excludedFilters.length;

  const getFilterState = (key: string): TriState => {
    if (includedFilters.includes(key)) return 'included';
    if (excludedFilters.includes(key)) return 'excluded';
    return 'neutral';
  };

  return (
    <View style={styles.flex}>
      {activeFilterCount > 0 && (
        <View style={styles.genresHeader}>
          <Text
            style={[styles.selectedCountText, { color: theme.onSurfaceVariant }]}
          >
            {`${activeFilterCount} active`}
          </Text>
          <Pressable
            onPress={clearAllFilters}
            android_ripple={{ color: theme.rippleColor }}
            style={styles.clearBtn}
          >
            <Text style={[styles.clearBtnText, { color: theme.primary }]}>
              Clear all
            </Text>
          </Pressable>
        </View>
      )}
      <BottomSheetScrollView contentContainerStyle={styles.filterScrollContent}>
        <Text style={[styles.sectionHeader, { color: theme.onSurfaceVariant }]}>
          Reading status
        </Text>
        {READING_STATUS_FILTERS.map(item => (
          <TriStateCheckbox
            key={item.key}
            label={item.label}
            state={getFilterState(item.key)}
            theme={theme}
            onPress={() => handleFilterPress(item.key)}
          />
        ))}

        <Text style={[styles.sectionHeader, { color: theme.onSurfaceVariant }]}>
          Publication status
        </Text>
        {PUBLICATION_STATUS_FILTERS.map(item => (
          <TriStateCheckbox
            key={item.key}
            label={item.label}
            state={getFilterState(item.key)}
            theme={theme}
            onPress={() => handleFilterPress(item.key)}
          />
        ))}
      </BottomSheetScrollView>
    </View>
  );
};

interface GenresRouteProps {
  library?: NovelInfo[];
}

const GenresRoute: React.FC<GenresRouteProps> = ({ library: propLibrary }) => {
  const theme = useTheme();
  const { taxonomy } = useGenreTaxonomy();
  const {
    selectedGenres = [],
    includedGenres = [],
    excludedGenres = [],
    setLibrarySettings,
  } = useLibrarySettings();

  const incGenres = useMemo(
    () => (includedGenres?.length ? includedGenres : selectedGenres || []),
    [includedGenres, selectedGenres],
  );
  const excGenres = excludedGenres || [];

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
    (node: GenreTreeNode, currentState: TriState) => {
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

      if (currentState === 'included') {
        const nextInc = incGenres.filter(
          g => !childNamesLower.has(g.toLowerCase()),
        );
        const missingExc = childNames.filter(
          name => !excGenres.some(g => g.toLowerCase() === name.toLowerCase()),
        );
        const nextExc = [...excGenres, ...missingExc];
        setLibrarySettings({
          includedGenres: nextInc,
          excludedGenres: nextExc,
          selectedGenres: nextInc,
        });
      } else if (currentState === 'excluded') {
        const nextInc = incGenres.filter(
          g => !childNamesLower.has(g.toLowerCase()),
        );
        const nextExc = excGenres.filter(
          g => !childNamesLower.has(g.toLowerCase()),
        );
        setLibrarySettings({
          includedGenres: nextInc,
          excludedGenres: nextExc,
          selectedGenres: nextInc,
        });
      } else {
        const missingInc = childNames.filter(
          name => !incGenres.some(g => g.toLowerCase() === name.toLowerCase()),
        );
        const nextInc = [...incGenres, ...missingInc];
        const nextExc = excGenres.filter(
          g => !childNamesLower.has(g.toLowerCase()),
        );
        setLibrarySettings({
          includedGenres: nextInc,
          excludedGenres: nextExc,
          selectedGenres: nextInc,
        });
      }
    },
    [incGenres, excGenres, setLibrarySettings],
  );

  const handleChildToggle = useCallback(
    (genreName: string) => {
      const isInc = incGenres.some(
        g => g.toLowerCase() === genreName.toLowerCase(),
      );
      const isExc = excGenres.some(
        g => g.toLowerCase() === genreName.toLowerCase(),
      );

      if (!isInc && !isExc) {
        const nextInc = [...incGenres, genreName];
        const nextExc = excGenres.filter(
          g => g.toLowerCase() !== genreName.toLowerCase(),
        );
        setLibrarySettings({
          includedGenres: nextInc,
          excludedGenres: nextExc,
          selectedGenres: nextInc,
        });
      } else if (isInc) {
        const nextInc = incGenres.filter(
          g => g.toLowerCase() !== genreName.toLowerCase(),
        );
        const nextExc = [...excGenres, genreName];
        setLibrarySettings({
          includedGenres: nextInc,
          excludedGenres: nextExc,
          selectedGenres: nextInc,
        });
      } else {
        const nextInc = incGenres.filter(
          g => g.toLowerCase() !== genreName.toLowerCase(),
        );
        const nextExc = excGenres.filter(
          g => g.toLowerCase() !== genreName.toLowerCase(),
        );
        setLibrarySettings({
          includedGenres: nextInc,
          excludedGenres: nextExc,
          selectedGenres: nextInc,
        });
      }
    },
    [incGenres, excGenres, setLibrarySettings],
  );

  const clearAll = useCallback(() => {
    setLibrarySettings({
      selectedGenres: [],
      includedGenres: [],
      excludedGenres: [],
    });
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

  const activeCount = incGenres.length + excGenres.length;

  return (
    <View style={styles.flex}>
      {activeCount > 0 && (
        <View style={styles.genresHeader}>
          <Text
            style={[styles.selectedCountText, { color: theme.onSurfaceVariant }]}
          >
            {incGenres.length > 0 && excGenres.length > 0
              ? `${incGenres.length} included, ${excGenres.length} excluded`
              : incGenres.length > 0
              ? `${incGenres.length} included`
              : `${excGenres.length} excluded`}
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

          const incCount = childNames.filter(name =>
            incGenres.some(g => g.toLowerCase() === name.toLowerCase()),
          ).length;

          const excCount = childNames.filter(name =>
            excGenres.some(g => g.toLowerCase() === name.toLowerCase()),
          ).length;

          let parentState: TriState = 'neutral';
          if (incCount === childNames.length && childNames.length > 0) {
            parentState = 'included';
          } else if (excCount === childNames.length && childNames.length > 0) {
            parentState = 'excluded';
          } else if (incCount > 0 || excCount > 0) {
            parentState = 'indeterminate';
          }

          return (
            <View key={node.name} style={styles.categoryContainer}>
              <View style={styles.categoryRow}>
                <View style={styles.categoryCheckboxContainer}>
                  <TriStateCheckbox
                    label={node.name}
                    count={node.categoryTotal}
                    state={parentState}
                    theme={theme}
                    onPress={() => handleParentToggle(node, parentState)}
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
                  const isChildInc = incGenres.some(
                    g => g.toLowerCase() === child.name.toLowerCase(),
                  );
                  const isChildExc = excGenres.some(
                    g => g.toLowerCase() === child.name.toLowerCase(),
                  );
                  const childState: TriState = isChildInc
                    ? 'included'
                    : isChildExc
                    ? 'excluded'
                    : 'neutral';

                  return (
                    <View key={child.name} style={styles.childRow}>
                      <TriStateCheckbox
                        label={child.name}
                        count={child.count}
                        state={childState}
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
    showNumberOfNovels = false,
    showUnreadBadges = true,
    showStatusBadges = false,
    showContinueReadingButton = false,
    displayMode = DisplayModes.Comfortable,
    setLibrarySettings,
  } = useLibrarySettings();

  return (
    <View style={styles.flex}>
      <Text style={[styles.sectionHeader, { color: theme.onSurfaceVariant }]}>
        {getString('libraryScreen.bottomSheet.display.overlays')}
      </Text>
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
  const {
    selectedGenres = [],
    includedGenres = [],
    excludedGenres = [],
    includedFilters = [],
    excludedFilters = [],
  } = useLibrarySettings();

  const layout = useWindowDimensions();

  const totalFiltersActive =
    (includedFilters?.length || 0) + (excludedFilters?.length || 0);
  const totalGenresActive =
    (includedGenres?.length ? includedGenres.length : selectedGenres.length) +
    (excludedGenres?.length || 0);

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
      {
        key: 'first',
        title:
          totalFiltersActive > 0
            ? `${getString('common.filter')} (${totalFiltersActive})`
            : getString('common.filter'),
      },
      {
        key: 'genres',
        title:
          totalGenresActive > 0 ? `Genres (${totalGenresActive})` : 'Genres',
      },
      { key: 'second', title: getString('common.sort') },
      { key: 'third', title: getString('common.display') },
    ],
    [totalFiltersActive, totalGenresActive],
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
  filterScrollContent: {
    paddingBottom: 24,
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
