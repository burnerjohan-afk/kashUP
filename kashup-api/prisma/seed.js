import { GiftCardType, LotteryStatus, Prisma, PrismaClient, Territory, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
const hashPassword = (password) => bcrypt.hash(password, 10);
async function seed() {
    const categoryNames = ['Supermarché', 'Loisirs', 'Restauration', 'Shopping', 'Services', 'Hébergement'];
    const categories = await Promise.all(categoryNames.map((name) => prisma.partnerCategory.upsert({
        where: { name },
        update: {},
        create: { name }
    })));
    const categoryMap = new Map(categories.map((category) => [category.name, category.id]));
    const partnersData = [
        {
            name: 'Carrefour Dillon',
            territory: Territory.MARTINIQUE,
            categoryName: 'Supermarché',
            logoUrl: 'https://cdn.kashup.dev/logos/carrefour.png',
            address: 'Centre commercial Dillon, Fort-de-France',
            latitude: 14.6167,
            longitude: -61.0588,
            tauxCashbackStandard: 5,
            tauxCashbackBooste: 10,
            websiteUrl: 'https://www.carrefour.fr'
        },
        {
            name: 'Hitbox Guadeloupe',
            territory: Territory.GUADELOUPE,
            categoryName: 'Loisirs',
            logoUrl: 'https://cdn.kashup.dev/logos/hitbox.png',
            address: 'Pointe-à-Pitre',
            latitude: 16.2411,
            longitude: -61.5340,
            tauxCashbackStandard: 6,
            tauxCashbackBooste: 12,
            websiteUrl: 'https://hitbox-glp.example.com'
        },
        {
            name: 'Hôtel & Restaurant des Palmistes',
            territory: Territory.GUYANE,
            categoryName: 'Hébergement',
            logoUrl: 'https://cdn.kashup.dev/logos/palmistes.png',
            address: '12 Rue de la Liberté, Cayenne',
            latitude: 4.9371,
            longitude: -52.3266,
            tauxCashbackStandard: 7,
            tauxCashbackBooste: 14,
            websiteUrl: 'https://palmistes-guyane.example.com'
        },
        {
            name: 'Hôtel & Restaurant Les Amandiers',
            territory: Territory.MARTINIQUE,
            categoryName: 'Hébergement',
            logoUrl: 'https://cdn.kashup.dev/logos/amandiers.png',
            address: 'Rue du Bord de Mer, Sainte-Luce',
            latitude: 14.456,
            longitude: -60.939,
            tauxCashbackStandard: 6,
            tauxCashbackBooste: 12,
            websiteUrl: 'https://amandiers-mq.example.com'
        },
        {
            name: 'Cinéma Madiana',
            territory: Territory.MARTINIQUE,
            categoryName: 'Loisirs',
            logoUrl: 'https://cdn.kashup.dev/logos/cinema.png',
            address: 'Route de Madiana, Schoelcher',
            latitude: 14.6404,
            longitude: -61.0925,
            tauxCashbackStandard: 4,
            tauxCashbackBooste: 9,
            websiteUrl: 'https://madiana.com'
        },
        {
            name: 'Karting 971',
            territory: Territory.GUADELOUPE,
            categoryName: 'Loisirs',
            logoUrl: 'https://cdn.kashup.dev/logos/karting.png',
            address: 'Les Abymes',
            latitude: 16.270,
            longitude: -61.504,
            tauxCashbackStandard: 5,
            tauxCashbackBooste: 11,
            websiteUrl: 'https://karting971.example.com'
        },
        {
            name: 'SECURIDOM',
            territory: Territory.MARTINIQUE,
            categoryName: 'Services',
            logoUrl: 'https://cdn.kashup.dev/logos/securidom.png',
            address: 'Fort-de-France',
            latitude: 14.6167,
            longitude: -61.0588,
            tauxCashbackStandard: 3,
            tauxCashbackBooste: 6,
            websiteUrl: 'https://securidom.fr'
        },
        {
            name: 'GRAHD',
            territory: Territory.GUYANE,
            categoryName: 'Services',
            logoUrl: 'https://cdn.kashup.dev/logos/grahd.png',
            address: 'Cayenne',
            latitude: 4.922,
            longitude: -52.326,
            tauxCashbackStandard: 4,
            tauxCashbackBooste: 8,
            websiteUrl: 'https://grahd-guyane.example.com'
        },
        {
            name: 'Le Vibes',
            territory: Territory.GUADELOUPE,
            categoryName: 'Restauration',
            logoUrl: 'https://cdn.kashup.dev/logos/levibes.png',
            address: 'Bouillante',
            latitude: 16.125,
            longitude: -61.767,
            tauxCashbackStandard: 5,
            tauxCashbackBooste: 11,
            websiteUrl: 'https://levibes-glp.example.com'
        }
    ];
    for (const partner of partnersData) {
        await prisma.partner.upsert({
            where: { name: partner.name },
            update: {
                logoUrl: partner.logoUrl,
                territory: partner.territory,
                address: partner.address,
                latitude: partner.latitude,
                longitude: partner.longitude,
                websiteUrl: partner.websiteUrl,
                tauxCashbackStandard: new Prisma.Decimal(partner.tauxCashbackStandard),
                tauxCashbackBooste: new Prisma.Decimal(partner.tauxCashbackBooste),
                category: {
                    connect: { id: categoryMap.get(partner.categoryName) }
                }
            },
            create: {
                name: partner.name,
                logoUrl: partner.logoUrl,
                territory: partner.territory,
                address: partner.address,
                latitude: partner.latitude,
                longitude: partner.longitude,
                websiteUrl: partner.websiteUrl,
                tauxCashbackStandard: new Prisma.Decimal(partner.tauxCashbackStandard),
                tauxCashbackBooste: new Prisma.Decimal(partner.tauxCashbackBooste),
                category: {
                    connect: { id: categoryMap.get(partner.categoryName) }
                }
            }
        });
    }
    const usersData = [
        {
            email: 'admin@kashup.com',
            firstName: 'Léa',
            lastName: 'Admin',
            phone: '0696123456',
            role: UserRole.admin,
            territory: Territory.MARTINIQUE,
            password: 'Kashup123!',
            wallet: { cashback: 150, points: 1200, impact: 320 }
        },
        {
            email: 'martinique.user@kashup.com',
            firstName: 'Noah',
            lastName: 'Dupont',
            phone: '0696022334',
            role: UserRole.user,
            territory: Territory.MARTINIQUE,
            password: 'Kashup123!',
            wallet: { cashback: 80, points: 500, impact: 140 }
        },
        {
            email: 'guadeloupe.user@kashup.com',
            firstName: 'Maëlys',
            lastName: 'Riviere',
            phone: '0690032145',
            role: UserRole.user,
            territory: Territory.GUADELOUPE,
            password: 'Kashup123!',
            wallet: { cashback: 65, points: 420, impact: 100 }
        },
        {
            email: 'guyane.user@kashup.com',
            firstName: 'Ethan',
            lastName: 'Caribou',
            phone: '0694067890',
            role: UserRole.cse,
            territory: Territory.GUYANE,
            password: 'Kashup123!',
            wallet: { cashback: 95, points: 640, impact: 210 }
        }
    ];
    for (const userData of usersData) {
        const password = await hashPassword(userData.password);
        const user = await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                phone: userData.phone,
                role: userData.role,
                territory: userData.territory,
                password,
                wallet: {
                    create: {}
                }
            }
        });
        await prisma.wallet.upsert({
            where: { userId: user.id },
            update: {
                soldeCashback: new Prisma.Decimal(userData.wallet.cashback),
                soldePoints: userData.wallet.points,
                totalImpactLocal: new Prisma.Decimal(userData.wallet.impact)
            },
            create: {
                userId: user.id,
                soldeCashback: new Prisma.Decimal(userData.wallet.cashback),
                soldePoints: userData.wallet.points,
                totalImpactLocal: new Prisma.Decimal(userData.wallet.impact)
            }
        });
    }
    const boostsData = [
        {
            name: 'Boost Resto +5%',
            description: 'Bonus de cashback sur toutes les dépenses restauration.',
            categoryName: 'Restauration',
            bonusCashback: 5,
            costInPoints: 250,
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 2))
        },
        {
            name: 'Shopping Week-end',
            description: 'Boost limité pour dynamiser les achats shopping.',
            categoryName: 'Shopping',
            bonusCashback: 3,
            costInPoints: 180,
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
        }
    ];
    for (const boost of boostsData) {
        await prisma.boost.upsert({
            where: { name: boost.name },
            update: {},
            create: {
                name: boost.name,
                description: boost.description,
                bonusCashback: new Prisma.Decimal(boost.bonusCashback),
                costInPoints: boost.costInPoints,
                startDate: boost.startDate,
                endDate: boost.endDate,
                active: true,
                targetCategory: {
                    connect: { id: categoryMap.get(boost.categoryName) }
                }
            }
        });
    }
    const badgesData = [
        {
            name: 'Ambassadeur Local',
            description: '50 achats réalisés dans des commerces locaux.',
            condition: '50 transactions validées',
            iconUrl: 'https://cdn.kashup.dev/badges/ambassadeur.png'
        },
        {
            name: 'Explorateur DOM',
            description: 'Achats effectués dans les 3 territoires DOM.',
            condition: '1 transaction par territoire',
            iconUrl: 'https://cdn.kashup.dev/badges/explorateur.png'
        }
    ];
    for (const badge of badgesData) {
        await prisma.badge.upsert({
            where: { name: badge.name },
            update: {},
            create: badge
        });
    }
    const lotteriesData = [
        {
            title: 'Tombola Noël Solidaire',
            description: 'Soutenez l’économie locale et tentez de gagner une box gourmande.',
            startDate: new Date(),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            ticketCostPoints: 150,
            maxTickets: 500,
            status: LotteryStatus.ACTIVE
        },
        {
            title: 'Grand Jeu Vacances',
            description: 'Week-end pour deux dans un hôtel partenaire à gagner.',
            startDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
            endDate: new Date(new Date().setMonth(new Date().getMonth() + 2)),
            ticketCostPoints: 200,
            maxTickets: 300,
            status: LotteryStatus.PLANIFIEE
        }
    ];
    for (const lottery of lotteriesData) {
        await prisma.lottery.upsert({
            where: { title: lottery.title },
            update: {},
            create: lottery
        });
    }
    const partnerMap = new Map((await prisma.partner.findMany()).map((partner) => [partner.name, partner.id]));
    const giftCardTemplatesData = [
        {
            name: 'Bon Carrefour 50€',
            type: GiftCardType.bon,
            description: 'Bon d’achat valable dans tous les Carrefour DOM.',
            partnerName: 'Carrefour Dillon',
            valeurFaciale: 50,
            imageUrl: 'https://cdn.kashup.dev/giftcards/carrefour-50.png',
            customizable: false
        },
        {
            name: 'Box Loisirs Hitbox',
            type: GiftCardType.box,
            description: 'Expérience gaming complète pour 2 personnes.',
            partnerName: 'Hitbox Guadeloupe',
            valeurFaciale: 80,
            imageUrl: 'https://cdn.kashup.dev/giftcards/hitbox-box.png',
            customizable: true
        }
    ];
    for (const template of giftCardTemplatesData) {
        await prisma.giftCardTemplate.upsert({
            where: { name: template.name },
            update: {},
            create: {
                name: template.name,
                type: template.type,
                description: template.description,
                valeurFaciale: new Prisma.Decimal(template.valeurFaciale),
                imageUrl: template.imageUrl,
                customizable: template.customizable,
                partner: {
                    connect: { id: partnerMap.get(template.partnerName) }
                }
            }
        });
    }
    const cseCompaniesData = [
        {
            name: 'SECURIDOM Entreprises',
            siret: '12345678901234',
            emailContact: 'cse@securidom.com',
            territory: Territory.MARTINIQUE,
            budgetMensuelAvantages: new Prisma.Decimal(8000),
            active: true
        },
        {
            name: 'GRAHD Collectif',
            siret: '43210987654321',
            emailContact: 'cse@grahd.com',
            territory: Territory.GUYANE,
            budgetMensuelAvantages: new Prisma.Decimal(6500),
            active: true
        }
    ];
    for (const company of cseCompaniesData) {
        await prisma.cseCompany.upsert({
            where: { siret: company.siret },
            update: {},
            create: company
        });
    }
    console.log('🌱 Données de démo insérées avec succès');
}
seed()
    .catch((error) => {
    console.error('❌ Erreur pendant le seed Prisma', error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map