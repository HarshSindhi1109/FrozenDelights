import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./Delivery.css";

const EarningsPage = () => {
  const [earnings, setEarnings] = useState([]);
  const [unsettled, setUnsettled] = useState({ total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | settled | unsettled

  useEffect(() => {
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const [allRes, unsettledRes] = await Promise.all([
        api.get("/delivery-earnings/my"),
        api.get("/delivery-earnings/my/unsettled"),
      ]);
      setEarnings(allRes.data.data || []);
      setUnsettled({
        total: unsettledRes.data.totalUnsettled || 0,
        count: unsettledRes.data.data?.length || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = earnings.filter((e) => {
    if (filter === "settled") return e.isSettled;
    if (filter === "unsettled") return !e.isSettled;
    return true;
  });

  const totalAll = earnings.reduce((s, e) => s + e.totalEarning, 0);
  const totalSettled = earnings
    .filter((e) => e.isSettled)
    .reduce((s, e) => s + e.totalEarning, 0);

  const today = new Date().toDateString();
  const todayEarnings = earnings
    .filter((e) => new Date(e.earningDate).toDateString() === today)
    .reduce((s, e) => s + e.totalEarning, 0);

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
          <Link to="/delivery/earnings" className="dd-nav-item active">
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
          <Link to="/delivery/payouts" className="dd-nav-item">
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
            <h1 className="dd-header-title">Earnings</h1>
            <p className="dd-header-sub">Your delivery income breakdown</p>
          </div>
        </div>

        {/* Stats */}
        <div className="dd-stats-grid">
          <div className="dd-stat-card accent">
            <div className="dd-stat-icon">💰</div>
            <div className="dd-stat-value">₹{todayEarnings.toFixed(0)}</div>
            <div className="dd-stat-label">Today</div>
          </div>
          <div className="dd-stat-card">
            <div className="dd-stat-icon">⏳</div>
            <div className="dd-stat-value">₹{unsettled.total.toFixed(0)}</div>
            <div className="dd-stat-label">Unsettled ({unsettled.count})</div>
          </div>
          <div className="dd-stat-card">
            <div className="dd-stat-icon">✅</div>
            <div className="dd-stat-value">₹{totalSettled.toFixed(0)}</div>
            <div className="dd-stat-label">Total Settled</div>
          </div>
          <div className="dd-stat-card">
            <div className="dd-stat-icon">📊</div>
            <div className="dd-stat-value">₹{totalAll.toFixed(0)}</div>
            <div className="dd-stat-label">All Time</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="dd-tabs">
          {["all", "unsettled", "settled"].map((f) => (
            <button
              key={f}
              className={`dd-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="dd-loading-inline">
            <div className="dd-spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="dd-empty">
            <span className="dd-empty-icon">📭</span>
            <p>No earnings found</p>
          </div>
        ) : (
          <div className="dd-earnings-list">
            {filtered.map((earning) => (
              <div key={earning._id} className="dd-earning-card">
                <div className="dd-earning-left">
                  <div className="dd-earning-date">
                    {new Date(earning.earningDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="dd-earning-breakdown-mini">
                    {earning.basePay > 0 && (
                      <span>Base ₹{earning.basePay}</span>
                    )}
                    {earning.distancePay > 0 && (
                      <span>Distance ₹{earning.distancePay}</span>
                    )}
                    {earning.surgeBonus > 0 && (
                      <span className="surge">
                        ⚡ Surge ₹{earning.surgeBonus}
                      </span>
                    )}
                    {earning.tipAmount > 0 && (
                      <span className="tip">Tip ₹{earning.tipAmount}</span>
                    )}
                  </div>
                </div>
                <div className="dd-earning-right">
                  <div className="dd-earning-total-val">
                    ₹{earning.totalEarning}
                  </div>
                  <div
                    className={`dd-earning-status ${earning.isSettled ? "settled" : "pending"}`}
                  >
                    {earning.isSettled ? "Settled" : "Pending"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default EarningsPage;
