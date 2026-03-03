import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius, spacing } from '../../constants/theme';

const CURVE_DIP = 14;
/** Hauteur totale du bandeau fixe (pour paddingTop du contenu défilant) ; courbe uniquement en chevauchement, pas de bande sous le bandeau */
export const KASHUP_HEADER_HEIGHT = 84;

type KashUPFixedHeaderProps = {
  cashback: number | null | undefined;
  points: number | null | undefined;
  /** Couleur du fond du contenu (pour la courbe) */
  contentBackgroundColor?: string;
};

const formatCashbackValue = (value: number) =>
  value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPoints = (value: number) => `${value.toLocaleString('fr-FR')} pts`;

export function KashUPFixedHeader({
  cashback,
  points,
  contentBackgroundColor = colors.slateBackground,
}: KashUPFixedHeaderProps) {
  const cashbackValue = cashback != null ? cashback : 0;
  const pointsValue = points != null ? points : 0;
  const width = Dimensions.get('window').width;

  // Courbe type Naomie : le contenu « remonte » au centre ; la courbe ne fait que mordre le bandeau (pas de bande grise en dessous)
  const path = `M 0 ${CURVE_DIP} Q ${width / 2} 0 ${width} ${CURVE_DIP} L ${width} ${CURVE_DIP} L 0 ${CURVE_DIP} Z`;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={[colors.primaryDark, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}>
        <View style={styles.pillsRow}>
          <View style={styles.pillPoints}>
            <Ionicons name="wallet-outline" size={18} color={colors.white} />
            <Text style={styles.pillPointsText}>{formatPoints(pointsValue)}</Text>
          </View>
          <View style={styles.pillCashback}>
            <Text style={styles.pillCashbackSymbol}>€</Text>
            <Text style={styles.pillCashbackValue}>{formatCashbackValue(cashbackValue)}</Text>
          </View>
        </View>
      </LinearGradient>
      <View style={[styles.curveWrap, { backgroundColor: contentBackgroundColor }]} pointerEvents="none">
        <Svg
          width={width}
          height={CURVE_DIP}
          style={styles.curveSvg}
          viewBox={`0 0 ${width} ${CURVE_DIP}`}
          preserveAspectRatio="none">
          <Path d={path} fill={contentBackgroundColor} />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: KASHUP_HEADER_HEIGHT,
  },
  gradient: {
    flex: 1,
    paddingTop: spacing.xs + 2,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  pillPoints: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  pillPointsText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  pillCashback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  pillCashbackSymbol: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  pillCashbackValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  curveWrap: {
    marginTop: -CURVE_DIP,
    height: CURVE_DIP,
    width: '100%',
  },
  curveSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
