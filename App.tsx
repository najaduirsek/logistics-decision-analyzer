import React, { useState, useMemo, useRef } from "react";
import { 
  Truck, 
  FileSpreadsheet, 
  Copy, 
  TrendingUp, 
  AlertTriangle, 
  Sparkles, 
  Check, 
  RotateCcw, 
  Plus, 
  Trash2, 
  ArrowRight, 
  HelpCircle,
  FileText,
  Percent,
  Calculator,
  Grid,
  ShieldAlert,
  Upload
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { RawRouteData, ProcessedRouteData } from "./types";
import { 
  parsePastedData, 
  optimizeRouteDistribution, 
  calculateOptimizationSummary, 
  generateInsightsAndRisksRuleBased, 
  generateCopiedReportText,
  SAMPLE_LOGISTICS_DATA
} from "./utils/optimizer";

import RulesExplainer from "./components/RulesExplainer";
import MetricCard from "./components/MetricCard";

export default function App() {
  // Input paste state
  const [inputText, setInputText] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Interactive parsed dataset
  const [routes, setRoutes] = useState<RawRouteData[]>([]);
  
  // App UI/Editing modes
  const [isAddingManually, setIsAddingManually] = useState(false);
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);
  const [showRulesTab, setShowRulesTab] = useState<boolean>(false);

  // New manual entry form states
  const [newRoute, setNewRoute] = useState("");
  const [newVolume, setNewVolume] = useState("100");
  const [newOwnedCost, setNewOwnedCost] = useState("15000");
  const [newHiredCost, setNewHiredCost] = useState("14000");
  const [newOwnedSla, setNewOwnedSla] = useState("97");
  const [newHiredSla, setNewHiredSla] = useState("95");

  // Drag and drop setup
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInputText(text);
        handleAnalyze(text);
      };
      reader.readAsText(file);
    }
    // reset input so the same file can be uploaded again if needed
    if (e.target) {
      e.target.value = '';
    }
  };

  // Simulator modifiers
  const [fuelModifierPct, setFuelModifierPct] = useState<number>(0);
  const [marketModifierPct, setMarketModifierPct] = useState<number>(0);

  // Process and optimize active dataset
  const processedRoutes: ProcessedRouteData[] = useMemo(() => {
    return routes.map(r => {
      const fuelCostMultiplier = 1 + (fuelModifierPct / 100);
      const marketRateMultiplier = 1 + (marketModifierPct / 100);
      
      const adjusted: RawRouteData = {
        ...r,
        ownedCost: r.ownedCost * fuelCostMultiplier,
        hiredCost: r.hiredCost * marketRateMultiplier
      };
      
      return optimizeRouteDistribution(adjusted);
    });
  }, [routes, fuelModifierPct, marketModifierPct]);

  const summary = useMemo(() => {
    return calculateOptimizationSummary(processedRoutes);
  }, [processedRoutes]);

  const { insights, risks, counterArguments } = useMemo(() => {
    return generateInsightsAndRisksRuleBased(processedRoutes, summary);
  }, [processedRoutes, summary]);

  // Strict markdown output as required by the user
  const rawMarkdownReport = useMemo(() => {
    return generateCopiedReportText(processedRoutes, summary, insights, risks, counterArguments);
  }, [processedRoutes, summary, insights, risks, counterArguments]);

  // Core processing trigger
  const handleAnalyze = (textToParse: string = inputText) => {
    setErrorMessage(null);
    const parsed = parsePastedData(textToParse);
    
    if (parsed.length === 0) {
      setErrorMessage(
        "⚠️ Помилка: Недостатньо даних для аналізу. Будь ласка, вставте таблицю, яка містить напрямок, прогноз, вартість (власні/наймані) та SLA (власні/наймані)."
      );
      setRoutes([]);
      return;
    }
    
    // Ensure vital numeric fields exist
    const sampleRecord = parsed[0];
    const hasCrucialColumns = parsed.every(
      item => item.route && !isNaN(item.volume) && !isNaN(item.ownedCost) && !isNaN(item.hiredCost)
    );

    if (!hasCrucialColumns) {
      setErrorMessage(
        "⚠️ Помилка: Недостатньо даних для аналізу. Будь ласка, вставте таблицю, яка містить напрямок, прогноз, вартість (власні/наймані) та SLA (власні/наймані)."
      );
      setRoutes([]);
      return;
    }

    setRoutes(parsed);
    if (inputText === "" && textToParse !== "") {
      setInputText(textToParse);
    }
  };

  const loadSampleData = () => {
    setInputText(SAMPLE_LOGISTICS_DATA);
    handleAnalyze(SAMPLE_LOGISTICS_DATA);
  };

  const clearWorkspace = () => {
    setInputText("");
    setRoutes([]);
    setErrorMessage(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setInputText(text);
        handleAnalyze(text);
      };
      reader.readAsText(file);
    } else {
      const text = e.dataTransfer.getData("text");
      if (text) {
        setInputText(text);
        handleAnalyze(text);
      }
    }
  };

  // Handles updating interactive cells directly in the grid
  const handleCellChange = (index: number, field: keyof RawRouteData, val: string | number) => {
    const updated = [...routes];
    const prevVal = updated[index][field];
    
    let parsedVal: string | number = val;
    if (typeof prevVal === "number") {
      parsedVal = parseFloat(val.toString()) || 0;
    }
    
    updated[index] = {
      ...updated[index],
      [field]: parsedVal
    };
    setRoutes(updated);
  };

  // Adds a manual route row
  const handleAddManualRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoute.trim()) return;

    const newRecord: RawRouteData = {
      route: newRoute.trim(),
      volume: parseFloat(newVolume) || 0,
      ownedCost: parseFloat(newOwnedCost) || 0,
      hiredCost: parseFloat(newHiredCost) || 0,
      ownedSla: parseFloat(newOwnedSla) || 95,
      hiredSla: parseFloat(newHiredSla) || 95,
    };

    setRoutes([...routes, newRecord]);
    
    // Reset inputs
    setNewRoute("");
    setNewVolume("100");
    setNewOwnedCost("15000");
    setNewHiredCost("14000");
    setNewOwnedSla("97");
    setNewHiredSla("95");
    setIsAddingManually(false);
  };

  // Delete a route row
  const handleDeleteRow = (index: number) => {
    const updated = [...routes];
    updated.splice(index, 1);
    setRoutes(updated);
  };

  // Safe report copying to clipboard
  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(rawMarkdownReport);
      setCopiedStatus(true);
      setTimeout(() => setCopiedStatus(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] selection:bg-emerald-100 selection:text-emerald-900 pb-16 antialiased">
      {/* Top Header Navigation Line */}
      <div className="bg-slate-900 text-white py-4 px-6 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 font-display flex items-center justify-center text-slate-950 font-bold shadow-teal-500/20 shadow-lg shrink-0">
              <Truck size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 id="app-title" className="text-lg font-bold tracking-tight font-display flex items-center gap-2">
                Decision Analyzer 
                <span className="text-xs bg-emerald-500/20 text-emerald-400 font-sans font-medium px-2 py-0.5 rounded-full border border-emerald-500/40">
                  Logistic Optimizer
                </span>
              </h1>
              <p className="text-xs text-slate-400">Аналіз квот та максимізація маржинальності за SLA та Cost</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowRulesTab(!showRulesTab)}
              className={`text-xs px-3.5 py-1.5 rounded-lg font-medium border flex items-center gap-2 transition-all cursor-pointer ${
                showRulesTab 
                ? "bg-slate-800 text-emerald-400 border-slate-700" 
                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <HelpCircle size={14} />
              {showRulesTab ? "Сховати правила" : "Правила квотування"}
            </button>
            
            <button
              onClick={loadSampleData}
              className="text-xs px-3.5 py-1.5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-all font-sans cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <Sparkles size={14} className="animate-pulse" />
              Спробувати зразок
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Rules Side drawer / banner container */}
        <AnimatePresence>
          {showRulesTab && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:col-span-12 overflow-hidden"
            >
              <RulesExplainer />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workspace core entry side */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 p-2 bg-emerald-500 h-full" />
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-emerald-500" />
                Вхідні дані (Pasted Data)
              </h2>
              {routes.length > 0 && (
                <button 
                  onClick={clearWorkspace}
                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer text-xs flex items-center gap-1"
                  title="Очистити все"
                >
                  <RotateCcw size={12} />
                  Очистити
                </button>
              )}
            </div>

            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              Вставте табличні дані скопійовані з **Excel**, **Google Таблиць** або **CSV**. Система автоматично розпізнає заголовки та підлаштує аналіз.
            </p>

            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl transition-all duration-200 ${
                isDragging 
                  ? "border-emerald-500 bg-emerald-50/50" 
                  : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
              }`}
            >
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Напрямок&#9;Прогноз&#9;Власна ціна&#9;Наймана ціна&#9;Власний SLA&#9;Найманий SLA&#10;Київ – Львів&#9;120&#9;15000&#9;13200&#9;98%&#9;96%&#10;Одеса – Харків&#9;85&#9;18500&#9;19000&#9;94%&#9;96%"
                rows={10}
                className="w-full p-4 text-xs font-mono bg-transparent border-0 focus:ring-0 focus:outline-hidden leading-relaxed placeholder:text-slate-400 font-medium"
              />

              {inputText === "" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                  <FileText size={32} className="text-slate-300 mb-2" />
                  <span className="text-xs font-semibold text-slate-600">Вставте сюди скопійовану таблицю</span>
                  <span className="text-[10px] text-slate-400 mt-1">або перетягніть файл CSV</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => handleAnalyze()}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded-lg leading-tight tracking-wide transition-all uppercase flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-98"
              >
                <Calculator size={14} className="text-emerald-400" />
                Аналізувати та розрахувати
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs py-2.5 rounded-lg tracking-wide transition-all border border-emerald-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload size={14} />
                  Завантажити CSV файл
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  accept=".csv,.txt,.tsv" 
                  className="hidden" 
                />

                <button
                  onClick={() => {
                    setIsAddingManually(!isAddingManually);
                  }}
                  className="w-full bg-transparent hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2.5 rounded-lg tracking-wide transition-all border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  Додати рядок вручну
                </button>
              </div>
            </div>
          </div>

          {/* Fallback Manual Modal Form */}
          <AnimatePresence>
            {isAddingManually && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-md relative"
              >
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Новий рейс (Додати вручну)</h3>
                <form onSubmit={handleAddManualRoute} className="space-y-3">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Напрямок / Назва маршруту</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="напр. Львів – Житомир"
                      value={newRoute}
                      onChange={e => setNewRoute(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-slate-50 rounded-md focus:outline-hidden focus:border-slate-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Обсяг (Рейси)</label>
                      <input 
                        type="number" 
                        required
                        value={newVolume}
                        onChange={e => setNewVolume(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-slate-50 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Власна вартість (₴)</label>
                      <input 
                        type="number" 
                        required
                        value={newOwnedCost}
                        onChange={e => setNewOwnedCost(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-slate-50 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Наймана вартість (₴)</label>
                      <input 
                        type="number" 
                        required
                        value={newHiredCost}
                        onChange={e => setNewHiredCost(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-slate-50 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Власний SLA (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        required
                        value={newOwnedSla}
                        onChange={e => setNewOwnedSla(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-slate-50 rounded-md"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Найманий SLA (%)</label>
                      <input 
                        type="number" 
                        step="0.1"
                        required
                        value={newHiredSla}
                        onChange={e => setNewHiredSla(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-slate-50 rounded-md"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 justify-end">
                    <button 
                      type="button" 
                      onClick={() => setIsAddingManually(false)}
                      className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer font-medium"
                    >
                      Скасувати
                    </button>
                    <button 
                      type="submit"
                      className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer font-semibold flex items-center gap-1.5"
                    >
                      Додати рядок
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Risk Simulator Form */}
          {routes.length > 0 && (
            <AnimatePresence>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-sm tracking-wide uppercase">
                    <TrendingUp size={16} className="text-amber-500" />
                    Симулятор ринку
                  </div>
                  {(fuelModifierPct !== 0 || marketModifierPct !== 0) && (
                    <button 
                      onClick={() => { setFuelModifierPct(0); setMarketModifierPct(0); }}
                      className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw size={12} /> скинути
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
                  Змоделюйте зміну вартості внутрішнього автопарку або тарифів найманого ринку для миттєвого перерахунку квот.
                </p>
                
                <div className="space-y-5">
                  <div className="group">
                    <div className="flex justify-between items-center mb-1 text-xs font-semibold text-slate-600">
                      <span>Власні витрати (Пальне/Амортизація)</span>
                      <span className={`font-mono px-2 py-0.5 rounded-sm ${fuelModifierPct > 0 ? "bg-amber-100 text-amber-700" : fuelModifierPct < 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {fuelModifierPct > 0 ? "+" : ""}{fuelModifierPct}%
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="-30" 
                      max="50" 
                      step="1" 
                      value={fuelModifierPct}
                      onChange={(e) => setFuelModifierPct(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                    />
                  </div>

                  <div className="group">
                    <div className="flex justify-between items-center mb-1 text-xs font-semibold text-slate-600">
                      <span>Тарифи найманих авто (Ринок)</span>
                      <span className={`font-mono px-2 py-0.5 rounded-sm ${marketModifierPct > 0 ? "bg-amber-100 text-amber-700" : marketModifierPct < 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                        {marketModifierPct > 0 ? "+" : ""}{marketModifierPct}%
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="-30" 
                      max="50" 
                      step="1" 
                      value={marketModifierPct}
                      onChange={(e) => setMarketModifierPct(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Results / Optimization screen side */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {errorMessage ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-rose-50 border border-rose-100 rounded-2xl p-6 text-sm text-rose-800 leading-relaxed font-sans shadow-xs flex items-start gap-4"
              >
                <AlertTriangle className="text-rose-500 shrink-0 select-none mt-0.5" size={20} />
                <div>
                  <h4 className="font-bold text-rose-900 mb-1">Потрібно скоригувати формат</h4>
                  <p>{errorMessage}</p>
                  <div className="mt-4 flex gap-2">
                    <button 
                      onClick={loadSampleData}
                      className="text-xs bg-rose-100 hover:bg-rose-200 text-rose-850 font-bold px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles size={13} />
                      Завантажити коректний приклад
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : routes.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6 animate-fade-in"
              >
                {/* Statistics Dashboard Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <MetricCard 
                    title="Всього рейсів за планом" 
                    value={summary.totalTrips.toLocaleString()}
                    subtitle={`${summary.totalRoutes} сформованих напрямків`}
                    icon={<Truck size={18} className="text-slate-500" />}
                  />
                  <MetricCard 
                    title="Загальна економічна квота" 
                    value={`${summary.netSavings > 0 ? "+" : ""}${summary.netSavings.toLocaleString()} ₴`}
                    subtitle={`vs 100% Власні авто (${summary.baselineCost.toLocaleString()} ₴)`}
                    highlightClass={summary.netSavings > 0 ? "border-emerald-200 bg-emerald-50/20" : "border-slate-100"}
                    trend={{
                      text: `${summary.netSavings >= 0 ? "Оптимально" : "Надліміт"}`,
                      isPositive: summary.netSavings >= 0
                    }}
                    icon={<TrendingUp size={18} className="text-emerald-500" />}
                  />
                  <MetricCard 
                    title="Збалансований SLA флоту" 
                    value={`${summary.totalAllocatedSla.toFixed(1)}%`}
                    subtitle={`Власні: ${summary.averageOwnedSla.toFixed(1)}% | Наймані: ${summary.averageHiredSla.toFixed(1)}%`}
                    icon={<Percent size={18} className="text-indigo-500" />}
                    trend={{
                      text: "SLA Стабільний",
                      isPositive: true
                    }}
                  />
                </div>

                {/* Main Distribution Matrix section */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-50 flex items-center justify-between flex-wrap gap-4 bg-slate-50/50">
                    <div>
                      <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider block">Розділ 1</span>
                      <h2 className="text-base font-bold text-slate-950 font-display">Таблиця розподілу (Distribution Matrix)</h2>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-mono font-medium">
                      Власні авто: {summary.totalOwnedTrips} рейсів ({Math.round(summary.totalOwnedTrips / (summary.totalTrips || 1) * 100)}%)
                    </span>
                  </div>

                  {/* Interactive Dynamic Grid */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-auto">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase font-bold tracking-wide border-b border-slate-120 select-none">
                          <th className="py-3.5 px-4 font-semibold">Напрямок</th>
                          <th className="py-3.5 px-3 font-semibold text-center">Прогноз рейсів</th>
                          <th className="py-3.5 px-3 font-semibold text-center">Власні авто (%)</th>
                          <th className="py-3.5 px-3 font-semibold text-center">Наймані авто (%)</th>
                          <th className="py-3.5 px-4 font-semibold text-right">Економія / Переплата</th>
                          <th className="py-3.5 px-4 font-semibold">Головний фактор</th>
                          <th className="py-3.5 px-3 text-center">Дія</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {processedRoutes.map((r, idx) => {
                          const isSavings = r.savingsOrOverpayment >= 0;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/70 transition-colors group">
                              <td className="py-3.5 px-4 font-semibold text-slate-900 font-sans">
                                {r.route}
                              </td>
                              
                              {/* Editable Cells with immediate recalculations capability */}
                              <td className="py-3.5 px-3 text-center">
                                <input 
                                  type="number" 
                                  value={r.volume} 
                                  onChange={(e) => handleCellChange(idx, "volume", e.target.value)}
                                  className="w-14 px-1 py-0.5 text-center bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-sm font-semibold text-slate-700"
                                />
                              </td>
                              
                              <td className="py-3.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="h-1.5 w-1.5 rounded-full bg-slate-700" />
                                  <span className="font-semibold text-slate-800">{r.allocatedOwnedPct}%</span>
                                  <span className="text-[10px] text-slate-400 font-mono">({r.allocatedOwnedTrips}р.)</span>
                                </div>
                              </td>

                              <td className="py-3.5 px-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  <span className="font-semibold text-slate-800">{r.allocatedHiredPct}%</span>
                                  <span className="text-[10px] text-slate-400 font-mono">({r.allocatedHiredTrips}р.)</span>
                                </div>
                              </td>

                              <td className={`py-3.5 px-4 text-right font-mono font-bold ${isSavings ? "text-emerald-600" : "text-amber-600"}`}>
                                {isSavings 
                                  ? `+${r.savingsOrOverpayment.toLocaleString()} ₴` 
                                  : `-${Math.abs(r.savingsOrOverpayment).toLocaleString()} ₴`
                                }
                              </td>

                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight uppercase leading-none border ${
                                  r.appliedRuleId.includes("rule_1")
                                    ? "bg-slate-100 text-slate-700 border-slate-200"
                                    : r.appliedRuleId.includes("rule_2")
                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                    : r.appliedRuleId.includes("rule_3")
                                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                    : "bg-blue-150 text-blue-800 border-blue-200"
                                }`}>
                                  {r.mainFactor}
                                </span>
                                <span className="block text-[9px] text-slate-400 font-sans font-medium mt-1 leading-normal max-w-[200px]">
                                  {r.notes}
                                </span>
                              </td>

                              {/* Row operations */}
                              <td className="py-3.5 px-3 text-center">
                                <button 
                                  onClick={() => handleDeleteRow(idx)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded-sm hover:bg-slate-100"
                                  title="Видалити рядок"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pricing/SLA interactive cell guides inline for advanced testing */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2">
                    <span className="flex items-center gap-1">
                      <Grid size={12} className="text-slate-400 shrink-0" />
                      Для симуляції: ви можете змінювати **Прогноз рейсів** прямо в таблиці для перерахунку.
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-sm">
                      Режим реального часу
                    </span>
                  </div>
                </div>

                {/* Section 2 & 3 Side by Side block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Section 2: Ключові інсайти */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs relative overflow-hidden">
                    <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider block mb-1">Розділ 2</span>
                    <h3 className="text-sm font-bold text-slate-950 font-display mb-3 flex items-center gap-2">
                      <Sparkles size={16} className="text-accent" />
                      Ключові інсайти (Key Insights)
                    </h3>
                    <ul className="space-y-3">
                      {insights.map((ins, i) => (
                        <li key={i} className="text-xs leading-relaxed text-slate-600 flex gap-2 items-start">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span dangerouslySetInnerHTML={{ __html: ins.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Section 3: Попередження про ризики */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs relative overflow-hidden">
                    <span className="text-xs text-amber-600 font-bold uppercase tracking-wider block mb-1">Розділ 3</span>
                    <h3 className="text-sm font-bold text-slate-950 font-display mb-3 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-500" />
                      Попередження про ризики (Risk Warnings)
                    </h3>
                    <ul className="space-y-3">
                      {risks.map((risk, i) => {
                        const isNoRisk = risk.includes("Критичних ризиків не виявлено");
                        return (
                          <li key={i} className="text-xs leading-relaxed text-slate-600 flex gap-2 items-start">
                            <span className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${isNoRisk ? "bg-emerald-500" : "bg-amber-500"}`} />
                            <span 
                              className={isNoRisk ? "text-slate-500 font-medium italic" : ""}
                              dangerouslySetInnerHTML={{ __html: risk.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} 
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>

                {counterArguments && counterArguments.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-rose-50/50 rounded-2xl border border-rose-200 p-5 shadow-xs relative overflow-hidden"
                  >
                    <span className="text-xs text-rose-600 font-bold uppercase tracking-wider block mb-1">Особливий аналіз</span>
                    <h3 className="text-sm font-bold text-rose-950 font-display mb-3 flex items-center gap-2">
                      <ShieldAlert size={16} className="text-rose-500" />
                      Жорсткі аргументи "ПРОТИ" (Counter-arguments)
                    </h3>
                    <p className="text-xs text-rose-700 mb-4 opacity-90">
                      Система пропонує передати 80% і більше рейсів на окремих маршрутах найманим авто через дуже низьку ціну. Прочитайте можливі наслідки:
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {counterArguments.map((arg, i) => (
                        <li key={i} className="text-xs leading-relaxed text-rose-800 bg-white/60 p-4 rounded-xl border border-rose-100/50 flex gap-2 items-start shadow-xs">
                          <span className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 bg-rose-500" />
                          <span dangerouslySetInnerHTML={{ __html: arg.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Pure strict format markdown viewer for reporting */}
                <div className="bg-slate-950 text-slate-300 rounded-2xl border border-slate-900 p-6 shadow-md">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Офіційний аналітичний звіт (Strict Ukrainian Report)</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Відформатований стандартний логістичний звіт для буфера обміну</p>
                    </div>

                    <button
                      onClick={handleCopyReport}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95 border border-slate-700"
                    >
                      {copiedStatus ? (
                        <>
                          <Check size={14} className="text-emerald-400 stroke-[3]" />
                          Скопійовано!
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Скопіювати звіт
                        </>
                      )}
                    </button>
                  </div>

                  {/* Beautiful Markdown container block with exact 3 segments formatted strictly as requested */}
                  <div className="bg-slate-900/40 p-4 rounded-xl font-mono text-xs text-slate-350 overflow-y-auto max-h-[300px] leading-relaxed whitespace-pre-wrap select-all">
                    {rawMarkdownReport}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-2xl p-10 border border-slate-100 shadow-xs flex flex-col items-center justify-center text-center">
                <Truck size={48} className="text-slate-300 mb-4 animate-bounce duration-1000" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Немає активних коридорів для аналізу</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                  Будь ласка, вставте таблицю з Excel в ліву панель або активуйте спрощений демонстраційний сценарій України.
                </p>
                <button
                  onClick={loadSampleData}
                  className="mt-6 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-6 py-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Sparkles size={14} className="text-emerald-400" />
                  Запустити аналіз зразка даних
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
