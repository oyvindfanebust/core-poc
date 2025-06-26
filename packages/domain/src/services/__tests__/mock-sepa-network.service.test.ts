import {
  MockSEPANetworkService,
  SEPAMessage,
  SEPAErrorType,
  SEPABankResponse,
} from '../mock-sepa-network.service.js';

describe('MockSEPANetworkService', () => {
  let mockSEPAService: MockSEPANetworkService;

  beforeEach(() => {
    mockSEPAService = new MockSEPANetworkService({
      networkDelay: 10, // Fast for testing
      errorRate: 0, // No random errors for predictable tests
      timeoutRate: 0, // No random timeouts
      simulateWeekends: false, // Disable for consistent testing
      simulateHolidays: false,
      enforceCutOffTimes: false,
    });
  });

  afterEach(() => {
    mockSEPAService.reset();
  });

  describe('sendSEPAMessage', () => {
    it('should process valid SEPA message successfully', async () => {
      const message: SEPAMessage = {
        messageId: 'TEST_MSG_001',
        direction: 'OUTGOING',
        amount: BigInt(10000), // €100.00
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        description: 'Test payment',
        createdAt: new Date(),
      };

      const response = await mockSEPAService.sendSEPAMessage(message);

      expect(response.status).toBe('ACCEPTED');
      expect(response.messageId).toBe('TEST_MSG_001');
      expect(response.sepaTransactionId).toMatch(/^SEPA_OUT_EUR_\d+_[A-Z0-9]+$/);
      expect(response.bankResponseCode).toBe('0000');
      expect(response.estimatedSettlement).toBeInstanceOf(Date);
    });

    it('should reject message with invalid IBAN', async () => {
      const message: SEPAMessage = {
        messageId: 'TEST_MSG_002',
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'EUR',
        debtorIBAN: 'INVALID_IBAN',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      const response = await mockSEPAService.sendSEPAMessage(message);

      expect(response.status).toBe('REJECTED');
      expect(response.errorDetails?.code).toBe(SEPAErrorType.INVALID_IBAN);
      expect(response.errorDetails?.retryable).toBe(false);
    });

    it('should reject message with unsupported currency', async () => {
      const message: SEPAMessage = {
        messageId: 'TEST_MSG_003',
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'USD' as 'EUR' | 'NOK' | 'SEK' | 'DKK', // Invalid for SEPA
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      const response = await mockSEPAService.sendSEPAMessage(message);

      expect(response.status).toBe('REJECTED');
      expect(response.errorDetails?.code).toBe(SEPAErrorType.CURRENCY_NOT_SUPPORTED);
    });

    it('should reject message exceeding transaction limits', async () => {
      const message: SEPAMessage = {
        messageId: 'TEST_MSG_004',
        direction: 'OUTGOING',
        amount: BigInt(999999999), // Very large amount
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      const response = await mockSEPAService.sendSEPAMessage(message);

      expect(response.status).toBe('REJECTED');
      expect(response.errorDetails?.code).toBe(SEPAErrorType.AMOUNT_LIMIT_EXCEEDED);
    });

    it('should handle forced network errors', async () => {
      mockSEPAService.injectNetworkError(SEPAErrorType.NETWORK_TIMEOUT);

      const message: SEPAMessage = {
        messageId: 'TEST_MSG_005',
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      const response = await mockSEPAService.sendSEPAMessage(message);

      expect(response.status).toBe('REJECTED');
      expect(response.errorDetails?.code).toBe(SEPAErrorType.NETWORK_TIMEOUT);
      expect(response.errorDetails?.retryable).toBe(true);
    });

    it('should handle different urgency levels with appropriate settlement times', async () => {
      const baseMessage: Omit<SEPAMessage, 'urgency' | 'messageId'> = {
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        createdAt: new Date(),
      };

      // Test INSTANT transfer
      const instantResponse = await mockSEPAService.sendSEPAMessage({
        ...baseMessage,
        messageId: 'INSTANT_MSG',
        urgency: 'INSTANT',
      });

      // Test STANDARD transfer
      const standardResponse = await mockSEPAService.sendSEPAMessage({
        ...baseMessage,
        messageId: 'STANDARD_MSG',
        urgency: 'STANDARD',
      });

      expect(instantResponse.status).toBe('ACCEPTED');
      expect(standardResponse.status).toBe('ACCEPTED');

      // Instant should settle much faster than standard
      const instantSettlement = instantResponse.estimatedSettlement!.getTime();
      const standardSettlement = standardResponse.estimatedSettlement!.getTime();
      const now = Date.now();

      expect(instantSettlement - now).toBeLessThan(60000); // < 1 minute
      expect(standardSettlement - now).toBeGreaterThan(3600000); // > 1 hour
    });

    it('should handle custom bank responses', async () => {
      // Add a bank that rejects transfers
      const rejectingBank: SEPABankResponse = {
        bic: 'REJECTBANK',
        accepts: false,
        delay: 100,
        errorRate: 1.0,
      };
      mockSEPAService.addBankResponse('REJECTBANK', rejectingBank);

      const message: SEPAMessage = {
        messageId: 'TEST_MSG_006',
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        creditorBIC: 'REJECTBANK',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      const response = await mockSEPAService.sendSEPAMessage(message);

      expect(response.status).toBe('REJECTED');
      expect(response.errorDetails?.code).toBe(SEPAErrorType.BANK_REJECTION);
    });
  });

  describe('simulateIncomingTransfer', () => {
    it('should create incoming SEPA message', async () => {
      const incomingMessage = await mockSEPAService.simulateIncomingTransfer(
        BigInt(50000), // €500.00
        'EUR',
        'FR1420041010050500013M02606',
        'DE89370400440532013000',
        'Incoming payment',
      );

      expect(incomingMessage.direction).toBe('INCOMING');
      expect(incomingMessage.amount).toBe(BigInt(50000));
      expect(incomingMessage.currency).toBe('EUR');
      expect(incomingMessage.debtorIBAN).toBe('FR1420041010050500013M02606');
      expect(incomingMessage.creditorIBAN).toBe('DE89370400440532013000');
      expect(incomingMessage.description).toBe('Incoming payment');
      expect(incomingMessage.messageId).toMatch(/^MSG_\d+_[A-Z0-9]+$/);
    });

    it('should support all SEPA currencies', async () => {
      const currencies: Array<'EUR' | 'NOK' | 'SEK' | 'DKK'> = ['EUR', 'NOK', 'SEK', 'DKK'];

      for (const currency of currencies) {
        const message = await mockSEPAService.simulateIncomingTransfer(
          BigInt(10000),
          currency,
          'NO9386011117947',
          'DE89370400440532013000',
        );

        expect(message.currency).toBe(currency);
        expect(message.direction).toBe('INCOMING');
      }
    });
  });

  describe('getTransferStatus', () => {
    it('should track transfer status', async () => {
      const message: SEPAMessage = {
        messageId: 'TRACK_MSG_001',
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      await mockSEPAService.sendSEPAMessage(message);

      const status = await mockSEPAService.getTransferStatus('TRACK_MSG_001');

      expect(status).toBeDefined();
      expect(status!.message.messageId).toBe('TRACK_MSG_001');
      expect(status!.status).toBe('PENDING');
      expect(status!.submittedAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent transfer', async () => {
      const status = await mockSEPAService.getTransferStatus('NON_EXISTENT');
      expect(status).toBeNull();
    });
  });

  describe('configuration and testing utilities', () => {
    it('should allow setting network delay', async () => {
      mockSEPAService.setNetworkDelay(500);

      const message: SEPAMessage = {
        messageId: 'DELAY_MSG',
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      const startTime = Date.now();
      await mockSEPAService.sendSEPAMessage(message);
      const endTime = Date.now();

      // Should take at least the configured delay (with some tolerance for test execution)
      expect(endTime - startTime).toBeGreaterThanOrEqual(400);
    });

    it('should clear forced errors', async () => {
      mockSEPAService.injectNetworkError(SEPAErrorType.FRAUD_BLOCK);
      mockSEPAService.clearNetworkError();

      const message: SEPAMessage = {
        messageId: 'CLEAR_ERROR_MSG',
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      const response = await mockSEPAService.sendSEPAMessage(message);

      expect(response.status).toBe('ACCEPTED');
    });

    it('should reset service state', async () => {
      // Add some transfers and custom config
      const message: SEPAMessage = {
        messageId: 'RESET_MSG',
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      await mockSEPAService.sendSEPAMessage(message);
      mockSEPAService.injectNetworkError(SEPAErrorType.BANK_REJECTION);

      expect(mockSEPAService.getPendingTransfers()).toHaveLength(1);

      // Reset and verify clean state
      mockSEPAService.reset();

      expect(mockSEPAService.getPendingTransfers()).toHaveLength(0);

      // Should process normally after reset
      const response = await mockSEPAService.sendSEPAMessage({
        ...message,
        messageId: 'AFTER_RESET_MSG',
      });
      expect(response.status).toBe('ACCEPTED');
    });

    it('should track all pending transfers', async () => {
      const messages = [
        { messageId: 'PENDING_1', amount: BigInt(1000) },
        { messageId: 'PENDING_2', amount: BigInt(2000) },
        { messageId: 'PENDING_3', amount: BigInt(3000) },
      ];

      for (const msg of messages) {
        await mockSEPAService.sendSEPAMessage({
          messageId: msg.messageId,
          direction: 'OUTGOING',
          amount: msg.amount,
          currency: 'EUR',
          debtorIBAN: 'DE89370400440532013000',
          creditorIBAN: 'FR1420041010050500013M02606',
          urgency: 'STANDARD',
          createdAt: new Date(),
        });
      }

      const pendingTransfers = mockSEPAService.getPendingTransfers();
      expect(pendingTransfers).toHaveLength(3);

      const messageIds = pendingTransfers.map(t => t.message.messageId);
      expect(messageIds).toContain('PENDING_1');
      expect(messageIds).toContain('PENDING_2');
      expect(messageIds).toContain('PENDING_3');
    });
  });

  describe('business rules validation', () => {
    it('should enforce daily limits when enabled', async () => {
      const serviceWithLimits = new MockSEPANetworkService({
        networkDelay: 10,
        errorRate: 0,
        maxDailyAmount: BigInt(50000), // €500 daily limit
      });

      const message: SEPAMessage = {
        messageId: 'LIMIT_MSG_1',
        direction: 'OUTGOING',
        amount: BigInt(30000), // €300
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      // First transfer should succeed
      const response1 = await serviceWithLimits.sendSEPAMessage(message);
      expect(response1.status).toBe('ACCEPTED');

      // Second transfer that would exceed daily limit should fail
      const response2 = await serviceWithLimits.sendSEPAMessage({
        ...message,
        messageId: 'LIMIT_MSG_2',
        amount: BigInt(25000), // €250, total would be €550
      });

      expect(response2.status).toBe('REJECTED');
      expect(response2.errorDetails?.code).toBe(SEPAErrorType.AMOUNT_LIMIT_EXCEEDED);
    });

    it('should validate supported currencies', async () => {
      const supportedCurrencies: Array<'EUR' | 'NOK' | 'SEK' | 'DKK'> = [
        'EUR',
        'NOK',
        'SEK',
        'DKK',
      ];

      for (const currency of supportedCurrencies) {
        const message: SEPAMessage = {
          messageId: `CURRENCY_${currency}`,
          direction: 'OUTGOING',
          amount: BigInt(10000),
          currency,
          debtorIBAN: 'DE89370400440532013000',
          creditorIBAN: 'FR1420041010050500013M02606',
          urgency: 'STANDARD',
          createdAt: new Date(),
        };

        const response = await mockSEPAService.sendSEPAMessage(message);
        expect(response.status).toBe('ACCEPTED');
      }
    });
  });
});
