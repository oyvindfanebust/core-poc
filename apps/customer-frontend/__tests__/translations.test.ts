// Import translation files
import enTranslations from '../messages/en.json';
import noTranslations from '../messages/no.json';
import srTranslations from '../messages/sr.json';

describe('Translation Completeness', () => {
  // Helper function to get all keys from nested object
  function getAllKeys(obj: any, prefix = ''): string[] {
    let keys: string[] = [];
    
    for (const key in obj) {
      const currentKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        // Recursively get keys from nested objects
        keys = keys.concat(getAllKeys(obj[key], currentKey));
      } else {
        // This is a leaf node (actual translation)
        keys.push(currentKey);
      }
    }
    
    return keys.sort();
  }

  // Helper function to check if all keys exist in target object
  function hasAllKeys(sourceKeys: string[], targetObj: any): { missing: string[], extra: string[] } {
    const targetKeys = getAllKeys(targetObj);
    const missing = sourceKeys.filter(key => !targetKeys.includes(key));
    const extra = targetKeys.filter(key => !sourceKeys.includes(key));
    return { missing, extra };
  }

  // Helper function to check for placeholder consistency
  function checkPlaceholders(sourceObj: any, targetObj: any): string[] {
    const issues: string[] = [];
    const sourceKeys = getAllKeys(sourceObj);
    
    sourceKeys.forEach(key => {
      const sourceValue = getNestedValue(sourceObj, key);
      const targetValue = getNestedValue(targetObj, key);
      
      if (typeof sourceValue === 'string' && typeof targetValue === 'string') {
        // Extract placeholders like {name}, {{value}}, etc.
        const sourcePlaceholders = (sourceValue.match(/\{[^}]+\}/g) || []).sort();
        const targetPlaceholders = (targetValue.match(/\{[^}]+\}/g) || []).sort();
        
        if (JSON.stringify(sourcePlaceholders) !== JSON.stringify(targetPlaceholders)) {
          issues.push(`${key}: placeholder mismatch - source: ${sourcePlaceholders.join(', ')}, target: ${targetPlaceholders.join(', ')}`);
        }
      }
    });
    
    return issues;
  }

  // Helper function to get nested value from object using dot notation
  function getNestedValue(obj: any, key: string): any {
    return key.split('.').reduce((o, k) => o?.[k], obj);
  }

  describe('Key Consistency', () => {
    const englishKeys = getAllKeys(enTranslations);

    it('should have all English keys in Norwegian translations', () => {
      const { missing, extra } = hasAllKeys(englishKeys, noTranslations);
      
      if (missing.length > 0) {
        console.log('Missing Norwegian keys:', missing);
      }
      if (extra.length > 0) {
        console.log('Extra Norwegian keys (not in English):', extra);
      }
      
      expect(missing).toEqual([]);
      // Extra keys are allowed but worth noting
    });

    it('should have all English keys in Serbian translations', () => {
      const { missing, extra } = hasAllKeys(englishKeys, srTranslations);
      
      if (missing.length > 0) {
        console.log('Missing Serbian keys:', missing);
      }
      if (extra.length > 0) {
        console.log('Extra Serbian keys (not in English):', extra);
      }
      
      expect(missing).toEqual([]);
      // Extra keys are allowed but worth noting
    });

    it('should have consistent structure across all languages', () => {
      const englishStructure = JSON.stringify(getAllKeys(enTranslations));
      const norwegianStructure = JSON.stringify(getAllKeys(noTranslations));
      const serbianStructure = JSON.stringify(getAllKeys(srTranslations));

      expect(norwegianStructure).toBe(englishStructure);
      expect(serbianStructure).toBe(englishStructure);
    });
  });

  describe('Placeholder Consistency', () => {
    it('should have matching placeholders between English and Norwegian', () => {
      const issues = checkPlaceholders(enTranslations, noTranslations);
      
      if (issues.length > 0) {
        console.log('Norwegian placeholder issues:', issues);
      }
      
      expect(issues).toEqual([]);
    });

    it('should have matching placeholders between English and Serbian', () => {
      const issues = checkPlaceholders(enTranslations, srTranslations);
      
      if (issues.length > 0) {
        console.log('Serbian placeholder issues:', issues);
      }
      
      expect(issues).toEqual([]);
    });
  });

  describe('Translation Quality', () => {
    it('should not have empty translation values in Norwegian', () => {
      const emptyKeys = getAllKeys(noTranslations).filter(key => {
        const value = getNestedValue(noTranslations, key);
        return typeof value === 'string' && value.trim() === '';
      });

      if (emptyKeys.length > 0) {
        console.log('Empty Norwegian translations:', emptyKeys);
      }

      expect(emptyKeys).toEqual([]);
    });

    it('should not have empty translation values in Serbian', () => {
      const emptyKeys = getAllKeys(srTranslations).filter(key => {
        const value = getNestedValue(srTranslations, key);
        return typeof value === 'string' && value.trim() === '';
      });

      if (emptyKeys.length > 0) {
        console.log('Empty Serbian translations:', emptyKeys);
      }

      expect(emptyKeys).toEqual([]);
    });

    it('should not have untranslated English text in Norwegian', () => {
      const suspiciousKeys = getAllKeys(noTranslations).filter(key => {
        const norwegianValue = getNestedValue(noTranslations, key);
        const englishValue = getNestedValue(enTranslations, key);
        
        // Skip if not strings or if English value is very short
        if (typeof norwegianValue !== 'string' || typeof englishValue !== 'string' || englishValue.length < 3) {
          return false;
        }
        
        // Check if Norwegian translation is exactly the same as English (suspicious)
        return norwegianValue === englishValue;
      });

      if (suspiciousKeys.length > 0) {
        console.log('Potentially untranslated Norwegian keys:', suspiciousKeys);
      }

      // This is a warning, not a hard failure for now
      expect(suspiciousKeys.length).toBeLessThan(5);
    });

    it('should not have untranslated English text in Serbian', () => {
      const suspiciousKeys = getAllKeys(srTranslations).filter(key => {
        const serbianValue = getNestedValue(srTranslations, key);
        const englishValue = getNestedValue(enTranslations, key);
        
        // Skip if not strings or if English value is very short
        if (typeof serbianValue !== 'string' || typeof englishValue !== 'string' || englishValue.length < 3) {
          return false;
        }
        
        // Check if Serbian translation is exactly the same as English (suspicious)
        return serbianValue === englishValue;
      });

      if (suspiciousKeys.length > 0) {
        console.log('Potentially untranslated Serbian keys:', suspiciousKeys);
      }

      // This is a warning, not a hard failure for now
      expect(suspiciousKeys.length).toBeLessThan(5);
    });
  });

  describe('New UX Improvement Keys', () => {
    const requiredNewKeys = [
      'accountDetails.viewFullId',
      'accountDetails.transactionReference',
      'accountDetails.viewDetails',
      'accountDetails.accountNickname',
      'transactions.categories.transfer',
      'transactions.categories.deposit',
      'transactions.categories.withdrawal',
      'transactions.categories.payment',
      'transactions.status.completed',
      'transactions.status.pending',
      'transactions.status.failed',
      'tooltips.accountId',
      'tooltips.transactionId',
      'tooltips.balance'
    ];

    it('should have all required new UX keys in English', () => {
      const englishKeys = getAllKeys(enTranslations);
      const missingKeys = requiredNewKeys.filter(key => !englishKeys.includes(key));
      
      if (missingKeys.length > 0) {
        console.log('Missing required English keys:', missingKeys);
      }
      
      expect(missingKeys).toEqual([]);
    });

    it('should have all required new UX keys in Norwegian', () => {
      const norwegianKeys = getAllKeys(noTranslations);
      const missingKeys = requiredNewKeys.filter(key => !norwegianKeys.includes(key));
      
      if (missingKeys.length > 0) {
        console.log('Missing required Norwegian keys:', missingKeys);
      }
      
      expect(missingKeys).toEqual([]);
    });

    it('should have all required new UX keys in Serbian', () => {
      const serbianKeys = getAllKeys(srTranslations);
      const missingKeys = requiredNewKeys.filter(key => !serbianKeys.includes(key));
      
      if (missingKeys.length > 0) {
        console.log('Missing required Serbian keys:', missingKeys);
      }
      
      expect(missingKeys).toEqual([]);
    });
  });
});