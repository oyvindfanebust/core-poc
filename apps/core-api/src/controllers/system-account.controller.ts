import { SystemAccountConfigService, logger } from '@core-poc/core-services';
import { Request, Response } from 'express';

export class SystemAccountController {
  constructor(private systemAccountConfigService: SystemAccountConfigService) {}

  /**
   * Get all system accounts
   */
  async getSystemAccounts(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Fetching all system accounts');

      const accounts = this.systemAccountConfigService.getAllSystemAccounts();
      const metadata = this.systemAccountConfigService.getConfigMetadata();

      // Transform the accounts to include the system identifier as a key
      const accountsWithIdentifiers = Object.entries(accounts).map(
        ([systemIdentifier, account]) => ({
          systemIdentifier,
          ...account,
        }),
      );

      res.json({
        metadata,
        accounts: accountsWithIdentifiers,
        count: accountsWithIdentifiers.length,
      });
    } catch (error) {
      logger.error('Failed to get system accounts', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: {
          code: 'SYSTEM_ACCOUNTS_FETCH_FAILED',
          message: 'Failed to retrieve system accounts',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Get system account by identifier
   */
  async getSystemAccount(req: Request, res: Response): Promise<void> {
    try {
      const { systemIdentifier } = req.params;

      logger.info('Fetching system account', { systemIdentifier });

      const account = this.systemAccountConfigService.getSystemAccount(systemIdentifier);

      if (!account) {
        res.status(404).json({
          error: {
            code: 'SYSTEM_ACCOUNT_NOT_FOUND',
            message: `System account not found: ${systemIdentifier}`,
          },
        });
        return;
      }

      res.json({
        systemIdentifier,
        ...account,
      });
    } catch (error) {
      logger.error('Failed to get system account', {
        systemIdentifier: req.params.systemIdentifier,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: {
          code: 'SYSTEM_ACCOUNT_FETCH_FAILED',
          message: 'Failed to retrieve system account',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Get system accounts by type
   */
  async getSystemAccountsByType(req: Request, res: Response): Promise<void> {
    try {
      const { accountType } = req.params;

      logger.info('Fetching system accounts by type', { accountType });

      const accounts = this.systemAccountConfigService.getSystemAccountsByType(accountType);

      // Transform the accounts to include the system identifier as a key
      const accountsWithIdentifiers = Object.entries(accounts).map(
        ([systemIdentifier, account]) => ({
          systemIdentifier,
          ...account,
        }),
      );

      res.json({
        accountType,
        accounts: accountsWithIdentifiers,
        count: accountsWithIdentifiers.length,
      });
    } catch (error) {
      logger.error('Failed to get system accounts by type', {
        accountType: req.params.accountType,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: {
          code: 'SYSTEM_ACCOUNTS_BY_TYPE_FETCH_FAILED',
          message: 'Failed to retrieve system accounts by type',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Validate system account configuration
   */
  async validateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Validating system account configuration');

      const validation = await this.systemAccountConfigService.validateConfig();

      res.json({
        valid: validation.valid,
        errors: validation.errors,
        message: validation.valid ? 'Configuration is valid' : 'Configuration has errors',
      });
    } catch (error) {
      logger.error('Failed to validate system account configuration', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      res.status(500).json({
        error: {
          code: 'CONFIGURATION_VALIDATION_FAILED',
          message: 'Failed to validate configuration',
          details: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }
}
