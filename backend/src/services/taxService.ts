import TaxConfig from '../models/TaxConfig';

interface TaxRates {
  epfEmployee: number;
  epfEmployer: number;
  etf: number;
  stampFee: number;
  apitBrackets: { minIncome: number; maxIncome: number | null; rate: number }[];
}

export async function getActiveTaxRates(): Promise<TaxRates> {
  const now = new Date();
  
  // Fetch all active tax configs
  const configs = await TaxConfig.find({
    isActive: true,
    applicableFrom: { $lte: now },
    $or: [
      { applicableTo: { $exists: false } },
      { applicableTo: null },
      { applicableTo: { $gte: now } }
    ]
  }).lean();

  const rates: TaxRates = {
    epfEmployee: 8,
    epfEmployer: 12,
    etf: 3,
    stampFee: 25,
    apitBrackets: []
  };

  // Extract rates from configs
  for (const config of configs) {
    switch (config.taxType) {
      case 'epf_employee':
        rates.epfEmployee = config.rate || 8;
        break;
      case 'epf_employer':
        rates.epfEmployer = config.rate || 12;
        break;
      case 'etf':
        rates.etf = config.rate || 3;
        break;
      case 'stamp_fee':
        rates.stampFee = config.rate || 25;
        break;
      case 'apit':
        if (config.brackets && config.brackets.length > 0) {
          rates.apitBrackets = config.brackets.map((b: any) => ({
            minIncome: b.minIncome,
            maxIncome: b.maxIncome || null,
            rate: b.rate
          }));
        }
        break;
    }
  }

  // If no APIT brackets found in DB, use default Sri Lankan APIT brackets
  if (rates.apitBrackets.length === 0) {
    rates.apitBrackets = [
      { minIncome: 0, maxIncome: 100000, rate: 0 },
      { minIncome: 100000, maxIncome: 141667, rate: 6 },
      { minIncome: 141667, maxIncome: 183333, rate: 12 },
      { minIncome: 183333, maxIncome: 225000, rate: 18 },
      { minIncome: 225000, maxIncome: 266667, rate: 24 },
      { minIncome: 266667, maxIncome: 308333, rate: 30 },
      { minIncome: 308333, maxIncome: null, rate: 36 }
    ];
  }

  return rates;
}

export function calculateAPIT(grossSalary: number, brackets: { minIncome: number; maxIncome: number | null; rate: number }[]): number {
  let totalTax = 0;
  let previousMax = 0;
  
  for (const bracket of brackets) {
    // Skip if gross salary doesn't reach this bracket
    if (grossSalary <= previousMax) {
      break;
    }
    
    // Calculate income that falls within this bracket
    const upperBound = bracket.maxIncome ? Math.min(grossSalary, bracket.maxIncome) : grossSalary;
    const lowerBound = previousMax;
    const taxableInBracket = upperBound - lowerBound;
    
    if (taxableInBracket > 0) {
      totalTax += (taxableInBracket * bracket.rate) / 100;
    }
    
    // Update previousMax for next bracket
    previousMax = bracket.maxIncome || grossSalary;
  }
  
  return Math.round(totalTax * 100) / 100;
}
