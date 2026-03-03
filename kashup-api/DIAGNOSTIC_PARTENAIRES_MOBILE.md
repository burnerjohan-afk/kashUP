# Diagnostic - Partenaires ne s'affichent pas dans Mobile

## Problèmes Signalés

1. ❌ Les partenaires n'apparaissent pas dans la page partenaire
2. ⚠️ Les éléments apparaissent sur la page de garde (home)
3. ⚠️ Quand on actualise, ça tourne et rien ne remonte

## Structure de Réponse API

### Format Attendu

L'API retourne cette structure pour `GET /api/v1/partners` :

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Liste des partenaires récupérée avec succès",
  "data": {
    "partners": [
      {
        "id": "cmj8sdmge00014y78309dqsye",
        "name": "HITBOX",
        "slug": "hitbox",
        "category": {
          "id": "cmj8sdmge00014y78309dqsye",
          "name": "Loisir"
        },
        "categoryName": "Loisir",
        "logoUrl": "http://192.168.1.19:4000/uploads/partners/.../logo.jpg",
        "imageUrl": "http://192.168.1.19:4000/uploads/partners/.../logo.jpg",
        "imagePath": "/uploads/partners/.../logo.jpg",
        "description": "...",
        "shortDescription": "...",
        "isComplete": true,
        "territories": ["Guyane"],
        "tauxCashbackBase": 5.0,
        // ... autres champs publics
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

### ⚠️ IMPORTANT : Structure de Données

Le mobile doit accéder aux partenaires via :
```typescript
const response = await fetch(`${BASE_URL}/partners`);
const json = await response.json();
const partners = json.data.partners; // ✅ CORRECT
// ❌ PAS json.data directement
// ❌ PAS json.partners
```

## Checklist de Diagnostic

### 1. Vérifier que l'API répond

```bash
# Depuis le terminal
curl http://localhost:4000/api/v1/partners

# Ou depuis le mobile (remplacer <IP_LAN>)
curl http://<IP_LAN>:4000/api/v1/partners
```

**Résultat attendu :** JSON avec `statusCode: 200`, `success: true`, et `data.partners` contenant un array.

### 2. Vérifier la Structure de Réponse

Dans les logs serveur, vous devriez voir :
```
✅ GET /partners - X partenaires retournés en Xms
🔍 Partenaires sérialisés avant envoi
🔍 Structure de réponse finale
```

**Vérifier :**
- `partnersCount` > 0
- `partnersIsArray: true`
- `firstPartnerId` existe

### 3. Vérifier les Logs Serveur

Les logs doivent montrer :
```
LOG [API] GET http://<IP_LAN>:4000/api/v1/partners
LOG [getPartners] 🚀 Démarrage récupération partenaires
LOG [getPartners] 📍 Endpoint: /partners
LOG [getPartners] 🔎 Filtres: aucun
LOG [getPartners] 📄 Page 1, pageSize: 200
✅ GET /partners - X partenaires retournés en Xms
```

### 4. Vérifier le Format des Données

**Problèmes courants :**

#### A. Category est null ou undefined
```typescript
// ❌ MAUVAIS (peut causer "Cannot read property 'split' of undefined")
partner.category.name.split(...)

// ✅ BON
if (partner.category?.name) {
  partner.category.name.split(...)
}
```

**Solution API :** La sérialisation garantit que `category` est toujours un objet `{ id, name }` et `category.name` est toujours une string (même si vide).

#### B. Structure de réponse incorrecte
```typescript
// ❌ MAUVAIS
const partners = response.data; // Si response.data = { partners: [...] }

// ✅ BON
const partners = response.data.partners;
```

#### C. Données mélangées entre endpoints
Si les données apparaissent sur la page de garde, vérifier :
- Que le mobile utilise bien `GET /api/v1/partners` pour la page partenaires
- Que le mobile n'utilise pas un autre endpoint (ex: `/offers`, `/content`) pour la page partenaires
- Que le state management ne mélange pas les données

### 5. Vérifier les Erreurs Côté Mobile

Dans les logs mobile, vérifier :
- ❌ Erreurs de parsing JSON
- ❌ Erreurs "Cannot read property 'X' of undefined"
- ❌ Timeouts
- ❌ Erreurs réseau

### 6. Vérifier le Cache et le State

Si les données apparaissent au chargement mais disparaissent après actualisation :
- Vérifier le cache du mobile
- Vérifier le state management (Redux, Zustand, etc.)
- Vérifier que les données ne sont pas écrasées

## Solutions

### Solution 1 : Vérifier l'Accès aux Données

Dans le code mobile, s'assurer que :

```typescript
// ✅ CORRECT
const fetchPartners = async () => {
  try {
    const response = await fetch(`${BASE_URL}/partners`);
    const json = await response.json();
    
    if (json.success && json.data?.partners) {
      // json.data.partners est un array
      setPartners(json.data.partners);
    } else {
      console.error('Structure de réponse invalide:', json);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des partenaires:', error);
  }
};
```

### Solution 2 : Vérifier la Sérialisation

Si les partenaires sont vides après sérialisation, vérifier les logs serveur :
```
🔍 Partenaires sérialisés avant envoi
```

Si `partnersCount: 0` alors que `result.data.length > 0`, il y a un problème de sérialisation.

### Solution 3 : Vérifier les Filtres

Si aucun partenaire n'est retourné, vérifier :
- Les filtres appliqués (category, territory, etc.)
- Le statut des partenaires (peut-être filtrés par `status: 'active'`)
- La pagination (peut-être page 1 vide mais page 2 a des données)

### Solution 4 : Vérifier les Timeouts

Si "ça tourne et rien ne remonte" :
- Vérifier que l'API répond (test avec curl)
- Vérifier les timeouts (25s serveur, 30s client)
- Vérifier les logs serveur pour voir si la requête arrive

## Commandes de Test

### Test API Direct

```powershell
# Test depuis le PC
curl.exe http://localhost:4000/api/v1/partners

# Test avec IP LAN (remplacer <IP_LAN>)
curl.exe http://<IP_LAN>:4000/api/v1/partners

# Test avec pagination
curl.exe "http://localhost:4000/api/v1/partners?page=1&pageSize=10"
```

### Test avec Logs Détaillés

Dans le code mobile, ajouter :

```typescript
const response = await fetch(`${BASE_URL}/partners`);
const json = await response.json();

console.log('📊 Réponse complète:', JSON.stringify(json, null, 2));
console.log('📊 Structure:', {
  hasData: !!json.data,
  hasPartners: !!json.data?.partners,
  partnersIsArray: Array.isArray(json.data?.partners),
  partnersCount: json.data?.partners?.length || 0,
  firstPartner: json.data?.partners?.[0]
});
```

## Prochaines Étapes

1. ✅ Vérifier les logs serveur au moment de la requête
2. ✅ Tester l'endpoint avec curl pour voir la structure exacte
3. ✅ Vérifier les logs mobile pour voir ce qui est reçu
4. ✅ Comparer la structure attendue vs reçue
5. ✅ Vérifier que le mobile accède bien à `json.data.partners` et non `json.data`

## Logs à Surveiller

### Côté Serveur
- `✅ GET /partners - X partenaires retournés`
- `🔍 Partenaires sérialisés avant envoi`
- `🔍 Structure de réponse finale`

### Côté Mobile
- Structure de la réponse reçue
- Erreurs de parsing
- Erreurs "Cannot read property"
- Timeouts

---

**Si le problème persiste, fournir :**
1. Les logs serveur complets lors d'une requête
2. La structure JSON exacte retournée par l'API (via curl)
3. Les logs mobile lors de la récupération
4. Le code mobile qui consomme l'API

