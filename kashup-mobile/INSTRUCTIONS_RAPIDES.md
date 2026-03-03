# 🚀 Instructions Rapides - Démarrage kashup-mobile

## ✅ Configuration terminée

1. **Fichier `.env` créé** avec l'encodage UTF-8 correct
2. **Scripts npm configurés** pour démarrer Expo en mode LAN
3. **Packages Expo mis à jour** vers les dernières versions

---

## 📱 Pour démarrer l'application

### Option 1 : Appareil physique (téléphone/tablette)

1. **Démarrez Expo en mode LAN** :
   ```bash
   npm run start:lan
   ```

2. **Attendez 10-15 secondes** que le QR code apparaisse

3. **Connectez votre appareil** :
   - **Méthode A** : Scannez le QR code avec Expo Go
   - **Méthode B** : Connexion manuelle dans Expo Go :
     - Ouvrez Expo Go
     - Appuyez sur "Enter URL manually"
     - Entrez : `exp://192.168.1.23:8081`
     - Appuyez sur "Connect"

### Option 2 : Émulateur/Simulateur

1. **Démarrez Expo** :
   ```bash
   npm start
   ```

2. **Ouvrez l'émulateur** :
   - Android : `npm run android`
   - iOS : `npm run ios` (Mac uniquement)

---

## ⚙️ Configuration du fichier .env

### Pour émulateur/simulateur :
```
EXPO_PUBLIC_API_URL=http://localhost:4000
```

### Pour appareil physique :
Modifiez le fichier `.env` et décommentez la ligne :
```
# EXPO_PUBLIC_API_URL=http://192.168.1.23:4000
```
Devient :
```
EXPO_PUBLIC_API_URL=http://192.168.1.23:4000
```
Et commentez la ligne `localhost:4000`.

**Important** : Après modification du `.env`, redémarrez Expo !

---

## 🔧 Scripts disponibles

- `npm start` - Démarre Expo en mode offline (localhost)
- `npm run start:lan` - Démarre Expo en mode LAN (IP locale pour appareil physique) ⭐
- `npm run start:offline` - Démarre Expo en mode offline
- `npm run start:tunnel` - Démarre Expo en mode tunnel (nécessite ngrok)
- `npm run start:clear` - Nettoie le cache et démarre Expo

---

## ❌ Si ça ne fonctionne pas

### Erreur "Could not connect to the server"

1. **Vérifiez que votre téléphone et votre ordinateur sont sur le même réseau WiFi**

2. **Utilisez la connexion manuelle** :
   - Dans Expo Go : "Enter URL manually"
   - Entrez : `exp://192.168.1.23:8081`

3. **Vérifiez le pare-feu Windows** :
   - Autorisez Node.js dans le pare-feu
   - Autorisez le port 8081

4. **Vérifiez que kashup-api est démarré** :
   - L'API doit être accessible sur `http://localhost:4000`
   - Testez avec : `curl http://localhost:4000/health`

### Le QR code affiche toujours `127.0.0.1`

- Utilisez la **connexion manuelle** avec `exp://192.168.1.23:8081`
- Ou redémarrez Expo avec `npm run start:lan`

---

## 📋 Checklist rapide

- [ ] Fichier `.env` créé et configuré
- [ ] kashup-api démarré sur `http://localhost:4000`
- [ ] Expo démarré avec `npm run start:lan` (pour appareil physique)
- [ ] Téléphone et ordinateur sur le même réseau WiFi
- [ ] Expo Go installé sur le téléphone
- [ ] Connexion établie (QR code ou manuelle)

---

## 🆘 Besoin d'aide ?

Consultez `GUIDE_DEMARRAGE_COMPLET.md` pour plus de détails.

