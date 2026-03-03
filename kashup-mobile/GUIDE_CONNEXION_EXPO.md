# Guide de Connexion Expo Go

## Problème : "Could not connect to the server" avec `exp://127.0.0.1:8081`

### Solution 1 : Mode Tunnel (Recommandé) ✅

Le mode tunnel crée une URL publique accessible depuis n'importe où :

```bash
npm run start:tunnel
```

**Avantages :**
- Fonctionne même si le téléphone et l'ordinateur ne sont pas sur le même réseau
- URL publique accessible depuis n'importe où
- Plus fiable pour les tests

**Inconvénients :**
- Nécessite une connexion Internet
- Peut être plus lent que le mode LAN

### Solution 2 : Mode LAN (Si même réseau WiFi)

Si votre téléphone et votre ordinateur sont sur le même réseau WiFi :

```bash
npm run start:lan
```

Le QR code devrait afficher `exp://192.168.1.23:8081` au lieu de `exp://127.0.0.1:8081`.

**Vérification :**
1. Vérifiez que votre téléphone est sur le même réseau WiFi que votre ordinateur
2. Vérifiez que le QR code affiche bien votre IP locale (192.168.1.23) et non 127.0.0.1

### Solution 3 : Connexion manuelle

Si le QR code ne fonctionne pas, vous pouvez entrer l'URL manuellement dans Expo Go :

1. Ouvrez Expo Go sur votre téléphone
2. Appuyez sur "Enter URL manually"
3. Entrez l'URL affichée dans le terminal :
   - Mode tunnel : `exp://xxx.xxx.xxx.xxx:8081` (URL publique)
   - Mode LAN : `exp://192.168.1.23:8081` (IP locale)

### Solution 4 : Vérifier le pare-feu Windows

Si rien ne fonctionne, vérifiez que Windows Firewall n'bloque pas le port 8081 :

1. Ouvrez "Pare-feu Windows Defender"
2. Cliquez sur "Paramètres avancés"
3. Vérifiez que les règles pour Node.js et Expo autorisent les connexions entrantes

### Dépannage

**Si le QR code affiche toujours `127.0.0.1` :**
- Arrêtez Expo (Ctrl+C)
- Redémarrez avec `npm run start:tunnel` ou `npm run start:lan`
- Attendez 10-15 secondes que le QR code se mette à jour

**Si "Could not connect" persiste :**
- Vérifiez que votre téléphone et votre ordinateur sont sur le même réseau (mode LAN)
- Essayez le mode tunnel qui fonctionne même sur des réseaux différents
- Vérifiez que le port 8081 n'est pas bloqué par un pare-feu

**Si Expo ne démarre pas :**
- Vérifiez que vous êtes dans le bon répertoire (`C:\kashup\kashup-mobile`)
- Vérifiez que `node_modules` est installé (`npm install`)
- Essayez `npm run start:clear` pour nettoyer le cache

