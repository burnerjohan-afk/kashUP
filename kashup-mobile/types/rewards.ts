export type RewardChallenge = {
  id: string;
  title: string;
  category?: string;
  current: number;
  goal: number;
  goalValue: number;
  goalType: string;
  type?: string;
  rewardSummary: string;
  rewardPoints?: number;
  reward?: { rewardId: string; rewardType: string; rewardValue: number; rewardCurrency?: string } | null;
  status: 'active' | 'done';
  userStatus: 'active' | 'done';
  description: string;
  steps: string[];
  percentage: number;
  progress: number;
  completedAt: string | null;
  startAt: string;
  endAt: string;
  difficulty?: string;
  partnerId?: string | null;
  partner?: { id: string; name: string; logoUrl?: string | null } | null;
};

/** Catégorie du menu Badges & points (façon Naomi) */
export type ChallengeCategory = {
  category: string;
  label: string;
  completedCount: number;
  totalCount: number;
  pointsEarned: number;
};

export type RewardLottery = {
  id: string;
  title: string;
  imageUrl?: string | null;
  tickets?: number;
  ticketCount?: number;
  userTicketCount?: number;
  status: 'active' | 'past' | string;
  description: string;
  prize?: string;
  prizeTitle?: string;
  prizeDescription?: string;
  drawDate?: string;
  pointsPerTicket?: number;
  ticketsRemaining?: number | null;
  isTicketStockLimited?: boolean;
  countdown?: { text: string; imminent?: boolean };
};


