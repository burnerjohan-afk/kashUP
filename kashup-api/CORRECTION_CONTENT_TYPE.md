# ✅ Correction - Détection Content-Type incorrect

## 🎯 Problème identifié

Le frontend (`kashup-admin`) envoyait des requêtes avec `Content-Type: application/json` alors que le body contenait du `multipart/form-data`, causant l'erreur `PARSE_ERROR`.

## ✅ Corrections appliquées

### 1. Amélioration de la détection dans `src/app.ts`

J'ai ajouté une détection spécifique pour identifier quand une requête contient du `multipart/form-data` mais est étiquetée comme `application/json` :

```typescript
// Détecter si l'erreur est due à un body multipart mal étiqueté
const errorMessage = err.message || '';
if (errorMessage.includes('Unexpected token') && 
    (errorMessage.includes('------') || errorMessage.includes('WebKit') || errorMessage.includes('boundary'))) {
  // Retourner une erreur claire avec code INVALID_CONTENT_TYPE
  return res.status(400).json({
    data: null,
    error: {
      message: 'Content-Type incorrect : la requête contient du multipart/form-data mais le header indique application/json...',
      details: {
        code: 'INVALID_CONTENT_TYPE',
        expected: 'multipart/form-data',
        received: contentType,
        path: req.path,
        method: req.method
      }
    },
    meta: null
  });
}
```

### 2. Mise à jour de `PROMPT_KASHUP_ADMIN.md`

J'ai ajouté une section détaillée expliquant :
- ❌ Ce qu'il ne faut PAS faire (définir `Content-Type: application/json` avec `FormData`)
- ✅ Ce qu'il faut faire (laisser le navigateur définir le `Content-Type` automatiquement)
- Des exemples de code correct et incorrect
- Comment vérifier dans le code

## 🔄 Action requise : Redémarrer l'API

**Les corrections ne seront actives qu'après redémarrage !**

```bash
# Dans le terminal où tourne npm run dev
# 1. Arrêter (Ctrl+C)
# 2. Redémarrer :
npm run dev
```

## ✅ Résultat attendu

Après redémarrage :
- ✅ Si le frontend envoie `multipart/form-data` avec le mauvais `Content-Type`, l'API retournera une erreur claire avec le code `INVALID_CONTENT_TYPE`
- ✅ Le message d'erreur indiquera exactement le problème et comment le corriger
- ✅ Les requêtes correctement formatées continueront de fonctionner normalement

## 🧪 Test

1. **Redémarrer l'API**
2. **Créer une offre** depuis kashup-admin avec le mauvais `Content-Type`
3. **Vérifier l'erreur** : Vous devriez voir `INVALID_CONTENT_TYPE` avec un message clair
4. **Corriger le frontend** en utilisant le prompt mis à jour dans `PROMPT_KASHUP_ADMIN.md`
5. **Retester** : La création devrait fonctionner

## 📋 Prochaines étapes

1. ✅ **API corrigée** - Détection améliorée appliquée
2. ⏳ **Redémarrer l'API** - Nécessaire pour activer les corrections
3. ⏳ **Corriger kashup-admin** - Utiliser `PROMPT_KASHUP_ADMIN.md` mis à jour
4. ⏳ **Tester** - Vérifier que tout fonctionne

---

**Redémarrez l'API et utilisez le prompt mis à jour dans kashup-admin !** 🚀

