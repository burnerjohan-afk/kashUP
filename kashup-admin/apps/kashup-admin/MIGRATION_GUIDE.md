# Guide de migration vers la nouvelle architecture API

## 📋 État actuel

Le projet utilise actuellement deux systèmes API en parallèle :

1. **Ancien système** : `src/lib/api/client.ts` (utilise `ky`)
2. **Nouveau système** : `src/services/api/client.ts` (utilise `fetch` natif)

## 🎯 Objectif

Migrer progressivement vers le nouveau système qui offre :
- Gestion automatique JWT + refresh token
- Request ID pour corrélation
- Normalisation des réponses
- Invalidation automatique du cache
- Types TypeScript alignés sur le contrat API

## 📝 Fichiers à migrer

### Features utilisant l'ancien client

- `src/features/auth/api.ts`
- `src/features/dashboard/api.ts`
- `src/features/partners/api.ts`
- `src/features/offers/api.ts`
- `src/features/rewards/api.ts`
- `src/features/transactions/api.ts`
- `src/features/users/api.ts`
- `src/features/gift-cards/api*.ts`
- `src/features/donations/api.ts`
- `src/features/settings/api.ts`
- `src/features/powens/api.ts`
- `src/features/webhooks/api.ts`
- `src/features/notifications/api.ts`
- `src/features/drimify/api.ts`
- `src/api/admin.ts`
- `src/lib/audit/audit-logger.ts`

## 🔄 Étapes de migration

### 1. Créer les services API pour chaque ressource

Exemple pour `transactions` :

```typescript
// src/services/api/transactions.ts
import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';

export const fetchTransactions = async (
  filters: TransactionFilters = {},
  params: ListParams = {}
): Promise<ApiResponse<Transaction[]>> => {
  const queryParams = {
    ...filters,
    ...params,
  };
  return apiClient.get<Transaction[]>('/transactions', queryParams);
};
```

### 2. Créer les hooks correspondants

```typescript
// src/hooks/api/useTransactions.ts
import { useApiQuery } from './useApiQuery';
import { fetchTransactions } from '@/services/api/transactions';

export const useTransactions = (filters = {}, listParams = {}) => {
  return useApiQuery(
    ['transactions', filters, listParams],
    () => fetchTransactions(filters, listParams)
  );
};
```

### 3. Mettre à jour les composants

**Avant** :
```typescript
import { getStandardJson } from '@/lib/api/client';

const { data } = useQuery({
  queryKey: ['transactions'],
  queryFn: async () => {
    const response = await getStandardJson('transactions');
    return response.data;
  },
});
```

**Après** :
```typescript
import { useTransactions } from '@/hooks/api/useTransactions';

const { data, isLoading, error } = useTransactions();
// data.data contient les transactions
// Le cache est automatiquement géré
```

## ⚠️ Différences importantes

### Format de réponse

**Ancien** :
```typescript
const response = await getStandardJson('partners');
// response.data contient directement les données
```

**Nouveau** :
```typescript
const response = await apiClient.get<Partner[]>('/partners');
// response.data contient les données
// response.meta.pagination contient la pagination
```

### Gestion des erreurs

**Ancien** : Erreurs gérées manuellement

**Nouveau** : Utiliser le composant `<ApiError />`

```tsx
if (error) {
  return <ApiError error={error} onRetry={refetch} />;
}
```

### États vides

**Ancien** : Affichage manuel

**Nouveau** : Utiliser le composant `<EmptyState />`

```tsx
if (!data?.data || data.data.length === 0) {
  return <EmptyState message="Aucune transaction" />;
}
```

## ✅ Checklist de migration

Pour chaque feature :

- [ ] Créer le service API dans `src/services/api/`
- [ ] Créer les hooks dans `src/hooks/api/`
- [ ] Créer les DTOs dans `src/types/api/`
- [ ] Mettre à jour les composants pour utiliser les nouveaux hooks
- [ ] Remplacer les gestionnaires d'erreur par `<ApiError />`
- [ ] Remplacer les états vides par `<EmptyState />`
- [ ] Supprimer les imports de l'ancien client
- [ ] Tester avec l'API réelle

## 🚀 Priorité de migration

1. **Haute priorité** :
   - `partners` (déjà fait ✅)
   - `offers` (déjà fait ✅)
   - `transactions`
   - `users`

2. **Priorité moyenne** :
   - `rewards`
   - `gift-cards`
   - `dashboard`

3. **Priorité basse** :
   - `powens`
   - `webhooks`
   - `notifications`
   - `drimify`

## 📚 Ressources

- Voir `API_INTEGRATION_GUIDE.md` pour la documentation complète
- Exemples dans `src/hooks/api/usePartners.ts` et `src/hooks/api/useOffers.ts`

