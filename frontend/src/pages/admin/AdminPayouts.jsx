import { useState, useEffect, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../services/api";
import "./Admin.css";

const fmtINR = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const STATUS_BADGE = {
  pending: "yellow",
  processing: "blue",
  paid: "green",
  failed: "red",
};

/* ── Detail / Process Modal ── */
const PayoutDetail = ({ payout, onClose, onUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleProcess = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post(`/daily-payouts/${payout._id}/process`);
      showToast("Payout initiated via Razorpay!");
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to process payout.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setLoading(true);
    setError("");
    try {
      await api.patch(`/daily-payouts/${payout._id}`, {
        payoutStatus: newStatus,
        // Model requires paymentProvider when status is "paid"
        ...(newStatus === "paid" && !payout.paymentProvider
          ? { paymentProvider: "manual" }
          : {}),
      });
      showToast(`Status updated to "${newStatus}"`);
      setTimeout(() => {
        onUpdated();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update.");
    } finally {
      setLoading(false);
    }
  };

  const [showAccount, setShowAccount] = useState(false);
  const dp = payout.deliveryPersonId;

  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      {toast && (
        <div className={`ap-toast ap-toast--${toast.type}`}>{toast.msg}</div>
      )}
      <div
        className="ap-modal"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ap-modal-strip" />
        <div className="ap-modal-inner">
          <div className="ap-modal-title">Payout Details</div>
          <div className="ap-modal-sub">
            {dp?.fullname || "—"} · {fmtDate(payout.date)}
          </div>

          {error && <div className="ap-error-box">{error}</div>}

          {/* Summary */}
          <div
            style={{
              background: "rgba(99,102,241,0.04)",
              border: "1px solid var(--a-border2)",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 18,
            }}
          >
            {[
              ["Total Orders", payout.totalOrders],
              ["Base Pay", `₹${fmtINR(payout.totalBasePay)}`],
              ["Distance Pay", `₹${fmtINR(payout.totalDistancePay)}`],
              ["Surge Bonus", `₹${fmtINR(payout.totalSurgeBonus)}`],
              ["Tips", `₹${fmtINR(payout.totalTips)}`],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.83rem",
                  color: "var(--a-text2)",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--ff-mono)",
                    fontSize: "0.72rem",
                    color: "var(--a-text3)",
                    letterSpacing: 0.5,
                  }}
                >
                  {k}
                </span>
                <span>{v}</span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
                color: "var(--a-text)",
                paddingTop: 10,
                borderTop: "1px solid var(--a-border2)",
                fontSize: "1rem",
              }}
            >
              <span>Total Earnings</span>
              <span style={{ color: "var(--a-green)" }}>
                ₹{fmtINR(payout.totalEarnings)}
              </span>
            </div>
          </div>

          {/* Status & transaction */}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <span
              className={`ap-badge ap-badge--${STATUS_BADGE[payout.payoutStatus]}`}
            >
              {payout.payoutStatus}
            </span>
            {payout.paymentProvider && (
              <span className="ap-badge ap-badge--indigo">
                {payout.paymentProvider}
              </span>
            )}
          </div>

          {payout.transactionReference && (
            <div
              style={{
                fontSize: "0.75rem",
                fontFamily: "var(--ff-mono)",
                color: "var(--a-text2)",
                marginBottom: 14,
                wordBreak: "break-all",
              }}
            >
              TXN: {payout.transactionReference}
            </div>
          )}

          {payout.failureReason && (
            <div className="ap-error-box" style={{ marginBottom: 14 }}>
              Failure: {payout.failureReason}
            </div>
          )}

          {/* Bank details — only visible for failed payouts to help diagnose the failure */}
          {payout.payoutStatus === "failed" && dp?.bankDetails && (
            <div
              style={{
                background: "rgba(239,68,68,0.04)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--ff-mono)",
                  fontSize: "0.6rem",
                  color: "var(--a-text3)",
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                // BANK DETAILS
              </div>
              {[
                ["Bank", dp.bankDetails.bankName || "—"],
                ["UPI", dp.bankDetails.upiId || "—"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.83rem",
                    color: "var(--a-text2)",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--ff-mono)",
                      fontSize: "0.72rem",
                      color: "var(--a-text3)",
                      letterSpacing: 0.5,
                    }}
                  >
                    {k}
                  </span>
                  <span>{v}</span>
                </div>
              ))}
              {dp.bankDetails.accountNumber && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.83rem",
                    color: "var(--a-text2)",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--ff-mono)",
                      fontSize: "0.72rem",
                      color: "var(--a-text3)",
                      letterSpacing: 0.5,
                    }}
                  >
                    Account
                  </span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--ff-mono)",
                        fontSize: "0.8rem",
                        letterSpacing: 1,
                      }}
                    >
                      {showAccount
                        ? dp.bankDetails.accountNumber
                        : "•".repeat(
                            Math.max(
                              0,
                              dp.bankDetails.accountNumber.length - 4,
                            ),
                          ) + dp.bankDetails.accountNumber.slice(-4)}
                    </span>
                    <button
                      onClick={() => setShowAccount((v) => !v)}
                      style={{
                        background: "none",
                        border: "1px solid var(--a-border)",
                        borderRadius: 6,
                        cursor: "pointer",
                        padding: "2px 7px",
                        fontSize: "0.7rem",
                        color: "var(--a-text3)",
                        lineHeight: 1.6,
                      }}
                      title={showAccount ? "Hide" : "Reveal account number"}
                    >
                      {showAccount ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {payout.payoutStatus === "pending" && (
            <div>
              <div
                style={{
                  fontFamily: "var(--ff-mono)",
                  fontSize: "0.6rem",
                  color: "var(--a-text3)",
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                // ACTIONS
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="ap-btn ap-btn--primary"
                  onClick={handleProcess}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="ap-spin" /> Processing…
                    </>
                  ) : (
                    "💳 Process via Razorpay"
                  )}
                </button>
                <button
                  className="ap-btn ap-btn--success ap-btn--sm"
                  onClick={() => handleStatusUpdate("paid")}
                  disabled={loading}
                >
                  Mark Paid
                </button>
                <button
                  className="ap-btn ap-btn--danger ap-btn--sm"
                  onClick={() => handleStatusUpdate("failed")}
                  disabled={loading}
                >
                  Mark Failed
                </button>
              </div>
            </div>
          )}

          {payout.payoutStatus === "failed" && (
            <div>
              <div
                style={{
                  fontFamily: "var(--ff-mono)",
                  fontSize: "0.6rem",
                  color: "var(--a-text3)",
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                // RETRY
              </div>
              <button
                className="ap-btn ap-btn--primary ap-btn--sm"
                onClick={handleProcess}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="ap-spin" /> …
                  </>
                ) : (
                  "🔄 Retry Payout"
                )}
              </button>
            </div>
          )}
        </div>
        <div className="ap-modal-footer">
          <button
            className="ap-btn ap-btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const AdminPayouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/daily-payouts");
      setPayouts(res.data.data || []);
    } catch {
      showToast("Failed to load payouts", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  const filtered = statusFilter
    ? payouts.filter((p) => p.payoutStatus === statusFilter)
    : payouts;
  const totalPending = payouts
    .filter((p) => p.payoutStatus === "pending")
    .reduce((s, p) => s + (p.totalEarnings || 0), 0);
  const totalPaid = payouts
    .filter((p) => p.payoutStatus === "paid")
    .reduce((s, p) => s + (p.totalEarnings || 0), 0);

  return (
    <AdminLayout pageTitle="Payouts" breadcrumb="OPERATIONS / PAYOUTS">
      {toast && (
        <div className={`ap-toast ap-toast--${toast.type}`}>{toast.msg}</div>
      )}
      {selected && (
        <PayoutDetail
          payout={selected}
          onClose={() => setSelected(null)}
          onUpdated={fetchPayouts}
        />
      )}

      <div className="ap-page-hd">
        <div className="ap-page-hd-left">
          <h1>Payouts</h1>
          <p>Delivery person earnings & payouts</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="ap-stats-grid" style={{ marginBottom: 20 }}>
        {[
          {
            label: "Total Payouts",
            value: payouts.length,
            icon: "📋",
            sub: "All time",
          },
          {
            label: "Pending Amount",
            value: `₹${fmtINR(totalPending)}`,
            icon: "⏳",
            sub: `${payouts.filter((p) => p.payoutStatus === "pending").length} payouts`,
          },
          {
            label: "Total Paid Out",
            value: `₹${fmtINR(totalPaid)}`,
            icon: "✅",
            sub: `${payouts.filter((p) => p.payoutStatus === "paid").length} settled`,
          },
          {
            label: "Failed",
            value: payouts.filter((p) => p.payoutStatus === "failed").length,
            icon: "❌",
            sub: "Need attention",
          },
        ].map((s) => (
          <div className="ap-stat-card" key={s.label}>
            <div className="ap-stat-icon">{s.icon}</div>
            <div className="ap-stat-label">{s.label}</div>
            <div className="ap-stat-value">{s.value}</div>
            <div className="ap-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="ap-card">
        <div className="ap-card-body" style={{ paddingBottom: 0 }}>
          <div className="ap-filters">
            <select
              className="ap-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              {Object.keys(STATUS_BADGE).map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="ap-center">
            <div className="ap-spin" />
            <span>Loading…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ap-center">
            <div className="ap-empty-icon">💸</div>
            <span>No payouts found</span>
          </div>
        ) : (
          <div
            className="ap-table-wrap"
            style={{ border: "none", borderTop: "1px solid var(--a-border2)" }}
          >
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Delivery Person</th>
                  <th>Date</th>
                  <th>Orders</th>
                  <th>Base</th>
                  <th>Tips</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p._id}>
                    <td className="ap-td-strong">
                      {p.deliveryPersonId?.fullname || "—"}
                    </td>
                    <td style={{ fontSize: "0.78rem" }}>{fmtDate(p.date)}</td>
                    <td>{p.totalOrders}</td>
                    <td>₹{fmtINR(p.totalBasePay)}</td>
                    <td>₹{fmtINR(p.totalTips)}</td>
                    <td
                      className="ap-td-strong"
                      style={{ color: "var(--a-green)" }}
                    >
                      ₹{fmtINR(p.totalEarnings)}
                    </td>
                    <td>
                      <span
                        className={`ap-badge ap-badge--${STATUS_BADGE[p.payoutStatus]}`}
                      >
                        {p.payoutStatus}
                      </span>
                    </td>
                    <td>
                      <button
                        className="ap-btn ap-btn--ghost ap-btn--sm"
                        onClick={() => setSelected(p)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPayouts;
