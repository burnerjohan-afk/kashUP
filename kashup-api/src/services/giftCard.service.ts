import { addMonths } from 'date-fns';
import { nanoid } from 'nanoid';
import prisma from '../config/prisma';
import {
  PurchaseGiftCardInput,
  GiftCardConfigInput,
  BoxUpConfigInput,
  SendPredefinedGiftInput,
  SendBoxUpInput,
  SendSelectionUpInput,
  CreatePaymentIntentForGiftInput,
} from '../schemas/giftCard.schema';
import { AppError } from '../utils/errors';
import { emitBoxUpConfigWebhook, emitGiftCardConfigWebhook } from './webhook.service';
import { createNotification } from './notification.service';
import { buildListMeta, buildListQuery, ListParams } from '../utils/listing';

export const listGiftCardAmounts = async () => {
  const amounts = await prisma.giftCardAmount.findMany({
    orderBy: { amount: 'asc' },
  });
  return amounts.map((a) => ({
    id: a.id,
    amount: a.amount,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));
};

export const createGiftCardAmount = async (amount: number) => {
  const created = await prisma.giftCardAmount.create({
    data: { amount },
  });
  return {
    id: created.id,
    amount: created.amount,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
};

export const deleteGiftCardAmountById = async (id: string) => {
  const existing = await prisma.giftCardAmount.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Montant introuvable', 404);
  }
  await prisma.giftCardAmount.delete({ where: { id } });
};

export const listGiftCardCatalog = async (params: ListParams) => {
  const { where, orderBy, skip, take } = buildListQuery({ isGiftable: true }, params, { softDelete: true });
  const total = await prisma.giftCard.count({ where });
  const giftCards = await prisma.giftCard.findMany({
    where,
    include: {
      partner: { select: { id: true, name: true, logoUrl: true } }
    },
    orderBy,
    skip,
    take
  });
  return { data: giftCards, meta: buildListMeta(total, params) };
};

export const listPredefinedGiftOffers = async (params: ListParams) => {
  const { where, orderBy, skip, take } = buildListQuery({ active: true }, params, { softDelete: true });
  const total = await prisma.predefinedGift.count({ where });
  const gifts = await prisma.predefinedGift.findMany({
    where,
    orderBy,
    skip,
    take
  });
  return { data: gifts, meta: buildListMeta(total, params) };
};

/** Format commun pour l'app mobile (Cartes UP prédefinies + PredefinedGift) */
export type GiftOfferForApp = {
  id: string;
  title: string;
  description: string;
  /** Offre partenaire (ex. "Massage 1h") – Carte UP uniquement */
  offre?: string | null;
  partner: { id: string; name: string; logoUrl?: string | null } | null;
  price: number;
  /** Taux de cashback (%) à l'achat – affiché dans l'app */
  cashbackRate?: number | null;
  accentColor?: string | null;
  imageUrl?: string | null;
};

/** Liste unifiée pour l'app : PredefinedGift + CarteUpPredefinie (actives) */
export const listGiftCardOffersForApp = async (): Promise<GiftOfferForApp[]> => {
  const [predefined, cartesUp] = await Promise.all([
    prisma.predefinedGift.findMany({
      where: { active: true, deletedAt: null },
      orderBy: { amount: 'asc' },
    }),
    prisma.carteUpPredefinie.findMany({
      where: { status: 'active' },
      orderBy: { montant: 'asc' },
      include: { partner: { select: { id: true, name: true, logoUrl: true } } },
    }),
  ]);
  const fromPredefined: GiftOfferForApp[] = predefined.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.subtitle ?? '',
    partner: null,
    price: g.amount,
    cashbackRate: null,
    imageUrl: g.imageUrl ?? undefined,
  }));
  const fromCartesUp: GiftOfferForApp[] = cartesUp.map((c) => ({
    id: c.id,
    title: c.nom,
    description: c.description ?? '',
    offre: c.offre ?? undefined,
    partner: c.partner ? { id: c.partner.id, name: c.partner.name, logoUrl: c.partner.logoUrl } : null,
    price: c.montant,
    cashbackRate: c.cashbackRate != null ? c.cashbackRate : null,
    imageUrl: c.imageUrl ?? undefined,
  }));
  return [...fromPredefined, ...fromCartesUp];
};

export const listGiftBoxes = async (params: ListParams) => {
  // GiftBox n'a pas deletedAt : ne pas utiliser softDelete
  const { where, orderBy, skip, take } = buildListQuery({ active: true }, params, { softDelete: false });
  const total = await prisma.giftBox.count({ where });
  const boxes = await prisma.giftBox.findMany({
    where,
    include: {
      items: {
        include: {
          partner: { select: { id: true, name: true, logoUrl: true } }
        }
      }
    },
    orderBy,
    skip,
    take
  });
  return { data: boxes, meta: buildListMeta(total, params) };
};

export const getGiftBoxById = async (id: string) => {
  const box = await prisma.giftBox.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          partner: { select: { id: true, name: true, logoUrl: true } }
        }
      }
    }
  });

  if (!box) {
    throw new AppError('Gift box introuvable', 404);
  }

  return box;
};

export const listUserGiftCards = async (userId: string, params: ListParams) => {
  const { where, orderBy, skip, take } = buildListQuery({ purchaserId: userId }, params, { softDelete: false });
  const total = await prisma.giftCardPurchase.count({ where });
  const purchases = await prisma.giftCardPurchase.findMany({
    where,
    include: {
      giftCard: {
        select: { id: true, name: true, type: true, value: true, partnerId: true }
      }
    },
    orderBy,
    skip,
    take
  });
  return { data: purchases, meta: buildListMeta(total, params) };
};

export const purchaseGiftCard = async (userId: string, input: PurchaseGiftCardInput) => {
  const giftCard = await prisma.giftCard.findUnique({
    where: { id: input.giftCardId },
    include: { partner: true }
  });

  if (!giftCard || !giftCard.isGiftable) {
    throw new AppError('Gift card introuvable ou non disponible', 404);
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw new AppError('Wallet introuvable', 404);
  }

  const amount = input.amount ?? giftCard.value;
  if (wallet.soldeCashback < amount) {
    throw new AppError('Solde cashback insuffisant', 400);
  }

  const purchase = await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { soldeCashback: { decrement: amount } }
    });

    const purchaseRecord = await tx.giftCardPurchase.create({
      data: {
        giftCardId: giftCard.id,
        purchaserId: userId,
        beneficiaryEmail: input.beneficiaryEmail,
        message: input.message,
        amount,
        code: `KUP-${nanoid(10).toUpperCase()}`,
        expiresAt: addMonths(new Date(), 6)
      },
      include: {
        giftCard: {
          select: { id: true, name: true, type: true, partnerId: true }
        }
      }
    });

    return purchaseRecord;
  });

  // Si le destinataire a un compte KashUP, lui envoyer une notification in-app
  const beneficiaryUser = await prisma.user.findUnique({
    where: { email: input.beneficiaryEmail.trim().toLowerCase() },
  });
  if (beneficiaryUser && beneficiaryUser.id !== userId) {
    const giftName = giftCard.partner?.name ?? giftCard.name;
    await createNotification(beneficiaryUser.id, {
      title: 'Vous avez reçu un cadeau',
      body: input.message
        ? `${giftName} — ${input.message.substring(0, 80)}${input.message.length > 80 ? '…' : ''}`
        : `Carte cadeau ${giftName} (${amount} €)`,
      category: 'gifts',
      metadata: { purchaseId: purchase.id, giftCardId: giftCard.id },
    });
  }

  return purchase;
};

/** Envoi d'une offre prédefinie (Carte UP / PredefinedGift) à un utilisateur : débit wallet, enregistrement, notification in-app. */
export const sendPredefinedGift = async (senderId: string, input: SendPredefinedGiftInput) => {
  const [predefined, carteUp] = await Promise.all([
    prisma.predefinedGift.findFirst({ where: { id: input.offerId, active: true, deletedAt: null } }),
    prisma.carteUpPredefinie.findFirst({ where: { id: input.offerId, status: 'active' }, include: { partner: { select: { name: true } } } }),
  ]);
  const offer = predefined ?? carteUp;
  if (!offer) {
    throw new AppError('Offre introuvable ou inactive', 404);
  }
  const amount = predefined ? predefined.amount : (offer as { montant: number }).montant;
  const title = predefined ? predefined.title : (offer as { nom: string }).nom;

  const beneficiary = await prisma.user.findUnique({ where: { email: input.beneficiaryEmail.trim().toLowerCase() } });
  if (!beneficiary) {
    throw new AppError('Aucun utilisateur KashUP avec cet e-mail. Le destinataire doit avoir un compte.', 400);
  }
  if (beneficiary.id === senderId) {
    throw new AppError('Vous ne pouvez pas vous envoyer un cadeau à vous-même.', 400);
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: senderId } });
  if (!wallet) {
    throw new AppError('Wallet introuvable', 404);
  }
  if (wallet.soldeCashback < amount) {
    throw new AppError('Solde cashback insuffisant', 400);
  }

  const offerType = predefined ? 'predefined' : 'carte_up';

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { soldeCashback: { decrement: amount } },
    });
    await tx.predefinedGiftSend.create({
      data: {
        offerId: input.offerId,
        offerType,
        senderId,
        beneficiaryUserId: beneficiary.id,
        beneficiaryEmail: beneficiary.email,
        message: input.message ?? null,
        amount,
        offerTitle: title,
      },
    });
  });

  await createNotification(beneficiary.id, {
    title: 'Vous avez reçu un cadeau',
    body: input.message?.trim() ? `${title} — ${input.message.trim()}` : title,
    category: 'gifts',
    metadata: { offerId: input.offerId, offerType, senderId },
  });

  return { success: true, message: 'Cadeau envoyé. Le destinataire a été notifié dans l\'app.' };
};

/** Envoi d'une Box UP à un utilisateur : débit wallet, enregistrement PredefinedGiftSend (offerType box_up), notification in-app. */
export const sendBoxUp = async (senderId: string, input: SendBoxUpInput) => {
  const box = await prisma.giftBox.findFirst({
    where: { id: input.boxId, active: true },
  });
  if (!box) {
    throw new AppError('Box introuvable ou inactive', 404);
  }
  const amount = box.value ?? 0;
  if (amount <= 0) {
    throw new AppError('Cette Box n\'a pas de montant défini', 400);
  }

  const beneficiary = await prisma.user.findUnique({ where: { email: input.beneficiaryEmail.trim().toLowerCase() } });
  if (!beneficiary) {
    throw new AppError('Aucun utilisateur KashUP avec cet e-mail. Le destinataire doit avoir un compte.', 400);
  }
  if (beneficiary.id === senderId) {
    throw new AppError('Vous ne pouvez pas vous envoyer un cadeau à vous-même.', 400);
  }

  const wallet = await prisma.wallet.findUnique({ where: { userId: senderId } });
  if (!wallet) {
    throw new AppError('Wallet introuvable', 404);
  }
  if (wallet.soldeCashback < amount) {
    throw new AppError('Solde cashback insuffisant', 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { soldeCashback: { decrement: amount } },
    });
    await tx.predefinedGiftSend.create({
      data: {
        offerId: input.boxId,
        offerType: 'box_up',
        senderId,
        beneficiaryUserId: beneficiary.id,
        beneficiaryEmail: beneficiary.email,
        message: input.message ?? null,
        amount,
        offerTitle: box.name,
      },
    });
  });

  await createNotification(beneficiary.id, {
    title: 'Vous avez reçu une Box UP',
    body: input.message?.trim() ? `${box.name} — ${input.message.trim()}` : box.name,
    category: 'gifts',
    metadata: { boxId: input.boxId, senderId },
  });

  return { success: true, message: 'Box UP envoyée. Le destinataire a été notifié dans l\'app.' };
};

/** Carte Sélection UP : montant libre (pas de catalogue). Débite le wallet, crée l'envoi. Si le destinataire a un compte KashUP, notification in-app. */
export const sendSelectionUp = async (senderId: string, input: SendSelectionUpInput) => {
  const amount = input.amount;
  const wallet = await prisma.wallet.findUnique({ where: { userId: senderId } });
  if (!wallet) {
    throw new AppError('Wallet introuvable', 404);
  }
  if (wallet.soldeCashback < amount) {
    throw new AppError('Solde cashback insuffisant', 400);
  }

  const email = input.beneficiaryEmail.trim().toLowerCase();
  const beneficiary = await prisma.user.findUnique({ where: { email } });
  if (beneficiary?.id === senderId) {
    throw new AppError('Vous ne pouvez pas vous envoyer un cadeau à vous-même.', 400);
  }

  const offerTitle = input.partnerName?.trim() ? `Carte Sélection UP — ${input.partnerName}` : 'Carte Sélection UP';

  await prisma.$transaction(async (tx) => {
    await tx.wallet.update({
      where: { id: wallet.id },
      data: { soldeCashback: { decrement: amount } },
    });
    await tx.predefinedGiftSend.create({
      data: {
        offerId: input.partnerId ?? '',
        offerType: 'selection_up',
        senderId,
        beneficiaryUserId: beneficiary?.id ?? null,
        beneficiaryEmail: email,
        message: input.message ?? null,
        amount,
        offerTitle,
      },
    });
  });

  if (beneficiary) {
    await createNotification(beneficiary.id, {
      title: 'Vous avez reçu une Carte Sélection UP',
      body: input.message?.trim() ? `${offerTitle} — ${input.message.trim()}` : `${offerTitle} (${amount} €)`,
      category: 'gifts',
      metadata: { amount, senderId, partnerId: input.partnerId },
    });
  }

  return {
    success: true,
    message: beneficiary
      ? 'Carte envoyée. Le destinataire a été notifié dans l\'app.'
      : 'Carte envoyée. Le destinataire recevra les détails par e-mail.',
  };
};

// ——— Paiement par carte (Stripe Apple Pay / Google Pay) : même logique métier sans débit wallet ———

/** Retourne le montant en euros pour un paiement carte selon le type de cadeau (pour créer le PaymentIntent). */
export const getAmountEurosForGiftPayment = async (input: CreatePaymentIntentForGiftInput): Promise<number> => {
  if (input.giftType === 'carte_up') {
    const [predefined, carteUp] = await Promise.all([
      prisma.predefinedGift.findFirst({ where: { id: input.offerId, active: true, deletedAt: null } }),
      prisma.carteUpPredefinie.findFirst({ where: { id: input.offerId, status: 'active' } }),
    ]);
    const offer = predefined ?? carteUp;
    if (!offer) throw new AppError('Offre introuvable ou inactive', 404);
    return predefined ? predefined.amount : (offer as { montant: number }).montant;
  }
  if (input.giftType === 'box_up') {
    const box = await prisma.giftBox.findFirst({ where: { id: input.boxId, active: true } });
    if (!box) throw new AppError('Box introuvable ou inactive', 404);
    const value = box.value ?? 0;
    if (value <= 0) throw new AppError('Cette Box n\'a pas de montant défini', 400);
    return value;
  }
  // selection_up
  return input.amount;
};

/** Envoi Carte UP / PredefinedGift payé par carte (pas de débit cashback). */
export const sendPredefinedGiftWithCard = async (senderId: string, input: SendPredefinedGiftInput) => {
  const [predefined, carteUp] = await Promise.all([
    prisma.predefinedGift.findFirst({ where: { id: input.offerId, active: true, deletedAt: null } }),
    prisma.carteUpPredefinie.findFirst({ where: { id: input.offerId, status: 'active' }, include: { partner: { select: { name: true } } } }),
  ]);
  const offer = predefined ?? carteUp;
  if (!offer) {
    throw new AppError('Offre introuvable ou inactive', 404);
  }
  const amount = predefined ? predefined.amount : (offer as { montant: number }).montant;
  const title = predefined ? predefined.title : (offer as { nom: string }).nom;

  const beneficiary = await prisma.user.findUnique({ where: { email: input.beneficiaryEmail.trim().toLowerCase() } });
  if (!beneficiary) {
    throw new AppError('Aucun utilisateur KashUP avec cet e-mail. Le destinataire doit avoir un compte.', 400);
  }
  if (beneficiary.id === senderId) {
    throw new AppError('Vous ne pouvez pas vous envoyer un cadeau à vous-même.', 400);
  }

  const offerType = predefined ? 'predefined' : 'carte_up';

  await prisma.predefinedGiftSend.create({
    data: {
      offerId: input.offerId,
      offerType,
      senderId,
      beneficiaryUserId: beneficiary.id,
      beneficiaryEmail: beneficiary.email,
      message: input.message ?? null,
      amount,
      offerTitle: title,
    },
  });

  await createNotification(beneficiary.id, {
    title: 'Vous avez reçu un cadeau',
    body: input.message?.trim() ? `${title} — ${input.message.trim()}` : title,
    category: 'gifts',
    metadata: { offerId: input.offerId, offerType, senderId },
  });

  return { success: true, message: 'Cadeau envoyé. Le destinataire a été notifié dans l\'app.' };
};

/** Envoi Box UP payé par carte (pas de débit cashback). */
export const sendBoxUpWithCard = async (senderId: string, input: SendBoxUpInput) => {
  const box = await prisma.giftBox.findFirst({
    where: { id: input.boxId, active: true },
  });
  if (!box) {
    throw new AppError('Box introuvable ou inactive', 404);
  }
  const amount = box.value ?? 0;
  if (amount <= 0) {
    throw new AppError('Cette Box n\'a pas de montant défini', 400);
  }

  const beneficiary = await prisma.user.findUnique({ where: { email: input.beneficiaryEmail.trim().toLowerCase() } });
  if (!beneficiary) {
    throw new AppError('Aucun utilisateur KashUP avec cet e-mail. Le destinataire doit avoir un compte.', 400);
  }
  if (beneficiary.id === senderId) {
    throw new AppError('Vous ne pouvez pas vous envoyer un cadeau à vous-même.', 400);
  }

  await prisma.predefinedGiftSend.create({
    data: {
      offerId: input.boxId,
      offerType: 'box_up',
      senderId,
      beneficiaryUserId: beneficiary.id,
      beneficiaryEmail: beneficiary.email,
      message: input.message ?? null,
      amount,
      offerTitle: box.name,
    },
  });

  await createNotification(beneficiary.id, {
    title: 'Vous avez reçu une Box UP',
    body: input.message?.trim() ? `${box.name} — ${input.message.trim()}` : box.name,
    category: 'gifts',
    metadata: { boxId: input.boxId, senderId },
  });

  return { success: true, message: 'Box UP envoyée. Le destinataire a été notifié dans l\'app.' };
};

/** Envoi Carte Sélection UP payé par carte (pas de débit cashback). */
export const sendSelectionUpWithCard = async (senderId: string, input: SendSelectionUpInput) => {
  const amount = input.amount;
  const email = input.beneficiaryEmail.trim().toLowerCase();
  const beneficiary = await prisma.user.findUnique({ where: { email } });
  if (beneficiary?.id === senderId) {
    throw new AppError('Vous ne pouvez pas vous envoyer un cadeau à vous-même.', 400);
  }

  const offerTitle = input.partnerName?.trim() ? `Carte Sélection UP — ${input.partnerName}` : 'Carte Sélection UP';

  await prisma.predefinedGiftSend.create({
    data: {
      offerId: input.partnerId ?? '',
      offerType: 'selection_up',
      senderId,
      beneficiaryUserId: beneficiary?.id ?? null,
      beneficiaryEmail: email,
      message: input.message ?? null,
      amount,
      offerTitle,
    },
  });

  if (beneficiary) {
    await createNotification(beneficiary.id, {
      title: 'Vous avez reçu une Carte Sélection UP',
      body: input.message?.trim() ? `${offerTitle} — ${input.message.trim()}` : `${offerTitle} (${amount} €)`,
      category: 'gifts',
      metadata: { amount, senderId, partnerId: input.partnerId },
    });
  }

  return {
    success: true,
    message: beneficiary
      ? 'Carte envoyée. Le destinataire a été notifié dans l\'app.'
      : 'Carte envoyée. Le destinataire recevra les détails par e-mail.',
  };
};

// Services pour l'admin

export const listGiftCardOrders = async () => {
  return prisma.giftCardPurchase.findMany({
    include: {
      giftCard: {
        include: {
          partner: { select: { id: true, name: true, logoUrl: true } }
        }
      },
      purchaser: {
        select: { id: true, email: true, firstName: true, lastName: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

export const getGiftCardConfig = async () => {
  const config = await prisma.giftCardConfig.findFirst({
    orderBy: { updatedAt: 'desc' }
  });
  
  // Si aucune config n'existe, retourner une config vide
  if (!config) {
    return {
      id: null,
      giftCardDescription: null,
      giftCardImageUrl: null,
      giftCardVirtualCardImageUrl: null,
      giftCardHowItWorks: null,
      giftCardConditions: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
  
  return config;
};

export const updateGiftCardConfig = async (input: GiftCardConfigInput, imageUrls?: { giftCardImageUrl?: string; giftCardVirtualCardImageUrl?: string }) => {
  const existingConfig = await prisma.giftCardConfig.findFirst({
    orderBy: { updatedAt: 'desc' }
  });

  const data: any = {
    giftCardDescription: input.giftCardDescription,
    giftCardHowItWorks: input.giftCardHowItWorks,
    giftCardConditions: input.giftCardConditions
  };

  if (imageUrls?.giftCardImageUrl) {
    data.giftCardImageUrl = imageUrls.giftCardImageUrl;
  }
  if (imageUrls?.giftCardVirtualCardImageUrl) {
    data.giftCardVirtualCardImageUrl = imageUrls.giftCardVirtualCardImageUrl;
  }

  let config;
  if (existingConfig) {
    config = await prisma.giftCardConfig.update({
      where: { id: existingConfig.id },
      data
    });
  } else {
    config = await prisma.giftCardConfig.create({ data });
  }

  // Déclencher le webhook
  await emitGiftCardConfigWebhook(config);

  return config;
};

export const getBoxUpConfig = async () => {
  const config = await prisma.boxUpConfig.findFirst({
    include: {
      partners: {
        include: {
          partner: { select: { id: true, name: true, logoUrl: true } }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });
  
  return config;
};

export const createOrUpdateBoxUpConfig = async (input: BoxUpConfigInput, imageUrl?: string) => {
  const existingConfig = await prisma.boxUpConfig.findFirst({
    orderBy: { updatedAt: 'desc' }
  });

  const data: any = {
    boxUpName: input.boxUpName,
    boxUpHowItWorks: input.boxUpHowItWorks,
    boxUpConditions: input.boxUpConditions
  };

  if (imageUrl) {
    data.boxUpImageUrl = imageUrl;
  }

  if (existingConfig) {
    // Supprimer les anciennes relations
    await prisma.boxUpPartner.deleteMany({
      where: { boxUpConfigId: existingConfig.id }
    });

    // Mettre à jour la config
    const updatedConfig = await prisma.boxUpConfig.update({
      where: { id: existingConfig.id },
      data
    });

    // Créer les nouvelles relations
    await prisma.boxUpPartner.createMany({
      data: input.boxUpPartners.map(partnerId => ({
        boxUpConfigId: updatedConfig.id,
        partnerId
      }))
    });

    const config = await prisma.boxUpConfig.findUnique({
      where: { id: updatedConfig.id },
      include: {
        partners: {
          include: {
            partner: { select: { id: true, name: true, logoUrl: true } }
          }
        }
      }
    });

    // Déclencher le webhook
    if (config) {
      await emitBoxUpConfigWebhook(config);
    }

    return config;
  } else {
    // Créer la nouvelle config
    const newConfig = await prisma.boxUpConfig.create({ data });

    // Créer les relations
    await prisma.boxUpPartner.createMany({
      data: input.boxUpPartners.map(partnerId => ({
        boxUpConfigId: newConfig.id,
        partnerId
      }))
    });

    const config = await prisma.boxUpConfig.findUnique({
      where: { id: newConfig.id },
      include: {
        partners: {
          include: {
            partner: { select: { id: true, name: true, logoUrl: true } }
          }
        }
      }
    });

    // Déclencher le webhook
    if (config) {
      await emitBoxUpConfigWebhook(config);
    }

    return config;
  }
};

/** Format admin BoxUp (nom, partenaires, commentCaMarche, cashbackRate, status) depuis le modèle GiftBox */
export const mapGiftBoxToBoxUp = (box: {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  cashbackInfo: string | null;
  cashbackRate: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    partnerId: string | null;
    title: string;
    description: string | null;
    partner?: { id: string; name: string } | null;
  }>;
}) => ({
  id: box.id,
  nom: box.name,
  description: box.description,
  imageUrl: box.imageUrl ?? undefined,
  partenaires: box.items.map((item) => ({
    partenaireId: item.partnerId ?? '',
    partenaireName: item.partner?.name,
    offrePartenaire: item.title,
    conditions: item.description ?? undefined,
  })),
  commentCaMarche: box.cashbackInfo ?? undefined,
  cashbackRate: box.cashbackRate ?? undefined,
  status: box.active ? ('active' as const) : ('inactive' as const),
  createdAt: box.createdAt.toISOString(),
  updatedAt: box.updatedAt.toISOString(),
});

/** Payload admin pour créer une box (FormData / body) */
export type CreateBoxUpPayload = {
  nom: string;
  description: string;
  imageUrl?: string;
  partenaires: string; // JSON string Array<{ partenaireId, offrePartenaire, conditions? }>
  commentCaMarche?: string;
  cashbackRate?: number | null;
  status: 'active' | 'inactive';
};

export const createGiftBoxAdmin = async (payload: CreateBoxUpPayload) => {
  let partenaires: Array<{ partenaireId: string; offrePartenaire: string; conditions?: string }>;
  try {
    partenaires = JSON.parse(payload.partenaires);
  } catch {
    throw new AppError('partenaires doit être un tableau JSON valide', 400);
  }
  if (!partenaires?.length) {
    throw new AppError('Au moins un partenaire est requis', 400);
  }
  const active = payload.status === 'active';
  const box = await prisma.giftBox.create({
    data: {
      name: payload.nom,
      description: payload.description,
      imageUrl: payload.imageUrl ?? null,
      cashbackInfo: payload.commentCaMarche ?? null,
      value: 0,
      cashbackRate: payload.cashbackRate ?? null,
      active,
      items: {
        create: partenaires.map((p) => ({
          partnerId: p.partenaireId || null,
          title: p.offrePartenaire ?? '',
          description: p.conditions ?? null,
        })),
      },
    },
    include: {
      items: {
        include: {
          partner: { select: { id: true, name: true, logoUrl: true } },
        },
      },
    },
  });
  return mapGiftBoxToBoxUp(box);
};

/** Payload admin pour modifier une box */
export type UpdateBoxUpPayload = Partial<{
  nom: string;
  description: string;
  imageUrl: string;
  partenaires: string;
  commentCaMarche: string;
  cashbackRate: number | null;
  status: 'active' | 'inactive';
}>;

export const updateGiftBoxAdmin = async (id: string, payload: UpdateBoxUpPayload) => {
  const existing = await prisma.giftBox.findUnique({ where: { id }, include: { items: true } });
  if (!existing) {
    throw new AppError('Box introuvable', 404);
  }
  let partenaires: Array<{ partenaireId: string; offrePartenaire: string; conditions?: string }> | undefined;
  if (payload.partenaires !== undefined) {
    try {
      partenaires = JSON.parse(payload.partenaires);
    } catch {
      throw new AppError('partenaires doit être un tableau JSON valide', 400);
    }
  }
  const data: Parameters<typeof prisma.giftBox.update>[0]['data'] = {};
  if (payload.nom !== undefined) data.name = payload.nom;
  if (payload.description !== undefined) data.description = payload.description;
  if (payload.imageUrl !== undefined) data.imageUrl = payload.imageUrl;
  if (payload.commentCaMarche !== undefined) data.cashbackInfo = payload.commentCaMarche;
  if (payload.cashbackRate !== undefined) data.cashbackRate = payload.cashbackRate;
  if (payload.status !== undefined) data.active = payload.status === 'active';

  if (partenaires !== undefined) {
    await prisma.giftBoxItem.deleteMany({ where: { giftBoxId: id } });
    await prisma.giftBox.update({
      where: { id },
      data: {
        ...data,
        items: {
          create: partenaires.map((p) => ({
            partnerId: p.partenaireId || null,
            title: p.offrePartenaire ?? '',
            description: p.conditions ?? null,
          })),
        },
      },
    });
  } else {
    await prisma.giftBox.update({ where: { id }, data });
  }

  const box = await prisma.giftBox.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          partner: { select: { id: true, name: true, logoUrl: true } },
        },
      },
    },
  });
  if (!box) throw new AppError('Box introuvable', 404);
  return mapGiftBoxToBoxUp(box);
};

export const deleteGiftBoxAdmin = async (id: string) => {
  const box = await prisma.giftBox.findUnique({ where: { id } });
  if (!box) {
    throw new AppError('Box introuvable', 404);
  }
  await prisma.giftBox.delete({ where: { id } });
};

export const exportGiftCardOrdersToCSV = async () => {
  const orders = await listGiftCardOrders();
  
  // En-têtes CSV
  const headers = [
    'ID',
    'Code',
    'Partenaire',
    'Montant',
    'Email bénéficiaire',
    'Acheteur',
    'Email acheteur',
    'Statut',
    'Date de création',
    'Date d\'expiration'
  ];

  // Lignes de données
  const rows = orders.map(order => [
    order.id,
    order.code,
    order.giftCard.partner?.name || 'N/A',
    order.amount.toString(),
    order.beneficiaryEmail,
    `${order.purchaser.firstName} ${order.purchaser.lastName}`,
    order.purchaser.email,
    order.status,
    order.createdAt.toISOString(),
    order.expiresAt.toISOString()
  ]);

  // Générer le CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csvContent;
};

// ========== Carte Sélection UP (config) ==========

function mapCarteUpLibreConfigToResponse(row: {
  id: string;
  nom: string;
  description: string;
  imageUrl: string | null;
  montantsDisponibles: string;
  partenairesEligibles: string;
  conditions: string | null;
  commentCaMarche: string | null;
  cashbackRate: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  let montants: number[] = [];
  try {
    montants = JSON.parse(row.montantsDisponibles || '[]');
  } catch {
    montants = [];
  }
  let partenaires: string[] = [];
  try {
    partenaires = JSON.parse(row.partenairesEligibles || '[]');
  } catch {
    partenaires = [];
  }
  return {
    id: row.id,
    nom: row.nom,
    description: row.description,
    imageUrl: row.imageUrl ?? undefined,
    montantsDisponibles: montants,
    partenairesEligibles: partenaires,
    conditions: row.conditions ?? undefined,
    commentCaMarche: row.commentCaMarche ?? undefined,
    cashbackRate: row.cashbackRate ?? undefined,
    status: row.status as 'active' | 'inactive',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const listCartesUpLibres = async () => {
  const rows = await prisma.carteUpLibreConfig.findMany({
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(mapCarteUpLibreConfigToResponse);
};

/** Pour l'app mobile : configs Carte Sélection UP actives uniquement (même format que back office) */
export const listCartesUpLibresForApp = async () => {
  const rows = await prisma.carteUpLibreConfig.findMany({
    where: { status: 'active' },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(mapCarteUpLibreConfigToResponse);
};

export const getCarteUpLibreById = async (id: string) => {
  const row = await prisma.carteUpLibreConfig.findUnique({ where: { id } });
  if (!row) throw new AppError('Configuration Carte Sélection UP introuvable', 404);
  return mapCarteUpLibreConfigToResponse(row);
};

export const createCarteUpLibreConfig = async (payload: {
  nom: string;
  description: string;
  imageUrl?: string;
  montantsDisponibles: string;
  partenairesEligibles: string;
  conditions?: string;
  commentCaMarche?: string;
  cashbackRate?: number | null;
  status: string;
}) => {
  const row = await prisma.carteUpLibreConfig.create({
    data: {
      nom: payload.nom,
      description: payload.description,
      imageUrl: payload.imageUrl ?? null,
      montantsDisponibles: payload.montantsDisponibles || '[]',
      partenairesEligibles: payload.partenairesEligibles || '[]',
      conditions: payload.conditions ?? null,
      commentCaMarche: payload.commentCaMarche ?? null,
      cashbackRate: payload.cashbackRate ?? null,
      status: payload.status || 'active',
    },
  });
  return mapCarteUpLibreConfigToResponse(row);
};

export const updateCarteUpLibreConfig = async (
  id: string,
  payload: Partial<{
    nom: string;
    description: string;
    imageUrl: string;
    montantsDisponibles: string;
    partenairesEligibles: string;
    conditions: string;
    commentCaMarche: string;
    cashbackRate: number | null;
    status: string;
  }>
) => {
  const existing = await prisma.carteUpLibreConfig.findUnique({ where: { id } });
  if (!existing) throw new AppError('Configuration Carte Sélection UP introuvable', 404);
  const row = await prisma.carteUpLibreConfig.update({
    where: { id },
    data: {
      ...(payload.nom !== undefined && { nom: payload.nom }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.imageUrl !== undefined && { imageUrl: payload.imageUrl }),
      ...(payload.montantsDisponibles !== undefined && { montantsDisponibles: payload.montantsDisponibles }),
      ...(payload.partenairesEligibles !== undefined && { partenairesEligibles: payload.partenairesEligibles }),
      ...(payload.conditions !== undefined && { conditions: payload.conditions }),
      ...(payload.commentCaMarche !== undefined && { commentCaMarche: payload.commentCaMarche }),
      ...(payload.cashbackRate !== undefined && { cashbackRate: payload.cashbackRate }),
      ...(payload.status !== undefined && { status: payload.status }),
    },
  });
  return mapCarteUpLibreConfigToResponse(row);
};

export const deleteCarteUpLibreConfig = async (id: string) => {
  const existing = await prisma.carteUpLibreConfig.findUnique({ where: { id } });
  if (!existing) throw new AppError('Configuration Carte Sélection UP introuvable', 404);
  await prisma.carteUpLibreConfig.delete({ where: { id } });
};

// ========== Carte UP (pré-définie) ==========

function mapCarteUpPredefinieToResponse(row: {
  id: string;
  nom: string;
  partenaireId: string;
  offre: string | null;
  montant: number;
  imageUrl: string | null;
  description: string;
  dureeValiditeJours: number | null;
  conditions: string | null;
  commentCaMarche: string | null;
  cashbackRate: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  partner?: { name: string } | null;
}) {
  return {
    id: row.id,
    nom: row.nom,
    partenaireId: row.partenaireId,
    partenaireName: row.partner?.name,
    offre: row.offre ?? undefined,
    montant: row.montant,
    imageUrl: row.imageUrl ?? undefined,
    description: row.description,
    dureeValiditeJours: row.dureeValiditeJours ?? undefined,
    conditions: row.conditions ?? undefined,
    commentCaMarche: row.commentCaMarche ?? undefined,
    cashbackRate: row.cashbackRate ?? undefined,
    status: row.status as 'active' | 'inactive',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const listCartesUpPredefinies = async () => {
  const rows = await prisma.carteUpPredefinie.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { partner: { select: { name: true } } },
  });
  return rows.map(mapCarteUpPredefinieToResponse);
};

export const getCarteUpPredefinieById = async (id: string) => {
  const row = await prisma.carteUpPredefinie.findUnique({
    where: { id },
    include: { partner: { select: { name: true } } },
  });
  if (!row) throw new AppError('Carte UP introuvable', 404);
  return mapCarteUpPredefinieToResponse(row);
};

export const createCarteUpPredefinie = async (payload: {
  nom: string;
  partenaireId: string;
  offre?: string;
  montant: number;
  imageUrl?: string;
  description: string;
  dureeValiditeJours?: number;
  conditions?: string;
  commentCaMarche?: string;
  cashbackRate?: number | null;
  status: string;
}) => {
  const row = await prisma.carteUpPredefinie.create({
    data: {
      nom: payload.nom,
      partenaireId: payload.partenaireId,
      offre: payload.offre ?? null,
      montant: payload.montant,
      imageUrl: payload.imageUrl ?? null,
      description: payload.description,
      dureeValiditeJours: payload.dureeValiditeJours ?? null,
      conditions: payload.conditions ?? null,
      commentCaMarche: payload.commentCaMarche ?? null,
      cashbackRate: payload.cashbackRate ?? null,
      status: payload.status || 'active',
    },
    include: { partner: { select: { name: true } } },
  });
  return mapCarteUpPredefinieToResponse(row);
};

export const updateCarteUpPredefinie = async (
  id: string,
  payload: Partial<{
    nom: string;
    partenaireId: string;
    offre: string;
    montant: number;
    imageUrl: string;
    description: string;
    dureeValiditeJours: number;
    conditions: string;
    commentCaMarche: string;
    cashbackRate: number | null;
    status: string;
  }>
) => {
  const existing = await prisma.carteUpPredefinie.findUnique({ where: { id } });
  if (!existing) throw new AppError('Carte UP introuvable', 404);
  const row = await prisma.carteUpPredefinie.update({
    where: { id },
    data: {
      ...(payload.nom !== undefined && { nom: payload.nom }),
      ...(payload.partenaireId !== undefined && { partenaireId: payload.partenaireId }),
      ...(payload.offre !== undefined && { offre: payload.offre }),
      ...(payload.montant !== undefined && { montant: payload.montant }),
      ...(payload.imageUrl !== undefined && { imageUrl: payload.imageUrl }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.dureeValiditeJours !== undefined && { dureeValiditeJours: payload.dureeValiditeJours }),
      ...(payload.conditions !== undefined && { conditions: payload.conditions }),
      ...(payload.commentCaMarche !== undefined && { commentCaMarche: payload.commentCaMarche }),
      ...(payload.cashbackRate !== undefined && { cashbackRate: payload.cashbackRate }),
      ...(payload.status !== undefined && { status: payload.status }),
    },
    include: { partner: { select: { name: true } } },
  });
  return mapCarteUpPredefinieToResponse(row);
};

export const deleteCarteUpPredefinie = async (id: string) => {
  const existing = await prisma.carteUpPredefinie.findUnique({ where: { id } });
  if (!existing) throw new AppError('Carte UP introuvable', 404);
  await prisma.carteUpPredefinie.delete({ where: { id } });
};


