import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { ThemeColors } from '../../theme/types';

export type TriState = 'neutral' | 'included' | 'excluded' | 'indeterminate';

interface TriStateCheckboxProps {
  label: string;
  state: TriState;
  onPress: () => void;
  theme: ThemeColors;
  count?: number;
  disabled?: boolean;
  viewStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export const TriStateCheckbox: React.FC<TriStateCheckboxProps> = ({
  label,
  state,
  onPress,
  theme,
  count,
  disabled,
  viewStyle,
  labelStyle,
}) => {
  let iconName: string = 'checkbox-blank-outline';
  let iconColor: string = theme.onSurfaceVariant;

  if (state === 'included') {
    iconName = 'checkbox-marked';
    iconColor = theme.primary;
  } else if (state === 'excluded') {
    iconName = 'close-box';
    iconColor = theme.error ?? '#EF5350';
  } else if (state === 'indeterminate') {
    iconName = 'minus-box';
    iconColor = theme.primary;
  }

  const displayText = count !== undefined ? `${label} (${count})` : label;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="checkbox"
      accessibilityState={{
        checked:
          state === 'included'
            ? true
            : state === 'excluded'
            ? 'mixed'
            : false,
        disabled,
      }}
      android_ripple={{ color: theme.rippleColor }}
      style={[styles.pressable, viewStyle]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name={iconName}
          size={24}
          color={disabled ? theme.onSurfaceDisabled : iconColor}
        />
      </View>
      <View style={styles.textContainer}>
        <Text
          numberOfLines={1}
          style={[
            styles.defaultLabel,
            {
              color: disabled
                ? theme.onSurfaceDisabled
                : state === 'excluded'
                ? theme.error ?? '#EF5350'
                : state === 'included'
                ? theme.primary
                : theme.onSurface,
            },
            labelStyle,
          ]}
        >
          {displayText}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44,
    paddingHorizontal: 16,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    width: 24,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  defaultLabel: {
    fontSize: 15,
  },
});
