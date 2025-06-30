export interface MockBank {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  bic: string;
  currency: 'EUR' | 'NOK' | 'SEK' | 'DKK';
  ibanPrefix: string;
  description: string;
}

export const MOCK_BANKS: MockBank[] = [
  // Norwegian Banks
  {
    id: 'dnb-norway',
    name: 'DNB Bank ASA',
    country: 'Norway',
    countryCode: 'NO',
    bic: 'DNBANOKK',
    currency: 'NOK',
    ibanPrefix: 'NO93',
    description: 'Largest bank in Norway',
  },
  {
    id: 'nordea-norway',
    name: 'Nordea Bank Norge',
    country: 'Norway',
    countryCode: 'NO',
    bic: 'NDEANOKKXXX',
    currency: 'NOK',
    ibanPrefix: 'NO86',
    description: 'Nordic financial services group',
  },

  // Swedish Banks
  {
    id: 'swedbank',
    name: 'Swedbank AB',
    country: 'Sweden',
    countryCode: 'SE',
    bic: 'SWEDSESS',
    currency: 'SEK',
    ibanPrefix: 'SE45',
    description: 'Leading bank in Sweden and the Baltics',
  },
  {
    id: 'handelsbanken',
    name: 'Svenska Handelsbanken',
    country: 'Sweden',
    countryCode: 'SE',
    bic: 'HANDSESS',
    currency: 'SEK',
    ibanPrefix: 'SE35',
    description: 'One of the largest banks in the Nordic region',
  },

  // Danish Banks
  {
    id: 'danske-bank',
    name: 'Danske Bank A/S',
    country: 'Denmark',
    countryCode: 'DK',
    bic: 'DABADKKK',
    currency: 'DKK',
    ibanPrefix: 'DK50',
    description: 'Largest bank in Denmark',
  },
  {
    id: 'jyske-bank',
    name: 'Jyske Bank A/S',
    country: 'Denmark',
    countryCode: 'DK',
    bic: 'JYBADKKK',
    currency: 'DKK',
    ibanPrefix: 'DK89',
    description: 'Danish commercial bank',
  },

  // Eurozone Banks
  {
    id: 'deutsche-bank',
    name: 'Deutsche Bank AG',
    country: 'Germany',
    countryCode: 'DE',
    bic: 'DEUTDEFF',
    currency: 'EUR',
    ibanPrefix: 'DE89',
    description: 'German multinational investment bank',
  },
  {
    id: 'bnp-paribas',
    name: 'BNP Paribas',
    country: 'France',
    countryCode: 'FR',
    bic: 'BNPAFRPP',
    currency: 'EUR',
    ibanPrefix: 'FR14',
    description: 'French international banking group',
  },
  {
    id: 'ing-bank',
    name: 'ING Bank N.V.',
    country: 'Netherlands',
    countryCode: 'NL',
    bic: 'INGBNL2A',
    currency: 'EUR',
    ibanPrefix: 'NL91',
    description: 'Dutch multinational banking corporation',
  },
  {
    id: 'santander',
    name: 'Banco Santander S.A.',
    country: 'Spain',
    countryCode: 'ES',
    bic: 'BSCHESMM',
    currency: 'EUR',
    ibanPrefix: 'ES91',
    description: 'Spanish multinational commercial bank',
  },
];

// Helper function to generate realistic IBAN for a bank
export function generateIBAN(bank: MockBank): string {
  // Generate random account number (simplified)
  const accountNumber = Math.floor(Math.random() * 1000000000000)
    .toString()
    .padStart(12, '0');

  // Simple IBAN generation (in real implementation, would include proper checksum)
  switch (bank.countryCode) {
    case 'NO':
      return `${bank.ibanPrefix}${accountNumber}`;
    case 'SE':
      return `${bank.ibanPrefix}${accountNumber}`;
    case 'DK':
      return `${bank.ibanPrefix}${accountNumber}`;
    case 'DE':
    case 'FR':
    case 'NL':
    case 'ES':
      return `${bank.ibanPrefix}${accountNumber}`;
    default:
      return `${bank.ibanPrefix}${accountNumber}`;
  }
}

// Helper function to get banks by currency
export function getBanksByCurrency(currency: 'EUR' | 'NOK' | 'SEK' | 'DKK'): MockBank[] {
  return MOCK_BANKS.filter(bank => bank.currency === currency);
}

// Helper function to get bank by ID
export function getBankById(id: string): MockBank | undefined {
  return MOCK_BANKS.find(bank => bank.id === id);
}
