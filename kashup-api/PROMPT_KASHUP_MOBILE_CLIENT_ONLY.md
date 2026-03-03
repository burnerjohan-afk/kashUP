# 🎯 PROMPT KASHUP-MOBILE (Client-Only)

**À coller dans Cursor du repo `kashup-mobile`**

---

Tu es un expert React Native/TypeScript spécialisé en intégration API REST et synchronisation offline.

**CONTEXTE :**
- Projet : Kashup-mobile (app React Native/Expo/TypeScript)
- API backend : Kashup-api (Node/TS/Prisma) disponible sur variable d'env
- Base URL API : `/api/v1` (canonique)
- Auth : JWT Bearer token
- Objectif : Synchronisation stable avec l'API, support offline optionnel, delta sync efficace

**CONTRAT API (référence) :**
- Format réponse : `{ statusCode, success, message, data, meta: { pagination, requestId } }`
- Pagination : `?page=1&pageSize=50&sort=-updatedAt&updatedSince=ISO8601`
- Erreurs : `{ statusCode, success: false, message, data: null, meta: { details: { code, ... } } }`
- Base vide = `{ data: [], total: 0 }` (jamais de chiffres inventés)

**TÂCHES À EFFECTUER :**

## 1️⃣ Configuration API

Créer/modifier `src/config/api.ts` :
- `baseURL` : `process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api/v1'`
- Variable d'env : `EXPO_PUBLIC_API_URL` dans `.env` (ex: `EXPO_PUBLIC_API_URL=http://192.168.1.23:4000/api/v1`)
- Headers par défaut : `Content-Type: application/json`
- Timeout : 30s
- Gestion des erreurs réseau (timeout, pas de connexion)

## 2️⃣ Store/Cache local

**Option A : React Query (recommandé)**
- Installer `@tanstack/react-query`
- Configuration avec persistence optionnelle (AsyncStorage)
- Cache time : 5 minutes
- Stale time : 30 secondes

**Option B : Redux Toolkit + RTK Query**
- Si déjà utilisé dans le projet
- Configuration similaire

**Option C : Zustand + React Query**
- Store global pour auth/state
- React Query pour cache API

## 3️⃣ HttpClient commun

Créer `src/services/api/client.ts` :
- Utiliser `fetch` natif (React Native)
- Gestion automatique du token JWT :
  - Lire depuis AsyncStorage ou store (Zustand/Redux)
  - Ajouter header `Authorization: Bearer <token>`
- Gestion refresh token :
  - Intercepter 401, tenter refresh, retry requête
  - Si refresh échoue, rediriger vers `/login`
- Gestion `X-Request-Id` :
  - Générer UUID côté client
  - Logger avec `requestId` pour corrélation
- Normalisation des réponses :
  - Extraire `data` et `meta.pagination`
  - Normaliser les erreurs
- Gestion offline :
  - Détecter `NetworkError` / `TypeError: Network request failed`
  - Retourner erreur structurée : `{ code: 'NETWORK_ERROR', message: 'Pas de connexion' }`

## 4️⃣ Stratégie de synchronisation

### Refresh au login
```typescript
// src/hooks/useAuth.ts
const onLoginSuccess = async (token: string) => {
  await AsyncStorage.setItem('auth_token', token);
  // Invalider tous les caches et refetch
  await queryClient.invalidateQueries();
  await queryClient.refetchQueries();
};
```

### Delta sync périodique
Créer `src/services/sync/deltaSync.ts` :
- Stocker `lastSyncAt` par ressource dans AsyncStorage :
  ```typescript
  const LAST_SYNC_KEY = 'lastSync_';
  await AsyncStorage.setItem(`${LAST_SYNC_KEY}partners`, new Date().toISOString());
  ```
- Fonction `syncResource(resourceName, updatedSince)` :
  - Appeler `GET /api/v1/${resource}?updatedSince=${updatedSince}`
  - Mettre à jour le cache local
  - Mettre à jour `lastSyncAt`
- Appeler périodiquement (ex: toutes les 5 minutes en foreground)
- Utiliser `AppState` pour détecter foreground/background

### Pull-to-refresh
- Implémenter `RefreshControl` sur toutes les listes
- Invalider le cache + refetch au pull
- Afficher indicateur de chargement

### Sync au démarrage de l'app
```typescript
// src/hooks/useAppSync.ts
useEffect(() => {
  const syncAll = async () => {
    const lastSync = await AsyncStorage.getItem('lastSync_global');
    if (lastSync) {
      // Delta sync pour toutes les ressources
      await Promise.all([
        syncPartners(lastSync),
        syncOffers(lastSync),
        syncRewards(lastSync),
        syncTransactions(lastSync),
      ]);
    } else {
      // Premier lancement : sync complète
      await Promise.all([
        syncPartners(),
        syncOffers(),
        syncRewards(),
        syncTransactions(),
      ]);
    }
    await AsyncStorage.setItem('lastSync_global', new Date().toISOString());
  };
  
  syncAll();
}, []);
```

## 5️⃣ Gestion offline (optionnel mais recommandé)

### Queue de mutations
Créer `src/services/offline/queue.ts` :
- Stocker les mutations en attente dans AsyncStorage
- Format : `{ id: uuid, type: 'CREATE_TRANSACTION', data: {...}, timestamp: ISO }`
- Replay au retour de la connexion :
  ```typescript
  const replayQueue = async () => {
    const queue = await getOfflineQueue();
    for (const mutation of queue) {
      try {
        await executeMutation(mutation);
        await removeFromQueue(mutation.id);
      } catch (error) {
        // Garder en queue pour retry plus tard
      }
    }
  };
  ```

### Cache persistant
- Utiliser `@tanstack/react-query-persist-client` avec AsyncStorage
- Persister les données critiques (partners, offers, rewards)
- Restaurer au démarrage de l'app

### Indicateur de statut
- Afficher badge "Hors ligne" en haut de l'écran
- Désactiver les actions nécessitant une connexion
- Afficher message "Synchronisation en attente" pour les mutations en queue

## 6️⃣ Gestion d'erreurs + états vides

Créer `src/components/ErrorState.tsx` et `src/components/EmptyState.tsx` :
- Afficher les erreurs API de manière cohérente
- Bouton "Réessayer" qui relance la requête
- **États vides cohérents** :
  - Si `data.length === 0` ou `data.total === 0` → afficher "Aucune donnée"
  - **Jamais** afficher de chiffres inventés
  - Vérifier que tous les écrans de liste gèrent `data === null || data.length === 0`

## 7️⃣ Hooks spécifiques par ressource

Créer des hooks réutilisables dans `src/hooks/api/` :
- `usePartners(filters, listParams)` → `useQuery(['partners', filters], ...)`
- `useOffers(listParams)` → `useQuery(['offers'], ...)`
- `useRewards(listParams)` → `useQuery(['rewards'], ...)`
- `useTransactions(listParams)` → `useQuery(['transactions'], ...)`
- `useSyncChanges(updatedSince)` → `useQuery(['sync', 'changes'], ...)`

### Exemple avec delta sync
```typescript
// src/hooks/api/usePartners.ts
import { useQuery } from '@tanstack/react-query';
import { fetchPartners } from '@/services/api/partners';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const usePartners = (filters = {}) => {
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  useEffect(() => {
    AsyncStorage.getItem('lastSync_partners').then(setLastSync);
  }, []);
  
  return useQuery(
    ['partners', filters, lastSync],
    () => fetchPartners(filters, { updatedSince: lastSync }),
    {
      staleTime: 30 * 1000,
      onSuccess: async () => {
        await AsyncStorage.setItem('lastSync_partners', new Date().toISOString());
      },
    }
  );
};
```

## 8️⃣ Endpoint de sync global

Utiliser `GET /api/v1/sync/changes?updatedSince=ISO8601` :
- Récupérer tous les changements depuis une date
- Mettre à jour les caches locaux en fonction de `type` et `action`
- Gérer les suppressions (`action: 'deleted'`) :
  ```typescript
  if (change.action === 'deleted') {
    queryClient.removeQueries({ queryKey: [change.type, change.id] });
  }
  ```

## 9️⃣ Validation des données

Créer des DTOs TypeScript alignés sur le contrat API :
- `src/types/api/partner.dto.ts`
- `src/types/api/offer.dto.ts`
- `src/types/api/transaction.dto.ts`
- Utiliser `zod` pour validation runtime si nécessaire

## 🔟 Journalisation minimale (dev)

Créer `src/utils/logger.ts` :
- Logger les requêtes API en dev uniquement (__DEV__)
- Format : `[API] GET /api/v1/partners [requestId: uuid] [200 OK]`
- Utiliser `react-native-logs` ou `console` avec format structuré

## ✅ Checklist de validation

- [ ] `EXPO_PUBLIC_API_URL` configuré dans `.env`
- [ ] HttpClient avec gestion token + refresh + offline
- [ ] React Query (ou équivalent) configuré avec persistence
- [ ] Delta sync implémenté (updatedSince)
- [ ] Pull-to-refresh sur toutes les listes
- [ ] Sync au login + au démarrage de l'app
- [ ] Queue de mutations offline (optionnel)
- [ ] États vides affichés correctement (0, [])
- [ ] Gestion d'erreurs réseau (timeout, pas de connexion)
- [ ] Types TypeScript alignés sur le contrat API
- [ ] Tests d'intégration avec API réelle

## 🚀 Exemple d'implémentation

```typescript
// src/services/api/partners.ts
import { apiClient } from './client';
import type { Partner, PartnerFilters, ListParams } from '@/types/api';

export const fetchPartners = async (filters: PartnerFilters, params?: ListParams) => {
  const query = new URLSearchParams({
    ...filters,
    ...(params || {}),
    updatedSince: params?.updatedSince?.toISOString(),
  } as any);
  
  const response = await apiClient.get<{ partners: Partner[] }>(`/partners?${query}`);
  return response.data;
};
```

```typescript
// src/services/sync/deltaSync.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { queryClient } from '@/lib/queryClient';
import { fetchPartners, fetchOffers, fetchRewards } from '@/services/api';

export const syncResource = async (resourceName: string, updatedSince?: string) => {
  const lastSyncKey = `lastSync_${resourceName}`;
  const since = updatedSince || await AsyncStorage.getItem(lastSyncKey);
  
  if (!since) {
    // Sync complète
    await queryClient.refetchQueries({ queryKey: [resourceName] });
  } else {
    // Delta sync
    const params = { updatedSince: since };
    switch (resourceName) {
      case 'partners':
        await fetchPartners({}, params);
        break;
      case 'offers':
        await fetchOffers(params);
        break;
      case 'rewards':
        await fetchRewards(params);
        break;
    }
  }
  
  await AsyncStorage.setItem(lastSyncKey, new Date().toISOString());
};
```

**CONTRAINTES :**
- Ne pas inventer de données (base vide = 0, [])
- Gérer les erreurs réseau gracieusement
- Delta sync efficace (pas de rechargement complet)
- Support offline optionnel mais recommandé
- Respecter strictement le contrat API

**LIVRABLE :**
- Code fonctionnel avec synchronisation stable
- Delta sync efficace
- Gestion offline (optionnel)
- États vides corrects
- Pas de chiffres inventés

