import React, { useState } from "react";
import { ArrowLeft, Check, Copy, Loader2, UserPlus } from "lucide-react";
import {
  AdminCustomer,
  createAdminCustomer,
  NewAdminCustomer,
} from "../../../lib/adminApi";
import {
  card,
  field,
  MONTH_CHOICES,
  monthsText,
  PLAN_CREDITS,
  primaryButton,
  quietButton,
} from "./adminLabels";

interface NewCustomerFormProps {
  onCreated: (customer: AdminCustomer) => void;
  onOpen: (organizationId: string) => void;
  onCancel: () => void;
}

const label =
  "block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1";

/**
 * Opens an account for someone until the payment gateway is live: their own workspace with the trial or a plan given
 * for some months. They choose their password with a link (valid 7 days) that is emailed and shown here once to copy,
 * e.g. into WhatsApp, in case the email does not arrive.
 */
export const NewCustomerForm: React.FC<NewCustomerFormProps> = ({
  onCreated,
  onOpen,
  onCancel,
}) => {
  const [form, setForm] = useState<NewAdminCustomer>({
    email: "",
    firstName: "",
    lastName: "",
    organizationName: "",
    plan: "starter",
    months: 1,
    sendEmail: true,
    reason: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    customer: AdminCustomer;
    link: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const set = <K extends keyof NewAdminCustomer>(
    key: K,
    value: NewAdminCustomer[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));
  const valid =
    /^\S+@\S+\.\S+$/.test(form.email.trim()) &&
    form.firstName.trim().length > 0 &&
    form.reason.trim().length >= 3;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const result = await createAdminCustomer({
        ...form,
        organizationName: form.organizationName?.trim() || undefined,
        reason: form.reason.trim(),
      });
      setCreated({ customer: result.customer, link: result.setPasswordLink });
      onCreated(result.customer);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open the account. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link is selectable in the box.
    }
  };

  if (created) {
    const person = created.customer.people[0];
    return (
      <section className={`${card} p-4 space-y-3`}>
        <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
          <Check className="w-4 h-4 text-emerald-600" /> Account opened for{" "}
          {person?.email ?? form.email}
        </h3>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
          {form.sendEmail ? "We emailed them this link. " : ""}Send it to them
          (for example on WhatsApp) so they can choose a password. It works for
          7 days and is shown only now; after that they can use "Forgot
          password", or you can send a reset link from their page.
        </p>
        <div className="flex gap-2">
          <input
            readOnly
            value={created.link}
            onFocus={(e) => e.target.select()}
            className={`${field} font-mono`}
          />
          <button
            type="button"
            onClick={copy}
            className={`${primaryButton} shrink-0`}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onOpen(created.customer.organizationId)}
            className={quietButton}
          >
            Open {created.customer.name}
          </button>
          <button type="button" onClick={onCancel} className={quietButton}>
            Done
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`${card} p-4`}>
      <button
        type="button"
        onClick={onCancel}
        className="lg:hidden mb-3 flex items-center gap-1 text-[11px] font-semibold text-blue-600"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All customers
      </button>
      <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-1">
        <UserPlus className="w-4 h-4 text-blue-600" /> Open an account
      </h3>
      <p className="text-[11px] text-slate-500 mb-4">
        For someone who should have access before online payment is available.
        They get their own workspace.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>First name</label>
            <input
              value={form.firstName}
              maxLength={100}
              onChange={(e) => set("firstName", e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className={label}>Last name</label>
            <input
              value={form.lastName}
              maxLength={100}
              onChange={(e) => set("lastName", e.target.value)}
              className={field}
            />
          </div>
        </div>
        <div>
          <label className={label}>Email (they sign in with it)</label>
          <input
            type="email"
            value={form.email}
            maxLength={255}
            onChange={(e) => set("email", e.target.value)}
            className={field}
          />
        </div>
        <div>
          <label className={label}>Business name (optional)</label>
          <input
            value={form.organizationName}
            maxLength={150}
            placeholder={
              form.firstName
                ? `${form.firstName}'s Workspace`
                : "e.g. Singh Insurance Advisors"
            }
            onChange={(e) => set("organizationName", e.target.value)}
            className={field}
          />
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label className={label}>Plan</label>
            <select
              value={form.plan}
              onChange={(e) =>
                set("plan", e.target.value as NewAdminCustomer["plan"])
              }
              className={field}
            >
              <option value="trial">Trial - 500 credits once</option>
              <option value="starter">
                Starter - {PLAN_CREDITS.starter} credits / 30 days
              </option>
              <option value="pro">
                Pro - {PLAN_CREDITS.pro} credits / 30 days
              </option>
            </select>
          </div>
          <div>
            <label className={label}>For</label>
            <select
              value={form.months}
              disabled={form.plan === "trial"}
              onChange={(e) => set("months", Number(e.target.value))}
              className={`${field} disabled:opacity-50`}
            >
              {MONTH_CHOICES.map((m) => (
                <option key={m} value={m}>
                  {monthsText(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={label}>Reason (kept in the audit log)</label>
          <input
            value={form.reason}
            maxLength={300}
            placeholder="e.g. paid by bank transfer, pilot customer"
            onChange={(e) => set("reason", e.target.value)}
            className={field}
          />
        </div>
        <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={form.sendEmail}
            onChange={(e) => set("sendEmail", e.target.checked)}
          />
          Email them the link to choose a password (you also get it to copy)
        </label>
        {error && (
          <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={!valid || busy}
            className={primaryButton}
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Open account
          </button>
          <button type="button" onClick={onCancel} className={quietButton}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
};
