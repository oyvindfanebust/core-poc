export interface TransferEvent {
  type: 'single_phase' | 'two_phase_pending' | 'two_phase_posted' | 'two_phase_voided' | 'two_phase_expired';
  timestamp: string;
  transfer: {
    id: string;
    debit_account_id: string;
    credit_account_id: string;
    amount: string;
    pending_id?: string;
    user_data_128?: string;
    user_data_64?: string;
    user_data_32?: string;
    timeout?: string;
    ledger: string;
    code: string;
    flags?: string;
  };
  accounts: Array<{
    id: string;
    debits_pending: string;
    debits_posted: string;
    credits_pending: string;
    credits_posted: string;
    timestamp: string;
  }>;
}

export interface EventHandlerConfig {
  exchange: string;
  routingKeys: string[];
  queue?: string;
  autoAck?: boolean;
}

export interface CDCEventHandler {
  handleTransferEvent(event: TransferEvent): Promise<void>;
}