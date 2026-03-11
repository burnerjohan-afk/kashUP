# Architecture Kashup Admin - Implémentation

Ce document décrit l'implémentation de l'architecture selon `ARCHITECTURE_COMMUNICATION_KASHUP.md`.

## ✅ Implémentations réalisées

### 1. Détection dynamique de l'IP LAN

**Fichier:** `src/lib/api/network-detector.ts`

- ✅ Utilise `GET /api/v1/debug/network` pour détecter l'IP LAN dynamiquement
- ✅ ⚠️ AUCUNE IP CODÉE EN DUR
- ✅ Cache les informations réseau pour éviter les appels répétés
- ✅ Fallback automatique si la détection échoue

**Utilisation:**
```typescript
import { detectNetworkInfo, getDynamicApiBaseUrl } from '@/lib/api/network-detector';

// Détecter l'IP LAN
const networkInfo = await detectNetworkInfo('http://localhost:4000');
// { ipv4: '192.168.1.19', port: 4000, basePath: '/api/v1', origins: [...] }

// Obtenir l'URL complète
const apiUrl = await getDynamicApiBaseUrl('http://localhost:4000');
// 'http://192.168.1.19:4000/api/v1'
```

### 2. Nouveau client API (format { data, error, meta })

**Fichier:** `src/lib/api/kashup-client.ts`

- ✅ Format de réponse: `{ data, error, meta }` (selon ARCHITECTURE_COMMUNICATION_KASHUP.md)
- ✅ Authentification JWT automatique (sauf `/health` et `/debug/network`)
- ✅ Gestion des erreurs 501 (Not Implemented)
- ✅ Timeout: 30s côté client, 25s côté serveur
- ✅ Support FormData pour les uploads

**Fonctions disponibles:**
- `apiGet<T>(endpoint, searchParams?)` → `ApiResponseFormat<T>`
- `apiPost<T>(endpoint, body?)` → `ApiResponseFormat<T>`
- `apiPatch<T>(endpoint, body?)` → `ApiResponseFormat<T>`
- `apiDelete<T>(endpoint)` → `ApiResponseFormat<T>`
- `initializeApiBaseUrl()` → Initialise l'URL avec détection IP LAN
- `resetApiConfig()` → Réinitialise la configuration

**Exemple d'utilisation:**
```typescript
import { apiGet, apiPost } from '@/lib/api/kashup-client';

// GET avec pagination
const response = await apiGet<Partner[]>('/partners', {
  page: 1,
  pageSize: 50,
});

if (response.error) {
  console.error('Erreur:', response.error.message);
} else {
  console.log('Données:', response.data);
  console.log('Pagination:', response.meta?.pagination);
}

// POST avec FormData
const formData = new FormData();
formData.append('name', 'Nouveau Partenaire');
formData.append('logo', logoFile);

const createResponse = await apiPost<Partner>('/partners', formData);
```

### 3. Types API mis à jour

**Fichier:** `src/types/api.ts`

- ✅ Nouveau type `ApiResponseFormat<T>` avec format `{ data, error, meta }`
- ✅ Type `StandardResponse<T>` conservé pour compatibilité (legacy)
- ✅ Types de pagination alignés avec l'architecture

### 4. Configuration API

**Fichier:** `src/config/api.ts`

- ✅ Support de `VITE_API_BASE_URL` et `VITE_API_URL`
- ✅ Fallback automatique si détection échoue
- ✅ Configuration centralisée

### 5. Initialisation au démarrage

**Fichier:** `src/main.tsx`

- ✅ Initialisation automatique de la détection IP LAN au démarrage
- ✅ Appel de `initializeApiBaseUrl()` avant le rendu de l'app

## 🔄 Migration depuis l'ancien système

### Ancien format (StandardResponse)
```typescript
// ❌ ANCIEN
const response = await getStandardJson<Partner[]>('partners');
if (!response.success) {
  throw new Error(response.message);
}
const partners = response.data;
```

### Nouveau format (ApiResponseFormat)
```typescript
// ✅ NOUVEAU
import { apiGet } from '@/lib/api/kashup-client';

const response = await apiGet<Partner[]>('/partners');
if (response.error) {
  console.error('Erreur:', response.error.message);
  return;
}
const partners = response.data; // Partner[] | null
```

## 📋 Routes API disponibles

Toutes les routes sont préfixées par `/api/v1` :

### Système
- `GET /api/v1/health` → Health check
- `GET /api/v1/debug/network` → Informations réseau (IP LAN)

### Partenaires
- `GET /api/v1/partners` → Liste (avec pagination)
- `GET /api/v1/partners/:id` → Détail
- `POST /api/v1/partners` → Création
- `PATCH /api/v1/partners/:id` → Modification
- `DELETE /api/v1/partners/:id` → Suppression
- `GET /api/v1/partners/categories` → Catégories
- `GET /api/v1/partners/territories` → Territoires
- `GET /api/v1/partners/:id/statistics` → Statistiques (Admin)
- `GET /api/v1/partners/:id/documents` → Documents (Admin)

### Bons d'achat
- `GET /api/v1/gift-cards` → Catalogue
- `GET /api/v1/gift-cards/offers` → Offres
- `GET /api/v1/gift-cards/boxes` → Boxups
- `GET /api/v1/gift-cards/orders` → Commandes (Admin)
- `GET /api/v1/gift-cards/config` → Configuration (Admin)
- `PATCH /api/v1/gift-cards/config` → Mise à jour config (Admin)

### Box Ups
- `GET /api/v1/boxups` → Liste
- `GET /api/v1/boxups/:id` → Détail
- `POST /api/v1/boxups` → Création (Admin) ⚠️ 501
- `PATCH /api/v1/boxups/:id` → Modification (Admin) ⚠️ 501
- `DELETE /api/v1/boxups/:id` → Suppression (Admin) ⚠️ 501

### Loteries
- `GET /api/v1/lotteries` → Liste
- `GET /api/v1/lotteries/:id` → Détail
- `POST /api/v1/lotteries` → Création (Admin) ⚠️ 501
- `PATCH /api/v1/lotteries/:id` → Modification (Admin) ⚠️ 501
- `DELETE /api/v1/lotteries/:id` → Suppression (Admin) ⚠️ 501

### Badges
- `GET /api/v1/badges` → Liste
- `GET /api/v1/badges/:id` → Détail ⚠️ 501
- `POST /api/v1/badges` → Création (Admin) ⚠️ 501
- `PATCH /api/v1/badges/:id` → Modification (Admin) ⚠️ 501
- `DELETE /api/v1/badges/:id` → Suppression (Admin) ⚠️ 501

### Rewards
- `GET /api/v1/rewards` → Liste complète (Admin)
- `GET /api/v1/rewards/:type` → Liste par type (Admin)
- `POST /api/v1/rewards` → Création (Admin)
- `PATCH /api/v1/rewards/:id` → Modification (Admin)

## 🔐 Authentification

- ✅ JWT obligatoire pour toutes les opérations (sauf `/health` et `/debug/network`)
- ✅ Token envoyé dans le header: `Authorization: Bearer <token>`
- ✅ Refresh token automatique géré par le store d'authentification
- ✅ Redirection vers login si token invalide/expiré

## ⚠️ Gestion des erreurs 501

Les endpoints marqués ⚠️ 501 retournent une erreur avec le code `NOT_IMPLEMENTED` :

```typescript
const response = await apiPost<BoxUp>('/boxups', data);

if (response.error && response.error.code === 'NOT_IMPLEMENTED') {
  // Afficher un message à l'utilisateur
  toast.warning('Cette fonctionnalité n\'est pas encore disponible');
}
```

## 🚀 Prochaines étapes

1. **Migrer les fichiers API existants** pour utiliser `kashup-client.ts`
2. **Mettre à jour les composants** pour utiliser le nouveau format de réponse
3. **Tester la détection d'IP LAN** sur différents environnements
4. **Implémenter les fonctionnalités manquantes** selon les besoins

## 📚 Références

- **Architecture complète:** `ARCHITECTURE_COMMUNICATION_KASHUP.md` (à créer si nécessaire)
- **Template prompt:** Voir le prompt fourni par l'utilisateur
- **Types API:** `src/types/api.ts`
- **Client API:** `src/lib/api/kashup-client.ts`
- **Détection réseau:** `src/lib/api/network-detector.ts`

