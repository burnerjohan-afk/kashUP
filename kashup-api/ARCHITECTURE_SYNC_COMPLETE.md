# 🏗️ Architecture de Synchronisation Kashup (API + Admin + Mobile)

## 📋 Table des matières

1. [Contrat API Canonique](#1-contrat-api-canonique)
2. [Ressources à Synchroniser](#2-ressources-à-synchroniser)
3. [Modifications API Nécessaires](#3-modifications-api-nécessaires)
4. [Prompt Kashup-Admin](#4-prompt-kashup-admin)
5. [Prompt Kashup-Mobile](#5-prompt-kashup-mobile)
6. [Checklist de Validation](#6-checklist-de-validation)

---

## 1. Contrat API Canonique

### 1.1 Base Path & Versioning

- **Base Path** : `/api/v1` (canonique)
- **Compatibilité** : Les routes racines (`/partners`, `/offers`, etc.) sont maintenues pour compatibilité
- **Health Check** : `GET /health` ou `GET /api/v1/health`

### 1.2 Authentification

- **Méthode** : Bearer JWT Token
- **Header** : `Authorization: Bearer <token>`
- **Token** : Obtenu via `POST /api/v1/auth/login`
- **Refresh** : Non implémenté actuellement (à ajouter si nécessaire)

### 1.3 RBAC (Role-Based Access Control)

- **Roles** : `admin`, `partner`, `user`
- **Middleware** : `authMiddleware` + `requireRoles(...roles)`
- **Endpoints Admin** : Préfixe `/admin/*` + `requireRoles('admin')`
- **Endpoints Mobile** : Préfixe `/me/*` ou publics (partners, offers, rewards)

### 1.4 Format de Réponse Standard

```typescript
// Succès
{
  "statusCode": 200,
  "success": true,
  "message": "Opération réussie",
  "data": T, // Données de la ressource
  "meta": { // Optionnel
    "pagination": {
      "page": 1,
      "pageSize": 50,
      "total": 100,
      "totalPages": 2,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "requestId": "uuid"
  }
}

// Erreur
{
  "statusCode": 400 | 401 | 403 | 404 | 409 | 500,
  "success": false,
  "message": "Message d'erreur",
  "data": null,
  "meta": {
    "details": {
      "code": "ERROR_CODE",
      "field": "fieldName", // Si erreur de validation
      "value": "invalidValue"
    },
    "requestId": "uuid"
  }
}
```

### 1.5 Pagination Standard

**Query Parameters** :
- `page` : Numéro de page (défaut: 1, min: 1)
- `pageSize` : Taille de page (défaut: 50, max: 200)
- `sort` : Tri (défaut: `-updatedAt`, format: `-field` pour DESC, `field` pour ASC)
- `updatedSince` : ISO 8601 date pour delta sync (ex: `2024-01-01T00:00:00Z`)
- `includeDeleted` : `true`/`false` pour inclure les entités soft-deleted (défaut: `false`)

**Réponse Meta** :
```typescript
{
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 100,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 1.6 Filtres Standards

**Par ressource** :
- `status` : Filtre par statut (ex: `confirmed`, `pending`, `active`, `inactive`)
- `territory` / `territories` : Filtre par territoire (ex: `Martinique`, `Guadeloupe`)
- `source` : Filtre par source (ex: `carte`, `manual`, `api`)
- `dateFrom` / `dateTo` : Filtre par plage de dates (ISO 8601)
- `search` : Recherche textuelle (nom, description, etc.)

### 1.7 Observabilité

- **Request ID** : Header `X-Request-Id` (généré automatiquement si absent)
- **Logs structurés** : Toutes les requêtes sont loggées avec `requestId`, `userId`, `role`, `method`, `path`, `status`, `duration`
- **Anonymisation** : Les champs sensibles (password, token, iban) sont masqués dans les logs

---

## 2. Ressources à Synchroniser

### 2.1 Liste Complète des Ressources

| Ressource | Endpoint List | Endpoint Detail | CRUD Admin | CRUD Mobile | Delta Sync | Soft Delete |
|-----------|---------------|-----------------|-----------|-------------|------------|-------------|
| **Users** | `GET /admin/users` | `GET /admin/users/:id` | ✅ | ❌ | ✅ | ❌ |
| **Partners** | `GET /partners` | `GET /partners/:id` | ✅ | ❌ | ✅ | ✅ |
| **PartnerCategories** | `GET /partners/categories` | - | ✅ | ❌ | ✅ | ✅ |
| **Offers** | `GET /offers/current` | `GET /offers/:id` | ✅ | ❌ | ✅ | ✅ |
| **Rewards (Boosts)** | `GET /rewards/boosts` | `GET /rewards/:id` | ✅ | ✅ (purchase) | ✅ | ✅ |
| **Rewards (Badges)** | `GET /rewards/badges` | `GET /rewards/:id` | ✅ | ❌ | ✅ | ✅ |
| **Transactions** | `GET /transactions` | `GET /transactions/:id` | ✅ | ✅ (create) | ✅ | ❌ |
| **GiftCards** | `GET /gift-cards` | `GET /gift-cards/:id` | ✅ | ✅ (purchase) | ✅ | ✅ |
| **Donations** | `GET /donations/categories` | `GET /donations/:id` | ✅ | ✅ (create) | ✅ | ✅ |
| **Notifications** | `GET /me/notifications` | `GET /me/notifications/:id` | ✅ | ✅ (read) | ✅ | ❌ |
| **Consents** | `GET /me/consent` | - | ❌ | ✅ (update) | ✅ | ❌ |
| **PowensConnections** | `GET /integrations/powens/connections` | `GET /integrations/powens/connections/:id` | ❌ | ✅ (create/sync) | ✅ | ❌ |

### 2.2 Endpoints CRUD Canoniques

Pour chaque ressource synchronisée, les endpoints suivants doivent être disponibles :

#### Pattern Standard

```typescript
// LIST (avec pagination, tri, filtres, delta sync)
GET /api/v1/{resource}
  Query: ?page=1&pageSize=50&sort=-updatedAt&updatedSince=2024-01-01T00:00:00Z&status=active&territory=Martinique

// DETAIL
GET /api/v1/{resource}/:id

// CREATE (Admin uniquement sauf exceptions)
POST /api/v1/{resource}
  Body: { ...resourceData }
  Response: 201 + ressource complète avec updatedAt

// UPDATE (Admin uniquement sauf exceptions)
PATCH /api/v1/{resource}/:id
  Body: { ...partialResourceData }
  Response: 200 + ressource complète avec updatedAt

// DELETE (Soft delete si applicable)
DELETE /api/v1/{resource}/:id
  Response: 200 + { message: "Ressource supprimée" }
```

### 2.3 Champs Obligatoires dans les Réponses

Toutes les ressources doivent inclure :
- `id` : Identifiant unique (CUID)
- `createdAt` : Date de création (ISO 8601)
- `updatedAt` : Date de dernière modification (ISO 8601)
- `deletedAt` : Date de suppression (ISO 8601, null si non supprimé) - si soft delete activé

---

## 3. Modifications API Nécessaires

### 3.1 État Actuel vs Cible

#### ✅ Déjà Implémenté

- ✅ Base path `/api/v1` configuré
- ✅ Format de réponse standardisé (`sendSuccess`, `sendError`)
- ✅ Helper `listing.ts` avec `parseListParams`, `buildListQuery`, `buildListMeta`
- ✅ Delta sync (`updatedSince`) pour plusieurs ressources
- ✅ Pagination standardisée
- ✅ Tri par défaut `-updatedAt`
- ✅ Soft delete support (`deletedAt` dans plusieurs modèles)
- ✅ Observabilité (`X-Request-Id`, logs structurés)
- ✅ Auth JWT + RBAC
- ✅ Validation Zod

#### ⚠️ À Finaliser / Améliorer

1. **Delta Sync Universel** : S'assurer que TOUTES les ressources synchronisées supportent `updatedSince`
2. **Soft Delete Cohérent** : Vérifier que tous les modèles avec `deletedAt` l'utilisent correctement
3. **Endpoint Sync Global** : Optionnel mais recommandé : `GET /api/v1/sync/changes?since=...`
4. **Webhooks** : Vérifier que les webhooks sont émis après chaque mutation
5. **Cache Invalidation** : S'assurer que les headers `Cache-Control` sont corrects

### 3.2 Fichiers à Modifier / Vérifier

#### Priorité 1 (Critique)

1. **`src/services/partner.service.ts`** : ✅ Déjà OK (delta sync implémenté)
2. **`src/services/offer.service.ts`** : ✅ Déjà OK (delta sync implémenté)
3. **`src/services/reward.service.ts`** : ✅ Déjà OK (delta sync implémenté)
4. **`src/services/giftCard.service.ts`** : ✅ Déjà OK (delta sync implémenté)
5. **`src/services/donation.service.ts`** : ✅ Déjà OK (delta sync implémenté)
6. **`src/services/transaction.service.ts`** : ✅ Déjà OK (delta sync implémenté)

#### Priorité 2 (Recommandé)

7. **`src/services/notification.service.ts`** : Vérifier delta sync
8. **`src/services/consent.service.ts`** : Vérifier delta sync
9. **`src/services/powensIntegration.service.ts`** : Vérifier delta sync

#### Priorité 3 (Optionnel)

10. **`src/controllers/sync.controller.ts`** (NOUVEAU) : Endpoint global de sync
11. **`src/services/webhook.service.ts`** : Vérifier émission après mutations

### 3.3 Endpoint Sync Global (Optionnel mais Recommandé)

Créer `GET /api/v1/sync/changes?since=2024-01-01T00:00:00Z` qui retourne :

```typescript
{
  "statusCode": 200,
  "success": true,
  "data": {
    "changes": [
      { "type": "partner", "id": "xxx", "action": "updated", "updatedAt": "2024-01-01T10:00:00Z" },
      { "type": "offer", "id": "yyy", "action": "created", "updatedAt": "2024-01-01T11:00:00Z" },
      { "type": "partner", "id": "zzz", "action": "deleted", "updatedAt": "2024-01-01T12:00:00Z", "deletedAt": "2024-01-01T12:00:00Z" }
    ],
    "since": "2024-01-01T00:00:00Z",
    "count": 3
  }
}
```

**Implémentation** : Voir section 3.4

### 3.4 Code à Ajouter (Optionnel)

#### Fichier : `src/controllers/sync.controller.ts`

```typescript
import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { parseListParams } from '../utils/listing';
import prisma from '../config/prisma';

export const getSyncChanges = asyncHandler(async (req: Request, res: Response) => {
  const { updatedSince } = parseListParams(req.query);
  
  if (!updatedSince) {
    return sendSuccess(res, { changes: [], since: null, count: 0 });
  }

  // Récupérer les changements de toutes les ressources synchronisées
  const [partners, offers, rewards, giftCards, donations, transactions] = await Promise.all([
    prisma.partner.findMany({
      where: { updatedAt: { gt: updatedSince }, deletedAt: null },
      select: { id: true, updatedAt: true, deletedAt: true },
      orderBy: { updatedAt: 'asc' }
    }),
    prisma.partnerOffer.findMany({
      where: { updatedAt: { gt: updatedSince }, deletedAt: null },
      select: { id: true, updatedAt: true, deletedAt: true },
      orderBy: { updatedAt: 'asc' }
    }),
    prisma.boost.findMany({
      where: { updatedAt: { gt: updatedSince }, deletedAt: null },
      select: { id: true, updatedAt: true, deletedAt: true },
      orderBy: { updatedAt: 'asc' }
    }),
    prisma.giftCard.findMany({
      where: { updatedAt: { gt: updatedSince }, deletedAt: null },
      select: { id: true, updatedAt: true, deletedAt: true },
      orderBy: { updatedAt: 'asc' }
    }),
    prisma.donationCategory.findMany({
      where: { updatedAt: { gt: updatedSince }, deletedAt: null },
      select: { id: true, updatedAt: true, deletedAt: true },
      orderBy: { updatedAt: 'asc' }
    }),
    prisma.transaction.findMany({
      where: { updatedAt: { gt: updatedSince }, status: 'confirmed' },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' }
    })
  ]);

  // Récupérer les suppressions (deletedAt > updatedSince)
  const [deletedPartners, deletedOffers, deletedRewards, deletedGiftCards, deletedDonations] = await Promise.all([
    prisma.partner.findMany({
      where: { deletedAt: { gt: updatedSince, not: null } },
      select: { id: true, deletedAt: true },
      orderBy: { deletedAt: 'asc' }
    }),
    prisma.partnerOffer.findMany({
      where: { deletedAt: { gt: updatedSince, not: null } },
      select: { id: true, deletedAt: true },
      orderBy: { deletedAt: 'asc' }
    }),
    prisma.boost.findMany({
      where: { deletedAt: { gt: updatedSince, not: null } },
      select: { id: true, deletedAt: true },
      orderBy: { deletedAt: 'asc' }
    }),
    prisma.giftCard.findMany({
      where: { deletedAt: { gt: updatedSince, not: null } },
      select: { id: true, deletedAt: true },
      orderBy: { deletedAt: 'asc' }
    }),
    prisma.donationCategory.findMany({
      where: { deletedAt: { gt: updatedSince, not: null } },
      select: { id: true, deletedAt: true },
      orderBy: { deletedAt: 'asc' }
    })
  ]);

  const changes = [
    ...partners.map(p => ({ type: 'partner', id: p.id, action: 'updated' as const, updatedAt: p.updatedAt })),
    ...offers.map(o => ({ type: 'offer', id: o.id, action: 'updated' as const, updatedAt: o.updatedAt })),
    ...rewards.map(r => ({ type: 'reward', id: r.id, action: 'updated' as const, updatedAt: r.updatedAt })),
    ...giftCards.map(g => ({ type: 'giftCard', id: g.id, action: 'updated' as const, updatedAt: g.updatedAt })),
    ...donations.map(d => ({ type: 'donation', id: d.id, action: 'updated' as const, updatedAt: d.updatedAt })),
    ...transactions.map(t => ({ type: 'transaction', id: t.id, action: 'updated' as const, updatedAt: t.updatedAt })),
    ...deletedPartners.map(p => ({ type: 'partner', id: p.id, action: 'deleted' as const, updatedAt: p.deletedAt!, deletedAt: p.deletedAt! })),
    ...deletedOffers.map(o => ({ type: 'offer', id: o.id, action: 'deleted' as const, updatedAt: o.deletedAt!, deletedAt: o.deletedAt! })),
    ...deletedRewards.map(r => ({ type: 'reward', id: r.id, action: 'deleted' as const, updatedAt: r.deletedAt!, deletedAt: r.deletedAt! })),
    ...deletedGiftCards.map(g => ({ type: 'giftCard', id: g.id, action: 'deleted' as const, updatedAt: g.deletedAt!, deletedAt: g.deletedAt! })),
    ...deletedDonations.map(d => ({ type: 'donation', id: d.id, action: 'deleted' as const, updatedAt: d.deletedAt!, deletedAt: d.deletedAt! }))
  ].sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  sendSuccess(res, {
    changes,
    since: updatedSince.toISOString(),
    count: changes.length
  });
});
```

#### Fichier : `src/routes/sync.routes.ts` (NOUVEAU)

```typescript
import { Router } from 'express';
import { getSyncChanges } from '../controllers/sync.controller';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

router.get('/changes', authMiddleware, getSyncChanges);

export default router;
```

#### Modification : `src/routes/index.ts`

```typescript
// Ajouter après les autres imports
import syncRoutes from './sync.routes';

// Ajouter dans router.use
router.use('/sync', syncRoutes);
```

---

## 4. Prompt Kashup-Admin

**📋 PROMPT À COLLER DANS CURSOR (REPO KASHUP-ADMIN)**

```
Tu es un expert React/TypeScript/Vite spécialisé dans la construction d'interfaces d'administration robustes.

CONTEXTE :
- Projet : Kashup-admin (back office React/Vite/TypeScript)
- API Backend : Kashup-api (Node/TS/Prisma) disponible sur http://localhost:4000/api/v1
- Objectif : Créer une liaison STABLE et EFFICACE avec l'API pour que toute création/modification soit persistée et reflétée correctement

CONTRAT API (Source de vérité) :

Base URL : http://localhost:4000/api/v1
Auth : Bearer JWT (header Authorization: Bearer <token>)
Format Réponse : { statusCode, success, message, data, meta?: { pagination, requestId } }
Format Erreur : { statusCode, success: false, message, data: null, meta?: { details } }

Endpoints Principaux :
- Auth : POST /auth/login, POST /auth/signup
- Partners : GET /partners (pagination, sort, updatedSince, filters), GET /partners/:id, POST /partners, PATCH /partners/:id, DELETE /partners/:id
- Offers : GET /offers/current (pagination, sort, updatedSince), POST /offers, PATCH /offers/:id
- Rewards : GET /rewards/boosts (pagination, sort, updatedSince), GET /rewards/badges, POST /rewards, PATCH /rewards/:id
- Transactions : GET /transactions (pagination, filters), POST /transactions
- GiftCards : GET /gift-cards (pagination, sort, updatedSince), POST /gift-cards
- Donations : GET /donations/categories (pagination, sort, updatedSince)
- Users : GET /admin/users (pagination, filters), GET /admin/users/:id
- Dashboard : GET /admin/dashboard, GET /admin/dashboard/metrics
- Statistics : GET /admin/statistics/table, GET /admin/statistics/departments

Pagination Standard :
- Query params : ?page=1&pageSize=50&sort=-updatedAt&updatedSince=2024-01-01T00:00:00Z
- Réponse meta.pagination : { page, pageSize, total, totalPages, hasNextPage, hasPrevPage }

Delta Sync :
- Paramètre updatedSince (ISO 8601) pour récupérer uniquement les entités modifiées depuis une date
- Tri par défaut : -updatedAt (plus récent en premier)
- Support soft delete : includeDeleted=true pour inclure les entités supprimées

TÂCHES À EFFECTUER :

1) Créer un HttpClient commun (src/lib/api-client.ts) :
- Utiliser fetch ou axios (recommandé : axios pour interceptors)
- Gestion automatique du token JWT (stockage localStorage/sessionStorage)
- Gestion des erreurs uniforme (401 → redirect login, 403 → message, 500 → message)
- Support X-Request-Id pour corrélation
- Retry automatique sur erreurs réseau (optionnel)
- Timeout configurable

2) Configurer TanStack Query (React Query) :
- Provider global avec queryClient
- Configuration par défaut : staleTime, cacheTime, retry
- Mutations avec optimistic updates
- Invalidation automatique après mutations
- Gestion des erreurs globales

3) Créer des hooks personnalisés pour chaque ressource :
- usePartners(queryParams), usePartner(id), useCreatePartner(), useUpdatePartner(), useDeletePartner()
- useOffers(queryParams), useCreateOffer(), useUpdateOffer()
- useRewards(queryParams), useCreateReward(), useUpdateReward()
- useTransactions(queryParams), useCreateTransaction()
- useUsers(queryParams), useUser(id)
- etc.

4) Implémenter la stratégie de cache :
- Cache par défaut : 5 minutes (staleTime)
- Invalidation après mutations (onSuccess → invalidateQueries)
- Optimistic updates pour mutations (create/update/delete)
- Refetch on window focus (optionnel, désactiver si trop agressif)

5) Gestion d'erreurs uniforme :
- Toast/notification pour erreurs (react-hot-toast ou similar)
- Affichage des messages d'erreur de l'API
- États de chargement (loading, error, empty)
- Empty states cohérents (0 transactions = "Aucune transaction", pas de chiffres inventés)

6) Supprimer TOUS les mocks/MSW :
- Rechercher et supprimer tous les fichiers mock, MSW handlers, données de démo
- S'assurer que l'UI affiche toujours des données réelles de l'API
- Si l'API renvoie 0 ou [], afficher un état vide, pas de fallback avec données inventées

7) Normalisation des réponses :
- Créer des types TypeScript pour chaque ressource (Partner, Offer, Transaction, etc.)
- Normaliser les réponses API (data.items → items, data.data → data)
- Gérer les cas null/undefined (toujours retourner [] ou 0, jamais undefined)

8) Journalisation minimale (dev uniquement) :
- Logger les requêtes avec requestId en développement
- Logger les erreurs avec détails en développement
- Désactiver en production

CONTRAINTES STRICTES :
- AUCUN mock/fallback qui invente des données
- Base vide = afficher 0 et [] partout
- Toujours utiliser les données de l'API
- Gestion d'erreurs robuste (pas de crash si API down)
- Types TypeScript stricts (pas de any)

LIVRABLE :
- Code complet et fonctionnel
- Types TypeScript pour toutes les ressources
- Hooks React Query pour toutes les ressources
- Gestion d'erreurs uniforme
- Documentation rapide (README.md) avec exemples d'utilisation
```

---

## 5. Prompt Kashup-Mobile

**📋 PROMPT À COLLER DANS CURSOR (REPO KASHUP-MOBILE)**

```
Tu es un expert React Native/Expo/TypeScript spécialisé dans la construction d'applications mobiles robustes avec synchronisation de données.

CONTEXTE :
- Projet : Kashup-mobile (app client React Native/Expo/TypeScript)
- API Backend : Kashup-api (Node/TS/Prisma) disponible sur http://localhost:4000/api/v1 (ou URL de prod)
- Objectif : Créer une liaison STABLE et EFFICACE avec l'API pour synchroniser les données et refléter les changements du back office

CONTRAT API (Source de vérité) :

Base URL : http://localhost:4000/api/v1 (ou variable d'environnement)
Auth : Bearer JWT (header Authorization: Bearer <token>)
Format Réponse : { statusCode, success, message, data, meta?: { pagination, requestId } }
Format Erreur : { statusCode, success: false, message, data: null, meta?: { details } }

Endpoints Principaux (Mobile-facing) :
- Auth : POST /auth/login, POST /auth/signup
- Partners : GET /partners (pagination, sort, updatedSince, filters), GET /partners/:id
- Offers : GET /offers/current (pagination, sort, updatedSince)
- Rewards : GET /rewards/boosts (pagination, sort, updatedSince), GET /rewards/badges, POST /rewards/boosts/:id/purchase
- Transactions : GET /me/transactions, POST /transactions
- GiftCards : GET /gift-cards (pagination, sort, updatedSince), POST /gift-cards/purchase
- Donations : GET /donations/categories (pagination, sort, updatedSince), POST /donations
- Notifications : GET /me/notifications, POST /me/notifications/:id/read
- Wallet : GET /me/wallet, GET /me/wallet/history
- User : GET /me, PATCH /me, GET /me/export, DELETE /me/account
- Powens : GET /integrations/powens/connections, POST /integrations/powens/sync

Pagination Standard :
- Query params : ?page=1&pageSize=50&sort=-updatedAt&updatedSince=2024-01-01T00:00:00Z
- Réponse meta.pagination : { page, pageSize, total, totalPages, hasNextPage, hasPrevPage }

Delta Sync :
- Paramètre updatedSince (ISO 8601) pour récupérer uniquement les entités modifiées depuis une date
- Tri par défaut : -updatedAt (plus récent en premier)
- Support soft delete : includeDeleted=true pour inclure les entités supprimées

TÂCHES À EFFECTUER :

1) Créer un HttpClient commun (src/lib/api-client.ts) :
- Utiliser fetch ou axios (recommandé : axios pour interceptors)
- Gestion automatique du token JWT (stockage AsyncStorage/SecureStore)
- Refresh token si applicable (actuellement non implémenté côté API)
- Gestion des erreurs uniforme (401 → redirect login, 403 → message, 500 → message)
- Support X-Request-Id pour corrélation
- Retry automatique sur erreurs réseau (avec backoff exponentiel)
- Timeout configurable (30s par défaut)

2) Configurer le store/cache local :
- Option A : TanStack Query (React Query) avec persistence AsyncStorage
- Option B : Redux Toolkit + RTK Query avec persistence
- Option C : Zustand + React Query
- Recommandation : TanStack Query + AsyncStorage pour simplicité

3) Implémenter la stratégie de synchronisation :
- Refresh au login : Charger toutes les données à jour au moment du login
- Delta sync périodique : Toutes les 5-10 minutes, appeler les endpoints avec updatedSince=<dernière_sync>
- Pull-to-refresh : Sur chaque écran de liste, permettre un refresh manuel
- Background sync : Optionnel, utiliser BackgroundFetch (Expo) pour sync en arrière-plan

4) Gestion offline (si prévu) :
- Queue des mutations (create/update) dans AsyncStorage
- Replay automatique des mutations quand la connexion revient
- Affichage d'un indicateur "Mode hors ligne" si pas de connexion
- Cache des données pour affichage offline (dernières données connues)

5) Créer des hooks/services pour chaque ressource :
- usePartners(queryParams), usePartner(id)
- useOffers(queryParams)
- useRewards(queryParams), usePurchaseBoost()
- useTransactions(), useCreateTransaction()
- useGiftCards(queryParams), usePurchaseGiftCard()
- useDonations(queryParams), useCreateDonation()
- useNotifications(), useMarkNotificationRead()
- useWallet(), useWalletHistory()
- useMe(), useUpdateMe()
- usePowensConnections(), useSyncPowens()

6) Gestion d'erreurs + états vides :
- Toast/notification pour erreurs (expo-notifications ou react-native-toast-message)
- Affichage des messages d'erreur de l'API
- États de chargement (loading, error, empty)
- Empty states cohérents (0 transactions = "Aucune transaction", pas de chiffres inventés)
- Retry manuel sur erreur

7) Supprimer TOUS les mocks/fallbacks :
- Rechercher et supprimer tous les fichiers mock, données de démo, fallbacks inventés
- S'assurer que l'UI affiche toujours des données réelles de l'API
- Si l'API renvoie 0 ou [], afficher un état vide, pas de fallback avec données inventées

8) Normalisation des réponses :
- Créer des types TypeScript pour chaque ressource (Partner, Offer, Transaction, etc.)
- Normaliser les réponses API (data.items → items, data.data → data)
- Gérer les cas null/undefined (toujours retourner [] ou 0, jamais undefined)

9) Persistence du token et données :
- Token JWT : Stocker dans SecureStore (Expo) ou Keychain (iOS) / Keystore (Android)
- Données cache : Persister dans AsyncStorage pour affichage offline
- Last sync timestamp : Stocker la date de dernière synchronisation pour delta sync

10) Gestion de la synchronisation :
- Créer un hook useSync() qui gère la synchronisation globale
- Au login : Appeler useSync({ full: true }) pour charger toutes les données
- Périodiquement : Appeler useSync({ since: lastSyncTimestamp }) pour delta sync
- Sur pull-to-refresh : Appeler useSync({ since: lastSyncTimestamp }) pour refresh

CONTRAINTES STRICTES :
- AUCUN mock/fallback qui invente des données
- Base vide = afficher 0 et [] partout
- Toujours utiliser les données de l'API
- Gestion d'erreurs robuste (pas de crash si API down)
- Types TypeScript stricts (pas de any)
- Performance : Limiter les appels API (pagination, delta sync)
- UX : Indicateurs de chargement clairs, états vides informatifs

LIVRABLE :
- Code complet et fonctionnel
- Types TypeScript pour toutes les ressources
- Hooks/services pour toutes les ressources
- Stratégie de synchronisation implémentée
- Gestion offline (si applicable)
- Documentation rapide (README.md) avec exemples d'utilisation
```

---

## 6. Checklist de Validation

### 6.1 Tests API (Côté Backend)

- [ ] **Test CRUD Partenaire** :
  - Admin crée un partenaire via `POST /api/v1/partners`
  - Vérifier que `GET /api/v1/partners` retourne le nouveau partenaire
  - Vérifier que `updatedAt` est présent et correct
  - Mobile appelle `GET /api/v1/partners?updatedSince=<timestamp>` et voit le nouveau partenaire

- [ ] **Test Delta Sync** :
  - Créer/modifier plusieurs ressources (partners, offers, rewards)
  - Appeler `GET /api/v1/partners?updatedSince=<timestamp_avant>` et vérifier que seules les ressources modifiées sont retournées
  - Vérifier que le tri `-updatedAt` fonctionne (plus récent en premier)

- [ ] **Test Base Vide** :
  - Vider la base de données (ou utiliser une base de test vide)
  - Vérifier que tous les endpoints retournent `0` pour les nombres et `[]` pour les listes
  - Vérifier qu'aucun chiffre fantôme n'est affiché

- [ ] **Test Soft Delete** :
  - Supprimer une ressource (ex: partenaire)
  - Vérifier que `deletedAt` est défini
  - Vérifier que `GET /api/v1/partners` (sans `includeDeleted=true`) n'inclut pas la ressource supprimée
  - Vérifier que `GET /api/v1/partners?includeDeleted=true` inclut la ressource supprimée

- [ ] **Test Observabilité** :
  - Faire une requête et vérifier que `X-Request-Id` est présent dans la réponse
  - Vérifier que les logs contiennent `requestId`, `userId`, `method`, `path`, `status`, `duration`

### 6.2 Tests Admin (Côté Frontend)

- [ ] **Test Création Partenaire** :
  - Créer un partenaire dans l'admin
  - Vérifier que l'UI se met à jour immédiatement (optimistic update ou refetch)
  - Vérifier que le partenaire apparaît dans la liste

- [ ] **Test Modification Partenaire** :
  - Modifier un partenaire dans l'admin
  - Vérifier que l'UI se met à jour immédiatement
  - Vérifier que les changements sont persistés

- [ ] **Test Suppression Partenaire** :
  - Supprimer un partenaire dans l'admin
  - Vérifier que l'UI se met à jour immédiatement
  - Vérifier que le partenaire disparaît de la liste

- [ ] **Test Base Vide** :
  - Avec une base vide, vérifier que le dashboard affiche `0` partout
  - Vérifier que les listes affichent des états vides (pas de données inventées)

- [ ] **Test Gestion d'Erreurs** :
  - Simuler une erreur API (déconnecter le backend)
  - Vérifier que l'UI affiche un message d'erreur clair
  - Vérifier que l'UI ne crash pas

### 6.3 Tests Mobile (Côté Frontend)

- [ ] **Test Synchronisation au Login** :
  - Se connecter dans l'app mobile
  - Vérifier que toutes les données sont chargées (partners, offers, rewards, etc.)

- [ ] **Test Delta Sync** :
  - Créer/modifier une ressource dans l'admin
  - Attendre la synchronisation périodique (ou déclencher pull-to-refresh)
  - Vérifier que la ressource apparaît/mise à jour dans l'app mobile

- [ ] **Test Pull-to-Refresh** :
  - Faire un pull-to-refresh sur un écran de liste
  - Vérifier que les données sont rafraîchies
  - Vérifier que l'indicateur de chargement s'affiche

- [ ] **Test Base Vide** :
  - Avec une base vide, vérifier que l'app affiche `0` partout
  - Vérifier que les listes affichent des états vides (pas de données inventées)

- [ ] **Test Gestion Offline** (si applicable) :
  - Déconnecter l'app (mode avion)
  - Vérifier que les données en cache s'affichent
  - Vérifier qu'un indicateur "Mode hors ligne" s'affiche
  - Reconnecter et vérifier que la synchronisation reprend

### 6.4 Plan de Test Manuel (10 Étapes)

1. **Admin crée un partenaire** :
   - Se connecter dans l'admin
   - Créer un nouveau partenaire "Test Partner"
   - Vérifier que le partenaire apparaît dans la liste immédiatement

2. **Mobile voit le partenaire** :
   - Se connecter dans l'app mobile
   - Aller sur l'écran "Partenaires"
   - Vérifier que "Test Partner" apparaît dans la liste

3. **Admin modifie le partenaire** :
   - Dans l'admin, modifier "Test Partner" (changer le nom en "Test Partner Modifié")
   - Vérifier que la modification est persistée

4. **Mobile voit la modification** :
   - Dans l'app mobile, faire un pull-to-refresh sur l'écran "Partenaires"
   - Vérifier que le nom est mis à jour à "Test Partner Modifié"

5. **Admin crée une offre** :
   - Dans l'admin, créer une nouvelle offre pour "Test Partner"
   - Vérifier que l'offre apparaît dans la liste

6. **Mobile voit l'offre** :
   - Dans l'app mobile, aller sur l'écran "Offres"
   - Vérifier que la nouvelle offre apparaît

7. **Admin supprime le partenaire** :
   - Dans l'admin, supprimer "Test Partner Modifié"
   - Vérifier que le partenaire disparaît de la liste

8. **Mobile voit la suppression** :
   - Dans l'app mobile, faire un pull-to-refresh sur l'écran "Partenaires"
   - Vérifier que "Test Partner Modifié" n'apparaît plus

9. **Test base vide** :
   - Vider la base de données
   - Vérifier que l'admin affiche `0` partout (dashboard, listes)
   - Vérifier que l'app mobile affiche `0` partout (wallet, transactions, etc.)

10. **Test erreur API** :
    - Déconnecter le backend
    - Vérifier que l'admin affiche un message d'erreur (pas de crash)
    - Vérifier que l'app mobile affiche un message d'erreur (pas de crash)
    - Reconnecter le backend et vérifier que tout fonctionne à nouveau

---

## 7. Résumé des Modifications API

### 7.1 Fichiers Modifiés (Si Nécessaire)

1. **`src/routes/index.ts`** : Ajouter route `/sync` (optionnel)
2. **`src/controllers/sync.controller.ts`** : NOUVEAU (optionnel)
3. **`src/routes/sync.routes.ts`** : NOUVEAU (optionnel)
4. **`src/services/webhook.service.ts`** : Vérifier émission après mutations

### 7.2 Commandes à Exécuter

```bash
# 1. Vérifier que tout compile
npm run build

# 2. Lancer les tests
npm test

# 3. Démarrer l'API
npm run dev

# 4. Vérifier Prisma Studio
npx prisma studio
```

---

## 8. Conclusion

L'API est **déjà bien structurée** avec :
- ✅ Contrat API standardisé
- ✅ Delta sync implémenté pour la plupart des ressources
- ✅ Pagination, tri, filtres standardisés
- ✅ Observabilité (requestId, logs)
- ✅ Auth + RBAC
- ✅ Format de réponse cohérent

**Actions requises** :
1. Vérifier que toutes les ressources supportent `updatedSince` (déjà fait pour la plupart)
2. Optionnel : Ajouter endpoint `/sync/changes` pour sync global
3. Générer les prompts pour les clients (déjà fournis ci-dessus)
4. Tester la synchronisation end-to-end

**Les prompts pour Kashup-admin et Kashup-mobile sont prêts à être utilisés** (sections 4 et 5).

