# Modifications pour l'accès réseau local

## Résumé des modifications

### 1. Serveur écoute sur 0.0.0.0:4000 ✅

**Fichier** : `src/server.ts`

**Modification** : Le serveur écoute maintenant sur `0.0.0.0:4000` au lieu de `localhost:4000`, permettant l'accès depuis le réseau local (Wi-Fi).

**Logs ajoutés** :
- Host, port, base URL, base path
- Liste des endpoints disponibles
- URLs d'accès (réseau local + localhost)

### 2. Route /health ✅

**Fichier** : `src/app.ts`

**Modification** : La route `/health` retourne maintenant `{ ok: true }` au format JSON simple.

**Endpoint** : `GET /health`
**Réponse** : `{ ok: true }`
**Auth** : Aucune

### 3. Route GET /api/v1/partners ✅

**Fichier** : `src/routes/partner.routes.ts` (ligne 74)

**Vérification** : La route est bien enregistrée :
- Route : `router.get('/', getPartners)`
- Montée sur : `/api/v1/partners` (via `app.use('/api/v1', router)` dans `app.ts`)
- Auth : Aucune authentification requise (endpoint public)

**Format de réponse** :
```json
{
  "data": {
    "partners": [...]
  },
  "meta": {
    "pagination": {...}
  },
  "message": "Liste des partenaires récupérée avec succès"
}
```

### 4. Logs ajoutés ✅

**Fichier** : `src/controllers/partner.controller.ts`

**Logs ajoutés dans `getPartners`** :
- Query params reçus
- Informations utilisateur (anonyme si pas d'auth)
- IP client, User-Agent, Origin
- Durée de la requête
- Nombre de partenaires retournés

**Fichier** : `src/server.ts`

**Logs au démarrage** :
- Host (0.0.0.0)
- Port (4000)
- Base URL (http://192.168.68.205:4000)
- Base Path (/api/v1)
- Liste des endpoints disponibles
- URLs d'accès (réseau local + localhost)

### 5. CORS permissif en développement ✅

**Fichier** : `src/app.ts`

**Modification** : En développement, toutes les origines sont autorisées (`origin: true`).

**Comportement** :
- **Développement** : Toutes les origines autorisées
- **Production** : Suit la configuration `CORS_ORIGIN` ou les patterns Expo

## Endpoints disponibles

### Health Check
```
GET http://192.168.68.205:4000/health
Réponse: { ok: true }
```

### Liste des partenaires (canonique)
```
GET http://192.168.68.205:4000/api/v1/partners
```

### Liste des partenaires (compatibilité)
```
GET http://192.168.68.205:4000/api/partners
GET http://192.168.68.205:4000/partners
```

## Commandes de test PowerShell

```powershell
# Test 1 : Health check
curl.exe -X GET "http://192.168.68.205:4000/health" -v

# Test 2 : Liste des partenaires (sans auth)
curl.exe -X GET "http://192.168.68.205:4000/api/v1/partners" -H "Content-Type: application/json" -v

# Test 3 : Avec pagination
curl.exe -X GET "http://192.168.68.205:4000/api/v1/partners?page=1&pageSize=10" -H "Content-Type: application/json" -v

# Test 4 : Avec filtre territoire
curl.exe -X GET "http://192.168.68.205:4000/api/v1/partners?territory=Martinique" -H "Content-Type: application/json" -v
```

## Snippet pour l'app mobile

```typescript
const BASE_URL = 'http://192.168.68.205:4000';
const API_VERSION = '/api/v1';

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
```

## Notes importantes

1. **Timeout** : L'API a un timeout de 3000ms (3 secondes) pour les requêtes de liste. Si vous avez beaucoup de partenaires, utilisez la pagination (`pageSize`).

2. **Pas de filtre par statut** : Tous les partenaires sont retournés, peu importe leur statut.

3. **CORS** : En développement, toutes les origines sont autorisées. En production, suivez la configuration `CORS_ORIGIN`.

4. **Logs** : Les logs incluent maintenant toutes les informations nécessaires pour le débogage.

