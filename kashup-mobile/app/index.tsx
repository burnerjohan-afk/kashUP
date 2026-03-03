import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { getPartners, Partner } from '../src/services/partners.service';

export default function Home() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [urlCalled, setUrlCalled] = useState<string>('');

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (__DEV__) {
        console.log('[Home] 🚀 Chargement des partenaires');
      }
      
      const data = await getPartners();
      setPartners(data);
      
      if (__DEV__) {
        console.log('[Home] ✅ Partenaires chargés:', data.length);
      }
    } catch (err: any) {
      const errorMessage = err?.message || 'Erreur inconnue';
      setError(errorMessage);
      setUrlCalled(err?.url || 'N/A');
      console.error('[Home] ❌ Erreur chargement partenaires:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderPartner = ({ item }: { item: Partner }) => (
    <View style={styles.partnerItem}>
      <Text style={styles.partnerName}>{item.name}</Text>
      <Text style={styles.partnerCategory}>
        {item.category?.name || item.categoryId || 'Sans catégorie'}
      </Text>
      <Text style={styles.partnerTerritory}>
        {item.territory || 'N/A'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kashup Mobile - Partenaires</Text>
      
      {loading && (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Chargement des partenaires...</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Erreur</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          {urlCalled && (
            <Text style={styles.errorUrl}>URL tentée: {urlCalled}</Text>
          )}
        </View>
      )}

      {!loading && !error && (
        <>
          {partners.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Aucun partenaire trouvé</Text>
            </View>
          ) : (
            <>
              <Text style={styles.countText}>
                {partners.length} partenaire{partners.length > 1 ? 's' : ''}
              </Text>
              <FlatList
                data={partners}
                renderItem={renderPartner}
                keyExtractor={(item) => item.id}
                style={styles.list}
                contentContainerStyle={styles.listContent}
              />
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    paddingBottom: 20,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 8,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#721c24',
    marginBottom: 8,
  },
  errorUrl: {
    fontSize: 12,
    color: '#721c24',
    opacity: 0.7,
    marginTop: 5,
  },
  countText: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 20,
  },
  partnerItem: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  partnerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  partnerCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  partnerTerritory: {
    fontSize: 12,
    color: '#999',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
