# Configuration rapide des Webhooks

## 🚀 Configuration en 3 étapes

### 1. Ajouter l'URL dans `.env`

Ouvrez votre fichier `.env` et ajoutez :

```env
MOBILE_WEBHOOK_URL=https://votre-app-mobile.com/api/webhooks
```

**Pour le développement local**, vous pouvez utiliser [ngrok](https://ngrok.com/) :

```bash
# 1. Démarrer votre serveur mobile local (ex: port 3000)
# 2. Dans un autre terminal, exposer avec ngrok
ngrok http 3000

# 3. Copier l'URL HTTPS fournie (ex: https://abc123.ngrok.io)
# 4. Ajouter dans .env
MOBILE_WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks
```

### 2. Tester la configuration

```bash
npm run test:webhook
```

Ce script envoie un webhook de test et vérifie que tout fonctionne.

### 3. Vérifier les logs

Lorsque vous créez/modifiez des entités dans le back office, vérifiez les logs :

```bash
npm run dev
```

Vous devriez voir des messages comme :
```
✅ Webhook envoyé avec succès: partner.created
```

## 📋 Événements disponibles

Les webhooks sont automatiquement envoyés pour :

| Événement | Déclenché quand |
|-----------|------------------|
| `partner.created` | Création d'un partenaire |
| `partner.updated` | Mise à jour d'un partenaire |
| `partner.status.changed` | Changement de statut |
| `offer.created` | Création d'une offre |
| `offer.updated` | Mise à jour d'une offre |
| `offer.stock.changed` | Changement de stock |
| `offer.status.changed` | Changement de statut |
| `reward.created` | Création d'une récompense |
| `reward.updated` | Mise à jour d'une récompense |
| `reward.status.changed` | Changement de statut |
| `reward.stock.changed` | Changement de stock |
| `gift-card-config.updated` | Mise à jour config cartes cadeaux |
| `box-up-config.updated` | Mise à jour config Box UP |

## 🔧 Endpoint webhook côté mobile

Votre application mobile doit exposer un endpoint qui accepte :

```
POST /api/webhooks
```

**Headers attendus :**
- `Content-Type: application/json`
- `X-Webhook-Source: kashup-api`
- `X-Webhook-Event: <event-name>`

**Body (exemple) :**
```json
{
  "event": "partner.created",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "partner": {
      "id": "clx123...",
      "name": "Restaurant Le Bon Goût",
      ...
    }
  }
}
```

## ✅ Vérification

1. **Test manuel** : `npm run test:webhook`
2. **Test réel** : Créer un partenaire dans le back office
3. **Vérifier les logs** : Les webhooks sont loggés avec succès ou erreur

## 🐛 Dépannage

### Webhook non envoyé

- ✅ Vérifier que `MOBILE_WEBHOOK_URL` est défini dans `.env`
- ✅ Vérifier que l'URL est accessible (test avec `curl` ou Postman)
- ✅ Vérifier les logs pour les erreurs

### Erreur de timeout

- Le timeout est de 10 secondes par défaut
- Vérifier que l'endpoint mobile répond rapidement
- Vérifier la connexion réseau

### Erreur HTTP 4xx/5xx

- Vérifier que l'endpoint mobile accepte les requêtes POST
- Vérifier les headers requis
- Vérifier le format du payload

## 📚 Documentation complète

- [Guide complet](./WEBHOOKS_SETUP.md) - Configuration détaillée
- [API Admin](./API_ADMIN.md) - Tous les endpoints

