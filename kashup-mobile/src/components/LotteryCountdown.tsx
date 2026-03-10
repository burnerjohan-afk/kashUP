/**
 * Composant compte à rebours réutilisable pour les loteries
 * Formats: Tirage dans 2j 3h | Tirage dans 04:12:33 | Tirage imminent
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing } from '../../constants/theme';

export type CountdownInfo = {
  text: string;
  imminent?: boolean;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

function computeCountdown(drawDate: Date | string): CountdownInfo {
  const d = typeof drawDate === 'string' ? new Date(drawDate) : drawDate;
  const diff = d.getTime() - Date.now();
  if (diff <= 0) {
    return { text: 'Tirage en cours', imminent: true };
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  if (days > 0) {
    return {
      text: `Tirage dans ${days}j ${hours}h`,
      imminent: false,
      days,
      hours,
      minutes,
      seconds,
    };
  }
  if (hours > 0) {
    return {
      text: `Tirage dans ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
      imminent: false,
      days: 0,
      hours,
      minutes,
      seconds,
    };
  }
  return {
    text: 'Tirage imminent',
    imminent: true,
    days: 0,
    hours: 0,
    minutes,
    seconds,
  };
}

type Props = {
  drawDate: string | Date;
  showIcon?: boolean;
  style?: object;
  textStyle?: object;
};

export default function LotteryCountdown({ drawDate, showIcon = true, style, textStyle }: Props) {
  const [countdown, setCountdown] = useState<CountdownInfo>(() => computeCountdown(drawDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(computeCountdown(drawDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [drawDate]);

  return (
    <View style={[styles.wrap, style]}>
      {showIcon && (
        <Ionicons
          name="time-outline"
          size={14}
          color={countdown.imminent ? colors.accentRed ?? '#DC2626' : colors.textSecondary}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          countdown.imminent && styles.textImminent,
          textStyle,
        ]}>
        {countdown.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  icon: {
    marginRight: 2,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  textImminent: {
    color: colors.accentRed ?? '#DC2626',
  },
});
