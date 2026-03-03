# Guide d'implémentation - Endpoint Webhook pour kashup-mobile

## Vue d'ensemble

Ce guide vous explique comment implémenter l'endpoint webhook dans kashup-mobile pour recevoir les événements en temps réel depuis kashup-api et envoyer des notifications push aux utilisateurs.

## Architecture

```
kashup-api (backend)
    ↓ (envoie webhook POST)
kashup-mobile (endpoint /api/webhooks)
    ↓ (traite l'événement)
    ├─→ Met à jour le cache local
    └─→ Envoie notifications push via Expo
```

## Étapes d'implémentation

### 1. Installer les dépendances

```bash
cd kashup-mobile
npm install expo-server-sdk
```

### 2. Créer le service de notifications

Créez `src/services/webhookNotification.service.js` avec le code fourni dans `MOBILE_WEBHOOK_ENDPOINT_EXAMPLE.md`.

### 3. Créer le contrôleur webhook

Créez `src/controllers/webhook.controller.js` avec la logique de traitement des webhooks.

### 4. Créer la route

Créez `src/routes/webhook.routes.js` et intégrez-la dans votre application principale.

### 5. Récupérer les tokens push

Vous devez implémenter une fonction pour récupérer tous les tokens Expo Push des utilisateurs actifs depuis votre base de données.

**Exemple :**

```javascript
// src/services/user.service.js
async function getAllUserPushTokens() {
  // Récupérer tous les utilisateurs avec leurs tokens push
  const users = await db.users.findMany({
    where: {
      pushToken: { not: null },
      isActive: true
    },
    select: {
      pushToken: true
    }
  });

  return users.map(user => user.pushToken).filter(Boolean);
}
```

### 6. Mettre à jour le cache

Implémentez les fonctions de mise à jour du cache selon votre architecture :

**Pour React Native avec AsyncStorage :**
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

async function updatePartnersCache(partner) {
  const partners = await AsyncStorage.getItem('partners');
  const partnersList = partners ? JSON.parse(partners) : [];
  
  const index = partnersList.findIndex(p => p.id === partner.id);
  if (index >= 0) {
    partnersList[index] = partner;
  } else {
    partnersList.push(partner);
  }
  
  await AsyncStorage.setItem('partners', JSON.stringify(partnersList));
}
```

**Pour Redux :**
```javascript
import store from '../store';
import { updatePartner, addPartner } from '../actions/partners';

async function updatePartnersCache(partner) {
  const state = store.getState();
  const exists = state.partners.items.find(p => p.id === partner.id);
  
  if (exists) {
    store.dispatch(updatePartner(partner));
  } else {
    store.dispatch(addPartner(partner));
  }
}
```

## Configuration de l'URL webhook

Dans le `.env` de **kashup-api**, configurez :

```env
MOBILE_WEBHOOK_URL=https://votre-app-mobile.com/api/webhooks
```

Pour le développement local avec ngrok :

```bash
# Terminal 1 : Démarrer kashup-mobile
npm start

# Terminal 2 : Exposer avec ngrok
ngrok http 3000

# Copier l'URL HTTPS dans .env de kashup-api
MOBILE_WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks
```

## Test

1. **Tester depuis kashup-api :**
   ```bash
   npm run test:webhook
   ```

2. **Tester manuellement :**
   ```bash
   curl -X POST http://localhost:3000/api/webhooks \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Source: kashup-api" \
     -H "X-Webhook-Event: partner.created" \
     -d '{
       "event": "partner.created",
       "timestamp": "2024-01-01T12:00:00Z",
       "data": {
         "partner": {
           "id": "test123",
           "name": "Test Partner"
         }
       }
     }'
   ```

## Sécurité

1. **Vérifier l'origine :** Toujours vérifier `X-Webhook-Source: kashup-api`
2. **HTTPS en production :** Utiliser HTTPS pour sécuriser les webhooks
3. **Validation :** Valider le format du payload avant traitement
4. **Rate limiting :** Implémenter un rate limiting pour éviter les abus

## Monitoring

Ajoutez des logs pour surveiller les webhooks :

```javascript
logger.info({ event, timestamp }, 'Webhook reçu et traité');
logger.error({ event, error }, 'Erreur lors du traitement du webhook');
```

## Prochaines étapes

1. ✅ Implémenter l'endpoint webhook
2. ✅ Tester avec `npm run test:webhook` depuis kashup-api
3. ✅ Vérifier que les notifications push sont envoyées
4. ✅ Vérifier que le cache est mis à jour
5. ✅ Monitorer les logs en production

