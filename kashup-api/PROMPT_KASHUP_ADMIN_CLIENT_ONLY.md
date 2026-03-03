# 🎯 PROMPT KASHUP-ADMIN (Client-Only)

**À coller dans Cursor du repo `kashup-admin`**

---

Tu es un expert React/TypeScript/Vite spécialisé en intégration API REST.

**CONTEXTE :**
- Projet : Kashup-admin (back office React/Vite/TypeScript)
- API backend : Kashup-api (Node/TS/Prisma) disponible sur `http://localhost:4000` (dev) ou variable d'env
- Base URL API : `/api/v1` (canonique)
- Auth : JWT Bearer token
- Objectif : Synchronisation stable et efficace avec l'API, sans mocks/fallbacks

**CONTRAT API (référence) :**
- Format réponse : `{ statusCode, success, message, data, meta: { pagination, requestId } }`
- Pagination : `?page=1&pageSize=50&sort=-updatedAt&updatedSince=ISO8601`
- Erreurs : `{ statusCode, success: false, message, data: null, meta: { details: { code, ... } } }`
- Base vide = `{ data: [], total: 0 }` (jamais de chiffres inventés)

**TÂCHES À EFFECTUER :**

## 1️⃣ Configuration API

Créer/modifier `src/config/api.ts` :
- `baseURL` : `import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'`
- Variable d'env : `VITE_API_URL` dans `.env` (ex: `VITE_API_URL=http://localhost:4000/api/v1`)
- Headers par défaut : `Content-Type: application/json`
- Timeout : 30s

## 2️⃣ HttpClient commun

Créer `src/services/api/client.ts` :
- Utiliser `fetch` ou `axios` (préférence : `fetch` natif)
- Gestion automatique du token JWT :
  - Lire depuis `localStorage.getItem('auth_token')` ou store (Zustand/Context)
  - Ajouter header `Authorization: Bearer <token>`
- Gestion refresh token (si applicable) :
  - Intercepter 401, tenter refresh, retry requête
  - Si refresh échoue, rediriger vers `/login`
- Gestion `X-Request-Id` :
  - Générer UUID côté client pour chaque requête
  - Logger avec `requestId` pour corrélation
- Normalisation des réponses :
  - Extraire `data` et `meta.pagination` du format API
  - Normaliser les erreurs en format uniforme
- Types TypeScript :
  ```typescript
  type ApiResponse<T> = {
    data: T;
    meta?: {
      pagination?: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
      };
      requestId?: string;
    };
  };
  
  type ApiError = {
    statusCode: number;
    success: false;
    message: string;
    meta?: {
      details?: {
        code?: string;
        field?: string;
        [key: string]: any;
      };
    };
  };
  ```

## 3️⃣ Cache & Synchronisation (TanStack Query)

Installer/configurer TanStack Query (`@tanstack/react-query`) :

### Configuration
```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s
      cacheTime: 5 * 60 * 1000, // 5min
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
```

### Hooks de base
Créer `src/hooks/api/useApiQuery.ts` et `useApiMutation.ts` :
- Wrapper autour de `useQuery` / `useMutation`
- Normalisation automatique des réponses API
- Gestion d'erreurs uniforme
- Types génériques pour `data` et `meta`

### Invalidation après mutations
- Après `POST /partners` → invalider `['partners']`
- Après `PATCH /partners/:id` → invalider `['partners']` et `['partners', id]`
- Après `DELETE /partners/:id` → invalider `['partners']`
- Utiliser `queryClient.invalidateQueries({ queryKey: [...] })`

### Optimistic Updates
Pour les mutations fréquentes (toggle status, etc.) :
- Mettre à jour le cache immédiatement
- Rollback en cas d'erreur
- Exemple : `onMutate`, `onError`, `onSettled` dans `useMutation`

## 4️⃣ Suppression totale des mocks

- **Supprimer** tous les fichiers `src/mocks/`, `src/__mocks__/`, `src/fixtures/`
- **Supprimer** MSW (Mock Service Worker) sauf pour les tests unitaires
- **Supprimer** tous les `fallbackData`, `mockData`, `demoData` dans les composants
- **Remplacer** par des états vides :
  ```typescript
  const { data, isLoading, error } = useApiQuery(['partners'], fetchPartners);
  
  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;
  if (!data || data.length === 0) return <EmptyState message="Aucun partenaire" />;
  
  return <PartnersList partners={data} />;
  ```

## 5️⃣ Gestion d'erreurs uniforme

Créer `src/components/ErrorBoundary.tsx` et `src/components/ApiError.tsx` :
- Afficher les erreurs API de manière cohérente
- Afficher `error.message` + `error.meta.details.code` si disponible
- Bouton "Réessayer" qui relance la requête
- Logging structuré avec `requestId`

## 6️⃣ États vides cohérents

Créer `src/components/EmptyState.tsx` :
- Afficher "Aucune donnée" quand `data.length === 0` ou `data.total === 0`
- **Jamais** afficher de chiffres inventés (ex: "0 transactions" au lieu de "45 transactions")
- Vérifier que tous les composants de liste gèrent `data === null || data.length === 0`

## 7️⃣ Journalisation minimale (dev)

Créer `src/utils/logger.ts` :
- Logger les requêtes API en dev uniquement
- Format : `[API] GET /api/v1/partners [requestId: uuid] [200 OK]`
- Utiliser `console.group` / `console.groupEnd` pour regrouper

## 8️⃣ Hooks spécifiques par ressource

Créer des hooks réutilisables dans `src/hooks/api/` :
- `usePartners(filters, listParams)` → `useApiQuery(['partners', filters], ...)`
- `usePartner(id)` → `useApiQuery(['partners', id], ...)`
- `useCreatePartner()` → `useApiMutation(['partners'], 'POST')`
- `useUpdatePartner(id)` → `useApiMutation(['partners', id], 'PATCH')`
- `useDeletePartner(id)` → `useApiMutation(['partners', id], 'DELETE')`
- Idem pour : `offers`, `rewards`, `transactions`, `giftCards`, `users` (admin)

## 9️⃣ Delta Sync (optionnel mais recommandé)

Pour les listes volumineuses :
- Stocker `lastSyncAt` dans `localStorage` ou store
- Utiliser `updatedSince` dans les requêtes :
  ```typescript
  const lastSync = localStorage.getItem('lastSync_partners');
  const params = lastSync 
    ? { ...filters, updatedSince: lastSync }
    : filters;
  ```
- Après récupération, mettre à jour `lastSyncAt = new Date().toISOString()`

## 🔟 Validation des données

Créer des DTOs TypeScript alignés sur le contrat API :
- `src/types/api/partner.dto.ts`
- `src/types/api/offer.dto.ts`
- `src/types/api/transaction.dto.ts`
- Utiliser `zod` pour validation runtime si nécessaire

## ✅ Checklist de validation

- [ ] `VITE_API_URL` configuré dans `.env`
- [ ] HttpClient avec gestion token + refresh
- [ ] TanStack Query configuré
- [ ] Tous les mocks supprimés (sauf tests)
- [ ] États vides affichés correctement (0, [])
- [ ] Invalidation cache après mutations
- [ ] Gestion d'erreurs uniforme
- [ ] Logging structuré en dev
- [ ] Types TypeScript alignés sur le contrat API
- [ ] Tests d'intégration avec API réelle (ou mock uniquement en tests)

## 🚀 Exemple d'implémentation

```typescript
// src/hooks/api/usePartners.ts
import { useApiQuery, useApiMutation } from './useApiQuery';
import { fetchPartners, createPartner, updatePartner, deletePartner } from '@/services/api/partners';

export const usePartners = (filters = {}, listParams = {}) => {
  return useApiQuery(
    ['partners', filters, listParams],
    () => fetchPartners(filters, listParams),
    { staleTime: 30 * 1000 }
  );
};

export const useCreatePartner = () => {
  const queryClient = useQueryClient();
  return useApiMutation(
    (data) => createPartner(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['partners'] });
      },
    }
  );
};
```

```typescript
// src/services/api/partners.ts
import { apiClient } from './client';
import type { Partner, PartnerFilters, ListParams } from '@/types/api';

export const fetchPartners = async (filters: PartnerFilters, params: ListParams) => {
  const query = new URLSearchParams({
    ...filters,
    ...params,
    updatedSince: params.updatedSince?.toISOString(),
  } as any);
  
  const response = await apiClient.get<{ partners: Partner[] }>(`/partners?${query}`);
  return response.data;
};
```

**CONTRAINTES :**
- Ne pas inventer de données (base vide = 0, [])
- Ne pas utiliser de mocks en production
- Respecter strictement le contrat API
- Gérer les erreurs de manière cohérente
- Invalider le cache après mutations

**LIVRABLE :**
- Code fonctionnel avec synchronisation stable
- Plus aucun mock/fallback en production
- États vides corrects
- Cache invalidé après mutations

