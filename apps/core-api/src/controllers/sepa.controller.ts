import { logger } from '@core-poc/core-services';
import { SEPAService } from '@core-poc/domain';
import { Request, Response } from 'express';

export class SEPAController {
  constructor(private sepaService: SEPAService) {}

  /**
   * Process outgoing SEPA transfer
   */
  async processOutgoingTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { accountId, amount, currency, bankInfo, description, urgency } = req.body;

      logger.info('SEPA outgoing transfer request received', {
        accountId,
        amount,
        currency,
        urgency: urgency || 'STANDARD',
      });

      const result = await this.sepaService.processOutgoingTransfer({
        accountId: BigInt(accountId),
        amount: BigInt(amount),
        currency,
        bankInfo,
        description,
        urgency,
      });

      res.status(200).json({
        success: true,
        data: {
          transferId: result.transferId.toString(),
          status: result.status,
          sepaTransactionId: result.sepaTransactionId,
          processingStage: result.processingStage,
        },
      });
    } catch (error) {
      logger.error('Failed to process outgoing SEPA transfer', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: {
          code: 'SEPA_OUTGOING_TRANSFER_FAILED',
          message: 'Failed to process outgoing SEPA transfer',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Process incoming SEPA transfer
   */
  async processIncomingTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { amount, currency, bankInfo, targetAccountId, sepaTransactionId, description } =
        req.body;

      logger.info('SEPA incoming transfer request received', {
        targetAccountId,
        amount,
        currency,
        sepaTransactionId,
      });

      const result = await this.sepaService.processIncomingTransfer({
        amount: BigInt(amount),
        currency,
        bankInfo,
        targetAccountId: BigInt(targetAccountId),
        sepaTransactionId,
        description,
      });

      res.status(200).json({
        success: true,
        data: {
          transferId: result.transferId.toString(),
          status: result.status,
          sepaTransactionId: result.sepaTransactionId,
          processingStage: result.processingStage,
        },
      });
    } catch (error) {
      logger.error('Failed to process incoming SEPA transfer', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: {
          code: 'SEPA_INCOMING_TRANSFER_FAILED',
          message: 'Failed to process incoming SEPA transfer',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Get SEPA suspense account balances
   */
  async getSuspenseBalances(req: Request, res: Response): Promise<void> {
    try {
      const { currency } = req.params;

      logger.info('SEPA suspense balances request', { currency });

      const balances = await this.sepaService.getSEPASuspenseBalances(
        currency as 'EUR' | 'NOK' | 'SEK' | 'DKK',
      );

      res.status(200).json({
        success: true,
        data: balances,
      });
    } catch (error) {
      logger.error('Failed to get SEPA suspense balances', {
        currency: req.params.currency,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: {
          code: 'SEPA_BALANCE_FETCH_FAILED',
          message: 'Failed to retrieve SEPA suspense balances',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Get SEPA service status and configuration
   */
  async getServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      logger.info('SEPA service status request');

      // Get balances for all SEPA currencies
      const currencies: Array<'EUR' | 'NOK' | 'SEK' | 'DKK'> = ['EUR', 'NOK', 'SEK', 'DKK'];

      const balances = await Promise.all(
        currencies.map(currency => this.sepaService.getSEPASuspenseBalances(currency)),
      );

      const serviceStatus = {
        status: 'operational',
        supportedCurrencies: currencies,
        transferTypes: ['STANDARD', 'EXPRESS', 'INSTANT'],
        features: {
          outgoingTransfers: true,
          incomingTransfers: true,
          suspenseAccountManagement: true,
          realTimeBalances: true,
        },
        suspenseAccounts: balances,
        timestamp: new Date().toISOString(),
      };

      res.status(200).json({
        success: true,
        data: serviceStatus,
      });
    } catch (error) {
      logger.error('Failed to get SEPA service status', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: {
          code: 'SEPA_STATUS_FETCH_FAILED',
          message: 'Failed to retrieve SEPA service status',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
