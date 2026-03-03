import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing } from '../constants/theme';
import { RewardsStackParamList } from '../navigation/RewardsStack';
import { RewardBadge } from '../types/rewards';

type BadgeRoute = RouteProp<RewardsStackParamList, 'BadgeDetail'>;

type Props = {
  route: BadgeRoute;
};

export default function BadgeDetailScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RewardsStackParamList>>();
  const { badge } = route.params;

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
          <Text style={styles.toolbarTitle}>Badge</Text>
          <View style={{ width: 40 }} />
        </View>

        <LinearGradient
          colors={[colors.primaryPurple, colors.primaryBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}>
          <View style={styles.emojiBubble}>
            <Text style={styles.emoji}>{badge.emoji}</Text>
          </View>
          <Text style={styles.title}>{badge.label}</Text>
          <Text style={styles.status}>{badge.unlocked ? 'Badge débloqué' : 'Badge en cours'}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${badge.progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{badge.progress}% complété</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comment l’obtenir ?</Text>
          <Text style={styles.cardText}>{badge.description}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pourquoi participer ?</Text>
          <Text style={styles.cardText}>
            Chaque badge débloqué renforce votre impact sur l’économie locale et vous offre des surprises
            exclusives (points bonus, accès à des loteries privées, badges collectors…).
          </Text>
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
    alignItems: 'center',
    gap: spacing.sm,
  },
  emojiBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  status: {
    color: '#F1F5FF',
    fontSize: 14,
  },
  progressBar: {
    width: '100%',
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF33',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.white,
  },
  progressText: {
    color: '#F1F5FF',
    fontWeight: '700',
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
    fontWeight: '800',
    color: colors.textMain,
  },
  cardText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});


