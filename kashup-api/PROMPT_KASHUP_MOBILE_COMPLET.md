# 🔧 PROMPT COMPLET POUR KASHUP-MOBILE

## ❌ Problèmes identifiés
1. Le fichier `.env` est corrompu (caractères NUL). Il faut le recréer proprement.
2. L'application mobile ne peut pas se connecter au serveur Expo (`exp://127.0.0.1:8081`).

## ✅ Solution complète

### ⚠️ Important : Différence entre serveur Expo et API backend
- **Serveur Expo** (`exp://127.0.0.1:8081` ou `exp://192.168.1.23:8081`) : Serveur de développement Expo/Metro bundler qui sert votre application React Native
- **API backend** (`http://localhost:4000` ou `http://192.168.1.23:4000`) : Votre API kashup-api

L'erreur "Could not connect to the server" sur `exp://127.0.0.1:8081` signifie que le **serveur Expo n'est pas accessible**, pas l'API backend.

---

## 📁 ÉTAPE 1 : Recréer le fichier `.env`

### 1.1. Localiser le fichier `.env`
Dans le projet `kashup-mobile`, le fichier `.env` doit être à la racine du projet, au même niveau que `package.json`.

### 1.2. Supprimer l'ancien fichier
- Supprimez ou renommez l'ancien fichier `.env` (ex: `.env.old`)

### 1.3. Créer un nouveau fichier `.env`
Créez un nouveau fichier nommé exactement `.env` (sans extension) à la racine de `kashup-mobile`.

### 1.4. Contenu du fichier `.env`

**Pour émulateur/simulateur (développement local) :**
```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

**Pour appareil physique (téléphone/tablette sur le même réseau Wi-Fi) :**
```env
EXPO_PUBLIC_API_URL=http://192.168.1.23:4000
```

**Version avec les deux options (décommentez celle que vous utilisez) :**
```env
# URL de l'API backend kashup-api
# Pour émulateur/simulateur
EXPO_PUBLIC_API_URL=http://localhost:4000

# Pour appareil physique (décommentez cette ligne et commentez celle du dessus)
# EXPO_PUBLIC_API_URL=http://192.168.1.23:4000
```

### 1.5. Points importants

#### Variable d'environnement Expo
- Utilisez le préfixe `EXPO_PUBLIC_` pour que la variable soit accessible côté client React Native
- Sans ce préfixe, la variable ne sera pas accessible dans votre code

#### Port de l'API
- Le port `4000` correspond au port sur lequel `kashup-api` tourne
- Vérifiez que `kashup-api` est bien démarré sur `http://localhost:4000`

#### localhost vs IP locale
- `localhost:4000` fonctionne pour :
  - iOS Simulator
  - Android Emulator
  - Expo Go sur le même ordinateur
- `192.168.1.23:4000` fonctionne pour :
  - Appareils physiques (téléphone/tablette) sur le même réseau Wi-Fi
  - Votre IP locale détectée : **192.168.1.23**

---

## 📁 ÉTAPE 2 : Démarrer le serveur Expo

**IMPORTANT :** Avant de lancer l'application mobile, vous devez démarrer le serveur Expo :

1. Ouvrez un terminal dans le dossier `kashup-mobile`
2. Démarrez le serveur Expo :
   ```bash
   cd kashup-mobile
   npm start
   # ou
   npx expo start
   ```

3. Si vous utilisez un **appareil physique**, utilisez l'option "LAN" :
   ```bash
   npx expo start --lan
   ```
   Cela utilisera votre IP locale (`192.168.1.23`) au lieu de `127.0.0.1`.

4. Le serveur Expo affichera un QR code et une URL. Utilisez cette URL pour connecter votre appareil.

---

## 📁 ÉTAPE 3 : Vérifications

### 3.1. Vérifier l'encodage du fichier `.env`
- UTF-8 sans BOM
- Pas d'espaces en fin de ligne
- Pas de guillemets autour des valeurs

### 3.2. Vérifier que le serveur Expo est démarré
- Vous devriez voir un QR code dans le terminal
- L'URL devrait être accessible (ex: `exp://192.168.1.23:8081` pour appareil physique)

### 3.3. Vérifier que la variable est chargée
Dans votre code React Native, vous pouvez tester avec :
```typescript
console.log('API URL:', process.env.EXPO_PUBLIC_API_URL);
```

---

## 📁 ÉTAPE 4 : Utilisation dans le code

Dans vos fichiers React Native/TypeScript, utilisez :

```typescript
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

// Exemple d'utilisation
const response = await fetch(`${API_BASE_URL}/health`);
```

---

## 📁 ÉTAPE 5 : Résolution de l'erreur "Could not connect to the server"

Si vous voyez l'erreur "Could not connect to the server" avec `exp://127.0.0.1:8081` :

1. **Vérifiez que le serveur Expo est démarré** :
   ```bash
   cd kashup-mobile
   npx expo start --lan
   ```

2. **Pour un appareil physique, utilisez l'IP locale au lieu de 127.0.0.1** :
   - Le serveur Expo doit être accessible via votre IP locale (`192.168.1.23`)
   - Utilisez : `npx expo start --lan` pour forcer l'utilisation de l'IP locale
   - L'URL devrait être `exp://192.168.1.23:8081` au lieu de `exp://127.0.0.1:8081`

3. **Vérifiez que votre appareil et votre ordinateur sont sur le même réseau Wi-Fi**

4. **Vérifiez le pare-feu Windows** :
   - Autorisez Node.js et Expo dans le pare-feu Windows
   - Autorisez les connexions entrantes sur les ports 8081 (Expo) et 4000 (API)

---

## 📁 ÉTAPE 6 : Test de connexion à l'API

Testez la connexion à l'API :
```typescript
// Dans un composant ou service
const testConnection = async () => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/health`);
    const data = await response.json();
    console.log('✅ Connexion API réussie:', data);
  } catch (error) {
    console.error('❌ Erreur de connexion API:', error);
  }
};
```

---

## ✅ Checklist de démarrage

Avant de lancer l'application mobile, vérifiez :

- [ ] Le fichier `.env` est créé avec la bonne URL (localhost ou IP locale selon le contexte)
- [ ] `kashup-api` est démarré et accessible sur `http://localhost:4000`
- [ ] Le serveur Expo est démarré (`npx expo start` ou `npx expo start --lan`)
- [ ] Pour appareil physique : même réseau Wi-Fi que l'ordinateur
- [ ] Pour appareil physique : pare-feu Windows autorise les ports 8081 et 4000
- [ ] L'application mobile peut scanner le QR code ou se connecter à l'URL Expo

---

## 📋 Résumé des URLs selon le contexte

**Pour émulateur/simulateur :**
```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

**Pour appareil physique :**
```env
EXPO_PUBLIC_API_URL=http://192.168.1.23:4000
```

**Serveur Expo pour appareil physique :**
```bash
npx expo start --lan
# URL affichée : exp://192.168.1.23:8081
```

---

**Important :** Après avoir créé le nouveau `.env`, redémarrez complètement Expo pour que les changements soient pris en compte.

Le fichier `.env` final doit contenir uniquement :
```
EXPO_PUBLIC_API_URL=http://localhost:4000
```
ou
```
EXPO_PUBLIC_API_URL=http://192.168.1.23:4000
```

Sans caractères NUL, sans corruption, sans espaces superflus.

