export interface USBank {
  id: string;
  name: string;
  routingNumber: string;
  city: string;
  state: string;
  bankType: 'Commercial' | 'Regional' | 'Community' | 'Credit Union';
  assets?: string; // Asset size category
}

export const US_BANKS: USBank[] = [
  // Major National Banks
  {
    id: 'jpmorgan-chase',
    name: 'JPMorgan Chase Bank',
    routingNumber: '021000021',
    city: 'New York',
    state: 'NY',
    bankType: 'Commercial',
    assets: '$3.7T',
  },
  {
    id: 'bank-of-america',
    name: 'Bank of America',
    routingNumber: '121000358',
    city: 'Charlotte',
    state: 'NC',
    bankType: 'Commercial',
    assets: '$3.2T',
  },
  {
    id: 'wells-fargo',
    name: 'Wells Fargo Bank',
    routingNumber: '121042882',
    city: 'San Francisco',
    state: 'CA',
    bankType: 'Commercial',
    assets: '$1.9T',
  },
  {
    id: 'citibank',
    name: 'Citibank',
    routingNumber: '021000089',
    city: 'New York',
    state: 'NY',
    bankType: 'Commercial',
    assets: '$1.7T',
  },
  {
    id: 'us-bank',
    name: 'U.S. Bank',
    routingNumber: '091000019',
    city: 'Minneapolis',
    state: 'MN',
    bankType: 'Commercial',
    assets: '$668B',
  },
  {
    id: 'pnc-bank',
    name: 'PNC Bank',
    routingNumber: '043000096',
    city: 'Pittsburgh',
    state: 'PA',
    bankType: 'Commercial',
    assets: '$554B',
  },
  {
    id: 'truist-bank',
    name: 'Truist Bank',
    routingNumber: '053000196',
    city: 'Charlotte',
    state: 'NC',
    bankType: 'Commercial',
    assets: '$547B',
  },
  {
    id: 'goldman-sachs',
    name: 'Goldman Sachs Bank USA',
    routingNumber: '124085244',
    city: 'New York',
    state: 'NY',
    bankType: 'Commercial',
    assets: '$426B',
  },

  // Regional Banks
  {
    id: 'td-bank',
    name: 'TD Bank',
    routingNumber: '031101266',
    city: 'Cherry Hill',
    state: 'NJ',
    bankType: 'Regional',
    assets: '$388B',
  },
  {
    id: 'capital-one',
    name: 'Capital One Bank',
    routingNumber: '051405515',
    city: 'McLean',
    state: 'VA',
    bankType: 'Regional',
    assets: '$469B',
  },
  {
    id: 'regions-bank',
    name: 'Regions Bank',
    routingNumber: '062000019',
    city: 'Birmingham',
    state: 'AL',
    bankType: 'Regional',
    assets: '$162B',
  },
  {
    id: 'fifth-third',
    name: 'Fifth Third Bank',
    routingNumber: '042000314',
    city: 'Cincinnati',
    state: 'OH',
    bankType: 'Regional',
    assets: '$207B',
  },
  {
    id: 'comerica',
    name: 'Comerica Bank',
    routingNumber: '072000096',
    city: 'Dallas',
    state: 'TX',
    bankType: 'Regional',
    assets: '$89B',
  },
  {
    id: 'first-horizon',
    name: 'First Horizon Bank',
    routingNumber: '084000026',
    city: 'Memphis',
    state: 'TN',
    bankType: 'Regional',
    assets: '$81B',
  },

  // Community Banks
  {
    id: 'first-republic',
    name: 'First Republic Bank',
    routingNumber: '121140399',
    city: 'San Francisco',
    state: 'CA',
    bankType: 'Community',
    assets: '$213B',
  },
  {
    id: 'eastern-bank',
    name: 'Eastern Bank',
    routingNumber: '011075150',
    city: 'Boston',
    state: 'MA',
    bankType: 'Community',
    assets: '$15B',
  },
  {
    id: 'pacific-premier',
    name: 'Pacific Premier Bank',
    routingNumber: '122242843',
    city: 'Irvine',
    state: 'CA',
    bankType: 'Community',
    assets: '$20B',
  },
  {
    id: 'first-national-omaha',
    name: 'First National Bank of Omaha',
    routingNumber: '104000016',
    city: 'Omaha',
    state: 'NE',
    bankType: 'Community',
    assets: '$27B',
  },

  // Credit Unions
  {
    id: 'navy-federal',
    name: 'Navy Federal Credit Union',
    routingNumber: '256074974',
    city: 'Vienna',
    state: 'VA',
    bankType: 'Credit Union',
    assets: '$165B',
  },
  {
    id: 'state-employees',
    name: 'State Employees Credit Union',
    routingNumber: '253177049',
    city: 'Raleigh',
    state: 'NC',
    bankType: 'Credit Union',
    assets: '$50B',
  },
  {
    id: 'pentagon-federal',
    name: 'Pentagon Federal Credit Union',
    routingNumber: '256077513',
    city: 'McLean',
    state: 'VA',
    bankType: 'Credit Union',
    assets: '$33B',
  },
  {
    id: 'boeing-employees',
    name: 'Boeing Employees Credit Union',
    routingNumber: '325081403',
    city: 'Tukwila',
    state: 'WA',
    bankType: 'Credit Union',
    assets: '$24B',
  },
];

// Helper functions
export const getBanksByState = (state: string): USBank[] => {
  return US_BANKS.filter(bank => bank.state === state);
};

export const getBanksByType = (bankType: USBank['bankType']): USBank[] => {
  return US_BANKS.filter(bank => bank.bankType === bankType);
};

export const getBankByRoutingNumber = (routingNumber: string): USBank | undefined => {
  return US_BANKS.find(bank => bank.routingNumber === routingNumber);
};

export const getBankById = (id: string): USBank | undefined => {
  return US_BANKS.find(bank => bank.id === id);
};
