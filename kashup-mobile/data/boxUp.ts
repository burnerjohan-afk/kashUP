export type BoxUpPartner = {
  id: string;
  name: string;
  logoColor: string;
  category: string;
};

export type BoxUp = {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  priceFrom: number;
  heroImage: string;
  partners: BoxUpPartner[];
  cashbackInfo: string;
};

export const BOXES: BoxUp[] = [
  {
    id: 'box-resto',
    title: 'Box Resto Local',
    shortDescription: 'Dîners gourmands pour deux dans les meilleurs restaurants de votre territoire.',
    description:
      'Découvrez une sélection gourmande de restaurants locaux triés sur le volet. Cette Box inclut des menus découverte, des accords mets & vins et des expériences culinaires exclusives pour mettre à l’honneur la gastronomie caribéenne.',
    priceFrom: 40,
    heroImage:
      'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=1000&q=60',
    partners: [
      { id: 'resto1', name: 'Restaurant Madiana', logoColor: '#FECACA', category: 'Restauration' },
      { id: 'resto2', name: 'Le Vibes', logoColor: '#FBCFE8', category: 'Bar & Lounge' },
      { id: 'resto3', name: 'Cuisine Lakaz', logoColor: '#BFDBFE', category: 'Cuisine locale' },
    ],
    cashbackInfo: 'Jusqu’à 8 % de cashback sur les additions réglées dans les restaurants partenaires.',
  },
  {
    id: 'box-bienetre',
    title: 'Box Détente & Bien-être',
    shortDescription: 'Massages, spa et expériences bien-être pour retrouver l’équilibre.',
    description:
      'Offrez-vous ou offrez à vos proches une parenthèse de douceur. Cette Box réunit instituts de beauté, spas urbains et praticiens bien-être pour des soins ressourçants à deux pas de chez vous.',
    priceFrom: 55,
    heroImage:
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1000&q=60',
    partners: [
      { id: 'well1', name: 'Spa Doucelyne', logoColor: '#C7D2FE', category: 'Spa & soins' },
      { id: 'well2', name: 'Studio Zen', logoColor: '#C0EBA6', category: 'Yoga & relaxation' },
      { id: 'well3', name: 'Beauté Caraïbe', logoColor: '#FDE68A', category: 'Institut de beauté' },
    ],
    cashbackInfo: 'Profitez de 6 % de cashback sur les soins réalisés via la Box.',
  },
  {
    id: 'box-loisirs',
    title: 'Box Loisirs & Aventure',
    shortDescription: 'Activités outdoor, sensations fortes et découvertes en plein air.',
    description:
      'Sensations fortes, escapades nautiques ou randonnées guidées : cette Box rassemble les meilleurs opérateurs loisirs pour vivre des moments mémorables en famille ou entre amis.',
    priceFrom: 60,
    heroImage:
      'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1000&q=60',
    partners: [
      { id: 'fun1', name: 'Karting de Rémire', logoColor: '#FDBA8C', category: 'Karting & fun' },
      { id: 'fun2', name: 'Surf Caraïbe', logoColor: '#93C5FD', category: 'Activités nautiques' },
      { id: 'fun3', name: 'Trail Aventure', logoColor: '#A7F3D0', category: 'Randonnée guidée' },
    ],
    cashbackInfo: 'Bénéficiez de 5 % de cashback sur vos expériences loisirs éligibles.',
  },
];

export const getBoxById = (boxId: string) => BOXES.find((box) => box.id === boxId);

