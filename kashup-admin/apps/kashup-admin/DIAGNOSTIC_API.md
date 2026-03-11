# Guide de Diagnostic API

Ce guide vous aide à diagnostiquer et résoudre les problèmes de connexion API dans `kashup-admin`.

## 🔍 Problèmes courants

### 1. Erreur "Identifiant invalide"

**Causes possibles :**
- Le backend n'est pas démarré ou inaccessible
- Timeout de connexion (30 secondes)
- Refresh token manquant ou expiré
- Identifiants incorrects

**Solutions :**
1. Vérifier que le backend est démarré :
   ```bash
   # Dans le terminal du backend
   curl http://localhost:4000/api/v1/health
   ```

2. Vérifier la configuration dans `.env.local` :
   ```env
   VITE_API_BASE_URL=http://localhost:4000/api/v1
   ```

3. Vérifier les logs de la console du navigateur pour plus de détails

### 2. Timeout API (30 secondes)

**Causes possibles :**
- Le backend ne répond pas
- Problème de réseau
- Le backend est surchargé

**Solutions :**
1. Vérifier que le backend est accessible :
   ```bash
   # Test de connectivité
   ping localhost  # ou l'IP du serveur backend
   ```

2. Vérifier les logs du backend pour voir s'il reçoit les requêtes

3. Augmenter le timeout si nécessaire (dans `src/config/api.ts`)

### 3. "Aucun refresh token disponible"

**Causes possibles :**
- Session expirée
- Déconnexion non effectuée correctement
- Problème de stockage (sessionStorage)

**Solutions :**
1. Se déconnecter et se reconnecter
2. Vider le sessionStorage du navigateur
3. Vérifier que le backend renvoie bien un refresh token lors du login

## 🛠️ Outils de diagnostic

### 1. Script de test de connexion

Le fichier `src/utils/test-api-connection.ts` contient des fonctions utilitaires :

```typescript
import { testApiConnection, logApiConfig, testMultipleEndpoints } from '@/utils/test-api-connection';

// Afficher la configuration
logApiConfig();

// Tester un endpoint
const result = await testApiConnection('/health');

// Tester plusieurs endpoints
const multiResult = await testMultipleEndpoints();
```

### 2. Composant de diagnostic

Le composant `ApiDiagnostic` peut être ajouté à n'importe quelle page pour afficher l'état de la connexion API :

```tsx
import { ApiDiagnostic } from '@/components/ApiDiagnostic';

// Dans votre composant
<ApiDiagnostic />
```

### 3. Test automatique au login

Le formulaire de login teste automatiquement la connexion API au chargement (en mode développement).

## 📋 Checklist de diagnostic

Avant de signaler un problème, vérifiez :

- [ ] Le backend est démarré et accessible
- [ ] Le fichier `.env.local` existe et contient `VITE_API_BASE_URL`
- [ ] L'URL dans `.env.local` correspond à l'URL du backend
- [ ] Le backend répond aux requêtes (test avec `curl` ou Postman)
- [ ] Les logs de la console du navigateur sont consultés
- [ ] Les logs du backend sont consultés
- [ ] Le sessionStorage contient les tokens (Onglet Application > Session Storage)

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env.local` à la racine de `apps/kashup-admin/` :

```env
# URL de base de l'API backend (avec /api/v1)
VITE_API_BASE_URL=http://localhost:4000/api/v1

# Alternative (pour compatibilité)
# VITE_API_URL=http://localhost:4000

# Activer/désactiver les mocks MSW
VITE_ENABLE_MSW=false
```

### Si le backend est sur une autre machine

Si le backend est sur une autre machine du réseau (ex: `192.168.1.19`) :

```env
VITE_API_BASE_URL=http://192.168.1.19:4000/api/v1
```

## 🐛 Logs utiles

### Console du navigateur

En mode développement, vous verrez :
- `🔧 Configuration API:` - Configuration actuelle
- `🔍 Test de connexion API:` - Résultat des tests
- `✅ API accessible:` - Connexion réussie
- `❌ API non accessible:` - Connexion échouée
- `⚠️ Aucun refresh token disponible` - Problème d'authentification

### Logs du backend

Vérifiez les logs du backend pour voir :
- Si les requêtes arrivent
- Les erreurs serveur
- Les problèmes d'authentification

## 📞 Support

Si le problème persiste après avoir suivi ce guide :

1. Collectez les informations suivantes :
   - Configuration API (voir `ApiDiagnostic`)
   - Logs de la console du navigateur
   - Logs du backend
   - Résultat de `testApiConnection()`

2. Vérifiez que :
   - Le backend est à jour
   - Les dépendances sont installées (`npm install`)
   - Le cache du navigateur est vidé

## 🔄 Redémarrage propre

Si rien ne fonctionne, essayez un redémarrage propre :

```bash
# 1. Arrêter tous les serveurs
# 2. Vider le cache
rm -rf node_modules/.vite
# 3. Redémarrer le backend
# 4. Redémarrer l'admin
npm run dev
# 5. Vider le sessionStorage du navigateur (F12 > Application > Session Storage > Clear)
```

