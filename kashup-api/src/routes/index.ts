import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import partnerRoutes from './partner.routes';
import transactionRoutes from './transaction.routes';
import statsRoutes from './stats.routes';
import rewardRoutes from './reward.routes';
import giftCardRoutes from './giftCard.routes';
import offersRoutes from './offers.routes';
import donationRoutes from './donation.routes';
import contentRoutes from './content.routes';
import homeBannerRoutes from './homeBanner.routes';
import notificationRoutes from './notification.routes';
import powensRoutes from './powens.routes';
import powensIntegrationRoutes from './powensIntegration.routes';
import drimifyRoutes from './drimify.routes';
import webhookRoutes from './webhook.routes';
import adminRoutes from './admin.routes';
import monitoringRoutes from './monitoring.routes';
import syncRoutes from './sync.routes';
import debugRoutes from './debug.routes';
import badgesRoutes from './badges.routes';
import lotteriesRoutes from './lotteries.routes';
import boxupsRoutes from './boxups.routes';
import carteupsRoutes from './carteups.routes';
import blobRoutes from './blob.routes';

const router = Router();

// Routes système
router.use('/debug', debugRoutes);

// Routes authentification
router.use('/auth', authRoutes);

// Routes utilisateur
router.use('/me', userRoutes);
router.use('/me/notifications', notificationRoutes);

// Routes ressources normalisées sous /api/v1 (convention REST stricte)
router.use('/partners', partnerRoutes);
router.use('/gift-cards', giftCardRoutes); // vouchers = gift-cards
router.use('/badges', badgesRoutes);
router.use('/lotteries', lotteriesRoutes);
router.use('/boxups', boxupsRoutes);
router.use('/carteups', carteupsRoutes);
router.use('/', blobRoutes); // GET /blob?url=... (proxy images Blob privé)

// Routes autres ressources
router.use('/offers', offersRoutes);
router.use('/donations', donationRoutes);
router.use('/content', contentRoutes);
router.use('/home-banners', homeBannerRoutes);
router.use('/powens', powensRoutes);
router.use('/integrations/powens', powensIntegrationRoutes);
router.use('/drimify', drimifyRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/admin', adminRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/transactions', transactionRoutes);
router.use('/stats', statsRoutes);
router.use('/rewards', rewardRoutes);

export default router;


