import prisma from '../config/prisma';
import { AppError } from '../utils/errors';
import type { CreateHomeBannerInput, UpdateHomeBannerInput } from '../schemas/homeBanner.schema';

export const listHomeBannersForApp = async () => {
  const banners = await prisma.homeBanner.findMany({
    where: { active: true },
    orderBy: { position: 'asc' },
  });
  return banners;
};

export const listHomeBannersAdmin = async () => {
  const banners = await prisma.homeBanner.findMany({
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
  });
  return banners;
};

export const getHomeBannerById = async (id: string) => {
  const banner = await prisma.homeBanner.findUnique({ where: { id } });
  if (!banner) {
    throw new AppError('Bannière introuvable', 404, { code: 'HOME_BANNER_NOT_FOUND', id });
  }
  return banner;
};

export const createHomeBanner = async (input: CreateHomeBannerInput & { imageUrl?: string; videoUrl?: string }) => {
  const banner = await prisma.homeBanner.create({
    data: {
      title: input.title ?? null,
      mediaType: input.mediaType ?? 'image',
      imageUrl: input.imageUrl ?? null,
      videoUrl: input.videoUrl ?? null,
      linkUrl: input.linkUrl ?? null,
      position: input.position ?? 0,
      active: input.active ?? true,
    },
  });
  return banner;
};

export const updateHomeBanner = async (id: string, input: UpdateHomeBannerInput & { imageUrl?: string; videoUrl?: string }) => {
  await getHomeBannerById(id);
  const banner = await prisma.homeBanner.update({
    where: { id },
    data: {
      ...(input.title !== undefined && { title: input.title || null }),
      ...(input.mediaType !== undefined && { mediaType: input.mediaType }),
      ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl || null }),
      ...(input.videoUrl !== undefined && { videoUrl: input.videoUrl || null }),
      ...(input.linkUrl !== undefined && { linkUrl: input.linkUrl || null }),
      ...(input.position !== undefined && { position: input.position }),
      ...(input.active !== undefined && { active: input.active }),
    },
  });
  return banner;
};

export const deleteHomeBanner = async (id: string) => {
  await getHomeBannerById(id);
  await prisma.homeBanner.delete({ where: { id } });
  return { deleted: true, id };
}
