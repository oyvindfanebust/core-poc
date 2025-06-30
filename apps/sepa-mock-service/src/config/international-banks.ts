export interface InternationalBank {
  id: string;
  name: string;
  swiftCode: string;
  city: string;
  country: string;
  countryCode: string;
  bankType: 'Central Bank' | 'Commercial Bank' | 'Investment Bank' | 'Regional Bank';
  currencies: string[];
  correspondentBank?: string;
  timezone?: string;
}

export const INTERNATIONAL_BANKS: InternationalBank[] = [
  // Major Global Banks - US
  {
    id: 'jpmorgan-chase-global',
    name: 'JPMorgan Chase Bank',
    swiftCode: 'CHASUS33',
    city: 'New York',
    country: 'United States',
    countryCode: 'US',
    bankType: 'Commercial Bank',
    currencies: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'],
    timezone: 'America/New_York',
  },
  {
    id: 'bank-of-america-global',
    name: 'Bank of America',
    swiftCode: 'BOFAUS3N',
    city: 'Charlotte',
    country: 'United States',
    countryCode: 'US',
    bankType: 'Commercial Bank',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    timezone: 'America/New_York',
  },
  {
    id: 'wells-fargo-global',
    name: 'Wells Fargo Bank',
    swiftCode: 'WFBIUS6S',
    city: 'San Francisco',
    country: 'United States',
    countryCode: 'US',
    bankType: 'Commercial Bank',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'MXN'],
    timezone: 'America/Los_Angeles',
  },

  // European Banks
  {
    id: 'deutsche-bank',
    name: 'Deutsche Bank AG',
    swiftCode: 'DEUTDEFF',
    city: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    bankType: 'Commercial Bank',
    currencies: ['EUR', 'USD', 'GBP', 'CHF', 'JPY'],
    timezone: 'Europe/Berlin',
  },
  {
    id: 'hsbc-london',
    name: 'HSBC Bank PLC',
    swiftCode: 'HBUKGB4B',
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    bankType: 'Commercial Bank',
    currencies: ['GBP', 'USD', 'EUR', 'HKD', 'AUD', 'CAD'],
    timezone: 'Europe/London',
  },
  {
    id: 'bnp-paribas',
    name: 'BNP Paribas',
    swiftCode: 'BNPAFRPP',
    city: 'Paris',
    country: 'France',
    countryCode: 'FR',
    bankType: 'Commercial Bank',
    currencies: ['EUR', 'USD', 'GBP', 'CHF'],
    timezone: 'Europe/Paris',
  },
  {
    id: 'ubs-switzerland',
    name: 'UBS Switzerland AG',
    swiftCode: 'UBSWCHZH',
    city: 'Zurich',
    country: 'Switzerland',
    countryCode: 'CH',
    bankType: 'Commercial Bank',
    currencies: ['CHF', 'EUR', 'USD', 'GBP'],
    timezone: 'Europe/Zurich',
  },
  {
    id: 'ing-netherlands',
    name: 'ING Bank N.V.',
    swiftCode: 'INGBNL2A',
    city: 'Amsterdam',
    country: 'Netherlands',
    countryCode: 'NL',
    bankType: 'Commercial Bank',
    currencies: ['EUR', 'USD', 'GBP'],
    timezone: 'Europe/Amsterdam',
  },

  // Nordic Banks
  {
    id: 'danske-bank',
    name: 'Danske Bank A/S',
    swiftCode: 'DABADKKK',
    city: 'Copenhagen',
    country: 'Denmark',
    countryCode: 'DK',
    bankType: 'Commercial Bank',
    currencies: ['DKK', 'EUR', 'USD', 'SEK', 'NOK'],
    timezone: 'Europe/Copenhagen',
  },
  {
    id: 'swedbank',
    name: 'Swedbank AB',
    swiftCode: 'SWEDSESS',
    city: 'Stockholm',
    country: 'Sweden',
    countryCode: 'SE',
    bankType: 'Commercial Bank',
    currencies: ['SEK', 'EUR', 'USD', 'NOK', 'DKK'],
    timezone: 'Europe/Stockholm',
  },
  {
    id: 'dnb-norway',
    name: 'DNB Bank ASA',
    swiftCode: 'DNBANOKKXXX',
    city: 'Oslo',
    country: 'Norway',
    countryCode: 'NO',
    bankType: 'Commercial Bank',
    currencies: ['NOK', 'EUR', 'USD', 'SEK', 'DKK'],
    timezone: 'Europe/Oslo',
  },

  // Asian Banks
  {
    id: 'mitsubishi-ufj',
    name: 'Mitsubishi UFJ Financial Group',
    swiftCode: 'BOTKJPJT',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    bankType: 'Commercial Bank',
    currencies: ['JPY', 'USD', 'EUR', 'GBP', 'AUD'],
    timezone: 'Asia/Tokyo',
  },
  {
    id: 'sumitomo-mitsui',
    name: 'Sumitomo Mitsui Banking Corporation',
    swiftCode: 'SMBCJPJT',
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    bankType: 'Commercial Bank',
    currencies: ['JPY', 'USD', 'EUR'],
    timezone: 'Asia/Tokyo',
  },
  {
    id: 'dbs-singapore',
    name: 'DBS Bank Ltd',
    swiftCode: 'DBSSSGSG',
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    bankType: 'Commercial Bank',
    currencies: ['SGD', 'USD', 'EUR', 'GBP', 'AUD', 'HKD'],
    timezone: 'Asia/Singapore',
  },
  {
    id: 'hsbc-hong-kong',
    name: 'HSBC Hong Kong',
    swiftCode: 'HSBCHKHH',
    city: 'Hong Kong',
    country: 'Hong Kong',
    countryCode: 'HK',
    bankType: 'Commercial Bank',
    currencies: ['HKD', 'USD', 'EUR', 'GBP', 'AUD', 'JPY'],
    timezone: 'Asia/Hong_Kong',
  },

  // Australian/Canadian Banks
  {
    id: 'commonwealth-bank',
    name: 'Commonwealth Bank of Australia',
    swiftCode: 'CTBAAU2S',
    city: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    bankType: 'Commercial Bank',
    currencies: ['AUD', 'USD', 'EUR', 'GBP', 'NZD'],
    timezone: 'Australia/Sydney',
  },
  {
    id: 'royal-bank-canada',
    name: 'Royal Bank of Canada',
    swiftCode: 'ROYCCAT2',
    city: 'Toronto',
    country: 'Canada',
    countryCode: 'CA',
    bankType: 'Commercial Bank',
    currencies: ['CAD', 'USD', 'EUR', 'GBP'],
    timezone: 'America/Toronto',
  },
  {
    id: 'toronto-dominion',
    name: 'Toronto-Dominion Bank',
    swiftCode: 'TDOMCATTTOR',
    city: 'Toronto',
    country: 'Canada',
    countryCode: 'CA',
    bankType: 'Commercial Bank',
    currencies: ['CAD', 'USD', 'EUR'],
    timezone: 'America/Toronto',
  },

  // Emerging Markets
  {
    id: 'santander-spain',
    name: 'Banco Santander S.A.',
    swiftCode: 'BSCHESMM',
    city: 'Madrid',
    country: 'Spain',
    countryCode: 'ES',
    bankType: 'Commercial Bank',
    currencies: ['EUR', 'USD', 'GBP', 'BRL'],
    timezone: 'Europe/Madrid',
  },
  {
    id: 'standard-bank-sa',
    name: 'Standard Bank of South Africa',
    swiftCode: 'SBZAZAJJ',
    city: 'Johannesburg',
    country: 'South Africa',
    countryCode: 'ZA',
    bankType: 'Commercial Bank',
    currencies: ['ZAR', 'USD', 'EUR', 'GBP'],
    timezone: 'Africa/Johannesburg',
  },

  // Investment Banks
  {
    id: 'goldman-sachs-intl',
    name: 'Goldman Sachs International',
    swiftCode: 'GSILGB2L',
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    bankType: 'Investment Bank',
    currencies: ['USD', 'EUR', 'GBP', 'JPY'],
    correspondentBank: 'Federal Reserve Bank of New York',
    timezone: 'Europe/London',
  },
  {
    id: 'morgan-stanley-intl',
    name: 'Morgan Stanley International',
    swiftCode: 'MSINUS33',
    city: 'New York',
    country: 'United States',
    countryCode: 'US',
    bankType: 'Investment Bank',
    currencies: ['USD', 'EUR', 'GBP', 'JPY', 'CHF'],
    timezone: 'America/New_York',
  },
];

// Helper functions
export const getBanksByCountry = (countryCode: string): InternationalBank[] => {
  return INTERNATIONAL_BANKS.filter(bank => bank.countryCode === countryCode);
};

export const getBanksByCurrency = (currency: string): InternationalBank[] => {
  return INTERNATIONAL_BANKS.filter(bank => bank.currencies.includes(currency));
};

export const getBankBySwiftCode = (swiftCode: string): InternationalBank | undefined => {
  return INTERNATIONAL_BANKS.find(bank => bank.swiftCode === swiftCode);
};

export const getBankById = (id: string): InternationalBank | undefined => {
  return INTERNATIONAL_BANKS.find(bank => bank.id === id);
};

export const getBanksByType = (bankType: InternationalBank['bankType']): InternationalBank[] => {
  return INTERNATIONAL_BANKS.filter(bank => bank.bankType === bankType);
};
