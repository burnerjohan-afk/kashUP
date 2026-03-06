import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import { CARD_GRADIENT_COLORS, CARD_GRADIENT_LOCATIONS, colors, radius, spacing } from '../constants/theme';
import type { NavigationProp } from '@react-navigation/native';
import type { HomeStackParamList } from '../navigation/HomeStack';
import { useDonationCategories } from '@/src/hooks/useDonationCategories';
import { useDonationImpact } from '@/src/hooks/useDonationImpact';
import type { DonationAssociation, DonationCategory, DonationDepartment } from '@/src/services/donationService';

type DonationsNav = NavigationProp<HomeStackParamList, 'Donations'>;

const DEPARTMENTS: Array<'Tous' | DonationDepartment> = ['Tous', 'Martinique', 'Guadeloupe', 'Guyane'];

export default function DonationsScreen() {
  const navigation = useNavigation<DonationsNav>();
  const { categories, loading, error, refetch } = useDonationCategories();
  const {
    impact,
    loading: impactLoading,
    error: impactError,
    refetch: refetchImpact,
  } = useDonationImpact();
  const [selectedDepartment, setSelectedDepartment] = useState<'Tous' | DonationDepartment>('Tous');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  const filteredCategories = useMemo(() => {
    return categories
      .map((category) => {
      const matchCategory = selectedCategoryId === 'all' || category.id === selectedCategoryId;
        if (!matchCategory) {
          return { ...category, associations: [] as DonationAssociation[] };
        }
      const associations = category.associations.filter((association) => {
        if (selectedDepartment === 'Tous') return true;
        return association.department === selectedDepartment;
      });
        return { ...category, associations };
      })
      .filter((category) => category.associations.length > 0);
  }, [categories, selectedCategoryId, selectedDepartment]);

  const handleSupportPress = (
    association: DonationAssociation,
    category: DonationCategory,
  ) => {
    navigation.navigate('DonationContribution', {
      association,
      category: {
        id: category.id,
        title: category.title,
        icon: category.icon,
        accent: category.accent,
        tint: category.tint,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <LinearGradient
        colors={[colors.slateBackgroundLight, colors.slateBackground]}
        style={StyleSheet.absoluteFill}
      />
      {error && (
        <TouchableOpacity style={styles.errorBanner} onPress={refetch}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <Text style={styles.errorBannerCta}>Réessayer</Text>
        </TouchableOpacity>
      )}
      {impactError && (
        <TouchableOpacity style={styles.errorBanner} onPress={refetchImpact}>
          <Text style={styles.errorBannerText}>{impactError}</Text>
          <Text style={styles.errorBannerCta}>Actualiser</Text>
        </TouchableOpacity>
      )}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={colors.textMain} />
          </TouchableOpacity>
          <Text style={styles.toolbarTitle}>Soutenez une cause locale</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.subtitle}>
          Choisissez une association partenaire et redistribuez votre cashback.
        </Text>

        <ImpactSummaryCard impact={impact} loading={impactLoading && !impact} />

        <View style={styles.filtersBlock}>
          <Text style={styles.filtersLabel}>Filtrer par département</Text>
          <View style={styles.filtersRow}>
            {DEPARTMENTS.map((department) => {
              const active = department === selectedDepartment;
              return (
                <TouchableOpacity
                  key={department}
                  style={[styles.filterChipWrap, active && styles.filterChipWrapActive]}
                  onPress={() => setSelectedDepartment(department)}
                  activeOpacity={0.85}>
                  {active ? (
                    <LinearGradient
                      colors={[...CARD_GRADIENT_COLORS]}
                      locations={[...CARD_GRADIENT_LOCATIONS]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.filterChip, { borderWidth: 0 }]}>
                      <Text style={styles.filterChipTextActive}>{department}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.filterChip, styles.filterChipInactive]}>
                      <Text style={styles.filterChipText}>{department}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.filtersLabel, styles.filtersLabelTop]}>Filtrer par catégorie</Text>
          <View style={styles.filtersRow}>
            <TouchableOpacity
              style={[styles.filterChipWrap, selectedCategoryId === 'all' && styles.filterChipWrapActive]}
              onPress={() => setSelectedCategoryId('all')}
              activeOpacity={0.85}>
              {selectedCategoryId === 'all' ? (
                <LinearGradient
                  colors={[...CARD_GRADIENT_COLORS]}
                  locations={[...CARD_GRADIENT_LOCATIONS]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.filterChip, { borderWidth: 0 }]}>
                  <Text style={styles.filterChipTextActive}>Toutes</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.filterChip, styles.filterChipInactive]}>
                  <Text style={styles.filterChipText}>Toutes</Text>
                </View>
              )}
            </TouchableOpacity>
            {categories.map((category) => {
              const active = category.id === selectedCategoryId;
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.filterChipWrap, active && styles.filterChipWrapActive]}
                  onPress={() => setSelectedCategoryId(category.id)}
                  activeOpacity={0.85}>
                  {active ? (
                    <LinearGradient
                      colors={[...CARD_GRADIENT_COLORS]}
                      locations={[...CARD_GRADIENT_LOCATIONS]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.filterChip, { borderWidth: 0 }]}>
                      <Text style={styles.filterChipTextActive}>{category.title.split(' ')[0]}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.filterChip, styles.filterChipInactive]}>
                      <Text style={styles.filterChipText}>{category.title.split(' ')[0]}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {loading && filteredCategories.length === 0 ? (
          <ActivityIndicator color={colors.primaryPurple} />
        ) : filteredCategories.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aucune association trouvée</Text>
            <Text style={styles.emptySubtitle}>
              Modifiez vos filtres pour découvrir d’autres associations partenaires.
            </Text>
          </View>
        ) : (
          filteredCategories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              onSupport={handleSupportPress}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type CategorySectionProps = {
  category: DonationCategory;
  onSupport: (association: DonationAssociation, category: DonationCategory) => void;
};

function CategorySection({ category, onSupport }: CategorySectionProps) {
  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryIcon, { backgroundColor: category.tint }]}>
          <Ionicons name={category.icon as any} size={18} color={category.accent} />
        </View>
        <Text style={styles.categoryTitle}>{category.title}</Text>
      </View>
      <View style={styles.associationList}>
        {category.associations.map((association) => (
          <View key={association.id} style={styles.associationCard}>
            <View style={styles.associationHeader}>
              <Text style={styles.associationName}>{association.name}</Text>
              <View style={[styles.badge, { backgroundColor: category.tint }]}>
                <Text style={[styles.badgeText, { color: category.accent }]}>
                  {association.location} · {association.department}
                </Text>
              </View>
            </View>
            <Text style={styles.associationDescription}>{association.description}</Text>
            <View style={styles.needsRow}>
              <Ionicons name="heart-outline" size={14} color={category.accent} />
              <Text style={styles.needsText}>{association.needs}</Text>
            </View>
            <TouchableOpacity
              style={[styles.ctaButton, { backgroundColor: category.accent }]}
              onPress={() => onSupport(association, category)}>
              <Text style={styles.ctaButtonText}>Soutenir cette association</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

type ImpactSummaryProps = {
  impact: ReturnType<typeof useDonationImpact>['impact'];
  loading: boolean;
};

function ImpactSummaryCard({ impact, loading }: ImpactSummaryProps) {
  return (
    <View style={styles.impactCard}>
      <View style={styles.impactHeader}>
        <Text style={styles.impactTitle}>Ton impact KashUP</Text>
        {loading && <ActivityIndicator size="small" color={colors.primaryPurple} />}
      </View>
      {impact ? (
        <View style={styles.impactStatsRow}>
          <View style={styles.impactStat}>
            <Text style={styles.impactValue}>{impact.donatedThisMonth.toFixed(2)} €</Text>
            <Text style={styles.impactLabel}>Donnés ce mois</Text>
          </View>
          <View style={styles.impactStat}>
            <Text style={styles.impactValue}>{impact.associationsSupported}</Text>
            <Text style={styles.impactLabel}>Associations aidées</Text>
          </View>
          <View style={styles.impactStat}>
            <Text style={styles.impactValue}>{impact.beneficiariesHelped}</Text>
            <Text style={styles.impactLabel}>Bénéficiaires</Text>
          </View>
        </View>
      ) : (
        <Text style={styles.placeholderText}>
          Connectez une association pour suivre votre impact solidaire.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slateBackground,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 24,
    fontWeight: '800',
    color: colors.textMain,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  errorBannerText: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  errorBannerCta: {
    color: '#B91C1C',
    fontSize: 12,
  },
  impactCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: spacing.sm,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  impactStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  impactStat: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  impactValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  impactLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  filtersBlock: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  filtersLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMain,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filtersLabelTop: {
    marginTop: spacing.sm,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChipWrap: {
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  filterChipWrapActive: {
    overflow: 'hidden',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipInactive: {
    backgroundColor: colors.white,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  categoryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    gap: spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textMain,
  },
  associationList: {
    gap: spacing.md,
  },
  associationCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#ECECEC',
    padding: spacing.md,
    gap: spacing.sm,
  },
  associationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  associationName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    flex: 1,
  },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  associationDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  needsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  needsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMain,
  },
  ctaButton: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  ctaButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

