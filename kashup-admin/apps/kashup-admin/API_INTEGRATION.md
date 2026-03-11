# 🔧 Intégration kashup-admin avec kashup-api

## 📋 Résumé des modifications

Ce document décrit les modifications apportées à **kashup-admin** pour garantir une communication parfaite avec **kashup-api** selon le nouveau format de réponse standardisé.

---

## 🔐 1. Configuration

### Variables d'environnement

Le projet utilise `VITE_API_BASE_URL` ou `VITE_API_URL` (pour compatibilité) :

```env
# .env
VITE_API_BASE_URL=http://localhost:4000
# ou
VITE_API_URL=http://localhost:4000
```

**⚠️ IMPORTANT :** 
- Utiliser `VITE_` comme préfixe pour les variables accessibles côté client dans Vite
- Ne JAMAIS exposer de secrets (JWT_SECRET, etc.) dans les variables `VITE_`

---

## 📡 2. Format de réponse API standardisé

**Tous les endpoints retournent maintenant le format suivant :**

```typescript
interface StandardResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T | null;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
    details?: {
      code?: string;
      fieldErrors?: Record<string, string[]>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}
```

### Exemple de réponse réussie

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Liste des partenaires récupérée avec succès",
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Exemple de réponse d'erreur

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Paramètres de requête invalides",
  "data": null,
  "meta": {
    "details": {
      "code": "VALIDATION_ERROR",
      "fieldErrors": {
        "territories": ["Au moins un territoire doit être sélectionné"],
        "name": ["Le nom doit contenir au moins 2 caractères"]
      }
    }
  }
}
```

---

## 🔑 3. Modifications des fichiers

### 3.1. Types API (`src/types/api.ts`)

- ✅ Ajout du type `StandardResponse<T>` pour le nouveau format
- ✅ Conservation de `ApiResponse<T>` pour compatibilité (marqué comme `@deprecated`)
- ✅ Mise à jour du type `pagination` pour correspondre au nouveau format

### 3.2. Client API (`src/lib/api/client.ts`)

- ✅ Ajout de `getStandardJson()`, `postStandardJson()`, `patchStandardJson()` pour le nouveau format
- ✅ Fonction `cleanSearchParams()` pour filtrer les paramètres vides (`undefined`, `null`, `''`, `'all'` pour territory)
- ✅ Support automatique de `FormData` sans définition manuelle de `Content-Type`
- ✅ Gestion d'erreurs améliorée avec conversion en `StandardResponse`

### 3.3. Gestion des réponses (`src/lib/api/response.ts`)

- ✅ Ajout de `unwrapStandardResponse()` pour dérouler les réponses `StandardResponse`
- ✅ Mise à jour de `ApiError` pour inclure `statusCode` et `fieldErrors`
- ✅ Conservation de `unwrapResponse()` pour compatibilité (marqué comme `@deprecated`)

### 3.4. API Partenaires (`src/features/partners/api.ts`)

#### `fetchPartners()`

- ✅ Utilise `getStandardJson()` et `unwrapStandardResponse()`
- ✅ Retourne `PartnersResponse` avec `partners` et `pagination`
- ✅ Support des nouveaux paramètres : `categoryId`, `page`, `limit`
- ✅ Transformation automatique des objets `category` et `territories` en strings

#### `createPartner()` et `updatePartner()`

- ✅ Utilise `postStandardJson()` et `patchStandardJson()`
- ✅ Envoie `territories` comme **JSON string** : `JSON.stringify(["Martinique"])`
- ✅ Envoie `marketingPrograms` comme **JSON string** : `JSON.stringify(["pepites", "boosted"])`
- ✅ Support de `categoryId` (CUID) ou `category` (nom)
- ✅ Conversion automatique des territoires en format API (première lettre majuscule)

#### `fetchPartnerById()` et `fetchPartnerCategories()`

- ✅ Utilise `getStandardJson()` et `unwrapStandardResponse()`
- ✅ Transformation automatique des objets en strings

### 3.5. API Statistiques Admin (`src/api/admin.ts`)

#### `getStatisticsTable()`

- ✅ Utilise `getStandardJson()` et `unwrapStandardResponse()`
- ✅ Gère le nouveau format `{ rows, totals, filters }`
- ✅ Retourne un tableau vide en cas d'erreur (évite les crashes)

#### `getStatisticsDepartments()`

- ✅ Utilise `getStandardJson()` et `unwrapStandardResponse()`
- ✅ Support du paramètre `territory` (optionnel)
- ✅ Retourne un tableau vide en cas d'erreur

#### `getAiAnalysis()`

- ✅ Utilise `getStandardJson()` et `unwrapStandardResponse()`
- ✅ Retourne une analyse vide en cas d'erreur

### 3.6. Page Partenaires (`src/features/partners/pages/partners-page.tsx`)

- ✅ Gestion de la pagination avec `pagination` depuis `PartnersResponse`
- ✅ Affichage des boutons "Précédent" / "Suivant" si disponibles
- ✅ Gestion d'erreurs améliorée avec affichage des `fieldErrors` par champ
- ✅ Support des états de chargement et d'erreur

---

## 📊 4. Endpoints utilisés

### GET /partners

**Query Parameters (tous optionnels) :**

| Paramètre | Type | Description | Valeurs possibles | Défaut |
|-----------|------|-------------|-------------------|--------|
| `search` | string | Recherche textuelle | Texte libre | - |
| `categoryId` | string | ID de la catégorie (CUID) | CUID valide | - |
| `category` | string | Nom de la catégorie | Nom de catégorie | - |
| `territory` | string | Territoire | `'martinique'`, `'guadeloupe'`, `'guyane'` | - |
| `page` | number | Numéro de page | ≥ 1 | `1` |
| `limit` | number | Nombre d'éléments par page | 1-100 | `20` |
| `sortBy` | string | Champ de tri | `'name'`, `'createdAt'`, `'updatedAt'`, `'tauxCashbackBase'` | `'name'` |
| `sortOrder` | string | Ordre de tri | `'asc'`, `'desc'` | `'desc'` |

**⚠️ IMPORTANT :**
- `territory='all'` : Non envoyé (filtre ignoré)
- `category=''` : Non envoyé (filtre ignoré)
- `search=''` : Non envoyé (filtre ignoré)
- Tous les paramètres vides sont automatiquement filtrés

### POST /partners

**Content-Type :** `multipart/form-data` (géré automatiquement par le navigateur)

**Champs importants :**

| Champ | Type | Format | Exemple |
|-------|------|--------|---------|
| `territories` | string (JSON) | Array JSON string | `["Martinique"]` ou `["Martinique", "Guadeloupe"]` |
| `marketingPrograms` | string (JSON) | Array JSON string | `["pepites", "boosted"]` |
| `categoryId` ou `category` | string | CUID ou nom | `"clx123..."` ou `"Restaurant"` |

**⚠️ CRITIQUE :** 
- Ne JAMAIS définir manuellement `Content-Type: application/json` quand vous envoyez `FormData`
- Le navigateur le définit automatiquement avec le bon `boundary`

### PATCH /partners/:id

Même format que POST, mais tous les champs sont optionnels.

### GET /admin/statistics/table

**Query Parameters (tous optionnels) :**

| Paramètre | Type | Description | Valeurs possibles |
|-----------|------|-------------|-------------------|
| `territory` | string | Territoire | `'martinique'`, `'guadeloupe'`, `'guyane'` |
| `allDay` | string | Filtrer sur toute la journée | `'true'`, `'false'` |
| `timeSlot` | string | Créneau horaire | `'morning'`, `'afternoon'`, `'evening'`, `'night'` |
| `gender` | string | Genre | `'M'`, `'F'`, `'other'` |
| `ageRange` | string | Tranche d'âge | `'18-25'`, `'26-35'`, `'36-45'`, `'46-55'`, `'56+'` |

**Réponse :**

```typescript
{
  rows: StatisticsTableRow[];
  totals?: {
    count: number;
    transactions: number;
    revenue: number;
    cashback: number;
    averageTransaction: number;
  };
  filters?: {...};
}
```

### GET /admin/statistics/departments

**Query Parameters :**

| Paramètre | Type | Description | Valeurs possibles |
|-----------|------|-------------|-------------------|
| `territory` | string | Territoire | `'martinique'`, `'guadeloupe'`, `'guyane'` |

### GET /admin/ai/analysis

**Query Parameters :**

| Paramètre | Type | Description | Valeurs possibles |
|-----------|------|-------------|-------------------|
| `territory` | string | Territoire | `'martinique'`, `'guadeloupe'`, `'guyane'` |
| `startDate` | string | Date de début | ISO 8601 (ex: `2024-01-01`) |
| `endDate` | string | Date de fin | ISO 8601 (ex: `2024-12-31`) |

---

## ⚠️ 5. Points critiques à respecter

### 5.1. Gestion des paramètres vides

**❌ NE PAS ENVOYER :**

```
/partners?territory=&category=&search=
```

**✅ ENVOYER :**

```
/partners?territory=all&category=&search=
```

ou simplement :

```
/partners
```

**Solution :** Les paramètres vides sont automatiquement filtrés par `cleanSearchParams()` dans `getStandardJson()`.

### 5.2. Format FormData pour les partenaires

**❌ INCORRECT :**

```typescript
const formData = new FormData();
formData.append('name', 'Test');
formData.append('territories', 'Martinique'); // ❌ Doit être un array JSON

fetch('/partners', {
  headers: {
    'Content-Type': 'application/json', // ❌ Ne pas définir avec FormData
  },
  body: formData
});
```

**✅ CORRECT :**

```typescript
const formData = new FormData();
formData.append('name', 'Test');
formData.append('categoryId', 'xxx');
formData.append('territories', JSON.stringify(['Martinique'])); // ✅ Array JSON string
formData.append('logo', file);

fetch('/partners', {
  headers: {
    // ✅ Ne PAS définir Content-Type - le navigateur le fait automatiquement
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### 5.3. Gestion des erreurs

**Toujours vérifier `response.success` :**

```typescript
try {
  const response = await getStandardJson('/partners');
  
  if (response.success && response.data) {
    // Utiliser response.data
    const partners = response.data;
    const pagination = response.meta?.pagination;
  } else {
    // Gérer l'erreur
    console.error('Erreur:', response.message);
  }
} catch (error: any) {
  // Erreur réseau ou erreur HTTP
  if (error.statusCode === 400) {
    // Erreur de validation
    const fieldErrors = error.fieldErrors;
    // Afficher les erreurs de validation à l'utilisateur
  } else if (error.statusCode === 401) {
    // Non authentifié - rediriger vers login
    router.push('/login');
  } else if (error.statusCode === 500) {
    // Erreur serveur
    showError('Une erreur serveur est survenue. Veuillez réessayer plus tard.');
  }
}
```

### 5.4. Pagination

**Utiliser les métadonnées de pagination :**

```typescript
const response = await fetchPartners({ page: 1, limit: 20 });

if (response.partners && response.pagination) {
  const partners = response.partners;
  const pagination = response.pagination;
  
  // pagination contient :
  // - page: numéro de page actuelle
  // - limit: nombre d'éléments par page
  // - total: nombre total d'éléments
  // - totalPages: nombre total de pages
  // - hasNext: y a-t-il une page suivante
  // - hasPrev: y a-t-il une page précédente
}
```

---

## 🧪 6. Tests à effectuer

### Test 1 : Liste des partenaires

```typescript
// Test avec tous les paramètres
const test1 = await fetchPartners({
  territory: 'all',
  category: '',
  search: '',
  sortOrder: 'desc',
  page: 1,
  limit: 20
});
// ✅ Doit retourner { partners: [...], pagination: {...} }

// Test avec territoire spécifique
const test2 = await fetchPartners({
  territory: 'martinique',
  sortOrder: 'desc'
});
// ✅ Doit retourner uniquement les partenaires de Martinique
```

### Test 2 : Création de partenaire

```typescript
const formData = new FormData();
formData.append('name', 'Test Partner');
formData.append('categoryId', 'xxx');
formData.append('territories', JSON.stringify(['Martinique']));
formData.append('logo', file);

const result = await createPartner(payload);
// ✅ Doit retourner statusCode: 201, success: true, data: PartnerDTO
```

### Test 3 : Statistiques admin

```typescript
// Test avec territory=all
const stats1 = await getStatisticsTable({ territory: 'all' });
// ✅ Doit retourner statusCode: 200, success: true

// Test avec territoire spécifique
const stats2 = await getStatisticsTable({ territory: 'martinique' });
// ✅ Doit retourner les stats pour Martinique uniquement
```

---

## 📝 7. Checklist de vérification

Avant de déployer, vérifier que :

- [ ] `VITE_API_BASE_URL` ou `VITE_API_URL` est correctement configuré dans `.env`
- [ ] Le token JWT est stocké et envoyé dans le header `Authorization: Bearer <token>`
- [ ] Les requêtes avec `FormData` ne définissent PAS `Content-Type` manuellement
- [ ] Les paramètres vides (`''`, `null`, `undefined`) sont filtrés avant l'envoi
- [ ] `territory='all'` n'est pas envoyé (filtré automatiquement)
- [ ] Les arrays (`territories`, `marketingPrograms`) sont envoyés comme JSON strings
- [ ] Les erreurs sont gérées avec `try/catch` et vérification de `response.success`
- [ ] La pagination est utilisée avec `response.meta.pagination`
- [ ] Tous les endpoints admin nécessitent l'authentification

---

## 🎯 8. Résumé des corrections apportées

1. ✅ **Format de réponse standardisé** : Tous les endpoints utilisent `StandardResponse<T>`
2. ✅ **Gestion des paramètres vides** : Filtrage automatique par `cleanSearchParams()`
3. ✅ **Validation robuste** : Support des `fieldErrors` dans les réponses d'erreur
4. ✅ **Gestion d'erreurs améliorée** : Erreurs 400 pour validation, 500 pour erreurs serveur
5. ✅ **Pagination** : Support complet avec `meta.pagination`
6. ✅ **Tri** : Support de `sortBy` et `sortOrder` avec valeurs par défaut
7. ✅ **Territories** : Support de `territories` (array JSON string) au lieu de `territory` (string unique)
8. ✅ **FormData** : Gestion correcte de `multipart/form-data` pour les uploads
9. ✅ **CategoryId** : Support de `categoryId` (CUID) en plus de `category` (nom)

---

## 🚀 9. Démarrage rapide

1. **Configurer `.env` :**

   ```env
   VITE_API_BASE_URL=http://localhost:4000
   ```

2. **Utiliser les nouvelles fonctions :**

   ```typescript
   import { fetchPartners, createPartner } from '@/features/partners/api';
   import { getStatisticsTable } from '@/api/admin';
   
   // Liste des partenaires avec pagination
   const { partners, pagination } = await fetchPartners({ 
     territory: 'all', 
     sortOrder: 'desc',
     page: 1,
     limit: 20
   });
   
   // Statistiques
   const stats = await getStatisticsTable({ territory: 'all' });
   ```

3. **Gérer les erreurs :**

   ```typescript
   try {
     const response = await fetchPartners();
     if (response.partners) {
       // Utiliser response.partners
     }
   } catch (error) {
     // Gérer l'erreur selon error.statusCode
   }
   ```

---

**✅ Avec cette configuration, toutes les connexions entre kashup-admin et kashup-api fonctionneront parfaitement sans erreurs 400, 404 ou 500.**

