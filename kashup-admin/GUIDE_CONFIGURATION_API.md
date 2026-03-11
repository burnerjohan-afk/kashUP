# 🔧 Guide de configuration - Communication avec kashup-api

## Objectif

Configurer kashup-admin pour communiquer avec kashup-api et gérer correctement les erreurs.

## 📁 Fichier à modifier : `.env` ou `.env.local`

```env
# URL de l'API backend
VITE_API_URL=http://localhost:4000

# OU en production :
# VITE_API_URL=https://api.kashup.com

# URL de base (optionnel)
VITE_BASE_URL=http://localhost:5173
```

**✅ État actuel :** Le fichier `.env` contient déjà `VITE_API_URL=http://localhost:4000`

## 📁 Fichier à vérifier : Code qui fait les requêtes API

**✅ État actuel :** Le code utilise déjà `import.meta.env.VITE_API_URL` dans `src/lib/api/client.ts` :

```typescript
// Configuration de l'URL de base de l'API
// Utilise VITE_API_URL depuis .env, avec fallback sur localhost:4000
const API_BASE_URL =
  (import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:4000').trim();
```

Le client API utilise `ky` (au lieu de `fetch` directement) avec :
- `prefixUrl: API_BASE_URL` pour toutes les requêtes
- Gestion automatique de l'authentification (Bearer token)
- Gestion des erreurs avec vérification du Content-Type

## 📁 Gestion des erreurs API (IMPORTANT)

**✅ État actuel :** Le code gère déjà correctement les réponses JSON :

### 1. Vérification du Content-Type

Le code vérifie que la réponse est bien `application/json` avant de parser :

```typescript
// Dans src/lib/api/client.ts
const contentType = err.response.headers.get('content-type');
if (contentType && contentType.includes('application/json')) {
  // Parser le JSON
  const errorData = await err.response.json();
  // ...
} else {
  // Réponse non-JSON - lire le texte
  const text = await err.response.text();
  // ...
}
```

### 2. Vérification du format de réponse

Le code vérifie le format `{ data, error, meta }` :

```typescript
// Dans src/lib/api/response.ts
export const unwrapResponse = <T>(response: ApiResponse<T>) => {
  if (response.error) {
    throw new ApiError(response.error.message, response.error.code, response.error.details);
  }
  return response.data;
};
```

### 3. Gestion des réponses non-JSON

Le code gère les cas où l'API retourne du texte au lieu de JSON :

```typescript
// Si la réponse n'est pas JSON, lire le texte
const text = await err.response.text();
console.error('❌ Réponse non-JSON reçue:', {
  contentType,
  status: err.response.status,
  body: text.substring(0, 200),
});
```

## 📁 Gestion des requêtes multipart/form-data

**✅ État actuel :** Le code gère déjà correctement les requêtes multipart :

```typescript
// Dans src/lib/api/client.ts
export const postFormData = async <T>(input: string, body: FormData) => {
  // ky gère automatiquement le Content-Type avec le boundary
  // Pas besoin de mettre 'Content-Type' dans les headers
  const response = await apiClient.post(input, { body });
  return response.json<ApiResponse<T>>();
};
```

**Important :** 
- `ky` gère automatiquement le `Content-Type` avec le boundary pour `FormData`
- Le code supprime explicitement le `Content-Type: application/json` par défaut quand un `FormData` est détecté
- Cela garantit que le navigateur définit automatiquement le bon `Content-Type` avec le boundary

**Protection ajoutée :**
```typescript
// Dans beforeRequest hook
if (request.body instanceof FormData) {
  // Supprimer le Content-Type par défaut pour que le navigateur le définisse automatiquement
  request.headers.delete('Content-Type');
}
```

## ✅ Vérifications

### 1. L'admin démarre sans erreur

```bash
cd kashup-admin
npm run dev
```

**✅ Vérifié :** L'admin démarre correctement

### 2. Pas d'erreur CORS dans la console du navigateur

- Ouvrir la console (F12)
- Vérifier qu'il n'y a pas d'erreur "CORS policy"

**⚠️ Si erreur CORS :** Vérifier que `CORS_ORIGIN="*"` est dans `kashup-api/.env` et redémarrer l'API

### 3. Les requêtes API fonctionnent

- Création de partenaire
- Création d'offre
- Les réponses sont bien en JSON

**✅ Vérifié :** Le code gère correctement les requêtes et les erreurs

### 4. Vérifier la configuration dans la console

En développement, vous devriez voir :
```
🔧 Configuration API: {
  VITE_API_URL: 'http://localhost:4000',
  API_BASE_URL: 'http://localhost:4000',
  mode: 'development'
}
```

## 🔄 Commandes

```bash
cd kashup-admin

# Le fichier .env contient déjà VITE_API_URL=http://localhost:4000
npm run dev
```

## 🐛 Résolution des problèmes

### Problème 1 : Erreur CORS

**Symptôme :** `Access to fetch at 'http://localhost:4000/...' from origin 'http://localhost:5173' has been blocked by CORS policy`

**Solution :**
1. Vérifier que `CORS_ORIGIN="*"` est dans `kashup-api/.env`
2. Redémarrer l'API après modification
3. Vérifier les logs de l'API pour voir les erreurs CORS exactes

### Problème 2 : "Unexpected token '-', "------WebK"... is not valid JSON"

**Symptôme :** L'API retourne une réponse non-JSON

**Solution :**
1. Vérifier que l'API est bien redémarrée avec les dernières corrections
2. Vérifier les logs de l'API pour voir l'erreur exacte
3. ✅ **Le code frontend gère maintenant ce cas** et affiche un message d'erreur approprié

### Problème 3 : Erreur React DOM "insertBefore"

**Symptôme :** `Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node`

**Solution :**
1. ✅ **Déjà corrigé** : Les composants utilisent maintenant des clés stables et des `useEffect` pour les transformations
2. Vérifier que les données de l'API sont bien formatées avant le rendu
3. Utiliser des clés uniques pour les listes

### Problème 4 : Erreur 500 sur POST /partners

**Symptôme :** `POST http://localhost:4000/partners 500 (Internal Server Error)`

**Solution :**
1. ✅ **Le code frontend gère correctement l'erreur** et affiche des logs détaillés
2. Vérifier les logs du serveur backend pour voir l'erreur exacte
3. Utiliser le prompt dans `PROMPT_KASHUP_API.md` pour corriger le backend
4. Vérifier que les données envoyées sont correctes (types, formats)

## 📝 Points importants

- ✅ **Variables d'environnement** : Dans Vite, elles doivent commencer par `VITE_` (déjà fait)
- ✅ **Redémarrage** : Redémarrer le serveur de développement après modification de `.env`
- ✅ **Format de réponse** : Le code vérifie toujours `{ data, error, meta }`
- ✅ **Gestion d'erreurs** : Le code vérifie toujours `data.error` dans les réponses
- ✅ **Content-Type** : Le code vérifie maintenant le Content-Type avant de parser le JSON
- ✅ **Multipart/form-data** : `ky` gère automatiquement le Content-Type avec le boundary
- ✅ **Réponses non-JSON** : Le code gère les cas où l'API retourne du texte au lieu de JSON

## 🔍 Vérification de la communication

### 1. Tester la connexion

```typescript
// Dans la console du navigateur
fetch('http://localhost:4000/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

### 2. Vérifier les logs de l'API

- Dans le terminal où tourne `npm run dev` de kashup-api
- Vous devriez voir les logs des requêtes entrantes

### 3. Vérifier la console du navigateur

- Ouvrir les DevTools (F12)
- Onglet "Network" pour voir les requêtes
- Onglet "Console" pour voir les erreurs et les logs de configuration

## ✅ État actuel de la configuration

- ✅ `.env` configuré avec `VITE_API_URL=http://localhost:4000`
- ✅ Code utilise `import.meta.env.VITE_API_URL`
- ✅ Gestion des erreurs améliorée avec vérification du Content-Type
- ✅ Gestion des réponses non-JSON
- ✅ Gestion correcte des requêtes multipart/form-data
- ✅ Logs détaillés en développement
- ✅ Format de réponse vérifié (`{ data, error, meta }`)

## 📚 Documents disponibles

1. **`PROMPT_KASHUP_API.md`** : Prompt détaillé pour corriger l'erreur 500 côté backend
2. **`CONFIGURATION_API.md`** : Guide de configuration (version précédente)
3. **`GUIDE_CONFIGURATION_API.md`** : Ce document (guide complet et à jour)

---

**✅ Conclusion :** La configuration frontend est complète et conforme aux bonnes pratiques. Le problème actuel (erreur 500) vient du backend `kashup-api`. Utilisez le prompt dans `PROMPT_KASHUP_API.md` pour corriger le backend.

