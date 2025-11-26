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

export function calculateAPIT(grossSalary: number, scenario: 'employee' | 'employer' = 'employee'): number {
  // Scenario A: APIT Paid by Employee (Standard)
  const employeeSlabs = [
    { minIncome: 0, maxIncome: 150000, rate: 0, standardDeduction: 0 },
    { minIncome: 150001, maxIncome: 233333, rate: 6, standardDeduction: 9000 },
    { minIncome: 233334, maxIncome: 275000, rate: 18, standardDeduction: 37000 },
    { minIncome: 275001, maxIncome: 316667, rate: 24, standardDeduction: 53500 },
    { minIncome: 316668, maxIncome: 358333, rate: 30, standardDeduction: 72500 },
    { minIncome: 358334, maxIncome: null, rate: 36, standardDeduction: 94000 }
  ];

  // Scenario B: APIT Paid by Employer
  const employerSlabs = [
    { minIncome: 0, maxIncome: 150000, rate: 0, standardDeduction: 0 },
    { minIncome: 150001, maxIncome: 228333, rate: 6.38, standardDeduction: 9570 },
    { minIncome: 228334, maxIncome: 262500, rate: 21.95, standardDeduction: 45119 },
    { minIncome: 262501, maxIncome: 294167, rate: 32.56, standardDeduction: 73000 },
    { minIncome: 294168, maxIncome: 323333, rate: 42.86, standardDeduction: 103580 },
    { minIncome: 323334, maxIncome: null, rate: 56.25, standardDeduction: 146875 }
  ];

  const slabs = scenario === 'employee' ? employeeSlabs : employerSlabs;

  // Find applicable slab
  let applicableSlab = slabs[0];
  for (const slab of slabs) {
    if (grossSalary >= slab.minIncome) {
      if (slab.maxIncome === null || grossSalary <= slab.maxIncome) {
        applicableSlab = slab;
        break;
      }
    }
  }

  // APIT = (Gross Salary × Tax Rate) - Standard Deduction
  const apit = (grossSalary * applicableSlab.rate / 100) - applicableSlab.standardDeduction;
  return Math.max(0, Math.round(apit * 100) / 100);
}
