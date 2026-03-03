import path from 'path';
import { Request, Response } from 'express';
import {
  listHomeBannersForApp,
  listHomeBannersAdmin,
  getHomeBannerById,
  createHomeBanner,
  updateHomeBanner,
  deleteHomeBanner,
} from '../services/homeBanner.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { getFileUrl } from '../config/upload';
import { createHomeBannerSchema, updateHomeBannerSchema } from '../schemas/homeBanner.schema';
import { buildAbsoluteUrl } from '../utils/network';

/** Transforme les chemins relatifs imageUrl/videoUrl en URLs absolues pour affichage back office et app */
function withAbsoluteMediaUrls<T extends { imageUrl?: string | null; videoUrl?: string | null }>(req: Request, banner: T): T {
  return {
    ...banner,
    imageUrl: banner.imageUrl && !banner.imageUrl.startsWith('http')
      ? buildAbsoluteUrl(req, banner.imageUrl)
      : banner.imageUrl,
    videoUrl: banner.videoUrl && !banner.videoUrl.startsWith('http')
      ? buildAbsoluteUrl(req, banner.videoUrl)
      : banner.videoUrl,
  };
}

/** GET /home-banners — liste publique pour l'app (actives uniquement, tri par position) */
export const getHomeBanners = asyncHandler(async (req: Request, res: Response) => {
  const banners = await listHomeBannersForApp();
  const withUrls = banners.map((b) => withAbsoluteMediaUrls(req, b));
  sendSuccess(res, withUrls);
});

/** GET /home-banners/admin — liste complète pour le back office */
export const getHomeBannersAdmin = asyncHandler(async (req: Request, res: Response) => {
  const banners = await listHomeBannersAdmin();
  const withUrls = banners.map((b) => withAbsoluteMediaUrls(req, b));
  sendSuccess(res, withUrls);
});

/** GET /home-banners/:id — détail (admin) */
export const getHomeBanner = asyncHandler(async (req: Request, res: Response) => {
  const banner = await getHomeBannerById(req.params.id);
  sendSuccess(res, withAbsoluteMediaUrls(req, banner));
});

/** Construit l'URL d'image à partir du fichier réel (aligné avec l'emplacement Multer) */
function getImageUrlFromFile(file: Express.Multer.File): string {
  const relativePath = path.relative(process.cwd(), file.path);
  return getFileUrl(relativePath);
}

/** Récupère le fichier image ou vidéo depuis req.files (upload .fields()) */
function getFileFromFields(req: Request, field: 'image' | 'video'): Express.Multer.File | undefined {
  const files = req.files as { image?: Express.Multer.File[]; video?: Express.Multer.File[] } | undefined;
  const arr = files?.[field];
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : undefined;
}

/** POST /home-banners — création (admin, upload image et/ou vidéo par fichier) */
export const createHomeBannerHandler = asyncHandler(async (req: Request, res: Response) => {
  const imageFile = getFileFromFields(req, 'image');
  const videoFile = getFileFromFields(req, 'video');
  const imageUrlFromFile = imageFile ? getImageUrlFromFile(imageFile) : undefined;
  const imageUrlFromBody = typeof req.body.imageUrl === 'string' && req.body.imageUrl.trim() ? req.body.imageUrl.trim() : undefined;
  const imageUrl = imageUrlFromFile ?? imageUrlFromBody;
  const videoUrlFromFile = videoFile ? getImageUrlFromFile(videoFile) : undefined;

  const payload = createHomeBannerSchema.parse({
    title: req.body.title,
    mediaType: req.body.mediaType ?? 'image',
    imageUrl: imageUrl || undefined,
    videoUrl: videoUrlFromFile || undefined,
    linkUrl: req.body.linkUrl,
    position: req.body.position ?? 0,
    active: req.body.active !== undefined ? req.body.active !== false && req.body.active !== 'false' : true,
  });

  const banner = await createHomeBanner({
    ...payload,
    imageUrl: imageUrl ?? payload.imageUrl ?? undefined,
    videoUrl: videoUrlFromFile ?? payload.videoUrl ?? undefined,
  });
  sendSuccess(res, withAbsoluteMediaUrls(req, banner), null, 201);
});

/** PATCH /home-banners/:id — mise à jour (admin, upload image et/ou vidéo par fichier) */
export const updateHomeBannerHandler = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const imageFile = getFileFromFields(req, 'image');
  const videoFile = getFileFromFields(req, 'video');
  const imageUrl = imageFile ? getImageUrlFromFile(imageFile) : undefined;
  const videoUrl = videoFile ? getImageUrlFromFile(videoFile) : undefined;
  const body = {
    ...(req.body.title !== undefined && { title: req.body.title }),
    ...(req.body.mediaType !== undefined && { mediaType: req.body.mediaType }),
    ...(imageUrl !== undefined && { imageUrl }),
    ...(req.body.imageUrl !== undefined && !imageFile && { imageUrl: req.body.imageUrl }),
    ...(videoUrl !== undefined && { videoUrl }),
    ...(req.body.videoUrl !== undefined && !videoFile && { videoUrl: req.body.videoUrl }),
    ...(req.body.linkUrl !== undefined && { linkUrl: req.body.linkUrl }),
    ...(req.body.position !== undefined && { position: Number(req.body.position) }),
    ...(req.body.active !== undefined && { active: req.body.active !== false && req.body.active !== 'false' }),
  };
  const payload = updateHomeBannerSchema.partial().parse(body);
  const banner = await updateHomeBanner(id, {
    ...payload,
    ...(imageUrl !== undefined && { imageUrl }),
    ...(videoUrl !== undefined && { videoUrl }),
  });
  sendSuccess(res, withAbsoluteMediaUrls(req, banner));
});

/** DELETE /home-banners/:id — suppression (admin) */
export const deleteHomeBannerHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteHomeBanner(req.params.id);
  sendSuccess(res, null, null, 204);
});
