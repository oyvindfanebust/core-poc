import { CDCEventHandler, TransferEvent } from '../types/cdc.js';
import { logger } from '../utils/logger.js';
import { Money } from '../domain/value-objects.js';
import { TransferRepository } from '../repositories/transfer.repository.js';
import { LEDGER_CODES } from '../config/tigerbeetle.js';
import { TransferType } from '../../../shared/src/types/index.js';

export class BankingEventHandler implements CDCEventHandler {
  private transferRepository: TransferRepository;

  constructor() {
    this.transferRepository = new TransferRepository();
  }
  
  async handleTransferEvent(event: TransferEvent): Promise<void> {
    logger.info('Processing banking event', {
      type: event.type,
      transferId: event.transfer.id,
      amount: event.transfer.amount,
      debitAccount: event.transfer.debit_account_id,
      creditAccount: event.transfer.credit_account_id
    });

    switch (event.type) {
      case 'single_phase':
        await this.handleSinglePhaseTransfer(event);
        break;
      case 'two_phase_pending':
        await this.handleTwoPhaseTransferPending(event);
        break;
      case 'two_phase_posted':
        await this.handleTwoPhaseTransferPosted(event);
        break;
      case 'two_phase_voided':
        await this.handleTwoPhaseTransferVoided(event);
        break;
      case 'two_phase_expired':
        await this.handleTwoPhaseTransferExpired(event);
        break;
      default:
        logger.warn('Unknown transfer event type', { type: event.type });
    }
  }

  private async handleSinglePhaseTransfer(event: TransferEvent): Promise<void> {
    logger.info('Processing single phase transfer', {
      transferId: event.transfer.id,
      amount: event.transfer.amount,
      from: event.transfer.debit_account_id,
      to: event.transfer.credit_account_id
    });

    // Save transfer record to PostgreSQL for transaction history
    try {
      // Extract currency from ledger code (assuming ledger codes follow pattern like USD_LEDGER)
      const currency = this.extractCurrencyFromLedger(event.transfer.ledger);
      
      await this.transferRepository.save({
        transferId: event.transfer.id,
        fromAccountId: event.transfer.debit_account_id,
        toAccountId: event.transfer.credit_account_id,
        amount: BigInt(event.transfer.amount),
        currency,
        description: this.extractDescription(event),
      });
      
      logger.info('Transfer record saved to database', {
        transferId: event.transfer.id
      });
    } catch (error) {
      logger.error('Failed to save transfer record', {
        transferId: event.transfer.id,
        error
      });
      // Don't throw - we don't want to block CDC processing
    }

    // Example: Send real-time notification
    await this.sendTransferNotification(event, 'Transfer completed');
    
    // Example: Update analytics
    await this.updateTransferAnalytics(event);
    
    // Example: Trigger any business workflows
    await this.triggerPostTransferWorkflows(event);
  }

  private async handleTwoPhaseTransferPending(event: TransferEvent): Promise<void> {
    logger.info('Processing two phase transfer pending', {
      transferId: event.transfer.id,
      pendingId: event.transfer.pending_id,
      amount: event.transfer.amount
    });

    // Example: Send pending notification
    await this.sendTransferNotification(event, 'Transfer pending authorization');
    
    // Example: Set up timeout monitoring
    await this.scheduleTimeoutMonitoring(event);
  }

  private async handleTwoPhaseTransferPosted(event: TransferEvent): Promise<void> {
    logger.info('Processing two phase transfer posted', {
      transferId: event.transfer.id,
      pendingId: event.transfer.pending_id,
      amount: event.transfer.amount
    });

    // Save transfer record to PostgreSQL for transaction history
    try {
      const currency = this.extractCurrencyFromLedger(event.transfer.ledger);
      
      await this.transferRepository.save({
        transferId: event.transfer.id,
        fromAccountId: event.transfer.debit_account_id,
        toAccountId: event.transfer.credit_account_id,
        amount: BigInt(event.transfer.amount),
        currency,
        description: this.extractDescription(event),
      });
      
      logger.info('Transfer record saved to database', {
        transferId: event.transfer.id
      });
    } catch (error) {
      logger.error('Failed to save transfer record', {
        transferId: event.transfer.id,
        error
      });
      // Don't throw - we don't want to block CDC processing
    }

    // Example: Send completion notification
    await this.sendTransferNotification(event, 'Transfer completed');
    
    // Example: Complete business processes
    await this.completeBusinessProcesses(event);
    
    // Example: Update external systems
    await this.syncWithExternalSystems(event);
  }

  private async handleTwoPhaseTransferVoided(event: TransferEvent): Promise<void> {
    logger.info('Processing two phase transfer voided', {
      transferId: event.transfer.id,
      pendingId: event.transfer.pending_id
    });

    // Example: Send cancellation notification
    await this.sendTransferNotification(event, 'Transfer cancelled');
    
    // Example: Clean up pending processes
    await this.cleanupPendingProcesses(event);
  }

  private async handleTwoPhaseTransferExpired(event: TransferEvent): Promise<void> {
    logger.info('Processing two phase transfer expired', {
      transferId: event.transfer.id,
      pendingId: event.transfer.pending_id
    });

    // Example: Send expiration notification
    await this.sendTransferNotification(event, 'Transfer expired');
    
    // Example: Handle timeout scenarios
    await this.handleTransferTimeout(event);
  }

  private async sendTransferNotification(event: TransferEvent, message: string): Promise<void> {
    // TODO: Implement real-time notification system
    // Could integrate with WebSocket, push notifications, email, SMS, etc.
    
    logger.info('Sending transfer notification', {
      transferId: event.transfer.id,
      message,
      creditAccount: event.transfer.credit_account_id,
      debitAccount: event.transfer.debit_account_id
    });

    // Example implementation:
    // await notificationService.send({
    //   type: 'transfer_update',
    //   accountId: event.transfer.credit_account_id,
    //   message,
    //   data: {
    //     transferId: event.transfer.id,
    //     amount: event.transfer.amount,
    //     timestamp: event.timestamp
    //   }
    // });
  }

  private async updateTransferAnalytics(event: TransferEvent): Promise<void> {
    // TODO: Implement analytics tracking
    // Could send to analytics platforms, update metrics, etc.
    
    logger.debug('Updating transfer analytics', {
      transferId: event.transfer.id,
      ledger: event.transfer.ledger,
      code: event.transfer.code,
      amount: event.transfer.amount
    });

    // Example implementation:
    // await analyticsService.track('transfer_completed', {
    //   transferId: event.transfer.id,
    //   amount: event.transfer.amount,
    //   ledger: event.transfer.ledger,
    //   timestamp: event.timestamp
    // });
  }

  private async triggerPostTransferWorkflows(event: TransferEvent): Promise<void> {
    // TODO: Implement business workflow triggers
    // Could trigger invoice payments, loan payments, etc.
    
    if (event.transfer.user_data_32) {
      // Example: If transfer has invoice reference
      logger.info('Triggering invoice payment workflow', {
        transferId: event.transfer.id,
        invoiceId: event.transfer.user_data_32
      });
      
      // await invoiceService.markAsPaid(event.transfer.user_data_32);
    }
  }

  private async scheduleTimeoutMonitoring(event: TransferEvent): Promise<void> {
    // TODO: Implement timeout monitoring for pending transfers
    logger.debug('Scheduling timeout monitoring', {
      transferId: event.transfer.id,
      timeout: event.transfer.timeout
    });
  }

  private async completeBusinessProcesses(event: TransferEvent): Promise<void> {
    // TODO: Complete any business processes that were waiting for this transfer
    logger.debug('Completing business processes', {
      transferId: event.transfer.id,
      pendingId: event.transfer.pending_id
    });
  }

  private async syncWithExternalSystems(event: TransferEvent): Promise<void> {
    // TODO: Sync with external systems (CRM, ERP, etc.)
    logger.debug('Syncing with external systems', {
      transferId: event.transfer.id,
      accounts: event.accounts.map(a => a.id)
    });
  }

  private async cleanupPendingProcesses(event: TransferEvent): Promise<void> {
    // TODO: Clean up any pending processes for voided transfers
    logger.debug('Cleaning up pending processes', {
      transferId: event.transfer.id,
      pendingId: event.transfer.pending_id
    });
  }

  private async handleTransferTimeout(event: TransferEvent): Promise<void> {
    // TODO: Handle timeout scenarios (notifications, cleanup, etc.)
    logger.debug('Handling transfer timeout', {
      transferId: event.transfer.id,
      pendingId: event.transfer.pending_id
    });
  }

  private extractCurrencyFromLedger(ledger: string): string {
    // Convert ledger code back to currency symbol
    const ledgerCode = parseInt(ledger);
    for (const [currency, code] of Object.entries(LEDGER_CODES)) {
      if (code === ledgerCode) {
        return currency;
      }
    }
    
    // Fallback to USD if ledger code not found
    logger.warn('Unknown ledger code, defaulting to USD', { ledger });
    return 'USD';
  }

  private extractDescription(event: TransferEvent): string | undefined {
    // Extract transfer type from user_data_32 and create description
    const transferType = event.transfer.user_data_32 ? parseInt(event.transfer.user_data_32) : TransferType.CUSTOMER_TRANSFER;
    
    switch (transferType) {
      case TransferType.INITIAL_DEPOSIT:
        return 'Initial account deposit';
      case TransferType.CUSTOMER_TRANSFER:
      default:
        return 'Customer transfer';
    }
  }
}