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
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const STATUS_BADGE = {
  pending: "yellow",
  confirmed: "blue",
  preparing: "purple",
  delivery_requested: "purple",
  delivery_assigned: "indigo",
  out_for_delivery: "orange",
  delivered: "green",
  cancelled: "gray",
};

const PAYMENT_BADGE = {
  pending: "yellow",
  paid: "green",
  failed: "red",
  cod_pending: "orange",
  cod_paid: "green",
};

/* Allowed next statuses per current status (mirrors backend) */
const NEXT_STATUS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["delivery_requested"],
  delivery_requested: [],
  delivery_assigned: [],
  out_for_delivery: [],
  delivered: [],
  cancelled: [],
};

const BASE_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${BASE_URL}/${url.replace(/\\/g, "/")}` : null);

/* ── Detail Modal ── */
const OrderDetail = ({ order, onClose, onStatusUpdate }) => {
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState(null);
  const nextOpts = NEXT_STATUS[order.status] || [];
  const itemsSubtotal = order.items.reduce((s, i) => s + i.subtotal, 0);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleStatus = async (newStatus) => {
    setUpdating(true);
    try {
      await api.patch(`/orders/${order._id}`, { status: newStatus });
      showToast(`Order moved to "${newStatus.replace(/_/g, " ")}"`);
      onStatusUpdate();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to update status",
        "error",
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      {toast && (
        <div className={`ap-toast ap-toast--${toast.type}`}>{toast.msg}</div>
      )}
      <div
        className="ap-modal"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ap-modal-strip" />
        <div
          className="ap-modal-inner"
          style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              marginBottom: 20,
              gap: 12,
            }}
          >
            <div>
              <div className="ap-modal-title">{order.orderNumber}</div>
              <div
                style={{
                  fontSize: "0.78rem",
                  color: "var(--a-text2)",
                  marginTop: 2,
                }}
              >
                Placed {fmtDate(order.createdAt)}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <span
                className={`ap-badge ap-badge--${STATUS_BADGE[order.status]}`}
              >
                {order.status.replace(/_/g, " ")}
              </span>
              <span
                className={`ap-badge ap-badge--${PAYMENT_BADGE[order.paymentStatus]}`}
              >
                {order.paymentStatus.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Items */}
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "var(--ff-mono)",
                fontSize: "0.6rem",
                color: "var(--a-text3)",
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              // ITEMS
            </div>
            {order.items.map((item, i) => {
              const src = imgSrc(
                typeof item.iceCreamId === "object"
                  ? item.iceCreamId?.imageUrl
                  : null,
              );
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--a-border2)",
                  }}
                >
                  <div className="ap-thumb">
                    {src ? (
                      <img
                        src={src}
                        alt=""
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    ) : (
                      "🍦"
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        color: "var(--a-text)",
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{ fontSize: "0.75rem", color: "var(--a-text2)" }}
                    >
                      {item.size} · ₹{fmtINR(item.priceAtPurchase)} ×{" "}
                      {item.quantity}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: "var(--a-text)" }}>
                    ₹{fmtINR(item.subtotal)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bill */}
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
              ["Items subtotal", `₹${fmtINR(itemsSubtotal)}`],
              ["Delivery fee", `₹${fmtINR(order.deliveryFee)}`],
              ...(order.tip > 0 ? [["Tip", `₹${fmtINR(order.tip)}`]] : []),
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
                <span>{k}</span>
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
                fontSize: "0.95rem",
              }}
            >
              <span>Total</span>
              <span>₹{fmtINR(order.totalAmount)}</span>
            </div>
          </div>

          {/* Address */}
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontFamily: "var(--ff-mono)",
                fontSize: "0.6rem",
                color: "var(--a-text3)",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              // DELIVERY ADDRESS
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--a-text2)",
                lineHeight: 1.7,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--a-text)" }}>
                {order.deliveryAddress?.fullname}
              </div>
              <div>{order.deliveryAddress?.addressLine}</div>
              <div>
                {order.deliveryAddress?.city} — {order.deliveryAddress?.pincode}
              </div>
              <div>📞 {order.deliveryAddress?.phone}</div>
            </div>
          </div>

          {/* Payment */}
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                fontFamily: "var(--ff-mono)",
                fontSize: "0.6rem",
                color: "var(--a-text3)",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              // PAYMENT
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.83rem", color: "var(--a-text2)" }}>
                Method:{" "}
                <strong style={{ color: "var(--a-text)" }}>
                  {order.paymentMethod === "razorpay"
                    ? "Online (Razorpay)"
                    : "Cash on Delivery"}
                </strong>
              </span>
              {order.razorpayPaymentId && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontFamily: "var(--ff-mono)",
                    color: "var(--a-text2)",
                  }}
                >
                  TXN: {order.razorpayPaymentId}
                </span>
              )}
            </div>
          </div>

          {/* Status update */}
          {nextOpts.length > 0 && (
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
                // UPDATE STATUS
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {nextOpts.map((s) => (
                  <button
                    key={s}
                    className={`ap-btn ${s === "cancelled" ? "ap-btn--danger" : "ap-btn--primary"} ap-btn--sm`}
                    onClick={() => handleStatus(s)}
                    disabled={updating}
                  >
                    {updating ? <span className="ap-spin" /> : null}→{" "}
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {order.status === "cancelled" && order.cancellationReason && (
            <div
              className="ap-error-box"
              style={{ marginTop: 14, marginBottom: 0 }}
            >
              Cancelled by {order.cancelledByRole}: "{order.cancellationReason}"
            </div>
          )}
        </div>
        <div className="ap-modal-footer">
          <button className="ap-btn ap-btn--ghost" onClick={onClose}>
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
const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (statusFilter) params.set("status", statusFilter);
      if (paymentFilter) params.set("paymentStatus", paymentFilter);
      if (search.trim()) params.set("search", search.trim());
      const res = await api.get(`/orders?${params}`);
      setOrders(res.data.data || []);
      setPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch {
      showToast("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, paymentFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  return (
    <AdminLayout pageTitle="Orders" breadcrumb="OPERATIONS / ORDERS">
      {toast && (
        <div className={`ap-toast ap-toast--${toast.type}`}>{toast.msg}</div>
      )}
      {selected && (
        <OrderDetail
          order={selected}
          onClose={() => setSelected(null)}
          onStatusUpdate={() => {
            fetchOrders();
            setSelected(null);
          }}
        />
      )}

      <div className="ap-page-hd">
        <div className="ap-page-hd-left">
          <h1>Orders</h1>
          <p>{total} total orders</p>
        </div>
      </div>

      <div className="ap-card">
        {/* Filters */}
        <div className="ap-card-body" style={{ paddingBottom: 0 }}>
          <form onSubmit={handleSearchSubmit} className="ap-filters">
            <div className="ap-search-wrap">
              <div className="ap-search-icon">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <input
                className="ap-search"
                placeholder="Search order number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="ap-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              {Object.keys(STATUS_BADGE).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <select
              className="ap-select"
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Payment</option>
              {Object.keys(PAYMENT_BADGE).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </form>
        </div>

        {/* Table */}
        {loading ? (
          <div className="ap-center">
            <div className="ap-spin" />
            <span>Loading…</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="ap-center">
            <div className="ap-empty-icon">📋</div>
            <span>No orders found</span>
          </div>
        ) : (
          <div
            className="ap-table-wrap"
            style={{ border: "none", borderTop: "1px solid var(--a-border2)" }}
          >
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id}>
                    <td
                      className="ap-td-strong"
                      style={{
                        fontFamily: "var(--ff-mono)",
                        fontSize: "0.78rem",
                      }}
                    >
                      {o.orderNumber || "—"}
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>
                      <div>{o.userId?.name || o.userId?.username || "—"}</div>
                      <div
                        style={{ color: "var(--a-text4)", fontSize: "0.72rem" }}
                      >
                        {o.userId?.email}
                      </div>
                    </td>
                    <td>
                      {o.items?.reduce((s, i) => s + i.quantity, 0)} items
                    </td>
                    <td className="ap-td-strong">₹{fmtINR(o.totalAmount)}</td>
                    <td>
                      <span
                        className={`ap-badge ap-badge--${PAYMENT_BADGE[o.paymentStatus] || "gray"}`}
                      >
                        {o.paymentStatus?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ap-badge ap-badge--${STATUS_BADGE[o.status] || "gray"}`}
                      >
                        {o.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.75rem" }}>
                      {fmtDate(o.createdAt)}
                    </td>
                    <td>
                      <button
                        className="ap-btn ap-btn--ghost ap-btn--sm"
                        onClick={() => setSelected(o)}
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

        {/* Pagination */}
        {pages > 1 && (
          <div className="ap-pagination">
            <span className="ap-pagination-info">
              PAGE {page} / {pages} · {total} ORDERS
            </span>
            <div className="ap-pagination-btns">
              <button
                className="ap-page-btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <button
                className="ap-page-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pages}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
