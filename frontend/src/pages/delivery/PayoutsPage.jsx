import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./Delivery.css";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "yellow" },
  processing: { label: "Processing", color: "blue" },
  paid: { label: "Paid", color: "green" },
  failed: { label: "Failed", color: "red" },
};

const PayoutsPage = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/daily-payouts/my")
      .then((res) => setPayouts(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = payouts
    .filter((p) => p.payoutStatus === "paid")
    .reduce((s, p) => s + p.totalEarnings, 0);
  const totalPending = payouts
    .filter((p) => ["pending", "processing"].includes(p.payoutStatus))
    .reduce((s, p) => s + p.totalEarnings, 0);

  return (
    <div className="dd-page">
      <div className="dd-noise" />

      <aside className="dd-sidebar">
        <div className="dd-sidebar-logo">
          <span className="dd-sidebar-logo-icon">🛵</span>
          <div>
            <div className="dd-sidebar-brand">DELIVERY</div>
            <div className="dd-sidebar-brand-sub">PORTAL</div>
          </div>
        </div>
        <nav className="dd-nav">
          <Link to="/delivery/dashboard" className="dd-nav-item">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
          </Link>
          <Link to="/delivery/earnings" className="dd-nav-item">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Earnings
          </Link>
          <Link to="/delivery/payouts" className="dd-nav-item active">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <line x1="2" y1="10" x2="22" y2="10" />
            </svg>
            Payouts
          </Link>
          <Link to="/delivery/profile" className="dd-nav-item">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Profile
          </Link>
        </nav>
      </aside>

      <main className="dd-main">
        <div className="dd-header">
          <div>
            <h1 className="dd-header-title">Payouts</h1>
            <p className="dd-header-sub">Daily payout history & status</p>
          </div>
        </div>

        <div className="dd-stats-grid cols-2">
          <div className="dd-stat-card accent">
            <div className="dd-stat-icon">✅</div>
            <div className="dd-stat-value">₹{totalPaid.toFixed(0)}</div>
            <div className="dd-stat-label">Total Paid Out</div>
          </div>
          <div className="dd-stat-card">
            <div className="dd-stat-icon">⏳</div>
            <div className="dd-stat-value">₹{totalPending.toFixed(0)}</div>
            <div className="dd-stat-label">Pending Payouts</div>
          </div>
        </div>

        <div className="dd-info-box">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Payouts are processed automatically every night at 11:59 PM via
          Razorpay to your registered bank account.
        </div>

        {loading ? (
          <div className="dd-loading-inline">
            <div className="dd-spinner" />
          </div>
        ) : payouts.length === 0 ? (
          <div className="dd-empty">
            <span className="dd-empty-icon">💸</span>
            <p>No payouts yet</p>
            <small>Complete deliveries to start earning!</small>
          </div>
        ) : (
          <div className="dd-payouts-list">
            {payouts.map((payout) => {
              const cfg =
                STATUS_CONFIG[payout.payoutStatus] || STATUS_CONFIG.pending;
              return (
                <div key={payout._id} className="dd-payout-card">
                  <div className="dd-payout-left">
                    <div className="dd-payout-date">
                      {new Date(payout.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    <div className="dd-payout-meta">
                      <span>{payout.totalOrders} orders</span>
                      {payout.transactionReference && (
                        <span className="dd-txn-ref">
                          TXN: {payout.transactionReference.slice(-8)}
                        </span>
                      )}
                    </div>
                    <div className="dd-payout-breakdown">
                      <span>Base ₹{payout.totalBasePay?.toFixed(0)}</span>
                      <span>Dist ₹{payout.totalDistancePay?.toFixed(0)}</span>
                      {payout.totalSurgeBonus > 0 && (
                        <span>Surge ₹{payout.totalSurgeBonus?.toFixed(0)}</span>
                      )}
                      {payout.totalTips > 0 && (
                        <span>Tips ₹{payout.totalTips?.toFixed(0)}</span>
                      )}
                    </div>
                  </div>
                  <div className="dd-payout-right">
                    <div className="dd-payout-amount">
                      ₹{payout.totalEarnings?.toFixed(0)}
                    </div>
                    <div className={`dd-payout-badge ${cfg.color}`}>
                      {cfg.label}
                    </div>
                    {payout.payoutStatus === "failed" &&
                      payout.failureReason && (
                        <div className="dd-payout-fail-reason">
                          {payout.failureReason}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default PayoutsPage;
