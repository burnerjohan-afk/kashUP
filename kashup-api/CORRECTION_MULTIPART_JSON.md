# ✅ Correction - Support JSON et multipart/form-data pour les routes partenaires

## 🎯 Objectif

Permettre aux routes partenaires d'accepter à la fois :
- ✅ Les requêtes `multipart/form-data` (avec logo/fichiers)
- ✅ Les requêtes `application/json` (sans fichiers)

## ✅ Modifications appliquées

### 1. Middleware dans `src/app.ts`

Le middleware a été amélioré pour :
- Détecter les routes Multer (`/partners`, `/offers`, `/rewards`, `/gift-cards`)
- Pour les routes Multer avec `Content-Type: application/json`, essayer de parser avec `express.json()`
- Si le parsing échoue avec une erreur qui ressemble à du multipart mal étiqueté, laisser passer pour que Multer gère
- Pour les autres routes, parser normalement avec `express.json()`

### 2. Routes partenaires

Les routes partenaires utilisent déjà `uploadFields` pour gérer les fichiers :
- `POST /partners` : accepte `multipart/form-data` avec logo, kbis, menuImages, photos
- `PATCH /partners/:id` : accepte `multipart/form-data` avec logo, kbis, menuImages, photos

### 3. Contrôleur

Le contrôleur `createPartnerHandler` gère déjà :
- La détection du type de requête (JSON ou multipart)
- L'extraction des fichiers avec `extractFiles`
- Le traitement des données avec `processFormData` qui convertit les types depuis `multipart/form-data`
- La validation avec Zod
- La création du partenaire

## 🔄 Comportement attendu

### Cas 1 : Requête JSON simple (sans fichier)
```json
POST /partners
Content-Type: application/json

{
  "name": "Mon Partenaire",
  "categoryId": "xxx",
  "territory": "Martinique",
  ...
}
```
✅ **Résultat** : `express.json()` parse le body, `req.body` contient les données, Multer ne trouve pas de fichiers, le contrôleur utilise `req.body` directement.

### Cas 2 : Requête multipart/form-data (avec logo)
```
POST /partners
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="name"

Mon Partenaire
------WebKitFormBoundary...
Content-Disposition: form-data; name="logo"; filename="logo.png"
Content-Type: image/png

[binary data]
------WebKitFormBoundary...
```
✅ **Résultat** : Le middleware ignore le parsing JSON, Multer parse le multipart, `req.body` contient les données (en string), `req.files` contient les fichiers, le contrôleur utilise `processFormData` pour convertir les types.

### Cas 3 : Requête multipart avec Content-Type incorrect (problème frontend)
```
POST /partners
Content-Type: application/json  ❌ (devrait être multipart/form-data)

------WebKitFormBoundary...
[binary multipart data]
```
⚠️ **Résultat** : `express.json()` essaie de parser et échoue avec "Unexpected token '------'". Le middleware détecte que c'est une route Multer et que l'erreur ressemble à du multipart, donc il laisse passer. Multer pourra peut-être encore parser (si le body n'a pas été complètement consommé), ou le contrôleur gérera l'erreur.

## 📋 Vérifications

1. ✅ **Compilation** : `npm run build` réussit sans erreur
2. ✅ **Linter** : Aucune erreur de linting
3. ⏳ **Tests** : À tester avec :
   - Une requête JSON simple (sans fichier)
   - Une requête multipart/form-data (avec logo)
   - Une requête multipart avec Content-Type incorrect (pour vérifier la gestion d'erreur)

## 🚀 Prochaines étapes

1. **Redémarrer l'API** :
   ```bash
   npm run dev
   ```

2. **Tester avec une requête JSON simple** :
   ```bash
   curl -X POST http://localhost:4000/partners \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "name": "Test Partner",
       "categoryId": "xxx",
       "territory": "Martinique"
     }'
   ```

3. **Tester avec une requête multipart** :
   ```bash
   curl -X POST http://localhost:4000/partners \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "name=Test Partner" \
     -F "categoryId=xxx" \
     -F "territory=Martinique" \
     -F "logo=@/path/to/logo.png"
   ```

## ⚠️ Notes importantes

- **Le frontend doit corriger le Content-Type** : Si le frontend envoie `multipart/form-data` avec le header `Content-Type: application/json`, l'API essaiera quand même de traiter la requête, mais il est préférable que le frontend envoie le bon Content-Type.
- **Les données multipart arrivent en string** : Le contrôleur utilise `processFormData` pour convertir les types (nombres, booléens, tableaux JSON).
- **Compatibilité** : Les requêtes JSON simples continuent de fonctionner normalement.

---

**Les modifications sont prêtes. Redémarrez l'API et testez !** 🚀
