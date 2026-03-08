import { Request, Response } from 'express';
import {
  getAssociationById,
  listAssociations,
  listDonationCategories,
  listDonationCategoriesWithAssociations,
  createAssociation,
  updateAssociation,
  deleteAssociation,
} from '../services/donation.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { parseListParams } from '../utils/listing';
import { processUploadedFile } from '../services/upload.service';
import { AppError } from '../utils/errors';

export const getDonationCategories = asyncHandler(async (_req: Request, res: Response) => {
  const params = parseListParams(_req.query);
  const result = await listDonationCategories(params);
  sendSuccess(res, result.data, { pagination: result.meta });
});

/** Pour l'app mobile : catégories avec associations imbriquées (format attendu par DonationsScreen) */
export const getDonationCategoriesWithAssociations = asyncHandler(async (_req: Request, res: Response) => {
  const { data } = await listDonationCategoriesWithAssociations();
  sendSuccess(res, data);
});

export const getAssociations = asyncHandler(async (req: Request, res: Response) => {
  const listParams = parseListParams(req.query);
  const result = await listAssociations(
    {
      categoryId: req.query.categoryId as string | undefined,
      department: req.query.department as string | undefined
    },
    listParams
  );
  sendSuccess(res, result.data, { pagination: result.meta });
});

export const getAssociation = asyncHandler(async (req: Request, res: Response) => {
  const association = await getAssociationById(req.params.id);
  sendSuccess(res, association);
});

export const createAssociationHandler = asyncHandler(async (req: Request, res: Response) => {
  const imageUrl = req.file ? await processUploadedFile(req.file, 'donations') : undefined;
  const payload = {
    nom: req.body.nom,
    type: req.body.type || 'autre',
    but: req.body.but || '',
    tonImpact: req.body.tonImpact || '',
    logoUrl: imageUrl,
    status: req.body.status === 'draft' ? 'draft' : 'active',
  };
  if (!payload.nom) {
    throw new AppError('Le nom est obligatoire', 400);
  }
  const association = await createAssociation(payload);
  sendSuccess(res, association, null, 201);
});

export const updateAssociationHandler = asyncHandler(async (req: Request, res: Response) => {
  const imageUrl = req.file ? await processUploadedFile(req.file, 'donations') : undefined;
  const payload: Record<string, unknown> = {};
  if (req.body.nom !== undefined) payload.nom = req.body.nom;
  if (req.body.type !== undefined) payload.type = req.body.type;
  if (req.body.but !== undefined) payload.but = req.body.but;
  if (req.body.tonImpact !== undefined) payload.tonImpact = req.body.tonImpact;
  if (req.body.status !== undefined) payload.status = req.body.status;
  if (imageUrl !== undefined) payload.logoUrl = imageUrl;
  const association = await updateAssociation(req.params.id, payload as any);
  sendSuccess(res, association);
});

export const deleteAssociationHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteAssociation(req.params.id);
  sendSuccess(res, null, null, 204);
});


