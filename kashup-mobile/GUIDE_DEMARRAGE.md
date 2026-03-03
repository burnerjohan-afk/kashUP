# 🚀 Guide de démarrage - kashup-mobile

## 📱 Commandes pour démarrer l'application

### Pour appareil physique (recommandé)

```bash
npm run start:lan
```

Cette commande démarre Expo en mode LAN, ce qui permet à votre téléphone de se connecter via le réseau WiFi local. Le QR code affichera une URL avec votre IP locale (ex: `exp://192.168.1.100:8081`).

### Autres options disponibles

```bash
# Mode par défaut (localhost - pour émulateurs/simulateurs)
npm start

# Mode tunnel (nécessite un compte Expo - fonctionne même hors du même réseau)
npm run start:tunnel

# Nettoyer le cache et démarrer
npm run start:clear

# Démarrer directement sur Android
npm run android

# Démarrer directement sur iOS (Mac uniquement)
npm run ios

# Démarrer sur le web
npm run web
```

## 🔧 Résolution des problèmes de connexion

### Problème : "Could not connect exp://127.0.0.1:8081"

**Solution :** Utilisez le mode LAN :
```bash
npm run start:lan
```

### Problème : Le QR code ne fonctionne toujours pas

**Solutions :**

1. **Vérifier le réseau WiFi**
   - Votre téléphone et votre ordinateur doivent être sur le même réseau WiFi
   - Désactivez temporairement votre VPN si vous en avez un

2. **Utiliser le mode tunnel**
   ```bash
   npm run start:tunnel
   ```
   - Nécessite un compte Expo (gratuit)
   - Fonctionne même si vous n'êtes pas sur le même réseau

3. **Entrer l'URL manuellement dans Expo Go**
   - Dans Expo Go, appuyez sur "Enter URL manually"
   - Entrez l'URL affichée dans le terminal (ex: `exp://192.168.1.100:8081`)

4. **Vérifier le firewall Windows**
   - Autorisez Node.js et le port 8081 dans le firewall Windows

### Problème : "Unknown command expo"

Si vous voyez cette erreur, utilisez toujours `npm run` au lieu de `expo` directement :
- ✅ `npm run start:lan`
- ❌ `expo start --lan`

## 📋 Checklist de démarrage

1. ✅ kashup-api est démarré sur `http://localhost:4000`
2. ✅ Le fichier `.env` contient `EXPO_PUBLIC_API_URL=http://localhost:4000`
3. ✅ CORS est configuré dans kashup-api (voir `CORS_CONFIGURATION_PROMPT.md`)
4. ✅ Expo Go est installé sur votre téléphone
5. ✅ Téléphone et ordinateur sont sur le même réseau WiFi
6. ✅ Lancez `npm run start:lan` dans kashup-mobile
7. ✅ Scannez le QR code avec Expo Go

## 🎯 Ordre de démarrage recommandé

1. **Démarrer kashup-api** (dans un terminal séparé)
   ```bash
   cd ../kashup-api
   npm start
   ```

2. **Démarrer kashup-mobile** (dans un autre terminal)
   ```bash
   cd kashup-mobile
   npm run start:lan
   ```

3. **Scanner le QR code** avec Expo Go sur votre téléphone

## 💡 Astuces

- **Appuyez sur `s`** dans le terminal Expo pour voir le menu et le QR code
- **Appuyez sur `r`** pour recharger l'application
- **Appuyez sur `m`** pour afficher le menu de développement

## 🔍 Vérification

Une fois connecté, vous devriez voir :
- L'application s'ouvre dans Expo Go
- Les données se chargent depuis l'API
- Pas d'erreurs de timeout dans la console

Si vous voyez encore des erreurs de timeout, vérifiez que CORS est bien configuré dans kashup-api.

