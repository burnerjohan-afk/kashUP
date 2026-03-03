import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const progress = Math.min(100, Math.round((challenge.current / challenge.goal) * 100));

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
          <Text style={styles.toolbarTitle}>Challenge</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient
          colors={[colors.primaryBlue, colors.primaryPurple]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <Text style={styles.heroLabel}>Challenge</Text>
          <Text style={styles.heroTitle}>{challenge.title}</Text>
          <Text style={styles.heroReward}>{challenge.reward}</Text>
          <View style={styles.heroProgress}>
            <View style={[styles.heroFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.heroProgressLabel}>
            {challenge.current}/{challenge.goal} actions
          </Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description</Text>
          <Text style={styles.cardText}>{challenge.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Étapes à suivre</Text>
          {challenge.steps.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

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
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroLabel: {
    color: '#F5F5FF',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  heroTitle: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '800',
  },
  heroReward: {
    color: '#F1F5FF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroProgress: {
    height: 10,
    backgroundColor: '#FFFFFF33',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    backgroundColor: colors.white,
  },
  heroProgressLabel: {
    color: '#F1F5FF',
    fontWeight: '600',
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


