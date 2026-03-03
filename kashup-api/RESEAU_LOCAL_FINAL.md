# Configuration API pour accès réseau local - Résumé final

## ✅ Modifications effectuées

### 1. Écoute réseau (0.0.0.0:4000)

**Fichier** : `src/server.ts`

- ✅ Serveur écoute sur `0.0.0.0:4000` (accessible depuis le réseau local)
- ✅ Port lu depuis `env.PORT` (défaut: 4000)
- ✅ Logs au démarrage avec URL LAN
- ✅ Gestion d'erreur EADDRINUSE améliorée

**Logs affichés** :
```
API listening on http://0.0.0.0:4000
Base URL (LAN): http://192.168.68.205:4000
```

### 2. Route /health

**Fichier** : `src/app.ts`

- ✅ `GET /health` → `{ ok: true, timestamp: "...", service: "kashup-api" }`
- ✅ `GET /api/v1/health` → Même réponse
- ✅ Aucune authentification requise

### 3. CORS configuré

**Fichier** : `src/app.ts`

- ✅ En développement : toutes les origines autorisées (`origin: true`)
- ✅ Expo Go sur téléphone : pattern `exp://.*` autorisé
- ✅ Headers autorisés : `Content-Type`, `Authorization`
- ✅ Méthodes autorisées : `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

### 4. Endpoint GET /api/v1/partners

**Fichier** : `src/routes/partner.routes.ts` (ligne 74)

- ✅ Route enregistrée : `router.get('/', getPartners)`
- ✅ Montée sur `/api/v1/partners` via `app.use('/api/v1', router)`
- ✅ Aucune authentification requise (endpoint public)
- ✅ Aucun filtre caché sur le statut (tous les partenaires sont retournés)
- ✅ Logs en dev : nombre de partenaires + temps de traitement

**Format de réponse** :
```json
{
  "data": {
    "partners": [...]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 50,
      "total": 3,
      "totalPages": 1
    }
  },
  "message": "Liste des partenaires récupérée avec succès"
}
```

### 5. Fichiers statiques (uploads)

**Fichier** : `src/app.ts` (ligne 144-179)

- ✅ Express sert le dossier `uploads` en statique
- ✅ Route : `GET /uploads/...`
- ✅ CORS activé pour les fichiers statiques
- ✅ Headers Content-Type corrects selon l'extension

**Test** :
```
GET http://192.168.68.205:4000/uploads/partners/[PARTNER_ID]/[FILENAME]
```

### 6. Gestion EADDRINUSE

**Fichier** : `src/server.ts`

- ✅ Message d'erreur clair si le port est déjà utilisé
- ✅ Suggestion de changer PORT dans .env
- ✅ Commande pour vérifier les processus

## 📋 Fichiers modifiés

1. **src/server.ts** - Écoute 0.0.0.0, logs, gestion EADDRINUSE
2. **src/app.ts** - Routes /health, CORS amélioré
3. **src/controllers/partner.controller.ts** - Logs détaillés (déjà fait précédemment)

## 🚀 Commande pour lancer l'API

```powershell
npm run dev
```

## 🧪 Commandes de test (depuis un autre appareil)

### Health Check
```powershell
curl.exe -X GET "http://192.168.68.205:4000/health" -v
```

### Liste des partenaires
```powershell
curl.exe -X GET "http://192.168.68.205:4000/api/v1/partners" -H "Content-Type: application/json" -v
```

### Avec pagination
```powershell
curl.exe -X GET "http://192.168.68.205:4000/api/v1/partners?page=1&pageSize=10" -H "Content-Type: application/json" -v
```

### Test d'un logo (remplacer PARTNER_ID et FILENAME)
```powershell
curl.exe -X GET "http://192.168.68.205:4000/uploads/partners/cmj8sdmge00014y78309dqsye/70f81eea-90eb-45d9-a394-182058e3bff9.jpg" -v
```

## 📱 Snippet pour l'app mobile

```typescript
const BASE_URL = 'http://192.168.68.205:4000';
const API_VERSION = '/api/v1';

// Health check
async function checkHealth() {
  const response = await fetch(`${BASE_URL}/health`);
  return await response.json();
  // { ok: true, timestamp: "...", service: "kashup-api" }
}

// Liste des partenaires
async function getPartners(params?: {
  page?: number;
  pageSize?: number;
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'tauxCashbackBase';
  sortOrder?: 'asc' | 'desc';
  territory?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  if (params?.territory) queryParams.append('territory', params.territory);
  
  const url = `${BASE_URL}${API_VERSION}/partners${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Erreur ${response.status}`);
  }
  
  return await response.json();
}

// Exemple d'utilisation
getPartners({
  page: 1,
  pageSize: 50,
  sortBy: 'updatedAt',
  sortOrder: 'desc'
})
  .then(data => {
    console.log('✅ Partenaires:', data.data.partners.length);
    console.log('📊 Total:', data.meta.pagination.total);
  })
  .catch(error => {
    console.error('❌ Erreur:', error);
  });
```

## 🔍 Vérifications

### Endpoints disponibles

- ✅ `GET http://192.168.68.205:4000/health` → `{ ok: true, timestamp: "...", service: "kashup-api" }`
- ✅ `GET http://192.168.68.205:4000/api/v1/health` → Même réponse
- ✅ `GET http://192.168.68.205:4000/api/v1/partners` → Liste des partenaires
- ✅ `GET http://192.168.68.205:4000/uploads/...` → Fichiers statiques

### CORS

- ✅ Toutes les origines autorisées en développement
- ✅ Expo Go autorisé (pattern `exp://.*`)
- ✅ Headers et méthodes configurés

### Logs

- ✅ Au démarrage : host, port, URL LAN, endpoints
- ✅ Sur GET /api/v1/partners : query params, IP, durée, nombre de partenaires

## ⚠️ Notes importantes

1. **Timeout** : L'API a un timeout de 3000ms pour les requêtes. Utilisez la pagination si vous avez beaucoup de partenaires.

2. **Pas de filtre par statut** : Tous les partenaires sont retournés, peu importe leur statut.

3. **CORS en dev** : Toutes les origines sont autorisées. En production, suivez la configuration `CORS_ORIGIN`.

4. **Port déjà utilisé** : Si vous obtenez EADDRINUSE, le serveur affichera un message clair avec des suggestions.

