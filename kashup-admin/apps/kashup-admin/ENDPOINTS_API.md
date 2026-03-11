# Documentation des Endpoints API utilisés par kashup-admin

Ce document liste tous les endpoints API appelés par le back-office kashup-admin et leurs paramètres.

## 📋 Partenaires

### GET /partners
**Description:** Récupère la liste des partenaires avec filtres optionnels.

**Query Parameters (tous optionnels):**
- `territory?`: `'martinique' | 'guadeloupe' | 'guyane'` (si `'all'` ou `undefined`, le paramètre n'est PAS envoyé)
- `category?`: `string` (si chaîne vide, le paramètre n'est PAS envoyé)
- `search?`: `string` (si chaîne vide, le paramètre n'est PAS envoyé)
- `sortBy?`: `'transactionGrowth' | 'averageBasketGrowth' | 'name'` (si `undefined`, le paramètre n'est PAS envoyé)
- `sortOrder?`: `'asc' | 'desc'` (si `undefined`, le paramètre n'est PAS envoyé)

**Réponse:** `Array<Partner>`

**Fichier:** `src/features/partners/api.ts` → `fetchPartners()`

---

### GET /partners/:id
**Description:** Récupère un partenaire par son ID.

**Path Parameters:**
- `id`: `string` (obligatoire)

**Réponse:** `Partner`

**Fichier:** `src/features/partners/api.ts` → `fetchPartnerById()`

---

### POST /partners
**Description:** Crée un nouveau partenaire.

**Content-Type:** `multipart/form-data` (le navigateur définit automatiquement le Content-Type avec le boundary)

**Body (FormData):**
- `name`: `string` (obligatoire)
- `category`: `string` (obligatoire)
- `status`: `'active' | 'inactive' | 'pending'` (obligatoire)
- `territories[]`: `Array<'martinique' | 'guadeloupe' | 'guyane'>` (obligatoire, au moins un territoire)
- `siret?`: `string` (optionnel)
- `phone?`: `string` (optionnel)
- `address?`: `string` (optionnel)
- `logo?`: `File` (optionnel, image)
- `kbis?`: `File` (optionnel, PDF/image)
- `discoveryCashbackRate?`: `number` (optionnel, 0-100)
- `permanentCashbackRate?`: `number` (optionnel, 0-100)
- `welcomeAffiliationAmount?`: `number` (optionnel)
- `permanentAffiliationAmount?`: `number` (optionnel)
- `welcomeUserRate?`: `number` (optionnel, 0-100)
- `welcomeKashUPRate?`: `number` (optionnel, 0-100)
- `permanentUserRate?`: `number` (optionnel, 0-100)
- `permanentKashUPRate?`: `number` (optionnel, 0-100)
- `giftCardEnabled?`: `boolean` (optionnel)
- `giftCardCashbackRate?`: `number` (optionnel, 0-100)
- `giftCardDescription?`: `string` (optionnel)
- `giftCardImage?`: `File` (optionnel, image)
- `giftCardVirtualCardImage?`: `File` (optionnel, image)
- `boostEnabled?`: `boolean` (optionnel)
- `boostRate?`: `number` (optionnel, 0-100)
- `pointsPerTransaction?`: `number` (optionnel)
- `marketingPrograms[]?`: `Array<'pepites' | 'boosted' | 'most-searched'>` (optionnel)
- `openingHoursStart?`: `string` (optionnel, format time)
- `openingHoursEnd?`: `string` (optionnel, format time)
- `openingDays[]?`: `Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>` (optionnel)
- `instagramUrl?`: `string` (optionnel, URL)
- `facebookUrl?`: `string` (optionnel, URL)
- `menuImages[]?`: `Array<File>` (optionnel, images)
- `photos[]?`: `Array<File>` (optionnel, images)

**Réponse:** `Partner`

**Fichier:** `src/features/partners/api.ts` → `createPartner()`

**Note importante:** Le Content-Type est géré automatiquement par le navigateur. Ne PAS définir manuellement le Content-Type pour les requêtes FormData.

---

### PATCH /partners/:id
**Description:** Met à jour un partenaire existant.

**Path Parameters:**
- `id`: `string` (obligatoire)

**Content-Type:** `multipart/form-data` (le navigateur définit automatiquement le Content-Type avec le boundary)

**Body (FormData):** Mêmes champs que POST /partners, mais tous optionnels (seuls les champs modifiés sont envoyés)

**Réponse:** `Partner`

**Fichier:** `src/features/partners/api.ts` → `updatePartner()`

---

### GET /partners/categories
**Description:** Récupère la liste des catégories de partenaires.

**Query Parameters:** Aucun

**Réponse:** `Array<string>` ou `Array<{ id: string; name: string }>`

**Fichier:** `src/features/partners/api.ts` → `fetchPartnerCategories()`

**Note:** Le front-end transforme automatiquement les objets en strings si nécessaire.

---

### GET /partners/:id/statistics
**Description:** Récupère les statistiques d'un partenaire.

**Path Parameters:**
- `id`: `string` (obligatoire)

**Réponse:** `PartnerStatistics`

**Fichier:** `src/features/partners/api.ts` → `fetchPartnerStatistics()`

---

### GET /partners/:id/documents
**Description:** Récupère les documents d'un partenaire.

**Path Parameters:**
- `id`: `string` (obligatoire)

**Réponse:** `Array<PartnerDocument>`

**Fichier:** `src/features/partners/api.ts` → `fetchPartnerDocuments()`

---

## 📊 Statistiques Dashboard

### GET /admin/statistics/table
**Description:** Récupère les statistiques détaillées avec filtres avancés.

**Query Parameters (tous optionnels):**
- `territory?`: `'martinique' | 'guadeloupe' | 'guyane'` (si `'all'`, le paramètre n'est PAS envoyé)
- `sector?`: `string` (si `'all'` ou chaîne vide, le paramètre n'est PAS envoyé)
- `month?`: `string` (1-12, si `'all'`, le paramètre n'est PAS envoyé)
- `day?`: `string` (0-6, si `'all'`, le paramètre n'est PAS envoyé)
- `timeSlot?`: `string` (si `'all'`, le paramètre n'est PAS envoyé)
- `gender?`: `'male' | 'female'` (si `'all'`, le paramètre n'est PAS envoyé)
- `ageRange?`: `string` (si `'all'`, le paramètre n'est PAS envoyé)

**Réponse:** `Array<StatisticsTableRow>`

**Fichier:** `src/features/dashboard/api.ts` → `fetchStatisticsTable()`

**Gestion d'erreur:** En cas d'erreur 404/400/500, retourne un tableau vide `[]` pour éviter les crashes.

---

### GET /admin/statistics/departments
**Description:** Récupère les statistiques globales pour tous les départements.

**Query Parameters:** Aucun

**Réponse:** `Array<DepartmentStatistics>` (3 éléments : martinique, guadeloupe, guyane)

**Fichier:** `src/features/dashboard/api.ts` → `fetchDepartmentGlobalStats()`

**Gestion d'erreur:** En cas d'erreur 404/400/500, retourne un tableau vide `[]` pour éviter les crashes.

---

### GET /admin/statistics/detail
**Description:** Récupère les détails d'une statistique spécifique (évolutions M-1, N-1, etc.).

**Query Parameters:**
- `period`: `string` (obligatoire, libellé de la période)
- `territory?`: `string` (optionnel, si présent dans filters)
- `sector?`: `string` (optionnel, si présent dans filters)
- `month?`: `string` (optionnel, si présent dans filters)
- `day?`: `string` (optionnel, si présent dans filters)
- `timeSlot?`: `string` (optionnel, si présent dans filters)
- `gender?`: `string` (optionnel, si présent dans filters)
- `ageRange?`: `string` (optionnel, si présent dans filters)

**Réponse:** `StatisticsDetailData`

**Fichier:** `src/features/dashboard/api.ts` → `fetchStatisticsDetail()`

**Gestion d'erreur:** En cas d'erreur 404/400/500, retourne une structure vide mais valide pour éviter les crashes.

---

### GET /admin/ai/analysis
**Description:** Récupère l'analyse IA des statistiques pour un territoire donné.

**Query Parameters:**
- `territory?`: `'martinique' | 'guadeloupe' | 'guyane'` (si `'all'` ou `undefined`, le paramètre n'est PAS envoyé)

**Réponse:** `AIAnalysis`

**Fichier:** `src/features/dashboard/api.ts` → `fetchAIAnalysis()`

**Gestion d'erreur:** En cas d'erreur 404/400/500, retourne une analyse vide avec message "L'analyse IA n'est pas disponible pour le moment."

---

## 🔑 Règles importantes

1. **Nettoyage des paramètres:** Les paramètres avec valeur `'all'`, chaîne vide `''`, ou `undefined` ne sont PAS envoyés dans la query string pour éviter les erreurs 400/500.

2. **FormData:** Pour les requêtes POST/PATCH avec fichiers (logo, kbis, etc.), utiliser `multipart/form-data`. Le Content-Type est défini automatiquement par le navigateur (ne PAS le définir manuellement).

3. **Gestion d'erreur:** Tous les endpoints de statistiques gèrent les erreurs 404/400/500 en retournant des valeurs par défaut (tableaux vides, structures vides) pour éviter les crashes de l'interface.

4. **Types:** Tous les types TypeScript sont définis dans :
   - `src/features/partners/api.ts` pour les partenaires
   - `src/features/dashboard/api.ts` pour les statistiques
   - `src/api/admin.ts` pour les endpoints admin centralisés

---

## 📝 Notes de développement

- Les erreurs sont loggées en console en mode développement (`import.meta.env.DEV`)
- Les erreurs réseau sont gérées avec des messages clairs pour l'utilisateur
- Les erreurs de validation (400) affichent les détails des champs invalides
- Les erreurs serveur (500) sont loggées avec les détails complets en développement

