import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import useOrderPolling from "./useOrderPolling";
import "./Delivery.css";

const DeliveryDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [incomingOrders, setIncomingOrders] = useState([]);
  const [earnings, setEarnings] = useState({ today: 0, unsettled: 0 });
  const [availability, setAvailability] = useState("offline");
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState("");

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const isOnline = availability === "online";
  const isBusy = availability === "busy";

  // Polling returns the full updated list on every tick
  const handleOrdersUpdate = useCallback((orders) => {
    setIncomingOrders(orders);
  }, []);

  useOrderPolling(isOnline, handleOrdersUpdate);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [profileRes, earningsRes, unsettledRes] = await Promise.all([
        api.get("/delivery-persons/me"),
        api.get("/delivery-earnings/my"),
        api.get("/delivery-earnings/my/unsettled"),
      ]);

      const p = profileRes.data.data;
      setProfile(p);
      setAvailability(p.availability);

      const allEarnings = earningsRes.data.data || [];
      const today = new Date().toDateString();
      const todayTotal = allEarnings
        .filter((e) => new Date(e.earningDate).toDateString() === today)
        .reduce((sum, e) => sum + e.totalEarning, 0);

      setEarnings({
        today: todayTotal,
        unsettled: unsettledRes.data.totalUnsettled || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    const newStatus = availability === "online" ? "offline" : "online";
    try {
      await api.patch("/delivery-persons/availability", {
        availability: newStatus,
      });
      setAvailability(newStatus);
      showToast(
        newStatus === "online"
          ? "You're now online 🟢"
          : "You're now offline 🔴",
      );
    } catch {
      showToast("Failed to update availability");
    }
  };

  const handleAccept = async (orderId) => {
    try {
      await api.post(`/orders/${orderId}/accept-delivery`);
      setIncomingOrders((prev) => prev.filter((o) => o._id !== orderId));
      showToast("Order accepted! 🎉");
      navigate(`/delivery/order/${orderId}`);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to accept");
    }
  };

  const handleReject = async (orderId) => {
    try {
      await api.post(`/orders/${orderId}/reject-delivery`);
      setIncomingOrders((prev) => prev.filter((o) => o._id !== orderId));
      showToast("Order rejected");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reject");
    }
  };

  if (loading) {
    return (
      <div className="dd-loading">
        <div className="dd-spinner" />
        <p>Loading dashboard…</p>
      </div>
    );
  }

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
          <Link to="/delivery/dashboard" className="dd-nav-item active">
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

        <div className="dd-sidebar-footer">
          <div className="dd-sidebar-avatar">
            {profile?.profilePicUrl ? (
              <img src={`/${profile.profilePicUrl}`} alt="avatar" />
            ) : (
              <span>{profile?.fullname?.[0] || "R"}</span>
            )}
          </div>
          <div className="dd-sidebar-user">
            <div className="dd-sidebar-name">{profile?.fullname}</div>
            <div className="dd-sidebar-role">Delivery Rider</div>
          </div>
        </div>
      </aside>

      <main className="dd-main">
        <div className="dd-header">
          <div>
            <h1 className="dd-header-title">Dashboard</h1>
            <p className="dd-header-sub">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>

          <div className="dd-header-right">
            {/* Polling status dot — green when online, grey when offline */}
            <div
              className={`dd-socket-dot ${isOnline ? "connected" : "disconnected"}`}
              title={
                isOnline
                  ? "Polling active — checking for orders"
                  : "Go online to receive orders"
              }
            />

            <button
              className={`dd-toggle-btn ${isOnline ? "online" : isBusy ? "busy" : "offline"}`}
              onClick={!isBusy ? toggleAvailability : undefined}
              disabled={isBusy}
            >
              <span className="dd-toggle-dot" />
              {isBusy ? "On Delivery" : isOnline ? "Online" : "Offline"}
            </button>
          </div>
        </div>

        <div className="dd-stats-grid">
          <div className="dd-stat-card accent">
            <div className="dd-stat-icon">💰</div>
            <div className="dd-stat-value">₹{earnings.today.toFixed(0)}</div>
            <div className="dd-stat-label">Today's Earnings</div>
          </div>
          <div className="dd-stat-card">
            <div className="dd-stat-icon">⏳</div>
            <div className="dd-stat-value">
              ₹{earnings.unsettled.toFixed(0)}
            </div>
            <div className="dd-stat-label">Unsettled Amount</div>
          </div>
          <div className="dd-stat-card">
            <div className="dd-stat-icon">⭐</div>
            <div className="dd-stat-value">
              {profile?.averageRating?.toFixed(1) || "—"}
            </div>
            <div className="dd-stat-label">Avg Rating</div>
          </div>
          <div className="dd-stat-card">
            <div className="dd-stat-icon">📦</div>
            <div className="dd-stat-value">{profile?.totalReviews || 0}</div>
            <div className="dd-stat-label">Total Deliveries</div>
          </div>
        </div>

        {isBusy && (
          <div className="dd-active-banner">
            <span className="dd-active-pulse" />
            <span>You have an active delivery in progress</span>
            <Link to="/delivery/active-order" className="dd-active-link">
              View Order →
            </Link>
          </div>
        )}

        <div className="dd-section">
          <div className="dd-section-header">
            <div className="dd-section-title-wrap">
              <h2 className="dd-section-title">Incoming Requests</h2>
              {incomingOrders.length > 0 && (
                <span className="dd-incoming-badge">
                  {incomingOrders.length}
                </span>
              )}
            </div>
            {!isOnline && !isBusy && (
              <span className="dd-offline-chip">
                Go online to receive orders
              </span>
            )}
          </div>

          {incomingOrders.length === 0 ? (
            <div className="dd-empty">
              <span className="dd-empty-icon">🛵</span>
              <p>No incoming delivery requests</p>
              <small>
                {isOnline
                  ? "Waiting for new orders… checking every 5 seconds"
                  : "You're currently offline"}
              </small>
            </div>
          ) : (
            <div className="dd-orders-list">
              {incomingOrders.map((order) => {
                const estEarning =
                  (order.deliveryFeeBreakdown?.basePay || 0) +
                  (order.deliveryFeeBreakdown?.distancePay || 0) +
                  (order.deliveryFeeBreakdown?.surgeBonus || 0) +
                  (order.tip || 0);

                return (
                  <div key={order._id} className="dd-order-card">
                    <div className="dd-order-top">
                      <div>
                        <div className="dd-order-num">{order.orderNumber}</div>
                        <div className="dd-order-addr">
                          {order.deliveryAddress?.addressLine},{" "}
                          {order.deliveryAddress?.city}
                        </div>
                      </div>
                      <div className="dd-order-fee">
                        <div className="dd-order-fee-val">
                          ₹{estEarning.toFixed(0)}
                        </div>
                        <div className="dd-order-fee-label">Est. Earnings</div>
                      </div>
                    </div>

                    <div className="dd-order-meta">
                      <span>📍 {order.distanceKm?.toFixed(1)} km</span>
                      <span>🛒 {order.items?.length} items</span>
                      <span>₹{order.totalAmount} order</span>
                      {order.deliveryFeeBreakdown?.surgeEnabled && (
                        <span className="dd-surge-chip">⚡ Surge</span>
                      )}
                      {order.tip > 0 && (
                        <span className="dd-tip-chip">🙏 Tip ₹{order.tip}</span>
                      )}
                    </div>

                    <div className="dd-order-actions">
                      <button
                        className="dd-btn-reject"
                        onClick={() => handleReject(order._id)}
                      >
                        Reject
                      </button>
                      <button
                        className="dd-btn-accept"
                        onClick={() => handleAccept(order._id)}
                      >
                        Accept Delivery
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {toastMsg && <div className="dd-toast">{toastMsg}</div>}
    </div>
  );
};

export default DeliveryDashboard;
