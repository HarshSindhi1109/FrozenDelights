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

const RATING_LABELS = {
  0.5: "Terrible",
  1: "Bad",
  1.5: "Poor",
  2: "Meh",
  2.5: "Okay",
  3: "Good",
  3.5: "Pretty good",
  4: "Great",
  4.5: "Excellent",
  5: "Perfect!",
};

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
   STAR INPUT (interactive)
══════════════════════════════════════════ */
const StarInput = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);

  const handleMouseMove = (e, i) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHovered(e.clientX - rect.left < rect.width / 2 ? i - 0.5 : i);
  };

  const handleClick = (e, i) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onChange(e.clientX - rect.left < rect.width / 2 ? i - 0.5 : i);
  };

  const display = hovered || value;

  return (
    <div>
      <div className="or-stars-row" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((i) => {
          let cls = "or-star or-star--empty";
          if (display >= i) cls = "or-star or-star--full";
          else if (display >= i - 0.5) cls = "or-star or-star--half";
          return (
            <span
              key={i}
              className={cls}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onClick={(e) => handleClick(e, i)}
            >
              {display >= i ? "★" : display >= i - 0.5 ? "⯨" : "☆"}
            </span>
          );
        })}
      </div>
      <div className="or-rating-hint">
        {display
          ? `${display} — ${RATING_LABELS[display] || ""}`
          : "Click or hover to rate"}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   STAR DISPLAY (static)
══════════════════════════════════════════ */
const StarDisplay = ({ rating = 0 }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="or-stars-display">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`or-star ${i < full ? "or-star--full" : i === full && half ? "or-star--half" : "or-star--empty"}`}
        >
          {i < full ? "★" : i === full && half ? "⯨" : "☆"}
        </span>
      ))}
    </span>
  );
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
                  className={`or-tracker-dot${done ? " or-tracker-dot--done" : active ? " or-tracker-dot--active" : ""}`}
                >
                  {done ? "✓" : cfg.icon}
                </div>
              </div>
              <div className="or-tracker-right">
                <p
                  className={`or-tracker-label${active ? " or-tracker-label--active" : done ? " or-tracker-label--done" : ""}`}
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
   REVIEW SECTION (shown inside OrderDetail when delivered)
══════════════════════════════════════════ */
const ReviewSection = ({ order, showToast }) => {
  // ── Ice cream reviews state ──
  const [existingReviews, setExistingReviews] = useState({}); // { iceCreamId: reviewDoc }
  const [reviewLoading, setReviewLoading] = useState(true);

  // active review form state: null | { iceCreamId, name, imageUrl, size, existingId }
  const [activeIceForm, setActiveIceForm] = useState(null);
  const [iceRating, setIceRating] = useState(0);
  const [iceDesc, setIceDesc] = useState("");
  const [iceSubmitting, setIceSubmitting] = useState(false);

  // ── Delivery rating state ──
  const [deliveryRating, setDeliveryRating] = useState(null); // existing doc or null
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [drRating, setDrRating] = useState(0);
  const [drDesc, setDrDesc] = useState("");
  const [drSubmitting, setDrSubmitting] = useState(false);

  /* Fetch existing reviews for this order's ice creams + delivery rating */
  const fetchReviews = useCallback(async () => {
    setReviewLoading(true);
    try {
      const iceCreamIds = [
        ...new Set(
          order.items.map((i) =>
            typeof i.iceCreamId === "object" ? i.iceCreamId._id : i.iceCreamId,
          ),
        ),
      ];

      const [reviewResults, drRes] = await Promise.all([
        Promise.allSettled(iceCreamIds.map((id) => api.get(`/reviews/${id}`))),
        api.get(`/delivery-ratings/my-order/${order._id}`),
      ]);

      // Build map of iceCreamId → my review
      const map = {};
      const meRes = await api.get("/auth/me");
      const myId = meRes.data.user._id;

      reviewResults.forEach((r, idx) => {
        if (r.status === "fulfilled") {
          const mine = (r.value.data.data || []).find((rv) => {
            const uid =
              typeof rv.userId === "object" ? rv.userId._id : rv.userId;
            return uid === myId;
          });
          if (mine) map[iceCreamIds[idx]] = mine;
        }
      });

      setExistingReviews(map);
      setDeliveryRating(drRes.data.data);
    } catch (err) {
      console.error("ReviewSection fetch error:", err);
    } finally {
      setReviewLoading(false);
    }
  }, [order._id, order.items]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  /* Open ice cream form */
  const openIceForm = (item, existing) => {
    const id =
      typeof item.iceCreamId === "object"
        ? item.iceCreamId._id
        : item.iceCreamId;
    setActiveIceForm({
      iceCreamId: id,
      name: item.name,
      imageUrl: imgSrc(
        typeof item.iceCreamId === "object" ? item.iceCreamId.imageUrl : null,
      ),
      size: item.size,
      existingId: existing?._id || null,
    });
    setIceRating(existing?.rating || 0);
    setIceDesc(existing?.description || "");
  };

  const closeIceForm = () => {
    setActiveIceForm(null);
    setIceRating(0);
    setIceDesc("");
  };

  const submitIceReview = async () => {
    if (!iceRating) return;
    setIceSubmitting(true);
    try {
      if (activeIceForm.existingId) {
        await api.put(`/reviews/${activeIceForm.existingId}`, {
          rating: iceRating,
          description: iceDesc.trim(),
        });
        showToast("Review updated!");
      } else {
        await api.post("/reviews", {
          iceCreamId: activeIceForm.iceCreamId,
          orderId: order._id,
          rating: iceRating,
          description: iceDesc.trim(),
        });
        showToast("Review posted!");
      }
      closeIceForm();
      fetchReviews();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to submit review",
        "error",
      );
    } finally {
      setIceSubmitting(false);
    }
  };

  /* Open delivery form */
  const openDeliveryForm = () => {
    setDrRating(deliveryRating?.rating || 0);
    setDrDesc(deliveryRating?.description || "");
    setShowDeliveryForm(true);
  };

  const submitDeliveryRating = async () => {
    if (!drRating) return;
    setDrSubmitting(true);
    try {
      if (deliveryRating) {
        await api.put(`/delivery-ratings/${deliveryRating._id}`, {
          rating: drRating,
          description: drDesc.trim(),
        });
        showToast("Delivery rating updated!");
      } else {
        await api.post("/delivery-ratings", {
          orderId: order._id,
          deliveryPersonId: order.deliveryPersonId,
          rating: drRating,
          description: drDesc.trim(),
        });
        showToast("Delivery rated! 🛵");
      }
      setShowDeliveryForm(false);
      fetchReviews();
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to submit rating",
        "error",
      );
    } finally {
      setDrSubmitting(false);
    }
  };

  if (reviewLoading) {
    return (
      <div className="or-section">
        <div className="or-section-hd">
          <h2>
            <span>⭐</span> Rate Your Experience
          </h2>
        </div>
        <div className="or-review-loading">
          <div className="or-spin or-spin--pink" />
          <span>Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="or-section">
      <div className="or-section-hd">
        <h2>
          <span>⭐</span> Rate Your Experience
        </h2>
      </div>
      <div className="or-section-body">
        {/* ── Ice Cream Reviews ── */}
        <div className="or-review-block-title">🍦 Ice Cream Reviews</div>
        {order.items.map((item) => {
          const id =
            typeof item.iceCreamId === "object"
              ? item.iceCreamId._id
              : item.iceCreamId;
          const existing = existingReviews[id];
          const src = imgSrc(
            typeof item.iceCreamId === "object"
              ? item.iceCreamId.imageUrl
              : null,
          );
          const isOpen = activeIceForm?.iceCreamId === id;

          return (
            <div key={`${id}-${item.size}`} className="or-review-item">
              <div className="or-review-item-top">
                <div className="or-review-item-img">
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
                <div className="or-review-item-info">
                  <div className="or-review-item-name">{item.name}</div>
                  <div className="or-review-item-size">
                    {item.size} · qty {item.quantity}
                  </div>
                  {existing && !isOpen && (
                    <div className="or-review-item-rated">
                      <StarDisplay rating={existing.rating} />
                      <span className="or-review-item-rated-num">
                        {existing.rating}
                      </span>
                    </div>
                  )}
                </div>
                {!isOpen && (
                  <button
                    className={`or-btn ${existing ? "or-btn--ghost" : "or-btn--primary"} or-btn--sm`}
                    onClick={() => openIceForm(item, existing)}
                  >
                    {existing ? "Edit" : "Rate"}
                  </button>
                )}
              </div>

              {/* Inline form */}
              {isOpen && (
                <div className="or-review-form">
                  <StarInput value={iceRating} onChange={setIceRating} />
                  <textarea
                    className="or-review-textarea"
                    placeholder="Share your thoughts… taste, texture, packaging?"
                    value={iceDesc}
                    onChange={(e) => setIceDesc(e.target.value.slice(0, 500))}
                  />
                  <div className="or-review-char">
                    {500 - iceDesc.length} chars left
                  </div>
                  <div className="or-review-form-btns">
                    <button
                      className="or-btn or-btn--ghost or-btn--sm"
                      onClick={closeIceForm}
                      disabled={iceSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      className="or-btn or-btn--primary or-btn--sm"
                      onClick={submitIceReview}
                      disabled={iceSubmitting || !iceRating}
                    >
                      {iceSubmitting ? (
                        <>
                          <span className="or-spin" /> Saving…
                        </>
                      ) : activeIceForm.existingId ? (
                        "Update"
                      ) : (
                        "Post Review"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Delivery Rating ── */}
        {order.deliveryPersonId && (
          <>
            <div className="or-review-divider" />
            <div className="or-review-block-title">🛵 Delivery Rating</div>
            <div className="or-review-item">
              <div className="or-review-item-top">
                <div
                  className="or-review-item-img"
                  style={{
                    fontSize: "1.6rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  🛵
                </div>
                <div className="or-review-item-info">
                  <div className="or-review-item-name">
                    Your Delivery Experience
                  </div>
                  {deliveryRating && !showDeliveryForm && (
                    <div className="or-review-item-rated">
                      <StarDisplay rating={deliveryRating.rating} />
                      <span className="or-review-item-rated-num">
                        {deliveryRating.rating}
                      </span>
                    </div>
                  )}
                  {!deliveryRating && !showDeliveryForm && (
                    <div className="or-review-item-size">
                      How was your delivery experience?
                    </div>
                  )}
                </div>
                {!showDeliveryForm && (
                  <button
                    className={`or-btn ${deliveryRating ? "or-btn--ghost" : "or-btn--primary"} or-btn--sm`}
                    onClick={openDeliveryForm}
                  >
                    {deliveryRating ? "Edit" : "Rate"}
                  </button>
                )}
              </div>

              {/* Delivery inline form */}
              {showDeliveryForm && (
                <div className="or-review-form">
                  <StarInput value={drRating} onChange={setDrRating} />
                  <textarea
                    className="or-review-textarea"
                    placeholder="How was the delivery? On time, polite, careful?"
                    value={drDesc}
                    onChange={(e) => setDrDesc(e.target.value.slice(0, 500))}
                  />
                  <div className="or-review-char">
                    {500 - drDesc.length} chars left
                  </div>
                  <div className="or-review-form-btns">
                    <button
                      className="or-btn or-btn--ghost or-btn--sm"
                      onClick={() => setShowDeliveryForm(false)}
                      disabled={drSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      className="or-btn or-btn--primary or-btn--sm"
                      onClick={submitDeliveryRating}
                      disabled={drSubmitting || !drRating}
                    >
                      {drSubmitting ? (
                        <>
                          <span className="or-spin" /> Saving…
                        </>
                      ) : deliveryRating ? (
                        "Update"
                      ) : (
                        "Submit Rating"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
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

  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

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
      await fetchOrder();
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

          {/* ── Payment ── */}
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

          {/* ── Review Section (only when delivered) ── */}
          {order.status === "delivered" && (
            <ReviewSection order={order} showToast={showToast} />
          )}

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
   ROOT
══════════════════════════════════════════ */
const Orders = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const showPlaced = searchParams.get("placed") === "1";

  useEffect(() => {
    if (showPlaced) {
      const t = setTimeout(() => setSearchParams({}, { replace: true }), 4000);
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
