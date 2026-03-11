# Guide d'intégration API - Kashup Admin

Ce document décrit la nouvelle architecture d'intégration API du back-office Kashup Admin.

## 📋 Structure

```
src/
├── config/
│   └── api.ts                    # Configuration centralisée (baseURL, timeout)
├── services/
│   └── api/
│       ├── client.ts             # Client HTTP avec JWT, refresh, request ID
│       ├── partners.ts           # Services pour les partenaires
│       └── offers.ts             # Services pour les offres
├── hooks/
│   └── api/
│       ├── useApiQuery.ts        # Hook wrapper pour useQuery
│       ├── useApiMutation.ts     # Hook wrapper pour useMutation
│       ├── usePartners.ts        # Hooks spécifiques partenaires
│       └── useOffers.ts          # Hooks spécifiques offres
├── types/
│   └── api/
│       ├── partner.dto.ts        # DTOs pour les partenaires
│       └── offer.dto.ts          # DTOs pour les offres
└── components/
    ├── ApiError.tsx              # Composant d'affichage d'erreur API
    └── EmptyState.tsx            # Composant d'état vide
```

## 🔧 Configuration

### Variables d'environnement

Créer/modifier `.env` :

```env
VITE_API_URL=http://localhost:4000/api/v1
```

La configuration est centralisée dans `src/config/api.ts`.

## 🚀 Utilisation

### Exemple : Liste des partenaires

```tsx
import { usePartners } from '@/hooks/api/usePartners';
import { ApiError } from '@/components/ApiError';
import { EmptyState } from '@/components/EmptyState';

export const PartnersPage = () => {
  const { data, isLoading, error, refetch } = usePartners(
    { status: 'active' }, // filters
    { page: 1, pageSize: 50 } // listParams
  );

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <ApiError error={error} onRetry={refetch} />;
  if (!data?.data || data.data.length === 0) {
    return <EmptyState message="Aucun partenaire" />;
  }

  return (
    <div>
      {data.data.map((partner) => (
        <div key={partner.id}>{partner.name}</div>
      ))}
    </div>
  );
};
```

### Exemple : Créer un partenaire

```tsx
import { useCreatePartner } from '@/hooks/api/usePartners';
import { toast } from 'sonner';

export const CreatePartnerForm = () => {
  const createMutation = useCreatePartner();

  const handleSubmit = async (formData: CreatePartnerInput) => {
    try {
      const result = await createMutation.mutateAsync(formData);
      toast.success('Partenaire créé avec succès');
      // Le cache est automatiquement invalidé
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  );
};
```

## 🔄 Gestion automatique

### JWT & Refresh Token

- Le token JWT est automatiquement ajouté à chaque requête
- En cas de 401, le refresh token est utilisé automatiquement
- Si le refresh échoue, redirection vers `/login`

### Request ID

- Un UUID est généré pour chaque requête
- Loggé en développement pour corrélation avec le backend

### Invalidation du cache

- Après une mutation, les queries spécifiées sont automatiquement invalidées
- Exemple : `useCreatePartner` invalide `['partners']`

## 📝 Contrat API

### Format de réponse

```typescript
{
  statusCode: number;
  success: boolean;
  message: string;
  data: T | null;
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
}
```

### Format d'erreur

```typescript
{
  statusCode: number;
  success: false;
  message: string;
  meta?: {
    details?: {
      code?: string;
      field?: string;
    };
  };
}
```

## 🚫 Suppression des mocks

- Les mocks MSW sont désactivés en production
- Utiliser uniquement l'API réelle
- Les états vides affichent "0" ou "Aucune donnée" (jamais de chiffres inventés)

## ✅ Checklist

- [x] Configuration API centralisée
- [x] Client HTTP avec JWT + refresh
- [x] TanStack Query configuré
- [x] Hooks API de base
- [x] Composants d'erreur et état vide
- [x] Logger structuré
- [x] Types DTO
- [x] Hooks spécifiques (partners, offers)
- [ ] Suppression des mocks (sauf tests)
- [ ] Migration des composants existants

## 🔗 Ressources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [API Backend Documentation](../kashup-api/README.md)

