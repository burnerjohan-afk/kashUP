# 🔍 Debug Complet - Système de Logging Avancé

## ✅ Ce qui a été ajouté

### 1. **Middleware de logging global** (`requestLogger`)
- Capture **TOUTES** les requêtes entrantes
- Logge les réponses (succès et erreurs)
- Affiche la durée de traitement
- **Positionné AVANT tous les autres middlewares** pour capturer même les erreurs précoces

### 2. **Logs détaillés dans les routes**
- Log avant le middleware `authMiddleware` : `🔐 Middleware auth - début`
- Log après le middleware `authMiddleware` : `✅ Middleware auth - réussi`
- Log après le middleware `requireRoles` : `✅ Middleware requireRoles - réussi`
- Log après le middleware `multer` : `✅ Middleware multer - réussi`
- Log dans le handler : `🚀 createPartnerHandler appelé`

### 3. **Logs détaillés dans le handler**
- `📥 Données reçues` : Affiche le body, les fichiers, l'utilisateur
- `📁 Extraction des fichiers` : Détails sur les fichiers extraits
- `🖼️ Traitement des fichiers` : URLs générées
- `🔄 Début du traitement` : Début de `processFormData`
- `📋 Données traitées` : Données après conversion
- `🔍 Début de la validation` : Début de la validation Zod
- `✅ Validation réussie` : Validation OK
- `🔄 Création du partenaire` : Appel au service
- `✅ Partenaire créé` : Succès

## 🎯 Comment utiliser

### Étape 1 : Redémarrer l'API

```bash
# Arrêter l'API (Ctrl+C dans le terminal)
# Puis redémarrer :
cd C:\kashup\kashup-api
npm run dev
```

### Étape 2 : Garder le terminal visible

**IMPORTANT** : Gardez le terminal où tourne `npm run dev` **visible** et **en haut** pour voir tous les logs en temps réel.

### Étape 3 : Tenter de créer un partenaire

Depuis `kashup-admin`, tentez de créer un partenaire.

### Étape 4 : Observer la séquence de logs

Vous devriez voir une séquence comme celle-ci :

```
📨 Requête entrante
  method: "POST"
  path: "/partners"
  headers: { authorization: "present", content-type: "multipart/form-data" }

🔐 Middleware auth - début
✅ Middleware auth - réussi
  user: { role: "admin" }
✅ Middleware requireRoles - réussi
✅ Middleware multer - réussi
  files: ["logo"]
  bodyKeys: ["name", "territory", ...]
🚀 createPartnerHandler appelé
📥 Données reçues pour création de partenaire
📁 Extraction des fichiers...
🖼️ Traitement des fichiers uploadés...
🔄 Début du traitement des données
📋 Données traitées après conversion
🔍 Début de la validation
✅ Validation réussie, création du partenaire
🔄 Création du partenaire dans la base de données
✅ Partenaire créé en base de données
✅ Réponse réussie
  status: 201
  duration: "XXXms"
```

## 🔍 Identifier le problème

### ❌ Si vous NE voyez PAS `📨 Requête entrante`
→ La requête n'arrive pas à l'API
- Vérifier que l'API est démarrée
- Vérifier l'URL dans `kashup-admin` (doit être `http://localhost:4000`)
- Vérifier CORS

### ❌ Si vous voyez `📨 Requête entrante` mais PAS `🔐 Middleware auth - début`
→ Problème dans le routing Express
- Vérifier que la route est bien enregistrée
- Vérifier l'ordre des middlewares

### ❌ Si vous voyez `🔐 Middleware auth - début` mais PAS `✅ Middleware auth - réussi`
→ **Erreur dans le middleware d'authentification**
- Regarder les logs d'erreur qui suivent
- Vérifier le token JWT
- Vérifier que le token est valide

### ❌ Si vous voyez `✅ Middleware auth - réussi` mais PAS `✅ Middleware requireRoles - réussi`
→ **Erreur dans le middleware de rôles**
- L'utilisateur n'a pas les droits (role !== admin/partner)
- Regarder les logs d'erreur

### ❌ Si vous voyez `✅ Middleware requireRoles - réussi` mais PAS `✅ Middleware multer - réussi`
→ **Erreur dans le middleware Multer**
- Problème avec l'upload de fichiers
- Regarder les logs d'erreur Multer
- Vérifier la taille des fichiers
- Vérifier le type des fichiers

### ❌ Si vous voyez `✅ Middleware multer - réussi` mais PAS `🚀 createPartnerHandler appelé`
→ **Erreur entre multer et le handler**
- Problème dans le routing
- Regarder les logs d'erreur

### ❌ Si vous voyez `🚀 createPartnerHandler appelé` mais une erreur après
→ **Erreur dans le handler**
- Regarder les logs détaillés qui suivent
- Identifier à quelle étape l'erreur se produit :
  - `📥 Données reçues` → Extraction des fichiers
  - `🔄 Début du traitement` → `processFormData`
  - `🔍 Début de la validation` → Validation Zod
  - `🔄 Création du partenaire` → Service Prisma

## 📋 Checklist de diagnostic

- [ ] L'API est redémarrée (`npm run dev`)
- [ ] Le terminal est visible et en haut
- [ ] J'ai tenté de créer un partenaire
- [ ] J'ai noté le **dernier log** avant l'erreur
- [ ] J'ai noté le **message d'erreur exact**
- [ ] J'ai copié **tous les logs** depuis `📨 Requête entrante` jusqu'à l'erreur

## 🆘 Prochaines étapes

1. **Redémarrer l'API** avec les nouveaux logs
2. **Tenter de créer un partenaire**
3. **Copier TOUS les logs** du terminal (depuis `📨 Requête entrante` jusqu'à l'erreur)
4. **Partager les logs** pour que je puisse identifier le problème exact

## 💡 Important

**Les logs sont maintenant TRÈS détaillés.** Ils vous diront **exactement** où et pourquoi l'erreur se produit.

Si vous ne voyez **AUCUN log**, cela signifie que :
- Soit l'API n'est pas démarrée
- Soit la requête n'arrive pas à l'API
- Soit il y a un problème de réseau/CORS

**Copiez les logs complets** et partagez-les pour que je puisse identifier le problème exact.

