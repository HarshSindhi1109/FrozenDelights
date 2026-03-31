import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { logoutUser } from "../../services/authService";
import "./Orders.css";

/* ─── helpers ─────────────────────────────── */
const BASE_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${BASE_URL}/${url}` : null);

const fmtDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmtINR = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

/* ─── Status config ─────────────────────────── */
const STATUS_CONFIG = {
  pending: {
    label: "Order Placed",
    icon: "🕐",
    badgeClass: "or-badge--pending",
  },
  confirmed: {
    label: "Confirmed",
    icon: "✅",
    badgeClass: "or-badge--confirmed",
  },
  preparing: {
    label: "Preparing",
    icon: "🍦",
    badgeClass: "or-badge--preparing",
  },
  delivery_requested: {
    label: "Finding Rider",
    icon: "🔍",
    badgeClass: "or-badge--delivery_requested",
  },
  delivery_assigned: {
    label: "Rider Assigned",
    icon: "🛵",
    badgeClass: "or-badge--delivery_assigned",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    icon: "🚀",
    badgeClass: "or-badge--out_for_delivery",
  },
  delivered: {
    label: "Delivered",
    icon: "🎉",
    badgeClass: "or-badge--delivered",
  },
  cancelled: {
    label: "Cancelled",
    icon: "✖",
    badgeClass: "or-badge--cancelled",
  },
};

const PAYMENT_STATUS_CONFIG = {
  pending: { label: "Awaiting Payment", cls: "or-pay-badge--pending" },
  paid: { label: "Paid", cls: "or-pay-badge--paid" },
  failed: { label: "Payment Failed", cls: "or-pay-badge--failed" },
  cod_pending: { label: "Pay on Delivery", cls: "or-pay-badge--cod_pending" },
  cod_paid: { label: "COD Collected", cls: "or-pay-badge--cod_paid" },
};

// Ordered tracker steps (cancelled has its own branch)
const TRACKER_STEPS = [
  "pending",
  "confirmed",
  "preparing",
  "delivery_requested",
  "delivery_assigned",
  "out_for_delivery",
  "delivered",
];

const FILTER_OPTIONS = [
  { value: "", label: "All Orders" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

/* ══════════════════════════════════════════
   STATUS BADGE
══════════════════════════════════════════ */
const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    icon: "•",
    badgeClass: "",
  };
  return (
    <span className={`or-badge ${cfg.badgeClass}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

const PaymentBadge = ({ status }) => {
  const cfg = PAYMENT_STATUS_CONFIG[status] || { label: status, cls: "" };
  return <span className={`or-pay-badge ${cfg.cls}`}>{cfg.label}</span>;
};

/* ══════════════════════════════════════════
   ORDER TRACKER
══════════════════════════════════════════ */
const OrderTracker = ({ status }) => {
  if (status === "cancelled") {
    return (
      <div className="or-tracker">
        <div className="or-tracker-steps">
          <div className="or-tracker-step">
            <div className="or-tracker-left">
              <div className="or-tracker-dot or-tracker-dot--done">✓</div>
            </div>
            <div className="or-tracker-right">
              <p className="or-tracker-label or-tracker-label--done">
                Order Placed
              </p>
            </div>
          </div>
          <div className="or-tracker-step">
            <div className="or-tracker-left">
              <div className="or-tracker-line" />
              <div className="or-tracker-dot or-tracker-dot--cancelled">✖</div>
            </div>
            <div className="or-tracker-right">
              <p className="or-tracker-label or-tracker-label--cancelled">
                Order Cancelled
              </p>
              <p className="or-tracker-sub">This order was cancelled</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeIdx = TRACKER_STEPS.indexOf(status);

  return (
    <div className="or-tracker">
      <div className="or-tracker-steps">
        {TRACKER_STEPS.map((step, i) => {
          const done = i < activeIdx;
          const active = i === activeIdx;
          const cfg = STATUS_CONFIG[step];
          return (
            <div key={step} className="or-tracker-step">
              <div className="or-tracker-left">
                {i > 0 && (
                  <div
                    className={`or-tracker-line${done || active ? " or-tracker-line--done" : ""}`}
                  />
                )}
                <div
                  className={`or-tracker-dot${
                    done
                      ? " or-tracker-dot--done"
                      : active
                        ? " or-tracker-dot--active"
                        : ""
                  }`}
                >
                  {done ? "✓" : cfg.icon}
                </div>
              </div>
              <div className="or-tracker-right">
                <p
                  className={`or-tracker-label${
                    active
                      ? " or-tracker-label--active"
                      : done
                        ? " or-tracker-label--done"
                        : ""
                  }`}
                >
                  {cfg.label}
                </p>
                {active && <p className="or-tracker-sub">Current status</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   ORDER LIST
══════════════════════════════════════════ */
const OrderList = ({ onView, showPlaced }) => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 8 });
      if (filter) params.set("status", filter);
      const res = await api.get(`/orders/my?${params}`);
      setOrders(res.data.data || []);
      setPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleFilterChange = (val) => {
    setFilter(val);
    setPage(1);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    }
    navigate("/login");
  };

  return (
    <>
      <nav className="or-nav">
        <div className="or-nav-inner">
          <button
            className="or-nav-back"
            onClick={() => navigate("/customer/home")}
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Home
          </button>
          <span className="or-nav-brand">
            <span>🍦</span> My Orders
          </span>
          <button className="or-nav-logout" onClick={handleLogout}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </nav>

      <div className="or-list-wrap">
        {/* Placed success banner */}
        {showPlaced && (
          <div className="or-placed-banner">
            <div className="or-placed-icon">🎉</div>
            <div className="or-placed-body">
              <h3>Order placed successfully!</h3>
              <p>We're preparing your frozen treats. Track your order below.</p>
            </div>
          </div>
        )}

        <div className="or-list-hd">
          <h1>My Orders</h1>
          <p>
            {total > 0
              ? `${total} order${total !== 1 ? "s" : ""}`
              : "No orders yet"}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="or-filters">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`or-filter-btn${filter === opt.value ? " or-filter-btn--active" : ""}`}
              onClick={() => handleFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="or-center">
            <div className="or-spin or-spin--pink" />
            <p>Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="or-center or-empty">
            <div className="or-empty-icon">🛒</div>
            <h2>No orders yet</h2>
            <p>
              {filter
                ? "No orders with this status."
                : "You haven't placed any orders yet!"}
            </p>
            <button
              className="or-btn or-btn--primary"
              onClick={() => navigate("/customer/home")}
            >
              Browse Flavours
            </button>
          </div>
        ) : (
          <>
            {orders.map((order) => {
              const imgItems = order.items.slice(0, 3);
              const extra = order.items.length - 3;
              const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);
              return (
                <div
                  key={order._id}
                  className="or-card"
                  onClick={() => onView(order._id)}
                >
                  <div className="or-card-top">
                    <div>
                      <p className="or-card-num">{order.orderNumber || "—"}</p>
                      <p className="or-card-date">{fmtDate(order.createdAt)}</p>
                    </div>
                    <div className="or-card-status-col">
                      <StatusBadge status={order.status} />
                      <PaymentBadge status={order.paymentStatus} />
                    </div>
                  </div>

                  {/* Thumbnails */}
                  <div className="or-card-thumbs">
                    {imgItems.map((item, i) => {
                      const src = imgSrc(
                        typeof item.iceCreamId === "object"
                          ? item.iceCreamId?.imageUrl
                          : null,
                      );
                      return (
                        <div key={i} className="or-thumb">
                          {src ? (
                            <img
                              src={src}
                              alt=""
                              onError={(e) => {
                                e.target.style.display = "none";
                              }}
                            />
                          ) : (
                            "🍦"
                          )}
                        </div>
                      );
                    })}
                    {extra > 0 && (
                      <span className="or-thumb-more">+{extra} more</span>
                    )}
                  </div>

                  <div className="or-card-bottom">
                    <span className="or-card-items-label">
                      {itemCount} item{itemCount !== 1 ? "s" : ""}
                    </span>
                    <span className="or-card-total">
                      ₹{fmtINR(order.totalAmount)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {pages > 1 && (
              <div className="or-pagination">
                <button
                  className="or-page-btn"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                <span className="or-page-info">
                  Page {page} of {pages}
                </span>
                <button
                  className="or-page-btn"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === pages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="or-footer">
        <span>🍦 FrozenDelights · © {new Date().getFullYear()}</span>
      </footer>
    </>
  );
};

/* ══════════════════════════════════════════
   ORDER DETAIL
══════════════════════════════════════════ */
const OrderDetail = ({ orderId, onBack, onCancelled }) => {
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  /* Cancel flow */
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  /* Toast */
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/orders/${orderId}`);
      setOrder(res.data.data);
    } catch {
      showToast("Failed to load order", "error");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      await api.patch(`/orders/${orderId}/cancel`, {
        reason: cancelReason.trim() || "Cancelled by customer",
      });
      showToast("Order cancelled successfully");
      setShowCancel(false);
      await fetchOrder(); // re-fetch to show updated status
      if (onCancelled) onCancelled();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Could not cancel order",
        "error",
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    }
    navigate("/login");
  };

  const canCancel = order && ["pending", "confirmed"].includes(order.status);

  const itemsSubtotal = order
    ? order.items.reduce((s, i) => s + i.subtotal, 0)
    : 0;

  return (
    <>
      {toast && (
        <div className={`or-toast or-toast--${toast.type}`}>{toast.msg}</div>
      )}

      <nav className="or-nav">
        <div className="or-nav-inner">
          <button className="or-nav-back" onClick={onBack}>
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Orders
          </button>
          <span className="or-nav-brand">
            <span>🍦</span> Order Details
          </span>
          <button className="or-nav-logout" onClick={handleLogout}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      </nav>

      {loading ? (
        <div className="or-center">
          <div className="or-spin or-spin--pink" />
          <p>Loading order…</p>
        </div>
      ) : !order ? (
        <div className="or-center or-empty">
          <div className="or-empty-icon">😕</div>
          <h2>Order not found</h2>
          <button className="or-btn or-btn--outline" onClick={onBack}>
            Back to Orders
          </button>
        </div>
      ) : (
        <div className="or-detail-wrap">
          {/* ── Header ── */}
          <div className="or-detail-header">
            <div>
              <p className="or-detail-num">{order.orderNumber}</p>
              <p className="or-detail-date">
                Placed on {fmtDate(order.createdAt)}
              </p>
            </div>
            <div className="or-detail-badges">
              <StatusBadge status={order.status} />
              <PaymentBadge status={order.paymentStatus} />
            </div>
          </div>

          {/* ── Tracker ── */}
          <div className="or-section">
            <div className="or-section-hd">
              <h2>
                <span>📦</span> Order Status
              </h2>
              <button
                className="or-btn or-btn--ghost"
                style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                onClick={fetchOrder}
              >
                Refresh
              </button>
            </div>
            <OrderTracker status={order.status} />

            {/* Cancellation reason if cancelled */}
            {order.status === "cancelled" && order.cancellationReason && (
              <div style={{ padding: "0 20px 20px" }}>
                <div className="or-cancelled-info">
                  <p>
                    <strong>Reason:</strong> {order.cancellationReason}
                    {order.cancelledByRole
                      ? ` · Cancelled by ${order.cancelledByRole}`
                      : ""}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── Items ── */}
          <div className="or-section">
            <div className="or-section-hd">
              <h2>
                <span>🍦</span> Items (
                {order.items.reduce((s, i) => s + i.quantity, 0)})
              </h2>
            </div>
            <div className="or-section-body">
              {order.items.map((item, i) => {
                const src = imgSrc(
                  typeof item.iceCreamId === "object"
                    ? item.iceCreamId?.imageUrl
                    : null,
                );
                return (
                  <div key={i} className="or-item-row">
                    <div className="or-item-img">
                      {src ? (
                        <img
                          src={src}
                          alt={item.name}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        "🍦"
                      )}
                    </div>
                    <div className="or-item-info">
                      <p className="or-item-name">{item.name}</p>
                      <p className="or-item-meta">
                        {item.size} · ₹{fmtINR(item.priceAtPurchase)} ×{" "}
                        {item.quantity}
                      </p>
                    </div>
                    <span className="or-item-price">
                      ₹{fmtINR(item.subtotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Price breakdown ── */}
          <div className="or-section">
            <div className="or-section-hd">
              <h2>
                <span>💰</span> Bill Summary
              </h2>
            </div>
            <div className="or-section-body">
              <div className="or-price-row">
                <span>Items subtotal</span>
                <span>₹{fmtINR(itemsSubtotal)}</span>
              </div>
              <div className="or-price-row">
                <span>
                  Delivery fee
                  {order.distanceKm > 0 && (
                    <span
                      style={{ color: "var(--or-text3)", fontSize: "0.78rem" }}
                    >
                      {" "}
                      ({order.distanceKm.toFixed(1)} km)
                    </span>
                  )}
                  {order.deliveryFeeBreakdown?.surgeEnabled && (
                    <span
                      style={{
                        background: "#fef3c7",
                        color: "#d97706",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "1px 6px",
                        borderRadius: "999px",
                        marginLeft: "6px",
                      }}
                    >
                      ⚡ Surge
                    </span>
                  )}
                </span>
                <span>₹{fmtINR(order.deliveryFee)}</span>
              </div>
              {order.tip > 0 && (
                <div className="or-price-row">
                  <span>Tip 🙏</span>
                  <span>₹{fmtINR(order.tip)}</span>
                </div>
              )}
              <div className="or-price-row or-price-row--total">
                <span>Total Paid</span>
                <span>₹{fmtINR(order.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* ── Delivery address ── */}
          <div className="or-section">
            <div className="or-section-hd">
              <h2>
                <span>📍</span> Delivery Address
              </h2>
            </div>
            <div className="or-section-body">
              <div className="or-addr-block">
                <p className="or-addr-name">{order.deliveryAddress.fullname}</p>
                <p>{order.deliveryAddress.addressLine}</p>
                <p>
                  {order.deliveryAddress.city}
                  {order.deliveryAddress.state
                    ? `, ${order.deliveryAddress.state}`
                    : ""}{" "}
                  — {order.deliveryAddress.pincode}
                </p>
                <p>📞 {order.deliveryAddress.phone}</p>
              </div>
            </div>
          </div>

          {/* ── Payment info ── */}
          <div className="or-section">
            <div className="or-section-hd">
              <h2>
                <span>💳</span> Payment
              </h2>
            </div>
            <div className="or-section-body">
              <div className="or-pay-row">
                <span>Method</span>
                <span>
                  {order.paymentMethod === "razorpay"
                    ? "Online (Razorpay)"
                    : "Cash on Delivery"}
                </span>
              </div>
              <div className="or-pay-row">
                <span>Status</span>
                <PaymentBadge status={order.paymentStatus} />
              </div>
              {order.razorpayPaymentId && (
                <div className="or-pay-row">
                  <span>Transaction ID</span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontFamily: "monospace",
                      color: "var(--or-text3)",
                    }}
                  >
                    {order.razorpayPaymentId}
                  </span>
                </div>
              )}
              {order.paidAt && (
                <div className="or-pay-row">
                  <span>Paid at</span>
                  <span>{fmtDate(order.paidAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Cancel section ── */}
          {canCancel && (
            <div className="or-cancel-section">
              <h3>Cancel Order</h3>
              <p>
                You can cancel this order as it hasn't started preparing yet.
              </p>
              {!showCancel ? (
                <button
                  className="or-btn or-btn--danger"
                  onClick={() => setShowCancel(true)}
                >
                  Cancel Order
                </button>
              ) : (
                <>
                  <textarea
                    className="or-cancel-reason"
                    placeholder="Reason for cancellation (optional)"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <div className="or-cancel-btns">
                    <button
                      className="or-btn or-btn--ghost"
                      onClick={() => {
                        setShowCancel(false);
                        setCancelReason("");
                      }}
                      disabled={cancelling}
                    >
                      Keep Order
                    </button>
                    <button
                      className="or-btn or-btn--danger"
                      onClick={handleCancel}
                      disabled={cancelling}
                    >
                      {cancelling ? (
                        <>
                          <span className="or-spin" /> Cancelling…
                        </>
                      ) : (
                        "Confirm Cancel"
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <footer className="or-footer">
        <span>🍦 FrozenDelights · © {new Date().getFullYear()}</span>
      </footer>
    </>
  );
};

/* ══════════════════════════════════════════
   ROOT: handles both /customer/orders and
         /customer/orders/:id
══════════════════════════════════════════ */
const Orders = () => {
  const { id } = useParams(); // undefined on list page
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const showPlaced = searchParams.get("placed") === "1";

  // Clear ?placed=1 after first render so refresh doesn't re-show banner
  useEffect(() => {
    if (showPlaced) {
      const t = setTimeout(() => {
        setSearchParams({}, { replace: true });
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [showPlaced, setSearchParams]);

  if (id) {
    return (
      <div className="or-page">
        <OrderDetail
          orderId={id}
          onBack={() => navigate("/customer/orders")}
          onCancelled={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="or-page">
      <OrderList
        showPlaced={showPlaced}
        onView={(orderId) => navigate(`/customer/orders/${orderId}`)}
      />
    </div>
  );
};

export default Orders;
