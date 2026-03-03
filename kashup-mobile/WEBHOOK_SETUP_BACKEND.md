# Configuration Backend pour les Webhooks (kashup-api)

Ce document décrit les étapes à suivre dans **kashup-api** pour compléter l'implémentation des webhooks via notifications push.

## 📋 Étapes à suivre

### 1. Installer la dépendance

```bash
npm install expo-server-sdk
```

### 2. Créer le service de notifications push

Créer le fichier `services/webhookNotificationService.js` :

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
    body: getNotificationBody(webhookPayload.event),
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
function getNotificationBody(event) {
  return `Événement: ${event}`;
}

module.exports = {
  sendWebhookToUsers,
};
```

### 3. Créer la migration SQL

Créer un fichier de migration pour la table `user_push_tokens` :

```sql
-- Migration: créer la table user_push_tokens

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  platform VARCHAR(50) DEFAULT 'expo',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_token ON user_push_tokens(token);
```

### 4. Créer les endpoints pour gérer les tokens

Créer ou modifier votre route `/me/push-token` :

```javascript
// routes/me.js ou routes/user.js

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const db = require('../db');

/**
 * POST /me/push-token
 * Enregistre ou met à jour le token Expo Push de l'utilisateur
 */
router.post('/push-token', authenticate, async (req, res) => {
  try {
    const { token, platform } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: 'Token requis' });
    }

    // Vérifier si le token existe déjà pour cet utilisateur
    const existingToken = await db.query(
      'SELECT id FROM user_push_tokens WHERE user_id = $1 AND token = $2',
      [userId, token]
    );

    if (existingToken.rows.length > 0) {
      // Mettre à jour la date de dernière utilisation
      await db.query(
        'UPDATE user_push_tokens SET last_used_at = NOW(), updated_at = NOW() WHERE id = $1',
        [existingToken.rows[0].id]
      );
      return res.json({ message: 'Token mis à jour', token: existingToken.rows[0].id });
    }

    // Créer un nouveau token
    const result = await db.query(
      `INSERT INTO user_push_tokens (user_id, token, platform, created_at, updated_at, last_used_at)
       VALUES ($1, $2, $3, NOW(), NOW(), NOW())
       RETURNING id`,
      [userId, token, platform || 'expo']
    );

    res.json({ message: 'Token enregistré', token: result.rows[0].id });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du token:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * DELETE /me/push-token
 * Supprime le token Expo Push de l'utilisateur
 */
router.delete('/push-token', authenticate, async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: 'Token requis' });
    }

    await db.query(
      'DELETE FROM user_push_tokens WHERE user_id = $1 AND token = $2',
      [userId, token]
    );

    res.json({ message: 'Token supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression du token:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
```

### 5. Modifier vos handlers de webhooks

Au lieu d'envoyer un POST vers `MOBILE_WEBHOOK_URL`, utilisez le service de notifications :

```javascript
// Dans votre handler de webhook (ex: services/webhookHandler.js)

const { sendWebhookToUsers } = require('../services/webhookNotificationService');
const db = require('../db');

/**
 * Fonction helper pour envoyer un webhook à tous les utilisateurs
 */
async function sendWebhookNotification(webhookPayload, userIds = null) {
  try {
    let pushTokens;

    if (userIds && userIds.length > 0) {
      // Envoyer uniquement aux utilisateurs spécifiés
      const result = await db.query(
        'SELECT token FROM user_push_tokens WHERE user_id = ANY($1) AND token IS NOT NULL',
        [userIds]
      );
      pushTokens = result.rows.map((row) => row.token);
    } else {
      // Envoyer à tous les utilisateurs
      const result = await db.query(
        'SELECT token FROM user_push_tokens WHERE token IS NOT NULL'
      );
      pushTokens = result.rows.map((row) => row.token);
    }

    if (pushTokens.length > 0) {
      await sendWebhookToUsers(webhookPayload, pushTokens);
      console.log(`[WebhookNotification] Notification envoyée à ${pushTokens.length} utilisateurs`);
    }
  } catch (error) {
    console.error('[WebhookNotification] Erreur:', error);
  }
}

// Exemple: Handler pour partner.created
async function handlePartnerCreated(partnerData) {
  // ... votre logique existante ...

  const webhookPayload = {
    event: 'partner.created',
    timestamp: new Date().toISOString(),
    data: {
      partner: partnerData,
    },
  };

  // Envoyer à tous les utilisateurs
  await sendWebhookNotification(webhookPayload);

  // OU envoyer uniquement aux utilisateurs concernés
  // const relevantUserIds = await getRelevantUserIds(partnerData);
  // await sendWebhookNotification(webhookPayload, relevantUserIds);
}

// Répéter pour tous les autres événements webhook :
// - partner.updated
// - partner.status.changed
// - offer.created
// - offer.updated
// - offer.stock.changed
// - offer.status.changed
// - reward.created
// - reward.updated
// - reward.status.changed
// - reward.stock.changed
// - gift-card-config.updated
// - box-up-config.updated
```

## ✅ Checklist

- [ ] Installer `expo-server-sdk`
- [ ] Créer `services/webhookNotificationService.js`
- [ ] Créer la migration SQL pour `user_push_tokens`
- [ ] Créer les endpoints `POST /me/push-token` et `DELETE /me/push-token`
- [ ] Modifier tous les handlers de webhooks pour utiliser `sendWebhookToUsers()`
- [ ] Tester l'enregistrement d'un token depuis l'app mobile
- [ ] Tester l'envoi d'une notification push depuis le backend

## 🔍 Tests

1. **Test d'enregistrement de token** :
   - Lancer l'app mobile
   - Vérifier dans les logs que le token est obtenu
   - Vérifier dans la base de données que le token est enregistré

2. **Test d'envoi de notification** :
   - Créer un partenaire depuis kashup-admin
   - Vérifier que l'app mobile reçoit une notification
   - Vérifier que les données sont mises à jour dans l'app

## 📝 Notes

- Les tokens Expo Push sont uniques par appareil
- Un utilisateur peut avoir plusieurs tokens (plusieurs appareils)
- Les tokens invalides sont automatiquement filtrés par Expo
- Les notifications sont envoyées par chunks de 100 (limite Expo)

