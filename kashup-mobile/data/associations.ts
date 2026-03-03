export type Association = {
  id: string;
  name: string;
  description: string;
  needs: string;
  location: string;
  department: 'Martinique' | 'Guadeloupe' | 'Guyane';
  impact: string;
};

export type AssociationCategory = {
  id: string;
  title: string;
  icon: string;
  accent: string;
  tint: string;
  associations: Association[];
};

export const ASSOCIATION_CATEGORIES: AssociationCategory[] = [
  {
    id: 'social',
    title: 'Solidarité sociale',
    icon: 'people-outline',
    accent: '#A445FF',
    tint: 'rgba(164,69,255,0.12)',
    associations: [
      {
        id: 'assos-entraide',
        name: 'Entraide Caraïbe',
        description:
          'Accompagne les familles en difficulté avec des paniers alimentaires et du soutien administratif.',
        needs: 'Dons alimentaires & micro-dons',
        location: 'Fort-de-France',
        department: 'Martinique',
        impact: 'Financer des paniers solidaires supplémentaires pour accompagner les familles isolées.',
      },
      {
        id: 'assos-voisins',
        name: 'Voisins Solidaires',
        description: 'Crée des réseaux de proximité pour rompre l’isolement des seniors.',
        needs: 'Bénévolat week-end',
        location: 'Les Abymes',
        department: 'Guadeloupe',
        impact: 'Organiser des visites à domicile et maintenir des ateliers de lien social de proximité.',
      },
    ],
  },
  {
    id: 'health',
    title: 'Santé & bien-être',
    icon: 'medkit-outline',
    accent: '#2DD881',
    tint: 'rgba(45,216,129,0.12)',
    associations: [
      {
        id: 'assos-sourires',
        name: 'Sourires d’Enfants',
        description: 'Offre des ateliers éducatifs et du soutien psychologique aux enfants hospitalisés.',
        needs: 'Jeux éducatifs & dons financiers',
        location: 'Baie-Mahault',
        department: 'Guadeloupe',
        impact: 'Créer des kits créatifs pour égayer le quotidien des enfants suivis à l’hôpital.',
      },
      {
        id: 'assos-resilience',
        name: 'Résilience Outre-mer',
        description: 'Accompagne les victimes de violences intrafamiliales avec des parcours de soins dédiés.',
        needs: 'Financements pour psychologues',
        location: 'Cayenne',
        department: 'Guyane',
        impact: 'Financer des séances d’accompagnement psychologique dans un cadre sécurisé.',
      },
    ],
  },
  {
    id: 'environment',
    title: 'Protection de l’environnement',
    icon: 'leaf-outline',
    accent: '#12C2E9',
    tint: 'rgba(18,194,233,0.12)',
    associations: [
      {
        id: 'assos-mangrove',
        name: 'Gardiens de la Mangrove',
        description: 'Organise des journées de replantation et sensibilise les jeunes à la biodiversité.',
        needs: 'Matériel de reboisement',
        location: 'Le Lamentin',
        department: 'Martinique',
        impact: 'Replanter de jeunes pousses de mangrove sur des zones prioritaires.',
      },
      {
        id: 'assos-recup',
        name: 'Recup’Archipel',
        description: 'Collecte et revalorise les déchets plastiques en objets du quotidien.',
        needs: 'Financement logistique',
        location: 'Pointe-à-Pitre',
        department: 'Guadeloupe',
        impact: 'Mettre en place de nouveaux points de collecte mobiles pour les déchets plastiques.',
      },
    ],
  },
  {
    id: 'animals',
    title: 'Protection animale',
    icon: 'paw-outline',
    accent: '#F97316',
    tint: 'rgba(249,115,22,0.12)',
    associations: [
      {
        id: 'assos-refuge',
        name: 'Refuge Ti-Chiens',
        description: 'Prend soin des chiens et chats abandonnés et finance leurs soins vétérinaires.',
        needs: 'Croquettes & soins',
        location: 'Schoelcher',
        department: 'Martinique',
        impact: 'Vacciner et nourrir les animaux en attente d’adoption au refuge.',
      },
      {
        id: 'assos-tortues',
        name: 'Tortues des Îles',
        description: 'Protège les sites de ponte et sensibilise aux bons gestes sur les plages.',
        needs: 'Kits de surveillance nocturne',
        location: 'Remire-Montjoly',
        department: 'Guyane',
        impact: 'Sécuriser les plages de ponte pendant la saison des tortues marines.',
      },
    ],
  },
];

export const ASSOCIATION_DEPARTMENTS: Array<'Tous' | 'Martinique' | 'Guadeloupe' | 'Guyane'> = [
  'Tous',
  'Martinique',
  'Guadeloupe',
  'Guyane',
];

export const flattenAssociations = () => {
  const list: Array<Association & { categoryId: string; categoryTitle: string; accent: string; tint: string }> = [];
  ASSOCIATION_CATEGORIES.forEach((category) => {
    category.associations.forEach((association) => {
      list.push({
        ...association,
        categoryId: category.id,
        categoryTitle: category.title,
        accent: category.accent,
        tint: category.tint,
      });
    });
  });
  return list;
};

export const findAssociationById = (id: string) => {
  for (const category of ASSOCIATION_CATEGORIES) {
    const match = category.associations.find((association) => association.id === id);
    if (match) {
      return {
        association: match,
        category,
      };
    }
  }
  return null;
};

