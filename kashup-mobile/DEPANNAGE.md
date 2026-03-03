# 🔧 Dépannage - Application ne s'affiche plus

## Solutions rapides

### 1. Nettoyer le cache et redémarrer

```bash
# Arrêter l'application (Ctrl+C)

# Nettoyer le cache Metro
npx expo start --clear

# Ou si ça ne fonctionne pas :
rm -rf node_modules
npm install
npx expo start --clear
```

### 2. Vérifier les erreurs dans la console

Ouvrez la console où vous avez lancé `npm start` et cherchez les erreurs en rouge.

### 3. Vérifier le fichier `.env`

Assurez-vous que le fichier `.env` existe et contient :

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
```

### 4. Vérifier que l'API est accessible

Si l'application essaie de se connecter à l'API au démarrage et que l'API n'est pas disponible, cela peut bloquer l'affichage.

**Solution temporaire** : Désactivez temporairement l'enregistrement du token push dans `App.tsx` :

```typescript
// Commentez temporairement cette ligne dans App.tsx :
// await registerPushToken(token);
```

### 5. Vérifier les imports

Assurez-vous que tous les imports sont corrects. Le code a été simplifié pour ne plus utiliser `Constants.expoConfig`.

### 6. Redémarrer complètement

```bash
# Arrêter complètement
# Fermer tous les terminaux
# Redémarrer

cd kashup-mobile
npm start
```

## Erreurs courantes

### "Cannot find module 'expo-constants'"

Si vous voyez cette erreur, c'est que le module n'est pas installé :

```bash
npm install expo-constants
```

### "Network request failed"

L'application essaie de se connecter à l'API mais ne peut pas. Vérifiez :
- Que l'API est démarrée
- Que l'URL dans `.env` est correcte
- Que vous êtes sur le même réseau (pour appareil physique)

### Écran blanc

Si vous voyez un écran blanc :
1. Ouvrez les DevTools (shake device ou Cmd+D / Ctrl+M)
2. Regardez les erreurs dans la console
3. Vérifiez les logs dans le terminal où vous avez lancé `npm start`

## Vérification étape par étape

1. ✅ L'application démarre sans erreur dans le terminal
2. ✅ Pas d'erreur rouge dans la console
3. ✅ Le fichier `.env` existe et contient `EXPO_PUBLIC_API_URL`
4. ✅ Tous les modules sont installés (`npm install`)
5. ✅ Le cache est nettoyé (`npx expo start --clear`)

## Si rien ne fonctionne

1. **Sauvegarder vos modifications** :
   ```bash
   git status
   git add .
   git commit -m "Sauvegarde avant dépannage"
   ```

2. **Revenir à une version précédente** :
   ```bash
   git log
   git checkout <commit-hash-avant-les-modifications>
   ```

3. **Ou restaurer le fichier apiClient.ts** :
   ```bash
   git checkout HEAD -- src/services/apiClient.ts
   ```

## Contact

Si le problème persiste, partagez :
- Les erreurs de la console
- Les logs du terminal
- La version de Node.js (`node -v`)
- La version d'Expo (`npx expo --version`)

