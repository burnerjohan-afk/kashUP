# 🔍 Comment trouver l'erreur exacte

## ⚡ Solution en 2 étapes

### Étape 1 : Vérifier les logs du serveur API

**Ouvrez le terminal où tourne `npm run dev`** et regardez les logs quand vous créez un partenaire.

Vous devriez voir une séquence de logs. **Copiez TOUS les logs** depuis le moment où vous cliquez sur "Créer" jusqu'à l'erreur.

### Étape 2 : Identifier l'erreur

Cherchez dans les logs :

#### ✅ Si vous voyez `📥 Données reçues pour création de partenaire`
→ Les données arrivent bien à l'API. Le problème est dans le traitement.

#### ✅ Si vous voyez `🔄 Début du traitement des données`
→ Le traitement a commencé. Le problème est dans la conversion ou la validation.

#### ✅ Si vous voyez `🔍 Recherche de la catégorie par nom`
→ La recherche de catégorie a commencé. Vérifiez si vous voyez ensuite :
- `✅ Catégorie trouvée` → OK
- `❌ Catégorie introuvable` → **PROBLÈME** : Exécuter `npm run prisma:seed`

#### ✅ Si vous voyez `📋 Données traitées après conversion`
→ La conversion a réussi. Le problème est dans la validation.

#### ✅ Si vous voyez `🔍 Début de la validation`
→ La validation a commencé. Vérifiez si vous voyez ensuite :
- `✅ Validation réussie` → OK
- `❌ Erreur de validation` → **PROBLÈME** : Les détails de l'erreur seront affichés

#### ✅ Si vous voyez `🔄 Création du partenaire dans la base de données`
→ La création a commencé. Vérifiez si vous voyez ensuite :
- `✅ Partenaire créé en base de données` → OK
- `❌ Erreur Prisma` → **PROBLÈME** : Le code d'erreur Prisma sera affiché

#### ❌ Si vous ne voyez AUCUN log
→ L'erreur se produit avant d'arriver au contrôleur. Vérifiez :
- Les middlewares (auth, multer)
- Que l'API est bien démarrée
- Les erreurs dans la console du serveur

## 🎯 Actions selon l'erreur trouvée

### Erreur : `❌ Catégorie introuvable`
**Solution :**
```bash
npm run prisma:seed
```

### Erreur : `❌ Erreur de validation`
**Solution :** Regardez les détails dans les logs. Vérifiez :
- Que `tauxCashbackBase` est un nombre entre 0 et 100
- Que `territory` est `Martinique`, `Guadeloupe`, ou `Guyane` (avec majuscule)
- Que `categoryId` est un CUID valide

### Erreur : `❌ Erreur Prisma P2002`
**Solution :** Un partenaire avec ce nom existe déjà. Changez le nom.

### Erreur : `❌ Erreur Prisma P2003`
**Solution :** La catégorie n'existe pas. Exécuter `npm run prisma:seed`.

### Erreur : `❌ Erreur lors de la création du partenaire`
**Solution :** Regardez la stack trace dans les logs pour voir où exactement l'erreur se produit.

## 📋 Checklist rapide

- [ ] L'API est démarrée (`npm run dev`)
- [ ] Les logs sont visibles dans le terminal
- [ ] J'ai copié tous les logs depuis le clic sur "Créer"
- [ ] J'ai identifié le dernier log avant l'erreur
- [ ] J'ai noté le message d'erreur exact

## 🆘 Si vous ne voyez toujours pas les logs

1. **Vérifier que l'API est bien démarrée** :
   ```bash
   curl http://localhost:4000/health
   ```

2. **Vérifier que les logs sont activés** :
   - Les logs devraient apparaître automatiquement
   - Si rien n'apparaît, vérifier la configuration du logger

3. **Vérifier les erreurs dans la console** :
   - Regardez s'il y a des erreurs de compilation
   - Regardez s'il y a des erreurs de démarrage

## 💡 Astuce

**Les logs sont votre meilleur ami !** Ils vous diront exactement où et pourquoi l'erreur se produit. Copiez-les et analysez-les attentivement.

