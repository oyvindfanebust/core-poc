import { MockSEPANetworkService, SEPAErrorType, SEPAMessage } from '@core-poc/domain';

describe('SEPA Mock Service Fast Tests', () => {
  let mockSEPANetwork: MockSEPANetworkService;

  beforeEach(() => {
    mockSEPANetwork = new MockSEPANetworkService({
      networkDelay: 10, // Fast for testing
      errorRate: 0,
      timeoutRate: 0,
      simulateWeekends: false,
      simulateHolidays: false,
      enforceCutOffTimes: false,
    });
  });

  afterEach(() => {
    mockSEPANetwork.reset();
  });

  describe('Mock Network Behavior', () => {
    it('should process valid SEPA message with minimal delay', async () => {
      const message: SEPAMessage = {
        messageId: 'FAST_TEST_001',
        direction: 'OUTGOING',
        amount: BigInt(10000), // €100.00
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        description: 'Fast test payment',
        createdAt: new Date(),
      };

      const startTime = Date.now();
      const response = await mockSEPANetwork.sendSEPAMessage(message);
      const endTime = Date.now();

      expect(response.status).toBe('ACCEPTED');
      expect(response.sepaTransactionId).toMatch(/^SEPA_OUT_EUR_\d+_[A-Z0-9]+$/);
      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });

    it('should handle various error scenarios', async () => {
      const errorScenarios = [
        {
          message: {
            messageId: 'ERROR_IBAN',
            direction: 'OUTGOING' as const,
            amount: BigInt(10000),
            currency: 'EUR' as const,
            debtorIBAN: 'INVALID',
            creditorIBAN: 'FR1420041010050500013M02606',
            urgency: 'STANDARD' as const,
            createdAt: new Date(),
          },
          expectedError: SEPAErrorType.INVALID_IBAN,
        },
        {
          message: {
            messageId: 'ERROR_AMOUNT',
            direction: 'OUTGOING' as const,
            amount: BigInt(99999999999),
            currency: 'EUR' as const,
            debtorIBAN: 'DE89370400440532013000',
            creditorIBAN: 'FR1420041010050500013M02606',
            urgency: 'STANDARD' as const,
            createdAt: new Date(),
          },
          expectedError: SEPAErrorType.AMOUNT_LIMIT_EXCEEDED,
        },
      ];

      for (const scenario of errorScenarios) {
        const response = await mockSEPANetwork.sendSEPAMessage(scenario.message);
        expect(response.status).toBe('REJECTED');
        expect(response.errorDetails?.code).toBe(scenario.expectedError);
      }
    });

    it('should simulate forced network errors', async () => {
      mockSEPANetwork.injectNetworkError(SEPAErrorType.NETWORK_TIMEOUT);

      const message: SEPAMessage = {
        messageId: 'TIMEOUT_TEST',
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      const response = await mockSEPANetwork.sendSEPAMessage(message);
      expect(response.status).toBe('REJECTED');
      expect(response.errorDetails?.code).toBe(SEPAErrorType.NETWORK_TIMEOUT);
      expect(response.errorDetails?.retryable).toBe(true);
    });

    it('should handle different urgency levels', async () => {
      const urgencies: Array<'STANDARD' | 'EXPRESS' | 'INSTANT'> = [
        'STANDARD',
        'EXPRESS',
        'INSTANT',
      ];

      for (const urgency of urgencies) {
        const message: SEPAMessage = {
          messageId: `URGENCY_${urgency}`,
          direction: 'OUTGOING',
          amount: BigInt(10000),
          currency: 'EUR',
          debtorIBAN: 'DE89370400440532013000',
          creditorIBAN: 'FR1420041010050500013M02606',
          urgency,
          createdAt: new Date(),
        };

        const response = await mockSEPANetwork.sendSEPAMessage(message);
        expect(response.status).toBe('ACCEPTED');
        expect(response.estimatedSettlement).toBeInstanceOf(Date);
      }
    });

    it('should simulate incoming transfers', async () => {
      const incomingMessage = await mockSEPANetwork.simulateIncomingTransfer(
        BigInt(50000), // €500.00
        'EUR',
        'FR1420041010050500013M02606',
        'DE89370400440532013000',
        'Incoming payment',
      );

      expect(incomingMessage.direction).toBe('INCOMING');
      expect(incomingMessage.amount).toBe(BigInt(50000));
      expect(incomingMessage.currency).toBe('EUR');
      expect(incomingMessage.messageId).toMatch(/^MSG_\d+_[A-Z0-9]+$/);
    });

    it('should support all SEPA currencies', async () => {
      const currencies: Array<'EUR' | 'NOK' | 'SEK' | 'DKK'> = ['EUR', 'NOK', 'SEK', 'DKK'];

      for (const currency of currencies) {
        const message: SEPAMessage = {
          messageId: `CURRENCY_${currency}`,
          direction: 'OUTGOING',
          amount: BigInt(10000),
          currency,
          debtorIBAN: 'NO9386011117947',
          creditorIBAN: 'SE3550000000054910000003',
          urgency: 'STANDARD',
          createdAt: new Date(),
        };

        const response = await mockSEPANetwork.sendSEPAMessage(message);
        expect(response.status).toBe('ACCEPTED');
      }
    });
  });

  describe('Mock Configuration', () => {
    it('should handle concurrent transfers', async () => {
      const transferPromises = Array.from({ length: 5 }, (_, index) => {
        const message: SEPAMessage = {
          messageId: `CONCURRENT_${index}`,
          direction: 'OUTGOING',
          amount: BigInt(10000 + index * 1000),
          currency: 'EUR',
          debtorIBAN: 'DE89370400440532013000',
          creditorIBAN: 'FR1420041010050500013M02606',
          urgency: 'STANDARD',
          createdAt: new Date(),
        };
        return mockSEPANetwork.sendSEPAMessage(message);
      });

      const responses = await Promise.all(transferPromises);
      expect(responses).toHaveLength(5);
      responses.forEach(response => {
        expect(response.status).toBe('ACCEPTED');
      });

      const pendingTransfers = mockSEPANetwork.getPendingTransfers();
      expect(pendingTransfers.length).toBeGreaterThanOrEqual(5);
    });

    it('should support custom bank responses', async () => {
      mockSEPANetwork.addBankResponse('TESTBANK', {
        bic: 'TESTBANK',
        accepts: false,
        delay: 50,
        errorRate: 1.0,
      });

      const message: SEPAMessage = {
        messageId: 'BANK_REJECT',
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        creditorBIC: 'TESTBANK',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      const response = await mockSEPANetwork.sendSEPAMessage(message);
      expect(response.status).toBe('REJECTED');
      expect(response.errorDetails?.code).toBe(SEPAErrorType.BANK_REJECTION);
    });

    it('should track transfer status', async () => {
      const message: SEPAMessage = {
        messageId: 'STATUS_TRACK',
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      };

      await mockSEPANetwork.sendSEPAMessage(message);
      const status = await mockSEPANetwork.getTransferStatus('STATUS_TRACK');

      expect(status).toBeDefined();
      expect(status!.message.messageId).toBe('STATUS_TRACK');
      expect(status!.status).toBe('PENDING');
    });

    it('should reset state properly', async () => {
      // Add some transfers
      await mockSEPANetwork.sendSEPAMessage({
        messageId: 'RESET_TEST_1',
        direction: 'OUTGOING',
        amount: BigInt(10000),
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      });

      expect(mockSEPANetwork.getPendingTransfers()).toHaveLength(1);

      // Reset
      mockSEPANetwork.reset();

      expect(mockSEPANetwork.getPendingTransfers()).toHaveLength(0);
    });
  });

  describe('Business Rules', () => {
    it('should enforce daily limits', async () => {
      const limitedMock = new MockSEPANetworkService({
        networkDelay: 10,
        errorRate: 0,
        maxDailyAmount: BigInt(20000), // €200 daily limit
      });

      // First transfer within limit
      const response1 = await limitedMock.sendSEPAMessage({
        messageId: 'LIMIT_1',
        direction: 'OUTGOING',
        amount: BigInt(15000), // €150
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      });

      expect(response1.status).toBe('ACCEPTED');

      // Second transfer exceeding daily limit
      const response2 = await limitedMock.sendSEPAMessage({
        messageId: 'LIMIT_2',
        direction: 'OUTGOING',
        amount: BigInt(10000), // €100, total €250
        currency: 'EUR',
        debtorIBAN: 'DE89370400440532013000',
        creditorIBAN: 'FR1420041010050500013M02606',
        urgency: 'STANDARD',
        createdAt: new Date(),
      });

      expect(response2.status).toBe('REJECTED');
      expect(response2.errorDetails?.code).toBe(SEPAErrorType.AMOUNT_LIMIT_EXCEEDED);
    });

    it('should validate IBAN formats', async () => {
      const validIBANs = [
        'DE89370400440532013000', // Germany
        'FR1420041010050500013M02606', // France
        'NO9386011117947', // Norway
        'SE3550000000054910000003', // Sweden
      ];

      for (const iban of validIBANs) {
        const response = await mockSEPANetwork.sendSEPAMessage({
          messageId: `IBAN_${iban}`,
          direction: 'OUTGOING',
          amount: BigInt(10000),
          currency: 'EUR',
          debtorIBAN: iban,
          creditorIBAN: 'DE89370400440532013000',
          urgency: 'STANDARD',
          createdAt: new Date(),
        });

        expect(response.status).toBe('ACCEPTED');
      }
    });
  });
});
