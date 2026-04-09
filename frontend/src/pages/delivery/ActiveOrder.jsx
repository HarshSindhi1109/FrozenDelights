import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import "./Delivery.css";

const STATUS_STEPS = [
  { key: "delivery_assigned", label: "Order Assigned", icon: "✅" },
  { key: "out_for_delivery", label: "Picked Up", icon: "📦" },
  { key: "delivered", label: "Delivered", icon: "🎉" },
];

const ActiveOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");

  const showToast = (msg, type = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(""), 3500);
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data.data);
    } catch {
      showToast("Failed to load order", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePickup = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/orders/${id}/pickup`);
      showToast("Order picked up! Head to customer 🚀");
      fetchOrder();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeliver = async () => {
    setActionLoading(true);
    try {
      await api.patch(`/orders/${id}/deliver`);
      showToast("Delivery completed! Great job 🎉");
      setTimeout(() => navigate("/delivery/dashboard"), 1500);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dd-loading">
        <div className="dd-spinner" />
        <p>Loading order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="dd-loading">
        <p>Order not found</p>
        <Link to="/delivery/dashboard">← Back to Dashboard</Link>
      </div>
    );
  }

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === order.status);

  return (
    <div className="dd-page">
      <div className="dd-noise" />

      {/* Sidebar */}
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

      {/* Main */}
      <main className="dd-main">
        <div className="dd-header">
          <div>
            <Link to="/delivery/dashboard" className="dd-back-link">
              ← Back
            </Link>
            <h1 className="dd-header-title">Active Delivery</h1>
            <p className="dd-header-sub">{order.orderNumber}</p>
          </div>
          <div className={`dd-status-badge status-${order.status}`}>
            {order.status.replace(/_/g, " ").toUpperCase()}
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="dd-stepper">
          {STATUS_STEPS.map((step, i) => (
            <div
              key={step.key}
              className={`dd-step ${i <= currentStepIdx ? "done" : ""} ${i === currentStepIdx ? "active" : ""}`}
            >
              <div className="dd-step-circle">
                {i < currentStepIdx ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{step.icon}</span>
                )}
              </div>
              <div className="dd-step-label">{step.label}</div>
              {i < STATUS_STEPS.length - 1 && <div className="dd-step-line" />}
            </div>
          ))}
        </div>

        <div className="dd-active-grid">
          {/* Customer Info */}
          <div className="dd-card">
            <div className="dd-card-title">📍 Delivery Address</div>
            <div className="dd-address-block">
              <div className="dd-address-name">
                {order.deliveryAddress.fullname}
              </div>
              <div className="dd-address-phone">
                {order.deliveryAddress.phone}
              </div>
              <div className="dd-address-line">
                {order.deliveryAddress.addressLine}
              </div>
              <div className="dd-address-city">
                {order.deliveryAddress.city}, {order.deliveryAddress.pincode}
              </div>
            </div>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(
                `${order.deliveryAddress.addressLine}, ${order.deliveryAddress.city}`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="dd-map-btn"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Open in Maps
            </a>
          </div>

          {/* Order Items */}
          <div className="dd-card">
            <div className="dd-card-title">🍦 Order Items</div>
            <div className="dd-items-list">
              {order.items.map((item, i) => (
                <div key={i} className="dd-item-row">
                  <div className="dd-item-info">
                    <span className="dd-item-name">{item.name}</span>
                    <span className="dd-item-size">{item.size}</span>
                  </div>
                  <div className="dd-item-right">
                    <span className="dd-item-qty">×{item.quantity}</span>
                    <span className="dd-item-price">₹{item.subtotal}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="dd-order-summary">
              <div className="dd-summary-row">
                <span>Items Total</span>
                <span>₹{order.items.reduce((s, i) => s + i.subtotal, 0)}</span>
              </div>
              <div className="dd-summary-row">
                <span>Delivery Fee</span>
                <span>₹{order.deliveryFee}</span>
              </div>
              {order.tip > 0 && (
                <div className="dd-summary-row tip">
                  <span>Tip 🙏</span>
                  <span>₹{order.tip}</span>
                </div>
              )}
              <div className="dd-summary-row total">
                <span>Total</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Earnings for this order */}
          <div className="dd-card earnings-card">
            <div className="dd-card-title">💰 Your Earnings</div>
            <div className="dd-earning-breakdown">
              <div className="dd-earning-row">
                <span>Base Pay</span>
                <span>₹{order.deliveryFeeBreakdown?.basePay || 0}</span>
              </div>
              <div className="dd-earning-row">
                <span>Distance Pay ({order.distanceKm?.toFixed(1)} km)</span>
                <span>₹{order.deliveryFeeBreakdown?.distancePay || 0}</span>
              </div>
              {order.deliveryFeeBreakdown?.surgeEnabled && (
                <div className="dd-earning-row surge">
                  <span>
                    ⚡ Surge Bonus (
                    {order.deliveryFeeBreakdown?.surgeMultiplier}x)
                  </span>
                  <span>₹{order.deliveryFeeBreakdown?.surgeBonus || 0}</span>
                </div>
              )}
              {order.tip > 0 && (
                <div className="dd-earning-row tip">
                  <span>Customer Tip 🙏</span>
                  <span>₹{order.tip}</span>
                </div>
              )}
              <div className="dd-earning-total">
                <span>Total Earned</span>
                <span>
                  ₹
                  {(
                    (order.deliveryFeeBreakdown?.basePay || 0) +
                    (order.deliveryFeeBreakdown?.distancePay || 0) +
                    (order.deliveryFeeBreakdown?.surgeBonus || 0) +
                    (order.tip || 0)
                  ).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {order.status === "delivery_assigned" && (
          <div className="dd-action-area">
            <p className="dd-action-hint">
              Go to the shop, collect the order, then mark it as picked up.
            </p>
            <button
              className="dd-primary-btn"
              onClick={handlePickup}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing…" : "📦 Mark as Picked Up"}
            </button>
          </div>
        )}

        {order.status === "out_for_delivery" && (
          <div className="dd-action-area">
            <p className="dd-action-hint">
              Hand over the ice cream to the customer and confirm delivery.
            </p>
            <button
              className="dd-primary-btn green"
              onClick={handleDeliver}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing…" : "✅ Confirm Delivery"}
            </button>
          </div>
        )}

        {order.status === "delivered" && (
          <div className="dd-delivered-banner">
            🎉 Order delivered successfully! Great work, rider.
          </div>
        )}
      </main>

      {toastMsg && <div className={`dd-toast ${toastType}`}>{toastMsg}</div>}
    </div>
  );
};

export default ActiveOrder;
