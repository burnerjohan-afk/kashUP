# 🔧 Configuration Complète - Communication entre API, Admin et Mobile

## 📋 Vue d'ensemble

Vous avez **3 projets** qui doivent communiquer :
1. **kashup-api** : Backend API (port 4000)
2. **kashup-admin** : Back office (port 5173 ou autre)
3. **kashup-mobile** : Application mobile

## 🎯 Configuration par Projet

---

## 1️⃣ KASHUP-API (Backend)

### 📁 Fichier : `.env`

```env
# Port de l'API
PORT=4000

# Base de données
DATABASE_URL="file:./dev.db"

# JWT
JWT_SECRET="votre-secret-jwt-super-securise"
JWT_EXPIRES_IN="7d"

# CORS - Autoriser les requêtes depuis admin et mobile
# En développement, utilisez "*" pour autoriser toutes les origines
# En production, listez les URLs exactes séparées par des virgules
CORS_ORIGIN="*"
# OU en production :
# CORS_ORIGIN="http://localhost:5173,https://admin.kashup.com,https://app.kashup.com"

# Webhooks - URL de l'application mobile pour recevoir les notifications
# En développement local, utilisez une URL de test (ngrok, etc.)
# En production, utilisez l'URL de votre serveur de notifications push
MOBILE_WEBHOOK_URL=""
# Exemple avec ngrok en développement :
# MOBILE_WEBHOOK_URL="https://xxxx-xx-xx-xx-xx.ngrok.io/webhook"
# Exemple en production :
# MOBILE_WEBHOOK_URL="https://api.kashup.com/webhook"

# Environnement
NODE_ENV="development"
```

### ✅ Vérification

```bash
# Dans kashup-api
npm run dev
# Vous devriez voir : 🚀 KashUP API prête sur http://localhost:4000

# Tester l'API
curl http://localhost:4000/health
# Réponse attendue : {"data":{"status":"ok",...},"error":null,"meta":null}
```

---

## 2️⃣ KASHUP-ADMIN (Back Office)

### 📁 Fichier : `.env` ou `.env.local`

**IMPORTANT** : Si vous utilisez Vite, les variables d'environnement doivent commencer par `VITE_`

```env
# URL de l'API backend
VITE_API_URL=http://localhost:4000
# OU en production :
# VITE_API_URL=https://api.kashup.com

# URL de base (optionnel)
VITE_BASE_URL=http://localhost:5173
```

### 📁 Fichier : `src/config/api.ts` (ou similaire)

```typescript
// Configuration de l'API
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Fonction pour faire des requêtes API
export const apiClient = {
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // ... votre configuration axios/fetch
};
```

### 📁 Fichier : `src/services/api.ts` (ou similaire)

```typescript
// Exemple avec fetch
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('accessToken'); // ou votre méthode de stockage
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  
  // Vérifier que la réponse est bien du JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Réponse non-JSON reçue: ${text.substring(0, 100)}`);
  }
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'Erreur API');
  }
  
  return data;
}
```

### ✅ Vérification

```bash
# Dans kashup-admin
npm run dev
# Ouvrir http://localhost:5173 dans le navigateur
# Vérifier la console : pas d'erreur CORS
# Tenter de se connecter : doit fonctionner
```

---

## 3️⃣ KASHUP-MOBILE (Application Mobile)

### 📁 Fichier : `.env` ou `app.config.js` (selon votre framework)

**Pour React Native / Expo :**

```env
# URL de l'API backend
EXPO_PUBLIC_API_URL=http://localhost:4000
# OU en production :
# EXPO_PUBLIC_API_URL=https://api.kashup.com

# URL pour recevoir les webhooks (optionnel, si vous avez un serveur)
EXPO_PUBLIC_WEBHOOK_URL=""
```

### 📁 Fichier : `src/config/api.ts` (ou similaire)

```typescript
// Configuration de l'API
export const API_BASE_URL = 
  process.env.EXPO_PUBLIC_API_URL || 
  Constants.expoConfig?.extra?.apiUrl || 
  'http://localhost:4000';

// Pour les tests en développement, vous pouvez utiliser ngrok
// export const API_BASE_URL = 'https://xxxx-xx-xx-xx-xx.ngrok.io';

export const apiClient = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};
```

### 📁 Fichier : `src/services/webhook.ts` (pour recevoir les webhooks)

```typescript
// Endpoint pour recevoir les webhooks depuis l'API
export const WEBHOOK_ENDPOINT = '/webhook';

// Fonction pour enregistrer le token de l'appareil
export async function registerDeviceToken(token: string) {
  // Envoyer le token à l'API pour recevoir les notifications
  await apiClient.post('/devices/register', { token });
}
```

### ✅ Vérification

```bash
# Dans kashup-mobile
# Tester la connexion à l'API
# Vérifier que les requêtes fonctionnent
```

---

## 🔗 Configuration des Webhooks

### Dans KASHUP-API

Les webhooks sont déjà configurés pour envoyer des notifications à l'application mobile quand :
- Un partenaire est créé/modifié
- Une offre est créée/modifiée
- Une récompense est créée/modifiée
- etc.

**Pour activer les webhooks :**

1. **En développement** : Utilisez ngrok pour exposer votre serveur mobile local
   ```bash
   # Installer ngrok
   npm install -g ngrok
   
   # Exposer le port de votre app mobile (ex: 8081)
   ngrok http 8081
   
   # Copier l'URL HTTPS (ex: https://xxxx-xx-xx-xx-xx.ngrok.io)
   # L'ajouter dans kashup-api/.env :
   MOBILE_WEBHOOK_URL="https://xxxx-xx-xx-xx-xx.ngrok.io/webhook"
   ```

2. **En production** : Utilisez l'URL de votre serveur de notifications
   ```env
   MOBILE_WEBHOOK_URL="https://api.kashup.com/webhook"
   ```

---

## 🧪 Tests de Communication

### Test 1 : API → Admin

```bash
# Dans kashup-admin, ouvrir la console du navigateur
# Tenter de créer un partenaire
# Vérifier :
# ✅ Pas d'erreur CORS
# ✅ Requête réussie (200 ou 201)
# ✅ Réponse JSON valide
```

### Test 2 : API → Mobile

```bash
# Dans kashup-mobile
# Tenter de récupérer la liste des partenaires
# Vérifier :
# ✅ Connexion réussie
# ✅ Données reçues
```

### Test 3 : Webhooks API → Mobile

```bash
# Dans kashup-api, créer un partenaire depuis l'admin
# Dans kashup-mobile, vérifier :
# ✅ Notification reçue
# ✅ Données synchronisées
```

---

## 🐛 Résolution des Problèmes

### Problème 1 : Erreur CORS

**Symptôme** : `Access to fetch at 'http://localhost:4000/...' from origin 'http://localhost:5173' has been blocked by CORS policy`

**Solution** :
1. Vérifier `CORS_ORIGIN` dans `kashup-api/.env`
2. En développement, utiliser `CORS_ORIGIN="*"`
3. Redémarrer l'API

### Problème 2 : Réponse non-JSON

**Symptôme** : `Unexpected token '-', "------WebK"... is not valid JSON`

**Solution** :
1. Vérifier que l'API retourne bien du JSON
2. Vérifier le Content-Type dans les headers
3. Les corrections ont déjà été appliquées dans le code

### Problème 3 : Webhooks ne fonctionnent pas

**Symptôme** : Les modifications dans l'admin ne se répercutent pas sur le mobile

**Solution** :
1. Vérifier `MOBILE_WEBHOOK_URL` dans `kashup-api/.env`
2. Vérifier que l'URL est accessible depuis l'API
3. Vérifier les logs de l'API pour voir les erreurs de webhook

---

## 📝 Checklist de Configuration

### KASHUP-API
- [ ] `.env` configuré avec `PORT=4000`
- [ ] `CORS_ORIGIN="*"` (dev) ou URLs spécifiques (prod)
- [ ] `MOBILE_WEBHOOK_URL` configuré (si webhooks activés)
- [ ] API démarre sans erreur
- [ ] `/health` retourne du JSON

### KASHUP-ADMIN
- [ ] `.env` avec `VITE_API_URL=http://localhost:4000`
- [ ] Code utilise `import.meta.env.VITE_API_URL`
- [ ] Headers `Authorization: Bearer <token>` ajoutés
- [ ] Pas d'erreur CORS dans la console
- [ ] Connexion à l'API fonctionne

### KASHUP-MOBILE
- [ ] `.env` avec `EXPO_PUBLIC_API_URL=http://localhost:4000`
- [ ] Code utilise la variable d'environnement
- [ ] Connexion à l'API fonctionne
- [ ] Webhooks configurés (si nécessaire)

---

## 🚀 Démarrage Rapide

```bash
# Terminal 1 : API
cd kashup-api
npm run dev

# Terminal 2 : Admin
cd kashup-admin
npm run dev

# Terminal 3 : Mobile (si nécessaire)
cd kashup-mobile
npm start
```

---

## 💡 Notes Importantes

1. **Variables d'environnement** :
   - Vite (`kashup-admin`) : Préfixe `VITE_`
   - Expo (`kashup-mobile`) : Préfixe `EXPO_PUBLIC_`
   - Node.js (`kashup-api`) : Pas de préfixe

2. **CORS** :
   - En développement : `CORS_ORIGIN="*"` (moins sécurisé mais pratique)
   - En production : URLs exactes séparées par des virgules

3. **Webhooks** :
   - En développement : Utiliser ngrok pour exposer le serveur mobile
   - En production : Utiliser l'URL de votre serveur de notifications

4. **URLs** :
   - Développement : `http://localhost:XXXX`
   - Production : `https://votre-domaine.com`

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifier les logs de chaque service
2. Vérifier les variables d'environnement
3. Tester chaque service individuellement
4. Vérifier la connectivité réseau (CORS, firewall, etc.)

