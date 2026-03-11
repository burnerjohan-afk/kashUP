# Routes API utilisées par l'admin

Ce document récapitule toutes les routes API appelées par le back office kashup-admin.

## Convention

- **Base URL**: `http://localhost:4000/api/v1` (configurable via `VITE_API_BASE_URL`)
- **Admin endpoints**: `/api/v1/admin/<resource>` (données complètes, champs sensibles)
- **Public endpoints**: `/api/v1/<resource>` (données filtrées)
- **Fallback automatique**: L'admin essaie toujours `/admin/<resource>` en premier, puis fallback sur `/<resource>` si 404

## Ressources

### Partners (Partenaires)

| Action | Endpoint Admin | Endpoint Public (fallback) | Méthode |
|--------|---------------|---------------------------|---------|
| Liste | `GET /api/v1/admin/partners` | `GET /api/v1/partners` | `getResource` |
| Détail | `GET /api/v1/admin/partners/:id` | `GET /api/v1/partners/:id` | `getResourceById` |
| Créer | `POST /api/v1/admin/partners` | `POST /api/v1/partners` | `createResource` |
| Mettre à jour | `PATCH /api/v1/admin/partners/:id` | `PATCH /api/v1/partners/:id` | `updateResource` |
| Catégories | `GET /api/v1/partners/categories` | - | `getStandardJson` |
| Statistiques | `GET /api/v1/partners/:id/statistics` | - | `getJson` |
| Documents | `GET /api/v1/partners/:id/documents` | - | `getStandardJson` |
| Upload document | `POST /api/v1/partners/:id/documents` | - | `postStandardJson` |
| Supprimer document | `DELETE /api/v1/partners/:id/documents/:docId` | - | `deleteStandardJson` |

**Fichier**: `src/features/partners/api.ts`

### Offers (Offres)

| Action | Endpoint | Méthode |
|--------|----------|---------|
| Liste (actuelles) | `GET /api/v1/offers/current` | `getStandardJson` |
| Créer | `POST /api/v1/offers` | `postStandardJson` |
| Mettre à jour | `PATCH /api/v1/offers/:id` | `patchStandardJson` |

**Fichier**: `src/features/offers/api.ts`

### Users (Utilisateurs)

| Action | Endpoint | Méthode |
|--------|----------|---------|
| Liste | `GET /api/v1/admin/users` | `getStandardJson` |
| Transactions | `GET /api/v1/admin/users/:id/transactions` | `getStandardJson` |
| Rewards | `GET /api/v1/admin/users/:id/rewards/history` | `getStandardJson` |
| Gift Cards | `GET /api/v1/admin/users/:id/gift-cards` | `getStandardJson` |
| Reset password | `POST /api/v1/admin/users/:id/reset-password` | `postStandardJson` |
| Force KYC | `PATCH /api/v1/admin/users/:id/kyc/force` | `patchStandardJson` |
| Statistiques | `GET /api/v1/admin/users/:id/statistics` | `getStandardJson` |
| Ajustement wallet | `POST /api/v1/transactions` | `postStandardJson` |

**Fichier**: `src/features/users/api.ts`

### Gift Cards (Cartes cadeaux)

| Action | Endpoint | Méthode |
|--------|----------|---------|
| Catalogue | `GET /api/v1/gift-cards` | `getJson` |
| Commandes | `GET /api/v1/gift-cards/orders` | `getJson` |
| Acheter | `POST /api/v1/gift-cards/purchase` | `postJson` |
| Export | `GET /api/v1/gift-cards/export` | `downloadFile` |
| Config | `GET /api/v1/gift-cards/config` | `getJson` |
| Mettre à jour config | `PATCH /api/v1/gift-cards/config` | `patchFormData` |
| Box UP config | `GET /api/v1/gift-cards/box-up/config` | `getJson` |
| Mettre à jour Box UP | `PATCH /api/v1/gift-cards/box-up/config` | `patchFormData` |

**Fichier**: `src/features/gift-cards/api.ts`

### Transactions

| Action | Endpoint | Méthode |
|--------|----------|---------|
| Liste | `GET /api/v1/admin/transactions` | `getStandardJson` |

**Fichier**: `src/features/transactions/api.ts`

### Dashboard

| Action | Endpoint | Méthode |
|--------|----------|---------|
| Statistiques | `GET /api/v1/admin/dashboard/statistics` | `getStandardJson` |
| KPIs | `GET /api/v1/admin/dashboard/kpis` | `getStandardJson` |

**Fichier**: `src/features/dashboard/api.ts`

### Rewards (Récompenses)

| Action | Endpoint | Méthode |
|--------|----------|---------|
| Liste | `GET /api/v1/admin/rewards` | `getStandardJson` |
| Créer | `POST /api/v1/admin/rewards` | `postStandardJson` |
| Mettre à jour | `PATCH /api/v1/admin/rewards/:id` | `patchStandardJson` |

**Fichier**: `src/features/rewards/api.ts`

### Notifications

| Action | Endpoint | Méthode |
|--------|----------|---------|
| Liste | `GET /api/v1/admin/notifications` | `getStandardJson` |
| Créer | `POST /api/v1/admin/notifications` | `postStandardJson` |

**Fichier**: `src/features/notifications/api.ts`

### Webhooks

| Action | Endpoint | Méthode |
|--------|----------|---------|
| Liste | `GET /api/v1/admin/webhooks` | `getStandardJson` |
| Détail | `GET /api/v1/admin/webhooks/:id` | `getStandardJson` |

**Fichier**: `src/features/webhooks/api.ts`

### Settings (Paramètres)

| Action | Endpoint | Méthode |
|--------|----------|---------|
| Récupérer | `GET /api/v1/admin/settings` | `getStandardJson` |
| Mettre à jour | `PATCH /api/v1/admin/settings` | `patchStandardJson` |

**Fichier**: `src/features/settings/api.ts`

### Auth (Authentification)

| Action | Endpoint | Méthode |
|--------|----------|---------|
| Login | `POST /api/v1/auth/login` | `postStandardJson` |
| Refresh | `POST /api/v1/auth/refresh` | `postStandardJson` |
| Logout | `POST /api/v1/auth/logout` | `postStandardJson` |
| Reset password | `POST /api/v1/auth/reset-password` | `postStandardJson` |

**Fichier**: `src/features/auth/api.ts`

## Helpers disponibles

### `getResource<T>(resource, searchParams?)`
Essaie `/admin/<resource>` puis fallback sur `/<resource>` si 404.

### `getResourceById<T>(resource, id)`
Essaie `/admin/<resource>/<id>` puis fallback sur `/<resource>/<id>` si 404.

### `createResource<T>(resource, body)`
Essaie `POST /admin/<resource>` puis fallback sur `POST /<resource>` si 404.

### `updateResource<T>(resource, id, body)`
Essaie `PATCH /admin/<resource>/<id>` puis fallback sur `PATCH /<resource>/<id>` si 404.

### `deleteResource(resource, id)`
Essaie `DELETE /admin/<resource>/<id>` puis fallback sur `DELETE /<resource>/<id>` si 404.

## Normalisation des URLs d'images

Toutes les URLs d'images sont normalisées automatiquement via `normalizeImageUrl()` :
- `/uploads/logo.png` → `http://localhost:4000/uploads/logo.png`
- `uploads/uploads/logo.png` → `http://localhost:4000/uploads/logo.png` (correction des doublons)
- `http://example.com/image.jpg` → `http://example.com/image.jpg` (inchangé)

**Fichier**: `src/lib/utils/normalizeUrl.ts`

## Configuration

**Fichier**: `src/config/api.ts`

- `API_CONFIG.baseURL`: URL complète avec `/api/v1` (ex: `http://localhost:4000/api/v1`)
- `API_CONFIG.baseOrigin`: URL de base sans `/api/v1` (ex: `http://localhost:4000`) - utilisé pour les images

## Variables d'environnement

Voir `.env.example` pour la configuration.

