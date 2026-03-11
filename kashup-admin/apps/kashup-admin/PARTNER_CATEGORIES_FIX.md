# Correction des catégories de partenaires

## Problème identifié

- Erreur 404 lors de la création d'un partenaire
- L'API attend des catégories sous forme de **slugs** (ex: `"loisir"`, `"beaute-et-bien-etre"`)
- Le frontend envoyait des **labels** (ex: `"Loisir"`, `"Beauté et Bien-être"`)

## Solution implémentée

### 1. Fonction utilitaire `toSlug()`

**Fichier** : `src/lib/utils/slug.ts`

- Convertit les labels UI en slugs API
- Mapping explicite pour toutes les catégories
- Génération automatique de slug si non mappé
- Validation des slugs valides

**Exemples de transformation** :
- `"Loisir"` → `"loisir"`
- `"Beauté et Bien-être"` → `"beaute-et-bien-etre"`
- `"Mobilité"` → `"mobilite"`
- `"Électronique"` → `"electronique"`

### 2. Normalisation automatique

**Fichier** : `src/features/partners/api.ts`

- Les catégories sont normalisées **avant** l'envoi à l'API
- Fonction `normalizeCategories()` appliquée dans :
  - `serializePartnerToFormData()` (création)
  - `serializePartnerUpdateToFormData()` (mise à jour)

### 3. Endpoint corrigé

- **Tentative 1** : `POST /admin/partners` (endpoint admin)
- **Fallback** : `POST /partners` (si 404 sur admin)

### 4. Logs de débogage

En développement, les logs affichent :
```javascript
📋 Catégories normalisées: {
  'Catégories UI (labels)': ['Loisir', 'Beauté et Bien-être'],
  'Catégories API (slugs)': ['loisir', 'beaute-et-bien-etre']
}
```

## Catégories valides

Les slugs suivants sont acceptés par l'API :

1. `restauration`
2. `loisir`
3. `beaute-et-bien-etre`
4. `mobilite`
5. `culture`
6. `sport`
7. `mode`
8. `services`
9. `electronique`
10. `retails`

## Exemple de payload final

**Avant** (incorrect) :
```json
{
  "categories": ["Loisir", "Beauté et Bien-être"]
}
```

**Après** (correct) :
```json
{
  "categories": ["loisir", "beaute-et-bien-etre"]
}
```

## Fichiers modifiés

1. ✅ `src/lib/utils/slug.ts` (nouveau)
   - Fonction `toSlug()`
   - Fonction `normalizeCategories()`
   - Mapping des catégories

2. ✅ `src/features/partners/api.ts`
   - Normalisation dans `serializePartnerToFormData()`
   - Normalisation dans `serializePartnerUpdateToFormData()`
   - Gestion de l'endpoint `/admin/partners` avec fallback
   - Logs de débogage ajoutés

## Résultat

- ✅ Les catégories sont automatiquement converties en slugs
- ✅ L'endpoint `/admin/partners` est tenté en premier
- ✅ Fallback vers `/partners` si nécessaire
- ✅ Logs clairs pour le débogage
- ✅ Aucune modification de l'UX nécessaire

