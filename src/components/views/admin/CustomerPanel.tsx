import React, { useState } from "react";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Coins,
  Crown,
  History,
  KeyRound,
  Loader2,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  AdminCustomer,
  AdminCustomerPerson,
  AdminCustomerWorkspace,
  AdminGivablePlan,
  adjustAdminCredits,
  giveAdminPlan,
  sendAdminPasswordReset,
  setAdminSuspended,
} from "../../../lib/adminApi";
import {
  activityLabel,
  card,
  creditReasonLabel,
  dangerButton,
  field,
  formatCredits,
  formatDate,
  MONTH_CHOICES,
  monthsText,
  PLAN_CREDITS,
  planLabel,
  primaryButton,
  quietButton,
  TONE_CLASS,
} from "./adminLabels";

interface CustomerPanelProps {
  customer: AdminCustomer;
  /** The signed-in admin, who cannot suspend themselves. */
  adminUserId: string;
  onChange: (customer: AdminCustomer) => void;
  onBack: () => void;
}

const errorText = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong. Try again.";

const SectionTitle: React.FC<{
  icon: React.ElementType;
  children: React.ReactNode;
}> = ({ icon: Icon, children }) => (
  <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-3">
    <Icon className="w-4 h-4 text-blue-600" />
    {children}
  </h3>
);

const ErrorLine: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">{message}</p>
  ) : null;

/** Add or remove credits in one workspace. Every change needs a reason; it goes to the audit log only. */
const CreditsForm: React.FC<{
  customer: AdminCustomer;
  workspace: AdminCustomerWorkspace;
  onChange: (customer: AdminCustomer) => void;
}> = ({ customer, workspace, onChange }) => {
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const value = Number.parseInt(amount, 10);
  const valid =
    Number.isInteger(value) && value > 0 && reason.trim().length >= 3;
  const unlimited = workspace.balance === null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const signed = direction === "add" ? value : -value;
      onChange(
        await adjustAdminCredits(
          customer.organizationId,
          workspace.workspaceId,
          signed,
          reason.trim(),
        ),
      );
      setDone(
        `${direction === "add" ? "Added" : "Removed"} ${value.toLocaleString("en-IN")} credits.`,
      );
      setAmount("");
      setReason("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate">
          {workspace.name}
        </p>
        <p className="text-sm font-bold text-slate-900 dark:text-white">
          {workspace.hasWallet ? formatCredits(workspace.balance) : "No wallet"}
          {workspace.hasWallet && workspace.balance !== null && (
            <span className="ml-1 text-[11px] font-medium text-slate-500">
              credits
            </span>
          )}
        </p>
      </div>
      {workspace.cycleEndAt && workspace.balance !== null && (
        <p className="text-[10px] text-slate-500 mt-0.5">
          Period ends {formatDate(workspace.cycleEndAt)}
        </p>
      )}
      {workspace.hasWallet && !unlimited && (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <div className="flex gap-2">
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
              {(["add", "remove"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDirection(d)}
                  className={`px-3 text-[11px] font-semibold ${
                    direction === d
                      ? "bg-blue-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {d === "add" ? "Add" : "Remove"}
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              max={100000}
              inputMode="numeric"
              placeholder="Credits"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={field}
            />
          </div>
          <input
            placeholder="Reason (kept in the audit log, not shown to the customer)"
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            className={field}
          />
          <button
            type="submit"
            disabled={!valid || busy}
            className={`${primaryButton} w-full`}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {valid
              ? `${direction === "add" ? "Add" : "Remove"} ${value.toLocaleString("en-IN")} credits`
              : "Enter credits and a reason"}
          </button>
        </form>
      )}
      {unlimited && (
        <p className="mt-2 text-[11px] text-slate-500">
          Unlimited credits: nothing to add or remove.
        </p>
      )}
      {done && (
        <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
          {done}
        </p>
      )}
      <ErrorLine message={error} />
    </div>
  );
};

/** Starter or Pro for 1-12 months without a payment (until the payment gateway is live). */
const PlanForm: React.FC<{
  customer: AdminCustomer;
  onChange: (customer: AdminCustomer) => void;
}> = ({ customer, onChange }) => {
  const [plan, setPlan] = useState<AdminGivablePlan>("starter");
  const [months, setMonths] = useState(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = planLabel(customer.plan);
  const until =
    customer.plan?.accessUntil ?? customer.plan?.currentPeriodEnd ?? null;
  const stillActive =
    customer.plan?.status === "active" &&
    until !== null &&
    new Date(until).getTime() > Date.now();
  // The same plan still running is extended; anything else starts again today.
  const extends_ = stillActive && customer.plan?.plan === plan;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 3) return;
    const name = plan === "pro" ? "Pro" : "Starter";
    const credits = PLAN_CREDITS[plan];
    const ok = window.confirm(
      extends_
        ? `Add ${monthsText(months)} of ${name} for ${customer.name}?\n\nThey follow the time they already have ` +
            `(until ${formatDate(until)}). Their credits are not changed now.`
        : `Give ${customer.name} ${monthsText(months)} of ${name}, starting today?\n\n` +
            `Their credits are set to ${credits} now and again every 30 days (unused credits do not carry over).` +
            (stillActive ? ` This replaces their current plan.` : ""),
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      onChange(
        await giveAdminPlan(
          customer.organizationId,
          plan,
          months,
          reason.trim(),
        ),
      );
      setReason("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span
          className={`px-2 py-0.5 rounded-full font-semibold ${TONE_CLASS[label.tone]}`}
        >
          {label.text}
        </span>
        {until && customer.plan?.status !== "trialing" && (
          <span className="text-slate-500">
            {stillActive ? "until" : "ended"} {formatDate(until)}
          </span>
        )}
      </div>
      {stillActive &&
        (customer.plan?.prepaidPeriods ?? 0) > 0 &&
        customer.plan?.currentPeriodEnd && (
          <p className="mt-1 text-[10px] text-slate-500">
            Credits start again {formatDate(customer.plan.currentPeriodEnd)},
            then every 30 days ({customer.plan.prepaidPeriods} more{" "}
            {customer.plan.prepaidPeriods === 1 ? "period" : "periods"}).
          </p>
        )}
      <form onSubmit={submit} className="mt-3 space-y-2">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as AdminGivablePlan)}
            className={field}
          >
            <option value="starter">Starter - 2,500 credits / 30 days</option>
            <option value="pro">Pro - 10,000 credits / 30 days</option>
          </select>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className={field}
          >
            {MONTH_CHOICES.map((m) => (
              <option key={m} value={m}>
                {monthsText(m)}
              </option>
            ))}
          </select>
        </div>
        <input
          placeholder="Reason, e.g. paid by bank transfer, pilot customer"
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          className={field}
        />
        <button
          type="submit"
          disabled={reason.trim().length < 3 || busy}
          className={`${primaryButton} w-full`}
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {extends_ ? "Add" : "Give"} {monthsText(months)} of{" "}
          {plan === "pro" ? "Pro" : "Starter"}
        </button>
        <p className="text-[10px] text-slate-500 leading-relaxed">
          No payment needed. Credits reset to the plan's amount every 30 days
          and the plan ends after the last month unless they pay or you give
          more. Enterprise is set up by hand, not here.
        </p>
      </form>
      <ErrorLine message={error} />
    </div>
  );
};

const PersonRow: React.FC<{
  customer: AdminCustomer;
  person: AdminCustomerPerson;
  adminUserId: string;
  onChange: (customer: AdminCustomer) => void;
}> = ({ customer, person, adminUserId, onChange }) => {
  const suspended = person.status === "suspended";
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"status" | "reset" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const isMe = person.userId === adminUserId;

  const changeStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 3) return;
    setBusy("status");
    setError(null);
    try {
      onChange(
        await setAdminSuspended(
          customer.organizationId,
          person.userId,
          !suspended,
          reason.trim(),
        ),
      );
      setAsking(false);
      setReason("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  const sendReset = async () => {
    setBusy("reset");
    setError(null);
    try {
      onChange(
        await sendAdminPasswordReset(customer.organizationId, person.userId),
      );
      setResetSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
            {person.name}
            {person.isOwner && (
              <span className="ml-1.5 text-[10px] font-medium text-slate-500">
                owner
              </span>
            )}
          </p>
          <p className="text-[11px] text-slate-500 truncate">{person.email}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {person.role ?? "No role"} · last sign-in{" "}
            {formatDate(person.lastLoginAt, true)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {suspended ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300">
              Suspended
            </span>
          ) : person.status === "invited" ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              Hasn't set a password yet
            </span>
          ) : !person.isEmailVerified ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Email not verified
            </span>
          ) : null}
          {!suspended && (
            <button
              type="button"
              onClick={sendReset}
              disabled={busy !== null || resetSent}
              className={quietButton}
            >
              <span className="flex items-center gap-1">
                {busy === "reset" ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <KeyRound className="w-3 h-3" />
                )}
                {resetSent ? "Reset link sent" : "Send reset link"}
              </span>
            </button>
          )}
          {!isMe && (
            <button
              type="button"
              onClick={() => setAsking((v) => !v)}
              disabled={busy !== null}
              className={quietButton}
            >
              <span
                className={`flex items-center gap-1 ${suspended ? "" : "text-red-600 dark:text-red-400"}`}
              >
                {suspended ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Ban className="w-3 h-3" />
                )}
                {suspended ? "Reactivate" : "Suspend"}
              </span>
            </button>
          )}
        </div>
      </div>
      {asking && (
        <form
          onSubmit={changeStatus}
          className="mt-2 flex flex-col sm:flex-row gap-2"
        >
          <input
            autoFocus
            placeholder={
              suspended
                ? "Why reactivate?"
                : "Why suspend? They are signed out everywhere at once."
            }
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            className={field}
          />
          <button
            type="submit"
            disabled={reason.trim().length < 3 || busy !== null}
            className={`${suspended ? primaryButton : dangerButton} shrink-0`}
          >
            {busy === "status" && (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            )}
            {suspended ? "Reactivate" : "Suspend"}
          </button>
        </form>
      )}
      <ErrorLine message={error} />
    </li>
  );
};

/** One customer: credits, plan, people, credit history and what admins did. */
export const CustomerPanel: React.FC<CustomerPanelProps> = ({
  customer,
  adminUserId,
  onChange,
  onBack,
}) => (
  <div className="space-y-4">
    <div className={`${card} p-4`}>
      <button
        type="button"
        onClick={onBack}
        className="lg:hidden mb-3 flex items-center gap-1 text-[11px] font-semibold text-blue-600"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All customers
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
            {customer.name}
          </h2>
          <p className="text-[11px] text-slate-500 truncate">
            {customer.owner?.email ?? "No owner"} · signed up{" "}
            {formatDate(customer.createdAt)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
            {customer.organizationId}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-slate-900 dark:text-white">
            {formatCredits(customer.balance)}
          </p>
          <p className="text-[10px] text-slate-500">credits left</p>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <section className={`${card} p-4`}>
        <SectionTitle icon={Coins}>Credits</SectionTitle>
        <div className="space-y-2">
          {customer.workspaces.length === 0 && (
            <p className="text-[11px] text-slate-500">No workspace.</p>
          )}
          {customer.workspaces.map((w) => (
            <CreditsForm
              key={w.workspaceId}
              customer={customer}
              workspace={w}
              onChange={onChange}
            />
          ))}
        </div>
      </section>

      <section className={`${card} p-4`}>
        <SectionTitle icon={Crown}>Plan</SectionTitle>
        <PlanForm customer={customer} onChange={onChange} />
      </section>
    </div>

    <section className={`${card} p-4`}>
      <SectionTitle icon={Users}>
        People ({customer.people.length})
      </SectionTitle>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {customer.people.map((p) => (
          <PersonRow
            key={p.userId}
            customer={customer}
            person={p}
            adminUserId={adminUserId}
            onChange={onChange}
          />
        ))}
      </ul>
    </section>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <section className={`${card} p-4`}>
        <SectionTitle icon={History}>Credit history</SectionTitle>
        {customer.transactions.length === 0 ? (
          <p className="text-[11px] text-slate-500">Nothing yet.</p>
        ) : (
          <ul className="space-y-1.5 max-h-80 overflow-y-auto custom-scroll pr-1">
            {customer.transactions.map((tx) => (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <div className="min-w-0">
                  <p className="text-slate-700 dark:text-slate-200 truncate">
                    {creditReasonLabel(tx.reason)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatDate(tx.createdAt, true)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-semibold ${
                      tx.amount >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount.toLocaleString("en-IN")}
                  </p>
                  {tx.balanceAfter !== null && (
                    <p className="text-[10px] text-slate-400">
                      left {tx.balanceAfter.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${card} p-4`}>
        <SectionTitle icon={ShieldCheck}>Activity</SectionTitle>
        {customer.activity.length === 0 ? (
          <p className="text-[11px] text-slate-500">Nothing recorded yet.</p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto custom-scroll pr-1">
            {customer.activity.map((entry) => (
              <li key={entry.id} className="text-[11px]">
                <p className="text-slate-700 dark:text-slate-200">
                  {activityLabel(entry)}
                </p>
                {typeof entry.details.reason === "string" && (
                  <p className="text-slate-500 italic">
                    "{entry.details.reason}"
                  </p>
                )}
                <p className="text-[10px] text-slate-400">
                  {formatDate(entry.createdAt, true)}
                  {entry.by ? ` · ${entry.by}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  </div>
);
