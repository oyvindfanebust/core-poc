import {
  validateIBAN,
  validateBIC,
  validateSEPAIBAN,
  extractCountryFromIBAN,
  isSEPACountry,
  getIBANCountryInfo,
  normalizeIBAN,
  normalizeBIC,
} from '../iban-validation';

describe('IBAN Validation', () => {
  describe('validateIBAN', () => {
    it('should validate correct IBANs', () => {
      // Valid IBANs from different countries
      expect(validateIBAN('DE89370400440532013000')).toBe(true); // Germany
      expect(validateIBAN('NO9386011117947')).toBe(true); // Norway
      expect(validateIBAN('FR1420041010050500013M02606')).toBe(true); // France
      expect(validateIBAN('GB29NWBK60161331926819')).toBe(true); // UK
      expect(validateIBAN('SE4550000000058398257466')).toBe(true); // Sweden
      expect(validateIBAN('DK5000400440116243')).toBe(true); // Denmark
    });

    it('should validate IBANs with spaces', () => {
      expect(validateIBAN('DE89 3704 0044 0532 0130 00')).toBe(true);
      expect(validateIBAN('NO93 8601 1117 947')).toBe(true);
    });

    it('should validate lowercase IBANs', () => {
      expect(validateIBAN('de89370400440532013000')).toBe(true);
      expect(validateIBAN('no9386011117947')).toBe(true);
    });

    it('should reject invalid IBANs', () => {
      expect(validateIBAN('DE89370400440532013001')).toBe(false); // Wrong checksum
      expect(validateIBAN('NO9386011117948')).toBe(false); // Wrong checksum
      expect(validateIBAN('XX1234567890123456')).toBe(false); // Unknown country
      expect(validateIBAN('DE893704004405320130')).toBe(false); // Wrong length
      expect(validateIBAN('DE8937040044053201300000')).toBe(false); // Too long
      expect(validateIBAN('')).toBe(false); // Empty
      expect(validateIBAN('INVALID')).toBe(false); // Invalid format
    });

    it('should reject IBANs with invalid characters', () => {
      expect(validateIBAN('DE89370400440532013@00')).toBe(false);
      expect(validateIBAN('DE89-3704-0044-0532-0130-00')).toBe(false);
    });
  });

  describe('validateBIC', () => {
    it('should validate correct BICs', () => {
      expect(validateBIC('DEUTDEFF')).toBe(true); // 8 characters
      expect(validateBIC('DEUTDEFF500')).toBe(true); // 11 characters
      expect(validateBIC('BNPAFRPP')).toBe(true);
      expect(validateBIC('DNBANOKK')).toBe(true);
    });

    it('should validate BICs with spaces', () => {
      expect(validateBIC('DEUT DEFF')).toBe(true);
      expect(validateBIC('DEUT DEFF 500')).toBe(true);
    });

    it('should validate lowercase BICs', () => {
      expect(validateBIC('deutdeff')).toBe(true);
      expect(validateBIC('deutdeff500')).toBe(true);
    });

    it('should accept empty BIC (optional)', () => {
      expect(validateBIC('')).toBe(true);
      expect(validateBIC(undefined as unknown as string)).toBe(true);
    });

    it('should reject invalid BICs', () => {
      expect(validateBIC('DEUT')).toBe(false); // Too short
      expect(validateBIC('DEUTDE')).toBe(false); // Too short
      expect(validateBIC('DEUTDEFF5')).toBe(false); // Invalid length (9)
      expect(validateBIC('DEUTDEFF50')).toBe(false); // Invalid length (10)
      expect(validateBIC('DEUTDEFF5000')).toBe(false); // Too long
      expect(validateBIC('12345678')).toBe(false); // Numbers in bank code
      expect(validateBIC('DEUT12FF')).toBe(false); // Numbers in country code
    });
  });

  describe('validateSEPAIBAN', () => {
    it('should validate SEPA IBANs', () => {
      const result1 = validateSEPAIBAN('DE89370400440532013000');
      expect(result1.isValid).toBe(true);
      expect(result1.error).toBeUndefined();

      const result2 = validateSEPAIBAN('NO9386011117947');
      expect(result2.isValid).toBe(true);
      expect(result2.error).toBeUndefined();
    });

    it('should validate SEPA countries correctly', () => {
      // Test with valid SEPA IBAN
      const validSepaResult = validateSEPAIBAN('DE89370400440532013000');
      expect(validSepaResult.isValid).toBe(true);

      // Test with invalid IBAN to ensure error handling
      const invalidResult = validateSEPAIBAN('DE89370400440532013001'); // Invalid checksum
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toBe('Invalid IBAN format or checksum');
    });

    it('should reject invalid IBANs', () => {
      const result = validateSEPAIBAN('DE89370400440532013001'); // Invalid checksum
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid IBAN format or checksum');
    });
  });

  describe('extractCountryFromIBAN', () => {
    it('should extract country codes correctly', () => {
      expect(extractCountryFromIBAN('DE89370400440532013000')).toBe('DE');
      expect(extractCountryFromIBAN('NO9386011117947')).toBe('NO');
      expect(extractCountryFromIBAN('fr1420041010050500013m02606')).toBe('FR');
      expect(extractCountryFromIBAN('GB29 NWBK 6016 1331 9268 19')).toBe('GB');
    });

    it('should handle empty input', () => {
      expect(extractCountryFromIBAN('')).toBe('');
    });
  });

  describe('isSEPACountry', () => {
    it('should identify SEPA countries', () => {
      expect(isSEPACountry('DE')).toBe(true); // Germany
      expect(isSEPACountry('NO')).toBe(true); // Norway
      expect(isSEPACountry('FR')).toBe(true); // France
      expect(isSEPACountry('SE')).toBe(true); // Sweden
      expect(isSEPACountry('DK')).toBe(true); // Denmark
      expect(isSEPACountry('CH')).toBe(true); // Switzerland
    });

    it('should identify non-SEPA countries', () => {
      expect(isSEPACountry('US')).toBe(false); // United States
      expect(isSEPACountry('BR')).toBe(false); // Brazil
      expect(isSEPACountry('JP')).toBe(false); // Japan
      expect(isSEPACountry('CA')).toBe(false); // Canada
      expect(isSEPACountry('AU')).toBe(false); // Australia
    });

    it('should handle case insensitive input', () => {
      expect(isSEPACountry('de')).toBe(true);
      expect(isSEPACountry('De')).toBe(true);
      expect(isSEPACountry('dE')).toBe(true);
    });
  });

  describe('getIBANCountryInfo', () => {
    it('should provide country information for valid countries', () => {
      const info = getIBANCountryInfo('DE89370400440532013000');
      expect(info).toEqual({
        countryCode: 'DE',
        expectedLength: 22,
        isValid: true,
      });
    });

    it('should handle invalid country codes', () => {
      const info = getIBANCountryInfo('XX1234567890123456');
      expect(info).toBeNull();
    });

    it('should detect length mismatches', () => {
      const info = getIBANCountryInfo('DE8937040044053201300'); // Too short
      expect(info).toEqual({
        countryCode: 'DE',
        expectedLength: 22,
        isValid: false,
      });
    });
  });

  describe('normalizeIBAN', () => {
    it('should normalize IBANs', () => {
      expect(normalizeIBAN('de89 3704 0044 0532 0130 00')).toBe('DE89370400440532013000');
      expect(normalizeIBAN('NO93 8601 1117 947')).toBe('NO9386011117947');
      expect(normalizeIBAN('FR14 2004 1010 0505 0001 3M02 606')).toBe(
        'FR1420041010050500013M02606',
      );
    });
  });

  describe('normalizeBIC', () => {
    it('should normalize BICs', () => {
      expect(normalizeBIC('deut deff')).toBe('DEUTDEFF');
      expect(normalizeBIC('bnpa frpp 123')).toBe('BNPAFRPP123');
      expect(normalizeBIC('DNBA NOKK')).toBe('DNBANOKK');
    });
  });

  describe('Real-world edge cases', () => {
    it('should handle special country formats', () => {
      // Monaco uses France's IBAN format
      expect(validateIBAN('MC5811222000010123456789030')).toBe(true);

      // San Marino uses Italy's IBAN format
      expect(validateIBAN('SM86U0322509800000000270100')).toBe(true);
    });

    it('should handle countries with specific prefixes', () => {
      // Mauritania has fixed prefix MR13
      expect(validateIBAN('MR1300020001010000123456753')).toBe(true);

      // Tunisia has fixed prefix TN59
      expect(validateIBAN('TN5910006035183598478831')).toBe(true);
    });

    it('should validate complex alphanumeric IBANs', () => {
      // Italy with alphanumeric format
      expect(validateIBAN('IT60X0542811101000000123456')).toBe(true);

      // Malta with complex format
      expect(validateIBAN('MT84MALT011000012345MTLCAST001S')).toBe(true);
    });
  });
});
