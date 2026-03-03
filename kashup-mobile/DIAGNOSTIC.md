# 🔍 Diagnostic - Application ne s'affiche pas

## Questions à répondre

Pour mieux vous aider, j'ai besoin de savoir :

1. **Que voyez-vous exactement ?**
   - [ ] Écran complètement blanc
   - [ ] Écran noir
   - [ ] L'application crash immédiatement
   - [ ] L'application reste sur l'écran de chargement
   - [ ] Autre : _______________

2. **Y a-t-il des erreurs dans le terminal où vous avez lancé `npm start` ?**
   - Copiez-collez les erreurs en rouge ici

3. **Y a-t-il des erreurs dans la console de l'application ?**
   - Sur iOS : Cmd+D puis "Debug"
   - Sur Android : Secouez l'appareil puis "Debug"
   - Copiez-collez les erreurs ici

4. **L'application démarre-t-elle ?**
   - [ ] Oui, mais rien ne s'affiche
   - [ ] Non, elle crash immédiatement
   - [ ] Elle reste bloquée

## Solutions à essayer

### Solution 1 : Vérifier les erreurs de compilation

```bash
# Arrêter l'app (Ctrl+C)
# Vérifier les erreurs TypeScript
npx tsc --noEmit
```

### Solution 2 : Désactiver temporairement les notifications

Si l'application ne démarre toujours pas, désactivez temporairement les notifications dans `App.tsx` :

```typescript
// Dans App.tsx, ligne 48, commentez cette ligne :
// initWebhookNotifications();
```

Puis redémarrez :
```bash
npx expo start --clear
```

### Solution 3 : Vérifier les imports

Vérifiez que tous les fichiers importés existent :

```bash
# Vérifier que ces fichiers existent :
ls src/services/webhookNotificationService.ts
ls src/services/notificationTokenService.ts
ls src/services/webhookService.ts
ls src/services/cacheService.ts
```

### Solution 4 : Nettoyer complètement

```bash
# Arrêter l'app
# Supprimer les caches
rm -rf node_modules
rm -rf .expo
npm install
npx expo start --clear
```

### Solution 5 : Vérifier la version de Node.js

```bash
node -v
# Doit être >= 18
```

## Informations à partager

Si rien ne fonctionne, partagez :

1. **Les erreurs complètes du terminal** (copier-coller)
2. **Les erreurs de la console de l'app** (si accessible)
3. **La version de Node.js** : `node -v`
4. **La version d'Expo** : `npx expo --version`
5. **Le système d'exploitation** : Windows/Mac/Linux
6. **Sur quel appareil vous testez** : Simulateur iOS / Émulateur Android / Appareil physique

## Test minimal

Pour isoler le problème, créez un fichier `App.test.tsx` temporaire :

```typescript
// App.test.tsx
import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Test - L'app fonctionne !</Text>
    </View>
  );
}
```

Renommez temporairement `App.tsx` en `App.tsx.backup` et `App.test.tsx` en `App.tsx`.

Si ça fonctionne, le problème vient de votre code. Si ça ne fonctionne pas, le problème vient de la configuration Expo.

