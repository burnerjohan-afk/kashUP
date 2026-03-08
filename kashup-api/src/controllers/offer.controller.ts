import { Request, Response } from 'express';
import { createOffer, listCurrentOffers, listOffers, updateOffer, useOffer } from '../services/offer.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { processUploadedFile } from '../services/upload.service';
import { offerFormSchema } from '../schemas/offer.schema';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import { parseListParams } from '../utils/listing';

const STATUS_VALUES = ['all', 'active', 'scheduled', 'expired'] as const;

export const getCurrentOffers = asyncHandler(async (req: Request, res: Response) => {
  const listParams = parseListParams(req.query);
  const result = await listCurrentOffers(listParams);
  sendSuccess(res, result.data, { pagination: result.meta });
});

/** Liste toutes les offres (back office) avec filtre optionnel par statut. */
export const getOffers = asyncHandler(async (req: Request, res: Response) => {
  const listParams = parseListParams(req.query);
  const status = (req.query.status as string)?.toLowerCase();
  const statusFilter = STATUS_VALUES.includes(status as typeof STATUS_VALUES[number])
    ? (status as typeof STATUS_VALUES[number])
    : 'all';
  const result = await listOffers(listParams, statusFilter);
  sendSuccess(res, result.data, { pagination: result.meta });
});

export const createOfferHandler = asyncHandler(async (req: Request, res: Response) => {
  logger.info('🚀 createOfferHandler appelé');
  logger.info({
    body: req.body,
    bodyKeys: Object.keys(req.body || {}),
    hasFile: !!req.file
  }, '📥 Données reçues pour création d\'offre');

  try {
    // Traiter les fichiers uploadés
    const imageUrl = req.file ? await processUploadedFile(req.file, 'offers') : req.body.imageUrl;

    // Parser les numériques (FormData envoie tout en string)
    const parseNum = (v: unknown, def: number): number => {
      if (v === undefined || v === null || v === '') return def;
      const n = typeof v === 'string' ? parseFloat(v) : Number(v);
      return Number.isFinite(n) ? n : def;
    };
    const parseStock = (v: unknown): number => {
      const n = parseNum(v, 1);
      return n > 0 ? n : 1;
    };

    // Convertir les types depuis multipart/form-data
    const processedData = {
      ...req.body,
      partnerId: req.body.partnerId,
      title: req.body.title,
      price: req.body.price !== undefined && req.body.price !== ''
        ? (typeof req.body.price === 'string' ? parseFloat(req.body.price) : req.body.price)
        : undefined,
      cashbackRate: parseNum(req.body.cashbackRate, 0),
      startAt: req.body.startAt,
      endAt: req.body.endAt,
      stock: parseStock(req.body.stock),
      imageUrl: imageUrl || req.body.imageUrl || undefined,
      conditions: req.body.conditions && req.body.conditions !== '' ? req.body.conditions : undefined,
      status: req.body.status || undefined
    };

    // Nettoyer les champs vides (sauf numériques déjà normalisés)
    Object.keys(processedData).forEach(key => {
      if (key === 'stock' || key === 'cashbackRate') return;
      if (processedData[key] === '' || processedData[key] === null) {
        processedData[key] = undefined;
      }
    });

    logger.info({ processedData }, '📋 Données traitées après conversion');

    // Valider après conversion
    const validationResult = offerFormSchema.safeParse(processedData);
    if (!validationResult.success) {
      logger.error({
        errors: validationResult.error.flatten(),
        processedData
      }, '❌ Erreur de validation');
      
      throw new AppError('Données invalides', 422, {
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten()
      });
    }

    logger.info('✅ Validation réussie, création de l\'offre');
    const offer = await createOffer(validationResult.data, imageUrl);
    logger.info({ offerId: offer.id }, '✅ Offre créée avec succès');
    
    sendSuccess(res, offer, null, 201);
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.constructor.name : typeof error,
      body: req.body
    }, '❌ Erreur lors de la création de l\'offre');

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      error instanceof Error ? error.message : 'Erreur lors de la création de l\'offre',
      500,
      {
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV !== 'production' && {
          stack: error instanceof Error ? error.stack : undefined,
          originalError: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.constructor.name : typeof error
        })
      }
    );
  }
});

export const updateOfferHandler = asyncHandler(async (req: Request, res: Response) => {
  logger.info('🚀 updateOfferHandler appelé');
  logger.info({
    body: req.body,
    bodyKeys: Object.keys(req.body || {}),
    hasFile: !!req.file,
    offerId: req.params.id
  }, '📥 Données reçues pour mise à jour d\'offre');

  try {
    // Traiter les fichiers uploadés
    const imageUrl = req.file ? await processUploadedFile(req.file, 'offers') : req.body.imageUrl;

    // Convertir les types depuis multipart/form-data
    const processedData: any = {};
    
    if (req.body.partnerId !== undefined) processedData.partnerId = req.body.partnerId;
    if (req.body.title !== undefined) processedData.title = req.body.title;
    
    if (req.body.price !== undefined && req.body.price !== '') {
      processedData.price = typeof req.body.price === 'string' ? parseFloat(req.body.price) : req.body.price;
    }
    
    if (req.body.cashbackRate !== undefined && req.body.cashbackRate !== '') {
      processedData.cashbackRate = typeof req.body.cashbackRate === 'string' 
        ? parseFloat(req.body.cashbackRate) 
        : req.body.cashbackRate;
    }
    
    if (req.body.startAt !== undefined) processedData.startAt = req.body.startAt;
    if (req.body.endAt !== undefined) processedData.endAt = req.body.endAt;
    
    if (req.body.stock !== undefined && req.body.stock !== '') {
      processedData.stock = typeof req.body.stock === 'string' 
        ? parseInt(req.body.stock, 10) 
        : req.body.stock;
    }
    
    if (imageUrl || req.body.imageUrl) {
      processedData.imageUrl = imageUrl || req.body.imageUrl;
    }
    
    if (req.body.conditions !== undefined && req.body.conditions !== '') {
      processedData.conditions = req.body.conditions;
    }
    
    if (req.body.status !== undefined) processedData.status = req.body.status;

    logger.info({ processedData }, '📋 Données traitées après conversion pour mise à jour');

    // Valider après conversion
    const validationResult = offerFormSchema.partial().safeParse(processedData);
    if (!validationResult.success) {
      logger.error({
        errors: validationResult.error.flatten(),
        processedData
      }, '❌ Erreur de validation pour mise à jour');
      
      throw new AppError('Données invalides', 422, {
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten()
      });
    }

    logger.info('✅ Validation réussie, mise à jour de l\'offre');
    const offer = await updateOffer(req.params.id, validationResult.data, imageUrl);
    logger.info({ offerId: offer.id }, '✅ Offre mise à jour avec succès');
    
    sendSuccess(res, offer);
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.constructor.name : typeof error,
      body: req.body,
      offerId: req.params.id
    }, '❌ Erreur lors de la mise à jour de l\'offre');

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      error instanceof Error ? error.message : 'Erreur lors de la mise à jour de l\'offre',
      500,
      {
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV !== 'production' && {
          stack: error instanceof Error ? error.stack : undefined,
          originalError: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.constructor.name : typeof error
        })
      }
    );
  }
});

/** Enregistre qu'un utilisateur a validé / utilisé une offre (décrémente le stock restant). */
export const useOfferHandler = asyncHandler(async (req: Request, res: Response) => {
  const offer = await useOffer(req.params.id);
  sendSuccess(res, offer);
});


