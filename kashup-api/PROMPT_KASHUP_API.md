# 🔧 Prompt pour KASHUP-API

## Configuration de la communication avec kashup-admin et kashup-mobile

### Objectif
Configurer kashup-api pour accepter les requêtes depuis kashup-admin et envoyer des webhooks à kashup-mobile.

### 📁 Fichier à modifier : `.env`

```env
# Port de l'API
PORT=4000

# Base de données
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="votre-secret-jwt-super-securise"
JWT_EXPIRES_IN="7d"

# CORS - Autoriser les requêtes depuis admin et mobile
# En développement, utilisez "*" pour autoriser toutes les origines
# En production, listez les URLs exactes séparées par des virgules
CORS_ORIGIN="*"
# OU en production :
# CORS_ORIGIN="http://localhost:5173,https://admin.kashup.com,https://app.kashup.com"

# Webhooks - URL de l'application mobile pour recevoir les notifications
# En développement local, utilisez une URL de test (ngrok, etc.)
# En production, utilisez l'URL de votre serveur de notifications push
MOBILE_WEBHOOK_URL=""
# Exemple avec ngrok en développement :
# MOBILE_WEBHOOK_URL="https://xxxx-xx-xx-xx-xx.ngrok.io/webhook"
# Exemple en production :
# MOBILE_WEBHOOK_URL="https://api.kashup.com/webhook"

# Environnement
NODE_ENV="development"
```

### ✅ Vérifications

1. **L'API démarre sans erreur** :
   ```bash
   npm run dev
   # Vous devriez voir : 🚀 KashUP API prête sur http://localhost:4000
   ```

2. **Le endpoint `/health` fonctionne** :
   ```bash
   curl http://localhost:4000/health
   # Réponse attendue : {"data":{"status":"ok",...},"error":null,"meta":null}
   ```

3. **Pas d'erreur CORS dans les logs** quand vous faites des requêtes depuis kashup-admin

### 📝 Points importants

- **`CORS_ORIGIN="*"`** : Autorise toutes les origines en développement (pratique mais moins sécurisé)
- **`CORS_ORIGIN="http://localhost:5173,https://admin.kashup.com"`** : En production, listez les URLs exactes
- **`MOBILE_WEBHOOK_URL`** : Laissez vide si vous n'utilisez pas les webhooks, ou utilisez ngrok en développement

### 🔄 Commandes

```bash
cd kashup-api
# Modifier .env avec les valeurs ci-dessus
npm run dev
```

### 🐛 Si vous avez des erreurs CORS

1. Vérifiez que `CORS_ORIGIN="*"` est bien dans le `.env`
2. Redémarrez l'API après modification
3. Vérifiez les logs pour voir les erreurs CORS exactes

---

**Ce prompt est prêt à être utilisé dans kashup-api pour configurer la communication avec les autres projets.**
