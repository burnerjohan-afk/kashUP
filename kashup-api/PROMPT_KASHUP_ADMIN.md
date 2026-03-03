#### 📁 Fichier à vérifier : Code qui fait les requêtes API

Assurez-vous que le code utilise `import.meta.env.VITE_API_URL` :
 🔧 Prompt pour KASHUP-ADMIN

## Configuration de la communication avec kashup-api

### Objectif
Configurer kashup-admin pour communiquer avec kashup-api et gérer correctement les erreurs.

### 📁 Fichier à modifier : `.env` ou `.env.local`

```env
# URL de l'API backend
VITE_API_URL=http://localhost:4000
# OU en production :
# VITE_API_URL=https://api.kashup.com

# URL de base (optionnel)
VITE_BASE_URL=http://localhost:5173
```


```typescript
// Exemple dans src/config/api.ts ou similaire
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Dans vos requêtes
fetch(`${API_BASE_URL}/partners`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(data)
});
```

### 📁 Gestion des erreurs API (IMPORTANT)

**Vérifiez que votre code gère correctement les réponses JSON** :

```typescript
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
  
  // Vérifier le format de réponse de l'API
  // L'API retourne toujours { data, error, meta }
  if (data.error) {
    throw new Error(data.error.message || 'Erreur API');
  }
  
  if (!response.ok) {
    throw new Error(data.error?.message || `Erreur ${response.status}`);
  }
  
  return data;
}
```

### 📁 Gestion des requêtes multipart/form-data

**Pour les requêtes avec fichiers (partenaires, offres)** :

```typescript
export async function apiRequestWithFiles(
  endpoint: string, 
  formData: FormData, 
  token: string
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      // NE PAS mettre 'Content-Type' : le navigateur le fera automatiquement avec le boundary
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData
  });
  
  // Vérifier que la réponse est bien du JSON
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Réponse non-JSON reçue: ${text.substring(0, 100)}`);
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.message || 'Erreur API');
  }
  
  if (!response.ok) {
    throw new Error(data.error?.message || `Erreur ${response.status}`);
  }
  
  return data;
}
```

### ⚠️ PROBLÈME CRITIQUE : Content-Type avec FormData

**Si vous recevez l'erreur : `Content-Type incorrect : la requête contient du multipart/form-data mais le header indique application/json`**

Cela signifie que votre code définit manuellement le header `Content-Type: application/json` alors que vous envoyez un `FormData`.

**❌ MAUVAIS (ne pas faire)** :
```typescript
const formData = new FormData();
formData.append('title', 'Mon offre');
formData.append('image', file);

fetch(`${API_BASE_URL}/offers`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json', // ❌ NE PAS FAIRE ÇA avec FormData !
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**✅ BON (faire comme ça)** :
```typescript
const formData = new FormData();
formData.append('title', 'Mon offre');
formData.append('image', file);

fetch(`${API_BASE_URL}/offers`, {
  method: 'POST',
  headers: {
    // ✅ NE PAS mettre 'Content-Type' - le navigateur le fait automatiquement
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

**Règle d'or** :
- ✅ Avec `FormData` → Ne pas définir `Content-Type` dans les headers
- ✅ Avec `JSON.stringify()` → Définir `Content-Type: application/json`

**Comment vérifier dans votre code** :
1. Cherchez tous les endroits où vous utilisez `FormData`
2. Vérifiez que vous ne définissez PAS `Content-Type` dans les headers
3. Si vous utilisez une fonction utilitaire, vérifiez qu'elle ne force pas `Content-Type: application/json`
4. Utilisez les DevTools (F12) → Network pour voir le Content-Type réel envoyé

**Exemple de fonction utilitaire CORRECTE** :
```typescript
export async function apiRequestWithFiles(
  endpoint: string, 
  formData: FormData, 
  token: string
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      // ✅ Pas de 'Content-Type' ici - le navigateur l'ajoute automatiquement avec le boundary
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData
  });
  // ... reste du code
}
```

**Exemple de fonction utilitaire INCORRECTE** :
```typescript
export async function apiRequestWithFiles(
  endpoint: string, 
  formData: FormData, 
  token: string
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', // ❌ NE JAMAIS FAIRE ÇA avec FormData !
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: formData
  });
  // ... reste du code
}
```

### ✅ Vérifications

1. **L'admin démarre sans erreur** :
   ```bash
   npm run dev
   ```

2. **Pas d'erreur CORS dans la console du navigateur**
   - Ouvrir la console (F12)
   - Vérifier qu'il n'y a pas d'erreur "CORS policy"

3. **Les requêtes API fonctionnent** :
   - Création de partenaire
   - Création d'offre
   - Les réponses sont bien en JSON

### 🔄 Commandes

```bash
cd kashup-admin
# Modifier .env avec VITE_API_URL=http://localhost:4000
npm run dev
```

### 🐛 Résolution des problèmes

#### Problème 1 : Erreur CORS
**Symptôme** : `Access to fetch at 'http://localhost:4000/...' from origin 'http://localhost:5173' has been blocked by CORS policy`

**Solution** :
1. Vérifier que `CORS_ORIGIN="*"` est dans `kashup-api/.env`
2. Redémarrer l'API après modification
3. Vérifier les logs de l'API pour voir les erreurs CORS exactes

#### Problème 2 : "Unexpected token '-', "------WebK"... is not valid JSON"
**Symptôme** : L'API retourne une réponse non-JSON

**Solution** :
1. Vérifier que l'API est bien redémarrée avec les dernières corrections
2. Vérifier les logs de l'API pour voir l'erreur exacte
3. Vérifier que votre code gère correctement les réponses JSON (voir section "Gestion des erreurs API")

#### Problème 3 : Erreur React DOM "insertBefore"
**Symptôme** : `Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node`

**Solution** :
1. Problème de rendu React, souvent lié à un état qui change pendant le rendu
2. Vérifier les composants qui utilisent des conditions ternaires
3. Vérifier que les données de l'API sont bien formatées avant le rendu
4. Utiliser des clés uniques pour les listes
5. Vérifier que les conditions ternaires sont bien formatées :
   ```tsx
   // ❌ Mauvais
   {condition
   ? 'Texte 1'
   : 'Texte 2'}
   
   // ✅ Bon
   {(condition
     ? 'Texte 1'
     : 'Texte 2')}
   ```

#### Problème 4 : Erreur 500 sur POST /offers ou POST /partners
**Symptôme** : `POST http://localhost:4000/offers 500 (Internal Server Error)`

**Solution** :
1. Vérifier que l'API est bien redémarrée avec les dernières corrections
2. Vérifier les logs de l'API pour voir l'erreur exacte
3. Vérifier que les données envoyées sont correctes (types, formats)
4. Vérifier que le Content-Type est correct pour les requêtes multipart

### 📝 Points importants

- **Variables d'environnement** : Dans Vite, elles doivent commencer par `VITE_`
- **Redémarrage** : Redémarrer le serveur de développement après modification de `.env`
- **Format de réponse** : L'API retourne toujours `{ data, error, meta }`
- **Gestion d'erreurs** : Toujours vérifier `data.error` dans les réponses
- **Multipart/form-data** : Ne pas mettre `Content-Type` dans les headers, le navigateur le fait automatiquement
- **JSON** : Toujours vérifier que la réponse est bien du JSON avant de la parser

### 🔍 Vérification de la communication

1. **Tester la connexion** :
   ```typescript
   // Dans la console du navigateur ou dans votre code
   fetch('http://localhost:4000/health')
     .then(r => r.json())
     .then(console.log)
     .catch(console.error);
   ```

2. **Vérifier les logs de l'API** :
   - Dans le terminal où tourne `npm run dev` de kashup-api
   - Vous devriez voir les logs des requêtes entrantes

3. **Vérifier la console du navigateur** :
   - Ouvrir les DevTools (F12)
   - Onglet "Network" pour voir les requêtes
   - Onglet "Console" pour voir les erreurs

---

**Ce prompt est prêt à être utilisé dans kashup-admin pour configurer la communication avec kashup-api.**
