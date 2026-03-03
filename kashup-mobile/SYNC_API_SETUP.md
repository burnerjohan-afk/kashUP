# 🚀 Configuration de la synchronisation API

## ✅ Checklist de validation

- [x] `EXPO_PUBLIC_API_URL` configuré dans `.env`
- [x] HttpClient avec gestion token + refresh + offline
- [x] React Query configuré avec persistence
- [x] Delta sync implémenté (updatedSince)
- [x] Pull-to-refresh sur toutes les listes
- [x] Sync au login + au démarrage de l'app
- [x] Queue de mutations offline
- [x] États vides affichés correctement (0, [])
- [x] Gestion d'erreurs réseau (timeout, pas de connexion)
- [x] Types TypeScript alignés sur le contrat API
- [ ] Tests d'intégration avec API réelle

## 📋 Fichiers créés/modifiés

### Configuration
- `src/config/api.ts` - Configuration base URL et timeout
- `.env.example` - Exemple de configuration

### Client API
- `src/services/api/client.ts` - Client HTTP basé sur fetch avec JWT, refresh, offline
- `src/utils/logger.ts` - Logger pour développement

### React Query
- `src/lib/queryClient.ts` - Configuration React Query avec persistence
- `App.tsx` - Intégration du PersistQueryClientProvider

### Synchronisation
- `src/services/sync/deltaSync.ts` - Service de synchronisation delta
- `src/services/sync/syncChanges.ts` - Service de sync globale via /sync/changes
- `src/hooks/useAppSync.ts` - Hook de synchronisation au démarrage

### Offline
- `src/services/offline/queue.ts` - Queue de mutations offline

### Hooks API
- `src/hooks/api/usePartners.ts` - Hook pour les partenaires
- `src/hooks/api/useOffers.ts` - Hook pour les offres
- `src/hooks/api/useRewards.ts` - Hook pour les récompenses
- `src/hooks/api/useTransactions.ts` - Hook pour les transactions

### Composants UI
- `src/components/ErrorState.tsx` - Affichage des erreurs
- `src/components/EmptyState.tsx` - Affichage des états vides

### Documentation
- `src/services/api/README.md` - Documentation complète

## 🔧 Installation

1. **Installer les dépendances** (déjà fait) :
```bash
npm install @tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister uuid
npm install --save-dev @types/uuid
```

2. **Créer le fichier `.env`** :
```bash
cp .env.example .env
# Puis éditer .env avec votre URL API
```

3. **Redémarrer l'app** :
```bash
npm start --clear
```

## 📖 Utilisation

### Exemple d'écran avec synchronisation

```typescript
import React from 'react';
import { FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { usePartners } from '@/hooks/api/usePartners';
import ErrorState from '@/components/ErrorState';
import EmptyState from '@/components/EmptyState';

export default function PartnersScreen() {
  const { partners, total, loading, error, refetch } = usePartners(
    { category: 'restaurant' },
    { page: 1, pageSize: 20 }
  );

  if (loading && partners.length === 0) {
    return <ActivityIndicator size="large" />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (partners.length === 0) {
    return (
      <EmptyState
        icon="storefront-outline"
        title="Aucun partenaire"
        message="Il n'y a pas encore de partenaires dans cette catégorie."
      />
    );
  }

  return (
    <FlatList
      data={partners}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PartnerCard partner={item} />}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refetch} />
      }
    />
  );
}
```

## 🔄 Synchronisation automatique

La synchronisation se fait automatiquement :
- **Au démarrage** : Sync complète si première fois, sinon delta sync
- **Toutes les 5 minutes** : Delta sync en foreground
- **Au retour au foreground** : Delta sync
- **Pull-to-refresh** : Invalidation + refetch

## 🌐 Gestion offline

Les mutations sont automatiquement mises en queue si offline :

```typescript
try {
  await apiClient.post('/transactions', data);
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // Automatiquement géré par le client
    // Ou utiliser manuellement :
    await addToQueue('CREATE_TRANSACTION', '/transactions', 'POST', data);
  }
}
```

## 📝 Notes importantes

1. **Base URL** : Doit se terminer par `/api/v1` ou sera automatiquement ajouté
2. **Tokens** : Stockés dans SecureStore (sécurisé)
3. **Cache** : Persisté dans AsyncStorage, restauré au démarrage
4. **Delta sync** : Utilise `updatedSince` pour ne récupérer que les changements
5. **États vides** : Toujours vérifier `data.length === 0` ou `data.total === 0`
6. **Pas de données inventées** : Si l'API retourne `[]` ou `total: 0`, afficher l'état vide

## 🐛 Dépannage

### Erreur "Network request failed"
- Vérifier que l'API est démarrée
- Vérifier `EXPO_PUBLIC_API_URL` dans `.env`
- Vérifier la connexion réseau

### Tokens non persistés
- Vérifier que SecureStore est disponible (pas sur web)
- Vérifier les permissions de l'app

### Cache non restauré
- Vérifier que AsyncStorage fonctionne
- Vérifier la clé `kashup-query-cache` dans AsyncStorage

### Sync ne fonctionne pas
- Vérifier que l'endpoint `/sync/changes` existe sur l'API
- Vérifier les logs dans la console (mode dev)

