export type IdType = 'account' | 'transaction' | 'customer';
export type SecurityLevel = 'none' | 'low' | 'medium' | 'high';

export interface MaskingOptions {
  maskChar?: string;
  separator?: string;
  visibleLength?: number;
  preserveStructure?: boolean;
}

interface MaskingPattern extends Required<MaskingOptions> {
  minLength: number;
}

/**
 * Get the default masking pattern for a specific ID type
 */
export function getMaskingPattern(type: IdType): MaskingPattern {
  switch (type) {
    case 'account':
      return {
        maskChar: '•',
        separator: ' ',
        visibleLength: 7, // Show last 7 chars for long IDs
        preserveStructure: false,
        minLength: 5,
      };

    case 'transaction':
      return {
        maskChar: '•',
        separator: ' ',
        visibleLength: 8, // Show last 8 chars for transaction IDs
        preserveStructure: false,
        minLength: 6,
      };

    case 'customer':
      return {
        maskChar: '•',
        separator: '',
        visibleLength: 4, // Smaller visible part for customer IDs
        preserveStructure: true, // Preserve structure like CUSTOMER-XXX-123
        minLength: 4,
      };

    default:
      return {
        maskChar: '•',
        separator: ' ',
        visibleLength: 4,
        preserveStructure: false,
        minLength: 5,
      };
  }
}

/**
 * Format masked ID with separator
 */
export function formatMaskedId(maskedPart: string, visiblePart: string, separator: string): string {
  if (!maskedPart && !visiblePart) return '';
  if (!maskedPart) return visiblePart;
  if (!visiblePart) return maskedPart;

  return `${maskedPart}${separator}${visiblePart}`;
}

/**
 * Handle customer ID structure preservation
 */
function maskCustomerIdWithStructure(id: string, pattern: MaskingPattern): string {
  // Handle patterns like CUSTOMER-ABC-123
  if (id.includes('-')) {
    const parts = id.split('-');
    if (parts.length >= 3) {
      // Keep first and last part, mask middle parts
      const first = parts[0];
      const last = parts[parts.length - 1];
      const middleMask = pattern.maskChar.repeat(3);
      return `${first}-${middleMask}-${last}`;
    }
  }

  // Handle numeric customer IDs - use standard pattern with separator
  if (/^\d+$/.test(id) && id.length > 6) {
    const visibleLength = Math.min(4, Math.floor(id.length / 2));
    const visiblePart = id.slice(-visibleLength);
    const maskedPart = pattern.maskChar.repeat(4);
    return formatMaskedId(maskedPart, visiblePart, ' ');
  }

  // Handle other structured patterns - show first char and mask rest
  if (id.length > 4) {
    const maskLength = Math.min(3, id.length - 1);
    const maskedPart = pattern.maskChar.repeat(maskLength);
    return `${id[0]}${maskedPart}`;
  }

  // Too short for meaningful masking
  return id;
}

/**
 * Mask a sensitive ID based on its type and length
 */
export function maskSensitiveId(
  id: string | null | undefined,
  type: IdType,
  customOptions?: Partial<MaskingOptions>,
): string {
  if (!id || typeof id !== 'string') {
    return '';
  }

  if (id.length <= 2) {
    return id; // Too short to mask meaningfully
  }

  const pattern = { ...getMaskingPattern(type), ...customOptions };

  // Special handling for customer IDs with structure preservation
  if (type === 'customer' && pattern.preserveStructure) {
    return maskCustomerIdWithStructure(id, pattern);
  }

  // Calculate visible length based on ID length and type
  let visibleLength = pattern.visibleLength;

  if (type === 'account') {
    // Adaptive visible length for account IDs
    if (id.length > 30) visibleLength = 7;
    else if (id.length > 20) visibleLength = 6;
    else if (id.length > 10) visibleLength = 4;
    else visibleLength = Math.max(2, Math.floor(id.length / 2));
  }

  // Use custom visible length if provided
  if (customOptions?.visibleLength !== undefined) {
    visibleLength = customOptions.visibleLength;
  }

  // Ensure we don't show more than half the ID
  visibleLength = Math.min(visibleLength, Math.floor(id.length / 2));

  // Get visible part (last N characters)
  const visiblePart = id.slice(-visibleLength);

  // Calculate mask length - show 4 dots for most cases, 3 for very short IDs
  const maskLength = id.length <= 7 ? 3 : 4;
  const maskedPart = pattern.maskChar.repeat(maskLength);

  return formatMaskedId(maskedPart, visiblePart, pattern.separator);
}

/**
 * Determine if an ID should show masking option based on length and sensitivity
 */
export function shouldShowMaskingOption(id: string | null | undefined, type: IdType): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const pattern = getMaskingPattern(type);

  // Different minimum thresholds for different types
  switch (type) {
    case 'account':
      return id.length >= 5; // Account IDs should be maskable if 5+ chars
    case 'transaction':
      return id.length >= 6; // Transaction IDs need to be longer
    case 'customer':
      return id.length >= 4 && (id.includes('-') || id.length >= 8); // Structure or length
    default:
      return id.length >= pattern.minLength;
  }
}

/**
 * Get security level assessment for an ID
 */
export function getSecurityLevel(id: string | null | undefined, type: IdType): SecurityLevel {
  if (!id || typeof id !== 'string') {
    return 'none';
  }

  const length = id.length;

  switch (type) {
    case 'account':
      if (length >= 25) return 'high';
      if (length >= 15) return 'medium';
      if (length >= 8) return 'low';
      return 'none';

    case 'transaction':
      if (length >= 20) return 'high';
      if (length >= 12) return 'medium';
      if (length >= 8) return 'low';
      return 'none';

    case 'customer':
      if (length >= 15 || (id.includes('-') && length >= 10)) return 'medium';
      if (length >= 8) return 'low';
      return 'none';

    default:
      if (length >= 20) return 'high';
      if (length >= 12) return 'medium';
      if (length >= 6) return 'low';
      return 'none';
  }
}
