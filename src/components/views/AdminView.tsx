import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  AdminActivityEntry,
  AdminCustomer,
  AdminCustomerPage,
  getAdminCustomer,
  listAdminActivity,
  searchAdminCustomers,
} from "../../lib/adminApi";
import { CustomerPanel } from "./admin/CustomerPanel";
import { NewCustomerForm } from "./admin/NewCustomerForm";
import {
  activityLabel,
  card,
  field,
  formatCredits,
  formatDate,
  planLabel,
  primaryButton,
  TONE_CLASS,
} from "./admin/adminLabels";

/**
 * Lumora's platform admins (PLATFORM_ADMIN_EMAILS on the server) find any customer and help them: credits, a plan
 * without payment, suspend or reactivate, a password reset link. Shown in the sidebar only for them; the server
 * refuses every call for anyone else. Every change asks for a reason and lands in the audit log.
 */
export const AdminView: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminCustomerPage | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [activity, setActivity] = useState<AdminActivityEntry[] | null>(null);
  // Opening an account for someone (shown where a customer would be).
  const [creating, setCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Search as the admin types, a moment after they stop.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setListError(null);
    searchAdminCustomers({ search: term, page })
      .then((r) => !cancelled && setResult(r))
      .catch(
        (err) =>
          !cancelled &&
          setListError(
            err instanceof Error ? err.message : "Could not load customers",
          ),
      );
    return () => {
      cancelled = true;
    };
  }, [term, page, reloadKey]);

  useEffect(() => {
    if (selectedId || creating) return;
    let cancelled = false;
    listAdminActivity(30)
      .then((a) => !cancelled && setActivity(a))
      .catch(() => !cancelled && setActivity([]));
    return () => {
      cancelled = true;
    };
  }, [selectedId, creating]);

  useEffect(() => {
    if (!selectedId) {
      setCustomer(null);
      return;
    }
    let cancelled = false;
    setCustomer(null);
    setCustomerError(null);
    getAdminCustomer(selectedId)
      .then((c) => !cancelled && setCustomer(c))
      .catch(
        (err) =>
          !cancelled &&
          setCustomerError(
            err instanceof Error ? err.message : "Could not load customer",
          ),
      );
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // An action answers with the customer as it is now: refresh the panel and that row of the list.
  const handleChange = (updated: AdminCustomer) => {
    setCustomer(updated);
    setResult((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((item) =>
              item.organizationId === updated.organizationId
                ? {
                    ...item,
                    balance: updated.balance,
                    plan: updated.plan,
                    suspendedCount: updated.suspendedCount,
                    memberCount: updated.memberCount,
                  }
                : item,
            ),
          }
        : prev,
    );
  };

  if (!user?.isPlatformAdmin) {
    return (
      <div className={`${card} p-6 text-center text-xs text-slate-500`}>
        This page is for Lumora's platform admins.
      </div>
    );
  }

  const meta = result?.meta;
  const openCustomer = (organizationId: string) => {
    setCreating(false);
    setSelectedId(organizationId);
  };
  const panelOpen = Boolean(selectedId) || creating;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] gap-4 items-start">
      <div className={`${panelOpen ? "hidden lg:block" : ""} space-y-3`}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name, email or id"
              className={`${field} pl-9`}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setCreating(true);
            }}
            className={`${primaryButton} shrink-0`}
          >
            <UserPlus className="w-3.5 h-3.5" /> New account
          </button>
        </div>

        <div className={`${card} overflow-hidden`}>
          {listError ? (
            <p className="p-4 text-[11px] text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {listError}
            </p>
          ) : !result ? (
            <div className="p-6 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : result.items.length === 0 ? (
            <p className="p-4 text-[11px] text-slate-500">
              No customer matches "{term}".
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {result.items.map((c) => {
                const plan = planLabel(c.plan);
                const selected = c.organizationId === selectedId;
                return (
                  <li key={c.organizationId}>
                    <button
                      type="button"
                      onClick={() => openCustomer(c.organizationId)}
                      className={`w-full text-left px-4 py-3 ${
                        selected
                          ? "bg-blue-50 dark:bg-blue-500/10"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {c.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {c.owner?.email ?? "No owner"}
                          </p>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white shrink-0">
                          {formatCredits(c.balance)}
                        </p>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold ${TONE_CLASS[plan.tone]}`}
                        >
                          {plan.text}
                        </span>
                        <span className="text-slate-500">
                          {c.memberCount}{" "}
                          {c.memberCount === 1 ? "person" : "people"}
                        </span>
                        {c.suspendedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full font-semibold bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300">
                            {c.suspendedCount} suspended
                          </span>
                        )}
                        <span className="text-slate-400">
                          active {formatDate(c.lastActiveAt)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 disabled:opacity-40"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Newer
            </button>
            <span>
              Page {meta.currentPage} of {meta.totalPages} · {meta.totalItems}{" "}
              customers
            </span>
            <button
              type="button"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 disabled:opacity-40"
            >
              Older <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className={panelOpen ? "" : "hidden lg:block"}>
        {creating ? (
          <NewCustomerForm
            onCreated={() => setReloadKey((k) => k + 1)}
            onOpen={openCustomer}
            onCancel={() => setCreating(false)}
          />
        ) : selectedId ? (
          customerError ? (
            <div
              className={`${card} p-4 text-[11px] text-red-600 dark:text-red-400`}
            >
              {customerError}{" "}
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="underline"
              >
                Back
              </button>
            </div>
          ) : !customer ? (
            <div className={`${card} p-10 flex justify-center`}>
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : (
            <CustomerPanel
              customer={customer}
              adminUserId={user.id}
              onChange={handleChange}
              onBack={() => setSelectedId(null)}
            />
          )
        ) : (
          <section className={`${card} p-4`}>
            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white mb-3">
              <ShieldCheck className="w-4 h-4 text-blue-600" /> Recent admin
              actions
            </h3>
            {!activity ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : activity.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Nothing yet. Pick a customer on the left to add credits, give a
                plan or help with their account.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {activity.map((entry) => (
                  <li key={entry.id} className="text-[11px]">
                    <button
                      type="button"
                      disabled={!entry.organizationId}
                      onClick={() =>
                        entry.organizationId &&
                        openCustomer(entry.organizationId)
                      }
                      className="text-left text-slate-700 dark:text-slate-200 hover:text-blue-600"
                    >
                      {activityLabel(entry)}
                      {entry.customerName && (
                        <span className="font-semibold">
                          {" "}
                          · {entry.customerName}
                        </span>
                      )}
                    </button>
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
        )}
      </div>
    </div>
  );
};
