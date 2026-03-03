# ✅ Configuration API Finale - Kashup Mobile

## 🎯 Modifications effectuées

### 1. Fichier `src/config/api.ts`

**Avant :** Logique complexe qui ajoutait `/api/v1` automatiquement

**Après :** Utilisation directe de `EXPO_PUBLIC_API_URL` sans aucune modification

```typescript
// Utilise l'URL telle quelle, sans modification
export const baseURL = inputUrl
  ? inputUrl.trim().replace(/\/+$/, '') // Retire seulement les slashes finaux
  : 'http://192.168.68.205:4000'; // Fallback
```

### 2. Fichier `src/services/api/client.ts`

**Ajouts :**
- Log de l'URL finale appelée : `console.log('[API] 🔗 URL finale appelée: ${url}')`
- Log de la réponse API brute : `console.log('[API] 📥 Réponse API brute: ...')`
- Timeout augmenté à 30 secondes (déjà fait)

### 3. Fichier `src/services/api.ts`

**Modifications :**
- Utilise `baseURL` depuis `src/config/api.ts`
- Timeout augmenté à 30 secondes
- Logs ajoutés pour le refresh token et test de connexion

## 📝 Configuration requise

### Fichier `.env`

À la racine du projet, créer/modifier `.env` :

```env
EXPO_PUBLIC_API_URL=http://192.168.68.205:4000
```

**⚠️ IMPORTANT :**
- Ne pas inclure `/api/v1` dans l'URL
- Utiliser l'IP de votre PC, pas `localhost`
- Le port doit correspondre à votre serveur (4000)

## 🚀 Commandes de relance

### 1. Arrêter l'application actuelle

```bash
# Trouver le processus sur le port 8081
netstat -ano | findstr :8081

# Tuer le processus (remplacer PID par le numéro trouvé)
taskkill /F /PID <PID>
```

### 2. Redémarrer avec cache vidé

```bash
npx expo start --clear --lan
```

Le flag `--lan` force l'utilisation de l'IP LAN pour Expo.

## 🔍 Vérification

Au démarrage de l'app, vous devriez voir dans les logs :

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[API Config] 📡 Configuration API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[API Config] EXPO_PUBLIC_API_URL = http://192.168.68.205:4000
[API Config] baseURL utilisé = http://192.168.68.205:4000
[API Config] Platform = ios
[API Config] ⚠️  Aucun /api/v1 ajouté automatiquement
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Lors d'un appel API (ex: GET /partners), vous verrez :

```
[API] GET /partners [requestId: uuid]
[API] 🔗 URL finale appelée: http://192.168.68.205:4000/partners
[API] 📥 Réponse API brute [200]: { ... }
```

## ✅ Résultat attendu

- ✅ URL finale : `http://192.168.68.205:4000/partners` (sans `/api/v1`)
- ✅ Plus de timeout (30 secondes)
- ✅ Logs clairs pour debug
- ✅ Les partenaires s'affichent dans l'app

## 🐛 Dépannage

### L'app utilise encore localhost

**Solution :**
1. Vérifier que `.env` contient bien `EXPO_PUBLIC_API_URL=http://192.168.68.205:4000`
2. Redémarrer avec `--clear` : `npx expo start --clear --lan`
3. Vérifier les logs au démarrage

### Timeout toujours présent

**Vérifier :**
1. Que le serveur API tourne sur `http://192.168.68.205:4000`
2. Tester avec curl : `curl http://192.168.68.205:4000/partners`
3. Vérifier que le PC et le téléphone sont sur le même WiFi

### Les partenaires ne s'affichent pas

**Vérifier :**
1. Les logs dans la console : `[API] 📥 Réponse API brute`
2. Que la réponse contient bien des données
3. Que le format de réponse correspond à ce que l'app attend

## 📋 Fichiers modifiés

1. `src/config/api.ts` - Configuration simplifiée
2. `src/services/api/client.ts` - Logs ajoutés
3. `src/services/api.ts` - Utilise la nouvelle config
4. `src/services/api/README.md` - Documentation mise à jour

