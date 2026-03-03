# Configuration des Webhooks - KashUP

## Vue d'ensemble

Le système de webhooks permet de synchroniser automatiquement les modifications du back office avec l'application mobile en temps réel.

## Configuration

### 1. Variable d'environnement

Ajouter dans votre fichier `.env` :

```env
MOBILE_WEBHOOK_URL=https://votre-app-mobile.com/api/webhooks
```

### 2. Endpoint webhook côté mobile

Votre application mobile doit exposer un endpoint qui accepte les webhooks :

```
POST /api/webhooks
Headers:
  - Content-Type: application/json
  - X-Webhook-Source: kashup-api
  - X-Webhook-Event: <event-name>

Body:
{
  "event": "partner.created",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "partner": { /* Objet complet */ }
  }
}
```

## Événements disponibles

### Partenaires

| Événement | Déclenché quand |
|-----------|------------------|
| `partner.created` | Création d'un nouveau partenaire |
| `partner.updated` | Mise à jour d'un partenaire |
| `partner.status.changed` | Changement de statut d'un partenaire |

### Offres

| Événement | Déclenché quand |
|-----------|------------------|
| `offer.created` | Création d'une nouvelle offre |
| `offer.updated` | Mise à jour d'une offre |
| `offer.stock.changed` | Changement du stock d'une offre |
| `offer.status.changed` | Changement de statut d'une offre |

### Récompenses

| Événement | Déclenché quand |
|-----------|------------------|
| `reward.created` | Création d'une nouvelle récompense |
| `reward.updated` | Mise à jour d'une récompense |
| `reward.status.changed` | Changement de statut (draft -> active) |
| `reward.stock.changed` | Changement du stock d'une récompense |

### Configurations

| Événement | Déclenché quand |
|-----------|------------------|
| `gift-card-config.updated` | Mise à jour de la config des cartes cadeaux |
| `box-up-config.updated` | Mise à jour de la config Box UP |

## Format des payloads

### Exemple : partner.created

```json
{
  "event": "partner.created",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "partner": {
      "id": "clx123...",
      "name": "Restaurant Le Bon Goût",
      "logoUrl": "/uploads/partners/logo.jpg",
      "category": "Restauration",
      "territory": "martinique",
      "status": "active",
      ...
    }
  }
}
```

### Exemple : offer.updated

```json
{
  "event": "offer.updated",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "offer": {
      "id": "clx456...",
      "partnerId": "clx123...",
      "title": "Offre spéciale -20%",
      "cashbackRate": 10,
      "stock": 50,
      "stockUsed": 5,
      "status": "active",
      ...
    }
  }
}
```

## Gestion des erreurs

Le système de webhooks :
- Continue de fonctionner même si l'endpoint mobile est indisponible
- Log les erreurs sans bloquer les opérations
- N'envoie pas de webhook si `MOBILE_WEBHOOK_URL` n'est pas configuré

## Test des webhooks

Pour tester localement, vous pouvez utiliser un service comme [ngrok](https://ngrok.com/) :

```bash
# 1. Démarrer votre serveur mobile local
# 2. Exposer avec ngrok
ngrok http 3000

# 3. Configurer dans .env
MOBILE_WEBHOOK_URL=https://votre-url-ngrok.ngrok.io/api/webhooks
```

## Sécurité

Pour sécuriser vos webhooks en production :

1. Vérifier le header `X-Webhook-Source: kashup-api`
2. Implémenter une signature HMAC pour vérifier l'authenticité
3. Utiliser HTTPS uniquement
4. Valider le format du payload avant traitement

## Monitoring

Les webhooks sont loggés avec :
- Succès : `logger.info({ event }, 'Webhook envoyé avec succès')`
- Erreur : `logger.error({ event, error }, 'Erreur lors de l\'envoi du webhook')`

Consultez les logs pour surveiller les envois de webhooks.

