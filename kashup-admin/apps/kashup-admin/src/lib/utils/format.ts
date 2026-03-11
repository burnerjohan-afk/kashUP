const CURRENCY = 'EUR';
const LOCALE = 'fr-FR';

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 2,
  }).format(amount);

export const formatPercent = (value: number) =>
  new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);

export const formatDate = (value: string | Date | null | undefined): string => {
  // Gérer les valeurs null, undefined ou vides
  if (!value) {
    return 'Date invalide';
  }

  // Si c'est déjà un objet Date, l'utiliser directement
  if (value instanceof Date) {
    // Vérifier que la date est valide
    if (isNaN(value.getTime())) {
      return 'Date invalide';
    }
    return new Intl.DateTimeFormat(LOCALE, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value);
  }

  // Si c'est une chaîne, essayer de la convertir
  if (typeof value === 'string') {
    // Vérifier que la chaîne n'est pas vide
    if (value.trim() === '') {
      return 'Date invalide';
    }

    const date = new Date(value);
    
    // Vérifier que la date est valide
    if (isNaN(date.getTime())) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ Date invalide reçue:', value);
      }
      return 'Date invalide';
    }

    return new Intl.DateTimeFormat(LOCALE, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }

  // Si le type n'est pas reconnu
  if (import.meta.env.DEV) {
    console.warn('⚠️ Type de date non supporté:', typeof value, value);
  }
  return 'Date invalide';
};

