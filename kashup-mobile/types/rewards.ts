export type RewardChallenge = {
  id: string;
  title: string;
  current: number;
  goal: number;
  reward: string;
  status: 'active' | 'done';
  description: string;
  steps: string[];
};

export type RewardLottery = {
  id: string;
  title: string;
  tickets: number;
  status: 'active' | 'past';
  description: string;
  prize: string;
  drawDate: string;
};


