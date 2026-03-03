# 🔍 Debug Network Error - Guide de dépannage

## ✅ Configuration actuelle

- **IP locale** : `192.168.1.23`
- **Fichier .env** : `EXPO_PUBLIC_API_URL=http://192.168.1.23:4000`
- **API accessible** : ✅ Testé avec `curl http://192.168.1.23:4000/health` → OK

## 🔧 Modifications effectuées

1. **Log de debug ajouté** dans `src/services/api.ts` :
   - Affiche l'URL de l'API utilisée au démarrage
   - Vérifiez dans les logs de l'application (shake device → "Show Dev Menu" → "Debug Remote JS")

2. **Expo redémarré** en mode LAN pour recharger les variables d'environnement

## 📋 Vérifications à faire

### 1. Vérifier les logs de l'application

Dans Expo Go :
1. Secouez votre appareil
2. Appuyez sur "Show Dev Menu"
3. Appuyez sur "Debug Remote JS"
4. Ouvrez la console du navigateur (F12)
5. Cherchez le log : `[API] Base URL configurée: http://192.168.1.23:4000`

**Si vous voyez `http://localhost:4000`** :
- Le fichier `.env` n'a pas été rechargé
- Redémarrez complètement Expo (Ctrl+C puis `npm run start:lan`)

### 2. Vérifier que l'API est accessible depuis votre téléphone

Sur votre téléphone, ouvrez un navigateur et allez sur :
```
http://192.168.1.23:4000/health
```

**Vous devriez voir** : `{"statusCode":200,"success":true,"message":"Opération réussie","data":{"status":"ok","env":"development"}}`

**Si ça ne fonctionne pas** :
- Vérifiez que votre téléphone et votre ordinateur sont sur le même réseau WiFi
- Vérifiez le pare-feu Windows (autorisez Node.js et le port 4000)

### 3. Vérifier les erreurs CORS

Si vous voyez des erreurs CORS dans les logs :
- L'API doit autoriser les requêtes depuis Expo Go
- Vérifiez la configuration CORS dans `kashup-api`
- Consultez `CORS_CONFIGURATION_PROMPT.md` pour plus de détails

### 4. Vérifier la connexion réseau

Dans les logs de l'application, cherchez :
- `Network request failed`
- `ECONNREFUSED`
- `ETIMEDOUT`
- `CORS error`

## 🛠️ Solutions possibles

### Solution 1 : Redémarrer Expo complètement

```bash
# Arrêter Expo
Ctrl+C

# Nettoyer le cache
npm run start:clear

# Redémarrer en mode LAN
npm run start:lan
```

### Solution 2 : Vérifier le pare-feu Windows

1. Ouvrez "Pare-feu Windows Defender"
2. Cliquez sur "Paramètres avancés"
3. Vérifiez que Node.js est autorisé
4. Autorisez les connexions entrantes sur le port 4000

### Solution 3 : Vérifier que kashup-api écoute sur toutes les interfaces

L'API doit écouter sur `0.0.0.0:4000` et non `127.0.0.1:4000` pour être accessible depuis le réseau local.

Vérifiez dans `kashup-api` :
```javascript
app.listen(4000, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:4000');
});
```

### Solution 4 : Tester avec un autre endpoint

Dans les logs, vérifiez si d'autres endpoints fonctionnent :
- `/health` → Devrait fonctionner
- `/partners` → Peut nécessiter une authentification

## 📞 Informations à fournir pour le debug

Si le problème persiste, fournissez :
1. Le log `[API] Base URL configurée: ...` de la console
2. Le résultat de `http://192.168.1.23:4000/health` depuis le navigateur du téléphone
3. Les erreurs exactes dans les logs de l'application
4. Le type d'appareil (iOS/Android) et la version d'Expo Go

