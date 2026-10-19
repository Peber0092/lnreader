import { useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import Library from '../screens/library/LibraryScreen';
import History from '../screens/history/HistoryScreen';
import More from '../screens/more/MoreScreen';

import { getString } from '@i18n/translations';
import { useAppSettings, useTheme } from '@hooks/persisted';
import { BottomNavigatorParamList } from './types';
import Icon from '@react-native-vector-icons/material-design-icons';
import { MaterialDesignIconName } from '@type/icon';
import { BottomTabBar } from '@components';

const Tab = createBottomTabNavigator<BottomNavigatorParamList>();

const BottomNavigator = () => {
  const theme = useTheme();

  const { showHistoryTab = true, showLabelsInNav = false } = useAppSettings();

  const renderIcon = useCallback(
    ({ color, route }: { route: { name: string }; color: string }) => {
      let iconName: MaterialDesignIconName;
      switch (route.name) {
        case 'Library':
          iconName = 'bookmark-box-multiple';
          break;
        case 'History':
          iconName = 'history';
          break;
        case 'More':
          iconName = 'dots-horizontal';
          break;
        default:
          iconName = 'circle';
      }

      return <Icon name={iconName} color={color} size={24} />;
    },
    [],
  );

  const renderTabBar = useCallback(
    (props: any) => (
      <BottomTabBar
        {...props}
        theme={theme}
        showLabelsInNav={showLabelsInNav}
        renderIcon={renderIcon}
      />
    ),
    [theme, showLabelsInNav, renderIcon],
  );

  return (
    <Tab.Navigator
      screenOptions={() => ({
        headerShown: false,
        animation: 'fade',
        lazy: true,
        tabBarBadgeStyle: {
          backgroundColor: theme.error,
          color: theme.onError,
        },
      })}
      tabBar={renderTabBar}
    >
      <Tab.Screen
        name="Library"
        component={Library}
        options={{
          title: getString('library'),
        }}
      />
      {showHistoryTab ? (
        <Tab.Screen
          name="History"
          component={History}
          options={{
            title: getString('history'),
          }}
        />
      ) : null}
      <Tab.Screen
        name="More"
        component={More}
        options={{
          title: getString('more'),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomNavigator;
