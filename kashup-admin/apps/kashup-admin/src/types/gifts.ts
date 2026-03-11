// Types pour les Cartes Up et Box Up

export type GiftCardAmount = {
  id: string;
  amount: number; // Montant en euros
  createdAt: string;
  updatedAt: string;
};

// Carte Up "libre" (choix du montant + choix du partenaire)
export type CarteUpLibre = {
  id: string;
  nom: string;
  description: string;
  imageUrl?: string;
  montantsDisponibles: number[]; // Liste des montants disponibles (ex: [5, 10, 20, 50, 100])
  partenairesEligibles: string[]; // IDs des partenaires éligibles
  conditions?: string;
  commentCaMarche?: string;
  /** Taux de cashback (%) à l'achat */
  cashbackRate?: number | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

// Carte UP (créée par l'admin ; l'utilisateur ajoute texte + macaron)
export type CarteUpPredefinie = {
  id: string;
  nom: string;
  partenaireId: string;
  partenaireName?: string;
  offre?: string;
  montant: number;
  imageUrl?: string;
  description: string;
  dureeValiditeJours?: number; // Durée de validité en jours
  conditions?: string;
  commentCaMarche?: string;
  /** Taux de cashback (%) à l'achat */
  cashbackRate?: number | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

// Box Up (ensemble d'activités de plusieurs partenaires)
export type BoxUpPartner = {
  partenaireId: string;
  partenaireName?: string; // Pour l'affichage
  offrePartenaire: string; // Exemple: "1 menu signature", "10 minutes de karting"
  conditions?: string;
};

export type BoxUp = {
  id: string;
  nom: string;
  description: string;
  imageUrl?: string;
  partenaires: BoxUpPartner[]; // Liste des partenaires avec leurs offres
  commentCaMarche?: string;
  /** Taux de cashback (%) à l'achat */
  cashbackRate?: number | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
};

// Log d'envoi de cadeaux
export type GiftSendLog = {
  id: string;
  cadeauId: string;
  cadeauNom: string;
  type: 'carte-up-libre' | 'carte-up-predefinie' | 'box-up';
  expediteurId?: string;
  expediteurEmail?: string;
  destinataireEmail?: string;
  destinataireUserId?: string;
  statut: 'envoye' | 'en_attente' | 'echoue';
  dateEnvoi?: string;
  createdAt: string;
  errorMessage?: string;
};

// Input pour créer/éditer une Carte Up libre
export type CarteUpLibreInput = {
  nom: string;
  description: string;
  image?: File;
  montantsDisponibles: number[];
  partenairesEligibles: string[];
  conditions?: string;
  commentCaMarche?: string;
  cashbackRate?: number | null;
  status: 'active' | 'inactive';
};

// Input pour créer/éditer une Carte UP
export type CarteUpPredefinieInput = {
  nom: string;
  partenaireId: string;
  offre?: string;
  montant: number;
  image?: File;
  description: string;
  dureeValiditeJours?: number;
  conditions?: string;
  commentCaMarche?: string;
  cashbackRate?: number | null;
  status: 'active' | 'inactive';
};

// Input pour créer/éditer une Box Up
export type BoxUpInput = {
  nom: string;
  description: string;
  image?: File;
  partenaires: BoxUpPartner[];
  commentCaMarche?: string;
  cashbackRate?: number | null;
  status: 'active' | 'inactive';
};

// Input pour envoyer un cadeau
export type GiftSendInput = {
  cadeauId: string;
  type: 'carte-up-libre' | 'carte-up-predefinie' | 'box-up';
  destinataireEmail?: string;
  destinataireUserId?: string;
  montant?: number; // Pour les cartes libres
};

