# S'inscrire depuis un Android (5G ou autre réseau, sans être sur le WiFi du PC)

Pour que l'inscription fonctionne depuis ton téléphone **sans être sur le même réseau que ton PC** et **sans pointer vers l'IP de ton ordinateur**, l'app doit utiliser **uniquement** l'API de production : **https://kashupv0.vercel.app**.

---

## Option A : Avec Expo Go (téléphone pas sur le WiFi du PC)

Si tu utilises **Expo Go** sur ton Android et que le téléphone n’est **pas** sur le même WiFi que le PC, le téléphone doit quand même pouvoir **télécharger le bundle** depuis ton PC. Pour ça, il faut utiliser le **tunnel**.

### 1. Sur ton PC (dans le projet)

Vérifier que **kashup-mobile/.env.local** contient bien :
```env
EXPO_PUBLIC_API_URL=https://kashupv0.vercel.app
```
(sans espace avant/après le `=`)

### 2. Lancer Expo en mode tunnel

Dans un terminal :
```bash
cd c:\kashup\kashup-mobile
npx expo start -c --tunnel
```

- **`-c`** : vide le cache pour que l’URL prod soit bien prise en compte.
- **`--tunnel`** : crée une URL publique (type ngrok) pour que ton téléphone puisse charger l’app même en 5G ou sur un autre réseau.

### 3. Sur ton Android

- Ouvre **Expo Go**.
- Scanne le **QR code tunnel** affiché dans le terminal (ou saisi l’URL indiquée).
- L’app se charge ; l’inscription appellera **https://kashupv0.vercel.app** (pas l’IP de ton PC).

### 4. Tester l’inscription

Remplis le formulaire et appuie sur **« Créer mon compte »**. La requête part vers l’API Vercel ; aucun accès à ton PC n’est nécessaire.

---

## Option B : Avec une APK (recommandé pour « comme une vraie app »)

Avec une **APK** installée, le téléphone n’a **jamais** besoin d’être sur le réseau du PC. Il lui suffit d’avoir internet (5G, WiFi n’importe où).

### 1. Builder une APK avec l’API de prod

Sur ton PC (une seule fois) :
```bash
cd c:\kashup\kashup-mobile
npx eas build --profile preview --platform android
```

Les profils **preview** et **production** dans `eas.json` utilisent déjà `EXPO_PUBLIC_API_URL=https://kashupv0.vercel.app`.

### 2. Installer l’APK sur ton Android

- Quand le build est terminé, récupère le lien de téléchargement (terminal ou [expo.dev](https://expo.dev) → Builds).
- Télécharge et installe l’APK sur ton téléphone (5G ou n’importe quel réseau).

### 3. S’inscrire

Ouvre l’app, va sur l’écran d’inscription et crée ton compte. Toutes les requêtes partent vers **https://kashupv0.vercel.app** ; le PC et le réseau local ne sont pas utilisés.

---

## Récap

| Situation | Ce qu’il faut faire |
|-----------|----------------------|
| **Expo Go**, téléphone **pas** sur le WiFi du PC | `.env.local` avec l’URL prod + `npx expo start -c --tunnel` puis scanner le QR code **tunnel**. |
| **Expo Go**, téléphone **sur le même WiFi** que le PC | `.env.local` avec l’URL prod + `npx expo start -c` puis recharger l’app (Reload / rescan). |
| **APK** (téléphone n’importe où, 5G ou autre) | Build avec `npx eas build --profile preview --platform android`, installer l’APK, l’app utilise déjà l’API prod. |

Oui, pour s’inscrire depuis ton Android qui ne pointe pas vers l’IP de ton PC et qui n’est pas sur le même réseau, **c’est suffisant** : soit Expo en **tunnel** + URL prod dans `.env.local`, soit une **APK** buildée en preview/production.
