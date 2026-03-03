# Solution de Connexion Expo Go

## Problème : QR code affiche `exp://127.0.0.1:8081` au lieu de l'IP locale

### Solution : Connexion manuelle (RECOMMANDÉE) ✅

Le QR code peut parfois afficher `127.0.0.1` même en mode LAN. **Utilisez la connexion manuelle** :

1. **Ouvrez Expo Go** sur votre téléphone
2. **Appuyez sur "Enter URL manually"** ou "Entrer l'URL manuellement"
3. **Entrez exactement** : `exp://192.168.1.23:8081`
4. **Appuyez sur "Connect"** ou "Se connecter"

### Vérifications importantes

✅ **Votre téléphone et votre ordinateur doivent être sur le même réseau WiFi**

✅ **Votre IP locale est** : `192.168.1.23`

✅ **Le port est** : `8081`

### Si la connexion manuelle ne fonctionne pas

1. **Vérifiez le pare-feu Windows** :
   - Ouvrez "Pare-feu Windows Defender"
   - Cliquez sur "Paramètres avancés"
   - Autorisez Node.js et le port 8081

2. **Vérifiez que Metro Bundler est démarré** :
   - Dans le terminal, vous devriez voir "Metro Bundler ready"
   - Le serveur doit être actif sur le port 8081

3. **Testez la connexion** :
   - Sur votre téléphone, ouvrez un navigateur
   - Allez sur `http://192.168.1.23:8081`
   - Vous devriez voir une page Expo (même si elle ne charge pas l'app)

### Alternative : Utiliser l'émulateur Android/iOS

Si la connexion physique ne fonctionne pas, vous pouvez utiliser un émulateur :

```bash
# Pour Android
npm run android

# Pour iOS (sur Mac uniquement)
npm run ios
```

