// Export all domain logic
export * from './domain/services/loan.service.js';
export * from './services/account.service.js';
export * from './services/payment-processing.service.js';
export { CDCManagerService } from './services/cdc-manager.service.js';

// Explicitly export interfaces that might not be picked up by export *
export type { PaymentProcessingResult } from './services/payment-processing.service.js';

// Re-export value objects from core-services for convenience
export { Money, AccountId, CustomerId } from '@core-poc/core-services';
