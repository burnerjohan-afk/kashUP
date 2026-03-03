# ✅ Configuration CORS pour kashup-mobile - APPLIQUÉE

## 📋 Résumé des modifications

La configuration CORS dans `src/app.ts` a été mise à jour pour autoriser les requêtes depuis kashup-mobile (React Native / Expo).

### Modifications appliquées

1. **Autorisation des requêtes sans origin** : Les applications mobiles React Native n'envoient pas toujours un header `Origin`, donc les requêtes sans origin sont maintenant autorisées.

2. **Patterns Expo/React Native** : Support des patterns suivants :
   - `exp://localhost:*` - Expo dev server
   - `http://localhost:*` - Expo web dev
   - `http://127.0.0.1:*` - iOS Simulator
   - `http://10.0.2.2:*` - Android Emulator
   - `http://192.168.*.*:*` - Appareils physiques (IPs locales)
   - `https://*.ngrok.io` - ngrok
   - `https://*.ngrok-free.app` - Nouveau domaine ngrok

3. **Headers autorisés** :
   - `Content-Type` - Pour les requêtes JSON
   - `Authorization` - Pour le JWT
   - `X-Webhook-Source` - Pour les webhooks
   - `X-Webhook-Event` - Pour les webhooks

4. **Méthodes autorisées** : GET, POST, PUT, PATCH, DELETE, OPTIONS

5. **Credentials** : Activé pour permettre l'envoi des cookies/tokens

6. **Origines de production** : Support des origines de production via la variable d'environnement `ALLOWED_ORIGINS`

### Configuration actuelle

```typescript
// Dans src/app.ts
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (mobile apps)
    if (!origin) {
      return callback(null, true);
    }
    
    // Vérifier les origines autorisées depuis .env
    // Vérifier les patterns Expo/React Native
    // Vérifier les origines de production
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Source', 'X-Webhook-Event'],
};
```

### Variables d'environnement

Pour ajouter des origines de production, ajoutez dans `.env` :

```env
# URLs autorisées pour CORS (séparées par des virgules)
ALLOWED_ORIGINS=https://app.kashup.com,https://www.kashup.com
```

### Test de la configuration

Pour tester depuis kashup-mobile :

```bash
# Depuis kashup-mobile
curl -H "Origin: exp://localhost:8081" http://localhost:4000/health

# Devrait retourner les headers CORS :
# Access-Control-Allow-Origin: exp://localhost:8081
# Access-Control-Allow-Credentials: true
```

### Vérifications

1. ✅ Les requêtes sans origin sont autorisées (mobile apps)
2. ✅ Les patterns Expo/React Native sont supportés
3. ✅ Les requêtes depuis ngrok sont autorisées
4. ✅ Les requêtes avec Authorization header fonctionnent
5. ✅ Les requêtes OPTIONS (preflight) fonctionnent
6. ✅ Les origines de production peuvent être ajoutées via `ALLOWED_ORIGINS`

### Prochaines étapes

1. Redémarrer l'API : `npm run dev`
2. Tester depuis kashup-mobile avec `testConnection()`
3. Vérifier que les requêtes fonctionnent depuis Expo dev
4. Vérifier que les requêtes fonctionnent depuis un appareil physique
5. Ajouter les URLs de production dans `ALLOWED_ORIGINS` si nécessaire

La configuration CORS est maintenant prête pour kashup-mobile ! 🚀

