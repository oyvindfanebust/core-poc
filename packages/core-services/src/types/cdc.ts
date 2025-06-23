export interface TransferEvent {
  type: 'single_phase' | 'two_phase_pending' | 'two_phase_posted' | 'two_phase_voided' | 'two_phase_expired';
  timestamp: string;
  ledger: number;
  transfer: {
    id: string;
    amount: number;
    pending_id: number;
    user_data_128: number;
    user_data_64: number;
    user_data_32: number;
    timeout: number;
    code: number;
    flags: number;
    timestamp: string;
  };
  debit_account: {
    id: string;
    debits_pending: number;
    debits_posted: number;
    credits_pending: number;
    credits_posted: number;
    user_data_128: number;
    user_data_64: number;
    user_data_32: number;
    code: number;
    flags: number;
    timestamp: string;
  };
  credit_account: {
    id: string;
    debits_pending: number;
    debits_posted: number;
    credits_pending: number;
    credits_posted: number;
    user_data_128: number;
    user_data_64: number;
    user_data_32: number;
    code: number;
    flags: number;
    timestamp: string;
  };
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