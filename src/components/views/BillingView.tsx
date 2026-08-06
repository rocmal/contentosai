import React from 'react';
import { Check, CreditCard, Sparkles, Zap } from 'lucide-react';
import { ViewType } from '../../types';
import { PRICING_PLANS, formatPlanPrice } from '../../lib/pricingPlans';

interface BillingViewProps {
  onNavigate: (view: ViewType) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ onNavigate }) => {
  const plans = PRICING_PLANS.map((plan) => {
    const custom = plan.priceMonthly == null;
    return {
      name: plan.name,
      price: formatPlanPrice(plan, 'monthly').priceDisplay,
      period: custom ? '' : '/month',
      credits: plan.credits,
      custom,
      active: plan.key === 'pro',
    };
  });

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <CreditCard className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
              Billing & AI Credit Usage
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your Lumora OS subscription, token top-ups, and invoice history.
          </p>
        </div>
      </div>

      {/* Credit Meter Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 text-white space-y-4 shadow-xl border border-slate-800">
        <div className="flex justify-between items-center text-xs font-semibold">
          <span className="flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-blue-400" /> Current Plan: Pro Plan
          </span>
          <span className="font-mono text-blue-300">8,450 / 10,000 Credits Remaining</span>
        </div>

        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full rounded-full w-[84.5%]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`p-6 rounded-2xl border space-y-4 shadow-xs ${
              p.active
                ? 'border-blue-600 bg-white dark:bg-slate-900 ring-2 ring-blue-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{p.name}</h3>
              {p.active && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  Current
                </span>
              )}
            </div>

            <p className="text-2xl font-black text-slate-900 dark:text-white">{p.price}<span className="text-xs font-medium text-slate-400">{p.period}</span></p>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{p.credits}</p>

            <button
              onClick={() => (p.custom ? window.open('mailto:sales@lumoraos.in') : alert(`Upgraded to ${p.name}`))}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-colors ${
                p.active
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {p.active ? 'Active Plan' : p.custom ? 'Contact Sales' : 'Upgrade Plan'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
