import { useState, useEffect, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../services/api";
import "./Admin.css";

const BASE_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${BASE_URL}/${url.replace(/\\/g, "/")}` : null);
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
  active: "green",
  suspended: "red",
  inactive: "gray",
  rejected: "gray",
};

const VEHICLE_LABELS = {
  bicycle: "🚲 Bicycle",
  e_bike: "⚡ E-Bike",
  scooter: "🛵 Scooter",
  e_scooter: "⚡ E-Scooter",
  motorcycle: "🏍️ Motorcycle",
};

/* ── Detail / Action Modal ── */
const DeliveryDetail = ({ person, onClose, onAction }) => {
  const [suspendForm, setSuspendForm] = useState({
    from: "",
    to: "",
    reason: "",
  });
  const [view, setView] = useState("info"); // info | suspend
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      await api.patch(`/delivery-persons/${person._id}/approve`);
      showToast("Approved successfully!");
      setTimeout(() => {
        onAction();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await api.patch(`/delivery-persons/${person._id}/reject`);
      showToast("Rejected.");
      setTimeout(() => {
        onAction();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject.");
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!suspendForm.from || !suspendForm.to || !suspendForm.reason.trim()) {
      setError("All suspension fields are required.");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/delivery-persons/${person._id}/suspend`, {
        from: suspendForm.from,
        to: suspendForm.to,
        reason: suspendForm.reason,
      });
      showToast("Suspended.");
      setTimeout(() => {
        onAction();
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to suspend.");
    } finally {
      setLoading(false);
    }
  };

  const profileSrc = imgSrc(person.profilePicUrl);

  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      {toast && (
        <div className={`ap-toast ap-toast--${toast.type}`}>{toast.msg}</div>
      )}
      <div
        className="ap-modal"
        style={{ maxWidth: 580 }}
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
              gap: 16,
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid var(--a-border)",
                background: "var(--a-bg3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.6rem",
                flexShrink: 0,
              }}
            >
              {profileSrc ? (
                <img
                  src={profileSrc}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => (e.target.style.display = "none")}
                />
              ) : (
                "👤"
              )}
            </div>
            <div>
              <div className="ap-modal-title" style={{ marginBottom: 4 }}>
                {person.fullname}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span
                  className={`ap-badge ap-badge--${STATUS_BADGE[person.status]}`}
                >
                  {person.status}
                </span>
                <span className="ap-badge ap-badge--indigo">
                  {VEHICLE_LABELS[person.vehicleType] || person.vehicleType}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: 6,
              marginBottom: 18,
              borderBottom: "1px solid var(--a-border2)",
              paddingBottom: 12,
            }}
          >
            {["info", ...(person.status === "active" ? ["suspend"] : [])].map(
              (tab) => (
                <button
                  key={tab}
                  className={`ap-btn ap-btn--sm ${view === tab ? "ap-btn--primary" : "ap-btn--ghost"}`}
                  onClick={() => {
                    setView(tab);
                    setError("");
                  }}
                >
                  {tab === "info" ? "Info" : "Suspend"}
                </button>
              ),
            )}
          </div>

          {error && (
            <div className="ap-error-box" style={{ marginBottom: 14 }}>
              {error}
            </div>
          )}

          {view === "info" && (
            <>
              {[
                ["Phone", person.phone],
                ["Email", person.userId?.email || "—"],
                [
                  "Vehicle",
                  VEHICLE_LABELS[person.vehicleType] || person.vehicleType,
                ],
                [
                  "Rating",
                  `★ ${(person.averageRating || 0).toFixed(1)} (${person.totalReviews} reviews)`,
                ],
                ["Applied", fmtDate(person.createdAt)],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px dashed var(--a-border2)",
                    fontSize: "0.85rem",
                  }}
                >
                  <span
                    style={{
                      color: "var(--a-text3)",
                      fontFamily: "var(--ff-mono)",
                      fontSize: "0.72rem",
                      letterSpacing: 1,
                    }}
                  >
                    {k}
                  </span>
                  <span style={{ color: "var(--a-text)" }}>{v}</span>
                </div>
              ))}

              {/* Documents */}
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontFamily: "var(--ff-mono)",
                    fontSize: "0.6rem",
                    color: "var(--a-text3)",
                    letterSpacing: 1,
                    marginBottom: 10,
                  }}
                >
                  // DOCUMENTS
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    ["Govt ID", person.govtIdUrl],
                    ["Driving License", person.drivingLicenseUrl],
                    ["Vehicle Reg.", person.vehicleRegistrationUrl],
                  ]
                    .filter(([, url]) => url)
                    .map(([label, url]) => (
                      <a
                        key={label}
                        href={`${import.meta.env.VITE_IMG_URL}/${url?.replace(/\\/g, "/")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="ap-btn ap-btn--ghost ap-btn--sm"
                        style={{ textDecoration: "none" }}
                      >
                        📄 {label}
                      </a>
                    ))}
                </div>
              </div>

              {/* Suspension info */}
              {person.status === "suspended" && person.suspension && (
                <div
                  style={{
                    marginTop: 16,
                    background: "var(--a-red-pale)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 10,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--ff-mono)",
                      fontSize: "0.6rem",
                      color: "#fca5a5",
                      letterSpacing: 1,
                      marginBottom: 6,
                    }}
                  >
                    // SUSPENSION DETAILS
                  </div>
                  <div style={{ fontSize: "0.83rem", color: "#fca5a5" }}>
                    <div>
                      From: {fmtDate(person.suspension.from)} · To:{" "}
                      {fmtDate(person.suspension.to)}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      Reason: {person.suspension.reason}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {view === "suspend" && (
            <>
              <div className="ap-grid-2">
                <div className="ap-field">
                  <label className="ap-label">From</label>
                  <input
                    className="ap-input"
                    type="date"
                    value={suspendForm.from}
                    onChange={(e) =>
                      setSuspendForm((f) => ({ ...f, from: e.target.value }))
                    }
                  />
                </div>
                <div className="ap-field">
                  <label className="ap-label">To</label>
                  <input
                    className="ap-input"
                    type="date"
                    value={suspendForm.to}
                    onChange={(e) =>
                      setSuspendForm((f) => ({ ...f, to: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="ap-field">
                <label className="ap-label">Reason</label>
                <textarea
                  className="ap-input ap-textarea"
                  placeholder="Reason for suspension…"
                  value={suspendForm.reason}
                  onChange={(e) =>
                    setSuspendForm((f) => ({ ...f, reason: e.target.value }))
                  }
                />
              </div>
            </>
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
          {person.status === "pending" && (
            <>
              <button
                className="ap-btn ap-btn--danger"
                onClick={handleReject}
                disabled={loading}
              >
                Reject
              </button>
              <button
                className="ap-btn ap-btn--success"
                onClick={handleApprove}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="ap-spin" /> …
                  </>
                ) : (
                  "✓ Approve"
                )}
              </button>
            </>
          )}
          {view === "suspend" && person.status === "active" && (
            <button
              className="ap-btn ap-btn--danger"
              onClick={handleSuspend}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="ap-spin" /> Suspending…
                </>
              ) : (
                "Suspend"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const AdminDeliveryPersons = () => {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPersons = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      const res = await api.get(`/delivery-persons?${params}`);
      const all = res.data.data || [];
      const filtered = statusFilter
        ? all.filter((p) => p.status === statusFilter)
        : all;
      setPersons(filtered);
      setPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch {
      showToast("Failed to load delivery persons", "error");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchPersons();
  }, [fetchPersons]);

  const pendingCount = persons.filter((p) => p.status === "pending").length;

  return (
    <AdminLayout
      pageTitle="Delivery Persons"
      breadcrumb="OPERATIONS / DELIVERY"
    >
      {toast && (
        <div className={`ap-toast ap-toast--${toast.type}`}>{toast.msg}</div>
      )}
      {selected && (
        <DeliveryDetail
          person={selected}
          onClose={() => setSelected(null)}
          onAction={fetchPersons}
        />
      )}

      <div className="ap-page-hd">
        <div className="ap-page-hd-left">
          <h1>Delivery Persons</h1>
          <p>
            {total} total · {pendingCount} pending approval
          </p>
        </div>
        {pendingCount > 0 && (
          <span
            className="ap-badge ap-badge--yellow"
            style={{ fontSize: "0.85rem", padding: "6px 14px" }}
          >
            ⚠ {pendingCount} Pending
          </span>
        )}
      </div>

      <div className="ap-card">
        <div className="ap-card-body" style={{ paddingBottom: 0 }}>
          <div className="ap-filters">
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
        ) : persons.length === 0 ? (
          <div className="ap-center">
            <div className="ap-empty-icon">🛵</div>
            <span>No delivery persons found</span>
          </div>
        ) : (
          <div
            className="ap-table-wrap"
            style={{ border: "none", borderTop: "1px solid var(--a-border2)" }}
          >
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Vehicle</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Availability</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {persons.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <div
                          className="ap-thumb"
                          style={{ width: 34, height: 34 }}
                        >
                          {imgSrc(p.profilePicUrl) ? (
                            <img
                              src={imgSrc(p.profilePicUrl)}
                              alt=""
                              onError={(e) => (e.target.style.display = "none")}
                            />
                          ) : (
                            "👤"
                          )}
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              color: "var(--a-text)",
                              fontSize: "0.85rem",
                            }}
                          >
                            {p.fullname}
                          </div>
                          <div
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--a-text4)",
                              fontFamily: "var(--ff-mono)",
                            }}
                          >
                            {p.userId?.email || p.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="ap-badge ap-badge--indigo">
                        {VEHICLE_LABELS[p.vehicleType] || p.vehicleType}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "var(--a-yellow)" }}>
                        ★ {(p.averageRating || 0).toFixed(1)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ap-badge ap-badge--${STATUS_BADGE[p.status]}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ap-badge ap-badge--${p.availability === "online" ? "green" : p.availability === "busy" ? "orange" : "gray"}`}
                      >
                        {p.availability || "—"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.75rem" }}>
                      {fmtDate(p.createdAt)}
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

        {pages > 1 && (
          <div className="ap-pagination">
            <span className="ap-pagination-info">
              PAGE {page} / {pages}
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

export default AdminDeliveryPersons;
