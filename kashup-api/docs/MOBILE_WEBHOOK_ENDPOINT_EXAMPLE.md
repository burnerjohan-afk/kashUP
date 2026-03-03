# Exemple d'endpoint Webhook pour kashup-mobile

Ce fichier contient un exemple complet d'implémentation de l'endpoint webhook dans kashup-mobile avec notifications push Expo.

## Structure des fichiers à créer dans kashup-mobile

### 1. Service de notifications webhook

**Fichier : `src/services/webhookNotification.service.js`**

```javascript
/**
 * Service pour envoyer des notifications push Expo avec des webhooks
 */

const { Expo } = require('expo-server-sdk');

// Créer une instance Expo
const expo = new Expo();

/**
 * Envoie un webhook à des utilisateurs via notifications push
 * 
 * @param {Object} webhookPayload - Le payload du webhook
 * @param {string[]} pushTokens - Les tokens Expo Push des utilisateurs
 * @returns {Promise<Object>} Résultat de l'envoi
 */
async function sendWebhookToUsers(webhookPayload, pushTokens) {
  if (!pushTokens || pushTokens.length === 0) {
    console.warn('[WebhookNotification] Aucun token push fourni');
    return { success: 0, failure: 0 };
  }

  // Filtrer les tokens valides
  const validTokens = pushTokens.filter((token) => Expo.isExpoPushToken(token));

  if (validTokens.length === 0) {
    console.warn('[WebhookNotification] Aucun token valide');
    return { success: 0, failure: 0 };
  }

  // Créer les messages de notification
  const messages = validTokens.map((token) => ({
    to: token,
    sound: 'default',
    title: getNotificationTitle(webhookPayload.event),
    body: getNotificationBody(webhookPayload.event, webhookPayload.data),
    data: {
      webhook: true,
      event: webhookPayload.event,
      timestamp: webhookPayload.timestamp,
      data: webhookPayload.data,
    },
    priority: 'high',
  }));

  // Envoyer les notifications par chunks (Expo limite à 100 par requête)
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('[WebhookNotification] Erreur lors de l\'envoi:', error);
    }
  }

  // Vérifier les erreurs
  const errors = [];
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket.status === 'error') {
      errors.push({
        token: validTokens[i],
        error: ticket.message,
      });
    }
  }

  if (errors.length > 0) {
    console.error('[WebhookNotification] Erreurs d\'envoi:', errors);
  }

  return {
    success: tickets.filter((t) => t.status === 'ok').length,
    failure: errors.length,
    errors,
  };
}

/**
 * Récupère le titre de la notification selon le type d'événement
 */
function getNotificationTitle(event) {
  const titles = {
    'partner.created': 'Nouveau partenaire',
    'partner.updated': 'Partenaire mis à jour',
    'partner.status.changed': 'Statut partenaire modifié',
    'offer.created': 'Nouvelle offre',
    'offer.updated': 'Offre mise à jour',
    'offer.stock.changed': 'Stock d\'offre modifié',
    'offer.status.changed': 'Statut d\'offre modifié',
    'reward.created': 'Nouvelle récompense',
    'reward.updated': 'Récompense mise à jour',
    'reward.status.changed': 'Statut de récompense modifié',
    'reward.stock.changed': 'Stock de récompense modifié',
    'gift-card-config.updated': 'Configuration mise à jour',
    'box-up-config.updated': 'Configuration Box UP mise à jour',
  };

  return titles[event] || 'Mise à jour KashUP';
}

/**
 * Récupère le corps de la notification selon le type d'événement
 */
function getNotificationBody(event, data) {
  const bodies = {
    'partner.created': data?.partner?.name 
      ? `Découvrez ${data.partner.name} !`
      : 'Un nouveau partenaire a rejoint KashUP',
    'partner.updated': data?.partner?.name
      ? `${data.partner.name} a été mis à jour`
      : 'Un partenaire a été mis à jour',
    'offer.created': data?.offer?.title
      ? `Nouvelle offre : ${data.offer.title}`
      : 'Une nouvelle offre est disponible',
    'offer.updated': data?.offer?.title
      ? `Offre mise à jour : ${data.offer.title}`
      : 'Une offre a été mise à jour',
    'reward.created': data?.reward?.title
      ? `Nouvelle récompense : ${data.reward.title}`
      : 'Une nouvelle récompense est disponible',
    'gift-card-config.updated': 'Les cartes cadeaux ont été mises à jour',
    'box-up-config.updated': 'La configuration Box UP a été mise à jour',
  };

  return bodies[event] || `Événement: ${event}`;
}

module.exports = {
  sendWebhookToUsers,
};
```

### 2. Contrôleur webhook

**Fichier : `src/controllers/webhook.controller.js`**

```javascript
const { sendWebhookToUsers } = require('../services/webhookNotification.service');
const logger = require('../utils/logger');
// Importez votre service de cache/storage pour récupérer les tokens push
// const { getAllUserPushTokens } = require('../services/user.service');

/**
 * Traite un webhook reçu de kashup-api
 */
async function handleWebhook(req, res) {
  try {
    // Vérifier l'origine du webhook
    const source = req.headers['x-webhook-source'];
    if (source !== 'kashup-api') {
      logger.warn({ source }, 'Webhook reçu d\'une source non autorisée');
      return res.status(403).json({ 
        error: 'Source non autorisée',
        received: false 
      });
    }

    const event = req.headers['x-webhook-event'];
    const payload = req.body;

    logger.info({ event, timestamp: payload.timestamp }, 'Webhook reçu');

    // Valider le payload
    if (!payload.event || !payload.timestamp || !payload.data) {
      logger.error({ payload }, 'Payload webhook invalide');
      return res.status(400).json({ 
        error: 'Payload invalide',
        received: false 
      });
    }

    // Traiter le webhook selon le type d'événement
    await processWebhookEvent(payload);

    // Récupérer tous les tokens push des utilisateurs actifs
    // TODO: Implémenter la récupération des tokens depuis votre base de données
    // const pushTokens = await getAllUserPushTokens();
    const pushTokens = []; // Placeholder - à remplacer

    // Envoyer les notifications push si des tokens sont disponibles
    if (pushTokens.length > 0) {
      const notificationResult = await sendWebhookToUsers(payload, pushTokens);
      logger.info({ 
        event, 
        success: notificationResult.success,
        failure: notificationResult.failure 
      }, 'Notifications push envoyées');
    }

    // Mettre à jour le cache local selon le type d'événement
    await updateLocalCache(payload);

    return res.status(200).json({ 
      received: true,
      event: payload.event,
      processed: true 
    });

  } catch (error) {
    logger.error({ error: error.message, stack: error.stack }, 'Erreur lors du traitement du webhook');
    return res.status(500).json({ 
      error: 'Erreur serveur',
      received: false 
    });
  }
}

/**
 * Traite l'événement webhook selon son type
 */
async function processWebhookEvent(payload) {
  const { event, data } = payload;

  switch (event) {
    case 'partner.created':
    case 'partner.updated':
    case 'partner.status.changed':
      // Mettre à jour le cache des partenaires
      await updatePartnersCache(data.partner);
      break;

    case 'offer.created':
    case 'offer.updated':
    case 'offer.stock.changed':
    case 'offer.status.changed':
      // Mettre à jour le cache des offres
      await updateOffersCache(data.offer);
      break;

    case 'reward.created':
    case 'reward.updated':
    case 'reward.status.changed':
    case 'reward.stock.changed':
      // Mettre à jour le cache des récompenses
      await updateRewardsCache(data.reward);
      break;

    case 'gift-card-config.updated':
      // Mettre à jour la configuration des cartes cadeaux
      await updateGiftCardConfigCache(data.config);
      break;

    case 'box-up-config.updated':
      // Mettre à jour la configuration Box UP
      await updateBoxUpConfigCache(data.config);
      break;

    default:
      logger.warn({ event }, 'Type d\'événement non géré');
  }
}

/**
 * Met à jour le cache local
 */
async function updateLocalCache(payload) {
  // TODO: Implémenter la mise à jour du cache selon votre système de cache
  // Exemples :
  // - AsyncStorage pour React Native
  // - Redux store
  // - Context API
  // - Base de données locale (SQLite, Realm, etc.)
  
  logger.info({ event: payload.event }, 'Cache local mis à jour');
}

// Fonctions de mise à jour du cache (à implémenter selon votre architecture)
async function updatePartnersCache(partner) {
  // TODO: Mettre à jour le cache des partenaires
}

async function updateOffersCache(offer) {
  // TODO: Mettre à jour le cache des offres
}

async function updateRewardsCache(reward) {
  // TODO: Mettre à jour le cache des récompenses
}

async function updateGiftCardConfigCache(config) {
  // TODO: Mettre à jour la configuration des cartes cadeaux
}

async function updateBoxUpConfigCache(config) {
  // TODO: Mettre à jour la configuration Box UP
}

module.exports = {
  handleWebhook,
};
```

### 3. Route webhook

**Fichier : `src/routes/webhook.routes.js`**

```javascript
const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhook.controller');

// Endpoint pour recevoir les webhooks de kashup-api
router.post('/', handleWebhook);

module.exports = router;
```

### 4. Intégration dans l'app principale

**Dans votre fichier principal (ex: `app.js` ou `server.js`) :**

```javascript
const express = require('express');
const webhookRoutes = require('./src/routes/webhook.routes');

const app = express();

// ... autres middlewares ...

// Route pour les webhooks
app.use('/api/webhooks', webhookRoutes);

// ... reste de l'application ...
```

## Configuration

### Variables d'environnement

Dans le `.env` de **kashup-api** (déjà fait) :
```env
MOBILE_WEBHOOK_URL=https://votre-app-mobile.com/api/webhooks
```

### Dépendances à installer dans kashup-mobile

```bash
npm install expo-server-sdk
```

## Test

Pour tester l'endpoint webhook :

```bash
# Depuis kashup-api
npm run test:webhook
```

Ou manuellement avec curl :

```bash
curl -X POST https://votre-app-mobile.com/api/webhooks \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Source: kashup-api" \
  -H "X-Webhook-Event: test.ping" \
  -d '{
    "event": "test.ping",
    "timestamp": "2024-01-01T12:00:00Z",
    "data": {
      "message": "Test webhook"
    }
  }'
```

## Notes importantes

1. **Sécurité** : Vérifiez toujours le header `X-Webhook-Source` pour s'assurer que la requête vient bien de kashup-api
2. **Tokens Push** : Vous devez implémenter la récupération des tokens Expo Push depuis votre base de données
3. **Cache** : Adaptez les fonctions de mise à jour du cache selon votre architecture (AsyncStorage, Redux, etc.)
4. **Gestion d'erreurs** : Loggez toutes les erreurs pour le debugging
5. **Performance** : Les notifications push sont envoyées de manière asynchrone pour ne pas bloquer la réponse

