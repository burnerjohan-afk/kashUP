# 📋 Résumé Architecture Synchronisation Kashup

**Date :** 2024-12-13  
**Version :** 1.0

---

## 🎯 Objectif

Mettre en place une liaison **STABLE, EFFICACE et "parfaite"** entre :
- **Kashup-api** (Node/TS/Prisma) = Source de vérité
- **Kashup-admin** (React/Vite) = Back office
- **Kashup-mobile** (React Native) = App client

---

## ✅ État actuel de l'API

### Points forts déjà en place

1. **Contrat API standardisé** :
   - Format réponse : `{ statusCode, success, message, data, meta }`
   - Pagination : `page`, `pageSize`, `sort`, `total`, `totalPages`
   - Erreurs : Format standardisé avec `code`, `message`, `details`

2. **Delta sync partiel** :
   - `updatedSince` supporté pour : partners, offers, rewards, giftCards, donations, transactions
   - Helper `parseListParams` / `buildListQuery` dans `src/utils/listing.ts`
   - Endpoint global : `GET /api/v1/sync/changes?updatedSince=ISO8601`

3. **Soft delete** :
   - `deletedAt` présent sur : PartnerOffer, Boost, GiftCard, DonationCategory, etc.
   - Exclusion par défaut (sauf `includeDeleted=true`)

4. **Base vide stable** :
   - Tous les endpoints retournent `0` et `[]` si base vide
   - Pas de chiffres fantômes, pas de fallback

5. **Observabilité** :
   - `X-Request-Id` dans toutes les réponses
   - Logs structurés avec `requestId`, `userId`, `duration`

6. **Auth & RBAC** :
   - JWT Bearer token
   - Rôles : `admin`, `partner`, `user`
   - Middleware `authMiddleware` + `requireRoles`

---

## 🔧 Améliorations nécessaires (optionnel)

### 1. Étendre delta sync à toutes les ressources

**Ressources déjà supportées :**
- ✅ Partners
- ✅ Offers
- ✅ Rewards/Boosts
- ✅ Gift Cards
- ✅ Donations
- ✅ Transactions

**Ressources à ajouter (si nécessaire) :**
- ⚠️ Notifications (déjà dans `/me/notifications`, vérifier `updatedSince`)
- ⚠️ Consents (déjà dans `/me/consent`, vérifier `updatedSince`)
- ⚠️ Powens Connections (déjà dans `/integrations/powens/connections`, vérifier `updatedSince`)

**Action :** Vérifier que ces endpoints utilisent `parseListParams` et supportent `updatedSince`.

### 2. Améliorer endpoint sync global

L'endpoint `GET /api/v1/sync/changes` existe déjà mais pourrait être étendu :
- Ajouter `notifications`, `consents`, `powensConnections` si nécessaire
- Optionnel : Ajouter `limit` pour éviter des réponses trop volumineuses

**Fichier :** `src/controllers/sync.controller.ts`

---

## 📝 Fichiers modifiés/créés

### Documents créés
1. ✅ `CONTRAT_API_CANONIQUE.md` - Contrat API complet
2. ✅ `PROMPT_KASHUP_ADMIN_CLIENT_ONLY.md` - Prompt pour admin
3. ✅ `PROMPT_KASHUP_MOBILE_CLIENT_ONLY.md` - Prompt pour mobile
4. ✅ `CHECKLIST_VALIDATION_BOUT_EN_BOUT.md` - Checklist de validation
5. ✅ `RESUME_ARCHITECTURE_SYNC.md` - Ce document

### Fichiers API existants (à vérifier)
- `src/utils/listing.ts` - ✅ Helper pagination/delta sync
- `src/utils/response.ts` - ✅ Format réponse standardisé
- `src/middlewares/errorHandler.ts` - ✅ Gestion erreurs
- `src/controllers/sync.controller.ts` - ✅ Endpoint sync global
- `src/routes/sync.routes.ts` - ✅ Route sync

---

## 🚀 Actions recommandées

### Côté API (minimal, optionnel)

1. **Vérifier delta sync pour notifications/consents** :
   - S'assurer que `GET /me/notifications` supporte `updatedSince`
   - S'assurer que `GET /me/consent` supporte `updatedSince` (ou est déjà à jour)

2. **Étendre `/sync/changes` si nécessaire** :
   - Ajouter `notifications`, `consents`, `powensConnections` si ces ressources sont modifiées côté admin

### Côté Admin (prompt fourni)

Utiliser le prompt `PROMPT_KASHUP_ADMIN_CLIENT_ONLY.md` pour :
- Configurer HttpClient avec gestion token
- Implémenter TanStack Query avec invalidation cache
- Supprimer tous les mocks/fallbacks
- Implémenter optimistic updates
- Gérer les états vides correctement

### Côté Mobile (prompt fourni)

Utiliser le prompt `PROMPT_KASHUP_MOBILE_CLIENT_ONLY.md` pour :
- Configurer HttpClient avec gestion token + offline
- Implémenter React Query avec persistence
- Implémenter delta sync périodique
- Gérer la queue de mutations offline
- Gérer les états vides correctement

---

## 📊 Ressources synchronisées

| Ressource | Endpoint List | Delta Sync | Soft Delete | Admin CRUD | Mobile Read |
|-----------|--------------|------------|-------------|------------|-------------|
| **Partners** | `GET /partners` | ✅ | ✅ | ✅ | ✅ |
| **Offers** | `GET /offers/current` | ✅ | ✅ | ✅ | ✅ |
| **Rewards/Boosts** | `GET /rewards/boosts` | ✅ | ✅ | ✅ | ✅ |
| **Transactions** | `GET /transactions` | ✅ | ❌ | ✅ | ✅ (own) |
| **Gift Cards** | `GET /gift-cards/catalog` | ✅ | ✅ | ✅ | ✅ |
| **Donations** | `GET /donations/categories` | ✅ | ✅ | ✅ | ✅ |
| **Notifications** | `GET /me/notifications` | ⚠️ | ❌ | ❌ | ✅ (own) |
| **Consents** | `GET /me/consent` | ⚠️ | ❌ | ❌ | ✅ (own) |
| **Powens Connections** | `GET /integrations/powens/connections` | ⚠️ | ❌ | ❌ | ✅ (own) |

**Légende :**
- ✅ : Implémenté et fonctionnel
- ⚠️ : À vérifier (probablement OK mais non testé)
- ❌ : Non applicable ou non nécessaire

---

## 🎯 Prochaines étapes

1. **Valider le contrat API** : Lire `CONTRAT_API_CANONIQUE.md`
2. **Implémenter côté Admin** : Utiliser `PROMPT_KASHUP_ADMIN_CLIENT_ONLY.md`
3. **Implémenter côté Mobile** : Utiliser `PROMPT_KASHUP_MOBILE_CLIENT_ONLY.md`
4. **Valider bout en bout** : Suivre `CHECKLIST_VALIDATION_BOUT_EN_BOUT.md`

---

## ✅ Checklist finale

- [x] Contrat API documenté
- [x] Delta sync implémenté pour ressources principales
- [x] Soft delete supporté
- [x] Base vide stable (0, [])
- [x] Observabilité (X-Request-Id, logs)
- [x] Prompts client-only générés
- [x] Checklist de validation créée
- [ ] Admin implémenté (à faire avec prompt)
- [ ] Mobile implémenté (à faire avec prompt)
- [ ] Tests bout en bout validés

---

**Statut :** ✅ **Prêt pour implémentation client**

Les prompts sont prêts à être utilisés dans les repos `kashup-admin` et `kashup-mobile`.

