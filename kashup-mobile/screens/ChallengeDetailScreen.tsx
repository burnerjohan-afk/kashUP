import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing } from '../constants/theme';
import { RewardsStackParamList } from '../navigation/RewardsStack';

type ChallengeRoute = RouteProp<RewardsStackParamList, 'ChallengeDetail'>;

type Props = {
  route: ChallengeRoute;
};

export default function ChallengeDetailScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RewardsStackParamList>>();
  const { challenge } = route.params;
  const goal = challenge.goal ?? challenge.goalValue ?? 1;
  const progress = Math.min(100, Math.round((challenge.current / goal) * 100));
  const isDone = challenge.userStatus === 'done';
  const rewardLabel = challenge.rewardSummary ?? (challenge as { reward?: string }).reward ?? 'Récompense';
  const points = challenge.rewardPoints ?? challenge.reward?.rewardValue ?? 0;

  const completedScale = useRef(new Animated.Value(isDone ? 1 : 0)).current;
  useEffect(() => {
    if (isDone) {
      Animated.spring(completedScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 80,
      }).start();
    }
  }, [isDone, completedScale]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={colors.textMain} />
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Défi</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.hero}>
          <View style={[styles.heroCircle, isDone ? styles.heroCircleDone : styles.heroCircleLocked]}>
            <Animated.View style={{ transform: [{ scale: completedScale }] }}>
              <Ionicons
                name={isDone ? 'checkmark-circle' : 'lock-closed'}
                size={72}
                color={isDone ? colors.primaryGreen : colors.textSecondary}
              />
            </Animated.View>
          </View>
          <Text style={[styles.heroBadgeStatus, !isDone && styles.heroBadgeStatusLocked]}>
            {isDone ? 'Complété' : 'Badge bloqué'}
          </Text>
          <Text style={styles.heroTitle}>{challenge.title}</Text>
          <View style={styles.heroPointsBlock}>
            <Text style={styles.heroPointsLabel}>Points à gagner</Text>
            <Text style={styles.heroPointsValue}>+{points} pts</Text>
          </View>
          <View style={styles.heroProgress}>
            <View style={[styles.heroFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.heroProgressLabel}>
            {challenge.current} / {goal} · {progress}%
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <Text style={styles.cardText}>{challenge.description || 'Aucune description.'}</Text>
        </View>

        {challenge.steps && challenge.steps.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Étapes à suivre</Text>
            {challenge.steps.map((step, index) => (
              <View key={`${index}-${step}`} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  toolbarTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  hero: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  heroCircleDone: {
    backgroundColor: colors.lightGreen ?? '#d1fae5',
  },
  heroCircleLocked: {
    backgroundColor: colors.greyLight,
  },
  heroBadgeStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryGreen,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroBadgeStatusLocked: {
    color: colors.textSecondary,
  },
  heroTitle: {
    color: colors.textMain,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroPointsBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  heroPointsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  heroPointsValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryPurple,
  },
  heroProgress: {
    height: 10,
    backgroundColor: colors.greyLight,
    borderRadius: radius.pill,
    overflow: 'hidden',
    width: '100%',
    marginTop: spacing.sm,
  },
  heroFill: {
    height: '100%',
    backgroundColor: colors.primaryPurple,
    borderRadius: radius.pill,
  },
  heroProgressLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  cardText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.lightPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: colors.primaryPurple,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    color: colors.textMain,
    fontSize: 14,
  },
});


