# ✅ Solution pour démarrer Expo

## 🎯 Commandes corrigées

Les scripts ont été mis à jour. Utilisez :

### Pour appareil physique (recommandé)
```bash
npm run start:lan
```
- Utilise votre IP locale
- Le QR code affichera `exp://192.168.x.x:8081`
- Si vous voyez l'erreur "fetch failed", ignorez-la (c'est juste un warning)

### Pour éviter l'erreur "fetch failed"
```bash
npm run start:offline
```
- Mode offline (ignore la vérification des versions)
- Utilise localhost (pour émulateurs/simulateurs uniquement)

### Pour nettoyer et démarrer
```bash
npm run start:clear
```

## ⚠️ Note importante

L'erreur "TypeError: fetch failed" est un **warning**, pas une erreur bloquante. Expo devrait quand même démarrer et afficher le QR code même avec cette erreur.

Si Expo démarre malgré l'erreur, vous pouvez :
1. Ignorer l'erreur
2. Attendre que le QR code apparaisse
3. Scanner le QR code avec Expo Go

## 🔧 Si l'erreur bloque vraiment

Si Expo ne démarre pas à cause de l'erreur, essayez :

1. **Vérifier votre connexion Internet**
2. **Désactiver temporairement votre VPN**
3. **Vérifier le firewall Windows**

Ou utilisez directement un émulateur :
```bash
npm run android
```

