# 🔧 Configuration de la communication avec kashup-api

## Objectif

Configurer kashup-mobile pour communiquer avec kashup-api et recevoir les webhooks.

## 📋 Configuration

### 1. Créer le fichier `.env`

Créez un fichier `.env` à la racine du projet `kashup-mobile` :

```env
# URL de l'API backend (kashup-api)
# Pour le développement local :
EXPO_PUBLIC_API_URL=http://localhost:4000

# Pour les tests avec ngrok (développement sur appareil physique) :
# EXPO_PUBLIC_API_URL=https://xxxx-xx-xx-xx-xx.ngrok.io

# Pour la production :
# EXPO_PUBLIC_API_URL=https://api.kashup.com
```

### 2. Alternative : Configuration via `app.config.js`

Si vous préférez utiliser `app.config.js` au lieu de `.env`, créez le fichier :

```javascript
// app.config.js
export default {
  expo: {
    // ... votre configuration existante
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000',
    },
  },
};
```

## 🔍 Vérification de la configuration

Le code utilise déjà la variable d'environnement dans `src/services/apiClient.ts` :

```typescript
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://localhost:4000';
```

## 🧪 Tests en développement local

### Sur émulateur/simulateur

1. Assurez-vous que kashup-api tourne sur `http://localhost:4000`
2. Configurez `.env` avec :
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:4000
   ```
3. Redémarrez l'application Expo :
   ```bash
   npm start
   ```

### Sur appareil physique

Pour tester sur un appareil physique, vous devez utiliser l'IP locale de votre machine ou ngrok :

#### Option 1 : IP locale

1. Trouvez l'IP locale de votre machine :
   - **Windows** : `ipconfig` (cherchez "IPv4 Address")
   - **Mac/Linux** : `ifconfig` ou `ip addr`

2. Configurez `.env` avec :
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.XXX:4000
   ```
   (Remplacez XXX par votre IP locale)

3. Assurez-vous que votre appareil et votre machine sont sur le même réseau WiFi

#### Option 2 : ngrok (recommandé)

1. Installez ngrok :
   ```bash
   npm install -g ngrok
   # ou
   brew install ngrok
   ```

2. Démarrez votre API kashup-api sur le port 4000

3. Exposez le port avec ngrok :
   ```bash
   ngrok http 4000
   ```

4. Copiez l'URL HTTPS fournie (ex: `https://xxxx-xx-xx-xx-xx.ngrok.io`)

5. Configurez `.env` avec :
   ```env
   EXPO_PUBLIC_API_URL=https://xxxx-xx-xx-xx-xx.ngrok.io
   ```

6. Redémarrez l'application Expo

## ✅ Vérifications

### 1. L'app démarre sans erreur

Lancez l'application et vérifiez les logs :
```bash
npm start
```

Vous devriez voir dans les logs :
```
[apiClient] Configuration API: { baseURL: 'http://localhost:4000' }
```

### 2. Les requêtes API fonctionnent

Ouvrez l'application et vérifiez que :
- Les partenaires se chargent
- Les données sont récupérées depuis l'API
- Aucune erreur réseau dans la console

### 3. Les webhooks fonctionnent

1. Vérifiez que le token Expo Push est enregistré :
   - Regardez les logs : `[WebhookNotification] Token Expo Push obtenu: ...`
   - Vérifiez dans la base de données kashup-api que le token est présent

2. Testez un webhook :
   - Créez un partenaire depuis kashup-admin
   - Vérifiez que l'app mobile reçoit une notification
   - Vérifiez que les données sont mises à jour

## 🐛 Dépannage

### Erreur : "Network request failed"

**Causes possibles :**
- L'URL de l'API est incorrecte
- L'API n'est pas démarrée
- Problème de réseau (appareil physique)

**Solutions :**
1. Vérifiez que kashup-api tourne : `curl http://localhost:4000/health` (ou endpoint de santé)
2. Vérifiez l'URL dans `.env`
3. Redémarrez l'app Expo après modification de `.env`
4. Pour appareil physique, utilisez ngrok ou l'IP locale

### Erreur : "EXPO_PUBLIC_API_URL est manquant"

**Solution :**
1. Créez le fichier `.env` à la racine du projet
2. Ajoutez `EXPO_PUBLIC_API_URL=http://localhost:4000`
3. Redémarrez l'application

### Les variables d'environnement ne sont pas prises en compte

**Solution :**
1. Les variables d'environnement dans Expo doivent commencer par `EXPO_PUBLIC_`
2. Redémarrez complètement l'app après modification de `.env`
3. Vérifiez que le fichier `.env` est bien à la racine du projet

## 📝 Notes importantes

- ⚠️ Les variables d'environnement dans Expo doivent commencer par `EXPO_PUBLIC_`
- ⚠️ Redémarrer l'app après modification de `.env`
- ⚠️ Pour les tests sur appareil physique, utilisez ngrok ou l'IP locale
- ⚠️ Le fichier `.env` ne doit pas être commité (déjà dans `.gitignore`)

## 🔗 Commandes utiles

```bash
# Démarrer l'application
cd kashup-mobile
npm start

# Vérifier la configuration
cat .env

# Tester la connexion à l'API
curl http://localhost:4000/health

# Exposer l'API avec ngrok
ngrok http 4000
```

