import { RawRouteData, ProcessedRouteData, OptimizationSummary } from "../types";

/**
 * Parses pasted text (TSV, CSV, or Semicolon-Separated) and extracts structured logistics data.
 */
export function parsePastedData(text: string): RawRouteData[] {
  if (!text || !text.trim()) {
    return [];
  }

  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  // Determine standard separator
  // We check the first line or first 3 lines for tabs, semicolons, or commas
  const sampleLine = lines[0];
  let delimiter = "\t";
  if (sampleLine.includes("\t")) {
    delimiter = "\t";
  } else if (sampleLine.includes(";")) {
    delimiter = ";";
  } else if (sampleLine.includes(",")) {
    // Be careful with commas in case they are decimal separators (e.g. 98,5)
    // If we have commas and also commas serve as decimals, let's verify if semicolons are present
    delimiter = ",";
  }

  // Parse rows
  const parsedRows: string[][] = lines.map(line => 
    line.split(delimiter).map(cell => cell.trim())
  ).filter(row => row.length > 0 && row.some(cell => cell !== ""));

  if (parsedRows.length === 0) return [];

  // Look for header row
  let headerIndex = -1;
  const headerKeywords = ["напрямок", "маршрут", "route", "direction", "прогноз", "обсяг", "volume", "власн", "owned", "найман", "hired", "sla"];
  
  for (let i = 0; i < Math.min(5, parsedRows.length); i++) {
    const rowJoined = parsedRows[i].join(" ").toLowerCase();
    if (headerKeywords.some(kw => rowJoined.includes(kw))) {
      headerIndex = i;
      break;
    }
  }

  let dataRows: string[][] = [];
  let headers: string[] = [];

  if (headerIndex !== -1) {
    headers = parsedRows[headerIndex];
    dataRows = parsedRows.slice(headerIndex + 1);
  } else {
    // If no header detected, we'll try to treat the first row as data if it has numeric fields,
    // otherwise assume position-based default headers
    const checkNumeric = (cell: string) => !isNaN(Number(cleanNumericString(cell)));
    const firstRowNumbers = parsedRows[0].slice(1).filter(cell => checkNumeric(cell)).length;
    
    if (firstRowNumbers >= 3) {
      dataRows = parsedRows;
    } else {
      headers = parsedRows[0];
      dataRows = parsedRows.slice(1);
    }
  }

  // Attempt to map column indexes
  let colRoute = 0;
  let colVolume = 1;
  let colOwnedCost = 2;
  let colHiredCost = 3;
  let colOwnedSla = 4;
  let colHiredSla = 5;

  if (headers.length > 0) {
    const normHeaders = headers.map(h => h.toLowerCase());
    
    normHeaders.forEach((h, index) => {
      // Route mapping
      if (h.includes("напрямок") || h.includes("маршрут") || h.includes("route") || h.includes("direction") || h.includes("шлях")) {
        colRoute = index;
      }
      // Volume mapping
      else if (h.includes("прогноз") || h.includes("обсяг") || h.includes("volume") || h.includes("рейс") || h.includes("кільк")) {
        colVolume = index;
      }
      // Cost vs SLA for Owned and Hired
      else if (h.includes("власн") || h.includes("owned") || h.includes("свої") || h.includes("автопарк")) {
        if (h.includes("sla") || h.includes("%") || h.includes("надійн")) {
          colOwnedSla = index;
        } else if (h.includes("вартість") || h.includes("ціна") || h.includes("cost") || h.includes("тариф") || h.includes("грн")) {
          colOwnedCost = index;
        } else {
          // Fallback based on symbols
          if (h.includes("sla")) colOwnedSla = index;
          else colOwnedCost = index;
        }
      }
      else if (h.includes("найман") || h.includes("hired") || h.includes("перевізник") || h.includes("carrier") || h.includes("залуч")) {
        if (h.includes("sla") || h.includes("%") || h.includes("надійн")) {
          colHiredSla = index;
        } else if (h.includes("вартість") || h.includes("ціна") || h.includes("cost") || h.includes("тариф") || h.includes("грн")) {
          colHiredCost = index;
        } else {
          if (h.includes("sla")) colHiredSla = index;
          else colHiredCost = index;
        }
      }
      // Generic SLA match if not matched above
      else if (h.includes("sla") || h.includes("%")) {
        if (h.includes("влас") || h.includes("own")) colOwnedSla = index;
        else if (h.includes("найм") || h.includes("hir") || h.includes("кар")) colHiredSla = index;
      }
    });
  }

  // Convert text rows into RawRouteData structure
  const result: RawRouteData[] = [];

  dataRows.forEach((row, idx) => {
    // Skip empty lines or rows with insufficient columns
    if (row.length < 2 || !row[colRoute]) return;

    const routeVal = row[colRoute]?.trim() || `Маршрут ${idx + 1}`;
    const volVal = parseNumeric(row[colVolume], 0);
    const ownedCostVal = parseNumeric(row[colOwnedCost], 0);
    const hiredCostVal = parseNumeric(row[colHiredCost], 0);
    const ownedSlaVal = parsePercentValue(row[colOwnedSla], 95);
    const hiredSlaVal = parsePercentValue(row[colHiredSla], 95);

    // Filter out rows that are entirely empty or invalid forecasts
    if (volVal === 0 && ownedCostVal === 0 && hiredCostVal === 0) {
      return;
    }

    result.push({
      route: routeVal,
      volume: volVal,
      ownedCost: ownedCostVal,
      hiredCost: hiredCostVal,
      ownedSla: ownedSlaVal,
      hiredSla: hiredSlaVal
    });
  });

  return result;
}

function cleanNumericString(val: string | undefined): string {
  if (!val) return "";
  // Strip spaces, currency signs, commas as decimals, percentage signs
  let cleaned = val.replace(/[\s₴$€%]/g, "");
  // Replace comma with dot if it's acting as a decimal point
  cleaned = cleaned.replace(",", ".");
  return cleaned;
}

function parseNumeric(val: string | undefined, fallback: number): number {
  if (!val) return fallback;
  const cleaned = cleanNumericString(val);
  const num = parseFloat(cleaned);
  return isNaN(num) ? fallback : num;
}

function parsePercentValue(val: string | undefined, fallback: number): number {
  if (!val) return fallback;
  const cleaned = cleanNumericString(val);
  const num = parseFloat(cleaned);
  if (isNaN(num)) return fallback;

  // If the user entered something like 0.98, normalize it to 98 (%)
  if (num > 0 && num <= 1) {
    return num * 100;
  }
  return num;
}

/**
 * Optimizes distribution for a single route record.
 */
export function optimizeRouteDistribution(raw: RawRouteData): ProcessedRouteData {
  const { route, volume, ownedCost, hiredCost, ownedSla, hiredSla } = raw;
  
  let allocatedOwnedPct = 50;
  let allocatedHiredPct = 50;
  let mainFactor = "Баланс ризику";
  let appliedRuleId = "default";
  let notes = "";

  // 1. If Owned fleet is cheaper and has better/equal SLA -> Allocate 100% to Owned
  if (ownedCost < hiredCost && ownedSla >= hiredSla) {
    allocatedOwnedPct = 100;
    allocatedHiredPct = 0;
    mainFactor = "Власний пріоритет";
    appliedRuleId = "rule_1_owned_better";
    notes = "Власний транспорт дешевший і має кращий або такий самий показник SLA. Повний перерозподіл у внутрішній автопарк.";
  }
  // 2. If Hired carrier is cheaper but has low SLA (<90%) -> Allocate 70% to Owned (as backup), 30% to Hired
  else if (hiredCost < ownedCost && hiredSla < 90) {
    allocatedOwnedPct = 70;
    allocatedHiredPct = 30;
    mainFactor = "Підстраховка (Низький SLA)";
    appliedRuleId = "rule_2_hired_low_sla";
    notes = "Перевізник вигідний за ціною, але має критично низький рівень надійності SLA (<90%). Обмежуємо частку до 30%, 70% резервуємо за власним флотом для забезпечення безперебійності.";
  }
  // 3. If Hired carrier is significantly cheaper (difference > 10%) and has acceptable SLA (>=95%) -> Allocate 80% to Hired, 20% to Owned
  // Let's compute difference: (Owned - Hired) / Owned
  else if (hiredCost < ownedCost && ((ownedCost - hiredCost) / ownedCost > 0.10) && hiredSla >= 95) {
    allocatedOwnedPct = 20;
    allocatedHiredPct = 80;
    mainFactor = "Економічна вигода";
    appliedRuleId = "rule_3_hired_super_saving";
    notes = "Найманий перевізник суттєво дешевший (економія >10%) та демонструє високу стабільність сервісу (SLA >=95%). Віддаємо 80% обсягу, залишаючи 20% як підтримуючий резерв.";
  }
  // 4. If costs are exactly equal -> Allocate 100% to the fleet with the higher SLA
  else if (Math.abs(ownedCost - hiredCost) < 0.01) {
    if (ownedSla >= hiredSla) {
      allocatedOwnedPct = 100;
      allocatedHiredPct = 0;
      mainFactor = "Краща надійність";
      appliedRuleId = "rule_4_equal_cost_owned_sla";
      notes = "Вартість рейсів ідентична. Розподіл 100% здійснюється на користь власного транспорту через вищий показник SLA.";
    } else {
      allocatedOwnedPct = 0;
      allocatedHiredPct = 100;
      mainFactor = "Високий SLA";
      appliedRuleId = "rule_4_equal_cost_hired_sla";
      notes = "Вартість рейсів ідентична. Оскільки SLA стороннього перевізника вищий, весь обсяг передається найманому автопарку.";
    }
  }
  // 5. Fallback logical allocations based on specific trade-offs
  else {
    // If Hired is cheaper than Owned (difference <= 10% or SLA is in between 90% and 95%)
    if (hiredCost < ownedCost) {
      if (hiredSla >= 90) {
        // Hired is cheaper and SLA is solid (>= 90%)
        allocatedOwnedPct = 40;
        allocatedHiredPct = 60;
        mainFactor = "Оптимізація витрат";
        appliedRuleId = "fallback_hired_cheaper_solid_sla";
        notes = "Перевізник надає помірну економію пропозиції (до 10% різниці) за хорошої стабільності. Рекомендовано 60% найманого транспорту.";
      } else {
        // Hired is cheaper but very low SLA (actually handled by Rule 2, but nested just in case)
        allocatedOwnedPct = 70;
        allocatedHiredPct = 30;
        mainFactor = "Мінімізація ризиків";
        appliedRuleId = "fallback_hired_cheaper_low_sla";
        notes = "Сторонній автопарк дешевший, проте ризикований через нестабільність доставки. Основна квота залишається за власними авто.";
      }
    } 
    // If Owned is cheaper, but has worse SLA than Hired
    else {
      // Owned is cheaper, but Hired SLA is higher
      allocatedOwnedPct = 80;
      allocatedHiredPct = 20;
      mainFactor = "Економія власного";
      appliedRuleId = "fallback_owned_cheaper_worse_sla";
      notes = "Власний автопарк економічно вигідніший за рейс, але сторонній виконавець має вищу якість доставки. 80% закриваємо власним флотом для утримання собівартості.";
    }
  }

  // Calculate final allocated trips rounded to whole numbers (using volume weight)
  let allocatedOwnedTrips = Math.round(volume * (allocatedOwnedPct / 100));
  let allocatedHiredTrips = volume - allocatedOwnedTrips; // Ensure mathematical sum equals volume

  // Recalculate working percentages if volume is extremely low (e.g. 1 trip total)
  if (volume > 0 && volume < 5) {
    if (allocatedOwnedTrips === 0 && allocatedOwnedPct > 0) {
      allocatedOwnedTrips = 1;
      allocatedHiredTrips = volume - 1;
    } else if (allocatedHiredTrips === 0 && allocatedHiredPct > 0) {
      allocatedHiredTrips = 1;
      allocatedOwnedTrips = volume - 1;
    }
  }

  // Calculate savings vs using 100% Owned Fleet Baseline
  const baselineCost = volume * ownedCost;
  const optimizedCost = (allocatedOwnedTrips * ownedCost) + (allocatedHiredTrips * hiredCost);
  const savingsOrOverpayment = baselineCost - optimizedCost;

  return {
    route,
    volume,
    ownedCost,
    hiredCost,
    ownedSla,
    hiredSla,
    allocatedOwnedPct,
    allocatedHiredPct,
    allocatedOwnedTrips,
    allocatedHiredTrips,
    savingsOrOverpayment,
    mainFactor,
    appliedRuleId,
    notes
  };
}

/**
 * Calculates high-level summary statistics of the optimization results.
 */
export function calculateOptimizationSummary(routes: ProcessedRouteData[]): OptimizationSummary {
  const totalRoutes = routes.length;
  let totalTrips = 0;
  let totalOwnedTrips = 0;
  let totalHiredTrips = 0;
  let baselineCost = 0;
  let optimizedCost = 0;

  // For weighted average SLAs
  let weightedOwnedSlaSum = 0;
  let weightedHiredSlaSum = 0;
  let weightedCombinedSlaSum = 0;

  routes.forEach(r => {
    totalTrips += r.volume;
    totalOwnedTrips += r.allocatedOwnedTrips;
    totalHiredTrips += r.allocatedHiredTrips;

    baselineCost += r.volume * r.ownedCost;
    optimizedCost += (r.allocatedOwnedTrips * r.ownedCost) + (r.allocatedHiredTrips * r.hiredCost);

    // Sum up weighted SLAs for the combined metric
    weightedOwnedSlaSum += r.allocatedOwnedTrips * r.ownedSla;
    weightedHiredSlaSum += r.allocatedHiredTrips * r.hiredSla;
    weightedCombinedSlaSum += (r.allocatedOwnedTrips * r.ownedSla) + (r.allocatedHiredTrips * r.hiredSla);
  });

  const netSavings = baselineCost - optimizedCost;
  const averageOwnedSla = totalOwnedTrips > 0 ? (weightedOwnedSlaSum / totalOwnedTrips) : 0;
  const averageHiredSla = totalHiredTrips > 0 ? (weightedHiredSlaSum / totalHiredTrips) : 0;
  const totalAllocatedSla = totalTrips > 0 ? (weightedCombinedSlaSum / totalTrips) : 0;

  return {
    totalRoutes,
    totalTrips,
    totalOwnedTrips,
    totalHiredTrips,
    baselineCost,
    optimizedCost,
    netSavings,
    averageOwnedSla,
    averageHiredSla,
    totalAllocatedSla
  };
}

/**
 * Generates Ukrainian text for Key Insights and Risk Warnings strictly adhering to guidelines.
 */
export function generateInsightsAndRisksRuleBased(routes: ProcessedRouteData[], summary: OptimizationSummary) {
  const insights: string[] = [];
  const risks: string[] = [];
  const counterArguments: string[] = [];

  // Sort routes by volume to focus insights on key directions
  const sortedByVolume = [...routes].sort((a, b) => b.volume - a.volume);
  const sortedBySavings = [...routes].sort((a, b) => b.savingsOrOverpayment - a.savingsOrOverpayment);

  // 1. Insight: High Volume Dominance
  if (sortedByVolume.length > 0) {
    const topRoute = sortedByVolume[0];
    if (topRoute.allocatedHiredPct > 50) {
      insights.push(
        `Максимальний обсяг рейсів припадає на напрямок **${topRoute.route}** (${topRoute.volume} рейсів). Логістичне рішення передбачає надання переважної квоти найманому перевізнику (${topRoute.allocatedHiredPct}%) завдяки вигідному тарифу та стабільно високому показнику надійності (SLA ${topRoute.hiredSla}%), що позитивно впливає на загальну утилізацію коштів.`
      );
    } else {
      insights.push(
        `Найбільший завантажений коридор **${topRoute.route}** (${topRoute.volume} рейсів) закріплено за власним автопарком на ${topRoute.allocatedOwnedPct}%. Це забезпечує стабільність ланцюга постачання та утримує собівартість під прямим контролем підприємства завдяки надійнішому забезпеченню SLA.`
      );
    }
  }

  // 2. Insight: Savings Champion
  if (sortedBySavings.length > 0 && sortedBySavings[0].savingsOrOverpayment > 0) {
    const savingStar = sortedBySavings[0];
    insights.push(
      `Найбільший економічний ефект у розмірі **${savingStar.savingsOrOverpayment.toLocaleString()} ₴** забезпечено на напрямку **${savingStar.route}** шляхом диверсифікації квот на користь перевізника з дисконтом понад 10% та гарантованим SLA на рівні ${savingStar.hiredSla}%.`
    );
  } else {
    insights.push(
      `Завдяки впровадженню оптимального матричного розподілу рейсів було досягнуто збалансованого використання власного автопарку для захисту критично важливих вантажних коридорів.`
    );
  }

  // 3. Insight: Overall Fleet Balance
  if (summary.totalHiredTrips > 0) {
    const hiredTripRatio = Math.round((summary.totalHiredTrips / summary.totalTrips) * 100);
    insights.push(
      `Загальна частка аутсорсингу (найманих рейсів) становить **${hiredTripRatio}%** (${summary.totalHiredTrips} з ${summary.totalTrips} рейсів). Це дозволяє зберегти оперативну гнучкість автопарку підприємства, нівелювати пікові навантаження та знизити сукупні логістичні витрати.`
    );
  }

  // Risks identification
  // Check if any route has Hired Carrier allocated volume but low/declining SLA (<90%)
  const lowSlaHiredRoutes = routes.filter(r => r.allocatedHiredPct > 0 && r.hiredSla < 90);
  if (lowSlaHiredRoutes.length > 0) {
    lowSlaHiredRoutes.slice(0, 2).forEach(r => {
      risks.push(
        `Напрямок **${r.route}**: залучення найманого перевізника з низьким SLA (${r.hiredSla}%) створює ризик затримок постачання. Навіть з урахуванням вигідною ціни, рекомендовано посилити контроль за цим коридором або тимчасово перерозподілити решту 30% обсягу у власний автопарк.`
      );
    });
  }

  // Check if any route has exceptionally high cost (SLA differences, high owned costs, etc.)
  const highCostRoutes = [...routes].sort((a, b) => b.ownedCost - a.ownedCost);
  if (highCostRoutes.length > 0 && risks.length < 2) {
    const expensive = highCostRoutes[0];
    if (expensive.allocatedOwnedPct > 50) {
      risks.push(
        `Маршрут **${expensive.route}** характеризується високою собівартістю внутрішніх перевезень (${expensive.ownedCost.toLocaleString()} ₴/рейс). У разі покращення умов найманих перевізників доцільно переглянути квоти для уникнення перевитрат.`
      );
    }
  }

  // Default fallback if no risks found at all
  if (risks.length === 0) {
    risks.push("Критичних ризиків не виявлено.");
  }

  // Generate counter-arguments for highly outsourced routes (>= 80% to hired carrier due to price)
  const heavyOutsourcedRoutes = routes.filter(r => r.allocatedHiredPct >= 80 && r.hiredCost < r.ownedCost);
  if (heavyOutsourcedRoutes.length > 0) {
    const routeNames = heavyOutsourcedRoutes.map(r => `**${r.route}**`).join(", ");
    counterArguments.push(`Напрямки ${routeNames} мають 80%+ квоту найманих авто через значну економію. Ризик: надмірна залежність від кон'юнктури ринку.`);
    counterArguments.push(`**Приховані витрати:** низький поточний тариф може обернутися відмовами у пікові сезони, що змусить шукати авто за спотовими, значно вищими тарифами.`);
    counterArguments.push(`**Зриви постачань:** відсутність достатнього власного резерву на цих маршрутах може призвести до падіння загального рівня клієнтського сервісу (OTIF) у разі форс-мажорів.`);
  }

  return { insights, risks, counterArguments };
}

/**
 * Helper to generate the exact strict markdown text requested by the user.
 * Perfect for direct copy-paste or rendering.
 */
export function generateCopiedReportText(routes: ProcessedRouteData[], summary: OptimizationSummary, insights: string[], risks: string[], counterArguments: string[] = []): string {
  // Let's format the table
  const tableRows = routes.map(r => {
    // Determine sign for savings or overpayments
    const val = r.savingsOrOverpayment;
    const savingString = val === 0 ? "0 ₴" : val > 0 ? `+${val.toLocaleString()} ₴` : `-${Math.abs(val).toLocaleString()} ₴`;
    return `| ${r.route} | ${r.volume} | ${r.allocatedOwnedPct}% | ${r.allocatedHiredPct}% | ${savingString} | ${r.mainFactor} |`;
  }).join("\n");

  const tableHeader = `| Напрямок | Прогноз рейсів | % Власні авто | % Наймані авто | Економія / Переплата | Головний фактор |
|---|---|---|---|---|---|`;

  const insightsSection = insights.map(ins => `- ${ins}`).join("\n");
  const risksSection = risks.map(risk => `- ${risk}`).join("\n");
  
  let baseReport = `### 1. Таблиця розподілу (Distribution Matrix)

${tableHeader}
${tableRows}

### 2. Ключові інсайти (Key Insights)

${insightsSection}

### 3. Попередження про ризики (Risk Warnings)

${risksSection}`;

  if (counterArguments.length > 0) {
    const counterSection = counterArguments.map(arg => `- ${arg}`).join("\n");
    baseReport += `\n\n### 4. Жорсткі аргументи "ПРОТИ" (Counter-arguments)\n\n${counterSection}`;
  }

  return baseReport;
}

/**
 * Ukrainian pre-made high quality sample scenarios for test drive
 */
export const SAMPLE_LOGISTICS_DATA = `Напрямок\tПрогноз рейсів\tВартість власних авто\tВартість найманих авто\tSLA власних авто (%)\tSLA найманих авто (%)
Київ – Львів\t120\t15000\t13200\t98\t96
Одеса – Харків\t85\t18500\t19000\t94\t96
Дніпро – Київ\t150\t14000\t12000\t96\t88
Харків – Львів\t60\t22000\t22000\t92\t97
Львів – Одеса\t95\t19500\t17000\t95\t95
Київ – Дніпро\t110\t13800\t12400\t97\t95`;
