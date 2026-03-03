# Architecture de liaison : Back Office ↔ API ↔ Application Mobile

## 🎯 Objectif
L'API `kashup-api` sert de **pont central** entre :
- **Back Office** (`kashup-admin`) : Interface d'administration pour créer/modifier les données
- **Application Mobile** (`kashup-mobile`) : Application qui consomme les données mises à jour

## 📊 Flux de données

```
┌─────────────────┐         ┌──────────────┐         ┌──────────────────┐
│  kashup-admin   │ ──────► │  kashup-api  │ ──────► │  kashup-mobile   │
│  (Back Office)  │  HTTP   │   (API)      │ Webhook │  (App Mobile)    │
└─────────────────┘         └──────────────┘         └──────────────────┘
     Création/Modif              Sauvegarde DB          Notification
     de données                   + Webhook              + Sync
```

## 🔄 Processus de synchronisation

### 1. Création d'un partenaire depuis le Back Office

**Étape 1 : Back Office → API**
```
POST http://localhost:4000/partners
Headers: Authorization: Bearer <token>
Body: multipart/form-data
  - name: "SECURIDOM"
  - category: "Services"
  - territory: "martinique"
  - territories: '["martinique"]'
  - ... autres champs
```

**Étape 2 : API traite et sauvegarde**
- ✅ Parse les données multipart/form-data
- ✅ Convertit les types (string → number, etc.)
- ✅ Normalise les valeurs (territory, category → categoryId)
- ✅ Valide avec Zod
- ✅ Sauvegarde en base de données (Prisma)

**Étape 3 : API → Application Mobile (Webhook)**
```
POST <MOBILE_WEBHOOK_URL>
Headers:
  - Content-Type: application/json
  - X-Webhook-Source: kashup-api
  - X-Webhook-Event: partner.created
Body:
{
  "event": "partner.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "partner": {
      "id": "...",
      "name": "SECURIDOM",
      ...
    }
  }
}
```

## ⚙️ Configuration requise

### 1. Configuration de l'API (`kashup-api`)

#### Fichier `.env` :
```env
# Port de l'API
PORT=4000

# Base de données
DATABASE_URL="file:./dev.db"

# CORS - Autoriser le back office
CORS_ORIGIN="http://localhost:5173,http://localhost:3000,*"

# Webhook vers l'application mobile
MOBILE_WEBHOOK_URL="http://localhost:8080/api/webhooks"
# OU en production :
# MOBILE_WEBHOOK_URL="https://votre-app-mobile.com/api/webhooks"
```

### 2. Configuration du Back Office (`kashup-admin`)

#### Fichier `.env` :
```env
VITE_API_URL=http://localhost:4000
```

### 3. Configuration de l'Application Mobile (`kashup-mobile`)

L'application mobile doit exposer un endpoint pour recevoir les webhooks :
```
POST /api/webhooks
```

**Format attendu :**
```json
{
  "event": "partner.created" | "partner.updated" | "offer.created" | ...,
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "partner": { ... } | "offer": { ... } | ...
  }
}
```

## 🔧 Correction de l'erreur 500 actuelle

### Problème identifié
L'erreur 500 se produit lors de la création d'un partenaire depuis le back office.

### Solutions appliquées

1. **Parsing des données multipart/form-data**
   - ✅ Conversion des chaînes JSON (`territories`, `marketingPrograms`)
   - ✅ Conversion des types (string → number, string → boolean)
   - ✅ Normalisation du territoire (`martinique` → `Martinique`)

2. **Gestion de la catégorie**
   - ✅ Conversion `category` (nom) → `categoryId` (ID)
   - ✅ Recherche de la catégorie par nom (insensible à la casse)
   - ✅ Message d'erreur clair si la catégorie n'existe pas

3. **Logs détaillés**
   - ✅ Logs à chaque étape du processus
   - ✅ Logs d'erreur avec stack trace complète

### Action immédiate

1. **Vérifier que la catégorie "Services" existe** :
   ```bash
   # Dans kashup-api
   npx prisma studio
   # Vérifier la table PartnerCategory
   # Si "Services" n'existe pas, la créer
   ```

2. **Redémarrer l'API** :
   ```bash
   cd C:\kashup\kashup-api
   npm run dev
   ```

3. **Vérifier les logs** lors de la création d'un partenaire

## 📡 Webhooks disponibles

L'API envoie automatiquement des webhooks pour :

### Partenaires
- `partner.created` : Nouveau partenaire créé
- `partner.updated` : Partenaire modifié
- `partner.status.changed` : Statut du partenaire changé

### Offres
- `offer.created` : Nouvelle offre créée
- `offer.updated` : Offre modifiée
- `offer.stock.changed` : Stock d'offre modifié
- `offer.status.changed` : Statut de l'offre changé

### Récompenses
- `reward.created` : Nouvelle récompense créée
- `reward.updated` : Récompense modifiée
- `reward.stock.changed` : Stock de récompense modifié
- `reward.status.changed` : Statut de la récompense changé

### Configurations
- `gift-card-config.updated` : Configuration de carte cadeau mise à jour
- `box-up-config.updated` : Configuration BoxUp mise à jour

## 🧪 Test de la liaison complète

### Test 1 : Créer un partenaire depuis le Back Office

1. Ouvrir `kashup-admin` (http://localhost:5173)
2. Se connecter avec les identifiants admin
3. Créer un nouveau partenaire
4. **Vérifier dans les logs de l'API** :
   ```
   📥 Données reçues pour création de partenaire
   🔄 Début du traitement des données
   ✅ Catégorie trouvée
   📋 Données traitées après conversion
   ✅ Validation réussie, création du partenaire
   ✅ Partenaire créé avec succès
   Webhook envoyé avec succès
   ```

5. **Vérifier dans l'application mobile** :
   - Le webhook doit être reçu
   - Les données doivent être synchronisées

### Test 2 : Vérifier les webhooks

```bash
# Dans kashup-api
npm run test:webhook
```

Ou manuellement :
```bash
curl -X POST http://localhost:4000/api/test-webhook \
  -H "Content-Type: application/json"
```

## 🐛 Dépannage

### Problème : Erreur 500 lors de la création

**Solution :**
1. Vérifier les logs du serveur API
2. Vérifier que la catégorie existe dans la base de données
3. Vérifier que tous les champs obligatoires sont fournis

### Problème : Webhook non reçu par l'application mobile

**Solutions :**
1. Vérifier que `MOBILE_WEBHOOK_URL` est configuré dans `.env`
2. Vérifier que l'URL est accessible depuis l'API
3. Vérifier les logs de l'API pour voir les erreurs de webhook
4. Vérifier que l'application mobile écoute bien sur l'endpoint `/api/webhooks`

### Problème : CORS bloqué

**Solution :**
Vérifier dans `kashup-api/.env` :
```env
CORS_ORIGIN="http://localhost:5173,http://localhost:3000,*"
```

Puis redémarrer l'API.

## 📝 Checklist de vérification

- [ ] L'API démarre sans erreur (`npm run dev`)
- [ ] La catégorie "Services" existe dans la base de données
- [ ] `CORS_ORIGIN` est configuré pour autoriser le back office
- [ ] `MOBILE_WEBHOOK_URL` est configuré (si l'app mobile est prête)
- [ ] Les logs de l'API sont visibles
- [ ] La création d'un partenaire fonctionne depuis le back office
- [ ] Les webhooks sont envoyés (vérifier les logs)

## 🎯 Résultat attendu

Une fois tout configuré correctement :

1. ✅ **Back Office** : Création/modification de données fonctionne
2. ✅ **API** : Sauvegarde en base de données + envoi de webhook
3. ✅ **Application Mobile** : Réception du webhook + synchronisation des données

**La liaison complète est opérationnelle !** 🎉

