export interface RawRouteData {
  route: string;                  // Напрямок
  volume: number;                 // Прогнозний обсяг рейсів
  ownedCost: number;              // Вартість власного флоту за рейс
  hiredCost: number;              // Вартість найманого перевізника за рейс
  ownedSla: number;               // SLA власного флоту (%)
  hiredSla: number;               // SLA найманого перевізника (%)
}

export interface ProcessedRouteData extends RawRouteData {
  allocatedOwnedPct: number;      // % Власні авто (0 to 100)
  allocatedHiredPct: number;      // % Наймані авто (0 to 100)
  allocatedOwnedTrips: number;    // Кількість рейсів для власного флоту
  allocatedHiredTrips: number;    // Кількість рейсів для найманого перевізника
  savingsOrOverpayment: number;   // Економія (+) чи переплата (-) порівняно з 100% Власними авто
  mainFactor: string;             // Головний фактор рішення
  appliedRuleId: string;          // Ідентифікатор правила для підсвічування чи документації
  notes: string;                  // Додаткові делікатні деталі рішення
}

export interface OptimizationSummary {
  totalRoutes: number;
  totalTrips: number;
  totalOwnedTrips: number;
  totalHiredTrips: number;
  baselineCost: number;           // Cost if 100% owned
  optimizedCost: number;          // Cost of proposed distribution
  netSavings: number;             // Baseline - Optimized (positive represents savings)
  averageOwnedSla: number;        // Weighted SLA of owned portion
  averageHiredSla: number;        // Weighted SLA of hired portion
  totalAllocatedSla: number;      // Combined weighted SLA of the optimized mix
}
