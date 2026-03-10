import EventEmitter from 'events';

export type NotificationEvent =
  | {
      type: 'transaction_created';
      payload: { userId: string; transactionId: string; amount: number; partnerId: string; cashbackEarned?: number };
    }
  | {
    type: 'boost_purchased';
    payload: {
      userId: string;
      boostId: string;
      boostName?: string;
      boostDescription?: string;
      multiplier?: number;
      target?: string;
      costInPoints?: number;
      expiresAt?: string;
    };
  }
  | {
    type: 'lottery_joined';
    payload: { userId: string; lotteryId: string; ticketCount: number; pointsSpent: number };
  }
  | {
    type: 'lottery_winner';
    payload: { userId: string; lotteryId: string };
  }
  | {
    type: 'drimify_experience_result';
    payload: { userId: string; experienceId: string; message: string };
  }
  | {
    type: 'powens_connection_sync';
    payload: { userId: string; connectionId: string; status: string };
  }
  | {
    type: 'jackpot_winner';
    payload: { userId: string; jackpotId: string; winningAmount: number };
  }
  | {
    type: 'challenge_completed';
    payload: { userId: string; challengeId: string; challengeProgressId?: string };
  };

class NotificationBus extends EventEmitter {
  emitEvent(event: NotificationEvent) {
    this.emit(event.type, event.payload);
  }
}

export const notificationBus = new NotificationBus();


