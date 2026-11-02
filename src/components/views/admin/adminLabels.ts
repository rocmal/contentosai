import { AdminActivityEntry, AdminCustomerPlan } from "../../../lib/adminApi";

export const card =
  "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs";
export const field =
  "w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-blue-500";
export const primaryButton =
  "px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50";
export const dangerButton =
  "px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50";
export const quietButton =
  "px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50";

/** Dates and times in India time, like the rest of the product. */
export function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function formatCredits(balance: number | null): string {
  return balance === null ? "Unlimited" : balance.toLocaleString("en-IN");
}

const PLAN_NAMES: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

/** Credits per 30 days (PLAN_CREDIT_ALLOTMENTS on the server). */
export const PLAN_CREDITS: Record<"starter" | "pro", string> = {
  starter: "2,500",
  pro: "10,000",
};

/** How many 30-day periods an admin can give at once (the server allows 1-12). */
export const MONTH_CHOICES = [1, 2, 3, 6, 12];

export function monthsText(months: number): string {
  return months === 1 ? "1 month" : `${months} months`;
}

/** "Trial", "Pro - paid", "Starter - given by admin", "Pro - lapsed". */
export function planLabel(plan: AdminCustomerPlan | null): {
  text: string;
  tone: "trial" | "active" | "lapsed";
} {
  if (!plan) return { text: "No plan", tone: "lapsed" };
  if (plan.status === "trialing") return { text: "Trial", tone: "trial" };
  const name = PLAN_NAMES[plan.plan] ?? plan.plan;
  if (plan.status === "active") {
    const source =
      plan.gatewayProvider === "admin"
        ? "given by admin"
        : plan.gatewayProvider
          ? "paid"
          : "invoice";
    return { text: `${name} - ${source}`, tone: "active" };
  }
  return {
    text: `${name} - ${plan.status === "past_due" ? "lapsed" : plan.status}`,
    tone: "lapsed",
  };
}

export const TONE_CLASS: Record<"trial" | "active" | "lapsed", string> = {
  trial: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  active:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  lapsed: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const CREDIT_REASONS: Record<string, string> = {
  "generation.text": "Text generation",
  "generation.image": "Image",
  "generation.voice": "Voice",
  "generation.video": "Video",
  "generation.character": "Character video",
  "plan.initial_grant": "Trial / first credits",
  "plan.monthly_grant": "Plan credits (new period)",
  "plan.expired": "Plan ended - credits removed",
  refund: "Refund",
  "admin.adjustment": "Admin adjustment",
};

export function creditReasonLabel(reason: string): string {
  return CREDIT_REASONS[reason] ?? reason;
}

/** One line per audit entry, e.g. "Added 500 credits" or "Gave 30 days of Pro". */
export function activityLabel(entry: AdminActivityEntry): string {
  const d = entry.details;
  const amount =
    typeof d.amount === "number"
      ? Math.abs(d.amount).toLocaleString("en-IN")
      : "";
  const email = typeof d.email === "string" ? d.email : "a person";
  switch (entry.action) {
    case "admin.credits.added":
      return `Added ${amount} credits`;
    case "admin.credits.removed":
      return `Removed ${amount} credits`;
    case "admin.plan.given": {
      // Entries from before months could be chosen have no "months": they were one period.
      const months = typeof d.months === "number" ? d.months : 1;
      return `${d.extended ? "Added" : "Gave"} ${monthsText(months)} of ${PLAN_NAMES[String(d.plan)] ?? String(d.plan)}`;
    }
    case "admin.customer.created": {
      const plan =
        d.plan === "trial"
          ? "on the trial"
          : `with ${monthsText(typeof d.months === "number" ? d.months : 1)} of ${PLAN_NAMES[String(d.plan)] ?? String(d.plan)}`;
      return `Opened the account for ${email} ${plan}`;
    }
    case "admin.user.suspended":
      return `Suspended ${email}`;
    case "admin.user.reactivated":
      return `Reactivated ${email}`;
    case "admin.user.password-reset-sent":
      return `Sent a password reset link to ${email}`;
    case "organization.created":
      return "Signed up";
    case "user.created":
      return "Account created";
    default:
      return entry.action;
  }
}
