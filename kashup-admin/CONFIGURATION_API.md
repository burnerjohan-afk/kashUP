# Configuration de la communication avec kashup-api

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

## 📁 Fichier à vérifier : Code qui fait les requêtes API

Le code utilise déjà `import.meta.env.VITE_API_URL` dans `src/lib/api/client.ts` :

```typescript
// Configuration de l'URL de base de l'API
const API_BASE_URL =
  (import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:4000').trim();
```

Le client API (`ky`) est configuré avec :
- `prefixUrl: API_BASE_URL` pour toutes les requêtes
- Gestion automatique de l'authentification (Bearer token)
- Gestion des erreurs avec vérification du Content-Type

## 📁 Gestion des erreurs API

✅ **Le code gère déjà correctement les réponses JSON** :

1. **Vérification du Content-Type** : Le code vérifie que la réponse est bien `application/json` avant de parser
2. **Format de réponse** : Le code vérifie le format `{ data, error, meta }`
3. **Réponses non-JSON** : Le code gère les cas où l'API retourne du texte au lieu de JSON
4. **Erreurs réseau** : Le code détecte les erreurs de connexion et retourne des messages clairs

### Exemple de gestion d'erreur dans le code actuel

```typescript
// Dans src/lib/api/client.ts
export const getJson = async <T>(input: string, searchParams?: Record<string, string | number | boolean>) => {
  try {
    const response = await apiClient.get(input, { searchParams });
    return response.json<ApiResponse<T>>();
  } catch (error) {
    // Vérification du Content-Type
    const contentType = err.response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const errorData = await err.response.json();
      // Vérifier le format { data, error, meta }
      if (errorData.error) {
        return {
          data: undefined,
          error: {
            message: errorData.error.message,
            code: errorData.error.code,
            details: errorData.error.details,
          },
        };
      }
    } else {
      // Réponse non-JSON
      const text = await err.response.text();
      // Gérer l'erreur...
    }
  }
};
```

## ✅ Vérifications

### 1. L'admin démarre sans erreur

```bash
cd kashup-admin
npm run dev
```

### 2. Pas d'erreur CORS dans la console du navigateur

- Ouvrir la console (F12)
- Vérifier qu'il n'y a pas d'erreur "CORS policy"
- Si erreur CORS : Vérifier que `CORS_ORIGIN="*"` est dans `kashup-api/.env`

### 3. Les requêtes API fonctionnent

- Création de partenaire
- Création d'offre
- Les réponses sont bien en JSON

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

# Modifier .env avec VITE_API_URL=http://localhost:4000
# (déjà fait si vous avez suivi les instructions précédentes)

npm run dev
```

## 🐛 Résolution des problèmes

### Problème 1 : Erreur CORS

**Solution :**
1. Vérifier que `CORS_ORIGIN="*"` est dans `kashup-api/.env`
2. Redémarrer l'API après modification
3. Vérifier que l'URL dans `VITE_API_URL` correspond à l'URL de l'API

### Problème 2 : "Unexpected token '-', "------WebK"... is not valid JSON"

**Cause :** L'API retourne une réponse non-JSON (probablement du HTML ou du texte brut)

**Solution :**
1. Vérifier que l'API est bien redémarrée avec les dernières corrections
2. Vérifier les logs de l'API pour voir l'erreur exacte
3. Le code frontend gère maintenant ce cas et affiche un message d'erreur approprié

### Problème 3 : Erreur React DOM "insertBefore"

**Cause :** Problème de rendu React, souvent lié à un état qui change pendant le rendu

**Solution :**
1. Vérifier les composants qui utilisent des conditions ternaires
2. Vérifier que les données de l'API sont bien formatées avant le rendu
3. Utiliser `useEffect` pour les transformations de données

### Problème 4 : Erreur 500 "Erreur interne inattendue"

**Cause :** Erreur côté backend `kashup-api`

**Solution :**
1. Vérifier les logs du serveur backend
2. Utiliser le prompt dans `PROMPT_KASHUP_API.md` pour corriger le backend
3. Vérifier que le format des données envoyées correspond à ce que le backend attend

## 📝 Points importants

- **Variables d'environnement** : Dans Vite, elles doivent commencer par `VITE_`
- **Redémarrage** : Redémarrer le serveur de développement après modification de `.env`
- **Format de réponse** : L'API retourne toujours `{ data, error, meta }`
- **Gestion d'erreurs** : Le code vérifie toujours `data.error` dans les réponses
- **Content-Type** : Le code vérifie maintenant le Content-Type avant de parser le JSON
- **Réponses non-JSON** : Le code gère les cas où l'API retourne du texte au lieu de JSON

## ✅ État actuel de la configuration

- ✅ `.env` configuré avec `VITE_API_URL=http://localhost:4000`
- ✅ Code utilise `import.meta.env.VITE_API_URL`
- ✅ Gestion des erreurs améliorée avec vérification du Content-Type
- ✅ Gestion des réponses non-JSON
- ✅ Logs détaillés en développement

## 🔍 Vérification rapide

1. **Console du navigateur** : Vérifier qu'il n'y a pas d'erreur CORS
2. **Logs de configuration** : Vérifier que `VITE_API_URL` est bien `http://localhost:4000`
3. **Requêtes API** : Tester la création d'un partenaire et vérifier les logs

