import { logger } from '@core-poc/core-services';
import { validateIBAN, validateSEPAIBAN } from '@core-poc/shared';

export interface SEPAMessage {
  messageId: string;
  direction: 'OUTGOING' | 'INCOMING';
  amount: bigint;
  currency: 'EUR' | 'NOK' | 'SEK' | 'DKK';
  debtorIBAN: string;
  creditorIBAN: string;
  debtorBIC?: string;
  creditorBIC?: string;
  urgency: 'STANDARD' | 'EXPRESS' | 'INSTANT';
  description?: string;
  createdAt: Date;
}

export interface SEPANetworkResponse {
  messageId: string;
  status: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  sepaTransactionId: string;
  bankResponseCode?: string;
  estimatedSettlement?: Date;
  actualSettlement?: Date;
  errorDetails?: SEPAError;
}

export interface SEPAError {
  code: SEPAErrorType;
  message: string;
  bankCode?: string;
  retryable: boolean;
}

export enum SEPAErrorType {
  INVALID_IBAN = 'INVALID_IBAN',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  ACCOUNT_CLOSED = 'ACCOUNT_CLOSED',
  FRAUD_BLOCK = 'FRAUD_BLOCK',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  BANK_REJECTION = 'BANK_REJECTION',
  CURRENCY_NOT_SUPPORTED = 'CURRENCY_NOT_SUPPORTED',
  AMOUNT_LIMIT_EXCEEDED = 'AMOUNT_LIMIT_EXCEEDED',
  CUT_OFF_TIME_EXCEEDED = 'CUT_OFF_TIME_EXCEEDED',
  HOLIDAY_PROCESSING = 'HOLIDAY_PROCESSING',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
}

export interface MockNetworkConfig {
  networkDelay: number; // milliseconds
  errorRate: number; // 0-1 probability of errors
  forceError?: SEPAErrorType;
  timeoutRate: number; // 0-1 probability of timeouts
  simulateWeekends: boolean;
  simulateHolidays: boolean;
  enforceCutOffTimes: boolean;
  maxDailyAmount: bigint;
  maxTransactionAmount: bigint;
}

export interface MockSEPATransfer {
  message: SEPAMessage;
  response: SEPANetworkResponse;
  submittedAt: Date;
  settledAt?: Date;
  status: 'PENDING' | 'SETTLED' | 'FAILED';
}

export interface SEPABankResponse {
  bic: string;
  accepts: boolean;
  delay: number; // milliseconds
  errorRate: number;
  customErrors?: SEPAErrorType[];
}

/**
 * Mock SEPA Network Service for testing and development
 * Simulates external SEPA network behaviors, bank responses, and timing
 */
export class MockSEPANetworkService {
  private pendingTransfers = new Map<string, MockSEPATransfer>();
  private bankResponses = new Map<string, SEPABankResponse>();
  private dailyAmounts = new Map<string, bigint>(); // Track daily amounts by date
  private networkConfig: MockNetworkConfig;

  constructor(config?: Partial<MockNetworkConfig>) {
    this.networkConfig = {
      networkDelay: 100, // 100ms default
      errorRate: 0.05, // 5% error rate
      timeoutRate: 0.01, // 1% timeout rate
      simulateWeekends: true,
      simulateHolidays: true,
      enforceCutOffTimes: true,
      maxDailyAmount: BigInt(1000000 * 100), // €10,000 in cents
      maxTransactionAmount: BigInt(100000 * 100), // €1,000 in cents
      ...config,
    };

    // Initialize default bank responses
    this.initializeDefaultBankResponses();
  }

  /**
   * Send a SEPA message to the mock network
   */
  async sendSEPAMessage(message: SEPAMessage): Promise<SEPANetworkResponse> {
    logger.info('Mock SEPA Network: Processing message', {
      messageId: message.messageId,
      direction: message.direction,
      amount: message.amount.toString(),
      currency: message.currency,
      urgency: message.urgency,
    });

    // Simulate network delay
    await this.simulateNetworkDelay(message.urgency);

    // Validate message
    const validationError = this.validateSEPAMessage(message);
    if (validationError) {
      return this.createErrorResponse(message, validationError);
    }

    // Check for forced errors
    if (this.networkConfig.forceError) {
      return this.createErrorResponse(message, this.networkConfig.forceError);
    }

    // Simulate random network timeout
    if (Math.random() < this.networkConfig.timeoutRate) {
      return this.createErrorResponse(message, SEPAErrorType.NETWORK_TIMEOUT);
    }

    // Simulate random errors
    if (Math.random() < this.networkConfig.errorRate) {
      const randomError = this.getRandomError();
      return this.createErrorResponse(message, randomError);
    }

    // Check business rules
    const businessRuleError = this.checkBusinessRules(message);
    if (businessRuleError) {
      return this.createErrorResponse(message, businessRuleError);
    }

    // Simulate bank response
    const bankResponse = this.getBankResponse(
      message.creditorBIC || this.extractBICFromIBAN(message.creditorIBAN),
    );
    if (!bankResponse.accepts) {
      return this.createErrorResponse(message, SEPAErrorType.BANK_REJECTION);
    }

    // Create successful response
    const response = this.createSuccessResponse(message);

    // Store transfer for tracking
    const transfer: MockSEPATransfer = {
      message,
      response,
      submittedAt: new Date(),
      status: 'PENDING',
    };
    this.pendingTransfers.set(message.messageId, transfer);

    // Schedule settlement
    this.scheduleSettlement(transfer);

    return response;
  }

  /**
   * Simulate receiving an incoming SEPA transfer
   */
  async simulateIncomingTransfer(
    amount: bigint,
    currency: 'EUR' | 'NOK' | 'SEK' | 'DKK',
    debtorIBAN: string,
    creditorIBAN: string,
    description?: string,
  ): Promise<SEPAMessage> {
    const message: SEPAMessage = {
      messageId: this.generateMessageId(),
      direction: 'INCOMING',
      amount,
      currency,
      debtorIBAN,
      creditorIBAN,
      urgency: 'STANDARD',
      description,
      createdAt: new Date(),
    };

    logger.info('Mock SEPA Network: Simulating incoming transfer', {
      messageId: message.messageId,
      amount: amount.toString(),
      currency,
      debtorIBAN: this.maskIBAN(debtorIBAN),
      creditorIBAN: this.maskIBAN(creditorIBAN),
    });

    // Simulate processing delay for incoming transfers
    await this.simulateNetworkDelay('STANDARD');

    return message;
  }

  /**
   * Get the status of a SEPA transfer
   */
  async getTransferStatus(messageId: string): Promise<MockSEPATransfer | null> {
    return this.pendingTransfers.get(messageId) || null;
  }

  /**
   * Set network delay for testing
   */
  setNetworkDelay(delayMs: number): void {
    this.networkConfig.networkDelay = delayMs;
  }

  /**
   * Inject a specific error for testing
   */
  injectNetworkError(errorType: SEPAErrorType): void {
    this.networkConfig.forceError = errorType;
  }

  /**
   * Clear forced error
   */
  clearNetworkError(): void {
    delete this.networkConfig.forceError;
  }

  /**
   * Add custom bank response behavior
   */
  addBankResponse(bic: string, response: SEPABankResponse): void {
    this.bankResponses.set(bic, response);
  }

  /**
   * Get all pending transfers
   */
  getPendingTransfers(): MockSEPATransfer[] {
    return Array.from(this.pendingTransfers.values());
  }

  /**
   * Reset mock service state
   */
  reset(): void {
    this.pendingTransfers.clear();
    this.dailyAmounts.clear();
    this.bankResponses.clear();
    this.initializeDefaultBankResponses();
    delete this.networkConfig.forceError;
  }

  /**
   * Initialize default bank responses for testing
   */
  private initializeDefaultBankResponses(): void {
    // Add some default European banks
    this.bankResponses.set('DEUTDEFF', {
      bic: 'DEUTDEFF',
      accepts: true,
      delay: 200,
      errorRate: 0.02,
    });

    this.bankResponses.set('BNPAFRPP', {
      bic: 'BNPAFRPP',
      accepts: true,
      delay: 150,
      errorRate: 0.01,
    });

    this.bankResponses.set('DNBANOKK', {
      bic: 'DNBANOKK',
      accepts: true,
      delay: 300,
      errorRate: 0.03,
    });

    // Add a problematic bank for testing
    this.bankResponses.set('TESTBANK', {
      bic: 'TESTBANK',
      accepts: false,
      delay: 1000,
      errorRate: 0.5,
      customErrors: [SEPAErrorType.BANK_REJECTION, SEPAErrorType.ACCOUNT_CLOSED],
    });
  }

  /**
   * Validate SEPA message format and content
   */
  private validateSEPAMessage(message: SEPAMessage): SEPAErrorType | null {
    // Validate IBAN format with comprehensive validation
    const debtorValidation = validateSEPAIBAN(message.debtorIBAN);
    if (!debtorValidation.isValid) {
      return SEPAErrorType.INVALID_IBAN;
    }

    const creditorValidation = validateSEPAIBAN(message.creditorIBAN);
    if (!creditorValidation.isValid) {
      return SEPAErrorType.INVALID_IBAN;
    }

    // Validate currency support
    if (!['EUR', 'NOK', 'SEK', 'DKK'].includes(message.currency)) {
      return SEPAErrorType.CURRENCY_NOT_SUPPORTED;
    }

    // Validate amount
    if (message.amount <= 0n) {
      return SEPAErrorType.AMOUNT_LIMIT_EXCEEDED;
    }

    if (message.amount > this.networkConfig.maxTransactionAmount) {
      return SEPAErrorType.AMOUNT_LIMIT_EXCEEDED;
    }

    return null;
  }

  /**
   * Check business rules (timing, limits, holidays)
   */
  private checkBusinessRules(message: SEPAMessage): SEPAErrorType | null {
    const now = new Date();

    // Check cut-off times (15:00 CET for same-day processing)
    if (this.networkConfig.enforceCutOffTimes && message.urgency === 'EXPRESS') {
      const cutOffHour = 15; // 3 PM CET
      if (now.getHours() >= cutOffHour) {
        return SEPAErrorType.CUT_OFF_TIME_EXCEEDED;
      }
    }

    // Check weekends
    if (this.networkConfig.simulateWeekends) {
      const dayOfWeek = now.getDay();
      if ((dayOfWeek === 0 || dayOfWeek === 6) && message.urgency !== 'INSTANT') {
        return SEPAErrorType.HOLIDAY_PROCESSING;
      }
    }

    // Check daily limits
    const dateKey = now.toISOString().split('T')[0];
    const dailyTotal = this.dailyAmounts.get(dateKey) || 0n;
    if (dailyTotal + message.amount > this.networkConfig.maxDailyAmount) {
      return SEPAErrorType.AMOUNT_LIMIT_EXCEEDED;
    }

    // Update daily total
    this.dailyAmounts.set(dateKey, dailyTotal + message.amount);

    return null;
  }

  /**
   * Get bank response configuration
   */
  private getBankResponse(bic: string): SEPABankResponse {
    return (
      this.bankResponses.get(bic) || {
        bic,
        accepts: true,
        delay: 500,
        errorRate: 0.1,
      }
    );
  }

  /**
   * Create successful SEPA response
   */
  private createSuccessResponse(message: SEPAMessage): SEPANetworkResponse {
    const estimatedSettlement = this.calculateSettlementTime(message);

    return {
      messageId: message.messageId,
      status: 'ACCEPTED',
      sepaTransactionId: this.generateSEPATransactionId(message),
      bankResponseCode: '0000', // Success code
      estimatedSettlement,
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse(message: SEPAMessage, errorType: SEPAErrorType): SEPANetworkResponse {
    const errorDetails = this.getErrorDetails(errorType);

    return {
      messageId: message.messageId,
      status: 'REJECTED',
      sepaTransactionId: this.generateSEPATransactionId(message),
      errorDetails,
    };
  }

  /**
   * Get error details for error type
   */
  private getErrorDetails(errorType: SEPAErrorType): SEPAError {
    const errorMap: Record<SEPAErrorType, Omit<SEPAError, 'code'>> = {
      [SEPAErrorType.INVALID_IBAN]: {
        message: 'Invalid IBAN format or checksum',
        retryable: false,
      },
      [SEPAErrorType.INSUFFICIENT_FUNDS]: {
        message: 'Insufficient funds in debtor account',
        retryable: true,
      },
      [SEPAErrorType.ACCOUNT_CLOSED]: {
        message: 'Creditor account is closed or suspended',
        retryable: false,
      },
      [SEPAErrorType.FRAUD_BLOCK]: {
        message: 'Transaction blocked due to fraud detection',
        retryable: false,
      },
      [SEPAErrorType.NETWORK_TIMEOUT]: {
        message: 'Network timeout during processing',
        retryable: true,
      },
      [SEPAErrorType.BANK_REJECTION]: {
        message: 'Receiving bank rejected the transaction',
        retryable: false,
      },
      [SEPAErrorType.CURRENCY_NOT_SUPPORTED]: {
        message: 'Currency not supported for SEPA transfers',
        retryable: false,
      },
      [SEPAErrorType.AMOUNT_LIMIT_EXCEEDED]: {
        message: 'Transaction amount exceeds limits',
        retryable: false,
      },
      [SEPAErrorType.CUT_OFF_TIME_EXCEEDED]: {
        message: 'Cut-off time exceeded for same-day processing',
        retryable: true,
      },
      [SEPAErrorType.HOLIDAY_PROCESSING]: {
        message: 'Processing delayed due to weekend/holiday',
        retryable: true,
      },
      [SEPAErrorType.COMPLIANCE_VIOLATION]: {
        message: 'Transaction violates compliance rules',
        retryable: false,
      },
    };

    return {
      code: errorType,
      ...errorMap[errorType],
    };
  }

  /**
   * Calculate settlement time based on urgency and business rules
   */
  private calculateSettlementTime(message: SEPAMessage): Date {
    const now = new Date();
    const settlementDate = new Date(now);

    switch (message.urgency) {
      case 'INSTANT':
        settlementDate.setSeconds(settlementDate.getSeconds() + 10);
        break;
      case 'EXPRESS':
        settlementDate.setHours(settlementDate.getHours() + 2);
        break;
      case 'STANDARD':
      default:
        settlementDate.setDate(settlementDate.getDate() + 1);
        break;
    }

    // Skip weekends for non-instant transfers
    if (message.urgency !== 'INSTANT') {
      while (settlementDate.getDay() === 0 || settlementDate.getDay() === 6) {
        settlementDate.setDate(settlementDate.getDate() + 1);
      }
    }

    return settlementDate;
  }

  /**
   * Schedule settlement of a transfer
   */
  private scheduleSettlement(transfer: MockSEPATransfer): void {
    const settlementTime = transfer.response.estimatedSettlement;
    if (!settlementTime) return;

    const delay = settlementTime.getTime() - Date.now();

    setTimeout(
      () => {
        transfer.status = 'SETTLED';
        transfer.settledAt = new Date();
        transfer.response.actualSettlement = transfer.settledAt;

        logger.info('Mock SEPA Network: Transfer settled', {
          messageId: transfer.message.messageId,
          sepaTransactionId: transfer.response.sepaTransactionId,
          settledAt: transfer.settledAt.toISOString(),
        });
      },
      Math.max(delay, 0),
    );
  }

  /**
   * Simulate network delay based on urgency
   */
  private async simulateNetworkDelay(urgency: string): Promise<void> {
    let delay = this.networkConfig.networkDelay;

    switch (urgency) {
      case 'INSTANT':
        delay = Math.min(delay, 50); // Very fast for instant
        break;
      case 'EXPRESS':
        delay = delay * 1.5; // Slightly slower
        break;
      case 'STANDARD':
      default:
        delay = delay * 2; // Standard delay
        break;
    }

    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Generate message ID
   */
  private generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MSG_${timestamp}_${random}`;
  }

  /**
   * Generate SEPA transaction ID
   */
  private generateSEPATransactionId(message: SEPAMessage): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SEPA_${message.direction.substring(0, 3)}_${message.currency}_${timestamp}_${random}`;
  }

  /**
   * Get random error for simulation
   */
  private getRandomError(): SEPAErrorType {
    const errors = [
      SEPAErrorType.INSUFFICIENT_FUNDS,
      SEPAErrorType.ACCOUNT_CLOSED,
      SEPAErrorType.BANK_REJECTION,
      SEPAErrorType.NETWORK_TIMEOUT,
    ];
    return errors[Math.floor(Math.random() * errors.length)];
  }

  /**
   * Validate IBAN format (comprehensive validation)
   */
  private isValidIBAN(iban: string): boolean {
    return validateIBAN(iban);
  }

  /**
   * Extract BIC from IBAN (simplified)
   */
  private extractBICFromIBAN(iban: string): string {
    // In real implementation, this would use a proper IBAN to BIC mapping
    // For mock purposes, we'll generate a fake BIC based on country code
    const countryCode = iban.substring(0, 2);
    const bankCode = iban.substring(4, 8);
    return `${bankCode}${countryCode}XX`;
  }

  /**
   * Mask IBAN for logging
   */
  private maskIBAN(iban: string): string {
    if (iban.length <= 8) return iban;
    const cleaned = iban.replace(/\s/g, '');
    return `${cleaned.substring(0, 4)}****${cleaned.substring(cleaned.length - 4)}`;
  }
}
