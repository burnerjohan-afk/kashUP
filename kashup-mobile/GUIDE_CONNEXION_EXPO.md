# Guide de Connexion Expo Go

## Problème : "Could not connect to development server" ou "Could not connect to the server"

### Solution 1 : Mode LAN + Pare-feu Windows (recommandé quand le tunnel échoue)

**Étape 1 – Même Wi‑Fi**  
Assurez-vous que le PC et l’iPhone sont sur le **même réseau Wi‑Fi** (pas de partage de connexion 4G sur le téléphone).

**Étape 2 – Autoriser le port 8081 dans le pare-feu Windows**

1. Ouvrez **Pare-feu Windows Defender avec sécurité avancée** (recherche Windows : "Pare-feu").
2. Cliquez sur **Règles de trafic entrant** → **Nouvelle règle…**.
3. Choisissez **Port** → Suivant.
4. **TCP**, ports locaux spécifiques : **8081** → Suivant.
5. Choisir **Autoriser la connexion** → Suivant.
6. Cocher **Domaine** et **Privé** (décocher Public si vous voulez) → Suivant.
7. Nom : **Expo Metro 8081** → Terminer.

**Étape 3 – Démarrer Expo en LAN avec la bonne IP**

Expo ne lit pas `REACT_NATIVE_PACKAGER_HOSTNAME` dans le `.env`. Utilisez le script qui lit l’IP dans `.env.local` et lance Metro avec la bonne adresse :

```bash
npm run start:lan:host
```

Ce script utilise l’IP définie dans `.env.local` (`REACT_NATIVE_PACKAGER_HOSTNAME` ou, à défaut, l’hôte de `EXPO_PUBLIC_API_URL`). Vérifiez que votre IP y figure (même que pour l’API). Exemple :

```
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.19
```

Scannez le QR code avec l’iPhone. L’URL doit être du type `exp://192.168.1.19:8081`.

**Si vous lancez sans le script**, en PowerShell vous pouvez forcer l’IP à la main :

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.1.19"; npx expo start --lan
```

(Remplacez par votre IP.)

### Solution 2 : Mode tunnel (si le réseau bloque le LAN)

```bash
npx expo start --tunnel
```

Si vous voyez **« ngrok tunnel took too long to connect »** : le réseau ou un pare-feu bloque ngrok. Dans ce cas, utilisez la **Solution 1** (LAN + règle pare-feu sur le port 8081). Vous pouvez aussi réessayer le tunnel plus tard (`npx expo start -c --tunnel` avec cache vidé).

### Solution 3 : Connexion manuelle dans Expo Go

1. Ouvrez **Expo Go** sur l’iPhone.
2. **Entrer l’URL manuellement**.
3. Saisissez l’URL affichée dans le terminal (ex. `exp://192.168.1.19:8081`).

### Dépannage

- **QR code en 127.0.0.1 :** arrêtez Expo (Ctrl+C), relancez avec `npx expo start --lan`, attendez 10–15 s.
- **Tunnel timeout :** privilégier le mode LAN et la règle pare-feu (Solution 1).
- **Expo ne démarre pas :** être dans `kashup-mobile`, lancer `npm install`, puis `npx expo start --clear`.

