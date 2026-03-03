import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackHeaderProps } from '@react-navigation/native-stack';

import type { MainStackParamList } from '../navigation/MainStack';
import { colors, spacing } from '../constants/theme';

type HeaderProps = NativeStackHeaderProps<MainStackParamList>;

export default function Header({ options }: HeaderProps) {
  const title = options.title ?? 'KashUP';
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.slateBackground,
    shadowColor: colors.black,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
});

