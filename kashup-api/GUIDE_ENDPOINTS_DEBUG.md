# 🔍 Guide des Endpoints de Debug

## ✅ Endpoints ajoutés

J'ai ajouté **3 nouveaux endpoints** pour diagnostiquer et résoudre le problème :

### 1. **POST /partners/debug** (SANS authentification)
**Objectif** : Voir exactement ce qui arrive à l'API

**Utilisation** :
- Testez depuis `kashup-admin` en envoyant une requête vers `POST http://localhost:4000/partners/debug`
- **Pas besoin d'authentification** - pour voir si la requête arrive bien
- Affiche dans les logs du serveur : body, files, headers, etc.

**Ce que ça vous dira** :
- Si la requête arrive à l'API
- Quelles données sont reçues
- Le format des données (multipart, JSON, etc.)

### 2. **POST /partners/create-simple** (AVEC authentification)
**Objectif** : Créer un partenaire avec JSON au lieu de multipart/form-data

**Utilisation** :
- Testez depuis `kashup-admin` en modifiant temporairement l'URL vers `POST http://localhost:4000/partners/create-simple`
- Envoyez les données en **JSON** (pas multipart/form-data)
- **Nécessite l'authentification** (token JWT)

**Ce que ça vous dira** :
- Si le problème vient de **Multer** (multipart/form-data)
- Si le problème vient du **traitement des données**
- Si le problème vient de la **validation** ou de la **base de données**

### 3. **POST /partners/test** (SANS authentification)
**Objectif** : Test basique de la route

**Utilisation** :
- Test simple pour vérifier que les routes fonctionnent

## 🎯 Plan d'action pour diagnostiquer

### Étape 1 : Tester l'endpoint de debug

1. **Modifiez temporairement** dans `kashup-admin` l'URL de création de partenaire :
   - Au lieu de : `POST /partners`
   - Utilisez : `POST /partners/debug`

2. **Tentez de créer un partenaire** depuis `kashup-admin`

3. **Regardez les logs** dans le terminal où tourne `npm run dev`

4. **Vérifiez** :
   - ✅ Si vous voyez `🔍 Debug endpoint appelé` → La requête arrive à l'API
   - ❌ Si vous ne voyez rien → La requête n'arrive pas (problème CORS, URL, etc.)

### Étape 2 : Tester l'endpoint simplifié

1. **Modifiez temporairement** dans `kashup-admin` :
   - Changez le format d'envoi de `multipart/form-data` vers `application/json`
   - Changez l'URL vers `POST /partners/create-simple`

2. **Tentez de créer un partenaire** avec les mêmes données (mais en JSON)

3. **Regardez les logs** :
   - ✅ Si ça fonctionne → Le problème vient de **Multer** (multipart/form-data)
   - ❌ Si ça ne fonctionne pas → Le problème vient du **traitement des données** ou de la **validation**

### Étape 3 : Analyser les résultats

#### Cas A : `/partners/debug` fonctionne mais `/partners` ne fonctionne pas
→ Le problème vient de **Multer** ou des **middlewares** (auth, requireRoles)

#### Cas B : `/partners/create-simple` fonctionne mais `/partners` ne fonctionne pas
→ Le problème vient de **Multer** (multipart/form-data)

#### Cas C : Aucun endpoint ne fonctionne
→ Le problème vient de :
- La connexion à l'API (CORS, URL, etc.)
- L'authentification
- Le traitement des données de base

## 📋 Format des données pour `/partners/create-simple`

Envoyez les données en **JSON** (pas multipart/form-data) :

```json
{
  "name": "Mon Partenaire",
  "category": "Restaurant",  // ou "categoryId": "clx..."
  "territory": "Martinique",  // ou "territories": ["Martinique"]
  "tauxCashbackBase": 5,
  "latitude": 14.6415,
  "longitude": -61.0242,
  "boostable": true,
  "marketingPrograms": ["pepites", "boosted"],  // ou string JSON
  "logoUrl": "https://example.com/logo.png",
  "shortDescription": "Description du partenaire"
}
```

## 🔧 Comment modifier temporairement dans kashup-admin

### Option 1 : Modifier l'URL dans le code
Cherchez où se fait l'appel API pour créer un partenaire et changez :
```javascript
// Avant
POST /partners

// Après (pour tester)
POST /partners/debug
// ou
POST /partners/create-simple
```

### Option 2 : Utiliser Postman/Insomnia
1. Créez une nouvelle requête
2. URL : `http://localhost:4000/partners/debug` ou `/partners/create-simple`
3. Headers :
   - Pour `/debug` : Pas besoin d'auth
   - Pour `/create-simple` : `Authorization: Bearer VOTRE_TOKEN`
4. Body :
   - Pour `/debug` : Envoyez ce que vous voulez
   - Pour `/create-simple` : JSON (voir format ci-dessus)

## 💡 Prochaines étapes

1. **Testez `/partners/debug`** pour voir si la requête arrive
2. **Testez `/partners/create-simple`** pour voir si le problème vient de Multer
3. **Partagez les logs** que vous voyez dans le terminal
4. **Indiquez quel endpoint fonctionne** et lequel ne fonctionne pas

Cela nous permettra d'identifier **exactement** où se trouve le problème !

