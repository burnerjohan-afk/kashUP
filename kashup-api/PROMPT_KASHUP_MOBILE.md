# 🔧 Prompt pour KASHUP-MOBILE

## Configuration de la communication avec kashup-api

### Objectif
Configurer kashup-mobile pour communiquer avec kashup-api et recevoir les webhooks.

### Fichier à modifier : `.env` ou `app.config.js`

**Pour React Native / Expo :**

```env
# URL de l'API backend
EXPO_PUBLIC_API_URL=http://localhost:4000

# Pour les tests en développement avec ngrok :
# EXPO_PUBLIC_API_URL=https://xxxx-xx-xx-xx-xx.ngrok.io
```

### Fichier à vérifier : Code qui fait les requêtes API

Assurez-vous que le code utilise la variable d'environnement :

```typescript
// Exemple dans src/config/api.ts ou similaire
import Constants from 'expo-constants';

const API_BASE_URL = 
  process.env.EXPO_PUBLIC_API_URL || 
  Constants.expoConfig?.extra?.apiUrl || 
  'http://localhost:4000';

// Dans vos requêtes
fetch(`${API_BASE_URL}/partners`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
```

### Configuration des Webhooks (optionnel)

Si vous voulez recevoir les notifications push :

```typescript
// Enregistrer le token de l'appareil
async function registerDeviceToken(token: string) {
  await fetch(`${API_BASE_URL}/devices/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`
    },
    body: JSON.stringify({ token })
  });
}
```

### Pour les tests en développement local

Si vous testez sur un appareil physique ou un émulateur, vous devrez utiliser ngrok :

```bash
# Installer ngrok
npm install -g ngrok

# Exposer le port de l'API (4000)
ngrok http 4000

# Copier l'URL HTTPS (ex: https://xxxx-xx-xx-xx-xx.ngrok.io)
# L'utiliser dans EXPO_PUBLIC_API_URL
```

### Vérifications
1. L'app démarre sans erreur
2. Les requêtes API fonctionnent
3. Les données sont bien récupérées

### Commandes
```bash
cd kashup-mobile
# Modifier .env avec EXPO_PUBLIC_API_URL=http://localhost:4000
npm start
```

### Important
- Les variables d'environnement dans Expo doivent commencer par `EXPO_PUBLIC_`
- Pour les tests sur appareil physique, utilisez ngrok ou l'IP locale de votre machine
- Redémarrer l'app après modification de `.env`

