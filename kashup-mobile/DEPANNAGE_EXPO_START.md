# 🔧 Dépannage - Erreur "TypeError: fetch failed" au démarrage

## ❌ Problème

L'erreur `TypeError: fetch failed` se produit quand Expo essaie de vérifier les versions des modules natifs mais ne peut pas se connecter à l'API Expo.

## ✅ Solutions

### Solution 1 : Mode offline (recommandé)

Démarrez Expo en mode offline pour ignorer la vérification des versions :

```bash
npm run start:offline
```

Ou avec LAN pour appareil physique :

```bash
npm run start:lan:offline
```

### Solution 2 : Ignorer la vérification

Vous pouvez aussi utiliser :

```bash
npm start -- --offline
```

### Solution 3 : Vérifier la connexion Internet

Si vous voulez que la vérification fonctionne :

1. Vérifiez votre connexion Internet
2. Vérifiez si un proxy/firewall bloque les connexions
3. Essayez de désactiver temporairement votre VPN si vous en avez un

### Solution 4 : Démarrer directement sur un appareil

Si vous avez un émulateur/simulateur configuré :

```bash
# Pour Android
npm run android

# Pour iOS (Mac uniquement)
npm run ios
```

## 📋 Commandes disponibles

```bash
npm start                  # Mode normal
npm run start:lan          # Mode LAN (pour appareil physique)
npm run start:offline      # Mode offline (ignore la vérification)
npm run start:lan:offline  # Mode LAN + offline (recommandé pour appareil physique)
npm run start:clear        # Nettoyer le cache et démarrer
```

## 🎯 Recommandation

Pour un appareil physique, utilisez :

```bash
npm run start:lan:offline
```

Cela :
- ✅ Utilise votre IP locale (fonctionne avec votre téléphone)
- ✅ Ignore la vérification des versions (évite l'erreur fetch failed)
- ✅ Affiche le QR code avec l'IP locale

## ⚠️ Note

Le mode offline n'empêche pas l'application de fonctionner. Il ignore simplement la vérification des versions des modules natifs, ce qui n'est pas critique pour le développement.

