# 🎭 Mode Développement avec MSW - Back-Office Complètement Déconnecté de l'API

## ✅ Configuration Actuelle

Le back-office **kashup-admin** est maintenant **complètement déconnecté de l'API réelle** et fonctionne en mode développement avec **Mock Service Worker (MSW)**.

### Configuration

- **`VITE_ENABLE_MSW=true`** dans `.env`
- **Toutes les requêtes vers `localhost:4000` sont interceptées par MSW**
- **Tous les endpoints retournent le format StandardResponse**

---

## 📡 Endpoints Mockés

### Authentification
- ✅ `POST /auth/login` - Connexion
- ✅ `POST /auth/password/forgot` - Mot de passe oublié
- ✅ `POST /auth/refresh` - Rafraîchissement du token

### Dashboard & Statistiques
- ✅ `GET /admin/dashboard` - Résumé du dashboard
- ✅ `GET /stats/impact-local` - Statistiques d'impact local
- ✅ `GET /admin/statistics/table` - Tableau de statistiques (format `{ rows, totals, filters }`)
- ✅ `GET /admin/statistics/departments` - Statistiques par département
- ✅ `GET /admin/statistics/detail` - Détails des statistiques
- ✅ `GET /admin/ai/analysis` - Analyse IA

### Utilisateurs
- ✅ `GET /admin/users` - Liste des utilisateurs (avec pagination)
- ✅ `GET /admin/users/:userId/transactions` - Transactions d'un utilisateur
- ✅ `GET /admin/users/:userId/rewards/history` - Historique des récompenses
- ✅ `GET /admin/users/:userId/gift-cards` - Cartes cadeaux de l'utilisateur
- ✅ `GET /admin/users/:userId/statistics` - Statistiques de l'utilisateur
- ✅ `POST /admin/users/:userId/reset-password` - Réinitialisation du mot de passe
- ✅ `PATCH /admin/users/:userId/kyc/force` - Forcer le KYC

### Partenaires
- ✅ `GET /partners` - Liste des partenaires (avec pagination, tri, filtres)
- ✅ `GET /partners/:partnerId` - Détails d'un partenaire
- ✅ `POST /partners` - Créer un partenaire (FormData)
- ✅ `PATCH /partners/:partnerId` - Mettre à jour un partenaire (FormData)
- ✅ `GET /partners/categories` - Catégories de partenaires
- ✅ `GET /partners/:partnerId/statistics` - Statistiques d'un partenaire
- ✅ `GET /partners/:partnerId/documents` - Documents d'un partenaire

### Offres
- ✅ `GET /offers/current` - Offres actuelles
- ✅ `POST /offers` - Créer une offre

### Récompenses
- ✅ `GET /rewards` - Toutes les récompenses
- ✅ `GET /rewards/:type` - Récompenses par type (boost, badge, lottery, challenge)
- ✅ `POST /rewards` - Créer une récompense
- ✅ `POST /rewards/:rewardId` - Mettre à jour une récompense
- ✅ `POST /rewards/boosts/:rewardId/purchase` - Acheter un boost
- ✅ `POST /rewards/lotteries/:rewardId/join` - Rejoindre une loterie

### Cartes Cadeaux
- ✅ `GET /gift-cards` - Liste des cartes cadeaux
- ✅ `GET /gift-cards/orders` - Commandes de cartes cadeaux
- ✅ `POST /gift-cards/purchase` - Acheter une carte cadeau
- ✅ `GET /gift-cards/export` - Export CSV

### Dons & Contenu
- ✅ `GET /donations` - Liste des dons
- ✅ `POST /donations` - Créer un don
- ✅ `GET /content` - Liste des contenus
- ✅ `POST /content` - Créer un contenu

### Notifications
- ✅ `GET /me/notifications/templates` - Modèles de notifications
- ✅ `POST /me/notifications` - Envoyer une notification

### Powens
- ✅ `GET /powens/overview` - Vue d'ensemble Powens
- ✅ `GET /powens/webhooks` - Webhooks Powens
- ✅ `POST /powens/links/:linkId/refresh` - Rafraîchir un lien
- ✅ `POST /powens/webhook` - Webhook Powens

### Drimify
- ✅ `GET /drimify/experiences` - Expériences Drimify
- ✅ `POST /drimify/experiences/:experienceId/play` - Jouer une expérience
- ✅ `POST /drimify/webhook` - Webhook Drimify

### Transactions
- ✅ `GET /transactions` - Liste des transactions (avec filtres)
- ✅ `POST /transactions` - Créer une transaction manuelle
- ✅ `GET /transactions/export` - Export CSV
- ✅ `POST /transactions/:transactionId/flag` - Signaler une transaction

### Webhooks
- ✅ `GET /webhooks` - Liste des webhooks
- ✅ `POST /webhooks` - Tester un webhook

### Monitoring
- ✅ `GET /monitoring/health` - État de santé
- ✅ `GET /monitoring/metrics` - Métriques

### Paramètres
- ✅ `GET /admin/settings/roles` - Liste des rôles
- ✅ `POST /admin/settings/roles` - Créer un rôle
- ✅ `PATCH /admin/settings/roles/:roleId` - Mettre à jour un rôle
- ✅ `GET /admin/settings/globals` - Objectifs globaux
- ✅ `PATCH /admin/settings/globals` - Mettre à jour les objectifs globaux
- ✅ `GET /admin/settings/audit-log` - Journal d'audit

---

## 🔧 Format de Réponse Standardisé

Tous les handlers MSW retournent maintenant le format **StandardResponse** :

```typescript
{
  statusCode: 200,
  success: true,
  message: "Opération réussie",
  data: {...},
  meta: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    }
  }
}
```

### Exemples

**GET /partners** retourne :
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Liste des partenaires récupérée avec succès",
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**GET /admin/statistics/table** retourne :
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Statistiques de table récupérées avec succès",
  "data": {
    "rows": [...],
    "totals": {
      "count": 150,
      "transactions": 150,
      "revenue": 6750,
      "cashback": 337.5,
      "averageTransaction": 45
    },
    "filters": {...}
  }
}
```

---

## 🎯 Fonctionnalités Mockées

### Pagination
- ✅ Support complet de la pagination pour `/partners` et `/admin/users`
- ✅ Paramètres `page` et `limit` fonctionnels
- ✅ Métadonnées de pagination dans `meta.pagination`

### Filtres
- ✅ Filtrage par territoire, catégorie, recherche pour les partenaires
- ✅ Filtrage par territoire, statut, recherche pour les utilisateurs
- ✅ Filtres pour les statistiques (territory, sector, month, day, timeSlot, gender, ageRange)

### Tri
- ✅ Tri par nom, createdAt, updatedAt pour les partenaires
- ✅ Ordre ascendant/descendant

### FormData
- ✅ Support complet de `multipart/form-data` pour la création/mise à jour de partenaires
- ✅ Gestion des fichiers (logo, kbis, images)
- ✅ Support des arrays JSON (`territories`, `marketingPrograms`)

---

## 🚀 Utilisation

### Démarrer le serveur de développement

```bash
cd apps/kashup-admin
npm run dev
```

### Vérifier que MSW est actif

Dans la console du navigateur, vous devriez voir :
```
✅ MSW (Mock Service Worker) activé - Mode développement avec données mockées
📡 Toutes les requêtes vers localhost:4000 seront interceptées par MSW
```

### Tester les fonctionnalités

- ✅ Dashboard : Toutes les statistiques sont mockées
- ✅ Partenaires : Création, édition, liste avec pagination
- ✅ Utilisateurs : Liste, détails, statistiques
- ✅ Transactions : Liste, création manuelle
- ✅ Récompenses : Création, liste par type
- ✅ Tous les autres modules fonctionnent avec des données mockées

---

## ⚠️ Important

### Pour revenir à l'API réelle

1. Mettre `VITE_ENABLE_MSW=false` dans `.env`
2. Redémarrer le serveur de développement
3. S'assurer que l'API backend est accessible sur `http://localhost:4000`

### Pour ajouter un nouvel endpoint mocké

1. Ajouter le handler dans `src/mocks/handlers.ts`
2. Utiliser la fonction `ok()` pour les succès et `failure()` pour les erreurs
3. Retourner le format StandardResponse

Exemple :
```typescript
http.get(`${API_URL}/nouveau-endpoint`, async () => {
  return ok({ data: 'exemple' }, 'Message de succès');
});
```

---

## 📝 Notes

- **Toutes les données sont stockées en mémoire** (dans `db` de `src/mocks/data.ts`)
- **Les modifications sont perdues au rechargement de la page**
- **Les fichiers uploadés sont simulés avec `URL.createObjectURL()`**
- **Les IDs sont générés avec `makeId()` (UUID ou mock-ID)**

---

**✅ Le back-office est maintenant complètement fonctionnel en mode développement sans connexion à l'API réelle !**

