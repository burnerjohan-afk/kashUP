# Configuration pour l'accès réseau local

## Fichiers modifiés

1. **src/server.ts** - Écoute sur 0.0.0.0, gestion EADDRINUSE, logs améliorés
2. **src/app.ts** - Routes /health et /api/v1/health, CORS amélioré pour Expo Go
3. **src/controllers/partner.controller.ts** - Logs détaillés (déjà fait)

## Commandes

### Lancer l'API en mode dev

```powershell
npm run dev
```

### Tester depuis un autre appareil (PowerShell)

```powershell
# Test 1 : Health check
curl.exe -X GET "http://192.168.68.205:4000/health" -v

# Test 2 : Health check versionné
curl.exe -X GET "http://192.168.68.205:4000/api/v1/health" -v

# Test 3 : Liste des partenaires (sans auth)
curl.exe -X GET "http://192.168.68.205:4000/api/v1/partners" -H "Content-Type: application/json" -v

# Test 4 : Liste avec pagination
curl.exe -X GET "http://192.168.68.205:4000/api/v1/partners?page=1&pageSize=10" -H "Content-Type: application/json" -v

# Test 5 : Test d'un logo (si vous avez un partenaire avec logoUrl)
curl.exe -X GET "http://192.168.68.205:4000/uploads/partners/[PARTNER_ID]/[FILENAME]" -v
```

## Endpoints disponibles

### Health Check
- **GET** `http://192.168.68.205:4000/health`
- **GET** `http://192.168.68.205:4000/api/v1/health`
- **Réponse** : `{ ok: true, timestamp: "...", service: "kashup-api" }`

### Liste des partenaires
- **GET** `http://192.168.68.205:4000/api/v1/partners`
- **Auth** : Aucune (endpoint public)
- **Réponse** : `{ data: { partners: [...] }, meta: { pagination: {...} }, message: "..." }`

### Fichiers statiques (logos)
- **GET** `http://192.168.68.205:4000/uploads/partners/[PARTNER_ID]/[FILENAME]`
- **CORS** : Autorisé pour toutes les origines

## Configuration CORS

En développement :
- ✅ Toutes les origines autorisées (`origin: true`)
- ✅ Expo Go sur téléphone autorisé (pattern `exp://.*`)
- ✅ Headers : `Content-Type`, `Authorization`
- ✅ Méthodes : `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

## Gestion d'erreur EADDRINUSE

Si le port est déjà utilisé, le serveur affichera :
- Un message d'erreur clair
- Le port utilisé
- Des suggestions pour résoudre le problème
- Commande pour vérifier les processus : `netstat -ano | findstr :4000`

## Logs au démarrage

Le serveur affiche maintenant :
- Host (0.0.0.0)
- Port (4000 ou depuis env.PORT)
- URL LAN (http://192.168.68.205:4000)
- Liste des endpoints disponibles
- URLs d'accès (réseau local + localhost)

## Logs sur GET /api/v1/partners

Les logs incluent :
- Query params reçus
- IP client, User-Agent, Origin
- Durée de la requête
- Nombre de partenaires retournés
- Temps de traitement

