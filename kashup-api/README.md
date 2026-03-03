# KashUP API (SQLite Dev)

API REST KashUP pour alimenter l’app mobile et le futur back-office. Stack : Node.js + TypeScript + Express + Prisma (SQLite en dev), validation Zod, authentification JWT, logique métier (cashback, points, boosts, badges, giftcards…).

## Prérequis

- Node.js ≥ 18.18
- SQLite (embarqué via Prisma, aucun service externe nécessaire)

## Configuration

1. Installer les dépendances :
   ```bash
   npm install
   ```
2. Copier le fichier d’exemple et adapter vos secrets :
   ```bash
   cp env.example .env
   # puis ajuster JWT_SECRET si besoin
   ```
3. Générer la base SQLite + migration initiale :
   ```bash
   npx prisma migrate dev --name init
   ```

## Scripts npm

| Commande | Description |
| --- | --- |
| `npm run dev` | Démarre l’API avec `ts-node-dev` (port 4000). |
| `npm run build` | Compile TypeScript vers `dist/`. |
| `npm start` | Lance la version compilée. |
| `npx prisma studio` | (optionnel) Inspecter les données via Prisma Studio. |

## Modèle Prisma (extrait)

- `User`, `Wallet`, `Transaction` (cashback, points, source, statut)
- `PartnerCategory`, `Partner` (filtres territoire/geo, slug unique)
- `Boost`, `UserBoost`, `Badge`, `UserBadge`
- `GiftCard`, `GiftCardPurchase`
- `FavoritePartner`, `Notification`, `Points`

Le schéma complet se trouve dans `prisma/schema.prisma`.

## Routes principales (`/api`)

Toutes les réponses suivent `{ data, error, meta }` et les dates sont au format ISO 8601.

- Santé : `GET /health`
- Auth : `POST /auth/signup`, `POST /auth/login`, `POST /auth/password/forgot`
- Profil / Wallet :  
  - `GET /me`  
  - `GET /me/wallet`, `GET /me/wallet/history`, `GET /me/wallet/monthly-objective`, `GET /me/wallet/monthly-injected`  
  - `GET /me/transactions`, `GET /me/rewards`, `GET /me/badges`, `GET /me/gift-cards`  
  - Referrals : `GET /me/referrals/summary`, `GET /me/referrals/invitees`
- Notifications : `GET /me/notifications`, `POST /me/notifications/:id/read`
- Partenaires / Offres :
  - `GET /partners` (+ filtres search/catégorie/territoire/autourDeMoi)
  - `GET /partners/:id`
  - `GET /partners/:id/statistics` (admin)
  - `GET /partners/:id/documents` (admin)
  - `POST/PATCH /partners` (admin/partner, avec upload de fichiers)
  - `GET /partners/categories`
  - `GET /offers/current`
  - `POST /offers` (admin, avec upload d'image)
  - `PATCH /offers/:id` (admin, avec upload d'image)
- Transactions : 
  - `POST /transactions` (cashback, points, boosts actifs)
  - `GET /transactions` (admin, avec filtres)
  - `GET /transactions/export` (admin, CSV)
  - `POST /transactions/:id/flag` (admin)
- Stats & Impact : `GET /stats/impact-local` (admin)
- Rewards :
  - `GET /rewards/boosts`, `POST /rewards/boosts/:id/purchase`
  - `GET /rewards/badges`
  - `GET /rewards/history`
  - `GET /rewards/lotteries`, `POST /rewards/lotteries/:id/join`
  - `GET /rewards` (admin, catalogue complet)
  - `GET /rewards/:type` (admin, par type)
  - `POST /rewards` (admin, avec upload d'image)
  - `PATCH /rewards/:id` (admin, avec upload d'image)
- Admin - Utilisateurs :
  - `GET /admin/users` (avec filtres et pagination)
  - `GET /admin/users/:id`
  - `GET /admin/users/:id/transactions`
  - `GET /admin/users/:id/rewards/history`
  - `GET /admin/users/:id/gift-cards`
  - `GET /admin/users/:id/statistics`
  - `POST /admin/users/:id/reset-password`
  - `PATCH /admin/users/:id/kyc/force`
- Gift Cards :
  - `GET /gift-cards` (catalogue)
  - `GET /gift-cards/orders` (admin)
  - `GET /gift-cards/config` (admin)
  - `PATCH /gift-cards/config` (admin, avec upload d'images)
  - `GET /gift-cards/export` (admin, CSV)
  - `GET /gift-cards/box-up/config` (admin)
  - `POST /gift-cards/box-up/config` (admin, avec upload d'image)

## Documentation complète

- [Documentation API Admin](./docs/API_ADMIN.md) - Tous les endpoints admin détaillés
- [Configuration Webhooks](./docs/WEBHOOKS_SETUP.md) - Guide de configuration des webhooks
  - `GET /rewards/challenges`
- Gift cards / Boxes :
  - `GET /gift-cards`, `/gift-cards/catalog`, `/gift-cards/offers`
  - `GET /gift-cards/boxes`, `/gift-cards/boxes/:id`
  - `GET /gift-cards/user`
  - `POST /gift-cards/purchase`
- Dons / Associations :
  - `GET /donations/categories`
  - `GET /donations/associations`
  - `GET /donations/associations/:id`
- Contenus :
  - `GET /content/predefined-gifts`
  - `GET /content/box-up`
  - `GET /content/spotlight-associations`
- Notifications : `GET /me/notifications`, `POST /me/notifications/:id/read`
- Powens :
  - `GET /powens/link-token`
  - `GET /powens/me/banks`, `/powens/me/budget`, `/powens/me/payments`, `/powens/me/security`
  - `POST /powens/webhook`
- Drimify :
  - `GET /drimify/experiences`
  - `POST /drimify/experiences/:id/play`
  - `POST /drimify/webhook`
- Webhooks consolidés : `POST /webhooks` (header `x-webhook-source: drimify|powens|...`)
- Admin :
  - `GET /admin/dashboard` (stats agrégées, rôle admin requis)
  - `GET /admin/app` (placeholder front back-office)
- Monitoring :
  - `GET /monitoring/health`
  - `GET /monitoring/metrics` (Prometheus)

Tout est validé via Zod, messages en français, middleware JWT & rôles.

## Lancer l’API

```bash
cp env.example .env
npx prisma migrate dev --name init
npm run dev
# Visiter http://localhost:4000/health
```

## Tests & documentation

- Tests Vitest : `npm test` (quelques checks d’intégration, extensibles).
- OpenAPI : `docs/openapi.yaml` (importable sur Swagger UI / Postman).

Bonne construction de l’écosystème KashUP ! 🎉

