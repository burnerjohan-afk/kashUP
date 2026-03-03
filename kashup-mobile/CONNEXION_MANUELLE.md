# 🔧 Solution : Connexion Manuelle à Expo

## ❌ Problème : QR code affiche `exp://127.0.0.1:8081`

Même avec `--lan`, Expo affiche parfois `127.0.0.1` dans le QR code. **Utilisez la connexion manuelle** :

## ✅ Solution : Connexion Manuelle

### Étape 1 : Ouvrir Expo Go

Sur votre téléphone, ouvrez l'application **Expo Go**.

### Étape 2 : Entrer l'URL manuellement

1. **Appuyez sur "Enter URL manually"** ou **"Entrer l'URL manuellement"**
   - Sur iOS : En bas de l'écran
   - Sur Android : Dans le menu ou en bas de l'écran

2. **Entrez exactement cette URL** :
   ```
   exp://192.168.1.23:8081
   ```

3. **Appuyez sur "Connect"** ou **"Se connecter"**

### Étape 3 : Vérifier la connexion

L'application devrait se charger. Si vous voyez encore une erreur :

1. **Vérifiez que votre téléphone et votre ordinateur sont sur le même réseau WiFi**
2. **Vérifiez que Expo est bien démarré** (vous devriez voir "Metro Bundler ready" dans le terminal)
3. **Vérifiez le pare-feu Windows** (autorisez Node.js et le port 8081)

## 📋 URL à utiliser

**Votre IP locale** : `192.168.1.23`

**URL complète** : `exp://192.168.1.23:8081`

## 🔄 Alternative : Créer un raccourci

Vous pouvez créer un raccourci dans Expo Go :

1. Connectez-vous une fois avec l'URL manuelle
2. Expo Go devrait mémoriser l'URL
3. La prochaine fois, vous pourrez la sélectionner dans l'historique

## ⚠️ Important

- **Ne scannez PAS le QR code** s'il affiche `127.0.0.1`
- **Utilisez TOUJOURS la connexion manuelle** avec `exp://192.168.1.23:8081`
- **Assurez-vous que votre téléphone et votre ordinateur sont sur le même réseau WiFi**

## 🆘 Si ça ne fonctionne toujours pas

1. **Vérifiez que Metro Bundler est démarré** :
   - Dans le terminal, vous devriez voir "Metro Bundler ready"
   - Le serveur doit être actif sur le port 8081

2. **Testez la connexion réseau** :
   - Sur votre téléphone, ouvrez un navigateur
   - Allez sur : `http://192.168.1.23:8081`
   - Vous devriez voir une page Expo (même si elle ne charge pas l'app)

3. **Vérifiez le pare-feu Windows** :
   - Ouvrez "Pare-feu Windows Defender"
   - Cliquez sur "Paramètres avancés"
   - Autorisez Node.js et le port 8081

4. **Redémarrez Expo** :
   ```bash
   # Arrêter Expo
   Ctrl+C
   
   # Redémarrer
   npm run start:lan
   ```

## ✅ Résumé

**URL à utiliser** : `exp://192.168.1.23:8081`

**Méthode** : Connexion manuelle dans Expo Go (ne pas scanner le QR code)

**Vérifications** :
- ✅ Même réseau WiFi
- ✅ Expo démarré (`npm run start:lan`)
- ✅ Pare-feu Windows autorise Node.js et le port 8081
