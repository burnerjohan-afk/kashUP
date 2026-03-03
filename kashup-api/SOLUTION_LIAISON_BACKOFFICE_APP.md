# Solution complète : Liaison Back Office ↔ Application Mobile

## 🎯 Objectif
L'API `kashup-api` fait le pont entre :
- **Back Office (kashup-admin)** : Interface d'administration pour créer/modifier les données
- **Application Mobile (kashup-mobile)** : Application utilisateur qui reçoit les mises à jour en temps réel

## 🔄 Flux de synchronisation

### 1. Création d'un partenaire depuis le Back Office
```
kashup-admin (Frontend)
    ↓ POST /partners (multipart/form-data)
kashup-api (Backend)
    ↓ Validation & Traitement
    ↓ Création en base de données
    ↓ Émission webhook
kashup-mobile (Application)
    ↓ Réception webhook
    ↓ Mise à jour locale
```

### 2. Webhooks configurés
L'API émet automatiquement des webhooks vers l'application mobile lors de :
- ✅ `partner.created` - Création d'un partenaire
- ✅ `partner.updated` - Mise à jour d'un partenaire
- ✅ `offer.created` / `offer.updated` - Création/mise à jour d'offres
- ✅ `reward.created` / `reward.updated` - Création/mise à jour de récompenses

## ✅ Corrections apportées

### 1. Gestion robuste de la création de partenaire
- ✅ Vérification de l'existence de la catégorie avant création
- ✅ Gestion des erreurs Prisma avec messages clairs
- ✅ Logs détaillés à chaque étape
- ✅ Webhook émis même en cas d'erreur partielle (non bloquant)

### 2. Parsing des données multipart/form-data
- ✅ Conversion automatique des types (string → number, boolean)
- ✅ Parsing des chaînes JSON (`territories`, `marketingPrograms`)
- ✅ Normalisation du territoire (`martinique` → `Martinique`)
- ✅ Conversion `category` (nom) → `categoryId` (ID)

### 3. Synchronisation avec l'application mobile
- ✅ Webhooks émis automatiquement après chaque création/mise à jour
- ✅ Retry automatique en cas d'échec (2 tentatives)
- ✅ Timeout de 10 secondes pour éviter les blocages
- ✅ Logs détaillés pour le suivi

## 🚀 Configuration requise

### 1. Variables d'environnement (.env)
```env
# URL de l'application mobile pour recevoir les webhooks
MOBILE_WEBHOOK_URL=https://votre-app-mobile.com/api/webhooks

# Ou pour le développement local
MOBILE_WEBHOOK_URL=http://localhost:3000/api/webhooks
```

### 2. Vérifier que la catégorie existe
Avant de créer un partenaire, assurez-vous que la catégorie existe :

```bash
# Option 1 : Via l'API
GET http://localhost:4000/partners/categories

# Option 2 : Créer la catégorie si elle n'existe pas
POST http://localhost:4000/partners/categories
{
  "name": "Services"
}
```

## 📋 Étapes pour tester la liaison complète

### Étape 1 : Vérifier la configuration
```bash
# Dans kashup-api
cat .env | grep MOBILE_WEBHOOK_URL
```

### Étape 2 : Démarrer l'API
```bash
cd C:\kashup\kashup-api
npm run dev
```

Vous devriez voir :
```
🚀 KashUP API prête sur http://localhost:4000
```

### Étape 3 : Créer un partenaire depuis le Back Office
Depuis `kashup-admin`, créez un partenaire avec :
- `name: 'SECURIDOM'`
- `category: 'Services'`
- `territory: 'martinique'`

### Étape 4 : Vérifier les logs de l'API
Dans le terminal de `kashup-api`, vous devriez voir :
```
📥 Données reçues pour création de partenaire
🔄 Début du traitement des données
🔍 Recherche de la catégorie par nom
✅ Catégorie trouvée
🔄 Normalisation du territoire
📋 Données traitées après conversion
🔍 Début de la validation
✅ Validation réussie, création du partenaire
🔄 Création du partenaire dans la base de données
✅ Catégorie vérifiée
✅ Slug généré
✅ Partenaire créé en base de données
📡 Émission du webhook vers l'application mobile
✅ Webhook émis avec succès - Partenaire synchronisé avec l'application mobile
✅ Partenaire créé avec succès - Synchronisation avec l'application mobile en cours
```

### Étape 5 : Vérifier la réception dans l'application mobile
L'application mobile devrait recevoir un webhook avec :
```json
{
  "event": "partner.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "partner": {
      "id": "...",
      "name": "SECURIDOM",
      "category": { "id": "...", "name": "Services" },
      ...
    }
  }
}
```

## 🔧 Résolution des problèmes

### Problème : Erreur 500 lors de la création
**Solution** : Vérifier les logs du serveur pour identifier l'erreur exacte

### Problème : Catégorie introuvable
**Solution** : Créer la catégorie avant de créer le partenaire
```bash
POST http://localhost:4000/partners/categories
{
  "name": "Services"
}
```

### Problème : Webhook non reçu par l'application mobile
**Vérifications** :
1. `MOBILE_WEBHOOK_URL` est bien configuré dans `.env`
2. L'application mobile est démarrée et écoute sur l'URL configurée
3. Les logs de l'API montrent "✅ Webhook émis avec succès"

### Problème : Territoire invalide
**Solution** : Le territoire doit être normalisé (`Martinique`, `Guadeloupe`, ou `Guyane`)
- Le code normalise automatiquement `martinique` → `Martinique`

## 📊 Format des webhooks

### Événement : partner.created
```json
{
  "event": "partner.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "partner": {
      "id": "clxxx...",
      "name": "SECURIDOM",
      "slug": "securidom",
      "category": {
        "id": "clxxx...",
        "name": "Services"
      },
      "territory": "Martinique",
      "tauxCashbackBase": 5,
      "logoUrl": "/uploads/partners/xxx.jpg",
      "menuImages": ["/uploads/partners/xxx.jpg"],
      "photos": ["/uploads/partners/xxx.jpg"],
      "marketingPrograms": ["pepites", "boosted"]
    }
  }
}
```

## ✅ Checklist de vérification

- [ ] L'API démarre sans erreur
- [ ] La catégorie "Services" existe dans la base de données
- [ ] `MOBILE_WEBHOOK_URL` est configuré dans `.env`
- [ ] La création de partenaire fonctionne depuis le Back Office
- [ ] Les logs montrent "✅ Webhook émis avec succès"
- [ ] L'application mobile reçoit les webhooks

## 🎉 Résultat attendu

Quand vous créez un partenaire depuis le Back Office :
1. ✅ Le partenaire est créé en base de données
2. ✅ Un webhook est émis vers l'application mobile
3. ✅ L'application mobile reçoit la notification
4. ✅ Les données sont synchronisées en temps réel

**La liaison Back Office ↔ Application Mobile est opérationnelle !** 🚀

