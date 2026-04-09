import { useState, useEffect } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../services/api";
import "./Admin.css";

const BASE_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${BASE_URL}/${url.replace(/\\/g, "/")}` : null);

const fmtINR = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/* Status badge colors */
const ORDER_STATUS_BADGE = {
  pending: "yellow",
  confirmed: "blue",
  preparing: "purple",
  delivery_requested: "purple",
  delivery_assigned: "indigo",
  out_for_delivery: "orange",
  delivered: "green",
  cancelled: "gray",
};

const PAYMENT_STATUS_BADGE = {
  pending: "yellow",
  paid: "green",
  failed: "red",
  cod_pending: "orange",
  cod_paid: "green",
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [pendingDelivery, setPendingDelivery] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [ordersRes, deliveryRes] = await Promise.all([
          api.get("/orders?limit=100"),
          api.get("/delivery-persons?limit=100"),
        ]);

        const orders = ordersRes.data.data || [];
        const deliveryPersons = deliveryRes.data.data || [];

        // Compute stats
        const totalRevenue = orders
          .filter((o) =>
            [
              "delivered",
              "out_for_delivery",
              "preparing",
              "confirmed",
              "delivery_assigned",
              "delivery_requested",
            ].includes(o.status),
          )
          .reduce((s, o) => s + (o.totalAmount || 0), 0);

        const deliveredCount = orders.filter(
          (o) => o.status === "delivered",
        ).length;
        const activeCount = orders.filter(
          (o) => !["delivered", "cancelled"].includes(o.status),
        ).length;
        const cancelledCount = orders.filter(
          (o) => o.status === "cancelled",
        ).length;
        const pendingApprovals = deliveryPersons.filter(
          (d) => d.status === "pending",
        ).length;
        const activeRiders = deliveryPersons.filter(
          (d) => d.status === "active",
        ).length;

        setStats({
          totalOrders: orders.length,
          totalRevenue,
          deliveredCount,
          activeCount,
          cancelledCount,
          pendingApprovals,
          activeRiders,
          totalDelivery: deliveryPersons.length,
        });

        setRecentOrders(orders.slice(0, 8));
        setPendingDelivery(
          deliveryPersons.filter((d) => d.status === "pending").slice(0, 5),
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <AdminLayout pageTitle="Dashboard">
        <div className="ap-center">
          <div className="ap-spin" />
          <span>Loading dashboard…</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Dashboard" breadcrumb="OVERVIEW">
      {/* ── Stats ── */}
      <div className="ap-stats-grid">
        {[
          {
            label: "Total Orders",
            value: stats.totalOrders,
            icon: "📋",
            sub: `${stats.activeCount} active`,
          },
          {
            label: "Revenue",
            value: `₹${fmtINR(stats.totalRevenue)}`,
            icon: "💰",
            sub: "From non-cancelled orders",
          },
          {
            label: "Delivered",
            value: stats.deliveredCount,
            icon: "✅",
            sub: `${stats.cancelledCount} cancelled`,
          },
          {
            label: "Active Riders",
            value: stats.activeRiders,
            icon: "🛵",
            sub: `${stats.pendingApprovals} pending approval`,
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

      <div className="ap-grid-2" style={{ gap: 20, alignItems: "start" }}>
        {/* ── Recent Orders ── */}
        <div className="ap-card">
          <div className="ap-card-hd">
            <h2>📦 Recent Orders</h2>
          </div>
          {recentOrders.length === 0 ? (
            <div className="ap-center ap-empty-icon">No orders yet</div>
          ) : (
            <div className="ap-table-wrap" style={{ border: "none" }}>
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o._id}>
                      <td className="ap-td-strong">{o.orderNumber || "—"}</td>
                      <td>₹{fmtINR(o.totalAmount)}</td>
                      <td>
                        <span
                          className={`ap-badge ap-badge--${ORDER_STATUS_BADGE[o.status] || "gray"}`}
                        >
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.75rem" }}>
                        {fmtDate(o.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Pending Delivery Approvals ── */}
        <div className="ap-card">
          <div className="ap-card-hd">
            <h2>🛵 Pending Approvals</h2>
            <span className="ap-badge ap-badge--yellow">
              {stats.pendingApprovals} pending
            </span>
          </div>
          {pendingDelivery.length === 0 ? (
            <div className="ap-center" style={{ padding: "32px" }}>
              <div className="ap-empty-icon">✅</div>
              <span style={{ fontSize: "0.85rem" }}>No pending approvals</span>
            </div>
          ) : (
            <div
              className="ap-card-body"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {pendingDelivery.map((d) => (
                <div
                  key={d._id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    background: "rgba(99,102,241,0.05)",
                    border: "1px solid var(--a-border2)",
                    borderRadius: 10,
                  }}
                >
                  <div className="ap-thumb" style={{ width: 36, height: 36 }}>
                    {imgSrc(d.profilePicUrl) ? (
                      <img
                        src={imgSrc(d.profilePicUrl)}
                        alt=""
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    ) : (
                      "👤"
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--a-text)",
                      }}
                    >
                      {d.fullname}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--a-text2)",
                        fontFamily: "var(--ff-mono)",
                      }}
                    >
                      {d.vehicleType} · {d.userId?.email || ""}
                    </div>
                  </div>
                  <span className="ap-badge ap-badge--yellow">Pending</span>
                </div>
              ))}
              {stats.pendingApprovals > 5 && (
                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--a-text2)",
                    textAlign: "center",
                    padding: "4px 0",
                  }}
                >
                  +{stats.pendingApprovals - 5} more → go to Delivery Persons
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Order status breakdown ── */}
      <div className="ap-card" style={{ marginTop: 20 }}>
        <div className="ap-card-hd">
          <h2>📊 Order Status Breakdown</h2>
        </div>
        <div className="ap-card-body">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {Object.entries(ORDER_STATUS_BADGE).map(([status, color]) => {
              const count = recentOrders.filter(
                (o) => o.status === status,
              ).length;
              return (
                <div
                  key={status}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--a-border2)",
                    borderRadius: 10,
                  }}
                >
                  <span className={`ap-badge ap-badge--${color}`}>
                    {status.replace(/_/g, " ")}
                  </span>
                  <span
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: "var(--a-text)",
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
