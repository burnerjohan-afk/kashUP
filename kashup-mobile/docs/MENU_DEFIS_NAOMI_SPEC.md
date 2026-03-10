# Spec menu Défis façon Naomi

Analyse des captures Naomi et correspondance avec KashUP. Règle : **l’obtention ou la réussite d’un défi donne des points**.

---

## 1. Structure Naomi (d’après les visuels)

### 1.1 Écran principal « Badges & points »

- **En-tête** : titre « Badges & points », flèche retour, (i) info.
- **Liste de catégories** (cartes empilées) :
  - **Connexion** — Progression `0/1`, points `0 points`
  - **Consentements** — Progression `1/3`, points `200 points`
  - **Challenges** — Progression `0/21`, points `0 points`
  - **Parrainages** — Progression `0/6`, points `0 points`
  - **Cagnotte** — Progression `0/6`, points `0 points`
  - **Ma Fid'** — Progression `0/4`, points `0 points`
- Chaque carte : **titre**, **X points** à droite, **barre de progression** avec libellé **X/Y** (réalisé / total).

### 1.2 Catégorie « Consentements »

- **Liste de défis** (un par écran ou liste scrollable) :
  - **Email** : icône enveloppe + cadenas, « Badge bloqué », **100 points**, texte d’explication, bouton « Activer les emails ».
  - **Notifications push** : icône cloche + cadenas, « Badge bloqué », **100 points**, texte, bouton « Activer les notifications ».
- Règle : **réussite = déblocage du badge + attribution des points**.

### 1.3 Catégorie « Challenges » (type jeu)

- **Grille 2 colonnes** de cartes.
- Chaque carte : **chiffre / icône** (éclair, étoiles, roue), **libellé** (ex. « 10 bonnes réponses »), **X points** en gras.
- Exemples de séries et récompenses :
  - Bonnes réponses : 1 → 10 pts, 10 → 20, 50 → 50, 100 → 100 pts.
  - Combo 3 : 1 → 10, 5 → 20, 10 → 50, 15 → 100, 20 → 150 pts.
  - Combo 5 : idem.
  - Roue de la fortune : 1 → 10, 6 → 50, 12 → 100, 24 → 200, 36 → 300, 48 → 400, 60 → 500 pts.
- **Détail d’un défi** : grand cercle (chiffre + icône), cadenas si non fait, « X bonnes réponses », « Badge bloqué », **Y points**, description (ex. « Faire X bonne(s) réponse(s) à L’Instant Duel »).

### 1.4 Catégorie « Parrainages »

- **En-tête** : « Badges : 0/6 », « Points : 0/1050 ».
- **Grille** : 2, 5, 10, 15, 20, 25 **filleuls actifs** → **50, 100, 150, 200, 250, 300 points**.
- **Détail** : icône (mains + chiffre), « X filleuls actifs », « Badge bloqué », **Y points**, texte explicatif.

### 1.5 Catégorie « Cagnotte »

- **En-tête** : « Badges : 0/6 », « Points : 0/1500 ».
- **Grille** : **50 €, 100 €, 200 €, 500 €, 1000 €, 1500 €** de cartes cadeaux commandés → **50, 100, 150, 300, 400, 500 points**.
- **Détail** : icône carte avec montant (ex. 50€), « X € de cartes cadeaux commandés », « Badge bloqué », **Y points**, conditions (ex. conversion cagnotte en cartes depuis une date).

---

## 2. Principes communs Naomi

- **Badge** = un défi concret (un objectif à atteindre).
- **Badge bloqué** = pas encore réussi ; **Badge débloqué** = réussi (avec attribution des points).
- **Points** : toujours affichés par défi et par catégorie ; **attribués à la réussite**.
- **Progression** : format **X/Y** (défis réussis / total de la catégorie).
- **Détail** : grand visuel (cercle + icône/chiffre), statut, **récompense en points**, description, CTA si pertinent.

---

## 3. Ce que KashUP a déjà

- **Backend** : `Challenge`, `ChallengeReward`, `ChallengeProgress` (Prisma), moteur de challenges (types purchase, spend, discovery, loyalty, invite, etc.), récompenses (points, cashback, etc.).
- **API** : `GET /rewards/challenges` (avec progression user), admin CRUD challenges.
- **Mobile** : onglet « Challenges » dans Récompenses, liste de défis (titre, barre de progression, `current/goal`, `rewardSummary`), écran **ChallengeDetail** (titre, récompense, progression, description, étapes).
- **Points** : `rewardSummary` et `rewardPoints` / `reward.rewardValue` déjà prévus côté modèle et affichage.

---

## 4. Écarts à combler pour « menu défis façon Naomi »

### 4.1 Structure en catégories (niveau au-dessus des défis)

- Introduire des **catégories** (ex. Consentements, Parrainages, Cagnotte, Achats, Découverte, etc.) soit :
  - en **données** (ex. `Challenge.category` ou table `ChallengeCategory`), soit
  - en **mapping côté app** (ex. `type` ou `goalType` → catégorie affichée).
- **Écran « Badges & points »** (ou équivalent) : liste de catégories avec pour chacune :
  - **X/Y** = nombre de défis réussis / total défis de la catégorie,
  - **Points** = somme des points déjà gagnés dans cette catégorie.
- Au tap sur une catégorie → liste ou grille des **défis de cette catégorie**.

### 4.2 Affichage « Badge bloqué » / « Badge débloqué »

- Pour chaque défi : statut **bloqué** (non réussi) vs **débloqué** (réussi).
- Afficher explicitement :
  - **« Badge bloqué »** + (optionnel) cadenas sur l’icône quand `userStatus !== 'done'`,
  - **« Badge débloqué »** ou **« Complété »** + récompense en points quand `userStatus === 'done'`.
- S’assurer que **les points sont bien crédités** à la complétion (déjà prévu dans `grantReward` / wallet points).

### 4.3 Grille par catégorie (style Naomi)

- Pour certaines catégories (ex. Parrainages, Cagnotte, Challenges « jeu »), afficher les défis en **grille 2 colonnes** au lieu d’une seule liste.
- Carte de défi : **icône ou chiffre** (selon type), **libellé court** (ex. « 2 filleuls actifs », « 50 € de cartes »), **X points** bien mis en avant.
- Au tap → **écran détail** du défi (déjà existant, à enrichir si besoin).

### 4.4 Écran détail d’un défi (aligné Naomi)

- **Grand cercle** avec :
  - objectif (chiffre + icône selon type : éclair, étoiles, roue, mains, carte, etc.),
  - **cadenas** si badge bloqué.
- Sous le cercle :
  - libellé (ex. « 50 bonnes réponses », « 2 filleuls actifs »),
  - **« Badge bloqué »** ou **« Complété »**,
  - **« Y points »** (toujours visible),
  - **Description** (comment réussir le défi).
- Si pertinent : **bouton d’action** (ex. « Activer les notifications », « Inviter des amis ») qui envoie vers la bonne écran / flux.

### 4.5 En-têtes de catégorie (Badges X/Y, Points)

- Sur les écrans de liste/grille d’une catégorie : **Badges : X/Y**, **Points : Z / Total max** (ou seulement « Points : Z » si pas de total max).
- X = défis réussis, Y = total défis, Z = points gagnés dans la catégorie (somme des récompenses des défis complétés).

### 4.6 Types de défis à refléter (pour coller à Naomi)

- **Consentements** : newsletter, notifications (déjà évoqués côté consent / notifs).
- **Parrainages** : N filleuls actifs → points (aligner avec `challenge_invite` + objectif en nombre de filleuls).
- **Cagnotte** : X € de cartes cadeaux commandés → points (aligner avec `challenge_spend` ou type dédié « cartes cadeaux » + montant).
- **Challenges « jeu »** : bonnes réponses, combos, roue (KashUP peut les modéliser en `Challenge` avec types/objectifs dédiés ou les garder côté Drimify et seulement afficher les récompenses / badges dans le menu défis).

---

## 5. Données / API à prévoir (résumé)

- **Catégories** : soit champ `category` (ou équivalent) sur `Challenge`, soit dérivation depuis `type` + configuration côté app.
- **Comptage par catégorie** : défis réussis / total, et **somme des points** des défis complétés par l’utilisateur (requête ou calcul côté API).
- **Récompense en points** : déjà gérée par `ChallengeReward` (rewardType `points`, rewardValue) et `grantReward` ; s’assurer que l’API renvoie bien **rewardSummary** et **rewardPoints** (ou équivalent) pour chaque défi et que le déblocage crédite bien le wallet.

---

## 6. Plan d’implémentation suggéré

1. **Backend**  
   - Ajouter ou dériver une **catégorie** par défi.  
   - Exposer (ou calculer) pour l’app : **X/Y** et **points gagnés** par catégorie.

2. **Mobile – Écran « Badges & points » (ou Récompenses)**  
   - En-tête ou premier bloc : **liste de catégories** avec progression X/Y et points.  
   - Tap catégorie → navigation vers **liste/grille des défis** de cette catégorie.

3. **Mobile – Listes / grilles par catégorie**  
   - Afficher les défis en **grille 2 colonnes** pour Parrainages, Cagnotte, etc.  
   - Chaque carte : icône/chiffre, libellé, **X points**, statut (Badge bloqué / Complété).

4. **Mobile – Détail défi**  
   - Réutiliser **ChallengeDetailScreen** en l’enrichissant : grand cercle + icône/chiffre, cadenas si bloqué, **« Badge bloqué »** / **« Complété »**, **« Y points »** bien visible, description, CTA si besoin.

5. **Cohérence points**  
   - Vérifier que chaque défi a une **récompense en points** (ChallengeReward ou rewardPoints) et que **grantReward** est bien appelé à la complétion pour créditer les points.

En suivant cette spec, le menu défis KashUP peut être reconstruit pour correspondre à la structure et au comportement Naomi, avec **obtention / réussite d’un défi qui donne bien des points** et affichage explicite des badges (bloqué / débloqué) et des points par défi et par catégorie.
