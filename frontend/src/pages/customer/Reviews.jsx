import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { logoutUser } from "../../services/authService";
import "./Reviews.css";

/* ─── helpers ─────────────────────────────── */
const BASE_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${BASE_URL}/${url.replace(/\\/g, "/")}` : null);

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

/* ══════════════════════════════════════════
   STAR RATING — interactive
══════════════════════════════════════════ */
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

const StarInput = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);

  const handleMouseMove = (e, i) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    setHovered(isHalf ? i - 0.5 : i);
  };

  const handleClick = (e, i) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const isHalf = e.clientX - rect.left < rect.width / 2;
    onChange(isHalf ? i - 0.5 : i);
  };

  const display = hovered || value;

  return (
    <div>
      <div className="rv-stars-row" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((i) => {
          let cls = "rv-star rv-star--empty";
          if (display >= i) cls = "rv-star rv-star--full";
          else if (display >= i - 0.5) cls = "rv-star rv-star--half";
          return (
            <span
              key={i}
              className={cls}
              onMouseMove={(e) => handleMouseMove(e, i)}
              onClick={(e) => handleClick(e, i)}
              style={{ fontSize: "2rem", cursor: "pointer" }}
            >
              {display >= i ? "★" : display >= i - 0.5 ? "⯨" : "☆"}
            </span>
          );
        })}
      </div>
      <div className="rv-rating-hint">
        {display
          ? `${display} — ${RATING_LABELS[display] || ""}`
          : "Click or hover to rate"}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   STATIC STARS DISPLAY
══════════════════════════════════════════ */
const StarDisplay = ({ rating = 0, size = "1rem" }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="rv-stars-display">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`rv-star ${i < full ? "rv-star--full" : i === full && half ? "rv-star--half" : "rv-star--empty"}`}
          style={{ fontSize: size }}
        >
          {i < full ? "★" : i === full && half ? "⯨" : "☆"}
        </span>
      ))}
    </div>
  );
};

/* ══════════════════════════════════════════
   WRITE / EDIT REVIEW FORM
══════════════════════════════════════════ */
const ReviewForm = ({
  deliveredOrders,
  existingReview,
  onSuccess,
  onCancel,
}) => {
  const isEdit = !!existingReview;

  const [selectedOrderId, setSelectedOrderId] = useState(
    existingReview?.orderId || "",
  );
  const [selectedItem, setSelectedItem] = useState(
    existingReview
      ? {
          iceCreamId: existingReview.iceCreamId,
          name: existingReview.iceCreamName,
          imageUrl: existingReview.iceCreamImage,
          size: existingReview.itemSize,
        }
      : null,
  );
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [description, setDescription] = useState(
    existingReview?.description || "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  /* When order is selected, reset item selection */
  const handleOrderSelect = (order) => {
    setSelectedOrderId(order._id);
    setSelectedItem(null);
    setError("");
  };

  /* Derive items from selected order */
  const selectedOrder = deliveredOrders.find((o) => o._id === selectedOrderId);
  const orderItems = selectedOrder?.items || [];

  const handleSubmit = async () => {
    if (!rating) {
      setError("Please select a rating.");
      return;
    }
    if (!selectedOrderId) {
      setError("Please select an order.");
      return;
    }
    if (!selectedItem) {
      setError("Please select an ice cream to review.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (isEdit) {
        await api.put(`/reviews/${existingReview._id}`, {
          rating,
          description: description.trim(),
        });
      } else {
        await api.post("/reviews", {
          iceCreamId: selectedItem.iceCreamId,
          orderId: selectedOrderId,
          rating,
          description: description.trim(),
        });
      }
      onSuccess(isEdit ? "Review updated!" : "Review posted!");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const charLeft = 500 - description.length;

  return (
    <div className="rv-write-card">
      <div className="rv-write-hd">
        ✍️ {isEdit ? "Edit Your Review" : "Write a Review"}
      </div>

      {!isEdit && (
        <>
          {/* Step 1: Pick order */}
          <div style={{ marginBottom: 20 }}>
            <div className="rv-rating-label">
              Step 1 — Select a delivered order
            </div>
            {deliveredOrders.length === 0 ? (
              <div
                style={{
                  padding: "16px",
                  background: "var(--rv-cream2)",
                  borderRadius: 12,
                  fontSize: "0.85rem",
                  color: "var(--rv-text3)",
                  textAlign: "center",
                }}
              >
                No delivered orders found. You can review after your order is
                delivered.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {deliveredOrders.map((o) => (
                  <button
                    key={o._id}
                    className={`rv-order-item${selectedOrderId === o._id ? " rv-order-item--active" : ""}`}
                    onClick={() => handleOrderSelect(o)}
                  >
                    <div>
                      <div className="rv-order-item-num">{o.orderNumber}</div>
                      <div className="rv-order-item-date">
                        {fmtDate(o.createdAt)} · {o.items?.length} item
                        {o.items?.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    {selectedOrderId === o._id && (
                      <div className="rv-order-item-check">
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Step 2: Pick ice cream from that order */}
          {selectedOrderId && orderItems.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div className="rv-rating-label">
                Step 2 — Which ice cream are you reviewing?
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {orderItems.map((item) => {
                  const src = imgSrc(
                    typeof item.iceCreamId === "object"
                      ? item.iceCreamId?.imageUrl
                      : null,
                  );
                  const isSelected =
                    selectedItem?.iceCreamId ===
                    (typeof item.iceCreamId === "object"
                      ? item.iceCreamId._id
                      : item.iceCreamId);
                  const iceCreamId =
                    typeof item.iceCreamId === "object"
                      ? item.iceCreamId._id
                      : item.iceCreamId;
                  return (
                    <button
                      key={`${iceCreamId}-${item.size}`}
                      className={`rv-order-item${isSelected ? " rv-order-item--active" : ""}`}
                      onClick={() =>
                        setSelectedItem({
                          iceCreamId,
                          name: item.name,
                          imageUrl: src,
                          size: item.size,
                        })
                      }
                    >
                      <div
                        className="rv-write-product-img"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          flexShrink: 0,
                        }}
                      >
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
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.88rem",
                            color: "var(--rv-text)",
                          }}
                        >
                          {item.name}
                        </div>
                        <div
                          style={{
                            fontSize: "0.73rem",
                            color: "var(--rv-text3)",
                          }}
                        >
                          {item.size} · qty {item.quantity}
                        </div>
                      </div>
                      {isSelected && (
                        <div
                          className="rv-order-item-check"
                          style={{ marginLeft: "auto" }}
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Product preview (edit mode or after selection) */}
      {selectedItem && (
        <div className="rv-write-product">
          <div className="rv-write-product-img">
            {selectedItem.imageUrl ? (
              <img
                src={selectedItem.imageUrl}
                alt=""
                onError={(e) => (e.target.style.display = "none")}
              />
            ) : (
              "🍦"
            )}
          </div>
          <div>
            <div className="rv-write-product-name">{selectedItem.name}</div>
            {selectedItem.size && (
              <div className="rv-write-product-size">
                Size: {selectedItem.size}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rating */}
      <div className="rv-rating-label">
        {isEdit ? "Your rating" : "Step 3 — Your rating"}
      </div>
      <StarInput value={rating} onChange={setRating} />

      {/* Description */}
      <div className="rv-rating-label" style={{ marginBottom: 8 }}>
        {isEdit ? "Your review" : "Step 4 — Share your thoughts"}{" "}
        <span style={{ color: "var(--rv-text3)", fontWeight: 400 }}>
          (optional)
        </span>
      </div>
      <textarea
        className="rv-textarea"
        placeholder="What did you love about it? How was the taste, texture, delivery…"
        value={description}
        onChange={(e) => setDescription(e.target.value.slice(0, 500))}
      />
      <div
        className={`rv-char-count${charLeft < 50 ? " rv-char-count--warn" : ""}`}
      >
        {charLeft} characters left
      </div>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderLeft: "3px solid #ef4444",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: "0.84rem",
            color: "#dc2626",
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      <div className="rv-write-actions">
        {onCancel && (
          <button
            className="rv-btn rv-btn--ghost"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>
        )}
        <button
          className="rv-btn rv-btn--primary"
          onClick={handleSubmit}
          disabled={submitting || !rating}
        >
          {submitting ? (
            <>
              <span className="rv-spin rv-spin--sm" /> Submitting…
            </>
          ) : isEdit ? (
            "Update Review"
          ) : (
            "Post Review"
          )}
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   DELETE CONFIRM MODAL
══════════════════════════════════════════ */
const DeleteModal = ({ review, onClose, onDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/reviews/${review._id}`);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete.");
      setLoading(false);
    }
  };

  return (
    <div className="rv-modal-overlay" onClick={onClose}>
      <div className="rv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rv-modal-inner">
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>🗑️</div>
          <div className="rv-modal-title">Delete Review?</div>
          <div className="rv-modal-sub">
            Your review of <strong>{review.iceCreamName}</strong> will be
            permanently deleted and the rating will be updated.
          </div>
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: "0.84rem",
                color: "#dc2626",
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}
        </div>
        <div className="rv-modal-footer">
          <button
            className="rv-btn rv-btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Keep it
          </button>
          <button
            className="rv-btn rv-btn--danger"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="rv-spin rv-spin--sm" /> Deleting…
              </>
            ) : (
              "Yes, delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   REVIEW CARD
══════════════════════════════════════════ */
const ReviewCard = ({ review, currentUserId, onEdit, onDelete }) => {
  const isOwner =
    review.userId?._id === currentUserId || review.userId === currentUserId;
  const avatarSrc = imgSrc(review.userId?.profilePicUrl);
  const initial = (review.userId?.username ||
    review.userId?.name ||
    "U")[0].toUpperCase();

  return (
    <div className="rv-review-card">
      <div className="rv-review-top">
        <div className="rv-review-user">
          <div className="rv-review-avatar">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                onError={(e) => (e.target.style.display = "none")}
              />
            ) : (
              initial
            )}
          </div>
          <div>
            <div className="rv-review-username">
              {review.userId?.username || review.userId?.name || "User"}
              {isOwner && (
                <span
                  style={{
                    marginLeft: 6,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "2px 7px",
                    background: "var(--rv-pink-pale)",
                    color: "var(--rv-pink-d)",
                    borderRadius: 999,
                    verticalAlign: "middle",
                  }}
                >
                  You
                </span>
              )}
            </div>
            <div className="rv-review-date">{fmtDate(review.createdAt)}</div>
          </div>
        </div>
        <div className="rv-review-right">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="rv-review-rating-num">{review.rating}</span>
            <StarDisplay rating={review.rating} />
          </div>
        </div>
      </div>

      {review.description && (
        <div className="rv-review-body">"{review.description}"</div>
      )}

      {review.iceCreamName && (
        <div style={{ marginTop: 10 }}>
          <span className="rv-review-product-tag">
            🍦 {review.iceCreamName}
          </span>
        </div>
      )}

      {isOwner && (
        <div className="rv-review-actions">
          <button
            className="rv-btn rv-btn--ghost rv-btn--sm"
            onClick={() => onEdit(review)}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </button>
          <button
            className="rv-btn rv-btn--danger rv-btn--sm"
            onClick={() => onDelete(review)}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const Reviews = () => {
  const navigate = useNavigate();

  const [tab, setTab] = useState("my"); // "my" | "write"
  const [user, setUser] = useState(null);
  const [myReviews, setMyReviews] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  /* Edit / delete state */
  const [editingReview, setEditingReview] = useState(null);
  const [deletingReview, setDeletingReview] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  /* ── Fetch user + my reviews + delivered orders ── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, ordersRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/orders/my?status=delivered&limit=50"),
      ]);

      const me = meRes.data.user;
      setUser(me);

      const orders = ordersRes.data.data || [];
      setDeliveredOrders(orders);

      /* Fetch reviews for each ice cream in delivered orders (deduplicated) */
      const iceCreamIds = [
        ...new Set(
          orders.flatMap((o) =>
            o.items.map((i) =>
              typeof i.iceCreamId === "object"
                ? i.iceCreamId._id
                : i.iceCreamId,
            ),
          ),
        ),
      ];

      /* Fetch reviews for all ice creams and filter to current user */
      const reviewResults = await Promise.allSettled(
        iceCreamIds.map((id) => api.get(`/reviews/${id}`)),
      );

      const allReviews = reviewResults
        .filter((r) => r.status === "fulfilled")
        .flatMap((r) => r.value.data.data || []);

      /* Attach ice cream name/image from orders for display */
      const enriched = allReviews
        .filter((rv) => {
          const rvUserId =
            typeof rv.userId === "object" ? rv.userId._id : rv.userId;
          return rvUserId === me._id;
        })
        .map((rv) => {
          /* Find name from orders */
          let iceCreamName = "";
          let iceCreamImage = null;
          let itemSize = "";
          for (const order of orders) {
            for (const item of order.items) {
              const iid =
                typeof item.iceCreamId === "object"
                  ? item.iceCreamId._id
                  : item.iceCreamId;
              const rvIceCreamId =
                typeof rv.iceCreamId === "object"
                  ? rv.iceCreamId._id
                  : rv.iceCreamId;
              if (iid === rvIceCreamId) {
                iceCreamName = item.name;
                iceCreamImage =
                  typeof item.iceCreamId === "object"
                    ? item.iceCreamId.imageUrl
                    : null;
                itemSize = item.size;
                break;
              }
            }
            if (iceCreamName) break;
          }
          return { ...rv, iceCreamName, iceCreamImage, itemSize };
        });

      /* Sort newest first */
      enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMyReviews(enriched);
    } catch (err) {
      console.error(err);
      showToast("Failed to load reviews", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    }
    navigate("/login");
  };

  const handleReviewSuccess = (msg) => {
    showToast(msg);
    setEditingReview(null);
    setTab("my");
    fetchAll();
  };

  const handleDeleted = () => {
    setDeletingReview(null);
    showToast("Review deleted.");
    fetchAll();
  };

  /* ══════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════ */
  return (
    <div className="rv-page">
      {/* Toast */}
      {toast && (
        <div className={`rv-toast rv-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* Delete modal */}
      {deletingReview && (
        <DeleteModal
          review={deletingReview}
          onClose={() => setDeletingReview(null)}
          onDeleted={handleDeleted}
        />
      )}

      {/* Nav */}
      <nav className="rv-nav">
        <div className="rv-nav-inner">
          <button className="rv-nav-back" onClick={() => navigate(-1)}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Back
          </button>
          <span className="rv-nav-brand">⭐ My Reviews</span>
          <button
            className="rv-nav-back"
            onClick={handleLogout}
            style={{ fontSize: "0.8rem", color: "var(--rv-text3)" }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="rv-content">
        <div className="rv-page-hd">
          <h1 className="rv-page-title">My Reviews</h1>
          <p className="rv-page-sub">
            Share your thoughts on the ice creams you've tried
          </p>
        </div>

        {loading ? (
          <div className="rv-loading">
            <div className="rv-spin" />
            Loading your reviews…
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="rv-tabs">
              <button
                className={`rv-tab${tab === "my" ? " rv-tab--active" : ""}`}
                onClick={() => {
                  setTab("my");
                  setEditingReview(null);
                }}
              >
                ⭐ My Reviews
                {myReviews.length > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      padding: "1px 7px",
                      background: "var(--rv-pink-pale)",
                      color: "var(--rv-pink-d)",
                      borderRadius: 999,
                    }}
                  >
                    {myReviews.length}
                  </span>
                )}
              </button>
              <button
                className={`rv-tab${tab === "write" ? " rv-tab--active" : ""}`}
                onClick={() => {
                  setTab("write");
                  setEditingReview(null);
                }}
              >
                ✍️ Write a Review
              </button>
            </div>

            {/* ── MY REVIEWS TAB ── */}
            {tab === "my" && (
              <>
                {editingReview ? (
                  <ReviewForm
                    deliveredOrders={deliveredOrders}
                    existingReview={editingReview}
                    onSuccess={handleReviewSuccess}
                    onCancel={() => setEditingReview(null)}
                  />
                ) : myReviews.length === 0 ? (
                  <div className="rv-empty">
                    <div className="rv-empty-icon">🍦</div>
                    <div className="rv-empty-title">No reviews yet</div>
                    <div className="rv-empty-sub">
                      Order and try some flavours, then share your thoughts!
                    </div>
                    <button
                      className="rv-btn rv-btn--primary"
                      style={{ marginTop: 8 }}
                      onClick={() => setTab("write")}
                    >
                      Write Your First Review
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="rv-list-hd">
                      <span className="rv-list-title">Your Reviews</span>
                      <span className="rv-list-count">
                        {myReviews.length} review
                        {myReviews.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {myReviews.map((rv) => (
                      <ReviewCard
                        key={rv._id}
                        review={rv}
                        currentUserId={user?._id}
                        onEdit={(r) => {
                          setEditingReview(r);
                          setTab("my");
                        }}
                        onDelete={(r) => setDeletingReview(r)}
                      />
                    ))}
                  </>
                )}
              </>
            )}

            {/* ── WRITE REVIEW TAB ── */}
            {tab === "write" &&
              !editingReview &&
              (deliveredOrders.length === 0 ? (
                <div className="rv-empty">
                  <div className="rv-empty-icon">📦</div>
                  <div className="rv-empty-title">No delivered orders yet</div>
                  <div className="rv-empty-sub">
                    You can write a review after your order has been delivered.
                  </div>
                  <button
                    className="rv-btn rv-btn--ghost"
                    style={{ marginTop: 8 }}
                    onClick={() => navigate("/customer/orders")}
                  >
                    View My Orders
                  </button>
                </div>
              ) : (
                <ReviewForm
                  deliveredOrders={deliveredOrders}
                  onSuccess={handleReviewSuccess}
                />
              ))}
          </>
        )}
      </div>

      <footer className="rv-footer">
        <span>🍦 FrozenDelights · © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
};

export default Reviews;
