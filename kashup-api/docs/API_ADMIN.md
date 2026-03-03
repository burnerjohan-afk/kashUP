# Documentation API Admin - KashUP

Cette documentation décrit tous les endpoints admin disponibles pour gérer le back office KashUP.

## Table des matières

1. [Authentification](#authentification)
2. [Partenaires](#partenaires)
3. [Offres](#offres)
4. [Récompenses](#récompenses)
5. [Cartes Cadeaux](#cartes-cadeaux)
6. [Utilisateurs](#utilisateurs)
7. [Transactions](#transactions)
8. [Webhooks](#webhooks)
9. [Upload de fichiers](#upload-de-fichiers)

---

## Authentification

Tous les endpoints admin nécessitent :
- Un token JWT valide dans le header `Authorization: Bearer <token>`
- Le rôle `admin` dans le token

---

## Partenaires

### Liste des partenaires
```
GET /partners
Query params:
  - search?: string
  - categoryId?: string
  - territoire?: 'Martinique' | 'Guadeloupe' | 'Guyane'
  - autourDeMoi?: string (format: "lat,lng,radiusKm")
```

### Détails d'un partenaire
```
GET /partners/:id
```

### Statistiques d'un partenaire
```
GET /partners/:id/statistics
Response: {
  thisMonth: { transactionCount, totalAmount, averageBasket, totalCashback },
  lastMonth: { transactionCount, totalAmount, averageBasket, totalCashback },
  growth: { transactionGrowth, averageBasketGrowth }
}
```

### Documents d'un partenaire
```
GET /partners/:id/documents
```

### Créer un partenaire
```
POST /partners
Content-Type: multipart/form-data

Body (FormData):
  - name: string (requis)
  - categoryId: string (requis)
  - territory: 'Martinique' | 'Guadeloupe' | 'Guyane' (requis)
  - tauxCashbackBase: number (0-100, requis)
  - logo: File (optionnel)
  - kbis: File (optionnel)
  - menuImages: File[] (optionnel, pour restaurants)
  - photos: File[] (optionnel)
  - ... autres champs
```

### Mettre à jour un partenaire
```
PATCH /partners/:id
Content-Type: multipart/form-data
```

---

## Offres

### Liste des offres actuelles
```
GET /offers/current
```

### Créer une offre
```
POST /offers
Content-Type: multipart/form-data

Body (FormData):
  - partnerId: string (requis)
  - title: string (requis, min 3)
  - cashbackRate: number (0-100, requis)
  - startAt: string (ISO 8601, requis)
  - endAt: string (ISO 8601, requis)
  - stock: number (requis)
  - price?: number
  - image: File (optionnel)
  - conditions?: string
```

### Mettre à jour une offre
```
PATCH /offers/:id
Content-Type: multipart/form-data
```

---

## Récompenses

### Catalogue complet
```
GET /rewards
Query params:
  - type?: 'boost' | 'badge' | 'lottery' | 'challenge'
```

### Récompenses par type
```
GET /rewards/:type
```

### Créer une récompense
```
POST /rewards
Content-Type: multipart/form-data

Body (FormData):
  - type: 'boost' | 'badge' | 'lottery' | 'challenge' (requis)
  - title: string (requis)
  - status: 'draft' | 'active' | 'archived' (requis)
  - stock?: number
  - image: File (optionnel)
  - ... champs spécifiques selon le type
```

### Mettre à jour une récompense
```
PATCH /rewards/:id
Content-Type: multipart/form-data
Query params:
  - type: 'boost' | 'badge' | 'lottery' | 'challenge' (requis)
```

---

## Cartes Cadeaux

### Catalogue
```
GET /gift-cards
```

### Commandes (Admin)
```
GET /gift-cards/orders
```

### Configuration
```
GET /gift-cards/config
PATCH /gift-cards/config
Content-Type: multipart/form-data

Body (FormData):
  - giftCardDescription?: string
  - giftCardImage: File (optionnel)
  - giftCardVirtualCardImage: File (optionnel)
  - giftCardHowItWorks?: string
  - giftCardConditions?: string
```

### Export CSV des commandes
```
GET /gift-cards/export
Response: CSV file
```

### Configuration Box UP
```
GET /gift-cards/box-up/config
POST /gift-cards/box-up/config
Content-Type: multipart/form-data

Body (FormData):
  - boxUpName: string (requis)
  - boxUpPartners: string[] (requis, IDs des partenaires)
  - boxUpImage: File (optionnel)
  - boxUpHowItWorks?: string
  - boxUpConditions?: string
```

---

## Utilisateurs

### Liste des utilisateurs
```
GET /admin/users
Query params:
  - search?: string
  - status?: string
  - territory?: string
  - page?: number
  - pageSize?: number
```

### Détails d'un utilisateur
```
GET /admin/users/:id
```

### Transactions d'un utilisateur
```
GET /admin/users/:id/transactions
```

### Historique des récompenses
```
GET /admin/users/:id/rewards/history
```

### Cartes cadeaux d'un utilisateur
```
GET /admin/users/:id/gift-cards
```

### Statistiques d'un utilisateur
```
GET /admin/users/:id/statistics
```

### Réinitialiser le mot de passe
```
POST /admin/users/:id/reset-password
```

### Forcer le KYC
```
PATCH /admin/users/:id/kyc/force
Body: { kycLevel: 'none' | 'basic' | 'advanced' }
```

---

## Transactions

### Liste des transactions
```
GET /transactions
Query params:
  - source?: string
  - status?: string
  - partnerId?: string
  - page?: number
  - pageSize?: number
```

### Export CSV
```
GET /transactions/export
Query params: mêmes filtres que GET /transactions
Response: CSV file
```

### Signaler une transaction
```
POST /transactions/:id/flag
```

---

## Webhooks

Le système de webhooks envoie automatiquement des événements à l'application mobile lors des modifications.

### Configuration

Ajouter dans `.env` :
```env
MOBILE_WEBHOOK_URL=https://votre-app-mobile.com/webhooks
```

### Événements disponibles

**Partenaires:**
- `partner.created` - Création d'un partenaire
- `partner.updated` - Mise à jour d'un partenaire
- `partner.status.changed` - Changement de statut

**Offres:**
- `offer.created` - Création d'une offre
- `offer.updated` - Mise à jour d'une offre
- `offer.stock.changed` - Changement de stock
- `offer.status.changed` - Changement de statut

**Récompenses:**
- `reward.created` - Création d'une récompense
- `reward.updated` - Mise à jour d'une récompense
- `reward.status.changed` - Changement de statut
- `reward.stock.changed` - Changement de stock

**Configurations:**
- `gift-card-config.updated` - Mise à jour de la config des cartes cadeaux
- `box-up-config.updated` - Mise à jour de la config Box UP

### Format des webhooks

```json
{
  "event": "partner.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "partner": { /* Objet Partner complet */ }
  }
}
```

Headers:
- `Content-Type: application/json`
- `X-Webhook-Source: kashup-api`
- `X-Webhook-Event: <event-name>`

---

## Upload de fichiers

### Formats acceptés
- Images uniquement : JPEG, JPG, PNG, WebP, GIF
- Taille max : 5MB par fichier

### Organisation
Les fichiers sont stockés dans `uploads/` avec des sous-dossiers :
- `uploads/partners/` - Logos, KBIS, photos de partenaires
- `uploads/offers/` - Images d'offres
- `uploads/rewards/` - Images de récompenses
- `uploads/gift-cards/` - Images de cartes cadeaux

### URLs des fichiers
Les fichiers sont accessibles via :
```
GET /uploads/{type}/{filename}
```

### Exemple d'upload

```javascript
const formData = new FormData();
formData.append('name', 'Mon Partenaire');
formData.append('logo', fileInput.files[0]);
formData.append('categoryId', 'cat123');

fetch('/partners', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer <token>'
  },
  body: formData
});
```

---

## Codes de réponse

- `200` - Succès
- `201` - Créé avec succès
- `400` - Requête invalide
- `401` - Non authentifié
- `403` - Accès refusé (rôle insuffisant)
- `404` - Ressource introuvable
- `422` - Erreur de validation
- `500` - Erreur serveur

---

## Notes importantes

1. **FormData vs JSON** : Utiliser FormData pour les endpoints avec fichiers, sinon JSON
2. **Dates** : Format ISO 8601 (ex: "2024-01-01T00:00:00Z")
3. **Pourcentages** : Tous les taux sont en pourcentage (0-100), pas en décimal
4. **Pagination** : Les listes supportent `page` et `pageSize` (défaut: page=1, pageSize=20)
5. **Synchronisation** : Les webhooks sont envoyés automatiquement après chaque modification

