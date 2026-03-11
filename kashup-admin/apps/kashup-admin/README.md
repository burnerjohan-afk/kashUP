# KashUP Admin (React 18 + Vite)

Back-office responsive pour piloter l’écosystème KashUP (cashback, rewards, partenaires, monitoring). Stack : React 18, TypeScript, Vite, Tailwind, TanStack Query, React Router 7, React Hook Form + Zod, Zustand, MSW pour les mocks.

## Getting Started

```bash
cd apps/kashup-admin
cp env.example .env               # VITE_API_URL, VITE_ENABLE_MSW
npm install
npm run dev
```

Scripts utiles :

| Commande | Description |
| --- | --- |
| `npm run dev` | Vite + MSW (si `VITE_ENABLE_MSW=true`) |
| `npm run build` | Type-check + build production |
| `npm run preview` | Prévisualisation du bundle |
| `npm run lint` | ESLint flat config |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` / `test:watch` / `test:cov` | Vitest + Testing Library + MSW server |

## Configuration & Auth

- `VITE_API_URL` : base URL (`https://api.kashup.local` par défaut).
- `VITE_ENABLE_MSW` : active les mocks pour le dev offline.

Auth : `POST /auth/login` (JWT), rafraîchissement automatique via `ky` + hook `afterResponse` (`/auth/refresh`). Session stockée dans `zustand` (`useAuthStore` persisté). `ProtectedRoute` protège l’ensemble des routes `/admin/*`, navigation + actions filtrées par rôle via `usePermissions`.

## Architecture

- `src/app` : layout (`Sidebar`, `Header`, `AppShell`), navigation, providers (QueryClient, i18n, thème violet/dark mode AA), router.
- `src/features/*` : modules métiers (`auth`, `dashboard`, `users`, `partners`, `rewards`, `gift-cards`, `donations`, `notifications`, `powens`, `drimify`, `transactions`, `webhooks`, `settings`).
- `src/lib` : client API (`ky` + helpers), hooks (`use-permissions`), utils (`format`, `cn`).
- `src/components` : UI kit Tailwind (buttons, cards, data-table, command-menu…).
- `src/mocks` : MSW (fixtures + handlers) pour toutes les routes API.
- `src/tests/test-utils.tsx` : helper de rendu (QueryClient + i18n + thème).

## Modules & Endpoints

| Module | Pages | Principaux endpoints |
| --- | --- | --- |
| Auth & Session | Login, reset password | `POST /auth/login`, `/auth/password/forgot`, `/auth/refresh`, `/admin/me` |
| Dashboard | KPI, charts, webhooks récents | `GET /admin/dashboard`, `/stats/impact-local` |
| Utilisateurs & Wallets | Table filtrable, fiche détaillée | `GET /admin/users`, `/admin/users/:id/transactions`, `/admin/users/:id/rewards/history`, `/admin/users/:id/gift-cards`, `POST /admin/users/:id/reset-password`, `PATCH /admin/users/:id/kyc/force`, `POST /transactions` |
| Partenaires & Offres | Catalogue + CRUD + scheduling | `GET/POST/PATCH /partners`, `GET /partners/categories`, `GET /offers/current`, `POST /offers` |
| Rewards & Expériences | Boosts/badges/lotteries/challenges | `GET /rewards`, `POST /rewards/boosts/:id/purchase`, `POST /rewards/lotteries/:id/join` |
| Gift Cards & Boxes | Catalogue, commandes, génération codes | `GET /gift-cards`, `/gift-cards/orders`, `POST /gift-cards/purchase`, `GET /gift-cards/export` |
| Donations & Content | CRUD associations + contenus BoxUp | `GET/POST /donations`, `GET/POST /content` |
| Notifications | Templates + envoi segmenté | `GET /me/notifications/templates`, `POST /me/notifications` |
| Powens | Monitoring + webhooks timeline | `GET /powens/overview`, `/powens/webhooks`, `POST /powens/links/:id/refresh`, `POST /powens/webhook` |
| Drimify | Catalogue jeux + déclenchement | `GET /drimify/experiences`, `POST /drimify/experiences/:id/play`, `POST /drimify/webhook` |
| Transactions & Compliance | Flux temps réel, injection QA | `GET /transactions`, `POST /transactions`, `GET /transactions/export`, `POST /transactions/:id/flag` |
| Webhooks & Monitoring | Console unifiée + métriques Prometheus | `GET /webhooks`, `POST /webhooks`, `GET /monitoring/health`, `GET /monitoring/metrics` |
| Paramètres | Rôles, objectifs globaux, audit log | `GET/POST/PATCH /admin/settings/roles`, `GET/PATCH /admin/settings/globals`, `GET /admin/settings/audit-log` |

## UI/UX

- Layout 3 zones (sidebar fixe, header contextuel, contenu modulaire), responsive desktop-first ≥1280px.
- Palette : violet profond `#4B2AAD`, hover `#7E5BFF`, fond `#F7F7F7`, accent succès `#24C38B`, alerte `#FF8A5C`. Mode sombre violet (variables CSS, contrastes AA).
- Boutons arrondis 8px, ombres `shadow-soft`, icônes lucide-outline.
- Barre de recherche + `CommandMenu` (Cmd/Ctrl + K) pour navigation rapide.
- Permissions : navigation + actions masquées selon rôle (`admin`, `support`, `partner_manager`).
- Feedbacks systématiques (skeleton loaders, toasts succès/erreur, formulaires RHF + Zod).

## MSW & Données mock

- `VITE_ENABLE_MSW=true` : worker chargé dans `main.tsx` (dev uniquement).
- Handlers couvrent tous les endpoints (auth, dashboard, users, partners, offres, rewards, gift-cards, donations/content, notifications, powens, drimify, transactions, webhooks, monitoring, paramètres).
- Fixtures réalistes (`src/mocks/data.ts`) : KPI, partenaires, utilisateurs + wallets, transactions, offres, webhooks, métriques Prometheus, Powens/Drimify, audit logs.
- Tests Vitest démarrent MSW serveur (`vitest.setup.ts`).

## Tests

- Vitest + Testing Library + msw.
- Couverture incluse pour hooks/pages critiques (ex : `use-permissions`, `ProtectedRoute`, `LoginForm`).
- Ajouter vos tests par module (`*.test.tsx`) en utilisant `renderWithProviders`.

## Flux de travail conseillé

1. `npm run dev` → UI + mocks intégrés.
2. Configurer `.env` si besoin de pointer vers l’API réelle.
3. Développer dans `src/features/<module>` en tirant parti des hooks partagés (`usePermissions`, `queryClient`).
4. Exécuter `npm run lint && npm run test` avant commit CI/CD.

Le projet est prêt à être branché sur l’API REST KashUP : il suffit d’ajuster `VITE_API_URL`, désactiver MSW en prod et brancher l’auth JWT fournie.


