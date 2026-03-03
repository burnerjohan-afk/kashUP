# 🔧 Prompt pour configurer CORS dans kashup-api

## 📋 Instructions

Copiez-collez le prompt suivant dans Cursor pour configurer CORS dans **kashup-api** :

---

## Prompt à coller dans kashup-api

```
Configure CORS dans kashup-api pour autoriser les requêtes depuis kashup-mobile (React Native / Expo).

**Objectif :**
Autoriser les requêtes depuis l'application mobile Expo en développement et en production.

**URLs à autoriser :**

1. **Développement Expo :**
   - `exp://localhost:8081` (Expo dev server)
   - `http://localhost:8081` (Expo web dev)
   - `http://localhost:19000` (Expo web alternative)
   - `http://localhost:19006` (Expo web alternative)

2. **Émulateurs/Simulateurs :**
   - `http://localhost:4000` (pour les tests locaux)
   - `http://10.0.2.2:4000` (Android Emulator)
   - `http://127.0.0.1:4000` (iOS Simulator)

3. **Appareils physiques (développement) :**
   - `http://192.168.*.*:4000` (toutes les IPs locales)
   - `https://*.ngrok.io` (pour ngrok)
   - `https://*.ngrok-free.app` (nouveau domaine ngrok)

4. **Production (à adapter selon vos domaines) :**
   - URLs de production de votre app mobile
   - Exemple : `https://app.kashup.com`

**Configuration CORS requise :**

1. **Si vous utilisez Express avec cors :**
   ```javascript
   const cors = require('cors');
   
   app.use(cors({
     origin: function (origin, callback) {
       // Autoriser les requêtes sans origin (mobile apps, Postman, etc.)
       if (!origin) return callback(null, true);
       
       const allowedOrigins = [
         // Expo dev
         /^exp:\/\/localhost:\d+$/,
         /^http:\/\/localhost:\d+$/,
         /^http:\/\/127\.0\.0\.1:\d+$/,
         /^http:\/\/10\.0\.2\.2:\d+$/,
         // ngrok
         /^https:\/\/.*\.ngrok\.io$/,
         /^https:\/\/.*\.ngrok-free\.app$/,
         // IPs locales
         /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
         // Production (remplacer par vos URLs)
         'https://app.kashup.com',
       ];
       
       const isAllowed = allowedOrigins.some(allowed => {
         if (typeof allowed === 'string') {
           return origin === allowed;
         }
         if (allowed instanceof RegExp) {
           return allowed.test(origin);
         }
         return false;
       });
       
       if (isAllowed) {
         callback(null, true);
       } else {
         callback(new Error('Not allowed by CORS'));
       }
     },
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Source', 'X-Webhook-Event'],
   }));
   ```

2. **Si vous utilisez un middleware CORS personnalisé :**
   ```javascript
   app.use((req, res, next) => {
     const origin = req.headers.origin;
     
     // Autoriser les requêtes sans origin (mobile apps)
     if (!origin) {
       return next();
     }
     
     const allowedOrigins = [
       /^exp:\/\/localhost:\d+$/,
       /^http:\/\/localhost:\d+$/,
       /^http:\/\/127\.0\.0\.1:\d+$/,
       /^http:\/\/10\.0\.2\.2:\d+$/,
       /^https:\/\/.*\.ngrok\.io$/,
       /^https:\/\/.*\.ngrok-free\.app$/,
       /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
     ];
     
     const isAllowed = allowedOrigins.some(allowed => allowed.test(origin));
     
     if (isAllowed) {
       res.header('Access-Control-Allow-Origin', origin);
       res.header('Access-Control-Allow-Credentials', 'true');
       res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
       res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Source, X-Webhook-Event');
     }
     
     if (req.method === 'OPTIONS') {
       return res.sendStatus(200);
     }
     
     next();
   });
   ```

3. **Si vous utilisez Fastify :**
   ```javascript
   const fastify = require('fastify')({
     logger: true
   });
   
   await fastify.register(require('@fastify/cors'), {
     origin: (origin, cb) => {
       if (!origin) return cb(null, true); // Autoriser les requêtes sans origin
       
       const allowed = [
         /^exp:\/\/localhost:\d+$/,
         /^http:\/\/localhost:\d+$/,
         /^http:\/\/127\.0\.0\.1:\d+$/,
         /^http:\/\/10\.0\.2\.2:\d+$/,
         /^https:\/\/.*\.ngrok\.io$/,
         /^https:\/\/.*\.ngrok-free\.app$/,
         /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
       ];
       
       const isAllowed = allowed.some(pattern => pattern.test(origin));
       cb(null, isAllowed);
     },
     credentials: true,
     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
     allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Source', 'X-Webhook-Event'],
   });
   ```

**Points importants :**

1. **Autoriser les requêtes sans origin** : Les applications mobiles React Native n'envoient pas toujours un header `Origin`, donc il faut autoriser les requêtes sans origin.

2. **Headers nécessaires** :
   - `Content-Type` : Pour les requêtes JSON
   - `Authorization` : Pour le JWT
   - `X-Webhook-Source` : Pour les webhooks (si utilisé)
   - `X-Webhook-Event` : Pour les webhooks (si utilisé)

3. **Credentials** : Activer `credentials: true` pour permettre l'envoi des cookies/tokens.

4. **Méthodes** : Autoriser GET, POST, PUT, PATCH, DELETE, OPTIONS.

5. **Variables d'environnement** : Pour la production, utilisez des variables d'environnement pour les URLs autorisées :
   ```javascript
   const allowedOrigins = [
     ...allowedOriginsDev,
     ...(process.env.ALLOWED_ORIGINS?.split(',') || []),
   ];
   ```

**Test de la configuration :**

Après configuration, testez avec :
```bash
# Depuis kashup-mobile
curl -H "Origin: exp://localhost:8081" http://localhost:4000/health

# Devrait retourner les headers CORS :
# Access-Control-Allow-Origin: exp://localhost:8081
# Access-Control-Allow-Credentials: true
```

**Fichiers à modifier :**

- `server.js` ou `app.js` (fichier principal)
- `middleware/cors.js` (si vous avez un middleware dédié)
- `.env` (pour les URLs de production)

**Vérifications :**

1. ✅ Les requêtes depuis Expo dev fonctionnent
2. ✅ Les requêtes depuis un appareil physique fonctionnent
3. ✅ Les requêtes avec ngrok fonctionnent
4. ✅ Les requêtes avec Authorization header fonctionnent
5. ✅ Les requêtes OPTIONS (preflight) fonctionnent

Une fois configuré, testez depuis kashup-mobile avec `testConnection()` pour vérifier que tout fonctionne.
```

---

## 📝 Notes supplémentaires

### Pour la production

Ajoutez dans votre `.env` de kashup-api :

```env
# URLs autorisées pour CORS (séparées par des virgules)
ALLOWED_ORIGINS=https://app.kashup.com,https://www.kashup.com
```

### Test rapide

Après configuration, testez depuis kashup-mobile :

```typescript
import { testConnection } from './src/services/api';

const connected = await testConnection();
console.log('API accessible:', connected);
```

### Dépannage

Si vous avez des erreurs CORS :

1. Vérifiez que le middleware CORS est bien configuré
2. Vérifiez que les headers sont corrects
3. Vérifiez les logs du serveur pour voir les requêtes bloquées
4. Testez avec Postman/curl pour isoler le problème

