# 📋 Contrat API Canonique - Kashup

**Version :** 1.0  
**Date :** 2024-12-13  
**Base URL :** `/api/v1` (canonique) + `/` (compatibilité)

---

## 🎯 Principes fondamentaux

1. **API = Source de vérité unique** : Aucun mock/fallback qui invente des données
2. **Base vide = 0 et []** : Pas de chiffres fantômes, pas de données inventées
3. **Contrat strict** : DTO, pagination, tri, filtres, statuts, erreurs standardisés
4. **Auth cohérente** : JWT Bearer, RBAC (admin vs mobile)
5. **Observabilité** : Logs structurés, `X-Request-Id` pour corrélation

---

## 🔐 Authentification & Autorisation

### Headers requis
```
Authorization: Bearer <JWT_TOKEN>
X-Request-Id: <uuid> (optionnel, généré côté serveur si absent)
```

### Rôles
- `admin` : Accès complet (back office)
- `partner` : Accès limité (partenaires)
- `user` : Accès mobile (utilisateurs finaux)

### Endpoints publics
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/password/forgot`
- `GET /health`
- `GET /partners` (lecture seule, sans auth)
- `GET /partners/:id` (lecture seule, sans auth)
- `GET /offers/current` (lecture seule, sans auth)
- `GET /gift-cards/catalog` (lecture seule, sans auth)

---

## 📦 Format de réponse standard

### Succès (200, 201, etc.)
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Opération réussie",
  "data": <données>,
  "meta": {
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
```

### Erreur (400, 401, 403, 404, 500, etc.)
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Message d'erreur lisible",
  "data": null,
  "meta": {
    "details": {
      "code": "ERROR_CODE",
      "field": "nomDuChamp",
      "requestId": "uuid"
    }
  }
}
```

### Codes HTTP standards
- `200` : Succès (GET, PUT, PATCH)
- `201` : Créé (POST)
- `204` : Succès sans contenu (DELETE)
- `400` : Requête invalide (validation)
- `401` : Non authentifié
- `403` : Non autorisé (permissions insuffisantes)
- `404` : Ressource introuvable
- `409` : Conflit (doublon, état invalide)
- `422` : Erreur de validation (Zod)
- `500` : Erreur serveur

---

## 📊 Pagination & Tri

### Paramètres de liste standard
```
?page=1                    # Numéro de page (défaut: 1)
&pageSize=50               # Taille de page (défaut: 50, max: 200)
&sort=-updatedAt           # Tri (défaut: -updatedAt)
&updatedSince=2024-12-13T10:00:00Z  # Delta sync (ISO 8601)
&includeDeleted=false      # Inclure les soft-deleted (défaut: false)
```

### Format de tri
- `-updatedAt` : Tri décroissant par `updatedAt` (défaut)
- `updatedAt` : Tri croissant par `updatedAt`
- `-createdAt` : Tri décroissant par `createdAt`
- `name` : Tri alphabétique

### Delta Sync
- `updatedSince` : ISO 8601 date/time
- Retourne uniquement les entités avec `updatedAt > updatedSince`
- Exclut les soft-deleted sauf si `includeDeleted=true`
- Tri par défaut : `-updatedAt` (plus récent en premier)

---

## 🔄 Ressources synchronisées

### Liste complète des ressources

| Ressource | Endpoint List | Endpoint Detail | CRUD Admin | CRUD Mobile | Delta Sync |
|-----------|--------------|-----------------|------------|-------------|------------|
| **Users** | `GET /admin/users` | `GET /admin/users/:id` | ✅ | ❌ | ✅ |
| **Partners** | `GET /partners` | `GET /partners/:id` | ✅ | ❌ | ✅ |
| **Offers** | `GET /offers/current` | `GET /offers/:id` | ✅ | ❌ | ✅ |
| **Rewards/Boosts** | `GET /rewards/boosts` | `GET /rewards/boosts/:id` | ✅ | ❌ | ✅ |
| **Transactions** | `GET /transactions` | `GET /transactions/:id` | ✅ | ✅ (own) | ✅ |
| **Gift Cards** | `GET /gift-cards/catalog` | `GET /gift-cards/:id` | ✅ | ❌ | ✅ |
| **Donations** | `GET /donations/categories` | `GET /donations/:id` | ✅ | ✅ | ✅ |
| **Notifications** | `GET /me/notifications` | `GET /me/notifications/:id` | ❌ | ✅ (own) | ✅ |
| **Consents** | `GET /me/consent` | - | ❌ | ✅ (own) | ✅ |
| **Powens Connections** | `GET /integrations/powens/connections` | `GET /integrations/powens/connections/:id` | ❌ | ✅ (own) | ✅ |

---

## 📝 Détails par ressource

### 1. Partners (`/partners`)

#### GET `/api/v1/partners`
**Auth :** Optionnel (public pour lecture)  
**Query params :**
- `search` : Recherche textuelle (nom, description)
- `categoryId` : ID catégorie
- `category` : Nom catégorie
- `territory` : Territoire (Martinique, Guadeloupe, Guyane, 'all')
- `territories` : Array JSON de territoires
- `page`, `pageSize`, `sort`, `updatedSince`, `includeDeleted`

**Réponse :**
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "partners": [
      {
        "id": "cuid",
        "name": "Carrefour Dillon",
        "slug": "carrefour-dillon",
        "logoUrl": "https://...",
        "tauxCashbackBase": 5,
        "territories": ["Martinique"],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "meta": {
    "pagination": { "page": 1, "pageSize": 50, "total": 100, ... }
  }
}
```

#### GET `/api/v1/partners/:id`
**Auth :** Optionnel  
**Réponse :** Objet partner complet

#### POST `/api/v1/partners` (Admin)
**Auth :** Requis (admin)  
**Body :** `createPartnerSchema` (Zod)  
**Multipart :** `logo`, `photos[]`, `menuImages[]`

#### PATCH `/api/v1/partners/:id` (Admin)
**Auth :** Requis (admin)  
**Body :** `updatePartnerSchema` (Zod)

#### DELETE `/api/v1/partners/:id` (Admin)
**Auth :** Requis (admin)  
**Action :** Soft delete (`deletedAt`)

---

### 2. Offers (`/offers`)

#### GET `/api/v1/offers/current`
**Auth :** Optionnel  
**Query params :**
- `territory` : Filtre par territoire
- `page`, `pageSize`, `sort`, `updatedSince`

**Réponse :**
```json
{
  "statusCode": 200,
  "data": {
    "offers": [
      {
        "id": "cuid",
        "title": "Offre spéciale",
        "partnerId": "cuid",
        "partner": { "id": "...", "name": "..." },
        "startsAt": "2024-01-01T00:00:00Z",
        "endsAt": "2024-12-31T23:59:59Z",
        "cashbackRate": 10,
        "status": "active",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  },
  "meta": { "pagination": {...} }
}
```

#### POST `/api/v1/offers` (Admin)
**Auth :** Requis (admin)  
**Body :** `createOfferSchema` (Zod)  
**Multipart :** `image`

#### PATCH `/api/v1/offers/:id` (Admin)
**Auth :** Requis (admin)

#### DELETE `/api/v1/offers/:id` (Admin)
**Auth :** Requis (admin)  
**Action :** Soft delete

---

### 3. Rewards/Boosts (`/rewards`)

#### GET `/api/v1/rewards/boosts`
**Auth :** Optionnel  
**Query params :**
- `territory` : Filtre par territoire
- `page`, `pageSize`, `sort`, `updatedSince`

**Réponse :**
```json
{
  "statusCode": 200,
  "data": {
    "boosts": [
      {
        "id": "cuid",
        "name": "Boost x2",
        "multiplier": 2,
        "startsAt": "...",
        "endsAt": "...",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  },
  "meta": { "pagination": {...} }
}
```

---

### 4. Transactions (`/transactions`)

#### GET `/api/v1/transactions`
**Auth :** Requis  
**Query params :**
- `status` : `confirmed`, `pending`, `all` (défaut: `confirmed`)
- `source` : `carte`, `manual`, `all` (défaut: `all`)
- `page`, `pageSize`, `sort`, `updatedSince`

**Réponse :**
```json
{
  "statusCode": 200,
  "data": {
    "items": [
      {
        "id": "cuid",
        "userId": "cuid",
        "partnerId": "cuid",
        "amount": 100,
        "cashbackEarned": 5,
        "pointsEarned": 50,
        "status": "confirmed",
        "source": "carte",
        "transactionDate": "...",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "total": 100
  },
  "meta": { "pagination": {...} }
}
```

#### POST `/api/v1/transactions`
**Auth :** Requis (user ou admin)  
**Body :** `createTransactionSchema` (Zod)

---

### 5. Gift Cards (`/gift-cards`)

#### GET `/api/v1/gift-cards/catalog`
**Auth :** Optionnel  
**Query params :**
- `page`, `pageSize`, `sort`, `updatedSince`

**Réponse :**
```json
{
  "statusCode": 200,
  "data": {
    "giftCards": [
      {
        "id": "cuid",
        "name": "Carte cadeau 50€",
        "value": 50,
        "type": "digital",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  },
  "meta": { "pagination": {...} }
}
```

---

### 6. Donations (`/donations`)

#### GET `/api/v1/donations/categories`
**Auth :** Optionnel  
**Query params :**
- `page`, `pageSize`, `sort`, `updatedSince`

---

### 7. Sync Global (`/sync`)

#### GET `/api/v1/sync/changes`
**Auth :** Requis  
**Query params :**
- `updatedSince` : **Requis** (ISO 8601)

**Réponse :**
```json
{
  "statusCode": 200,
  "data": {
    "changes": [
      {
        "type": "partner",
        "id": "cuid",
        "action": "updated",
        "updatedAt": "2024-12-13T10:00:00Z"
      },
      {
        "type": "offer",
        "id": "cuid",
        "action": "deleted",
        "updatedAt": "2024-12-13T10:05:00Z",
        "deletedAt": "2024-12-13T10:05:00Z"
      }
    ],
    "since": "2024-12-13T09:00:00Z",
    "count": 2
  }
}
```

**Types supportés :** `partner`, `offer`, `reward`, `giftCard`, `donation`, `transaction`

---

## 🔒 Soft Delete

Toutes les ressources supportent le soft delete via `deletedAt` :
- Par défaut, les entités avec `deletedAt !== null` sont exclues
- Utiliser `includeDeleted=true` pour les inclure
- Les suppressions apparaissent dans `/sync/changes` avec `action: "deleted"`

---

## 📋 Champs standard

Toutes les ressources incluent :
- `id` : CUID (string)
- `createdAt` : ISO 8601 DateTime
- `updatedAt` : ISO 8601 DateTime (mis à jour automatiquement)
- `deletedAt` : ISO 8601 DateTime | null (soft delete)

---

## 🎯 Normalisation des valeurs

### Null/Undefined
- Les champs optionnels retournent `null` (jamais `undefined`)
- Les tableaux vides retournent `[]` (jamais `null` ou `undefined`)
- Les nombres retournent `0` si aucune donnée (jamais `null` ou `undefined`)

### Base vide
- `total: 0`
- `items: []` ou `partners: []` ou `offers: []`
- Pas de données inventées, pas de fallback

---

## 🔍 Filtres standards

### Par territoire
- `territory` : `"Martinique"` | `"Guadeloupe"` | `"Guyane"` | `"all"`
- `territories` : Array JSON `["Martinique", "Guadeloupe"]`

### Par statut
- `status` : `"active"` | `"inactive"` | `"pending"` | `"confirmed"` | `"all"`

### Par date
- `updatedSince` : ISO 8601 (delta sync)
- `createdAt` : Range (à implémenter si nécessaire)

---

## 📡 Webhooks (optionnel)

Si `MOBILE_WEBHOOK_URL` est configuré, les mutations déclenchent des webhooks :
- `POST /webhooks` (endpoint mobile)
- Headers : `X-Webhook-Source: kashup-api`, `X-Webhook-Event: partner.updated`
- Body : Ressource complète + `updatedAt`

---

## ✅ Validation

- **Input** : Zod schemas pour tous les body/query
- **Output** : DTOs typés TypeScript
- **Erreurs** : Format standardisé avec `code`, `message`, `details`

---

## 🔄 Idempotency

Pour les créations sensibles (transactions, etc.) :
- Header optionnel : `Idempotency-Key: <uuid>`
- Si la clé existe déjà, retourne la ressource existante (200) au lieu de créer un doublon

---

## 📊 Observabilité

### Headers de réponse
- `X-Request-Id` : UUID pour corrélation
- `X-Response-Time` : Durée en ms

### Logs structurés
```json
{
  "requestId": "uuid",
  "method": "GET",
  "path": "/api/v1/partners",
  "userId": "cuid",
  "role": "admin",
  "status": 200,
  "duration": 45
}
```

---

## 🚀 Migration progressive

Les routes existantes sous `/` restent disponibles pour compatibilité, mais `/api/v1` est **canonique**.

**Recommandation clients :**
- Utiliser `/api/v1` pour toutes les nouvelles intégrations
- Migrer progressivement depuis `/` vers `/api/v1`

---

**Document généré le :** 2024-12-13  
**Dernière mise à jour :** 2024-12-13

