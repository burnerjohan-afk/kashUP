# Diagnostic et résolution de l'erreur 500 lors de la création d'un partenaire

## 🔍 Problème
L'endpoint `POST /partners` retourne une erreur 500 avec le message générique "Erreur interne inattendue".

## ✅ Corrections apportées

### 1. Parsing des données multipart/form-data
- ✅ Parsing des chaînes JSON (`territories`, `marketingPrograms`, `openingDays`)
- ✅ Conversion des types (string → number, string → boolean)
- ✅ Normalisation du territoire (`martinique` → `Martinique`)
- ✅ Conversion `category` (nom) → `categoryId` (ID)

### 2. Gestion des fichiers
- ✅ Support des PDFs (pour les fichiers KBIS)
- ✅ Gestion des erreurs Multer avec messages détaillés

### 3. Logs améliorés
- ✅ Logs à chaque étape du processus
- ✅ Logs d'erreur avec stack trace complète
- ✅ Logs des erreurs Prisma spécifiques

### 4. Validation et gestion d'erreurs
- ✅ Validation Zod après conversion des types
- ✅ Gestion des erreurs Prisma (P2002, P2003, etc.)
- ✅ Messages d'erreur structurés avec codes

## 🚀 Étapes de diagnostic

### Étape 1 : Redémarrer le serveur API
**IMPORTANT** : Le serveur doit être redémarré pour prendre en compte toutes les modifications.

```bash
# Arrêter le serveur actuel (Ctrl+C dans le terminal où il tourne)
# Puis redémarrer :
cd C:\kashup\kashup-api
npm run dev
```

### Étape 2 : Vérifier que le serveur démarre correctement
Vous devriez voir dans les logs :
```
🚀 KashUP API prête sur http://localhost:4000
```

### Étape 3 : Tenter de créer un partenaire
Depuis le frontend `kashup-admin`, tentez de créer un partenaire avec les données :
- `name: 'SECURIDOM'`
- `category: 'Services'`
- `territory: 'martinique'`

### Étape 4 : Analyser les logs du serveur backend
**Regardez attentivement les logs dans le terminal où tourne `npm run dev`.**

Vous devriez voir une séquence de logs comme celle-ci :

#### ✅ Si tout fonctionne :
```
📥 Données reçues pour création de partenaire
🔄 Début du traitement des données
🔍 Recherche de la catégorie par nom
📋 Catégories disponibles
✅ Catégorie trouvée
🔄 Normalisation du territoire
📋 Données traitées après conversion
🔍 Début de la validation
✅ Validation réussie, création du partenaire
🔄 Création du partenaire dans la base de données
✅ Slug généré
✅ Partenaire créé avec succès
```

#### ❌ Si une erreur se produit :
Les logs indiqueront **exactement** où l'erreur se produit :

1. **Erreur de catégorie** :
   ```
   ❌ Catégorie introuvable
   ```
   → Vérifier que la catégorie "Services" existe dans la base de données

2. **Erreur de validation** :
   ```
   ❌ Erreur de validation
   ```
   → Les détails de l'erreur seront affichés

3. **Erreur Prisma** :
   ```
   ❌ Erreur Prisma lors de la création du partenaire
   ```
   → Le code d'erreur Prisma sera affiché (P2002, P2003, etc.)

4. **Erreur dans le contrôleur** :
   ```
   ❌ Erreur lors de la création du partenaire
   ```
   → La stack trace complète sera affichée

## 🔧 Solutions selon le type d'erreur

### Erreur : Catégorie introuvable
**Solution** : Créer la catégorie "Services" dans la base de données

```bash
# Option 1 : Via l'API (si vous avez un endpoint)
POST http://localhost:4000/partners/categories
{
  "name": "Services"
}

# Option 2 : Via Prisma Studio
npx prisma studio
# Puis créer manuellement la catégorie "Services"
```

### Erreur : Validation Zod échoue
**Solution** : Vérifier les logs pour voir quel champ pose problème
- Vérifier que `tauxCashbackBase` est un nombre entre 0 et 100
- Vérifier que `territory` est bien normalisé (`Martinique`, `Guadeloupe`, ou `Guyane`)
- Vérifier que `categoryId` est un CUID valide

### Erreur Prisma P2002 (Contrainte unique)
**Solution** : Un partenaire avec ce nom ou ce slug existe déjà
- Changer le nom du partenaire
- Ou supprimer le partenaire existant

### Erreur Prisma P2003 (Clé étrangère)
**Solution** : La catégorie spécifiée n'existe pas
- Vérifier que la catégorie existe
- Créer la catégorie si nécessaire

## 📝 Checklist de vérification

- [ ] Le serveur API a été redémarré après les modifications
- [ ] Les logs du serveur sont visibles dans le terminal
- [ ] La catégorie "Services" existe dans la base de données
- [ ] Le territoire est bien normalisé (`Martinique` avec majuscule)
- [ ] Tous les champs obligatoires sont fournis

## 🆘 Si le problème persiste

1. **Copier les logs complets** du serveur backend (depuis le démarrage jusqu'à l'erreur)
2. **Vérifier les logs** pour identifier l'étape exacte où l'erreur se produit
3. **Vérifier la base de données** :
   ```bash
   npx prisma studio
   ```
   - Vérifier que la table `PartnerCategory` contient une catégorie "Services"
   - Vérifier qu'il n'y a pas de contraintes qui bloquent

4. **Tester avec curl** pour isoler le problème :
   ```bash
   curl -X POST http://localhost:4000/partners \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "name": "TEST",
       "categoryId": "CATEGORY_ID",
       "territory": "Martinique",
       "tauxCashbackBase": 5
     }'
   ```

## 📞 Informations à fournir si besoin d'aide

Si le problème persiste, fournir :
1. Les logs complets du serveur backend (depuis le démarrage)
2. La réponse complète de l'API (avec `error.details`)
3. Le résultat de `npx prisma studio` (screenshot de la table PartnerCategory)
4. La version de Node.js : `node --version`
5. La version de Prisma : `npx prisma --version`

