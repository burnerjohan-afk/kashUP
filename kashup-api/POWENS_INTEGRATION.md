# Intégration POWENS - Documentation

## 📋 Résumé

Intégration complète de POWENS (ex-Budget Insight) dans Kashup avec flow Temporary code + Webview pour connecter des banques, récupérer comptes/transactions, et afficher des KPIs à zéro lorsque la base est vide.

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers

#### Services Powens
- `src/services/powens/powensAuth.service.ts` - Service d'authentification (initAuth, exchangeTemporaryCode, state signing)
- `src/services/powens/powensWebview.service.ts` - Service pour générer l'URL Webview
- `src/services/powens/powensSync.service.ts` - Service de synchronisation comptes + transactions

#### Controllers
- `src/controllers/powensIntegration.controller.ts` - Controllers pour l'intégration Powens (webview, callback, sync, list)

#### Routes
- `src/routes/powensIntegration.routes.ts` - Routes `/integrations/powens/*`

#### Tests
- `tests/powens.integration.test.ts` - Tests d'intégration pour vérifier les endpoints avec DB vide

### Fichiers modifiés

#### Configuration
- `env.example` - Ajout variables `POWENS_DOMAIN`, `POWENS_CLIENT_ID`, `POWENS_CLIENT_SECRET`, `POWENS_REDIRECT_URI`, `POWENS_WEBHOOK_SECRET`
- `src/config/env.ts` - Validation des nouvelles variables d'environnement

#### Prisma Schema
- `prisma/schema.prisma` - Ajout modèles :
  - `PowensConnection` - Stocke les connexions Powens (access_token, powensUserId, etc.)
  - `BankAccount` - Stocke les comptes bancaires synchronisés
  - `BankTransaction` - Stocke les transactions bancaires synchronisées
  - Relation `User.powensConnections`

#### Routes principales
- `src/routes/index.ts` - Ajout route `/integrations/powens`

## 🔧 Configuration

Documentation officielle : **[docs.powens.com](https://docs.powens.com/documentation/)** (Quick Start, API Overview, Add a first user and connection).

### Où trouver les variables

| Variable | Où la trouver | Obligatoire pour |
|----------|----------------|------------------|
| `POWENS_DOMAIN`, `POWENS_API_URL` | Domaine créé dans la console (ex. `kashup` → `kashup-sandbox.biapi.pro`) | Webview + sync |
| `POWENS_CLIENT_ID`, `POWENS_CLIENT_SECRET`, `POWENS_REDIRECT_URI` | **Configuration** de la client application (écran avec Client ID, URIs de redirection) | Webview (connexion banque) |
| `POWENS_CONFIG_KEY`, `POWENS_USERS_KEY`, etc. | Console → domaine → **API Keys / Manage tokens** (tokens générés à la création du domaine) | Endpoints list connections, budget, payments, etc. |

Pour le flow **webview uniquement** (connexion banque + callback + sync comptes/transactions), les 5 variables suffisent : `POWENS_DOMAIN`, `POWENS_API_URL`, `POWENS_CLIENT_ID`, `POWENS_CLIENT_SECRET`, `POWENS_REDIRECT_URI`. Les clés "manage tokens" sont optionnelles sauf si vous utilisez les routes qui s’appuient sur `powens.service.ts` (list connections, budget, etc.).

### Variables d'environnement

```env
# Requis pour webview (Configuration)
POWENS_DOMAIN="kashup-sandbox"
POWENS_API_URL="https://kashup-sandbox.biapi.pro/2.0/"
POWENS_CLIENT_ID="votre_client_id"
POWENS_CLIENT_SECRET="votre_client_secret"
POWENS_REDIRECT_URI="https://kashupv0.vercel.app/powens/callback"
# Optionnel : manage tokens (console → domaine / API Keys)
POWENS_CONFIG_KEY="votre_clef_config"
POWENS_MONITORING_KEY="votre_clef_surveillance"
POWENS_USERS_KEY="votre_clef_utilisateurs"
POWENS_ENCRYPTION_PUBLIC_KEY="votre_clef_RSA_base64"
POWENS_WEBHOOK_SECRET="votre_webhook_secret"
```

### Migration Prisma

```bash
# Créer et appliquer la migration
npx prisma migrate dev --name add_powens_integration

# Générer le client Prisma
npx prisma generate
```

## 🚀 API Endpoints

### Authentification & Webview

#### `GET /api/v1/integrations/powens/webview-url`
Génère l'URL Webview Powens pour connecter une banque.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "webviewUrl": "https://kashup-sandbox.biapi.pro/2.0/auth/webview/connect?...",
    "temporaryCode": "temp_code_123"
  }
}
```

#### `GET /api/v1/integrations/powens/callback`
Callback Powens après connexion banque (appelé par Powens, pas d'auth requise).

**Query params:**
- `code` - Code d'autorisation
- `state` - State signé pour sécurité
- `error` - Erreur éventuelle
- `error_description` - Description de l'erreur

**Redirection:** Vers `POWENS_REDIRECT_URI` avec `success=true&connectionId=...` ou `error=...`

#### `POST /api/v1/integrations/powens/finalize`
Alternative: finalisation côté backend si callback géré côté front.

**Body:**
```json
{
  "code": "auth_code",
  "state": "signed_state"
}
```

### Gestion des connexions

#### `GET /api/v1/integrations/powens/connections`
Liste les connexions Powens de l'utilisateur.

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "data": [
    {
      "id": "conn_123",
      "status": "active",
      "lastSyncAt": "2024-01-01T00:00:00Z",
      "bankAccounts": [...],
      "accountsCount": 2
    }
  ]
}
```

#### `POST /api/v1/integrations/powens/connections/:connectionId/sync`
Synchronise les comptes et transactions pour une connexion.

**Response:**
```json
{
  "statusCode": 200,
  "success": true,
  "data": {
    "accountsSynced": 2,
    "transactionsSynced": 150
  }
}
```

## 🔄 Flow d'intégration

### 1. Génération URL Webview
```
Frontend → GET /integrations/powens/webview-url
Backend → initAuth() → temporary_code
Backend → getWebviewConnectUrl() → URL Webview
Frontend → window.location = webviewUrl
```

### 2. Connexion banque (Webview Powens)
```
Utilisateur → Webview Powens → Sélection banque → Connexion
Powens → GET /integrations/powens/callback?code=...&state=...
Backend → verifyState() → exchangeTemporaryCode() → Créer/mettre à jour PowensConnection
Backend → Redirection vers frontend avec success/error
```

### 3. Synchronisation
```
Frontend → POST /integrations/powens/connections/:id/sync
Backend → syncAll() → fetchAccounts() + fetchTransactions() → Upsert DB
Backend → Retourne comptes/transactions synchronisés
```

## 🧪 Tests

### Exécuter les tests

```bash
# Tests d'intégration Powens
npm test -- tests/powens.integration.test.ts

# Tous les tests
npm test
```

### Tests inclus

- ✅ `GET /admin/dashboard` retourne des zéros si DB vide
- ✅ `GET /admin/statistics/table` retourne des lignes vides si DB vide

## 🔒 Sécurité

### State signing
Le `state` est signé avec HMAC-SHA256 pour éviter les attaques CSRF :
- Format: `userId:timestamp:signature`
- Expiration: 5 minutes
- Vérification dans `verifyState()`

### Access Token
⚠️ **TODO Production:** Chiffrer `accessToken` dans `PowensConnection` avant stockage.

## 📊 Modèles de données

### PowensConnection
- `id` - ID unique
- `userId` - ID utilisateur Kashup
- `powensUserId` - ID utilisateur Powens
- `powensConnectionId` - ID connexion Powens
- `accessToken` - Token d'accès (à chiffrer en prod)
- `status` - active, error, disconnected
- `lastSyncAt` - Dernière synchronisation

### BankAccount
- `id` - ID unique
- `connectionId` - Référence PowensConnection
- `powensAccountId` - ID compte Powens
- `label` - Nom du compte
- `iban` - IBAN (si disponible)
- `balance` - Solde
- `currency` - Devise (EUR par défaut)
- `type` - Type de compte (checking, savings, etc.)
- `raw` - JSON données brutes Powens

### BankTransaction
- `id` - ID unique
- `accountId` - Référence BankAccount
- `powensTransactionId` - ID transaction Powens
- `date` - Date transaction
- `amount` - Montant
- `label` - Libellé
- `category` - Catégorie (si disponible)
- `raw` - JSON données brutes Powens

## 🐛 Debugging

### Logs
Les services Powens loggent automatiquement :
- Génération URL Webview
- Callback reçu
- Erreurs de synchronisation
- Résultats de sync

### Vérifier les connexions
```bash
# Via Prisma Studio
npx prisma studio

# Via API
curl -H "Authorization: Bearer <token>" \
  http://localhost:4000/api/v1/integrations/powens/connections
```

## ✅ Checklist de déploiement

- [ ] Variables d'environnement configurées
- [ ] Migration Prisma appliquée
- [ ] `POWENS_REDIRECT_URI` pointe vers le bon frontend
- [ ] Tests passent
- [ ] Access tokens chiffrés en production (TODO)
- [ ] Webhooks Powens configurés (optionnel)

## 📝 Notes

- Les endpoints dashboard/statistiques retournent maintenant 0/[] si DB vide (corrigé)
- Le flow Temporary code + Webview est conforme à la doc Powens
- La synchronisation gère la pagination automatiquement
- Limite de sécurité: max 1000 transactions par sync

## 🔗 Références

- [Documentation Powens](https://docs.powens.com/documentation/) — Quick Start, API Overview, Add a first user and connection
- [Console Budget Insight](https://console.budget-insight.com/) — Création domaine, client application, API Keys
- Flow Temporary code: `POST /2.0/auth/init` → `GET /2.0/auth/token/code` → Webview → callback
- Webview: `/2.0/auth/webview/connect` (ou `https://webview.powens.com/connect?domain=...`)

