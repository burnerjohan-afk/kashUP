# ✅ Checklist de Validation Bout en Bout

**Date :** 2024-12-13  
**Objectif :** Valider la synchronisation stable entre Kashup-api, Kashup-admin et Kashup-mobile

---

## 🔧 Prérequis

- [ ] API démarrée sur `http://localhost:4000`
- [ ] Base de données vide (ou reset)
- [ ] Admin démarré sur `http://localhost:5173`
- [ ] Mobile démarré (Expo/React Native)
- [ ] Tokens d'authentification valides (admin + user)

---

## 📋 Tests de base (API seule)

### Test 1 : Base vide retourne 0 et []
- [ ] `GET /api/v1/partners` → `{ data: { partners: [] }, meta: { pagination: { total: 0 } } }`
- [ ] `GET /api/v1/offers/current` → `{ data: { offers: [] }, meta: { pagination: { total: 0 } } }`
- [ ] `GET /api/v1/transactions` → `{ data: { items: [], total: 0 } }`
- [ ] `GET /api/v1/admin/dashboard` → KPIs à 0, tableaux vides

### Test 2 : Format de réponse standard
- [ ] Toutes les réponses incluent `statusCode`, `success`, `message`, `data`, `meta`
- [ ] Les erreurs incluent `statusCode`, `success: false`, `message`, `meta.details`
- [ ] `X-Request-Id` présent dans les headers de réponse

### Test 3 : Pagination
- [ ] `GET /api/v1/partners?page=1&pageSize=10` → `meta.pagination` correct
- [ ] `GET /api/v1/partners?page=2&pageSize=10` → page 2 retournée
- [ ] `GET /api/v1/partners?pageSize=300` → limité à 200 (max)

### Test 4 : Delta sync
- [ ] Créer un partenaire → `updatedAt` présent
- [ ] `GET /api/v1/partners?updatedSince=<avant_creation>` → partenaire retourné
- [ ] `GET /api/v1/partners?updatedSince=<apres_creation>` → partenaire non retourné

---

## 🔄 Tests Admin → API → Mobile

### Test 5 : Création partenaire
1. **Admin** : Créer un partenaire "Test Partner"
   - [ ] POST `/api/v1/partners` → 201
   - [ ] Réponse inclut `id`, `createdAt`, `updatedAt`
   - [ ] Cache invalidé dans admin (liste mise à jour)

2. **API** : Vérifier persistance
   - [ ] `GET /api/v1/partners/:id` → partenaire retourné
   - [ ] `GET /api/v1/partners` → partenaire dans la liste

3. **Mobile** : Vérifier synchronisation
   - [ ] Pull-to-refresh ou delta sync
   - [ ] `GET /api/v1/partners?updatedSince=<timestamp>` → partenaire retourné
   - [ ] Partenaire affiché dans la liste mobile

### Test 6 : Modification partenaire
1. **Admin** : Modifier "Test Partner" (nom, logo, etc.)
   - [ ] PATCH `/api/v1/partners/:id` → 200
   - [ ] Réponse inclut `updatedAt` mis à jour
   - [ ] Cache invalidé dans admin

2. **Mobile** : Vérifier synchronisation
   - [ ] Delta sync avec `updatedSince=<avant_modification>`
   - [ ] Modifications visibles dans mobile

### Test 7 : Suppression partenaire (soft delete)
1. **Admin** : Supprimer "Test Partner"
   - [ ] DELETE `/api/v1/partners/:id` → 204 ou 200
   - [ ] `deletedAt` présent dans la base

2. **API** : Vérifier soft delete
   - [ ] `GET /api/v1/partners/:id` → 404 (ou 200 avec `deletedAt`)
   - [ ] `GET /api/v1/partners` → partenaire non retourné (sauf `includeDeleted=true`)

3. **Mobile** : Vérifier synchronisation
   - [ ] `GET /api/v1/sync/changes?updatedSince=<avant_suppression>` → `action: 'deleted'`
   - [ ] Partenaire retiré de la liste mobile

### Test 8 : Création offre
1. **Admin** : Créer une offre "Offre Test"
   - [ ] POST `/api/v1/offers` → 201
   - [ ] Cache invalidé

2. **Mobile** : Vérifier synchronisation
   - [ ] `GET /api/v1/offers/current?updatedSince=<timestamp>` → offre retournée
   - [ ] Offre affichée dans mobile

### Test 9 : Transaction utilisateur
1. **Mobile** : Créer une transaction
   - [ ] POST `/api/v1/transactions` → 201
   - [ ] Transaction visible dans `GET /api/v1/me/transactions`

2. **Admin** : Vérifier dans dashboard
   - [ ] `GET /api/v1/admin/dashboard` → transaction comptabilisée
   - [ ] `GET /api/v1/transactions` → transaction dans la liste

### Test 10 : Synchronisation globale
1. **Mobile** : Utiliser endpoint sync global
   - [ ] `GET /api/v1/sync/changes?updatedSince=<timestamp>` → liste de changements
   - [ ] Tous les changements (partners, offers, rewards, etc.) retournés
   - [ ] Format : `{ type, id, action, updatedAt, deletedAt? }`

---

## 🐛 Tests d'erreurs

### Test 11 : Erreurs API
- [ ] Requête sans token → 401 avec message clair
- [ ] Requête avec token invalide → 401
- [ ] Requête avec permissions insuffisantes → 403
- [ ] Ressource inexistante → 404
- [ ] Validation échouée → 422 avec détails Zod

### Test 12 : États vides
- [ ] Admin : Base vide → Dashboard affiche 0 partout, pas de chiffres inventés
- [ ] Mobile : Base vide → Listes vides, message "Aucune donnée"
- [ ] Aucun fallback/mock qui invente des données

### Test 13 : Gestion offline (mobile)
- [ ] Désactiver réseau → Erreur réseau affichée
- [ ] Créer transaction offline → Mise en queue
- [ ] Réactiver réseau → Queue rejouée, transaction créée

---

## 📊 Tests de performance

### Test 14 : Pagination efficace
- [ ] Liste de 1000 partenaires → Pagination fonctionne (page 1, 2, 3...)
- [ ] `pageSize=50` → 50 résultats par page
- [ ] `hasNextPage` / `hasPrevPage` corrects

### Test 15 : Delta sync efficace
- [ ] 100 changements depuis `updatedSince` → Tous retournés
- [ ] Tri par `updatedAt desc` → Plus récent en premier
- [ ] Pas de doublons

---

## 🔍 Tests d'observabilité

### Test 16 : Logs structurés
- [ ] Toutes les requêtes loggées avec `requestId`
- [ ] Erreurs loggées avec contexte (userId, path, method)
- [ ] Durée de requête loggée

### Test 17 : Headers de corrélation
- [ ] `X-Request-Id` présent dans toutes les réponses
- [ ] `X-Request-Id` utilisable pour corréler logs client/serveur

---

## ✅ Validation finale

### Checklist globale
- [ ] **Admin** : Toutes les créations/modifications persistent via API
- [ ] **API** : Toutes les mutations retournent `updatedAt` mis à jour
- [ ] **Mobile** : Toutes les synchronisations récupèrent les changements
- [ ] **Base vide** : 0 et [] partout, pas de chiffres inventés
- [ ] **Erreurs** : Format standardisé, messages clairs
- [ ] **Cache** : Invalidation correcte après mutations
- [ ] **Delta sync** : Efficace, pas de rechargement complet
- [ ] **Offline** : Gestion gracieuse (optionnel)

### Plan de test manuel (10 étapes)

1. **Reset base de données** : `npx prisma migrate reset`
2. **Vérifier base vide** : Dashboard admin = 0, listes vides
3. **Admin crée partenaire** : "Carrefour Test"
4. **Vérifier API** : `GET /api/v1/partners` → partenaire présent
5. **Mobile sync** : Pull-to-refresh → partenaire visible
6. **Admin modifie partenaire** : Changer le nom
7. **Mobile delta sync** : `updatedSince=<avant_modification>` → modification visible
8. **Admin crée offre** : "Offre Test"
9. **Mobile sync** : Offre visible dans mobile
10. **Admin supprime partenaire** : Soft delete
11. **Mobile sync** : `GET /api/v1/sync/changes` → `action: 'deleted'`
12. **Vérifier suppression** : Partenaire retiré de mobile

---

## 🚨 Points d'attention

- **Base vide** : Vérifier que tous les endpoints retournent 0 et [] (pas de fallback)
- **Cache** : Vérifier invalidation après mutations (admin)
- **Delta sync** : Vérifier que `updatedSince` fonctionne pour toutes les ressources
- **Soft delete** : Vérifier que les suppressions apparaissent dans `/sync/changes`
- **Erreurs réseau** : Vérifier gestion gracieuse (mobile)
- **Tokens** : Vérifier refresh automatique si applicable

---

**Statut :** ⏳ À valider  
**Dernière mise à jour :** 2024-12-13

