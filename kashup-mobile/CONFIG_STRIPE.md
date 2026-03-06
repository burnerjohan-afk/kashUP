# Paiement par carte (Apple Pay / Google Pay) avec Stripe

Les cartes UP, Cartes Sélection UP et Box UP peuvent être payées au choix avec le **cashback** (solde KashUP) ou par **carte** (Apple Pay / Google Pay via Stripe).

## Configuration

### 1. Compte Stripe

- Créez un compte sur [stripe.com](https://stripe.com) si besoin.
- Dans le tableau de bord Stripe : **Developers** → **API keys**.
- Récupérez la **clé publique** (publishable, `pk_...`) et la **clé secrète** (secret, `sk_...`).

### 2. Application mobile (Expo)

Dans `.env` ou `.env.local` à la racine de `kashup-mobile` :

```env
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxx  # ou pk_live_xxx en production
```

Pour **Apple Pay** (iOS) : dans `app.json`, le plugin `@stripe/stripe-react-native` peut recevoir un `merchantIdentifier` (ID marchand Apple). Voir la [doc Stripe Apple Pay](https://stripe.com/docs/apple-pay).

Pour **Google Pay** (Android) : le plugin peut recevoir `enableGooglePay: true` dans `app.json` :

```json
"plugins": [
  ["@stripe/stripe-react-native", { "enableGooglePay": true }]
]
```

**Note** : Apple Pay et Google Pay ne sont pas disponibles dans Expo Go ; il faut un **development build** (ex. `npx expo run:ios` ou `npx expo run:android`, ou EAS Build).

### 3. API (backend)

Dans le `.env` à la racine de `kashup-api` :

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxx  # ou sk_live_xxx en production
```

Redémarrez l’API après modification.

## Comportement

- Sur les écrans **Offrir** (Carte UP, Carte Sélection UP, Box UP), un choix **Mode de paiement** apparaît : **Cashback** ou **Carte (Apple Pay / Google Pay)**.
- Si l’utilisateur choisit **Carte**, au moment de confirmer l’envoi, la feuille de paiement Stripe s’ouvre (Apple Pay ou Google Pay selon l’appareil, sinon carte bancaire).
- Après un paiement réussi, le cadeau est enregistré comme aujourd’hui, sans débit du solde cashback.
