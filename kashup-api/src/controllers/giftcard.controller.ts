import { Request, Response } from 'express';
import {
  getGiftBoxById,
  listGiftBoxes,
  listGiftCardCatalog,
  listGiftCardOffersForApp,
  listPredefinedGiftOffers,
  listUserGiftCards,
  purchaseGiftCard,
  listGiftCardOrders,
  getGiftCardConfig,
  updateGiftCardConfig,
  getBoxUpConfig,
  createOrUpdateBoxUpConfig,
  exportGiftCardOrdersToCSV,
  mapGiftBoxToBoxUp,
  createGiftBoxAdmin,
  updateGiftBoxAdmin,
  deleteGiftBoxAdmin,
  listGiftCardAmounts,
  createGiftCardAmount,
  deleteGiftCardAmountById,
  listCartesUpLibres,
  listCartesUpLibresForApp,
  getCarteUpLibreById,
  createCarteUpLibreConfig,
  updateCarteUpLibreConfig,
  deleteCarteUpLibreConfig,
  listCartesUpPredefinies,
  getCarteUpPredefinieById,
  createCarteUpPredefinie,
  updateCarteUpPredefinie,
  deleteCarteUpPredefinie,
} from '../services/giftCard.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { extractFiles, processUploadedFile } from '../services/upload.service';
import { parseListParams } from '../utils/listing';
import { toStringParam } from '../utils/queryParams';

export const getGiftCardCatalog = asyncHandler(async (_req: Request, res: Response) => {
  const params = parseListParams(_req.query);
  const result = await listGiftCardCatalog(params);
  const items = Array.isArray(result.data) ? result.data : [];
  const meta = result.meta;

  return res.status(200).json({
    statusCode: 200,
    success: true,
    message: 'Opération réussie',
    data: items,
    ...(meta && { meta: { pagination: meta } })
  });
});

export const getGiftCardOffers = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listGiftCardOffersForApp();
  sendSuccess(res, data);
});

/** Map GiftBox (Prisma) vers format BoxUp aligné back office (nom, partenaires avec offrePartenaire, conditions) */
function mapBoxToBoxUpFormat(box: {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  cashbackInfo: string | null;
  value: number;
  active: boolean;
  items: Array<{
    partnerId: string | null;
    title: string;
    description: string | null;
    partner: { id: string; name: string; logoUrl: string | null } | null;
  }>;
}) {
  return {
    id: box.id,
    nom: box.name,
    description: box.description,
    imageUrl: box.imageUrl ?? undefined,
    value: box.value,
    commentCaMarche: box.cashbackInfo ?? undefined,
    status: box.active ? ('active' as const) : ('inactive' as const),
    partenaires: box.items.map((item) => ({
      partenaireId: item.partnerId ?? item.partner?.id ?? '',
      partenaireName: item.partner?.name,
      offrePartenaire: item.title,
      conditions: item.description ?? undefined,
    })),
    // Champs conservés pour compatibilité affichage app
    title: box.name,
    shortDescription: box.description,
    priceFrom: box.value,
    heroImageUrl: box.imageUrl ?? undefined,
    cashbackInfo: box.cashbackInfo ?? undefined,
    partners: box.items.map((i) => ({
      id: i.partner?.id ?? '',
      name: i.partner?.name ?? '',
      partenaireId: i.partnerId ?? i.partner?.id ?? '',
      partenaireName: i.partner?.name,
      offrePartenaire: i.title,
      conditions: i.description ?? undefined,
      accentColor: undefined as string | undefined,
      category: undefined as string | undefined,
    })),
  };
}

export const getGiftCardBoxes = asyncHandler(async (_req: Request, res: Response) => {
  const params = parseListParams(_req.query);
  const { data, meta } = await listGiftBoxes(params);
  const appData = (Array.isArray(data) ? data : []).map(mapBoxToBoxUpFormat);
  sendSuccess(res, appData, { pagination: meta });
});

export const getGiftCardBoxDetail = asyncHandler(async (req: Request, res: Response) => {
  const box = await getGiftBoxById(req.params.id);
  sendSuccess(res, box);
});

export const getGiftCardsForUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const params = parseListParams(req.query);
  const { data, meta } = await listUserGiftCards(req.user.sub, params);
  sendSuccess(res, data, { pagination: meta });
});

export const purchaseGiftCardHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const purchase = await purchaseGiftCard(req.user.sub, req.body);
  sendSuccess(res, purchase, null, 201);
});

// Contrôleurs admin

export const getGiftCardOrders = asyncHandler(async (_req: Request, res: Response) => {
  const orders = await listGiftCardOrders();
  sendSuccess(res, orders);
});

export const getGiftCardConfigHandler = asyncHandler(async (_req: Request, res: Response) => {
  const config = await getGiftCardConfig();
  sendSuccess(res, config);
});

export const updateGiftCardConfigHandler = asyncHandler(async (req: Request, res: Response) => {
  const files = extractFiles(req);
  const imageUrls: { giftCardImageUrl?: string; giftCardVirtualCardImageUrl?: string } = {};
  
  if (files.fields?.giftCardImage?.[0]) {
    imageUrls.giftCardImageUrl = processUploadedFile(files.fields.giftCardImage[0], 'gift-cards');
  } else if (req.body.giftCardImageUrl) {
    imageUrls.giftCardImageUrl = req.body.giftCardImageUrl;
  }

  if (files.fields?.giftCardVirtualCardImage?.[0]) {
    imageUrls.giftCardVirtualCardImageUrl = processUploadedFile(files.fields.giftCardVirtualCardImage[0], 'gift-cards');
  } else if (req.body.giftCardVirtualCardImageUrl) {
    imageUrls.giftCardVirtualCardImageUrl = req.body.giftCardVirtualCardImageUrl;
  }

  const config = await updateGiftCardConfig(req.body, imageUrls);
  sendSuccess(res, config);
});

export const getBoxUpConfigHandler = asyncHandler(async (_req: Request, res: Response) => {
  const config = await getBoxUpConfig();
  sendSuccess(res, config);
});

export const createOrUpdateBoxUpConfigHandler = asyncHandler(async (req: Request, res: Response) => {
  const imageUrl = req.file ? processUploadedFile(req.file, 'gift-cards') : req.body.boxUpImageUrl;
  
  const config = await createOrUpdateBoxUpConfig(req.body, imageUrl);
  sendSuccess(res, config);
});

export const exportGiftCardOrdersHandler = asyncHandler(async (_req: Request, res: Response) => {
  const csvContent = await exportGiftCardOrdersToCSV();
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="gift-card-orders.csv"');
  res.send(csvContent);
});

// Box-ups admin (format attendu par le back office: nom, partenaires, commentCaMarche, status)
export const getBoxUpsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const params = parseListParams(_req.query);
  const { data, meta } = await listGiftBoxes(params);
  const boxUps = (data as any[]).map(mapGiftBoxToBoxUp);
  sendSuccess(res, boxUps, meta ? { pagination: meta } : undefined);
});

export const getBoxUpByIdHandler = asyncHandler(async (req: Request, res: Response) => {
  const box = await getGiftBoxById(req.params.id);
  sendSuccess(res, mapGiftBoxToBoxUp(box as any));
});

export const createBoxUpHandler = asyncHandler(async (req: Request, res: Response) => {
  const imageUrl = req.file ? processUploadedFile(req.file, 'gift-cards') : undefined;
  const payload = {
    nom: req.body.nom,
    description: req.body.description,
    imageUrl,
    partenaires: req.body.partenaires,
    commentCaMarche: req.body.commentCaMarche,
    status: (req.body.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
  };
  if (!payload.nom || !payload.description) {
    throw new AppError('Le nom et la description sont obligatoires', 400);
  }
  if (!payload.partenaires) {
    throw new AppError('Les partenaires sont obligatoires', 400);
  }
  const boxUp = await createGiftBoxAdmin(payload);
  sendSuccess(res, boxUp, null, 201);
});

export const updateBoxUpHandler = asyncHandler(async (req: Request, res: Response) => {
  const imageUrl = req.file ? processUploadedFile(req.file, 'gift-cards') : req.body.imageUrl;
  const payload: any = {};
  if (req.body.nom !== undefined) payload.nom = req.body.nom;
  if (req.body.description !== undefined) payload.description = req.body.description;
  if (imageUrl !== undefined) payload.imageUrl = imageUrl;
  if (req.body.partenaires !== undefined) payload.partenaires = req.body.partenaires;
  if (req.body.commentCaMarche !== undefined) payload.commentCaMarche = req.body.commentCaMarche;
  if (req.body.status !== undefined) payload.status = req.body.status;
  const boxUp = await updateGiftBoxAdmin(req.params.id, payload);
  sendSuccess(res, boxUp);
});

export const deleteBoxUpHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteGiftBoxAdmin(req.params.id);
  sendSuccess(res, null, null, 204);
});

// Montants de cartes cadeaux (admin – Cartes Up libres)
export const getGiftCardAmountsHandler = asyncHandler(async (_req: Request, res: Response) => {
  const amounts = await listGiftCardAmounts();
  sendSuccess(res, amounts);
});

export const createGiftCardAmountHandler = asyncHandler(async (req: Request, res: Response) => {
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Le montant doit être un nombre positif', 400);
  }
  const created = await createGiftCardAmount(amount);
  sendSuccess(res, created, null, 201);
});

export const deleteGiftCardAmountHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteGiftCardAmountById(req.params.id);
  sendSuccess(res, null, null, 204);
});

// ========== Cartes Sélection UP (config) ==========

export const getCartesUpLibresHandler = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listCartesUpLibres();
  sendSuccess(res, data);
});

/** Pour l'app mobile : configs Carte Sélection UP actives (même format que back office) */
export const getCartesUpLibresForAppHandler = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listCartesUpLibresForApp();
  sendSuccess(res, data);
});

export const getCarteUpLibreByIdHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getCarteUpLibreById(req.params.id);
  sendSuccess(res, data);
});

export const createCarteUpLibreHandler = asyncHandler(async (req: Request, res: Response) => {
  const imageUrl = req.file ? processUploadedFile(req.file, 'gift-cards') : undefined;
  const payload = {
    nom: req.body.nom,
    description: req.body.description,
    imageUrl,
    montantsDisponibles: req.body.montantsDisponibles ?? '[]',
    partenairesEligibles: req.body.partenairesEligibles ?? '[]',
    conditions: req.body.conditions,
    commentCaMarche: req.body.commentCaMarche,
    status: req.body.status === 'inactive' ? 'inactive' : 'active',
  };
  if (!payload.nom || !payload.description) {
    throw new AppError('Le nom et la description sont obligatoires', 400);
  }
  const data = await createCarteUpLibreConfig(payload);
  sendSuccess(res, data, null, 201);
});

export const updateCarteUpLibreHandler = asyncHandler(async (req: Request, res: Response) => {
  const imageUrl = req.file ? processUploadedFile(req.file, 'gift-cards') : undefined;
  const payload: Record<string, unknown> = {};
  if (req.body.nom !== undefined) payload.nom = req.body.nom;
  if (req.body.description !== undefined) payload.description = req.body.description;
  if (imageUrl !== undefined) payload.imageUrl = imageUrl;
  if (req.body.montantsDisponibles !== undefined) payload.montantsDisponibles = req.body.montantsDisponibles;
  if (req.body.partenairesEligibles !== undefined) payload.partenairesEligibles = req.body.partenairesEligibles;
  if (req.body.conditions !== undefined) payload.conditions = req.body.conditions;
  if (req.body.commentCaMarche !== undefined) payload.commentCaMarche = req.body.commentCaMarche;
  if (req.body.status !== undefined) payload.status = req.body.status;
  const data = await updateCarteUpLibreConfig(req.params.id, payload as any);
  sendSuccess(res, data);
});

export const deleteCarteUpLibreHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteCarteUpLibreConfig(req.params.id);
  sendSuccess(res, null, null, 204);
});

// ========== Cartes UP (pré-définies) ==========

export const getCartesUpPredefiniesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const data = await listCartesUpPredefinies();
  sendSuccess(res, data);
});

export const getCarteUpPredefinieByIdHandler = asyncHandler(async (req: Request, res: Response) => {
  const data = await getCarteUpPredefinieById(req.params.id);
  sendSuccess(res, data);
});

export const createCarteUpPredefinieHandler = asyncHandler(async (req: Request, res: Response) => {
  const imageUrl = req.file ? processUploadedFile(req.file, 'gift-cards') : undefined;
  const montant = Number(req.body.montant);
  if (!Number.isFinite(montant) || montant <= 0) {
    throw new AppError('Le montant doit être un nombre positif', 400);
  }
  const payload = {
    nom: req.body.nom,
    partenaireId: req.body.partenaireId,
    offre: req.body.offre,
    montant,
    imageUrl,
    description: req.body.description,
    dureeValiditeJours: req.body.dureeValiditeJours ? Number(req.body.dureeValiditeJours) : undefined,
    conditions: req.body.conditions,
    commentCaMarche: req.body.commentCaMarche,
    status: req.body.status === 'inactive' ? 'inactive' : 'active',
  };
  if (!payload.nom || !payload.partenaireId || !payload.description) {
    throw new AppError('Le nom, le partenaire et la description sont obligatoires', 400);
  }
  const data = await createCarteUpPredefinie(payload);
  sendSuccess(res, data, null, 201);
});

export const updateCarteUpPredefinieHandler = asyncHandler(async (req: Request, res: Response) => {
  const imageUrl = req.file ? processUploadedFile(req.file, 'gift-cards') : undefined;
  const payload: Record<string, unknown> = {};
  if (req.body.nom !== undefined) payload.nom = req.body.nom;
  if (req.body.partenaireId !== undefined) payload.partenaireId = req.body.partenaireId;
  if (req.body.offre !== undefined) payload.offre = req.body.offre;
  if (req.body.montant !== undefined) payload.montant = Number(req.body.montant);
  if (imageUrl !== undefined) payload.imageUrl = imageUrl;
  if (req.body.description !== undefined) payload.description = req.body.description;
  if (req.body.dureeValiditeJours !== undefined) payload.dureeValiditeJours = Number(req.body.dureeValiditeJours);
  if (req.body.conditions !== undefined) payload.conditions = req.body.conditions;
  if (req.body.commentCaMarche !== undefined) payload.commentCaMarche = req.body.commentCaMarche;
  if (req.body.status !== undefined) payload.status = req.body.status;
  const data = await updateCarteUpPredefinie(req.params.id, payload as any);
  sendSuccess(res, data);
});

export const deleteCarteUpPredefinieHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteCarteUpPredefinie(req.params.id);
  sendSuccess(res, null, null, 204);
});

 