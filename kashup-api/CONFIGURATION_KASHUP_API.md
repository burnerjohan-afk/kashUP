# Configuration kashup-api pour accepter kashup-admin

## Vérification et configuration CORS

Pour que kashup-admin puisse communiquer avec kashup-api, vous devez vous assurer que l'URL de kashup-admin est autorisée dans la configuration CORS.

### 1. Vérifier le fichier `.env` de kashup-api

Ouvrez le fichier `.env` dans kashup-api et vérifiez la variable `CORS_ORIGIN` :

```env
CORS_ORIGIN="http://localhost:3000,http://localhost:5173,http://localhost:VOTRE_PORT_ADMIN"
```

**Remplacez `VOTRE_PORT_ADMIN`** par le port sur lequel tourne kashup-admin (ex: `3001`, `5174`, etc.)

### 2. Exemple de configuration complète

Si kashup-admin tourne sur le port `3001`, votre `.env` devrait contenir :

```env
NODE_ENV=development
PORT=4000
DATABASE_URL="file:./dev.db"
JWT_SECRET="dev_access_secret_change_me"
REFRESH_TOKEN_SECRET="dev_refresh_secret_change_me"
CORS_ORIGIN="http://localhost:3000,http://localhost:5173,http://localhost:3001"
# ... autres variables
```

### 3. Pour autoriser toutes les origines (développement uniquement)

⚠️ **Attention :** Utilisez cette option uniquement en développement local !

```env
CORS_ORIGIN="*"
```

### 4. Redémarrer l'API

Après modification du `.env`, redémarrez kashup-api :

```bash
# Arrêter l'API (Ctrl+C)
# Puis redémarrer
npm run dev
```

### 5. Vérifier que ça fonctionne

Testez depuis kashup-admin ou avec curl :

```bash
curl -H "Origin: http://localhost:3001" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type,Authorization" \
     -X OPTIONS \
     http://localhost:4000/health
```

Si vous voyez les headers CORS dans la réponse, c'est bon !

## Résumé

1. ✅ Ajouter l'URL de kashup-admin dans `CORS_ORIGIN` du `.env` de kashup-api
2. ✅ Redémarrer kashup-api
3. ✅ Tester la connexion depuis kashup-admin

Une fois cette configuration faite, kashup-admin pourra faire des requêtes vers kashup-api sans erreur CORS.

