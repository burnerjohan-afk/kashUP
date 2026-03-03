# Architecture de Communication Officielle - Kashup

**Version:** 1.0.0  
**Date:** 2025-01-18  
**Statut:** ⚠️ **DOCUMENT FONDATEUR - FAIT FOI**

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Principes Fondamentaux](#principes-fondamentaux)
3. [Routes API Officielles](#routes-api-officielles)
4. [Contrats de Données par Entité](#contrats-de-données-par-entité)
5. [Règles de Sécurité](#règles-de-sécurité)
6. [Instructions pour Génération des Prompts](#instructions-pour-génération-des-prompts)

---

## Vue d'ensemble

### Environnements Kashup

Kashup est composé de **3 environnements** qui communiquent via l'API REST :

1. **Kashup API** (Backend - Source de Vérité)
   - Base URL: `/api/v1`
   - Port: `4000` (configurable via `PORT`)
   - Écoute sur: `0.0.0.0` (accessible depuis le réseau local)

2. **Kashup Mobile** (Expo / React Native)
   - Consomme uniquement les routes `/api/v1`
   - Accès public (sans champs sensibles)
   - Support Expo Go et développement build

3. **Kashup Admin** (Backoffice Web)
   - Consomme uniquement les routes `/api/v1`
   - Accès complet (tous les champs)
   - Authentification requise (JWT)

### Base API

**Toutes les routes sont préfixées par `/api/v1`**

```
BASE_URL = http://<IP_LAN>:4000/api/v1
```

**⚠️ IMPORTANT :** Aucune IP ne doit être codée en dur. L'IP LAN est détectée dynamiquement au runtime.

---

## Principes Fondamentaux

### 1. Convention REST Stricte

Pour chaque ressource `<resource>`, les routes suivent cette convention :

| Méthode | Route | Description | Auth |
|---------|-------|-------------|------|
| `GET` | `/api/v1/<resource>` | Liste (avec pagination) | Public |
| `GET` | `/api/v1/<resource>/:id` | Détail | Public |
| `POST` | `/api/v1/<resource>` | Création | Admin |
| `PATCH` | `/api/v1/<resource>/:id` | Modification | Admin |
| `DELETE` | `/api/v1/<resource>/:id` | Suppression | Admin |

### 2. Format de Réponse Standard

Toutes les réponses suivent ce format :

```typescript
{
  data: T | T[] | null,        // Données de la ressource
  error: {                      // Erreur (si applicable)
    message: string,
    code: string,
    details?: any
  } | null,
  meta: {                       // Métadonnées (pagination, etc.)
    pagination?: {
      page: number,
      pageSize: number,
      total: number,
      totalPages: number
    },
    [key: string]: any
  } | null
}
```

### 3. Sérialisation Public vs Admin

**Mode Public (Mobile) :**
- Champs sensibles automatiquement filtrés
- URLs d'images transformées en URLs absolues avec IP LAN
- Pas d'accès aux documents privés

**Mode Admin :**
- Accès complet à toutes les données
- Tous les champs retournés
- Accès aux documents et informations sensibles

**Détection automatique :** Le système détecte le rôle de l'utilisateur via le token JWT et applique la sérialisation appropriée.

### 4. URLs Dynamiques

- **Aucune IP codée en dur**
- IP LAN détectée automatiquement au runtime
- URLs d'images toujours absolues : `http://<IP_LAN>:4000/uploads/...`
- Endpoint debug : `GET /api/v1/debug/network` pour obtenir l'IP LAN actuelle

### 5. Timeouts et Performance

- Timeout global Express : **25 secondes**
- Timeout Prisma queries : **3 secondes**
- Cache IP LAN : **1 minute** (évite recalculs)

---

## Routes API Officielles

### Routes Système

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| `GET` | `/health` | Health check | Non | ✅ 200 |
| `GET` | `/api/v1/health` | Health check versionné | Non | ✅ 200 |
| `GET` | `/api/v1/debug/network` | Informations réseau (IPv4, port, basePath, origins) | Non | ✅ 200 |

**Réponse `/health` :**
```json
{
  "status": "ok",
  "port": 4000,
  "basePath": "/api/v1"
}
```

**Réponse `/api/v1/debug/network` :**
```json
{
  "data": {
    "ipv4": "192.168.1.19",
    "port": 4000,
    "basePath": "/api/v1",
    "origins": [
      "http://192.168.1.19:4000",
      "http://localhost:4000"
    ],
    "host": "localhost:4000",
    "protocol": "http"
  }
}
```

---

### 1. Partenaires (`/api/v1/partners`)

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| `GET` | `/api/v1/partners` | Liste des partenaires (avec filtres) | Non | ✅ 200 |
| `GET` | `/api/v1/partners/:id` | Détail d'un partenaire | Non | ✅ 200 |
| `POST` | `/api/v1/partners` | Création d'un partenaire | Admin/Partner | ✅ 201 |
| `PATCH` | `/api/v1/partners/:id` | Modification d'un partenaire | Admin/Partner | ✅ 200 |
| `DELETE` | `/api/v1/partners/:id` | Suppression d'un partenaire | Admin | ✅ 200 |
| `GET` | `/api/v1/partners/categories` | Liste des catégories | Non | ✅ 200 |
| `GET` | `/api/v1/partners/territories` | Liste des territoires | Non | ✅ 200 |
| `GET` | `/api/v1/partners/:id/statistics` | Statistiques d'un partenaire | Admin | ✅ 200 |
| `GET` | `/api/v1/partners/:id/documents` | Documents d'un partenaire | Admin | ✅ 200 |

**Query Parameters pour `GET /api/v1/partners` :**
- `search` (string, optionnel) : Recherche textuelle (nom, description)
- `categoryId` (string, optionnel) : ID de la catégorie (CUID)
- `category` (string, optionnel) : Nom de la catégorie (sera converti en categoryId)
- `territory` (string, optionnel) : Territoire ('all' pour tous)
- `territories` (string[], optionnel) : Array de territoires
- `page` (number, optionnel) : Numéro de page (défaut: 1)
- `pageSize` (number, optionnel) : Taille de page (défaut: 20, max: 100)
- `sortBy` (string, optionnel) : Champ de tri (name, createdAt, updatedAt, tauxCashbackBase)
- `sortOrder` (string, optionnel) : Ordre de tri (asc, desc)

---

### 2. Bons d'achat / Vouchers (`/api/v1/gift-cards`)

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| `GET` | `/api/v1/gift-cards` | Catalogue des bons d'achat | Non | ✅ 200 |
| `GET` | `/api/v1/gift-cards/catalog` | Alias pour catalogue | Non | ✅ 200 |
| `GET` | `/api/v1/gift-cards/offers` | Offres de bons d'achat | Non | ✅ 200 |
| `GET` | `/api/v1/gift-cards/boxes` | Liste des boxups | Non | ✅ 200 |
| `GET` | `/api/v1/gift-cards/boxes/:id` | Détail d'un boxup | Non | ✅ 200 |
| `GET` | `/api/v1/gift-cards/user` | Bons d'achat de l'utilisateur | User | ✅ 200 |
| `POST` | `/api/v1/gift-cards/purchase` | Achat d'un bon d'achat | User | ✅ 201 |
| `GET` | `/api/v1/gift-cards/orders` | Commandes (admin) | Admin | ✅ 200 |
| `GET` | `/api/v1/gift-cards/config` | Configuration (admin) | Admin | ✅ 200 |
| `PATCH` | `/api/v1/gift-cards/config` | Mise à jour config (admin) | Admin | ✅ 200 |
| `GET` | `/api/v1/gift-cards/box-up/config` | Config BoxUp (admin) | Admin | ✅ 200 |
| `POST` | `/api/v1/gift-cards/box-up/config` | Création/mise à jour BoxUp (admin) | Admin | ✅ 200 |

**Note :** Les routes gift-cards suivent une structure spécifique (pas de CRUD classique) car elles gèrent des catalogues, des achats, etc.

---

### 3. Box Ups (`/api/v1/boxups`)

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| `GET` | `/api/v1/boxups` | Liste des boxups | Non | ✅ 200 |
| `GET` | `/api/v1/boxups/:id` | Détail d'un boxup | Non | ✅ 200 |
| `POST` | `/api/v1/boxups` | Création d'un boxup | Admin | ⚠️ 501 |
| `PATCH` | `/api/v1/boxups/:id` | Modification d'un boxup | Admin | ⚠️ 501 |
| `DELETE` | `/api/v1/boxups/:id` | Suppression d'un boxup | Admin | ⚠️ 501 |

**Note :** Les opérations CRUD complètes (POST, PATCH, DELETE) ne sont pas encore implémentées (501 Not Implemented).

---

### 4. Carte Ups (`/api/v1/carteups`)

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| `GET` | `/api/v1/carteups` | Liste des carteups | Non | ⚠️ 501 |
| `GET` | `/api/v1/carteups/:id` | Détail d'un carteup | Non | ⚠️ 501 |
| `POST` | `/api/v1/carteups` | Création d'un carteup | Admin | ⚠️ 501 |
| `PATCH` | `/api/v1/carteups/:id` | Modification d'un carteup | Admin | ⚠️ 501 |
| `DELETE` | `/api/v1/carteups/:id` | Suppression d'un carteup | Admin | ⚠️ 501 |

**Note :** Cette ressource n'existe pas encore en base de données. Toutes les routes retournent 501 Not Implemented.

---

### 5. Loteries (`/api/v1/lotteries`)

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| `GET` | `/api/v1/lotteries` | Liste des loteries | Non | ✅ 200 |
| `GET` | `/api/v1/lotteries/:id` | Détail d'une loterie | Non | ✅ 200 |
| `POST` | `/api/v1/lotteries` | Création d'une loterie | Admin | ⚠️ 501 |
| `PATCH` | `/api/v1/lotteries/:id` | Modification d'une loterie | Admin | ⚠️ 501 |
| `DELETE` | `/api/v1/lotteries/:id` | Suppression d'une loterie | Admin | ⚠️ 501 |
| `POST` | `/api/v1/lotteries/:id/join` | Rejoindre une loterie | User | ✅ 201 |

**Note :** Les opérations CRUD complètes (POST, PATCH, DELETE) ne sont pas encore implémentées (501 Not Implemented).

---

### 6. Badges (`/api/v1/badges`)

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| `GET` | `/api/v1/badges` | Liste des badges | Non | ✅ 200 |
| `GET` | `/api/v1/badges/:id` | Détail d'un badge | Non | ⚠️ 501 |
| `POST` | `/api/v1/badges` | Création d'un badge | Admin | ⚠️ 501 |
| `PATCH` | `/api/v1/badges/:id` | Modification d'un badge | Admin | ⚠️ 501 |
| `DELETE` | `/api/v1/badges/:id` | Suppression d'un badge | Admin | ⚠️ 501 |

**Note :** Les opérations CRUD complètes (POST, PATCH, DELETE) ne sont pas encore implémentées (501 Not Implemented).

---

### 7. Rewards (`/api/v1/rewards`)

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| `GET` | `/api/v1/rewards/boosts` | Liste des boosts | Non | ✅ 200 |
| `POST` | `/api/v1/rewards/boosts/:id/purchase` | Achat d'un boost | User | ✅ 201 |
| `GET` | `/api/v1/rewards/badges` | Liste des badges | Non | ✅ 200 |
| `GET` | `/api/v1/rewards/history` | Historique des récompenses | User | ✅ 200 |
| `GET` | `/api/v1/rewards/lotteries` | Liste des loteries | Non | ✅ 200 |
| `POST` | `/api/v1/rewards/lotteries/:id/join` | Rejoindre une loterie | User | ✅ 201 |
| `GET` | `/api/v1/rewards/challenges` | Liste des challenges | Non | ✅ 200 |
| `GET` | `/api/v1/rewards` | Liste complète (admin) | Admin | ✅ 200 |
| `GET` | `/api/v1/rewards/:type` | Liste par type (admin) | Admin | ✅ 200 |
| `POST` | `/api/v1/rewards` | Création d'une récompense (admin) | Admin | ✅ 201 |
| `PATCH` | `/api/v1/rewards/:id` | Modification d'une récompense (admin) | Admin | ✅ 200 |

**Types de récompenses :** `boost`, `badge`, `lottery`, `challenge`

---

### 8. Cagnottes (À définir)

| Méthode | Route | Description | Auth | Status |
|---------|-------|-------------|------|--------|
| `GET` | `/api/v1/pots` | Liste des cagnottes | Non | ⚠️ 501 |
| `GET` | `/api/v1/pots/:id` | Détail d'une cagnotte | Non | ⚠️ 501 |
| `POST` | `/api/v1/pots` | Création d'une cagnotte | Admin | ⚠️ 501 |
| `PATCH` | `/api/v1/pots/:id` | Modification d'une cagnotte | Admin | ⚠️ 501 |
| `DELETE` | `/api/v1/pots/:id` | Suppression d'une cagnotte | Admin | ⚠️ 501 |
| `POST` | `/api/v1/pots/:id/contribute` | Contribution à une cagnotte | User | ⚠️ 501 |

**Note :** Cette ressource n'existe pas encore en base de données. Toutes les routes retournent 501 Not Implemented.

---

## Contrats de Données par Entité

### 1. Partenaires (Partners)

#### Champs Publics (Mobile)

```typescript
interface PartnerPublic {
  id: string;                          // CUID
  name: string;
  slug: string;
  category: {                          // Toujours un objet (jamais null)
    id: string | null;
    name: string;                      // Toujours une string (même si vide)
  };
  categoryName: string;                // Alias pour compatibilité
  logoUrl: string | null;              // URL absolue avec IP LAN
  imageUrl: string | null;             // Alias de logoUrl
  imagePath: string | null;            // Chemin relatif original
  description: string | null;
  shortDescription: string | null;
  isComplete: boolean;                 // true si logoUrl ET shortDescription présents
  websiteUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tauxCashbackBase: number;
  discoveryCashbackRate: number | null;
  permanentCashbackRate: number | null;
  discoveryCashbackKashupShare: number | null;
  discoveryCashbackUserShare: number | null;
  permanentCashbackKashupShare: number | null;
  permanentCashbackUserShare: number | null;
  pointsPerTransaction: number | null;
  territories: string[];               // Toujours un array (même vide)
  latitude: number | null;
  longitude: number | null;
  boostable: boolean;
  status: string;                      // 'active', 'inactive', 'pending'
  menuImages: string[];               // URLs absolues avec IP LAN
  photos: string[];                    // URLs absolues avec IP LAN
  marketingPrograms: any[];            // Toujours un array
  createdAt: string | null;            // ISO 8601
  updatedAt: string | null;            // ISO 8601
}
```

#### Champs Internes (Admin uniquement)

```typescript
interface PartnerAdmin extends PartnerPublic {
  siret: string | null;                // ❌ Exclu du public
  phone: string | null;                // ❌ Exclu du public
  documents: PartnerDocument[];       // ❌ Exclu du public
  additionalInfo: string | null;       // ❌ Exclu du public (peut contenir infos sensibles)
  affiliations: any[];                 // ❌ Exclu du public (peut contenir infos sensibles)
}
```

#### Règles de Sécurité

- **Public :** Accès en lecture seule, champs sensibles filtrés automatiquement
- **Admin/Partner :** Accès complet (création, modification, suppression)
- **Documents :** Accessibles uniquement via `/api/v1/partners/:id/documents` (admin)

---

### 2. Bons d'achat / Vouchers (Gift Cards)

#### Champs Publics (Mobile)

```typescript
interface GiftCardPublic {
  id: string;                          // CUID
  type: string;                        // 'bon_achat'
  name: string;
  description: string;
  value: number;
  partnerId: string | null;
  partner?: PartnerPublic | null;      // Partenaire associé (si présent)
  isGiftable: boolean;
  imageUrl: string | null;             // URL absolue avec IP LAN
  createdAt: string | null;            // ISO 8601
  updatedAt: string | null;            // ISO 8601
}
```

#### Champs Internes (Admin uniquement)

```typescript
interface GiftCardAdmin extends GiftCardPublic {
  purchases: GiftCardPurchase[];       // ❌ Exclu du public
  deletedAt: string | null;            // ❌ Exclu du public
}
```

#### Règles de Sécurité

- **Public :** Accès au catalogue et aux offres
- **User :** Peut acheter des bons d'achat (`POST /api/v1/gift-cards/purchase`)
- **Admin :** Accès complet (création, modification, commandes)

---

### 3. Box Ups

#### Champs Publics (Mobile)

```typescript
interface BoxUpPublic {
  id: string;                          // CUID
  name: string;
  description: string;
  imageUrl: string | null;             // URL absolue avec IP LAN
  cashbackInfo: string | null;
  value: number;
  active: boolean;
  items: BoxUpItemPublic[];            // Items de la box
  createdAt: string | null;            // ISO 8601
  updatedAt: string | null;            // ISO 8601
}

interface BoxUpItemPublic {
  id: string;
  title: string;
  description: string | null;
  partnerId: string | null;
  partner?: PartnerPublic | null;
}
```

#### Champs Internes (Admin uniquement)

Aucun champ supplémentaire pour l'instant (structure identique).

---

### 4. Carte Ups

**⚠️ Non implémenté - Structure à définir**

```typescript
interface CarteUpPublic {
  id: string;
  // Structure à définir lors de l'implémentation
}
```

---

### 5. Loteries

#### Champs Publics (Mobile)

```typescript
interface LotteryPublic {
  id: string;                          // CUID
  title: string;
  description: string | null;
  imageUrl: string | null;             // URL absolue avec IP LAN
  startAt: string;                     // ISO 8601
  endAt: string;                       // ISO 8601
  ticketCost: number;                  // Coût en points
  status: string;                      // 'upcoming', 'active', 'ended'
  active: boolean;
  createdAt: string | null;            // ISO 8601
  updatedAt: string | null;            // ISO 8601
}
```

#### Champs Internes (Admin uniquement)

```typescript
interface LotteryAdmin extends LotteryPublic {
  entries: LotteryEntry[];             // ❌ Exclu du public
  deletedAt: string | null;            // ❌ Exclu du public
}
```

#### Règles de Sécurité

- **Public :** Accès en lecture seule
- **User :** Peut rejoindre une loterie (`POST /api/v1/lotteries/:id/join`)
- **Admin :** Accès complet (création, modification, suppression)

---

### 6. Badges

#### Champs Publics (Mobile)

```typescript
interface BadgePublic {
  id: string;                          // CUID
  name: string;
  description: string;
  level: number;
  unlockCondition: string;
  imageUrl: string | null;             // URL absolue avec IP LAN
  createdAt: string | null;            // ISO 8601
  updatedAt: string | null;            // ISO 8601
}
```

#### Champs Internes (Admin uniquement)

```typescript
interface BadgeAdmin extends BadgePublic {
  users: UserBadge[];                  // ❌ Exclu du public
  deletedAt: string | null;            // ❌ Exclu du public
}
```

#### Règles de Sécurité

- **Public :** Accès en lecture seule
- **Admin :** Accès complet (création, modification, suppression)

---

### 7. Rewards (Récompenses)

#### Champs Publics (Mobile)

```typescript
interface BoostPublic {
  id: string;                          // CUID
  name: string;
  description: string;
  multiplier: number;
  target: string;                      // 'all', 'category', 'partner'
  categoryId: string | null;
  partnerId: string | null;
  costInPoints: number;
  startsAt: string;                    // ISO 8601
  endsAt: string;                      // ISO 8601
  active: boolean;
  imageUrl: string | null;             // URL absolue avec IP LAN
  createdAt: string | null;            // ISO 8601
  updatedAt: string | null;            // ISO 8601
}
```

#### Champs Internes (Admin uniquement)

```typescript
interface BoostAdmin extends BoostPublic {
  users: UserBoost[];                  // ❌ Exclu du public
  deletedAt: string | null;            // ❌ Exclu du public
}
```

#### Règles de Sécurité

- **Public :** Accès en lecture seule, peut acheter des boosts
- **User :** Peut acheter des boosts (`POST /api/v1/rewards/boosts/:id/purchase`)
- **Admin :** Accès complet (création, modification, suppression)

---

### 8. Cagnottes (À définir)

**⚠️ Non implémenté - Structure à définir**

```typescript
interface PotPublic {
  id: string;
  // Structure à définir lors de l'implémentation
}
```

---

## Règles de Sécurité

### Authentification

- **Méthode :** JWT (JSON Web Tokens)
- **Header :** `Authorization: Bearer <token>`
- **Refresh Token :** Disponible pour renouveler les tokens

### Rôles Utilisateurs

1. **Public (Non authentifié)**
   - Accès en lecture seule
   - Champs sensibles filtrés automatiquement
   - Pas d'accès aux données utilisateur

2. **User (Authentifié)**
   - Accès à ses propres données (`/api/v1/me/*`)
   - Peut acheter des produits (gift-cards, boosts)
   - Peut rejoindre des loteries
   - Peut contribuer aux cagnottes

3. **Partner (Authentifié)**
   - Accès User +
   - Peut créer/modifier ses propres partenaires
   - Accès aux statistiques de ses partenaires

4. **Admin (Authentifié)**
   - Accès complet à toutes les données
   - Tous les champs retournés (y compris sensibles)
   - Peut créer/modifier/supprimer toutes les ressources

### CORS (Cross-Origin Resource Sharing)

- **Développement :** `origin: true` (toutes les origines autorisées)
- **Production :** Configurable via `CORS_ORIGIN` dans `.env`
- **Méthodes autorisées :** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Headers autorisés :** Content-Type, Authorization
- **Support Expo Go :** Patterns spéciaux pour `exp://` et IPs locales

### Rate Limiting

- Protection DDoS basique
- Limite configurable par route
- Headers de rate limit retournés dans les réponses

### Validation des Données

- **Schémas Zod** pour toutes les entrées
- Validation automatique des types
- Messages d'erreur clairs et structurés

---

## Instructions pour Génération des Prompts

### Prompt Kashup Mobile

**Structure à utiliser :**

```
Tu es le développeur principal de Kashup Mobile (Expo / React Native).

CONTEXTE :
- L'API Kashup est disponible sur BASE_URL = http://<IP_LAN>:4000/api/v1
- L'IP LAN est détectée dynamiquement (pas d'IP codée en dur)
- Toutes les routes sont préfixées par /api/v1

ARCHITECTURE API (FAIT FOI) :
[Inclure ici la section "Routes API Officielles" complète]

CONTRATS DE DONNÉES (FAIT FOI) :
[Inclure ici la section "Contrats de Données par Entité" complète, uniquement les champs Publics]

RÈGLES OBLIGATOIRES :
1. Consommer UNIQUEMENT les routes /api/v1
2. Ne jamais coder d'IP en dur
3. Utiliser les champs Publics uniquement (les champs sensibles sont automatiquement filtrés)
4. Les URLs d'images sont toujours absolues avec IP LAN
5. Gérer les erreurs 501 (Not Implemented) gracieusement
6. Implémenter la pagination pour toutes les listes
7. Gérer les timeouts (25s côté serveur, 30s côté client)

FONCTIONNALITÉS À IMPLÉMENTER :
[Lister les features spécifiques au mobile]
```

### Prompt Kashup Admin

**Structure à utiliser :**

```
Tu es le développeur principal de Kashup Admin (Backoffice Web).

CONTEXTE :
- L'API Kashup est disponible sur BASE_URL = http://<IP_LAN>:4000/api/v1
- L'IP LAN est détectée dynamiquement (pas d'IP codée en dur)
- Toutes les routes sont préfixées par /api/v1
- Authentification JWT requise pour toutes les opérations

ARCHITECTURE API (FAIT FOI) :
[Inclure ici la section "Routes API Officielles" complète]

CONTRATS DE DONNÉES (FAIT FOI) :
[Inclure ici la section "Contrats de Données par Entité" complète, champs Publics ET Internes]

RÈGLES OBLIGATOIRES :
1. Consommer UNIQUEMENT les routes /api/v1
2. Ne jamais coder d'IP en dur
3. Authentification JWT requise (Header: Authorization: Bearer <token>)
4. Accès complet à tous les champs (y compris sensibles)
5. Gérer les erreurs 501 (Not Implemented) gracieusement
6. Implémenter la pagination pour toutes les listes
7. Gérer les timeouts (25s côté serveur, 30s côté client)

FONCTIONNALITÉS À IMPLÉMENTER :
[Lister les features spécifiques à l'admin]
```

---

## Changelog

| Version | Date | Changements |
|---------|------|-------------|
| 1.0.0 | 2025-01-18 | Création du document d'architecture officielle |

---

## Notes Importantes

1. **Ce document fait foi** - Toute modification doit être documentée dans le changelog
2. **Compatibilité ascendante** - Les nouvelles versions de l'API doivent rester compatibles avec les versions précédentes
3. **Déprication** - Les routes dépréciées doivent être marquées et maintenues pendant au moins 2 versions majeures
4. **Tests** - Toutes les routes doivent être testées avant déploiement
5. **Documentation** - Toute nouvelle route doit être documentée dans ce document

---

**Document créé par :** Architecte Principal Kashup  
**Approuvé par :** [À compléter]  
**Date d'approbation :** [À compléter]

