# 📝 Configuration du fichier .env

## ✅ Fichier .env créé

Le fichier `.env` a été recréé proprement à la racine du projet `kashup-mobile`.

## 📋 Contenu actuel

```env
# URL de l'API backend kashup-api
# En développement local (émulateur/simulateur)
EXPO_PUBLIC_API_URL=http://localhost:4000

# Pour les appareils physiques, décommentez et utilisez votre IP locale :
# EXPO_PUBLIC_API_URL=http://192.168.1.23:4000
```

## 🔧 Configuration selon votre contexte

### Pour émulateur/simulateur (iOS Simulator, Android Emulator)

Le fichier est déjà configuré correctement :
```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

✅ **Aucune modification nécessaire**

### Pour appareil physique (téléphone/tablette)

Vous devez modifier le fichier `.env` pour utiliser votre IP locale :

1. **Trouvez votre IP locale :**
   ```powershell
   # Dans PowerShell
   ipconfig
   ```
   Cherchez "IPv4 Address" (ex: `192.168.1.23`)

2. **Modifiez le fichier `.env` :**
   ```env
   # URL de l'API backend kashup-api
   # Pour appareil physique, utilisez votre IP locale
   EXPO_PUBLIC_API_URL=http://192.168.1.23:4000
   
   # Pour émulateur/simulateur, utilisez localhost
   # EXPO_PUBLIC_API_URL=http://localhost:4000
   ```

3. **Important :**
   - Remplacez `192.168.1.23` par votre IP locale réelle
   - Votre téléphone et votre ordinateur doivent être sur le même réseau WiFi
   - kashup-api doit être démarré sur `http://localhost:4000`

## 🔄 Redémarrer Expo après modification

Après avoir modifié le `.env`, **redémarrez complètement Expo** :

```bash
# Arrêter Expo (Ctrl+C dans le terminal)
# Puis redémarrer
npm run start:lan
```

## ✅ Vérification

Pour vérifier que la variable est bien chargée, vous pouvez ajouter temporairement dans votre code :

```typescript
console.log('API URL configurée:', process.env.EXPO_PUBLIC_API_URL);
```

Vous devriez voir dans la console :
```
API URL configurée: http://localhost:4000
```

## 🎯 Résumé

- **Émulateur/Simulateur** : `EXPO_PUBLIC_API_URL=http://localhost:4000` ✅ (déjà configuré)
- **Appareil physique** : `EXPO_PUBLIC_API_URL=http://VOTRE_IP:4000` (à modifier)

## ⚠️ Points importants

1. Le préfixe `EXPO_PUBLIC_` est **obligatoire** pour que la variable soit accessible dans React Native
2. Pas d'espaces autour du `=`
3. Pas de guillemets autour des valeurs
4. Encodage UTF-8 (déjà configuré)
5. Redémarrer Expo après chaque modification

Le fichier `.env` est maintenant propre et sans corruption ! 🎉

