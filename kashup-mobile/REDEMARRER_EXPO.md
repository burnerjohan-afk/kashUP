# Redémarrer Expo pour prendre en compte l’URL API

Si l’app affiche « Impossible de joindre le serveur » alors que vous êtes en WiFi et que `.env.local` pointe vers `https://kashupv0.vercel.app`, le bundle utilise encore l’ancienne config.

## 1. Arrêter Expo

Dans le terminal où tourne `npm run start` (ou `npx expo start`), faites **Ctrl+C**.

## 2. Redémarrer avec cache vidé

```bash
cd c:\kashup\kashup-mobile
npx expo start -c
```

L’option **`-c`** vide le cache Metro pour que les variables d’environnement (dont `EXPO_PUBLIC_API_URL`) soient relues.

## 3. Recharger l’app sur le téléphone

- Secouer le téléphone → **Reload**
- Ou fermer complètement Expo Go et rouvrir le projet

## 4. Vérifier depuis le navigateur du téléphone

Sur le **téléphone**, ouvrez le navigateur et allez sur :

**https://kashupv0.vercel.app/health**

- Si vous voyez du JSON (`{"status":"ok",...}`) → le WiFi et l’API fonctionnent. Le souci venait du cache Expo.
- Si la page ne charge pas → problème réseau (WiFi, pare-feu, 4G à tester).

## 5. Vérifier le fichier .env.local

Le fichier **kashup-mobile/.env.local** doit contenir (sans autre `EXPO_PUBLIC_API_URL` avant) :

```
EXPO_PUBLIC_API_URL=https://kashupv0.vercel.app
```

Pas d’espace avant/après le `=`, pas de guillemets autour de l’URL.
