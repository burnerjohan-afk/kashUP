/**
 * Utilitaires pour masquer les données personnelles
 * Conforme RGPD: minimisation des données affichées
 */

/**
 * Masque partiellement un email
 * Ex: "john.doe@example.com" -> "jo***@example.com"
 */
export const maskEmail = (email: string): string => {
  if (!email || typeof email !== 'string') return '—';
  
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
};

/**
 * Masque partiellement un IBAN
 * Ex: "FR7612345678901234567890123" -> "****0123"
 */
export const maskIBAN = (iban: string): string => {
  if (!iban || typeof iban !== 'string') return '—';
  if (iban.length < 8) return iban;
  return `****${iban.slice(-4)}`;
};

/**
 * Masque un numéro de compte bancaire
 */
export const maskAccountNumber = (accountNumber: string): string => {
  if (!accountNumber || typeof accountNumber !== 'string') return '—';
  if (accountNumber.length < 4) return accountNumber;
  return `****${accountNumber.slice(-4)}`;
};

/**
 * Masque un numéro de téléphone
 * Ex: "+33612345678" -> "+33 6 ** ** ** 78"
 */
export const maskPhone = (phone: string): string => {
  if (!phone || typeof phone !== 'string') return '—';
  
  // Garder le préfixe pays et les 2 derniers chiffres
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.length < 4) return phone;
  
  const prefix = cleaned.slice(0, -2);
  const suffix = cleaned.slice(-2);
  
  return `${prefix}**${suffix}`;
};

/**
 * Masque un nom complet (garder initiales)
 * Ex: "Jean Dupont" -> "J. D."
 */
export const maskFullName = (fullName: string): string => {
  if (!fullName || typeof fullName !== 'string') return '—';
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '—';
  
  return parts
    .map((part) => (part.length > 0 ? `${part[0]}.` : ''))
    .join(' ')
    .trim();
};

/**
 * Vérifie si une donnée doit être masquée selon les permissions
 */
export const shouldMaskData = (
  hasPermission: boolean,
  data: string | null | undefined,
): boolean => {
  return !hasPermission && !!data;
};

