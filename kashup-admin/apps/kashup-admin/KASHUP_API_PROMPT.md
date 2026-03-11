# 📋 PROMPT COMPLET POUR KASHUP-API

## 🎯 OBJECTIF

Configurer kashup-api pour qu'elle communique parfaitement avec kashup-admin. Tous les endpoints doivent retourner le format `StandardResponse` et accepter les données dans les formats attendus par le back-office.

---

## 📌 FORMAT DE RÉPONSE STANDARDISÉ

**TOUS les endpoints de kashup-api doivent retourner le format suivant :**

```typescript
{
  statusCode: number,        // Code HTTP (200, 201, 400, 404, 500, etc.)
  success: boolean,           // true si succès, false si erreur
  message: string,            // Message descriptif de l'opération
  data: T | null,             // Les données retournées (null si erreur)
  meta?: {                    // Métadonnées optionnelles
    pagination?: {
      page: number,
      limit: number,
      total: number,
      totalPages: number,
      hasNext: boolean,
      hasPrev: boolean
    },
    details?: {
      code?: string,           // Code d'erreur personnalisé (ex: 'VALIDATION_ERROR')
      fieldErrors?: Record<string, string[]>  // Erreurs de validation par champ
    }
  }
}
```

### Exemples de réponses :

**Succès (200) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Partenaire créé avec succès",
  "data": {
    "id": "123",
    "name": "Mon Partenaire",
    ...
  }
}
```

**Erreur (400) :**
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Erreur de validation",
  "data": null,
  "meta": {
    "details": {
      "code": "VALIDATION_ERROR",
      "fieldErrors": {
        "name": ["Le nom est obligatoire"],
        "categories": ["Au moins une catégorie doit être sélectionnée"]
      }
    }
  }
}
```

**Avec pagination :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Liste des partenaires récupérée avec succès",
  "data": {
    "partners": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 🔐 AUTHENTIFICATION

### POST /auth/login

**Request Body :**
```json
{
  "email": "admin@kashup.local",
  "password": "password123"
}
```

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": "123",
      "email": "admin@kashup.local",
      "fullName": "Admin User",
      "role": "admin"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 3600,
      "refreshExpiresIn": 86400,
      "tokenType": "Bearer"
    }
  }
}
```

**Important :** Les tokens doivent être dans `data.tokens`, pas à la racine.

### POST /auth/refresh

**Request Body :**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Token rafraîchi avec succès",
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  }
}
```

### GET /admin/me

**Headers :** `Authorization: Bearer <accessToken>`

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Utilisateur récupéré avec succès",
  "data": {
    "id": "123",
    "email": "admin@kashup.local",
    "fullName": "Admin User",
    "role": "admin"
  }
}
```

---

## 👥 PARTENAIRES

### GET /partners

**Query Parameters :**
- `page` (number, optionnel, défaut: 1)
- `limit` (number, optionnel, défaut: 20)
- `search` (string, optionnel)
- `status` (string, optionnel: 'active' | 'pending' | 'inactive')
- `category` (string, optionnel) - Filtrer par catégorie
- `territory` (string, optionnel: 'martinique' | 'guadeloupe' | 'guyane')
- `sortBy` (string, optionnel: 'name' | 'createdAt' | 'updatedAt')
- `sortOrder` (string, optionnel: 'asc' | 'desc')

**Important :** Ne pas envoyer les paramètres vides (`undefined`, `null`, `''`, `'all'`).

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Liste des partenaires récupérée avec succès",
  "data": {
    "partners": [
      {
        "id": "123",
        "name": "Mon Partenaire",
        "categories": ["Restauration", "Loisir"],  // Tableau de catégories
        "territories": ["martinique", "guadeloupe"],  // Tableau de territoires
        "status": "active",
        "logoUrl": "https://...",
        "giftCardImageUrl": "https://...",
        "menuImages": ["https://...", "https://..."],
        "photos": ["https://..."],
        ...
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### GET /partners/:id

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Partenaire récupéré avec succès",
  "data": {
    "id": "123",
    "name": "Mon Partenaire",
    "categories": ["Restauration"],
    "territories": ["martinique"],
    ...
  }
}
```

### POST /partners

**Content-Type :** `multipart/form-data`

**FormData Fields :**
- `name` (string, requis)
- `categories` (string, requis) - **JSON stringifié** : `["Restauration", "Loisir"]`
- `territories` (string, requis) - **JSON stringifié** : `["martinique", "guadeloupe"]`
- `status` (string, requis: 'active' | 'pending' | 'inactive')
- `siret` (string, optionnel)
- `phone` (string, optionnel)
- `address` (string, optionnel)
- `instagramUrl` (string, optionnel)
- `facebookUrl` (string, optionnel)
- `giftCardDescription` (string, optionnel)
- `openingHoursStart` (string, optionnel)
- `openingHoursEnd` (string, optionnel)
- `openingDays[]` (string[], optionnel) - Array de jours
- `marketingPrograms` (string, optionnel) - **JSON stringifié**
- `logo` (File, optionnel)
- `kbis` (File, optionnel)
- `giftCardImage` (File, optionnel)
- `giftCardVirtualCardImage` (File, optionnel)
- `menuImages[]` (File[], optionnel) - Array de fichiers
- `photos[]` (File[], optionnel) - Array de fichiers
- Tous les champs numériques (cashbackRate, etc.) en string

**Important :**
- Ne PAS définir manuellement le `Content-Type` header. Le navigateur le définira automatiquement avec le bon `boundary`.
- Les tableaux (`categories`, `territories`, `marketingPrograms`) doivent être envoyés comme **JSON strings**.
- Les fichiers multiples (`menuImages[]`, `photos[]`) doivent être envoyés avec `[]` dans le nom du champ.

**Response (StandardResponse) :**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Partenaire créé avec succès",
  "data": {
    "id": "123",
    "name": "Mon Partenaire",
    ...
  }
}
```

### PATCH /partners/:id

Même format que POST /partners, mais tous les champs sont optionnels (mise à jour partielle).

### DELETE /partners/:id

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Partenaire supprimé avec succès",
  "data": null
}
```

### GET /partners/categories

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Catégories récupérées avec succès",
  "data": ["Restauration", "Beauté et Bien-être", "Loisir", ...]
}
```

**Important :** Retourner un tableau de strings, pas d'objets.

### GET /partners/:id/statistics

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Statistiques du partenaire récupérées avec succès",
  "data": {
    "totalTransactions": 1247,
    "totalAmount": 45680,
    "featuredOffersSold": 89,
    "activeUsers": 342,
    "transactionGrowth": 5.2,
    "averageBasketGrowth": 3.1,
    ...
  }
}
```

### POST /partners/:id/documents

**Content-Type :** `multipart/form-data`

**FormData Fields :**
- `name` (string, requis)
- `type` (string, requis: 'invoice' | 'commercial_analysis' | 'contract' | 'other')
- `file` (File, requis)

**Response (StandardResponse) :**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Document ajouté avec succès",
  "data": {
    "id": "123",
    "partnerId": "456",
    "name": "Facture",
    "type": "invoice",
    "url": "https://...",
    "size": "2.5 MB",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### GET /partners/:id/documents

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Documents du partenaire récupérés avec succès",
  "data": [
    {
      "id": "123",
      "partnerId": "456",
      "name": "Facture",
      "type": "invoice",
      "url": "https://...",
      "size": "2.5 MB",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### DELETE /partners/:id/documents/:documentId

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Document supprimé avec succès",
  "data": null
}
```

---

## 🎁 OFFRES

### GET /offers/current

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Offres actuelles récupérées avec succès",
  "data": [
    {
      "id": "123",
      "partnerId": "456",
      "partnerName": "Mon Partenaire",
      "partnerLogoUrl": "https://...",
      "title": "Offre spéciale",
      "price": 50,
      "cashbackRate": 10,
      "startAt": "2024-01-01T00:00:00Z",
      "endAt": "2024-12-31T23:59:59Z",
      "stock": 100,
      "stockUsed": 25,
      "imageUrl": "https://...",
      "status": "active"
    }
  ]
}
```

### POST /offers

**Content-Type :** `multipart/form-data` (si image) ou `application/json` (sans image)

**FormData/JSON Fields :**
- `partnerId` (string, requis)
- `title` (string, requis)
- `price` (number, optionnel)
- `cashbackRate` (number, requis)
- `startAt` (string, requis) - ISO 8601
- `endAt` (string, requis) - ISO 8601
- `stock` (number, requis)
- `conditions` (string, optionnel)
- `image` (File, optionnel) - Seulement si FormData

**Response (StandardResponse) :**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Offre créée avec succès",
  "data": { ... }
}
```

---

## 🏆 RÉCOMPENSES (Badges, Boosts, Loteries, Défis)

### GET /rewards/:type

**Type :** `boost` | `badge` | `lottery` | `challenge`

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Récompenses de type boost récupérées avec succès",
  "data": [
    {
      "id": "123",
      "type": "boost",
      "title": "Boost Cashback",
      "description": "...",
      "imageUrl": "https://...",
      "partnerId": "456",
      ...
    }
  ]
}
```

### POST /rewards

**Content-Type :** `multipart/form-data` (si image) ou `application/json` (sans image)

**FormData/JSON Fields :**
- `type` (string, requis: 'boost' | 'badge' | 'lottery' | 'challenge')
- `title` (string, requis)
- `description` (string, optionnel)
- `image` (File, optionnel)
- `partnerId` (string, optionnel)
- ... (autres champs selon le type)

**Response (StandardResponse) :**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Récompense créée avec succès",
  "data": { ... }
}
```

---

## 📊 STATISTIQUES ADMIN

### GET /admin/statistics/table

**Query Parameters :**
- `startDate` (string, optionnel) - ISO 8601
- `endDate` (string, optionnel) - ISO 8601
- `territory` (string, optionnel)
- `category` (string, optionnel)

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Statistiques récupérées avec succès",
  "data": {
    "rows": [
      {
        "id": "123",
        "name": "Partenaire 1",
        "category": "Restauration",
        "territory": "martinique",
        "transactions": 150,
        "amount": 5000,
        "growth": 5.2
      }
    ],
    "totals": {
      "totalTransactions": 5000,
      "totalAmount": 150000,
      "averageGrowth": 4.5
    },
    "filters": {
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "territory": "martinique"
    }
  }
}
```

### GET /admin/statistics/departments

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Statistiques par département récupérées avec succès",
  "data": [
    {
      "department": "Restauration",
      "transactions": 2000,
      "amount": 60000,
      "growth": 3.5
    },
    ...
  ]
}
```

### GET /admin/ai/analysis

**Query Parameters :**
- `startDate` (string, optionnel)
- `endDate` (string, optionnel)

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Analyse IA récupérée avec succès",
  "data": {
    "insights": [
      {
        "type": "trend",
        "title": "Tendance positive",
        "description": "...",
        "impact": "high"
      }
    ],
    "recommendations": [...],
    "predictions": [...]
  }
}
```

---

## 🎁 CARTES CADEAUX & BOX UP

### GET /gift-cards

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Cartes cadeaux récupérées avec succès",
  "data": [...]
}
```

### POST /gift-cards

**Content-Type :** `multipart/form-data` (si image) ou `application/json`

**Response (StandardResponse) :**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Carte cadeau créée avec succès",
  "data": { ... }
}
```

### GET /gift-boxes

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Boxes récupérées avec succès",
  "data": [...]
}
```

### POST /gift-boxes

**Content-Type :** `multipart/form-data` (si image) ou `application/json`

**Response (StandardResponse) :**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Box créée avec succès",
  "data": { ... }
}
```

---

## 💝 DONS

### GET /donations/associations

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Associations récupérées avec succès",
  "data": [
    {
      "id": "123",
      "nom": "Association Solidaire",
      "but": "...",
      "tonImpact": "...",
      "type": "solidaire",
      "imageUrl": "https://..."
    }
  ]
}
```

### POST /donations/associations

**Content-Type :** `multipart/form-data` (si image) ou `application/json`

**FormData/JSON Fields :**
- `nom` (string, requis)
- `but` (string, requis)
- `tonImpact` (string, requis)
- `type` (string, requis: 'solidaire' | 'humanitaire' | 'ecologie' | 'sante' | 'education' | 'culture' | 'sport' | 'autre')
- `image` (File, optionnel)

**Response (StandardResponse) :**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Association créée avec succès",
  "data": { ... }
}
```

### GET /donations/projets

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Projets récupérés avec succès",
  "data": [
    {
      "id": "123",
      "nom": "Projet Écologie",
      "descriptif": "...",
      "tonImpact": "..."
    }
  ]
}
```

### POST /donations/projets

**Content-Type :** `application/json`

**JSON Fields :**
- `nom` (string, requis)
- `descriptif` (string, requis)
- `tonImpact` (string, requis)

**Response (StandardResponse) :**
```json
{
  "statusCode": 201,
  "success": true,
  "message": "Projet créé avec succès",
  "data": { ... }
}
```

---

## 👤 UTILISATEURS

### GET /admin/users

**Query Parameters :**
- `page` (number, optionnel)
- `pageSize` (number, optionnel)
- `search` (string, optionnel)
- `status` (string, optionnel)
- `territory` (string, optionnel)

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Utilisateurs récupérés avec succès",
  "data": {
    "items": [...],
    "page": 1,
    "pageSize": 20,
    "total": 500
  }
}
```

---

## ⚙️ PARAMÈTRES

### GET /admin/settings/roles

**Response (StandardResponse) :**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Rôles admin récupérés avec succès",
  "data": [
    {
      "id": "123",
      "email": "admin@kashup.local",
      "fullName": "Admin User",
      "role": "admin",
      "lastLoginAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## ⚠️ POINTS CRITIQUES À RESPECTER

1. **Format StandardResponse obligatoire** : Tous les endpoints doivent retourner ce format, même en cas d'erreur.

2. **Gestion des erreurs** : 
   - `statusCode >= 400` et `success: false` pour les erreurs
   - `meta.details.fieldErrors` pour les erreurs de validation

3. **FormData sans Content-Type manuel** : Ne pas définir le header `Content-Type` pour les requêtes FormData. Le navigateur le définira automatiquement.

4. **Tableaux JSON stringifiés** : `categories`, `territories`, `marketingPrograms` doivent être envoyés comme JSON strings dans FormData.

5. **Fichiers multiples** : Utiliser `menuImages[]` et `photos[]` avec `[]` dans le nom du champ.

6. **Pagination** : Toujours inclure `meta.pagination` pour les listes paginées.

7. **JWT Token** : Tous les endpoints protégés doivent accepter `Authorization: Bearer <token>`.

8. **CORS** : Configurer CORS pour accepter les requêtes depuis `http://localhost:5173` (Vite dev) et votre domaine de production.

9. **Validation** : Valider tous les champs requis et retourner des erreurs claires dans `meta.details.fieldErrors`.

10. **Images** : Stocker les images uploadées et retourner des URLs accessibles (pas de blob URLs).

---

## 🧪 TESTS RECOMMANDÉS

1. Tester la connexion : `GET /health` ou `GET /admin/me`
2. Tester la création d'un partenaire avec image
3. Tester la création d'une offre avec image
4. Tester la pagination des partenaires
5. Tester les erreurs de validation
6. Tester le refresh token
7. Tester les uploads de fichiers multiples

---

## 📝 NOTES IMPORTANTES

- Le back-office envoie automatiquement le token JWT dans le header `Authorization` pour toutes les requêtes authentifiées.
- Le back-office gère automatiquement le refresh token si le token expire.
- Le back-office filtre automatiquement les paramètres vides (`undefined`, `null`, `''`, `'all'`).
- Le back-office attend des URLs d'images complètes (pas de blob URLs) pour l'affichage.

---

**Une fois ces modifications appliquées dans kashup-api, le back-office pourra se connecter et fonctionner correctement !** 🚀

