import { ShieldAlert, Percent, Award, Landmark } from "lucide-react";

export default function RulesExplainer() {
  const rules = [
    {
      id: "rule_1",
      title: "1. Власний пріоритет (Owned is superior)",
      desc: "Якщо власні авто дешевші та мають кращий/рівний SLA — виділяється 100% обсягу власній флотилії.",
      icon: Award,
      color: "bg-emerald-50 text-emerald-700 border-emerald-100",
    },
    {
      id: "rule_2",
      title: "2. Низький SLA перевізника (Low SLA warning)",
      desc: "Якщо перевізник дешевший, але має низький SLA (<90%) — виділяється 70% на власні авто для підстраховки, лише 30% на наймані.",
      icon: ShieldAlert,
      color: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      id: "rule_3",
      title: "3. Висока економічна вигода (Significant saving)",
      desc: "Якщо найманий перевізник суттєво дешевший (>10% різниці) та має стабільний SLA (>=95%) — виділяється 80% сторонньому партнеру, 20% власним авто.",
      icon: Percent,
      color: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      id: "rule_4",
      title: "4. Рівноцінний вибір (Equal cost scenario)",
      desc: "Якщо ціни збігаються до копійки — 100% обсягу квотується перевізнику з вищим SLA для забезпечення максимальної якості.",
      icon: Landmark,
      color: "bg-indigo-50 text-indigo-700 border-indigo-100",
    },
  ];

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-150 shadow-xs">
      <h3 className="text-sm font-semibold text-slate-900 tracking-tight font-display mb-3">
        Алгоритм квотування та правила розподілу рейсів
      </h3>
      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Логіка розрахунку працює автоматично для кожного окремого напрямку, аналізуючи співвідношення між собівартістю рейсу та фактичним рівнем виконання умов доставки (SLA).
      </p>
      
      <div className="space-y-3">
        {rules.map((rule) => {
          const Icon = rule.icon;
          return (
            <div 
              key={rule.id} 
              className={`p-3 rounded-lg border text-xs leading-relaxed flex gap-3 items-start transition-all hover:shadow-xs ${rule.color}`}
            >
              <div className="p-1.5 rounded-md bg-white shrink-0 shadow-2xs">
                <Icon size={14} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="font-semibold block text-slate-950 mb-0.5">{rule.title}</span>
                <span className="text-slate-600 block leading-normal">{rule.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
