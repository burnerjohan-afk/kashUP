# Guide de Diagnostic API

Ce guide vous aide à diagnostiquer et résoudre les problèmes de connexion API dans l'application KashUP Mobile.

## 🔍 Outil de Diagnostic

Un outil de diagnostic complet est disponible dans `src/utils/apiDiagnostics.ts`. Il teste automatiquement :

1. **Configuration API** - Vérifie que l'URL de base est correctement configurée
2. **Connectivité réseau** - Teste si le serveur est accessible
3. **Temps de réponse** - Mesure la latence du serveur
4. **Endpoint /health** - Vérifie que l'endpoint de santé répond
5. **Endpoints spécifiques** - Teste les endpoints problématiques (`/partners`, `/me`, etc.)

### Utilisation

#### Option 1: Depuis le code

```typescript
import { runFullDiagnostics } from '@/src/utils/apiDiagnostics';

// Lancer tous les tests
const results = await runFullDiagnostics();
```

#### Option 2: Depuis l'interface

Le composant `ApiDiagnostics` peut être ajouté à n'importe quel écran pour un diagnostic interactif :

```typescript
import { ApiDiagnostics } from '@/src/components/ApiDiagnostics';

// Dans votre écran
<ApiDiagnostics />
```

## 🚨 Problèmes Courants

### 1. Timeout après 30 secondes

**Symptômes:**
```
ERROR [API] ⚠️ Type: TIMEOUT
ERROR [API] 💬 Message: timeout of 30000ms exceeded
```

**Causes possibles:**
- Le serveur backend n'est pas démarré
- Le serveur est surchargé et répond très lentement
- Problème de réseau entre l'appareil et le serveur
- Le port 4000 est bloqué par un firewall

**Solutions:**
1. Vérifiez que le serveur backend est démarré :
   ```bash
   cd kashup-api
   npm start
   ```

2. Vérifiez que le serveur écoute sur le port 4000 :
   ```bash
   # Sur Windows
   netstat -ano | findstr :4000
   
   # Sur Mac/Linux
   lsof -i :4000
   ```

3. Testez la connexion depuis un navigateur ou curl :
   ```bash
   curl http://192.168.1.19:4000/health
   ```

4. Vérifiez que l'IP détectée est correcte (voir logs `[runtime] Host détecté`)

### 2. Connexion refusée (ECONNREFUSED)

**Symptômes:**
```
ERROR [API] ⚠️ Type: RÉSEAU
ERROR [API] 🔍 Code erreur: ECONNREFUSED
```

**Causes possibles:**
- Le serveur backend n'est pas démarré
- Le serveur écoute sur un autre port
- L'IP ou le port sont incorrects

**Solutions:**
1. Démarrez le serveur backend
2. Vérifiez la configuration du port dans `kashup-api`
3. Vérifiez que l'IP détectée correspond à celle du serveur

### 3. Host introuvable (ENOTFOUND)

**Symptômes:**
```
ERROR [API] ⚠️ Type: RÉSEAU
ERROR [API] 🔍 Code erreur: ENOTFOUND
```

**Causes possibles:**
- L'IP détectée automatiquement est incorrecte
- Problème de résolution DNS

**Solutions:**
1. Vérifiez les logs `[runtime] Host détecté` pour voir l'IP détectée
2. Si l'IP est incorrecte, vérifiez la configuration Expo
3. Redémarrez Expo avec `npx expo start -c --lan`

### 4. Réponses très lentes (> 3 secondes)

**Symptômes:**
```
[API] ⏱️ Durée: 5000ms
```

**Causes possibles:**
- Le serveur backend est surchargé
- Problème de performance dans le backend
- Réseau lent ou instable

**Solutions:**
1. Vérifiez les performances du serveur backend
2. Vérifiez les logs du serveur pour identifier les requêtes lentes
3. Optimisez les requêtes API côté backend
4. Vérifiez la connexion réseau

## 🔧 Configuration

### Détection automatique de l'IP

L'application détecte automatiquement l'IP du serveur Expo via `expo-constants`. L'IP est extraite de `hostUri` et utilisée pour construire l'URL de l'API.

**Fichier:** `src/config/runtime.ts`

```typescript
// Exemple: exp://192.168.1.19:8081 → 192.168.1.19
// API URL: http://192.168.1.19:4000/api/v1
```

### Timeout

Le timeout par défaut est de **30 secondes**. Il peut être modifié dans `src/services/api.ts` :

```typescript
axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Modifier ici (en millisecondes)
});
```

⚠️ **Attention:** Augmenter le timeout n'est pas une solution. Si le serveur prend plus de 30 secondes à répondre, il y a un problème à résoudre.

## 📊 Logs de Diagnostic

Les logs suivants sont disponibles en mode développement :

### Configuration
```
[runtime] 📍 Host détecté: 192.168.1.19 (depuis exp://192.168.1.19:8081)
[runtime] 🔗 API Origin: http://192.168.1.19:4000
[runtime] 📍 API Base URL: http://192.168.1.19:4000/api/v1
```

### Requêtes
```
[API] GET http://192.168.1.19:4000/api/v1/partners
[API] 📍 Endpoint: /partners
[API] ⏱️  Début: 2025-12-18T16:57:18.283Z
[API] ✅ GET /partners → 200 OK
[API] ⏱️  Durée: 234ms
```

### Erreurs
```
[API] ❌ GET /partners → Erreur
[API] 🔗 URL tentée: http://192.168.1.19:4000/api/v1/partners
[API] ⚠️  Type: TIMEOUT
[API] 💬 Message: timeout of 30000ms exceeded
[API] ⏱️  Durée avant erreur: 30000ms
[API] 🔍 Code erreur: ECONNABORTED
```

## ✅ Checklist de Diagnostic

Avant de signaler un problème, vérifiez :

- [ ] Le serveur backend est démarré (`npm start` dans `kashup-api`)
- [ ] Le serveur écoute sur le port 4000
- [ ] L'IP détectée dans les logs correspond à celle du serveur
- [ ] La connexion réseau fonctionne (test avec `curl` ou navigateur)
- [ ] Le endpoint `/health` répond correctement
- [ ] Les logs du serveur backend ne montrent pas d'erreurs
- [ ] Le timeout n'est pas trop court pour votre environnement

## 🆘 Support

Si le problème persiste après avoir suivi ce guide :

1. Lancez le diagnostic complet : `runFullDiagnostics()`
2. Copiez tous les logs de la console
3. Vérifiez les logs du serveur backend
4. Documentez les étapes pour reproduire le problème

