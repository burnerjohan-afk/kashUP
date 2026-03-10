# Analyse complète de l’application KashUP – Jackpot communautaire

Document d’analyse produit **avant toute modification du code**, pour identifier l’architecture existante, les points de raccordement au jackpot et les conventions à respecter.

---

## 1. Architecture backend (kashup-api)

### 1.1 Structure du projet

| Dossier / Fichier | Rôle |
|-------------------|------|
| `src/server.ts` | Point d’entrée : crée l’app, écoute le port, enregistre les jobs cron (hors Vercel) |
| `src/app.ts` | Express : CORS, Helmet, body parser, rate limit, static `/uploads`, montage du router |
| `src/routes/index.ts` | Montage de toutes les routes API sous plusieurs préfixes : `/api/v1`, `/v1`, `/api`, `/` |
| `src/config/` | `env.ts`, `prisma.ts`, `upload.ts` |
| `src/controllers/` | Handlers HTTP (auth, user, partner, reward, transaction, lottery, challenge, admin, blob, etc.) |
| `src/services/` | Logique métier (reward, rewardHistory, lotteryEngine, challengeEngine, transaction, notification, coffreFort, etc.) |
| `src/schemas/` | Validation Zod (auth, partner, reward, lottery, challenge, transaction, etc.) |
| `src/events/event-bus.ts` | Bus d’événements in-process (`notificationBus`, EventEmitter) |
| `src/jobs/scheduler.ts` | Cron (toutes les 15 min Powens, toutes les heures Drimify, toutes les 30 min tirages loteries) |
| `prisma/schema.prisma` | Modèles Prisma (PostgreSQL) |

### 1.2 Routes principales (sous `/api/v1`)

- **Auth** : `/auth` (login, signup, refresh, Apple/Google)
- **Utilisateur** : `/me`, `/me/wallet`, `/me/notifications`, `/me/transactions`, etc.
- **Partenaires** : `/partners`, `/partners/:id`, `/partners/categories/list`
- **Transactions** : `/transactions` (création, liste, export, flag)
- **Rewards** : `/rewards` (boosts, badges, loteries, challenges) + routes admin
- **Loteries** : `/lotteries` et `/rewards/lotteries`, `/rewards/lotteries/home`, `/rewards/lotteries/:id`, `POST .../join`
- **Challenges** : via rewardHistory (liste, catégories)
- **Admin** : `/admin` (rewards CRUD, lotteries draw, challenges, config coffre-fort, etc.)
- **Config** : `/admin/config/coffre-fort` (GET/PATCH)

### 1.3 Conventions techniques

- **Réponses** : format `StandardResponse` (success, data, message, statusCode) ; `sendSuccess` / `AppError` côté contrôleurs.
- **Auth** : JWT dans `Authorization: Bearer <token>` ; middlewares `authMiddleware`, `optionalAuthMiddleware`, `requireRoles(...)`.
- **Upload** : Multer (`uploadSingleOptional('image')` pour rewards), `processUploadedFile` → chemin relatif type `/uploads/rewards/...`.
- **Événements** : `notificationBus.emitEvent({ type, payload })` ; abonnés dans `notification.service.ts` (création notification + `checkChallengeProgress` pour `transaction_created`).

---

## 2. Modèle utilisateur

### 2.1 User (Prisma)

- **Champs** : id (cuid), email, hashedPassword, appleId, googleId, firstName, lastName, phone, role (default "user"), territory, gender, ageRange, partnerId (si compte partenaire), createdAt, updatedAt.
- **Relations** : Wallet (1:1), Points, Transaction, RewardHistory, LotteryEntry, LotteryTicket, LotteryWinner, ChallengeProgress, UserBoost, UserBadge, Notifications, CoffreFort*, etc.

### 2.2 Wallet

- **Champs** : id, userId (unique), **soldeCashback**, **soldePoints**, **soldeCoffreFort**, createdAt, updatedAt.
- Création : pas de `prisma.wallet.create` trouvé dans les services explorés ; à confirmer (signup / migration / seed).

### 2.3 Points (ledger)

- **Modèle** : `Points` : userId, **delta** (signé), **reason**, createdAt. Journal des mouvements de points.
- **Solde** : `Wallet.soldePoints` = solde courant ; tout ajout/retrait est doublon d’un enregistrement `Points`.

---

## 3. Système cashback partenaires

### 3.1 Partenaire (Partner)

- **Cashback** : `tauxCashbackBase` (obligatoire), `discoveryCashbackRate`, `permanentCashbackRate`, partages KashUP/user (discovery/permanent).
- **Utilisation effective** : dans `transaction.service.ts`, seul **`tauxCashbackBase`** est utilisé pour le calcul du cashback à la création d’une transaction.

### 3.2 Transaction (achat partenaire)

- **Modèle** : userId, partnerId, amount, **cashbackEarned**, **pointsEarned**, transactionDate, source (carte | virement | manuel), status (confirmed | flagged), metadata.
- **Calcul** (dans `createTransaction`) :
  - `baseCashback = (amount * partner.tauxCashbackBase) / 100`
  - `cashbackEarned = baseCashback * multiplier` (multiplier = boost actif si applicable)
  - `pointsEarned = round(amount * 10)` (10 points par euro)
- **Effets** : création `Transaction`, mise à jour `Wallet` (soldeCashback +=, soldePoints +=), création `Points` (delta positif), émission `transaction_created` sur le bus.

### 3.3 Point d’accroche jackpot (cashback)

- Après création de transaction : `notificationBus.emitEvent({ type: 'transaction_created', payload: { userId, transactionId, amount, partnerId } })`.
- Un futur **communityJackpotEngine** pourra s’abonner à `transaction_created`, récupérer la transaction (cashbackEarned), appliquer `cashbackContributionPercent` et enregistrer une **JackpotContribution** (sourceType: `partner_cashback`).

---

## 4. Système de points

### 4.1 Où sont stockés les points

- **Solde** : `Wallet.soldePoints`.
- **Historique** : `Points` (userId, delta, reason, createdAt).

### 4.2 Gain de points

| Flux | Fichier | Effet |
|------|---------|--------|
| Transaction partenaire | `transaction.service.ts` | +pointsEarned (amount × 10), Wallet + Points |
| Loterie (gain) | `lotteryEngine.ts` (grantLotteryPrize) | +prizeValue si points_bonus/points, Wallet + Points |
| Challenge complété | `challengeEngine.ts` (grantReward) | +rewardValue si rewardType points, Wallet + Points |

### 4.3 Dépense de points

| Flux | Fichier | Effet |
|------|---------|--------|
| Participation loterie | `lotteryEngine.enterLottery` | −(ticketCount × pointsPerTicket), Wallet + Points (delta négatif) |
| Achat boost | `reward.service.purchaseBoost` | −costInPoints, Wallet + Points (delta négatif) |

---

## 5. Modules loterie

### 5.1 Modèles Prisma

- **Lottery** : title, description, imageUrl, prizeType, prizeTitle/Description/Value/Currency, partnerId, **pointsPerTicket** (default 100), isTicketStockLimited, totalTicketsAvailable, totalTicketsSold, maxTicketsPerUser, startAt/endAt/drawDate, status (upcoming|active|closed), winnerUserId, showOnHome, showOnRewards, active, deletedAt.
- **LotteryEntry** : lotteryId, userId, ticketCount, pointsSpent (une entrée par user/loterie).
- **LotteryTicket** : lotteryId, userId, entryId, ticketNumber, status (valid|used|void).
- **LotteryWinner** : lotteryId, userId, entryId, ticketId, drawDate, rewardStatus, deliveredAt.

### 5.2 Moteur (lotteryEngine.ts)

- **getActiveLotteries**, **getActiveLotteriesForHome**, **getActiveLotteriesForRewards** : listes selon statut/dates/showOnHome/showOnRewards.
- **enterLottery(userId, lotteryId, ticketCount)** : vérif wallet/limites/stock ; en une transaction Prisma : upsert LotteryEntry, décrémente Wallet.soldePoints, crée Points (delta négatif), incrémente totalTicketsSold, crée LotteryTicket ; émet `lottery_joined` ; crée notification.
- **drawWinner(lotteryId)** : tire un ticket valide au hasard, crée LotteryWinner, marque ticket used, grantLotteryPrize, notifie.
- **processLotteriesDueForDraw()** : appelé par le cron (toutes les 30 min).

### 5.3 Point d’accroche jackpot (loterie)

- Événement **`lottery_joined`** : payload { userId, lotteryId, ticketCount, pointsSpent }.
- À l’appel de **enterLottery** (ou dans un abonné au bus), le jackpot pourra : enregistrer une **JackpotContribution** (sourceType: `lottery_ticket`) avec **lotteryPointsContribution** (config) en points jackpot, et mettre à jour **JackpotEntry** (tickets +1 ou +N selon règle configurable).

---

## 6. Modules challenges

### 6.1 Modèles Prisma

- **Challenge** : title, description, category, type (challenge_purchase | challenge_spend | challenge_discovery | challenge_loyalty | challenge_invite | challenge_geo | challenge_event), goalType, goalValue, rewardPoints, rewardId (ChallengeReward), difficulty, startAt, endAt, status, partnerId.
- **ChallengeProgress** : challengeId, userId, progress, completedAt, updatedAt.
- **ChallengeReward** : rewardType (cashback|points|gift_card|voucher|badge|boost), rewardValue, rewardCurrency, expirationDays.

### 6.2 Moteur (challengeEngine.ts)

- **checkChallengeProgress(userId, eventType, payload)** : appelé depuis `notification.service.ts` sur `transaction_created` ; pour chaque défi actif compatible avec l’événement, recalcule la progression (computeProgressDelta), met à jour ChallengeProgress ; si progression ≥ 100 %, **completeChallenge** puis **grantReward** (cashback ou points), notification.
- **eventTypeToChallengeTypes** : mappe eventType → types de défis (ex. transaction_created → purchase, spend, discovery, loyalty).
- Aucun autre eventType (gift_card_used, qr_validated, invite_completed, etc.) n’est branché dans le fichier exploré.

### 6.3 Point d’accroche jackpot (challenges)

- Lors de **completeChallenge** (ou dans un abonné dédié) : enregistrer une **JackpotContribution** (sourceType: `challenge_completion`) avec **challengePointsContribution** (config), et mettre à jour **JackpotEntry** (tickets selon règle).

---

## 7. Modules rewards (général)

### 7.1 reward.service.ts

- **listBoosts**, **listBadges**, **purchaseBoost** (débit points, création UserBoost, émission `boost_purchased`).
- **listAllRewards(params, type)** : liste unifiée admin (boost | badge | lottery | challenge).
- **createReward**, **updateReward**, **deleteReward** : dispatch par type (boost, badge, lottery, challenge) ; loterie = soft delete.

### 7.2 rewardHistory.service.ts

- **listRewardHistory(userId)** : historique des récompenses utilisateur (category, title, details).
- **listChallenges**, **listChallengeCategories** : utilisés par les contrôleurs “app” pour les écrans challenges.

### 7.3 Événements émis

- `transaction_created` (transaction.service)
- `boost_purchased` (reward.service)
- `lottery_joined`, `lottery_winner` (lotteryEngine)
- `drimify_experience_result`, `powens_connection_sync`

Un **nouvel événement** (ex. `challenge_completed`) pourrait être émis par challengeEngine et consommé par le jackpot pour enregistrer la contribution challenge.

---

## 8. Structure page Home (app mobile)

### 8.1 HomeScreen (kashup-mobile)

- **Layout** : SafeAreaView, dégradé de fond, header fixe (logo, recherche, notifications, profil).
- **Sections (ordre)** :
  1. Carte “Mon KashUP” (solde cashback, points) — `useWallet()`.
  2. Bannières / pubs — `useHomeBanners()` → GET `/home-banners`.
  3. **Loteries KashUP** — carousel horizontal — `useLotteriesForHome()` → GET `/rewards/lotteries/home`.
  4. Offres du moment — `useCurrentOffers()` → GET `/offers/current`.
  5. “Trouvez les partenaires autour de vous” (CTA).
  6. Pépites, partenaires boostés, populaires, gros cashback — `usePartners()`.
  7. CTA “Voir tous les partenaires”.

### 8.2 Intégration jackpot (objectif produit)

- Ajouter un **bloc Jackpot** (ex. entre bannières et loteries ou en haut) :
  - Titre type “Jackpot KashUP”.
  - Montant actuel (currentAmount + currency).
  - Compte à rebours (vers maxDrawDate ou prochain seuil).
  - Barres de progression : achats partenaires cumulés (totalPartnerPurchasesAmount / globalPartnerPurchaseAmountThreshold), actions (totalActions / globalActionsThreshold).
- Données : nouvel endpoint ex. `GET /api/v1/jackpot` ou `GET /api/v1/community-jackpot/current` (montant, seuils, progression, maxDrawDate, statut).

---

## 9. Conventions de code existantes

### 9.1 API

- Contrôleurs : `asyncHandler`, `sendSuccess`, `AppError` pour les erreurs métier.
- Schémas Zod : `reward.schema.ts`, `updateRewardFormSchema` ; champs optionnels avec preprocess pour vides/NaN.
- FormData (rewards/loteries) : `parseRewardBody` pour body stringifié ; `uploadSingleOptional('image')` ; imageUrl prioritaire depuis `req.file` puis body.
- Config back-office : pattern “config singleton” (ex. **CoffreFortConfig** : `findFirst` / `create` / `update`), routes dédiées sous `/admin/config/...`.

### 9.2 Configuration back-office (existant)

- **CoffreFortConfig** : lockPeriodMonths, pointsPerEuroPerMonth ; GET/PATCH `admin/config/coffre-fort`.
- **Admin settings** : roles, global objectives, audit log (kashup-admin `features/settings/api.ts` → `admin/settings/roles`, `admin/settings/globals`, `admin/settings/audit-log`).
- **Gift cards** : `giftCardConfig`, `boxUpConfig` (GET/PATCH/POST sous `/gift-cards/config`, `/gift-cards/box-up/config`).

Pour le jackpot : créer un **CommunityJackpotConfig** (ou un seul enregistrement “actif”) avec les paramètres listés dans l’objectif produit (cashbackContributionPercent, lotteryPointsContribution, challengePointsContribution, seuils, maxDrawDate, minActionsPerUser, minPartnerPurchasesPerUser, règles de tickets par action). CRUD ou GET/PATCH sous `/admin/config/community-jackpot` (ou équivalent).

### 9.3 Mobile

- Hooks React Query : `useWallet()`, `useRewards()`, `useLotteriesForHome()`, `usePartners()`, etc.
- Services : `rewardService.ts`, `lotteryService.ts`, `walletService.ts`, etc. ; base URL via `getApiBaseUrl()` / `apiOrigin` (`runtime.ts`, `EXPO_PUBLIC_API_URL`).
- Navigation : stacks (HomeStack, RewardsStack, etc.) ; paramètres passés par route (ex. lotteryId, lottery).

### 9.4 Réutilisation pour le jackpot

- **Services** : réutiliser `transaction.service` (ne pas dupliquer la logique cashback), `lotteryEngine` (ne pas modifier enterLottery pour la logique métier loterie), `challengeEngine` (compléter completeChallenge ou abonnement bus pour notifier le jackpot). Le jackpot sera un **consommateur** des flux existants (événements + lecture des données).
- **Points** : les “points jackpot” (contributions) peuvent être un concept séparé (champs dans JackpotContribution / JackpotEntry) ou alignés sur les points existants selon le choix produit ; les tickets jackpot (JackpotEntry.tickets) sont distincts des tickets loterie.
- **Eligibilité** : calcul côté backend à partir de `minActionsPerUser` et `minPartnerPurchasesPerUser` sur les compteurs déjà prévus (actionsCount, partnerPurchasesCount dans JackpotEntry ou agrégés).

---

## 10. Synthèse des points de raccordement (sans casser l’existant)

| Source | Où brancher | Action jackpot |
|--------|-------------|----------------|
| Cashback partenaires | Après `createTransaction` (ou abonnement `transaction_created`) | Lire Transaction.cashbackEarned, appliquer cashbackContributionPercent, créditer jackpot (currentAmount), créer JackpotContribution (partner_cashback), mettre à jour JackpotEntry (tickets + N, actionsCount +1, partnerPurchasesCount +1, totalPartnerPurchasesAmount). |
| Loterie | Après `enterLottery` (ou abonnement `lottery_joined`) | Créer JackpotContribution (lottery_ticket, sourceReferenceId = lotteryId ou entryId), ajouter lotteryPointsContribution au jackpot, mettre à jour JackpotEntry (tickets + config). |
| Challenges | À la fin de `completeChallenge` (ou nouvel événement `challenge_completed`) | Créer JackpotContribution (challenge_completion), ajouter challengePointsContribution, mettre à jour JackpotEntry (tickets + config). |
| Participation gratuite | Nouvelle route ex. `POST /jackpot/participate` ou `POST /community-jackpot/participate` | registerFreeParticipation(userId) : 1 ticket, JackpotContribution (free_participation), actionsCount +1. |
| Sponsors | Admin : “définir partenaires sponsors + montant” | addSponsorContribution(partnerId, amount) : JackpotContribution (sponsor), currentAmount += amount. |
| Déclenchement tirage | Cron (comme processLotteriesDueForDraw) ou après chaque contribution | checkTriggerConditions() : si (totalPartnerPurchasesAmount >= seuil ET totalActions >= seuil) OU now >= maxDrawDate → drawJackpotWinner(), puis resetJackpot() / calculateNextDrawDate(). |

---

## 11. Conformité jeu promotionnel (rappel)

- Participation **gratuite** possible (mission quotidienne, challenge gratuit, action simple → 1 ticket).
- **Aucun achat obligatoire** pour participer.
- Les achats partenaires donnent uniquement des **chances supplémentaires** (tickets en plus).
- Règles d’éligibilité au gain configurables (minActionsPerUser, optionnellement minPartnerPurchasesPerUser) sans imposer un achat.

---

## 12. Prochaines étapes recommandées (implémentation)

1. **Prisma** : ajouter les modèles CommunityJackpot, JackpotContribution, JackpotEntry, JackpotWinner, et une table de config (CommunityJackpotConfig ou champs sur CommunityJackpot).
2. **API** : créer `communityJackpotEngine` avec les fonctions listées dans le cahier des charges ; endpoints publics (GET current, GET user stats, POST participate) et admin (config, déclencher tirage, liste contributions/entrées/gagnants).
3. **Events** : abonner le moteur jackpot à `transaction_created`, `lottery_joined` ; ajouter émission `challenge_completed` depuis challengeEngine et abonnement côté jackpot.
4. **Transaction.service** : après création de transaction, appeler (ou émettre un événement) pour contribution cashback jackpot sans modifier la logique métier existante.
5. **LotteryEngine** : après enterLottery, appeler (ou émettre) pour contribution loterie jackpot.
6. **ChallengeEngine** : après completeChallenge, émettre/champer pour contribution challenge jackpot.
7. **Back-office** : page Config Jackpot (paramètres, seuils, éligibilité, sponsors, règles de tickets).
8. **Mobile** : bloc Home + page Jackpot dédiée (montant, progression, conditions, participation gratuite, progression user).
9. **Notifications** : jackpot augmente fortement, seuils proches, tirage déclenché, gagnant annoncé.
10. **Sécurité** : tirage uniquement backend ; journalisation contributions, tickets, actions, tirages, gagnants.

---

*Document généré pour préparer l’implémentation du Jackpot Communautaire KashUP en réutilisant les services existants et en respectant les conventions du projet.*
