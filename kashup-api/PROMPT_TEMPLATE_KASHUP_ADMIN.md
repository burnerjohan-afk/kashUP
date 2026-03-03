# Template Prompt - Kashup Admin

**⚠️ Ce fichier est un TEMPLATE. Utiliser ARCHITECTURE_COMMUNICATION_KASHUP.md comme source de vérité.**

---

Tu es le développeur principal de **Kashup Admin** (Backoffice Web).

## CONTEXTE

- **API Kashup** : Disponible sur `BASE_URL = http://<IP_LAN>:4000/api/v1`
- **IP LAN** : Détectée dynamiquement au runtime (⚠️ AUCUNE IP CODÉE EN DUR)
- **Base Path** : Toutes les routes sont préfixées par `/api/v1`
- **Authentification** : JWT requise pour toutes les opérations (sauf `/health` et `/debug/network`)

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
- `POST /api/v1/partners` → Création (Admin/Partner)
- `PATCH /api/v1/partners/:id` → Modification (Admin/Partner)
- `DELETE /api/v1/partners/:id` → Suppression (Admin)
- `GET /api/v1/partners/categories` → Catégories
- `GET /api/v1/partners/territories` → Territoires
- `GET /api/v1/partners/:id/statistics` → Statistiques (Admin)
- `GET /api/v1/partners/:id/documents` → Documents (Admin)

#### Bons d'achat
- `GET /api/v1/gift-cards` → Catalogue
- `GET /api/v1/gift-cards/offers` → Offres
- `GET /api/v1/gift-cards/boxes` → Boxups
- `GET /api/v1/gift-cards/orders` → Commandes (Admin)
- `GET /api/v1/gift-cards/config` → Configuration (Admin)
- `PATCH /api/v1/gift-cards/config` → Mise à jour config (Admin)
- `GET /api/v1/gift-cards/box-up/config` → Config BoxUp (Admin)
- `POST /api/v1/gift-cards/box-up/config` → Création/mise à jour BoxUp (Admin)

#### Box Ups
- `GET /api/v1/boxups` → Liste
- `GET /api/v1/boxups/:id` → Détail
- `POST /api/v1/boxups` → Création (Admin) ⚠️ 501
- `PATCH /api/v1/boxups/:id` → Modification (Admin) ⚠️ 501
- `DELETE /api/v1/boxups/:id` → Suppression (Admin) ⚠️ 501

#### Loteries
- `GET /api/v1/lotteries` → Liste
- `GET /api/v1/lotteries/:id` → Détail
- `POST /api/v1/lotteries` → Création (Admin) ⚠️ 501
- `PATCH /api/v1/lotteries/:id` → Modification (Admin) ⚠️ 501
- `DELETE /api/v1/lotteries/:id` → Suppression (Admin) ⚠️ 501

#### Badges
- `GET /api/v1/badges` → Liste
- `GET /api/v1/badges/:id` → Détail ⚠️ 501
- `POST /api/v1/badges` → Création (Admin) ⚠️ 501
- `PATCH /api/v1/badges/:id` → Modification (Admin) ⚠️ 501
- `DELETE /api/v1/badges/:id` → Suppression (Admin) ⚠️ 501

#### Rewards
- `GET /api/v1/rewards` → Liste complète (Admin)
- `GET /api/v1/rewards/:type` → Liste par type (Admin)
- `POST /api/v1/rewards` → Création (Admin)
- `PATCH /api/v1/rewards/:id` → Modification (Admin)

## CONTRATS DE DONNÉES (FAIT FOI - CHAMPS PUBLICS + INTERNES)

**⚠️ IMPORTANT :** En tant qu'admin, vous avez accès à TOUS les champs, y compris les champs sensibles.

### Partner (Admin - Complet)
```typescript
{
  // Tous les champs publics (voir template mobile)
  // +
  siret: string | null; // ✅ Accessible en admin
  phone: string | null; // ✅ Accessible en admin
  documents: PartnerDocument[]; // ✅ Accessible via /partners/:id/documents
  additionalInfo: string | null; // ✅ Accessible en admin
  affiliations: any[]; // ✅ Accessible en admin
}
```

### GiftCard (Admin - Complet)
```typescript
{
  // Tous les champs publics (voir template mobile)
  // +
  purchases: GiftCardPurchase[]; // ✅ Accessible en admin
  deletedAt: string | null; // ✅ Accessible en admin
}
```

### Lottery (Admin - Complet)
```typescript
{
  // Tous les champs publics (voir template mobile)
  // +
  entries: LotteryEntry[]; // ✅ Accessible en admin
  deletedAt: string | null; // ✅ Accessible en admin
}
```

### Badge (Admin - Complet)
```typescript
{
  // Tous les champs publics (voir template mobile)
  // +
  users: UserBadge[]; // ✅ Accessible en admin
  deletedAt: string | null; // ✅ Accessible en admin
}
```

### Boost (Admin - Complet)
```typescript
{
  // Tous les champs publics (voir template mobile)
  // +
  users: UserBoost[]; // ✅ Accessible en admin
  deletedAt: string | null; // ✅ Accessible en admin
}
```

## RÈGLES OBLIGATOIRES

### 1. Consommation API
- ✅ Consommer **UNIQUEMENT** les routes `/api/v1/*`
- ✅ Utiliser `GET /api/v1/debug/network` pour obtenir l'IP LAN dynamiquement
- ❌ Ne jamais coder d'IP en dur
- ❌ Ne jamais accéder directement aux routes non versionnées

### 2. Authentification
- ✅ **Authentification JWT OBLIGATOIRE** pour toutes les opérations (sauf `/health` et `/debug/network`)
- ✅ Envoyer le token dans le header : `Authorization: Bearer <token>`
- ✅ Gérer le refresh token automatiquement
- ✅ Rediriger vers login si token invalide/expiré
- ✅ Gérer les rôles (admin, partner, user)

### 3. Gestion des Données
- ✅ Accès complet à tous les champs (publics + internes)
- ✅ Les URLs d'images sont toujours absolues avec IP LAN
- ✅ Gérer les uploads de fichiers (multipart/form-data)
- ✅ Valider les données avant envoi (côté client)

### 4. Gestion des Erreurs
- ✅ Gérer gracieusement les erreurs **501 (Not Implemented)**
- ✅ Gérer les timeouts (30s côté client, 25s côté serveur)
- ✅ Afficher des messages d'erreur clairs
- ✅ Implémenter un retry automatique pour les erreurs réseau temporaires
- ✅ Gérer les erreurs de validation (422)

### 5. Pagination
- ✅ Implémenter la pagination pour toutes les listes
- ✅ Utiliser les paramètres `page` et `pageSize`
- ✅ Afficher les métadonnées de pagination (`meta.pagination`)
- ✅ Permettre la modification de la taille de page

### 6. CRUD Operations
- ✅ Créer des formulaires pour POST/PATCH
- ✅ Gérer les uploads de fichiers (logos, images, documents)
- ✅ Valider les données avant soumission
- ✅ Confirmer avant suppression (DELETE)
- ✅ Afficher les messages de succès/erreur

### 7. Sécurité
- ✅ Ne jamais exposer les tokens dans les logs
- ✅ Ne jamais stocker les tokens en clair
- ✅ Valider les permissions côté client (mais l'API fait foi)
- ✅ Gérer les erreurs 401/403 gracieusement

### 8. Performance
- ✅ Mettre en cache les données statiques (catégories, territoires)
- ✅ Implémenter un système de cache pour les images
- ✅ Utiliser la pagination pour éviter de charger trop de données
- ✅ Optimiser les requêtes (éviter les appels redondants)
- ✅ Implémenter un système de debounce pour les recherches

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

### Authentification
```typescript
const response = await fetch(`${BASE_URL}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { data } = await response.json();
// Stocker data.token et data.refreshToken
```

### Liste des Partenaires (avec auth)
```typescript
const response = await fetch(`${BASE_URL}/partners?page=1&pageSize=50`, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const { data, meta } = await response.json();
// data.partners: PartnerAdmin[] (avec tous les champs)
```

### Création d'un Partenaire (avec upload)
```typescript
const formData = new FormData();
formData.append('name', 'Nouveau Partenaire');
formData.append('categoryId', categoryId);
formData.append('logo', logoFile); // Fichier image

const response = await fetch(`${BASE_URL}/partners`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // Ne pas mettre Content-Type, le navigateur le fait automatiquement
  },
  body: formData
});
```

### Modification d'un Partenaire
```typescript
const response = await fetch(`${BASE_URL}/partners/${partnerId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Nom modifié',
    status: 'active'
  })
});
```

### Suppression d'un Partenaire
```typescript
const response = await fetch(`${BASE_URL}/partners/${partnerId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Récupération des Documents (Admin)
```typescript
const response = await fetch(`${BASE_URL}/partners/${partnerId}/documents`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const { data } = await response.json();
// data: PartnerDocument[]
```

## FONCTIONNALITÉS À IMPLÉMENTER

[À compléter selon les besoins spécifiques de l'admin]

### Dashboard
- Statistiques globales
- Graphiques de performance
- Alertes et notifications

### Gestion des Partenaires
- Liste avec filtres avancés
- Création/Modification/Suppression
- Upload de logos et documents
- Gestion des catégories et territoires
- Statistiques par partenaire

### Gestion des Bons d'achat
- Catalogue
- Commandes
- Configuration

### Gestion des Loteries
- Liste
- Création/Modification/Suppression
- Gestion des participants

### Gestion des Badges
- Liste
- Création/Modification/Suppression
- Attribution manuelle

### Gestion des Rewards
- Liste complète
- Création/Modification
- Gestion des boosts

---

**Référence complète :** `ARCHITECTURE_COMMUNICATION_KASHUP.md`

