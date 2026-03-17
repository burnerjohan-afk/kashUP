export type VoucherPayload = {
  id: string;
  partenaire: string;
  montant: number;
  expiration?: string;
  /** ID de l'achat GiftCardPurchase pour suivi vidéo */
  purchaseId?: string;
  /** ID partenaire pour afficher la localisation */
  partnerId?: string | null;
  /** URL du logo partenaire */
  logoUrl?: string | null;
  /** Texte de localisation (ex. "Martinique", adresse) */
  locationText?: string | null;
  /** Lien carte (lat/lng) */
  mapUrl?: string | null;
  /** Vidéo personnalisée associée au cadeau (si disponible) */
  videoStatus?: string | null;
  videoDurationSeconds?: number | null;
};


