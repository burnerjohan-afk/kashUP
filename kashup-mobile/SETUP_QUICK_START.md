# 🚀 Démarrage rapide - Configuration API

## Étapes rapides

### 1. Créer le fichier `.env`

À la racine du projet `kashup-mobile`, créez un fichier `.env` :

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

### 2. Démarrer l'application

```bash
npm start
```

### 3. Vérifier la configuration

Dans les logs, vous devriez voir :
```
[apiClient] Configuration API: { baseURL: 'http://localhost:4000' }
```

## 📱 Pour tester sur appareil physique

### Option 1 : ngrok (recommandé)

```bash
# Dans un terminal, démarrez ngrok
ngrok http 4000

# Copiez l'URL HTTPS (ex: https://xxxx-xx-xx-xx-xx.ngrok.io)
# Mettez à jour .env :
EXPO_PUBLIC_API_URL=https://xxxx-xx-xx-xx-xx.ngrok.io

# Redémarrez l'app
npm start
```

### Option 2 : IP locale

```bash
# Trouvez votre IP locale
# Windows: ipconfig
# Mac/Linux: ifconfig

# Mettez à jour .env avec votre IP :
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:4000

# Redémarrez l'app
npm start
```

## ✅ Vérifications

- ✅ L'app démarre sans erreur
- ✅ Les logs montrent la bonne URL API
- ✅ Les données se chargent depuis l'API
- ✅ Les webhooks fonctionnent (notifications push)

## 📚 Documentation complète

Voir `CONFIGURATION_API.md` pour plus de détails.

