# 🔧 Prompt pour KASHUP-API - Correction erreur 500 lors de la création d'un partenaire

## ✅ Corrections déjà appliquées

Les corrections suivantes ont **déjà été appliquées** dans le code :

### 1. Parsing des champs JSON stringifiés
- ✅ `territories` : Parse correctement la chaîne JSON `'["martinique"]'` en tableau
- ✅ `marketingPrograms` : Parse correctement la chaîne JSON en tableau
- ✅ `openingDays` : Parse correctement (mais non stocké)

### 2. Conversion des types
- ✅ Nombres : Conversion automatique depuis strings
- ✅ Booléens : Conversion depuis strings ('true'/'false')
- ✅ Territoire : Normalisation automatique

### 3. Gestion des fichiers
- ✅ Upload de logo, KBIS, menuImages, photos
- ✅ Support PDF pour KBIS

### 4. Logs et erreurs
- ✅ Logs détaillés à chaque étape
- ✅ Messages d'erreur descriptifs
- ✅ Codes d'erreur spécifiques

## 🎯 Vérifications à faire

### 1. Redémarrer l'API
```bash
cd kashup-api
npm run dev
```

### 2. Vérifier les logs
Quand vous créez un partenaire, vous devriez voir dans les logs :
```
🚀 createPartnerHandler appelé
📥 Données reçues pour création de partenaire
🔄 Parsing de territories (chaîne JSON)
✅ Territories parsés
🔄 Conversion category -> categoryId
✅ Catégorie trouvée
📋 Données traitées après conversion
🔍 Début de la validation
✅ Validation réussie, création du partenaire
✅ Partenaire créé avec succès
```

### 3. Tester la création
Depuis kashup-admin, créez un partenaire avec :
- name: "Test Partner"
- category: "Services"
- territories: '["martinique"]'
- discoveryCashbackRate: "5"
- permanentCashbackRate: "10"

## 📋 Format des données reçues

Le frontend envoie en `multipart/form-data` :
- **Champs texte** : Tous en strings
- **Champs JSON** : `territories`, `marketingPrograms`, `openingDays` en chaînes JSON
- **Champs numériques** : En strings (`"5"`, `"10"`, etc.)
- **Champs booléens** : En strings (`"true"`, `"false"`)

## 🔍 Diagnostic

Si vous avez encore une erreur 500 :

1. **Vérifier les logs du serveur** :
   - Regarder le terminal où tourne `npm run dev`
   - Identifier le dernier log avant l'erreur
   - Noter le message d'erreur exact

2. **Vérifier les données reçues** :
   - Les logs montrent `importantFields` avec tous les champs reçus
   - Vérifier que `territories` est bien une chaîne JSON
   - Vérifier que `category` correspond à une catégorie existante

3. **Vérifier la base de données** :
   - Vérifier que les catégories existent
   - Vérifier les contraintes (unique, foreign keys)

## ✅ Résultat attendu

Après ces corrections :
- ✅ Les données sont correctement parsées
- ✅ Les types sont correctement convertis
- ✅ Les fichiers sont correctement uploadés
- ✅ Les erreurs sont détaillées et utiles
- ✅ Les logs permettent un débogage facile

## 📝 Notes importantes

- Les champs `siret`, `phone`, `status`, etc. sont **reçus mais ignorés** car non dans le schéma Prisma
- Si vous voulez les stocker, ajoutez-les au schéma Prisma et créez une migration
- Les logs montrent tous les champs reçus pour faciliter le débogage

---

**Les corrections sont déjà appliquées dans le code. Redémarrez l'API et testez !**

