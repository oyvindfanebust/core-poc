/**
 * Server-side IBAN and BIC validation utilities
 * Implements proper mod-97 checksum validation according to ISO 13616
 * This is a server-side version for use in domain services and API validation
 */

// IBAN country specifications (length and format)
const IBAN_COUNTRY_SPECS: Record<string, { length: number; format: string }> = {
  AD: { length: 24, format: 'AD\\d{2}\\d{4}\\d{4}\\d{12}' },
  AE: { length: 23, format: 'AE\\d{2}\\d{3}\\d{16}' },
  AL: { length: 28, format: 'AL\\d{2}\\d{8}[A-Z0-9]{16}' },
  AT: { length: 20, format: 'AT\\d{2}\\d{5}\\d{11}' },
  AZ: { length: 28, format: 'AZ\\d{2}[A-Z]{4}[A-Z0-9]{20}' },
  BA: { length: 20, format: 'BA\\d{2}\\d{3}\\d{3}\\d{8}\\d{2}' },
  BE: { length: 16, format: 'BE\\d{2}\\d{3}\\d{7}\\d{2}' },
  BG: { length: 22, format: 'BG\\d{2}[A-Z]{4}\\d{4}\\d{2}[A-Z0-9]{8}' },
  BH: { length: 22, format: 'BH\\d{2}[A-Z]{4}[A-Z0-9]{14}' },
  BR: { length: 29, format: 'BR\\d{2}\\d{8}\\d{5}\\d{10}[A-Z]{1}[A-Z0-9]{1}' },
  BY: { length: 28, format: 'BY\\d{2}[A-Z0-9]{4}\\d{4}[A-Z0-9]{16}' },
  CH: { length: 21, format: 'CH\\d{2}\\d{5}[A-Z0-9]{12}' },
  CR: { length: 22, format: 'CR\\d{2}\\d{4}\\d{14}' },
  CY: { length: 28, format: 'CY\\d{2}\\d{3}\\d{5}[A-Z0-9]{16}' },
  CZ: { length: 24, format: 'CZ\\d{2}\\d{4}\\d{6}\\d{10}' },
  DE: { length: 22, format: 'DE\\d{2}\\d{8}\\d{10}' },
  DK: { length: 18, format: 'DK\\d{2}\\d{4}\\d{9}\\d{1}' },
  DO: { length: 28, format: 'DO\\d{2}[A-Z0-9]{4}\\d{20}' },
  EE: { length: 20, format: 'EE\\d{2}\\d{2}\\d{2}\\d{11}\\d{1}' },
  EG: { length: 29, format: 'EG\\d{2}\\d{4}\\d{4}\\d{17}' },
  ES: { length: 24, format: 'ES\\d{2}\\d{4}\\d{4}\\d{1}\\d{1}\\d{10}' },
  FI: { length: 18, format: 'FI\\d{2}\\d{6}\\d{7}\\d{1}' },
  FO: { length: 18, format: 'FO\\d{2}\\d{4}\\d{9}\\d{1}' },
  FR: { length: 27, format: 'FR\\d{2}\\d{5}\\d{5}[A-Z0-9]{11}\\d{2}' },
  GB: { length: 22, format: 'GB\\d{2}[A-Z]{4}\\d{6}\\d{8}' },
  GE: { length: 22, format: 'GE\\d{2}[A-Z]{2}\\d{16}' },
  GI: { length: 23, format: 'GI\\d{2}[A-Z]{4}[A-Z0-9]{15}' },
  GL: { length: 18, format: 'GL\\d{2}\\d{4}\\d{9}\\d{1}' },
  GR: { length: 27, format: 'GR\\d{2}\\d{3}\\d{4}[A-Z0-9]{16}' },
  GT: { length: 28, format: 'GT\\d{2}[A-Z0-9]{4}[A-Z0-9]{20}' },
  HR: { length: 21, format: 'HR\\d{2}\\d{7}\\d{10}' },
  HU: { length: 28, format: 'HU\\d{2}\\d{3}\\d{4}\\d{1}\\d{15}\\d{1}' },
  IE: { length: 22, format: 'IE\\d{2}[A-Z]{4}\\d{6}\\d{8}' },
  IL: { length: 23, format: 'IL\\d{2}\\d{3}\\d{3}\\d{13}' },
  IS: { length: 26, format: 'IS\\d{2}\\d{4}\\d{2}\\d{6}\\d{10}' },
  IT: { length: 27, format: 'IT\\d{2}[A-Z]{1}\\d{5}\\d{5}[A-Z0-9]{12}' },
  JO: { length: 30, format: 'JO\\d{2}[A-Z]{4}\\d{4}[A-Z0-9]{18}' },
  KW: { length: 30, format: 'KW\\d{2}[A-Z]{4}[A-Z0-9]{22}' },
  KZ: { length: 20, format: 'KZ\\d{2}\\d{3}[A-Z0-9]{13}' },
  LB: { length: 28, format: 'LB\\d{2}\\d{4}[A-Z0-9]{20}' },
  LC: { length: 32, format: 'LC\\d{2}[A-Z]{4}[A-Z0-9]{24}' },
  LI: { length: 21, format: 'LI\\d{2}\\d{5}[A-Z0-9]{12}' },
  LT: { length: 20, format: 'LT\\d{2}\\d{5}\\d{11}' },
  LU: { length: 20, format: 'LU\\d{2}\\d{3}[A-Z0-9]{13}' },
  LV: { length: 21, format: 'LV\\d{2}[A-Z]{4}[A-Z0-9]{13}' },
  MC: { length: 27, format: 'MC\\d{2}\\d{5}\\d{5}[A-Z0-9]{11}\\d{2}' },
  MD: { length: 24, format: 'MD\\d{2}[A-Z0-9]{2}[A-Z0-9]{18}' },
  ME: { length: 22, format: 'ME\\d{2}\\d{3}\\d{13}\\d{2}' },
  MK: { length: 19, format: 'MK\\d{2}\\d{3}[A-Z0-9]{10}\\d{2}' },
  MR: { length: 27, format: 'MR13\\d{5}\\d{5}\\d{11}\\d{2}' },
  MT: { length: 31, format: 'MT\\d{2}[A-Z]{4}\\d{5}[A-Z0-9]{18}' },
  MU: { length: 30, format: 'MU\\d{2}[A-Z]{4}\\d{2}\\d{2}\\d{12}\\d{3}[A-Z]{3}' },
  NL: { length: 18, format: 'NL\\d{2}[A-Z]{4}\\d{10}' },
  NO: { length: 15, format: 'NO\\d{2}\\d{4}\\d{6}\\d{1}' },
  PK: { length: 24, format: 'PK\\d{2}[A-Z]{4}[A-Z0-9]{16}' },
  PL: { length: 28, format: 'PL\\d{2}\\d{8}[A-Z0-9]{16}' },
  PS: { length: 29, format: 'PS\\d{2}[A-Z]{4}[A-Z0-9]{21}' },
  PT: { length: 25, format: 'PT\\d{2}\\d{4}\\d{4}\\d{11}\\d{2}' },
  QA: { length: 29, format: 'QA\\d{2}[A-Z]{4}[A-Z0-9]{21}' },
  RO: { length: 24, format: 'RO\\d{2}[A-Z]{4}[A-Z0-9]{16}' },
  RS: { length: 22, format: 'RS\\d{2}\\d{3}\\d{13}\\d{2}' },
  SA: { length: 24, format: 'SA\\d{2}\\d{2}[A-Z0-9]{18}' },
  SE: { length: 24, format: 'SE\\d{2}\\d{3}\\d{16}\\d{1}' },
  SI: { length: 19, format: 'SI\\d{2}\\d{5}\\d{8}\\d{2}' },
  SK: { length: 24, format: 'SK\\d{2}\\d{4}\\d{6}\\d{10}' },
  SM: { length: 27, format: 'SM\\d{2}[A-Z]{1}\\d{5}\\d{5}[A-Z0-9]{12}' },
  TN: { length: 24, format: 'TN59\\d{2}\\d{3}\\d{13}\\d{2}' },
  TR: { length: 26, format: 'TR\\d{2}\\d{5}[A-Z0-9]{1}[A-Z0-9]{16}' },
  UA: { length: 29, format: 'UA\\d{2}\\d{6}[A-Z0-9]{19}' },
  VG: { length: 24, format: 'VG\\d{2}[A-Z]{4}\\d{16}' },
  XK: { length: 20, format: 'XK\\d{2}\\d{4}\\d{10}\\d{2}' },
};

/**
 * Character to number mapping for IBAN checksum calculation
 */
function charToNum(char: string): string {
  const code = char.charCodeAt(0);
  return code >= 65 && code <= 90 ? (code - 55).toString() : char;
}

/**
 * Perform mod-97 calculation for large numbers represented as strings
 */
function mod97(str: string): number {
  let remainder = '';
  for (let i = 0; i < str.length; i++) {
    remainder += str[i];
    if (remainder.length >= 9) {
      remainder = (parseInt(remainder, 10) % 97).toString();
    }
  }
  return parseInt(remainder, 10) % 97;
}

/**
 * Validate IBAN using proper checksum verification
 */
export function validateIBAN(iban: string): boolean {
  if (!iban) return false;

  // Remove spaces and convert to uppercase
  const cleanedIban = iban.replace(/\s/g, '').toUpperCase();

  // Basic format check
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanedIban)) {
    return false;
  }

  // Check country code and length
  const countryCode = cleanedIban.substring(0, 2);
  const countrySpec = IBAN_COUNTRY_SPECS[countryCode];

  if (!countrySpec) {
    return false; // Unknown country
  }

  if (cleanedIban.length !== countrySpec.length) {
    return false; // Invalid length for country
  }

  // Validate country-specific format
  const formatRegex = new RegExp(`^${countrySpec.format}$`);
  if (!formatRegex.test(cleanedIban)) {
    return false;
  }

  // Perform mod-97 checksum validation
  // Move first 4 characters to end and convert letters to numbers
  const rearranged = cleanedIban.substring(4) + cleanedIban.substring(0, 4);
  const numericString = rearranged.replace(/[A-Z]/g, charToNum);

  return mod97(numericString) === 1;
}

/**
 * Validate BIC (Bank Identifier Code) format
 */
export function validateBIC(bic: string): boolean {
  if (!bic) return true; // BIC is optional

  const cleanedBic = bic.replace(/\s/g, '').toUpperCase();

  // BIC format: 4 letters (bank code) + 2 letters (country code) + 2 alphanumeric (location) + optional 3 alphanumeric (branch)
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanedBic);
}

/**
 * Extract country code from IBAN
 */
export function extractCountryFromIBAN(iban: string): string {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  return cleaned.substring(0, 2);
}

/**
 * Check if IBAN country is within SEPA zone
 */
export function isSEPACountry(countryCode: string): boolean {
  const sepaCountries = [
    'AD',
    'AT',
    'BE',
    'BG',
    'CH',
    'CY',
    'CZ',
    'DE',
    'DK',
    'EE',
    'ES',
    'FI',
    'FR',
    'GB',
    'GI',
    'GR',
    'HR',
    'HU',
    'IE',
    'IS',
    'IT',
    'LI',
    'LT',
    'LU',
    'LV',
    'MC',
    'MT',
    'NL',
    'NO',
    'PL',
    'PT',
    'RO',
    'SE',
    'SI',
    'SK',
    'SM',
  ];
  return sepaCountries.includes(countryCode.toUpperCase());
}

/**
 * Validate IBAN specifically for SEPA transfers
 */
export function validateSEPAIBAN(iban: string): { isValid: boolean; error?: string } {
  if (!validateIBAN(iban)) {
    return { isValid: false, error: 'Invalid IBAN format or checksum' };
  }

  const countryCode = extractCountryFromIBAN(iban);
  if (!isSEPACountry(countryCode)) {
    return { isValid: false, error: 'IBAN country is not within SEPA zone' };
  }

  return { isValid: true };
}

/**
 * Get IBAN country information
 */
export function getIBANCountryInfo(
  iban: string,
): { countryCode: string; expectedLength: number; isValid: boolean } | null {
  const countryCode = extractCountryFromIBAN(iban);
  const countrySpec = IBAN_COUNTRY_SPECS[countryCode];

  if (!countrySpec) {
    return null;
  }

  const cleaned = iban.replace(/\s/g, '').toUpperCase();

  return {
    countryCode,
    expectedLength: countrySpec.length,
    isValid: cleaned.length === countrySpec.length,
  };
}

/**
 * Normalize IBAN for storage (remove spaces, uppercase)
 */
export function normalizeIBAN(iban: string): string {
  return iban.replace(/\s/g, '').toUpperCase();
}

/**
 * Normalize BIC for storage (remove spaces, uppercase)
 */
export function normalizeBIC(bic: string): string {
  return bic.replace(/\s/g, '').toUpperCase();
}

/**
 * Format IBAN with spaces for display
 */
export function formatIBAN(iban: string): string {
  const cleaned = normalizeIBAN(iban);
  return cleaned.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Get detailed IBAN information for display and validation
 */
export function getIBANDisplayInfo(iban: string): {
  isValid: boolean;
  isSEPA: boolean;
  countryCode: string;
  error?: string;
} {
  if (!iban) {
    return {
      isValid: false,
      isSEPA: false,
      countryCode: '',
      error: 'IBAN is required',
    };
  }

  const isValid = validateIBAN(iban);
  const countryCode = extractCountryFromIBAN(iban);
  const isSEPA = isSEPACountry(countryCode);

  if (!isValid) {
    return {
      isValid: false,
      isSEPA: false,
      countryCode,
      error: 'Invalid IBAN format or checksum',
    };
  }

  if (!isSEPA) {
    return {
      isValid: true,
      isSEPA: false,
      countryCode,
      error: 'Not a SEPA country',
    };
  }

  return {
    isValid: true,
    isSEPA: true,
    countryCode,
  };
}
