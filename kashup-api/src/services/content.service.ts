import prisma from '../config/prisma';
import { buildListMeta, buildListQuery, ListParams } from '../utils/listing';

export const listPredefinedGifts = async (params: ListParams) => {
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

export const listGiftBoxes = async (params: ListParams) => {
  const { where, orderBy, skip, take } = buildListQuery({ active: true }, params, { softDelete: true });
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

export const listSpotlightAssociations = async (params: ListParams) => {
  const now = new Date();
  const baseWhere = {
    active: true,
    startsAt: { lte: now },
    endsAt: { gte: now }
  };
  const { where, orderBy, skip, take } = buildListQuery(baseWhere, params, { softDelete: true });
  const total = await prisma.spotlightAssociation.count({ where });
  const spotlights = await prisma.spotlightAssociation.findMany({
    where,
    include: {
      association: {
        select: { id: true, name: true, description: true, logoUrl: true, department: true }
      }
    },
    orderBy,
    skip,
    take
  });
  return { data: spotlights, meta: buildListMeta(total, params) };
};


