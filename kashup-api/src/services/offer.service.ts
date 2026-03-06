import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { OfferFormInput } from '../schemas/offer.schema';
import { emitOfferWebhook } from './webhook.service';
import { buildListMeta, buildListQuery, ListParams } from '../utils/listing';

/** Filtre : offres actuellement en cours (débutées et non expirées). Utilisé par l’app / public. */
export const listCurrentOffers = async (params: ListParams) => {
  const now = new Date();
  const baseWhere = {
    active: true,
    startsAt: { lte: now },
    endsAt: { gte: now }
  };

  const { where, orderBy, skip, take } = buildListQuery(baseWhere, params, { softDelete: true });
  const total = await prisma.partnerOffer.count({ where });
  const offers = await prisma.partnerOffer.findMany({
    where,
    include: {
      partner: { select: { id: true, name: true, logoUrl: true, territories: true } }
    },
    orderBy: [orderBy, { priority: 'asc' }],
    skip,
    take
  });

  return { data: offers, meta: buildListMeta(total, params) };
};

/** Liste toutes les offres pour le back office (tous statuts, avec filtre optionnel). */
export const listOffers = async (params: ListParams, statusFilter?: 'all' | 'active' | 'scheduled' | 'expired') => {
  const now = new Date();
  const baseWhere: Record<string, unknown> = {};

  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'active') {
      baseWhere.active = true;
      baseWhere.startsAt = { lte: now };
      baseWhere.endsAt = { gte: now };
    } else if (statusFilter === 'scheduled') {
      baseWhere.startsAt = { gt: now };
    } else if (statusFilter === 'expired') {
      baseWhere.endsAt = { lt: now };
    }
  }

  const { where, orderBy, skip, take } = buildListQuery(baseWhere, params, { softDelete: true });
  const total = await prisma.partnerOffer.count({ where });
  const offers = await prisma.partnerOffer.findMany({
    where,
    include: {
      partner: { select: { id: true, name: true, logoUrl: true, territories: true } }
    },
    orderBy: [orderBy, { priority: 'asc' }],
    skip,
    take
  });

  return { data: offers, meta: buildListMeta(total, params) };
};

export const createOffer = async (input: OfferFormInput, imageUrl?: string) => {
  const partner = await prisma.partner.findUnique({
    where: { id: input.partnerId },
    select: { id: true, name: true, logoUrl: true }
  });

  if (!partner) {
    throw new AppError('Partenaire introuvable', 404);
  }

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  // Déterminer le statut automatiquement
  const now = new Date();
  let status = 'scheduled';
  if (startAt <= now && endAt >= now) {
    status = 'active';
  } else if (endAt < now) {
    status = 'expired';
  }

  const offer = await prisma.partnerOffer.create({
    data: {
      partnerId: input.partnerId,
      title: input.title,
      price: input.price ?? undefined,
      cashbackRate: input.cashbackRate,
      startsAt: startAt,
      endsAt: endAt,
      stock: input.stock,
      stockUsed: 0,
      imageUrl: imageUrl ?? input.imageUrl ?? undefined,
      status,
      conditions: input.conditions ?? undefined,
      active: status === 'active'
    },
    include: {
      partner: { select: { id: true, name: true, logoUrl: true } }
    }
  });

  // Déclencher le webhook
  await emitOfferWebhook('offer.created', offer);

  return offer;
};

export const updateOffer = async (id: string, input: Partial<OfferFormInput>, imageUrl?: string) => {
  const existingOffer = await prisma.partnerOffer.findUnique({
    where: { id },
    include: { partner: true }
  });

  if (!existingOffer) {
    throw new AppError('Offre introuvable', 404);
  }

  const data: any = {};

  if (input.title) data.title = input.title;
  if (input.price !== undefined) data.price = input.price;
  if (input.cashbackRate !== undefined) data.cashbackRate = input.cashbackRate;
  if (input.startAt) data.startsAt = new Date(input.startAt);
  if (input.endAt) data.endsAt = new Date(input.endAt);
  if (input.stock !== undefined) data.stock = input.stock;
  if (input.conditions !== undefined) data.conditions = input.conditions;
  if (input.status) data.status = input.status;
  if (imageUrl) data.imageUrl = imageUrl;
  if (input.imageUrl !== undefined) data.imageUrl = input.imageUrl || null;

  // Recalculer le statut si les dates changent
  if (input.startAt || input.endAt || input.status) {
    const startAt = data.startsAt || existingOffer.startsAt;
    const endAt = data.endsAt || existingOffer.endsAt;
    const now = new Date();

    if (!input.status) {
      if (startAt <= now && endAt >= now) {
        data.status = 'active';
        data.active = true;
      } else if (endAt < now) {
        data.status = 'expired';
        data.active = false;
      } else {
        data.status = 'scheduled';
        data.active = false;
      }
    } else {
      data.active = input.status === 'active';
    }
  }

  const offer = await prisma.partnerOffer.update({
    where: { id },
    data,
    include: {
      partner: { select: { id: true, name: true, logoUrl: true } }
    }
  });

  // Déclencher les webhooks appropriés
  await emitOfferWebhook('offer.updated', offer);
  
  if (data.status && data.status !== existingOffer.status) {
    await emitOfferWebhook('offer.status.changed', offer);
  }
  
  if (data.stock !== undefined && data.stock !== existingOffer.stock) {
    await emitOfferWebhook('offer.stock.changed', offer);
  }

  return offer;
};

/**
 * Enregistre l'utilisation d'une offre par un utilisateur (incrémente stockUsed).
 * À appeler côté backend lorsqu'un paiement pour une offre du moment est confirmé
 * (webhook Stripe, callback paiement, etc.) — le solde restant diminue alors automatiquement.
 */
export const useOffer = async (offerId: string) => {
  const offer = await prisma.partnerOffer.findUnique({
    where: { id: offerId },
    include: { partner: { select: { id: true, name: true, logoUrl: true } } }
  });

  if (!offer) {
    throw new AppError('Offre introuvable', 404);
  }

  const restantes = Math.max(0, (offer.stock ?? 0) - (offer.stockUsed ?? 0));
  if (restantes <= 0) {
    throw new AppError('Plus d\'offres disponibles pour cette offre', 400);
  }

  const updated = await prisma.partnerOffer.update({
    where: { id: offerId },
    data: { stockUsed: (offer.stockUsed ?? 0) + 1 },
    include: { partner: { select: { id: true, name: true, logoUrl: true } } }
  });

  await emitOfferWebhook('offer.used', updated);
  return updated;
};


