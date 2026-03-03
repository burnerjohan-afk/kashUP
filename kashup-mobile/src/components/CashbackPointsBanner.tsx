import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../../constants/theme';

const NAOMIE_VIOLET = '#6D28D9';
const NAOMIE_BLUE_DARK = '#1E3A5F';

type CashbackPointsBannerProps = {
  cashback: number | null | undefined;
  points: number | null | undefined;
};

const formatCashbackValue = (value: number) =>
  value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPoints = (value: number) => `${value.toLocaleString('fr-FR')} pts`;

export function CashbackPointsBanner({ cashback, points }: CashbackPointsBannerProps) {
  const cashbackValue = cashback != null ? cashback : 0;
  const pointsValue = points != null ? points : 0;

  return (
    <LinearGradient
      colors={[NAOMIE_BLUE_DARK, '#2D4A6F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.banner}>
      <View style={styles.pillsRow}>
        {/* Pilule Points : fond violet, texte blanc (style Naomie) */}
        <View style={styles.pillPoints}>
          <Ionicons name="wallet-outline" size={18} color="#FFFFFF" />
          <Text style={styles.pillPointsText}>{formatPoints(pointsValue)}</Text>
        </View>
        {/* Pilule Cashback : fond blanc, bordure et texte violet */}
        <View style={styles.pillCashback}>
          <Text style={styles.pillCashbackSymbol}>€</Text>
          <Text style={styles.pillCashbackValue}>{formatCashbackValue(cashbackValue)}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pillPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: NAOMIE_VIOLET,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pillPointsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pillCashback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: NAOMIE_VIOLET,
  },
  pillCashbackSymbol: {
    fontSize: 14,
    fontWeight: '800',
    color: NAOMIE_VIOLET,
  },
  pillCashbackValue: {
    fontSize: 15,
    fontWeight: '700',
    color: NAOMIE_VIOLET,
  },
});
