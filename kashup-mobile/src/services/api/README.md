# API Client - Documentation

## Configuration

### Variable d'environnement

Créer un fichier `.env` à la racine du projet :

**⚠️ IMPORTANT : Ne pas inclure `/api/v1` dans l'URL. L'URL est utilisée telle quelle.**

```env
EXPO_PUBLIC_API_URL=http://192.168.68.205:4000
```

Pour un réseau local, utilisez l'IP de votre PC :
```env
EXPO_PUBLIC_API_URL=http://192.168.1.23:4000
```

**Note :** L'URL est utilisée directement sans modification. Les routes backend sont appelées directement (ex: `/partners`, `/offers/current`).

### Utilisation du client API

```typescript
import { apiClient } from '@/services/api/client';

// GET
const response = await apiClient.get<Partner[]>('/partners', {
  params: { category: 'restaurant', page: 1 }
});

// POST
const newPartner = await apiClient.post<Partner>('/partners', {
  name: 'Nouveau partenaire',
  category: 'restaurant'
});

// PUT/PATCH/DELETE
await apiClient.put('/partners/123', { name: 'Updated' });
await apiClient.patch('/partners/123', { name: 'Patched' });
await apiClient.delete('/partners/123');
```

## Hooks React Query

### usePartners

```typescript
import { usePartners } from '@/hooks/api/usePartners';

function PartnersScreen() {
  const { partners, total, loading, error, refetch } = usePartners(
    { category: 'restaurant' }, // filters
    { page: 1, pageSize: 20 }   // listParams
  );

  if (loading) return <ActivityIndicator />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (partners.length === 0) return <EmptyState />;

  return (
    <FlatList
      data={partners}
      renderItem={({ item }) => <PartnerCard partner={item} />}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} />
      }
    />
  );
}
```

### useOffers, useRewards, useTransactions

Même pattern que `usePartners` :

```typescript
import { useOffers } from '@/hooks/api/useOffers';
import { useRewards } from '@/hooks/api/useRewards';
import { useTransactions } from '@/hooks/api/useTransactions';

const { offers } = useOffers({ partnerId: '123' });
const { rewards } = useRewards({ status: 'pending' });
const { transactions } = useTransactions({ page: 1 });
```

## Synchronisation

### Sync au démarrage

Le hook `useAppSync` est automatiquement appelé dans `App.tsx`. Il synchronise toutes les données :
- Au démarrage de l'app
- Toutes les 5 minutes en foreground
- Quand l'app revient au foreground

### Delta Sync

Les hooks utilisent automatiquement la synchronisation delta :
- Stocke `lastSync_<resource>` dans AsyncStorage
- Envoie `updatedSince` dans les requêtes suivantes
- Met à jour la date après chaque sync réussie

### Sync manuelle

```typescript
import { syncAllChanges } from '@/services/sync/syncChanges';
import { getGlobalLastSync } from '@/services/sync/deltaSync';

const lastSync = await getGlobalLastSync();
await syncAllChanges(lastSync || undefined);
```

## Gestion offline

### Queue de mutations

```typescript
import { addToQueue, replayQueue } from '@/services/offline/queue';
import { apiClient } from '@/services/api/client';

// Ajouter une mutation à la queue si offline
try {
  await apiClient.post('/transactions', transactionData);
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    await addToQueue('CREATE_TRANSACTION', '/transactions', 'POST', transactionData);
  }
}

// Rejouer la queue au retour de la connexion
await replayQueue(async (mutation) => {
  await apiClient.request(mutation.method, mutation.endpoint, {
    body: mutation.data
  });
});
```

## Composants UI

### ErrorState

```typescript
import ErrorState from '@/components/ErrorState';

<ErrorState
  error={error}
  onRetry={() => refetch()}
  title="Erreur de chargement"
  message="Impossible de charger les données"
/>
```

### EmptyState

```typescript
import EmptyState from '@/components/EmptyState';

<EmptyState
  icon="document-outline"
  title="Aucun partenaire"
  message="Il n'y a pas encore de partenaires à afficher."
/>
```

## Contrat API

L'API doit respecter le format `StandardResponse<T>` :

```typescript
{
  statusCode: number;
  success: boolean;
  message: string;
  data: T | null;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    details?: {
      code?: string;
      fieldErrors?: Record<string, string[]>;
    };
  };
}
```

## Gestion des erreurs

- **NETWORK_ERROR** : Pas de connexion → Queue offline
- **TIMEOUT** : Requête expirée → Retry automatique
- **401** : Token expiré → Refresh automatique
- **4xx/5xx** : Erreur API → Affichage via ErrorState

