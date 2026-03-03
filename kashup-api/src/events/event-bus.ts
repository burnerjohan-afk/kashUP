import EventEmitter from 'events';

export type NotificationEvent =
  | {
      type: 'transaction_created';
      payload: { userId: string; transactionId: string; amount: number };
    }
  | {
    type: 'boost_purchased';
    payload: { userId: string; boostId: string };
  }
  | {
    type: 'drimify_experience_result';
    payload: { userId: string; experienceId: string; message: string };
  }
  | {
    type: 'powens_connection_sync';
    payload: { userId: string; connectionId: string; status: string };
  };

class NotificationBus extends EventEmitter {
  emitEvent(event: NotificationEvent) {
    this.emit(event.type, event.payload);
  }
}

export const notificationBus = new NotificationBus();


