# Guide de résolution : Liaison Back Office ↔ API ↔ Application Mobile

## 🎯 Objectif
Résoudre l'erreur 500 et établir la liaison complète entre :
- **Back Office** (`kashup-admin`) : Création/modification des données
- **API** (`kashup-api`) : Sauvegarde + synchronisation
- **Application Mobile** (`kashup-mobile`) : Réception des mises à jour

## 🔍 Diagnostic de l'erreur 500

### Étape 1 : Vérifier que la catégorie existe

**Le problème le plus probable** : La catégorie "Services" n'existe pas dans la base de données.

**Solution :**

```bash
# 1. Ouvrir Prisma Studio
cd C:\kashup\kashup-api
npx prisma studio
```

Dans Prisma Studio :
1. Ouvrir la table `PartnerCategory`
2. Vérifier si "Services" existe
3. Si elle n'existe pas, cliquer sur "Add record" et créer :
   - `name: "Services"`

**OU via l'API :**

```bash
# Créer la catégorie via l'API
curl -X POST http://localhost:4000/partners/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{"name": "Services"}'
```

### Étape 2 : Redémarrer l'API

**IMPORTANT** : Après toutes les modifications, redémarrer l'API :

```bash
# Arrêter le serveur (Ctrl+C dans le terminal)
# Puis redémarrer :
cd C:\kashup\kashup-api
npm run dev
```

### Étape 3 : Vérifier les logs

Lors de la création d'un partenaire, vous devriez voir dans les logs :

```
📥 Données reçues pour création de partenaire
🔄 Début du traitement des données
🔍 Recherche de la catégorie par nom
📋 Catégories disponibles: ["Services", ...]
✅ Catégorie trouvée: Services (ID: ...)
🔄 Normalisation du territoire: martinique → Martinique
📋 Données traitées après conversion
🔍 Début de la validation
✅ Validation réussie, création du partenaire
🔄 Création du partenaire dans la base de données
✅ Slug généré: securidom
✅ Partenaire créé en base de données
📡 Émission du webhook vers l'application mobile
✅ Webhook émis avec succès - Partenaire synchronisé avec l'application mobile
✅ Partenaire créé avec succès
```

**Si vous voyez une erreur**, les logs indiqueront exactement où :

- `❌ Catégorie introuvable` → Créer la catégorie (voir Étape 1)
- `❌ Erreur de validation` → Vérifier les champs obligatoires
- `❌ Erreur Prisma` → Vérifier les contraintes de base de données

## 🔧 Configuration complète

### 1. Configuration de l'API (`kashup-api/.env`)

```env
# Port de l'API
PORT=4000

# Base de données
DATABASE_URL="file:./dev.db"

# CORS - Autoriser le back office
CORS_ORIGIN="http://localhost:5173,http://localhost:3000,*"

# Webhook vers l'application mobile (optionnel pour l'instant)
MOBILE_WEBHOOK_URL=""
# Quand l'app mobile sera prête, mettre :
# MOBILE_WEBHOOK_URL="http://localhost:8080/api/webhooks"
```

### 2. Configuration du Back Office (`kashup-admin/.env`)

```env
VITE_API_URL=http://localhost:4000
```

### 3. Vérifier que tout fonctionne

**Test 1 : Vérifier que l'API répond**
```bash
curl http://localhost:4000/health
# Devrait retourner : {"data":{"status":"ok","env":"development"},"error":null,"meta":null}
```

**Test 2 : Vérifier les catégories**
```bash
curl http://localhost:4000/partners/categories
# Devrait retourner la liste des catégories
```

**Test 3 : Créer un partenaire depuis le back office**
1. Ouvrir `kashup-admin` (http://localhost:5173)
2. Se connecter
3. Créer un nouveau partenaire
4. **Vérifier les logs de l'API** pour voir si ça fonctionne

## 📡 Synchronisation avec l'application mobile

### Comment ça fonctionne

1. **Back Office crée/modifie** → Envoie à l'API
2. **API sauvegarde** → En base de données
3. **API envoie webhook** → À l'application mobile (si `MOBILE_WEBHOOK_URL` est configuré)
4. **Application mobile reçoit** → Synchronise les données

### Configuration du webhook

Quand l'application mobile sera prête à recevoir les webhooks :

1. **Dans `kashup-api/.env`** :
   ```env
   MOBILE_WEBHOOK_URL="http://localhost:8080/api/webhooks"
   # OU en production :
   # MOBILE_WEBHOOK_URL="https://votre-app-mobile.com/api/webhooks"
   ```

2. **Dans l'application mobile** :
   - Créer un endpoint `POST /api/webhooks`
   - Recevoir le format :
     ```json
     {
       "event": "partner.created",
       "timestamp": "2024-01-15T10:30:00Z",
       "data": {
         "partner": { ... }
       }
     }
     ```

3. **Redémarrer l'API** après modification de `.env`

## ✅ Checklist de vérification

- [ ] La catégorie "Services" existe dans la base de données
- [ ] L'API est redémarrée (`npm run dev`)
- [ ] Les logs de l'API sont visibles
- [ ] `CORS_ORIGIN` autorise le back office
- [ ] La création d'un partenaire fonctionne (pas d'erreur 500)
- [ ] Les logs montrent "✅ Partenaire créé avec succès"
- [ ] (Optionnel) `MOBILE_WEBHOOK_URL` est configuré si l'app mobile est prête

## 🎯 Résultat attendu

Une fois tout configuré :

1. ✅ **Back Office** : Création/modification fonctionne sans erreur 500
2. ✅ **API** : Sauvegarde en base + logs détaillés
3. ✅ **Webhook** : Envoi automatique vers l'app mobile (si configuré)
4. ✅ **Application Mobile** : Réception et synchronisation des données

**La liaison complète est opérationnelle !** 🎉

## 🆘 Si le problème persiste

1. **Copier les logs complets** du serveur API (depuis le démarrage jusqu'à l'erreur)
2. **Vérifier la base de données** avec `npx prisma studio`
3. **Vérifier que tous les champs obligatoires** sont fournis :
   - `name` (obligatoire)
   - `category` ou `categoryId` (obligatoire)
   - `territory` (obligatoire)
   - `tauxCashbackBase` (obligatoire, 0-100)

4. **Tester avec curl** pour isoler le problème :
   ```bash
   curl -X POST http://localhost:4000/partners \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer VOTRE_TOKEN" \
     -d '{
       "name": "TEST",
       "categoryId": "ID_DE_LA_CATEGORIE",
       "territory": "Martinique",
       "tauxCashbackBase": 5
     }'
   ```

