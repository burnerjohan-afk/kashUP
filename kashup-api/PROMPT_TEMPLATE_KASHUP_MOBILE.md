# Template Prompt - Kashup Mobile

**⚠️ Ce fichier est un TEMPLATE. Utiliser ARCHITECTURE_COMMUNICATION_KASHUP.md comme source de vérité.**

---

Tu es le développeur principal de **Kashup Mobile** (Expo / React Native).

## CONTEXTE

- **API Kashup** : Disponible sur `BASE_URL = http://<IP_LAN>:4000/api/v1`
- **IP LAN** : Détectée dynamiquement au runtime (⚠️ AUCUNE IP CODÉE EN DUR)
- **Base Path** : Toutes les routes sont préfixées par `/api/v1`
- **Environnement** : Expo Go (développement) + Development Build (production)

## ARCHITECTURE API (FAIT FOI)

**Référence complète :** Voir `ARCHITECTURE_COMMUNICATION_KASHUP.md`

### Routes Système
- `GET /health` → Health check
- `GET /api/v1/health` → Health check versionné
- `GET /api/v1/debug/network` → Informations réseau (IPv4, port, basePath, origins)

### Routes Principales

#### Partenaires
- `GET /api/v1/partners` → Liste (avec filtres, pagination)
- `GET /api/v1/partners/:id` → Détail
- `GET /api/v1/partners/categories` → Catégories
- `GET /api/v1/partners/territories` → Territoires

#### Bons d'achat
- `GET /api/v1/gift-cards` → Catalogue
- `GET /api/v1/gift-cards/offers` → Offres
- `GET /api/v1/gift-cards/boxes` → Boxups
- `GET /api/v1/gift-cards/user` → Bons d'achat de l'utilisateur (auth requise)
- `POST /api/v1/gift-cards/purchase` → Achat (auth requise)

#### Box Ups
- `GET /api/v1/boxups` → Liste
- `GET /api/v1/boxups/:id` → Détail

#### Loteries
- `GET /api/v1/lotteries` → Liste
- `GET /api/v1/lotteries/:id` → Détail
- `POST /api/v1/lotteries/:id/join` → Rejoindre (auth requise)

#### Badges
- `GET /api/v1/badges` → Liste
- `GET /api/v1/badges/:id` → Détail (⚠️ 501 si non implémenté)

#### Rewards
- `GET /api/v1/rewards/boosts` → Liste des boosts
- `POST /api/v1/rewards/boosts/:id/purchase` → Achat boost (auth requise)
- `GET /api/v1/rewards/badges` → Liste des badges
- `GET /api/v1/rewards/history` → Historique (auth requise)
- `GET /api/v1/rewards/lotteries` → Liste des loteries
- `GET /api/v1/rewards/challenges` → Liste des challenges

## CONTRATS DE DONNÉES (FAIT FOI - CHAMPS PUBLICS UNIQUEMENT)

**⚠️ IMPORTANT :** Les champs sensibles sont automatiquement filtrés par l'API. Ne jamais accéder directement aux champs internes.

### Partner (Public)
```typescript
{
  id: string;
  name: string;
  slug: string;
  category: { id: string | null; name: string }; // Toujours un objet
  categoryName: string; // Alias
  logoUrl: string | null; // URL absolue avec IP LAN
  imageUrl: string | null; // Alias de logoUrl
  imagePath: string | null; // Chemin relatif
  description: string | null;
  shortDescription: string | null;
  isComplete: boolean;
  websiteUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tauxCashbackBase: number;
  discoveryCashbackRate: number | null;
  permanentCashbackRate: number | null;
  territories: string[]; // Toujours un array
  latitude: number | null;
  longitude: number | null;
  boostable: boolean;
  status: string;
  menuImages: string[]; // URLs absolues
  photos: string[]; // URLs absolues
  marketingPrograms: any[];
  createdAt: string | null; // ISO 8601
  updatedAt: string | null; // ISO 8601
  // ❌ CHAMPS EXCLUS : siret, phone, documents, additionalInfo, affiliations
}
```

### GiftCard (Public)
```typescript
{
  id: string;
  type: string;
  name: string;
  description: string;
  value: number;
  partnerId: string | null;
  partner?: PartnerPublic | null;
  isGiftable: boolean;
  imageUrl: string | null; // URL absolue
  createdAt: string | null;
  updatedAt: string | null;
}
```

### Lottery (Public)
```typescript
{
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null; // URL absolue
  startAt: string; // ISO 8601
  endAt: string; // ISO 8601
  ticketCost: number;
  status: string;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}
```

### Badge (Public)
```typescript
{
  id: string;
  name: string;
  description: string;
  level: number;
  unlockCondition: string;
  imageUrl: string | null; // URL absolue
  createdAt: string | null;
  updatedAt: string | null;
}
```

### Boost (Public)
```typescript
{
  id: string;
  name: string;
  description: string;
  multiplier: number;
  target: string;
  categoryId: string | null;
  partnerId: string | null;
  costInPoints: number;
  startsAt: string; // ISO 8601
  endsAt: string; // ISO 8601
  active: boolean;
  imageUrl: string | null; // URL absolue
  createdAt: string | null;
  updatedAt: string | null;
}
```

## RÈGLES OBLIGATOIRES

### 1. Consommation API
- ✅ Consommer **UNIQUEMENT** les routes `/api/v1/*`
- ✅ Utiliser `GET /api/v1/debug/network` pour obtenir l'IP LAN dynamiquement
- ❌ Ne jamais coder d'IP en dur
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
- ✅ Utiliser les paramètres `page` et `pageSize`
- ✅ Afficher les métadonnées de pagination (`meta.pagination`)

### 5. Authentification
- ✅ Stocker le token JWT de manière sécurisée
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

## FORMAT DE RÉPONSE API

Toutes les réponses suivent ce format :

```typescript
{
  data: T | T[] | null,
  error: {
    message: string,
    code: string,
    details?: any
  } | null,
  meta: {
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

## EXEMPLES D'UTILISATION

### Détection IP LAN
```typescript
const response = await fetch(`${BASE_URL}/debug/network`);
const { data } = await response.json();
const apiUrl = `http://${data.ipv4}:${data.port}${data.basePath}`;
```

### Liste des Partenaires
```typescript
const response = await fetch(
  `${BASE_URL}/partners?page=1&pageSize=20&category=restauration`
);
const { data, meta } = await response.json();
// data.partners: PartnerPublic[]
// meta.pagination: { page, pageSize, total, totalPages }
```

### Détail d'un Partenaire
```typescript
const response = await fetch(`${BASE_URL}/partners/${partnerId}`);
const { data } = await response.json();
// data: PartnerPublic
// data.logoUrl est toujours une URL absolue avec IP LAN
// data.category.name est toujours une string (même si vide)
```

### Achat d'un Boost (Auth requise)
```typescript
const response = await fetch(`${BASE_URL}/rewards/boosts/${boostId}/purchase`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## FONCTIONNALITÉS À IMPLÉMENTER

[À compléter selon les besoins spécifiques du mobile]

---

**Référence complète :** `ARCHITECTURE_COMMUNICATION_KASHUP.md`

