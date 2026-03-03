# 📡 Guide de configuration API - Kashup Mobile

## 🎯 Objectif

Configurer l'URL de l'API backend pour que l'application mobile puisse s'y connecter, notamment en développement.

## ⚙️ Configuration automatique

Le système détecte automatiquement l'IP LAN de votre PC en développement mobile et remplace `localhost` par cette IP.

### Comportement automatique

1. **En développement mobile (iOS/Android)** :
   - Détection automatique de l'IP LAN via Expo Constants
   - Remplacement de `localhost` ou `127.0.0.1` par l'IP détectée
   - Ajout automatique de `/api/v1` (une seule fois)

2. **Sur web** :
   - Utilisation de `localhost` normalement

3. **En production** :
   - Utilisation de l'URL définie dans `EXPO_PUBLIC_API_URL`

## 📝 Configuration manuelle (recommandée)

### Étape 1 : Récupérer l'IP de votre PC

**Sur Windows :**
```bash
ipconfig
```
Cherchez l'adresse IPv4 de votre carte réseau (ex: `192.168.1.23`)

**Sur macOS/Linux :**
```bash
ifconfig
# ou
ip addr
```

### Étape 2 : Créer/modifier le fichier `.env`

À la racine du projet, créez un fichier `.env` :

```env
EXPO_PUBLIC_API_URL=http://192.168.1.23:4000
```

**⚠️ Important :**
- Ne pas inclure `/api/v1` dans l'URL (ajouté automatiquement)
- Utiliser l'IP de votre PC, pas `localhost`
- Le port doit correspondre à celui de votre serveur API (par défaut: 4000)

### Étape 3 : Redémarrer Expo

```bash
npx expo start --clear
```

Le flag `--clear` vide le cache pour prendre en compte les nouvelles variables d'environnement.

## 🔍 Vérification

Au démarrage de l'app, vous devriez voir dans les logs :

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[API Config] 📡 Configuration API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[API Config] EXPO_PUBLIC_API_URL = http://192.168.1.23:4000
[API Config] baseURL final = http://192.168.1.23:4000/api/v1
[API Config] Platform = ios
[API Config] Expo hostUri = 192.168.1.23:8081
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🧪 Tests

### Sur iPhone (Expo Go)

1. **Mode LAN** (recommandé) :
```bash
npx expo start --lan
```
Scannez le QR code avec Expo Go. L'app utilisera automatiquement l'IP LAN.

2. **Mode Tunnel** (si LAN ne fonctionne pas) :
```bash
npx expo start --tunnel
```
Plus lent mais fonctionne même hors du même réseau WiFi.

### Sur Android

Même procédure que pour iPhone.

### Sur émulateur/simulateur

- **iOS Simulator** : `localhost` fonctionne
- **Android Emulator** : Utiliser `10.0.2.2` au lieu de `localhost`

## 🐛 Dépannage

### Erreur "timeout of 30000ms exceeded"

**Causes possibles :**
1. L'URL de l'API est incorrecte (vérifiez les logs au démarrage)
2. Le serveur API n'est pas démarré
3. Le firewall bloque la connexion
4. Vous êtes sur un réseau différent

**Solutions :**
1. Vérifiez que votre serveur API tourne sur le port 4000
2. Vérifiez l'IP dans les logs au démarrage
3. Testez la connexion avec curl :
```bash
curl http://192.168.1.23:4000/api/v1/health
```
4. Vérifiez que le PC et le téléphone sont sur le même réseau WiFi

### L'app utilise toujours localhost

**Solution :**
1. Vérifiez que `EXPO_PUBLIC_API_URL` est bien défini dans `.env`
2. Redémarrez Expo avec `--clear` :
```bash
npx expo start --clear
```
3. Vérifiez les logs au démarrage pour voir l'URL réellement utilisée

### Doublon /api/v1 dans l'URL

**Cause :** L'URL dans `.env` contient déjà `/api/v1`

**Solution :** Retirez `/api/v1` de `EXPO_PUBLIC_API_URL`. Le système l'ajoute automatiquement.

## 📋 Exemples de configuration

### Développement local (PC + iPhone sur même WiFi)
```env
EXPO_PUBLIC_API_URL=http://192.168.1.23:4000
```

### Production
```env
EXPO_PUBLIC_API_URL=https://api.kashup.com
```

### Staging
```env
EXPO_PUBLIC_API_URL=https://staging-api.kashup.com
```

## 🔐 Sécurité

- Ne commitez **jamais** le fichier `.env` (déjà dans `.gitignore`)
- Utilisez des variables d'environnement différentes pour dev/staging/prod
- En production, configurez les variables via votre plateforme de déploiement

## 📚 Références

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [React Native Networking](https://reactnative.dev/docs/network)

