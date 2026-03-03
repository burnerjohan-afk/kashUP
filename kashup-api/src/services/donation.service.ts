import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import { buildListMeta, buildListQuery, ListParams } from '../utils/listing';

/** Type admin attendu par le back office */
const ASSOCIATION_TYPE_MAP: Record<string, string> = {
  humanitaire: 'Humanitaire',
  solidaire: 'Solidaire',
  ecologie: 'Écologie',
  sante: 'Santé',
  education: 'Éducation',
  culture: 'Culture',
  sport: 'Sport',
  autre: 'Autre',
};

function toAdminAssociationFormat(row: {
  id: string;
  name: string;
  description: string | null;
  tonImpact: string | null;
  logoUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  category?: { name: string } | null;
}) {
  const typeName = row.category?.name?.toLowerCase() ?? 'autre';
  const type = Object.keys(ASSOCIATION_TYPE_MAP).find((k) => typeName.startsWith(k)) ?? 'autre';
  return {
    id: row.id,
    nom: row.name,
    type: type as 'solidaire' | 'humanitaire' | 'ecologie' | 'sante' | 'education' | 'culture' | 'sport' | 'autre',
    but: row.description ?? '',
    tonImpact: row.tonImpact ?? '',
    imageUrl: row.logoUrl ?? undefined,
    status: (row.status === 'draft' ? 'draft' : 'active') as 'draft' | 'active',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const listDonationCategories = async (params: ListParams) => {
  const { where, orderBy, skip, take } = buildListQuery({}, params, { softDelete: true });
  const total = await prisma.donationCategory.count({ where });
  const categories = await prisma.donationCategory.findMany({
    where,
    orderBy,
    skip,
    take
  });
  return { data: categories, meta: buildListMeta(total, params) };
};

/** Mapping catégorie -> icon/accent/tint pour l'app mobile */
const CATEGORY_APP_META: Record<string, { icon: string; accent: string; tint: string }> = {
  Humanitaire: { icon: 'heart-outline', accent: '#E11D48', tint: 'rgba(225,29,72,0.12)' },
  Solidaire: { icon: 'people-outline', accent: '#A445FF', tint: 'rgba(164,69,255,0.12)' },
  Santé: { icon: 'medkit-outline', accent: '#2DD881', tint: 'rgba(45,216,129,0.12)' },
  Écologie: { icon: 'leaf-outline', accent: '#12C2E9', tint: 'rgba(18,194,233,0.12)' },
  Éducation: { icon: 'school-outline', accent: '#F59E0B', tint: 'rgba(245,158,11,0.12)' },
  Culture: { icon: 'musical-notes-outline', accent: '#8B5CF6', tint: 'rgba(139,92,246,0.12)' },
  Sport: { icon: 'fitness-outline', accent: '#10B981', tint: 'rgba(16,185,129,0.12)' },
  Autre: { icon: 'ellipse-outline', accent: '#64748B', tint: 'rgba(100,116,139,0.12)' },
};

/** Format association pour l'app mobile (DonationAssociation) */
function toAppAssociationFormat(row: {
  id: string;
  name: string;
  description: string | null;
  tonImpact: string | null;
  logoUrl: string | null;
  department: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    needs: row.description ?? '',
    location: '',
    department: (row.department as 'Martinique' | 'Guadeloupe' | 'Guyane') || 'Martinique',
    impact: row.tonImpact ?? '',
    imageUrl: row.logoUrl ?? undefined,
  };
}

/** Catégories avec associations pour l'app mobile (format attendu par DonationsScreen) */
export const listDonationCategoriesWithAssociations = async () => {
  const categories = await prisma.donationCategory.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    include: {
      associations: {
        where: { status: 'active', deletedAt: null },
        orderBy: { name: 'asc' },
      },
    },
  });
  const data = categories
    .filter((c) => c.associations.length > 0)
    .map((c) => {
      const meta = CATEGORY_APP_META[c.name] ?? CATEGORY_APP_META.Autre;
      return {
        id: c.id,
        title: c.name,
        icon: meta.icon,
        accent: meta.accent,
        tint: meta.tint,
        associations: c.associations.map(toAppAssociationFormat),
      };
    });
  return { data };
};

export const listAssociations = async (
  params: { categoryId?: string; department?: string },
  listParams: ListParams
) => {
  const baseWhere = {
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.department ? { department: params.department } : {})
  };
  const { where, orderBy, skip, take } = buildListQuery(baseWhere, listParams, { softDelete: true });
  const total = await prisma.donationAssociation.count({ where });
  const associations = await prisma.donationAssociation.findMany({
    where,
    include: {
      category: { select: { id: true, name: true } }
    },
    orderBy,
    skip,
    take
  });
  const data = associations.map(toAdminAssociationFormat);
  return { data, meta: buildListMeta(total, listParams) };
};

export const getAssociationById = async (id: string) => {
  const association = await prisma.donationAssociation.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      spotlights: true
    }
  });

  if (!association) {
    throw new AppError('Association introuvable', 404);
  }

  return toAdminAssociationFormat(association);
};

/** Trouve ou crée une catégorie à partir du type admin (ex: humanitaire -> Humanitaire) */
async function getOrCreateCategoryByType(type: string): Promise<string> {
  const name = ASSOCIATION_TYPE_MAP[type] ?? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  let category = await prisma.donationCategory.findFirst({
    where: { name },
    select: { id: true },
  });
  if (!category) {
    category = await prisma.donationCategory.create({
      data: { name },
      select: { id: true },
    });
  }
  return category.id;
}

export const createAssociation = async (payload: {
  nom: string;
  type: string;
  but: string;
  tonImpact: string;
  logoUrl?: string;
  status: string;
}) => {
  const categoryId = await getOrCreateCategoryByType(payload.type);
  const row = await prisma.donationAssociation.create({
    data: {
      name: payload.nom,
      description: payload.but || null,
      tonImpact: payload.tonImpact || null,
      logoUrl: payload.logoUrl ?? null,
      categoryId,
      status: payload.status || 'active',
    },
    include: { category: { select: { name: true } } },
  });
  return toAdminAssociationFormat(row);
};

export const updateAssociation = async (
  id: string,
  payload: Partial<{
    nom: string;
    type: string;
    but: string;
    tonImpact: string;
    logoUrl: string;
    status: string;
  }>
) => {
  const existing = await prisma.donationAssociation.findUnique({ where: { id }, include: { category: { select: { name: true } } } });
  if (!existing) throw new AppError('Association introuvable', 404);

  const data: Parameters<typeof prisma.donationAssociation.update>[0]['data'] = {};
  if (payload.nom !== undefined) data.name = payload.nom;
  if (payload.but !== undefined) data.description = payload.but;
  if (payload.tonImpact !== undefined) data.tonImpact = payload.tonImpact;
  if (payload.logoUrl !== undefined) data.logoUrl = payload.logoUrl;
  if (payload.status !== undefined) data.status = payload.status;
  if (payload.type !== undefined) data.categoryId = await getOrCreateCategoryByType(payload.type);

  const row = await prisma.donationAssociation.update({
    where: { id },
    data,
    include: { category: { select: { name: true } } },
  });
  return toAdminAssociationFormat(row);
};

export const deleteAssociation = async (id: string) => {
  const existing = await prisma.donationAssociation.findUnique({ where: { id } });
  if (!existing) throw new AppError('Association introuvable', 404);
  await prisma.donationAssociation.delete({ where: { id } });
};


