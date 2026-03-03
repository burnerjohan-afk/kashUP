# 📚 Guide d'intégration API - kashup-mobile

## ✅ Configuration terminée

kashup-mobile est maintenant configuré pour communiquer avec kashup-api en utilisant le format StandardResponse.

## 📁 Structure des fichiers

### Types
- `src/types/api.ts` - Types StandardResponse, ApiError, PaginationMeta

### Services API
- `src/services/api.ts` - Client API principal avec JWT et refresh automatique
- `src/services/auth.ts` - Authentification (login, logout, getCurrentUser)
- `src/services/partners.ts` - Gestion des partenaires
- `src/services/offers.ts` - Gestion des offres
- `src/services/rewards.ts` - Gestion des récompenses
- `src/services/gift-cards.ts` - Gestion des cartes cadeaux
- `src/services/donations.ts` - Gestion des dons
- `src/services/user.ts` - Données utilisateur

### Utilitaires
- `src/utils/error-handler.ts` - Formatage et affichage des erreurs

## 🔧 Configuration

### 1. Créer le fichier `.env`

À la racine du projet, créez un fichier `.env` :

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

**Pour différents environnements :**
- **Android Emulator** : `http://10.0.2.2:4000`
- **iOS Simulator** : `http://localhost:4000`
- **Appareil physique** : `http://VOTRE_IP_LOCALE:4000`
- **ngrok** : `https://xxxx-xx-xx-xx-xx.ngrok.io`

### 2. Format de réponse StandardResponse

Tous les endpoints retournent ce format :

```typescript
{
  statusCode: number,        // 200, 201, 400, 404, 500, etc.
  success: boolean,           // true si succès, false si erreur
  message: string,            // Message descriptif
  data: T | null,             // Données retournées (null si erreur)
  meta?: {
    pagination?: {
      page: number,
      limit: number,
      total: number,
      totalPages: number,
      hasNext: boolean,
      hasPrev: boolean
    },
    details?: {
      code?: string,           // Ex: 'VALIDATION_ERROR'
      fieldErrors?: Record<string, string[]>  // Erreurs de validation
    }
  }
}
```

## 📖 Exemples d'utilisation

### Authentification

```typescript
import { login, logout, getCurrentUser } from '../services/auth';
import { formatApiError, showError } from '../utils/error-handler';

// Se connecter
try {
  const { user, tokens } = await login({
    email: 'user@example.com',
    password: 'password123'
  });
  console.log('Connecté:', user);
} catch (error) {
  showError(error, 'Erreur de connexion');
}

// Déconnecter
await logout();

// Récupérer l'utilisateur actuel
const user = await getCurrentUser();
```

### Partenaires

```typescript
import { fetchPartners, fetchPartnerById } from '../services/partners';
import { formatApiError } from '../utils/error-handler';

// Récupérer les partenaires avec filtres
try {
  const response = await fetchPartners({
    page: 1,
    limit: 20,
    status: 'active',
    territoire: 'Martinique'
  });
  
  console.log('Partenaires:', response.partners);
  console.log('Pagination:', response.pagination);
} catch (error) {
  const message = formatApiError(error);
  Alert.alert('Erreur', message);
}

// Récupérer un partenaire par ID
const partner = await fetchPartnerById('partner-123');
```

### Offres

```typescript
import { fetchCurrentOffers, fetchOfferById } from '../services/offers';

// Récupérer les offres actuelles
const offers = await fetchCurrentOffers();

// Récupérer une offre par ID
const offer = await fetchOfferById('offer-123');
```

### Récompenses

```typescript
import { fetchRewardsByType } from '../services/rewards';

// Récupérer les boosts
const boosts = await fetchRewardsByType('boost');

// Récupérer les badges
const badges = await fetchRewardsByType('badge');
```

### Cartes cadeaux

```typescript
import { fetchGiftCards, fetchGiftBoxes } from '../services/gift-cards';

const giftCards = await fetchGiftCards();
const giftBoxes = await fetchGiftBoxes();
```

### Dons

```typescript
import { fetchAssociations, fetchProjets } from '../services/donations';

const associations = await fetchAssociations();
const projets = await fetchProjets();
```

### Utilisateur

```typescript
import { fetchUserProfile, fetchUserTransactions, fetchUserRewards } from '../services/user';

const profile = await fetchUserProfile();
const transactions = await fetchUserTransactions();
const rewards = await fetchUserRewards();
```

## 🔐 Gestion de l'authentification

### Tokens JWT

Les tokens sont automatiquement :
- **Stockés** dans AsyncStorage (`kashup_access_token`, `kashup_refresh_token`)
- **Ajoutés** dans le header `Authorization: Bearer <token>`
- **Rafraîchis** automatiquement si 401 (refresh token)

### Fonctions disponibles

```typescript
import { 
  getAuthToken, 
  setAuthToken, 
  clearAuthToken,
  getRefreshToken,
  setRefreshToken 
} from '../services/api';

// Récupérer le token
const token = await getAuthToken();

// Stocker un token
await setAuthToken('new-token');

// Supprimer les tokens
await clearAuthToken();
```

## ⚠️ Gestion des erreurs

### FormatApiError

Formate les erreurs API en messages lisibles :

```typescript
import { formatApiError } from '../utils/error-handler';

try {
  await fetchPartners();
} catch (error) {
  const message = formatApiError(error);
  // Affiche les erreurs de validation si présentes
  Alert.alert('Erreur', message);
}
```

### ShowError

Affiche directement une erreur à l'utilisateur :

```typescript
import { showError } from '../utils/error-handler';

try {
  await login(credentials);
} catch (error) {
  showError(error, 'Erreur de connexion');
}
```

### Erreurs de validation

Si l'API retourne des `fieldErrors`, ils sont automatiquement formatés :

```typescript
// Si l'API retourne :
{
  meta: {
    details: {
      fieldErrors: {
        email: ['Email invalide'],
        password: ['Mot de passe trop court']
      }
    }
  }
}

// formatApiError retournera :
"Erreur de validation
email: Email invalide
password: Mot de passe trop court"
```

## 🔄 Refresh token automatique

Le système gère automatiquement le refresh token :

1. Si une requête retourne 401
2. Le système essaie de rafraîchir le token avec `POST /auth/refresh`
3. Si le refresh réussit, la requête originale est réessayée
4. Si le refresh échoue, les tokens sont supprimés

## 🧹 Nettoyage des paramètres

Les paramètres de requête sont automatiquement nettoyés :
- `undefined` → supprimé
- `null` → supprimé
- `''` (chaîne vide) → supprimé
- `'all'` → supprimé

```typescript
// Avant nettoyage
{ status: 'active', category: undefined, search: '', filter: 'all' }

// Après nettoyage
{ status: 'active' }
```

## 📊 Pagination

Les réponses paginées incluent `meta.pagination` :

```typescript
const response = await fetchPartners({ page: 1, limit: 20 });

if (response.pagination) {
  console.log('Page:', response.pagination.page);
  console.log('Total:', response.pagination.total);
  console.log('A une page suivante:', response.pagination.hasNext);
}
```

## 🧪 Test de connexion

```typescript
import { testConnection } from '../services/api';

const isConnected = await testConnection();
if (isConnected) {
  console.log('API accessible');
} else {
  console.log('API inaccessible');
}
```

## 🔗 Endpoints disponibles

### Authentification
- `POST /auth/login` → `{ user, tokens }`
- `POST /auth/refresh` → `{ user, tokens }`
- `GET /users/me` → `User`

### Partenaires
- `GET /partners?page=1&limit=20&status=active` → `{ partners, pagination }`
- `GET /partners/:id` → `Partner`
- `GET /partners/categories` → `string[]`

### Offres
- `GET /offers/current` → `Offer[]`
- `GET /offers/:id` → `Offer`

### Récompenses
- `GET /rewards/:type` → `Reward[]` (type: boost, badge, lottery, challenge)

### Cartes cadeaux
- `GET /gift-cards` → `GiftCard[]`
- `GET /gift-boxes` → `GiftBox[]`

### Dons
- `GET /donations/associations` → `Association[]`
- `GET /donations/projets` → `Projet[]`

### Utilisateur
- `GET /users/me` → `User`
- `GET /users/me/transactions` → `Transaction[]`
- `GET /users/me/rewards` → `UserReward[]`

## ✅ Checklist de configuration

- [x] Types StandardResponse et ApiError créés
- [x] Client API avec JWT et refresh automatique
- [x] Tous les services créés (auth, partners, offers, rewards, gift-cards, donations, user)
- [x] Gestion des erreurs avec formatApiError
- [x] AsyncStorage pour tokens
- [ ] `.env` créé avec `EXPO_PUBLIC_API_URL` (à faire manuellement)
- [ ] CORS configuré dans kashup-api (à faire dans kashup-api)

## 🚀 Prochaines étapes

1. Créer le fichier `.env` avec `EXPO_PUBLIC_API_URL`
2. Configurer CORS dans kashup-api pour autoriser les requêtes depuis l'app mobile
3. Tester la connexion avec `testConnection()`
4. Migrer progressivement les hooks existants pour utiliser les nouveaux services

