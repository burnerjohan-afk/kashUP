/**
 * Écran liste des partenaires
 * Route: /partenaires
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPartners, Partner, PartnersFilters } from '@/src/services/partners.service';
import { normalizeLogoUrl } from '@/src/utils/normalizeUrl';
import { colors, radius, spacing } from '../../constants/theme';

export default function PartnersListScreen() {
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadPartners = async (filters?: PartnersFilters) => {
    try {
      setError(null);
      const data = await getPartners(filters);
      setPartners(data);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement');
      console.error('[PartnersList] Erreur:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPartners();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    loadPartners({ search: query });
  };

  const handlePartnerPress = (partnerId: string) => {
    router.push(`/partenaires/${partnerId}`);
  };

  const renderPartner = ({ item }: { item: Partner }) => (
    <TouchableOpacity
      style={styles.partnerCard}
      onPress={() => handlePartnerPress(item.id)}
      activeOpacity={0.7}>
      {item.logoUrl && (
        <View style={styles.logoContainer}>
          {/* Logo sera affiché via Image dans le composant réel */}
        </View>
      )}
      <View style={styles.partnerInfo}>
        <Text style={styles.partnerName}>{item.name}</Text>
        {item.shortDescription && (
          <Text style={styles.partnerDescription} numberOfLines={2}>
            {item.shortDescription}
          </Text>
        )}
        <View style={styles.partnerMeta}>
          <Text style={styles.cashback}>{item.tauxCashbackBase}% cashback</Text>
          <Text style={styles.territory}>{item.territory}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Partenaires</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Partenaires</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un partenaire..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => loadPartners()} style={styles.retryButton}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {!error && (
        <FlatList
          data={partners}
          renderItem={renderPartner}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun partenaire trouvé</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.greyLight,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textMain,
    letterSpacing: -0.5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.greyLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textMain,
  },
  listContent: {
    padding: spacing.lg,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.greyLight,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.greyLight,
    marginRight: spacing.md,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMain,
    marginBottom: spacing.xs / 2,
  },
  partnerDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  partnerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cashback: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  territory: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#991B1B',
    marginBottom: spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
  emptyContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

