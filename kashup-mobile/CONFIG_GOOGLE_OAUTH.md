# Configuration de l’inscription / connexion avec Google

Pour que « Se connecter avec Google » et « S’inscrire avec Google » fonctionnent, il faut configurer les identifiants OAuth côté **application mobile** et côté **API**.

## 1. Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/).
2. Créez un projet ou sélectionnez-en un.
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
4. Si demandé, configurez l’écran de consentement OAuth (type « Externe », etc.).
5. Créez **plusieurs** identifiants OAuth 2.0 :
   - **Application Web** (Web application) → notez l’**ID client** (ex. `xxx.apps.googleusercontent.com`). C’est le **client ID Web**.
   - **iOS** : indiquez l’ID du bundle Expo/React Native (ex. `host.exp.Exponent` ou votre bundle ID). Notez l’**ID client iOS**.
   - **Android** : indiquez le nom du package et la signature SHA-1. Notez l’**ID client Android**.

## 2. Application mobile (Expo)

Dans le fichier **`.env`** ou **`.env.local`** à la racine de `kashup-mobile` :

```env
# Google OAuth – remplacer par vos vrais IDs depuis la console Google
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=votre-client-id-web.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=votre-client-id-ios.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=votre-client-id-android.apps.googleusercontent.com
```

- **Web** : obligatoire (utilisé par Expo pour le flux).
- **iOS** : obligatoire sur iPhone/iPad.
- **Android** : obligatoire sur Android.

Redémarrez le serveur Expo après modification.

## 3. API (backend)

Dans le fichier **`.env`** à la racine de `kashup-api` :

```env
# Même ID que le client « Web » de la console Google (pour vérifier le token)
GOOGLE_CLIENT_ID=votre-client-id-web.apps.googleusercontent.com
```

Redémarrez l’API après modification.

## 4. Vérification

- Si les variables ne sont pas définies, en appuyant sur « Google » une alerte explique quelles variables ajouter.
- Si l’API renvoie « Configuration Google manquante (GOOGLE_CLIENT_ID) », ajoutez `GOOGLE_CLIENT_ID` dans le `.env` de `kashup-api`.
