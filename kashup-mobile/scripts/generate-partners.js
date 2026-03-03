const fs = require('fs');

const heroImages = [
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
  'https://images.unsplash.com/photo-1492724441997-5dc865305da7',
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef',
  'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429',
];

const categories = {
  supermarkets: 'Supermarchés & Hypermarchés',
  hotels: 'Restauration & Hôtels',
  leisure: 'Loisirs & Divertissement',
  services: 'Services & Sécurité',
  wellness: 'Bien-être & Beauté',
  mobility: 'Transports & Mobilité',
};

const entries = [
  // ... data inserted programmatically later
];

// Populate entries array
function addPartner(partner) {
  entries.push(partner);
}

// Helpers
const makeLogo = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=12C2E9&color=FFFFFF&size=128`;

const dataSets = {
  supermarkets: [
    {
      id: 'carrefour-ffd',
      nom: 'Carrefour Fort-de-France',
      territoire: 'Martinique',
      ville: 'Fort-de-France',
      cash: 5,
      desc: 'Hypermarché emblématique avec une large sélection de produits locaux et internationaux.',
      site: 'https://www.carrefour.fr',
      instagram: 'https://instagram.com/carrefourmartinique',
      facebook: 'https://facebook.com/carrefourmartinique',
      lat: 14.6102,
      long: -61.0588,
      dist: 4.2,
    },
    {
      id: 'carrefour-baie',
      nom: 'Carrefour Baie-Mahault',
      territoire: 'Guadeloupe',
      ville: 'Baie-Mahault',
      cash: 4,
      desc: 'Centre commercial moderne avec services drive et traiteur.',
      site: 'https://www.carrefour.fr',
      instagram: 'https://instagram.com/carrefourguadeloupe',
      facebook: 'https://facebook.com/carrefourguadeloupe',
      lat: 16.2708,
      long: -61.5852,
      dist: 28.4,
    },
    {
      id: 'carrefour-cayenne',
      nom: 'Carrefour Cayenne',
      territoire: 'Guyane',
      ville: 'Cayenne',
      cash: 6,
      desc: 'Point de rendez-vous familial pour les courses hebdomadaires.',
      site: 'https://www.carrefour.fr',
      instagram: 'https://instagram.com/carrefourguyane',
      facebook: 'https://facebook.com/carrefourguyane',
      lat: 4.9224,
      long: -52.3135,
      dist: 6.8,
    },
    {
      id: 'superu-kourou',
      nom: 'Super U Kourou',
      territoire: 'Guyane',
      ville: 'Kourou',
      cash: 5,
      desc: 'Supermarché convivial avec corner producteurs amazoniens.',
      site: 'https://www.magasins-u.com',
      instagram: 'https://instagram.com/superukourou',
      lat: 5.1583,
      long: -52.6426,
      dist: 45.1,
    },
    {
      id: 'bio-caraibes',
      nom: 'Bio Caraïbes',
      territoire: 'Martinique',
      ville: 'Le Lamentin',
      cash: 7,
      desc: 'Épicerie biologique engagée dans les circuits courts.',
      site: 'https://biocaraibes.fr',
      instagram: 'https://instagram.com/biocaraibes',
      facebook: 'https://facebook.com/biocaraibes',
      lat: 14.616,
      long: -60.999,
      dist: 12.6,
    },
    {
      id: 'marche-sud',
      nom: 'Marché Solidaire du Sud',
      territoire: 'Guadeloupe',
      ville: 'Sainte-Anne',
      cash: 6,
      desc: 'Collectif de producteurs locaux réunis chaque semaine.',
      site: 'https://marchesolidaire.gp',
      facebook: 'https://facebook.com/marchesolidaire',
      lat: 16.2414,
      long: -61.3993,
      dist: 34.7,
    },
    {
      id: 'hyperu-bellevue',
      nom: 'Hyper U Bellevue',
      territoire: 'Martinique',
      ville: 'Fort-de-France',
      cash: 4,
      desc: 'Magasin spacieux avec un rayon traiteur réputé.',
      site: 'https://www.magasins-u.com',
      instagram: 'https://instagram.com/hyperubellevue',
      lat: 14.6265,
      long: -61.0655,
      dist: 9.8,
    },
    {
      id: 'marche-coeur',
      nom: 'Marché Cœur de Ville',
      territoire: 'Guadeloupe',
      ville: 'Pointe-à-Pitre',
      cash: 5,
      desc: 'Marché urbain mettant à l’honneur les artisans créoles.',
      site: 'https://coeurdeville.gp',
      instagram: 'https://instagram.com/coeurdeville',
      lat: 16.2416,
      long: -61.5333,
      dist: 18.9,
    },
    {
      id: 'marche-tropical',
      nom: 'Marché Tropical Express',
      territoire: 'Guyane',
      ville: 'Cayenne',
      cash: 6,
      desc: 'Drive rapide dédié aux produits des trois Guyanes.',
      site: 'https://tropicalexpress.gf',
      facebook: 'https://facebook.com/tropicalexpress',
      lat: 4.922,
      long: -52.313,
      dist: 11.2,
    },
    {
      id: 'carrefour-schoelcher',
      nom: 'Carrefour Express Schoelcher',
      territoire: 'Martinique',
      ville: 'Schoelcher',
      cash: 4,
      desc: 'Format express pour les courses du quotidien.',
      site: 'https://www.carrefour.fr',
      instagram: 'https://instagram.com/carrefourmartinique',
      lat: 14.6428,
      long: -61.0936,
      dist: 7.4,
    },
  ],
  hotels: [
    // ... similar entries (omitted for brevity)
  ],
};

Object.entries(dataSets).forEach(([key, list]) => {
  list.forEach((item) => {
    addPartner({
      ...item,
      cat: categories[key],
    });
  });
});

const fileHeader = `export type PartnerCategory =
  | 'Supermarchés & Hypermarchés'
  | 'Restauration & Hôtels'
  | 'Loisirs & Divertissement'
  | 'Services & Sécurité'
  | 'Bien-être & Beauté'
  | 'Transports & Mobilité';

export type Partner = {
  id: string;
  nom: string;
  categorie: PartnerCategory;
  territoire: 'Martinique' | 'Guadeloupe' | 'Guyane';
  ville: string;
  tauxCashback: number;
  descriptionCourte: string;
  siteWeb?: string;
  instagram?: string;
  facebook?: string;
  logo: string;
  imageFond: string;
  latitude?: number;
  longitude?: number;
  distanceKm?: number;
  estFavori: boolean;
};

const heroImages = ${JSON.stringify(heroImages, null, 2)} as const;

const makeLogo = (name: string) =>
  \`https://ui-avatars.com/api/?name=\${encodeURIComponent(name)}&background=12C2E9&color=FFFFFF&size=128\`;

const seeds = ${JSON.stringify(entries, null, 2)} as const;

export const partners: Partner[] = seeds.map((seed, index) => ({
  id: seed.id,
  nom: seed.nom,
  categorie: seed.cat as PartnerCategory,
  territoire: seed.territoire,
  ville: seed.ville,
  tauxCashback: seed.cash,
  descriptionCourte: seed.desc,
  siteWeb: seed.site,
  instagram: seed.instagram,
  facebook: seed.facebook,
  latitude: seed.lat,
  longitude: seed.long,
  distanceKm: seed.dist,
  logo: seed.logo ?? makeLogo(seed.nom),
  imageFond: seed.imageFond ?? heroImages[index % heroImages.length],
  estFavori: false,
}));
`;

fs.writeFileSync('data/partners.ts', fileHeader);

