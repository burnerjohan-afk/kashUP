import Stripe from 'stripe';
import env from '../config/env';
import { AppError } from '../utils/errors';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  const secret = env.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY;
  if (!secret?.startsWith('sk_')) {
    throw new AppError('Paiement par carte non configuré (STRIPE_SECRET_KEY manquant)', 503);
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secret);
  }
  return stripeClient;
}

export type GiftType = 'carte_up' | 'selection_up' | 'box_up';

/**
 * Crée un PaymentIntent Stripe pour un achat de carte/box (Apple Pay / Google Pay).
 * @param amountCents Montant en centimes (ex: 1500 = 15€)
 * @param userId ID utilisateur (stocké en metadata pour vérification à la confirmation)
 * @param metadata Données additionnelles (giftType, etc.)
 */
export async function createGiftCardPaymentIntent(
  amountCents: number,
  userId: string,
  metadata: { giftType: GiftType }
): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'eur',
    automatic_payment_methods: { enabled: true },
    metadata: {
      userId,
      giftType: metadata.giftType,
    },
  });
  if (!paymentIntent.client_secret) {
    throw new AppError('Impossible de créer l\'intention de paiement', 500);
  }
  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Vérifie qu'un PaymentIntent a bien été payé et appartient à l'utilisateur.
 */
export async function verifyGiftCardPaymentIntent(
  paymentIntentId: string,
  expectedUserId: string,
  expectedAmountCents: number
): Promise<boolean> {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== 'succeeded') {
    return false;
  }
  if (paymentIntent.metadata?.userId !== expectedUserId) {
    return false;
  }
  if (paymentIntent.amount !== expectedAmountCents) {
    return false;
  }
  return true;
}
