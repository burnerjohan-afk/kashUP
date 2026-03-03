import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { colors, spacing, radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { MainStackParamList } from '../navigation/MainStack';
import { HomeStackParamList } from '../navigation/HomeStack';
import { ProfileSectionId } from '../types/profile';
import { useUserProfile } from '@/src/hooks/useUserProfile';

type ProfileNav = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'Profile'>,
  NativeStackNavigationProp<MainStackParamList>
>;

type ProfileItem = {
  id: ProfileSectionId;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type Section = {
  title: string;
  items: ProfileItem[];
};

const SECTIONS: Section[] = [
  {
    title: 'Finance',
    items: [
      { id: 'history', label: 'Historique des gains', description: 'Cashback reçu récemment', icon: 'trending-up-outline' },
      { id: 'banks', label: 'Connexions bancaires', description: 'Comptes et cartes liés', icon: 'link-outline' },
      { id: 'budget', label: 'Analyse du budget', description: 'Suivi de vos dépenses locales', icon: 'pie-chart-outline' },
      { id: 'payments', label: 'Moyens de paiement', description: 'Cartes, IBAN, préférences', icon: 'card-outline' },
    ],
  },
  {
    title: 'Général',
    items: [
      { id: 'personal', label: 'Informations personnelles', description: 'Nom, coordonnées, préférences', icon: 'person-outline' },
      { id: 'account', label: 'Compte', description: 'Sécurité et connexion', icon: 'shield-checkmark-outline' },
    ],
  },
  {
    title: 'Parrainage',
    items: [
      { id: 'invite', label: 'Parrainer un proche', description: 'Partager votre lien de parrainage', icon: 'gift-outline' },
      { id: 'referrals', label: 'Mes parrainages', description: 'Suivi des filleuls et bonus', icon: 'people-outline' },
    ],
  },
  {
    title: 'Assistance',
    items: [
      { id: 'support', label: 'Obtenir de l’aide', description: 'Chat, e-mail ou FAQ', icon: 'headset-outline' },
    ],
  },
  {
    title: 'Documents légaux',
    items: [
      { id: 'terms', label: 'Conditions générales du service', description: 'Vos droits et obligations', icon: 'document-text-outline' },
      { id: 'privacy', label: 'Politique de confidentialité', description: 'Protection des données', icon: 'lock-closed-outline' },
    ],
  },
];

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const { user, logout } = useAuth();
  const { data: profile, loading: profileLoading, error: profileError, refetch } = useUserProfile();
  const displayName = profile?.firstName ?? user?.firstName ?? 'Invité';
  const displayEmail = profile?.email ?? user?.email ?? 'Connectez votre compte pour synchroniser vos données.';

  const handlePress = (item: ProfileItem) => {
    navigation.navigate('ProfileDetail', { sectionId: item.id });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={profileLoading} onRefresh={refetch} />}
      >
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={colors.textMain} />
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Profil KashUP</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.heroTitle}>{displayName}</Text>
          <Text style={styles.heroSubtitle}>{displayEmail}</Text>
          {profileError && <Text style={styles.errorText}>{profileError}</Text>}
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.cardTitle}>{section.title}</Text>
            {section.items.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.row, index < section.items.length - 1 && styles.rowDivider]}
                onPress={() => handlePress(item)}>
                <View style={styles.rowLeft}>
                  <Ionicons name={item.icon} size={20} color={colors.textMain} />
                  <View style={styles.rowTextBlock}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowDescription}>{item.description}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity
          style={styles.logoutRow}
          onPress={async () => {
            await logout();
            navigation.navigate('Login');
          }}>
          <View style={styles.rowLeft}>
            <Ionicons name="log-out-outline" size={20} color={colors.textMain} />
            <View style={styles.rowTextBlock}>
              <Text style={styles.rowLabel}>Se déconnecter</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
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
    gap: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
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
    backgroundColor: colors.white,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primaryBlue,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textMain,
  },
  heroSubtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    marginTop: spacing.xs,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  rowTextBlock: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMain,
  },
  rowDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logoutRow: {
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});

