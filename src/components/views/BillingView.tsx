import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, CreditCard, Loader2, Sparkles } from 'lucide-react';
import { ViewType } from '../../types';
import { PRICING_PLANS, formatPlanPrice, LocalizedRate } from '../../lib/pricingPlans';
import { detectLikelyCurrency } from '../../lib/currency';
import {
  CreditTransaction,
  CreditWallet,
  createCheckoutOrder,
  fetchExchangeRate,
  getMyCreditWallet,
  getMySubscription,
  listMyCreditTransactions,
  PurchasablePlan,
  Subscription,
} from '../../lib/api';

interface BillingViewProps {
  onNavigate: (view: ViewType) => void;
  /** Set once, right after signup, when the visitor picked a plan on the
   * landing page's pricing cards - triggers Razorpay checkout automatically
   * on arrival instead of making them click "Switch to Plan" again. */
  autoCheckoutPlan?: PurchasablePlan | null;
  onAutoCheckoutStarted?: () => void;
}

const SALES_EMAIL = 'mailto:sales@lumoraos.in';
const RAZORPAY_CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** Only the handful of Checkout.js fields/methods this component actually
 * uses - see https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/ */
interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  theme?: { color?: string };
  handler: () => void;
  modal?: { ondismiss?: () => void };
}
interface RazorpayCheckoutInstance {
  open(): void;
}
declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = RAZORPAY_CHECKOUT_SRC;
      script.onload = () => resolve();
      script.onerror = () => {
        razorpayScriptPromise = null;
        reject(new Error('Could not load the Razorpay Checkout script.'));
      };
      document.body.appendChild(script);
    });
  }
  return razorpayScriptPromise;
}

/** Payment succeeds client-side immediately, but the subscription only
 * activates once RazorpayWebhookController processes payment.captured -
 * poll briefly rather than trusting the client-side callback alone. */
async function waitForPlanActivation(plan: string, timeoutMs = 20000): Promise<Subscription | null> {
  const startedAt = Date.now();
  for (;;) {
    const subscription = await getMySubscription();
    if (subscription?.plan === plan && subscription.status === 'active') {
      return subscription;
    }
    if (Date.now() - startedAt > timeoutMs) {
      return subscription;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

function reasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    'generation.image': 'Image generation',
    'generation.voice': 'Voice generation',
    'generation.video': 'Video generation',
    'generation.character': 'Character video generation',
    'plan.initial_grant': 'Plan credits (initial)',
    'plan.monthly_grant': 'Plan credits (renewal)',
    refund: 'Refund',
    'admin.adjustment': 'Manual adjustment',
  };
  return labels[reason] ?? reason;
}

export const BillingView: React.FC<BillingViewProps> = ({ autoCheckoutPlan, onAutoCheckoutStarted }) => {
  const [subscription, setSubscription] = useState<Subscription | null | undefined>(undefined);
  const [wallet, setWallet] = useState<CreditWallet | null | undefined>(undefined);
  const [transactions, setTransactions] = useState<CreditTransaction[] | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<PurchasablePlan | null>(null);
  const [checkoutStage, setCheckoutStage] = useState<'opening' | 'confirming' | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [localizedRate, setLocalizedRate] = useState<LocalizedRate | null>(null);

  const refreshBillingState = () => {
    getMySubscription().then(setSubscription).catch(() => setSubscription(null));
    getMyCreditWallet().then(setWallet).catch(() => setWallet(null));
    listMyCreditTransactions({ limit: 15 })
      .then((r) => setTransactions(r.items))
      .catch(() => setTransactions([]));
  };

  useEffect(refreshBillingState, []);

  useEffect(() => {
    const currency = detectLikelyCurrency();
    if (currency === 'USD') return;
    fetchExchangeRate(currency).then((rate) => {
      if (rate.currency !== 'USD') setLocalizedRate(rate);
    });
  }, []);

  const handleUpgrade = async (plan: PurchasablePlan) => {
    setCheckoutError(null);
    setCheckoutPlan(plan);
    setCheckoutStage('opening');
    try {
      await loadRazorpayCheckout();
      const order = await createCheckoutOrder(plan);
      if (!window.Razorpay) throw new Error('Razorpay Checkout failed to load.');

      const razorpay = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'Lumora OS',
        description: `${plan[0].toUpperCase()}${plan.slice(1)} plan`,
        theme: { color: '#2563eb' },
        handler: () => {
          setCheckoutStage('confirming');
          waitForPlanActivation(plan).finally(() => {
            refreshBillingState();
            setCheckoutStage(null);
            setCheckoutPlan(null);
          });
        },
        modal: {
          ondismiss: () => {
            setCheckoutStage(null);
            setCheckoutPlan(null);
          },
        },
      });
      razorpay.open();
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Could not start checkout.');
      setCheckoutStage(null);
      setCheckoutPlan(null);
    }
  };

  useEffect(() => {
    if (!autoCheckoutPlan) return;
    onAutoCheckoutStarted?.();
    handleUpgrade(autoCheckoutPlan);
    // handleUpgrade is stable enough for this one-shot trigger (defined fresh
    // each render but only ever fires once per non-null autoCheckoutPlan,
    // since the parent clears it via onAutoCheckoutStarted right away).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheckoutPlan]);

  const plans = PRICING_PLANS.map((plan) => {
    const custom = plan.priceMonthly == null;
    return {
      key: plan.key,
      name: plan.name,
      price: formatPlanPrice(plan, 'monthly', localizedRate ?? undefined).priceDisplay,
      period: custom ? '' : '/month',
      credits: plan.credits,
      custom,
      active: subscription?.plan === plan.key,
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
            Your Lumora OS subscription and credit consumption.
          </p>
        </div>
      </div>

      {/* Credit Meter Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-950 text-white space-y-4 shadow-xl border border-slate-800">
        {subscription === undefined || wallet === undefined ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center text-xs font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Current Plan: {subscription ? PRICING_PLANS.find((p) => p.key === subscription.plan)?.name ?? subscription.plan : 'None'}
                {subscription?.status === 'trialing' && ' (trial)'}
              </span>
              <span className="font-mono text-blue-300">
                {wallet
                  ? wallet.balance === null
                    ? 'Unlimited credits'
                    : `${wallet.balance.toLocaleString()} credits remaining`
                  : 'No wallet yet'}
              </span>
            </div>

            {wallet?.balance !== null && wallet && (() => {
              const allotment = PRICING_PLANS.find((p) => p.key === subscription?.plan)?.creditsPerMonth;
              if (!allotment) return null;
              const pct = Math.min(100, Math.max(0, (wallet.balance / allotment) * 100));
              return (
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
              );
            })()}
          </>
        )}
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

            {p.active ? (
              <span className="block text-center w-full py-2.5 rounded-xl font-semibold text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                Active Plan
              </span>
            ) : p.custom ? (
              <a
                href={SALES_EMAIL}
                className="block text-center w-full py-2.5 rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Contact Sales
              </a>
            ) : (
              <button
                type="button"
                onClick={() => handleUpgrade(p.key as PurchasablePlan)}
                disabled={checkoutPlan !== null}
                className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-colors"
              >
                {checkoutPlan === p.key && checkoutStage ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {checkoutStage === 'opening' ? 'Opening checkout...' : 'Confirming payment...'}
                  </>
                ) : (
                  `Switch to ${p.name}`
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {checkoutError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 text-xs text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {checkoutError}
        </div>
      )}

      {/* Usage history */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Recent credit activity</h3>
        </div>
        {transactions === null ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-400">No credit activity yet.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">{reasonLabel(tx.reason)}</p>
                  <p className="text-[10px] text-slate-400">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <span className={`font-mono font-bold ${tx.amount < 0 ? 'text-slate-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {tx.amount > 0 ? '+' : ''}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <Check className="w-3 h-3" /> Starter and Pro upgrade instantly via Razorpay
        {localizedRate ? ` (charged in INR - ${localizedRate.currency} shown above is an approximate conversion)` : ''}.
        Need a custom/Enterprise plan or an invoice? Email <a href={SALES_EMAIL} className="underline">sales@lumoraos.in</a>.
      </p>
    </div>
  );
};
