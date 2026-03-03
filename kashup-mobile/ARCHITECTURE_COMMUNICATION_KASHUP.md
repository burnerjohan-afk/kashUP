# Architecture de Communication API - Kashup Mobile

**⚠️ DOCUMENT DE RÉFÉRENCE - FAIT FOI**

Ce document décrit l'architecture réelle de communication avec l'API Kashup backend, telle qu'implémentée dans le code mobile.

---

## 📋 Table des Matières

1. [Configuration API](#configuration-api)
2. [Format de Réponse](#format-de-réponse)
3. [Routes API](#routes-api)
4. [Contrats de Données](#contrats-de-données)
5. [Gestion des Erreurs](#gestion-des-erreurs)
6. [Authentification](#authentification)
7. [Normalisation des URLs](#normalisation-des-urls)

---

## 🔧 Configuration API

### Détection Automatique de l'IP

L'application détecte automatiquement l'IP du serveur via `expo-constants` :

**Fichier:** `src/config/runtime.ts`

```typescript
// Extraction depuis hostUri Expo
// Exemple: exp://192.168.1.19:8081 → 192.168.1.19
const host = getHostFromExpo();
const apiOrigin = `http://${host}:4000`;
const apiBaseUrl = `${apiOrigin}/api/v1`;
```

**⚠️ RÈGLE ABSOLUE:** Aucune IP ne doit être codée en dur dans le code.

### Variables d'Environnement

- `apiOrigin`: `http://<IP_LAN>:4000` (sans `/api/v1`)
- `apiBaseUrl`: `http://<IP_LAN>:4000/api/v1` (avec préfixe)

---

## 📦 Format de Réponse

### StandardResponse<T>

Toutes les réponses API suivent ce format :

```typescript
interface StandardResponse<T> {
  statusCode: number;        // Code HTTP (200, 400, 500, etc.)
  success: boolean;           // true si succès, false si erreur
  message: string;           // Message descriptif
  data: T | null;            // Données (null si erreur)
  meta?: ResponseMeta;       // Métadonnées optionnelles
}

interface ResponseMeta {
  pagination?: PaginationMeta;
  details?: ErrorDetails;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

### Exemple de Réponse

**Succès:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Partenaires récupérés avec succès",
  "data": {
    "partners": [...]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Erreur:**
```json
{
  "statusCode": 404,
  "success": false,
  "message": "Partenaire introuvable",
  "data": null,
  "meta": {
    "details": {
      "code": "NOT_FOUND",
      "fieldErrors": {}
    }
  }
}
```

---

## 🛣️ Routes API

### Routes Système

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/health` | Health check (sans version) |
| `GET` | `/api/v1/health` | Health check versionné |

### Routes Partenaires

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/api/v1/partners` | Liste des partenaires (avec filtres, pagination) | ❌ |
| `GET` | `/api/v1/partners/:id` | Détail d'un partenaire | ❌ |
| `GET` | `/api/v1/partners/categories/list` | Liste des catégories | ❌ |
| `GET` | `/api/v1/partners/categories` | Liste des catégories (alternative) | ❌ |
| `GET` | `/api/v1/partners/territories` | Liste des territoires | ❌ |

**⚠️ NOTE:** Deux routes existent pour les catégories :
- `/partners/categories/list` (utilisée dans `partnerService.ts`)
- `/partners/categories` (utilisée dans `partners.ts`)

**Recommandation:** Standardiser sur une seule route.

### Routes Bons d'Achat (Gift Cards)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/api/v1/gift-cards` | Catalogue des bons d'achat | ❌ |
| `GET` | `/api/v1/gift-cards/offers` | Offres spéciales | ❌ |
| `GET` | `/api/v1/gift-cards/boxes` | Boxups | ❌ |
| `GET` | `/api/v1/gift-cards/user` | Bons d'achat de l'utilisateur | ✅ |
| `POST` | `/api/v1/gift-cards/purchase` | Achat d'un bon d'achat | ✅ |

### Routes Box Ups

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/api/v1/boxups` | Liste des boxups | ❌ |
| `GET` | `/api/v1/boxups/:id` | Détail d'un boxup | ❌ |

### Routes Loteries

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/api/v1/lotteries` | Liste des loteries | ❌ |
| `GET` | `/api/v1/lotteries/:id` | Détail d'une loterie | ❌ |
| `POST` | `/api/v1/lotteries/:id/join` | Rejoindre une loterie | ✅ |

### Routes Badges

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/api/v1/badges` | Liste des badges | ❌ |
| `GET` | `/api/v1/badges/:id` | Détail d'un badge | ❌ |

**⚠️ NOTE:** L'endpoint `/badges/:id` peut retourner `501 Not Implemented` si non implémenté côté backend.

### Routes Rewards

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/api/v1/rewards/boosts` | Liste des boosts disponibles | ❌ |
| `POST` | `/api/v1/rewards/boosts/:id/purchase` | Achat d'un boost | ✅ |
| `GET` | `/api/v1/rewards/badges` | Liste des badges | ❌ |
| `GET` | `/api/v1/rewards/history` | Historique des rewards | ✅ |
| `GET` | `/api/v1/rewards/lotteries` | Liste des loteries | ❌ |
| `GET` | `/api/v1/rewards/challenges` | Liste des challenges | ❌ |

### Routes Utilisateur (Auth Requise)

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/api/v1/me` | Profil utilisateur | ✅ |
| `GET` | `/api/v1/me/wallet` | Portefeuille utilisateur | ✅ |
| `GET` | `/api/v1/me/transactions` | Transactions utilisateur | ✅ |
| `GET` | `/api/v1/me/notifications` | Notifications utilisateur | ✅ |
| `GET` | `/api/v1/me/rewards` | Résumé des rewards | ✅ |
| `GET` | `/api/v1/me/badges` | Badges obtenus | ✅ |

---

## 📄 Contrats de Données

### ⚠️ IMPORTANT: Champs Publics Uniquement

L'API filtre automatiquement les champs sensibles. **Ne jamais** accéder directement aux champs internes (KBIS, SIRET, etc.).

### Partner (Public)

```typescript
interface Partner {
  id: string;
  name: string;
  slug: string;
  
  // Catégorie (toujours un objet, jamais null)
  category: {
    id: string | null;
    name: string;  // Toujours une string (même si vide)
  };
  categoryName?: string;  // Alias
  
  // Images (URLs absolues avec IP LAN)
  logoUrl: string | null;
  imageUrl: string | null;  // Alias de logoUrl
  imagePath: string | null;  // Chemin relatif
  
  // Descriptions
  description: string | null;
  shortDescription: string | null;
  isComplete: boolean;
  
  // Liens
  websiteUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  
  // Cashback
  tauxCashbackBase: number;
  discoveryCashbackRate: number | null;
  permanentCashbackRate: number | null;
  
  // Localisation
  territories: string[];  // Toujours un array
  latitude: number | null;
  longitude: number | null;
  
  // Métadonnées
  boostable: boolean;
  status: string;
  menuImages: string[];  // URLs absolues
  photos: string[];      // URLs absolues
  marketingPrograms: any[];
  createdAt: string | null;  // ISO 8601
  updatedAt: string | null;  // ISO 8601
  
  // ❌ CHAMPS EXCLUS (filtrés par l'API):
  // - siret
  // - phone
  // - documents
  // - additionalInfo
  // - affiliations
}
```

### GiftCard (Public)

```typescript
interface GiftCard {
  id: string;
  type: string;
  name: string;
  description: string;
  value: number;
  partnerId: string | null;
  partner?: Partner | null;
  isGiftable: boolean;
  imageUrl: string | null;  // URL absolue
  createdAt: string | null;
  updatedAt: string | null;
}
```

### Lottery (Public)

```typescript
interface Lottery {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;  // URL absolue
  startAt: string;  // ISO 8601
  endAt: string;    // ISO 8601
  ticketCost: number;
  status: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}
```

### Badge (Public)

```typescript
interface Badge {
  id: string;
  name: string;
  description: string;
  level: number;
  unlockCondition: string;
  imageUrl: string | null;  // URL absolue
  createdAt: string | null;
  updatedAt: string | null;
}
```

### Boost (Public)

```typescript
interface Boost {
  id: string;
  name: string;
  description: string;
  multiplier: number;
  target: string;
  categoryId: string | null;
  partnerId: string | null;
  costInPoints: number;
  startsAt: string;  // ISO 8601
  endsAt: string;    // ISO 8601
  active: boolean;
  imageUrl: string | null;  // URL absolue
  createdAt: string | null;
  updatedAt: string | null;
}
```

---

## ⚠️ Gestion des Erreurs

### Codes d'Erreur Courants

| Code | Signification | Action |
|------|---------------|--------|
| `200` | Succès | Afficher les données |
| `400` | Requête invalide | Afficher message d'erreur |
| `401` | Non authentifié | Rediriger vers login |
| `403` | Accès refusé | Afficher message d'erreur |
| `404` | Ressource introuvable | Afficher message d'erreur |
| `500` | Erreur serveur | Afficher message d'erreur générique |
| `501` | Non implémenté | Gérer gracieusement (ex: badge non disponible) |
| `TIMEOUT` | Timeout (30s) | Afficher message + bouton retry |

### Gestion des Timeouts

- **Timeout client:** 30 secondes
- **Timeout serveur:** 25 secondes (selon backend)

**Comportement:**
1. Afficher un message clair à l'utilisateur
2. Proposer un bouton "Réessayer"
3. Implémenter un retry automatique (max 3 tentatives)

### Gestion des Erreurs 501

Certains endpoints peuvent retourner `501 Not Implemented`. Gérer gracieusement :

```typescript
try {
  const badge = await getBadge(id);
  // Afficher le badge
} catch (error) {
  if (error.statusCode === 501) {
    // Afficher: "Cette fonctionnalité n'est pas encore disponible"
    return;
  }
  throw error;
}
```

---

## 🔐 Authentification

### Stockage des Tokens

Les tokens sont stockés de manière sécurisée via `expo-secure-store` :

```typescript
// Clés de stockage
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'kashup_access_token',
  REFRESH_TOKEN: 'kashup_refresh_token',
};
```

### Envoi du Token

Le token est automatiquement ajouté dans le header `Authorization` :

```typescript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
}
```

### Refresh Token Automatique

L'application gère automatiquement le refresh token :

1. Si une requête retourne `401 Unauthorized`
2. L'application tente de rafraîchir le token via `/api/v1/auth/refresh`
3. Si le refresh réussit, la requête originale est réessayée
4. Si le refresh échoue, l'utilisateur est redirigé vers le login

---

## 🖼️ Normalisation des URLs

### Fonction `normalizeImageUrl()`

**Fichier:** `src/utils/normalizeUrl.ts`

```typescript
export function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) {
    return null;  // Placeholder par défaut
  }
  
  // URL absolue (http/https) → utilisée telle quelle
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Chemin relatif (/uploads/) → préfixé avec apiOrigin
  if (url.startsWith('/uploads/')) {
    return `${apiOrigin}${url}`;
  }
  
  // Autre cas → null
  return null;
}
```

### Règles de Normalisation

1. **URL absolue** (`http://...` ou `https://...`) → Utilisée telle quelle
2. **Chemin relatif** (`/uploads/...`) → Préfixé avec `apiOrigin`
3. **`null` ou `undefined`** → Retourne `null` (afficher placeholder)

### Exemple

```typescript
// Backend retourne: "/uploads/partners/logo.png"
// Normalisé vers: "http://192.168.1.19:4000/uploads/partners/logo.png"

const logoUrl = normalizeImageUrl(partner.logoUrl);
```

---

## 📝 Exemples d'Utilisation

### Liste des Partenaires avec Pagination

```typescript
import { api } from '@/src/services/api';
import { StandardResponse } from '@/src/types/api';

const response = await api.get<StandardResponse<{ partners: Partner[] }>>('/partners', {
  params: {
    page: 1,
    pageSize: 20,
    category: 'restauration',
  },
});

const { data, meta } = response.data;
// data.partners: Partner[]
// meta.pagination: PaginationMeta
```

### Détail d'un Partenaire

```typescript
import { api } from '@/src/services/api';
import { unwrapStandardResponse } from '@/src/types/api';

const response = await api.get<StandardResponse<Partner>>(`/partners/${partnerId}`);
const partner = unwrapStandardResponse(response.data);

// partner.logoUrl est toujours une URL absolue avec IP LAN
// partner.category.name est toujours une string (même si vide)
```

### Achat d'un Boost (Auth Requise)

```typescript
import { api } from '@/src/services/api';

const response = await api.post<StandardResponse<Boost>>(
  `/rewards/boosts/${boostId}/purchase`,
  {},
  {
    headers: {
      'Authorization': `Bearer ${token}`,  // Automatique via intercepteur
    },
  }
);
```

---

## ✅ Règles Obligatoires

### 1. Consommation API

- ✅ Consommer **UNIQUEMENT** les routes `/api/v1/*`
- ✅ Utiliser la détection automatique d'IP (pas d'IP codée en dur)
- ❌ Ne jamais accéder directement aux routes non versionnées

### 2. Gestion des Données

- ✅ Utiliser uniquement les **champs Publics** (voir contrats ci-dessus)
- ✅ Les champs sensibles sont automatiquement filtrés par l'API
- ✅ Les URLs d'images sont toujours absolues avec IP LAN
- ✅ Toujours vérifier que `category` est un objet (jamais null/undefined)
- ✅ Toujours vérifier que `category.name` est une string (jamais undefined)

### 3. Gestion des Erreurs

- ✅ Gérer gracieusement les erreurs **501 (Not Implemented)**
- ✅ Gérer les timeouts (30s côté client, 25s côté serveur)
- ✅ Afficher des messages d'erreur clairs à l'utilisateur
- ✅ Implémenter un retry automatique pour les erreurs réseau temporaires

### 4. Pagination

- ✅ Implémenter la pagination pour toutes les listes
- ✅ Utiliser les paramètres `page` et `pageSize` (ou `limit`)
- ✅ Afficher les métadonnées de pagination (`meta.pagination`)

### 5. Authentification

- ✅ Stocker le token JWT de manière sécurisée (SecureStore)
- ✅ Envoyer le token dans le header `Authorization: Bearer <token>`
- ✅ Gérer le refresh token automatiquement
- ✅ Rediriger vers login si token invalide/expiré

### 6. Performance

- ✅ Mettre en cache les données statiques (catégories, territoires)
- ✅ Implémenter un système de cache pour les images
- ✅ Utiliser la pagination pour éviter de charger trop de données
- ✅ Optimiser les requêtes (éviter les appels redondants)

### 7. Compatibilité Expo Go

- ✅ Tester sur Expo Go (développement)
- ✅ Préparer pour Development Build (production)
- ✅ Gérer les limitations d'Expo Go (notifications, etc.)

---

## 🔄 Notes de Migration

### Routes Catégories

**Problème actuel:** Deux routes existent pour les catégories :
- `/partners/categories/list` (utilisée dans `partnerService.ts`)
- `/partners/categories` (utilisée dans `partners.ts`)

**Recommandation:** Standardiser sur `/partners/categories` (plus RESTful).

### Format de Réponse

**Format actuel:** `StandardResponse<T>` avec `{ success, statusCode, message, data, meta }`

**⚠️ Ne pas utiliser:** Le format `{ data, error, meta }` mentionné dans certains templates.

---

## 📚 Références

- **Configuration API:** `src/config/runtime.ts`
- **Client API:** `src/services/api.ts`
- **Types:** `src/types/api.ts`
- **Normalisation URLs:** `src/utils/normalizeUrl.ts`
- **Diagnostic:** `src/utils/apiDiagnostics.ts`

---

**Dernière mise à jour:** 2025-12-18

