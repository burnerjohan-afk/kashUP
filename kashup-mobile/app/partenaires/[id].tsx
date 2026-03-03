/**
 * Écran détail d'un partenaire
 * Route: /partenaires/[id]
 * Affiche les infos utiles et JAMAIS KBIS/SIRET
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPartner, Partner } from '@/src/services/partners.service';
import { normalizeLogoUrl } from '@/src/utils/normalizeUrl';
import { colors, radius, spacing } from '../../constants/theme';

export default function PartnerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPartner();
    }
  }, [id]);

  const loadPartner = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getPartner(id);
      setPartner(data);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement');
      console.error('[PartnerDetail] Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUrl = async (url: string | null | undefined) => {
    if (!url) return;

    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    const canOpen = await Linking.canOpenURL(normalizedUrl);
    if (canOpen) {
      await Linking.openURL(normalizedUrl);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textMain} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !partner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textMain} />
          </TouchableOpacity>
        </View>
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error || 'Partenaire introuvable'}</Text>
          <TouchableOpacity onPress={loadPartner} style={styles.retryButton}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const logoUrl = normalizeLogoUrl(partner.logoUrl);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Logo et nom */}
        <View style={styles.heroSection}>
          {logoUrl && (
            <Image source={{ uri: logoUrl }} style={styles.logo} resizeMode="contain" />
          )}
          <Text style={styles.partnerName}>{partner.name}</Text>
          {partner.category && (
            <Text style={styles.category}>{partner.category.name}</Text>
          )}
        </View>

        {/* Cashback */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cash" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Cashback</Text>
          </View>
          <Text style={styles.cashbackValue}>{partner.tauxCashbackBase}%</Text>
          <Text style={styles.cashbackLabel}>de cashback permanent</Text>
        </View>

        {/* Description */}
        {partner.shortDescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>À propos</Text>
            <Text style={styles.description}>{partner.shortDescription}</Text>
          </View>
        )}

        {/* Localisation */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Localisation</Text>
          </View>
          <Text style={styles.locationText}>{partner.territory}</Text>
          {partner.latitude && partner.longitude && (
            <Text style={styles.coordinates}>
              {partner.latitude.toFixed(6)}, {partner.longitude.toFixed(6)}
            </Text>
          )}
        </View>

        {/* Liens */}
        {(partner.websiteUrl || partner.facebookUrl || partner.instagramUrl) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Liens</Text>
            <View style={styles.linksContainer}>
              {partner.websiteUrl && (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => handleOpenUrl(partner.websiteUrl)}>
                  <Ionicons name="globe" size={20} color={colors.primary} />
                  <Text style={styles.linkText}>Site web</Text>
                </TouchableOpacity>
              )}
              {partner.facebookUrl && (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => handleOpenUrl(partner.facebookUrl)}>
                  <Ionicons name="logo-facebook" size={20} color={colors.primary} />
                  <Text style={styles.linkText}>Facebook</Text>
                </TouchableOpacity>
              )}
              {partner.instagramUrl && (
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => handleOpenUrl(partner.instagramUrl)}>
                  <Ionicons name="logo-instagram" size={20} color={colors.primary} />
                  <Text style={styles.linkText}>Instagram</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.greyLight,
    marginBottom: spacing.md,
  },
  partnerName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  category: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  cashbackValue: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  cashbackLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  description: {
    fontSize: 15,
    color: colors.textMain,
    lineHeight: 22,
  },
  locationText: {
    fontSize: 15,
    color: colors.textMain,
    marginBottom: spacing.xs,
  },
  coordinates: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  linksContainer: {
    gap: spacing.md,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.greyLight,
    borderRadius: radius.md,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMain,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});

