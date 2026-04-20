import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { logoutUser } from "../../services/authService";
import "./Cart.css";

/* ─── helpers ─────────────────────────────── */
const BASE_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${BASE_URL}/${url.replace(/\\/g, "/")}` : null);

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const Cart = () => {
  const navigate = useNavigate();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ── Per-item updating/removing state ── */
  const [updatingId, setUpdatingId] = useState(null); // "iceCreamId-size"
  const [removingId, setRemovingId] = useState(null);

  /* ── Variant switching state ── */
  // key: "iceCreamId-currentSize", value: true while switching
  const [switchingVariant, setSwitchingVariant] = useState(null);

  /* ── Clear cart ── */
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  /* ── Toast ── */
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Fetch cart ── */
  const fetchCart = useCallback(async () => {
    try {
      const r = await api.get("/cart");
      setCart(r.data.cart);
    } catch {
      showToast("Failed to load cart", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  /* ── Derived values ── */
  const items = cart?.items || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  /* ── Update quantity ── */
  const handleQuantityChange = async (item, newQty) => {
    if (newQty < 1) return;
    const iceCreamId =
      typeof item.iceCreamId === "object"
        ? item.iceCreamId._id
        : item.iceCreamId;
    const key = `${iceCreamId}-${item.size}`;
    setUpdatingId(key);
    try {
      await api.patch("/cart", {
        iceCreamId,
        size: item.size,
        quantity: newQty,
      });
      const r = await api.get("/cart");
      setCart(r.data.cart);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  /* ── Switch variant ── */
  // Backend cart is keyed by (iceCreamId + size), so switching variant =
  // DELETE old size + POST new size (carrying over the same quantity).
  const handleVariantSwitch = async (item, newSize) => {
    if (newSize === item.size) return;

    const iceCreamId =
      typeof item.iceCreamId === "object"
        ? item.iceCreamId._id
        : item.iceCreamId;

    // Find new variant's price from populated variants
    const newVariant = item.iceCreamId.variants?.find(
      (v) => v.size.toLowerCase() === newSize.toLowerCase(),
    );
    if (!newVariant || !newVariant.isAvailable) {
      showToast("That size is not available", "error");
      return;
    }

    const key = `${iceCreamId}-${item.size}`;
    setSwitchingVariant(key);
    try {
      // 1. Remove old size
      await api.delete("/cart/item", {
        data: { iceCreamId, size: item.size },
      });
      // 2. Add new size (carry over quantity, capped by new stock)
      const qty = Math.min(item.quantity, newVariant.stock || item.quantity);
      await api.post("/cart", {
        iceCreamId,
        size: newSize,
        quantity: qty,
      });
      // 3. Re-fetch to get fully populated cart
      const r = await api.get("/cart");
      setCart(r.data.cart);
      showToast(`Switched to ${newSize}`);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to switch size",
        "error",
      );
    } finally {
      setSwitchingVariant(null);
    }
  };

  /* ── Remove item ── */
  const handleRemove = async (item) => {
    const iceCreamId =
      typeof item.iceCreamId === "object"
        ? item.iceCreamId._id
        : item.iceCreamId;
    const key = `${iceCreamId}-${item.size}`;
    setRemovingId(key);
    try {
      await api.delete("/cart/item", {
        data: { iceCreamId, size: item.size },
      });
      const r = await api.get("/cart");
      setCart(r.data.cart);
      showToast("Item removed");
    } catch {
      showToast("Failed to remove item", "error");
    } finally {
      setRemovingId(null);
    }
  };

  /* ── Clear cart ── */
  const handleClear = async () => {
    setClearLoading(true);
    try {
      await api.delete("/cart");
      setCart((c) => ({ ...c, items: [] }));
      showToast("Cart cleared");
    } catch {
      showToast("Failed to clear cart", "error");
    } finally {
      setClearLoading(false);
      setShowClearModal(false);
    }
  };

  /* ── Logout ── */
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    }
    navigate("/login");
  };

  /* ────────────────────────────────────────── */
  return (
    <div className="ct-page">
      {/* ════ TOAST ════ */}
      {toast && (
        <div className={`ct-toast ct-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* ════ CLEAR MODAL ════ */}
      {showClearModal && (
        <div
          className="ct-modal-overlay"
          onClick={() => setShowClearModal(false)}
        >
          <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ct-modal-icon">🗑️</div>
            <h3 className="ct-modal-title">Clear cart?</h3>
            <p className="ct-modal-body">
              All items will be removed from your cart.
            </p>
            <div className="ct-modal-btns">
              <button
                className="ct-modal-cancel"
                onClick={() => setShowClearModal(false)}
              >
                Cancel
              </button>
              <button
                className="ct-modal-confirm"
                onClick={handleClear}
                disabled={clearLoading}
              >
                {clearLoading ? "Clearing…" : "Clear Cart"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ NAV ════ */}
      <nav className="ct-nav">
        <div className="ct-nav-inner">
          <button className="ct-nav-back" onClick={() => navigate(-1)}>
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
            Back
          </button>
          <span className="ct-nav-brand">
            <span>🛒</span> My Cart
            {itemCount > 0 && <span className="ct-nav-count">{itemCount}</span>}
          </span>
          <button className="ct-nav-logout" onClick={handleLogout}>
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

      {/* ════ CONTENT ════ */}
      <div className="ct-content">
        {/* Loading */}
        {loading && (
          <div className="ct-layout">
            <div className="ct-items-col">
              {[1, 2, 3].map((i) => (
                <div key={i} className="ct-item-skeleton">
                  <div className="ct-sk ct-sk--img" />
                  <div className="ct-sk-body">
                    <div className="ct-sk ct-sk--title" />
                    <div className="ct-sk ct-sk--sub" />
                    <div className="ct-sk ct-sk--price" />
                  </div>
                </div>
              ))}
            </div>
            <div className="ct-summary-col">
              <div className="ct-sk ct-sk--summary" />
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && items.length === 0 && (
          <div className="ct-empty">
            <div className="ct-empty-icon">🍦</div>
            <h2 className="ct-empty-title">Your cart is empty</h2>
            <p className="ct-empty-sub">
              Looks like you haven't added anything yet. Let's fix that!
            </p>
            <Link to="/customer/home" className="ct-btn ct-btn--primary">
              Browse Flavours
            </Link>
          </div>
        )}

        {/* Cart with items */}
        {!loading && items.length > 0 && (
          <div className="ct-layout">
            {/* ── Left: items ── */}
            <div className="ct-items-col">
              <div className="ct-items-hd">
                <h1 className="ct-page-title">
                  Your Cart
                  <span className="ct-title-count">
                    {itemCount} item{itemCount !== 1 ? "s" : ""}
                  </span>
                </h1>
                <button
                  className="ct-clear-btn"
                  onClick={() => setShowClearModal(true)}
                >
                  Clear all
                </button>
              </div>

              <div className="ct-items-list">
                {items.map((item) => {
                  const iceCreamIdStr =
                    typeof item.iceCreamId === "object"
                      ? item.iceCreamId._id
                      : item.iceCreamId;
                  const key = `${iceCreamIdStr}-${item.size}`;
                  const isUpdating = updatingId === key;
                  const isRemoving = removingId === key;
                  const isSwitching = switchingVariant === key;
                  const isBusy = isUpdating || isRemoving || isSwitching;
                  const src = imgSrc(item.iceCreamId.imageUrl);

                  // All variants for this ice cream (from populated data)
                  const allVariants = item.iceCreamId.variants || [];
                  const hasMultipleVariants = allVariants.length > 1;

                  // Stock for current size (for + button cap)
                  const stockForItem =
                    allVariants.find(
                      (v) => v.size.toLowerCase() === item.size.toLowerCase(),
                    )?.stock ?? Infinity;

                  return (
                    <div
                      key={item._id}
                      className={`ct-item${isRemoving ? " ct-item--removing" : ""}`}
                    >
                      {/* Image */}
                      <Link
                        to={`/ice-cream/${item.iceCreamId._id}`}
                        className="ct-item-img-wrap"
                      >
                        {src ? (
                          <img
                            src={src}
                            alt={item.iceCreamId.name}
                            className="ct-item-img"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="ct-item-img-placeholder"
                          style={{ display: src ? "none" : "flex" }}
                        >
                          🍦
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="ct-item-info">
                        <Link
                          to={`/ice-cream/${item.iceCreamId._id}`}
                          className="ct-item-name"
                        >
                          {item.iceCreamId.name}
                        </Link>

                        {/* ── Variant selector ── */}
                        <div className="ct-item-meta">
                          {hasMultipleVariants ? (
                            <div className="ct-variant-selector">
                              <span className="ct-variant-label">Size:</span>
                              <div className="ct-variant-pills">
                                {allVariants.map((v) => {
                                  const isActive =
                                    v.size.toLowerCase() ===
                                    item.size.toLowerCase();
                                  const isUnavailable =
                                    !v.isAvailable || v.stock === 0;
                                  return (
                                    <button
                                      key={v._id}
                                      className={`ct-variant-pill${isActive ? " ct-variant-pill--active" : ""}${isUnavailable ? " ct-variant-pill--disabled" : ""}`}
                                      onClick={() =>
                                        !isUnavailable &&
                                        handleVariantSwitch(item, v.size)
                                      }
                                      disabled={isBusy || isUnavailable}
                                      title={
                                        isUnavailable
                                          ? "Out of stock"
                                          : `₹${v.basePrice}`
                                      }
                                    >
                                      {isSwitching && isActive ? (
                                        <span className="ct-spin ct-spin--dark" />
                                      ) : (
                                        <>
                                          {v.size}
                                          {!isActive && !isUnavailable && (
                                            <span className="ct-variant-pill-price">
                                              ₹{v.basePrice}
                                            </span>
                                          )}
                                        </>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            // Single variant — show static badge as before
                            <span className="ct-item-size-badge">
                              {item.size}
                            </span>
                          )}
                          <span className="ct-item-unit-price">
                            ₹{item.price} each
                          </span>
                        </div>

                        <div className="ct-item-foot">
                          {/* Quantity control */}
                          <div
                            className={`ct-qty${isUpdating ? " ct-qty--loading" : ""}`}
                          >
                            <button
                              className="ct-qty-btn"
                              onClick={() =>
                                handleQuantityChange(item, item.quantity - 1)
                              }
                              disabled={isBusy || item.quantity <= 1}
                            >
                              −
                            </button>
                            <span className="ct-qty-num">
                              {isUpdating ? (
                                <span className="ct-spin ct-spin--dark" />
                              ) : (
                                item.quantity
                              )}
                            </span>
                            <button
                              className="ct-qty-btn"
                              onClick={() =>
                                handleQuantityChange(item, item.quantity + 1)
                              }
                              disabled={isBusy || item.quantity >= stockForItem}
                              title={
                                item.quantity >= stockForItem
                                  ? `Max stock: ${stockForItem}`
                                  : undefined
                              }
                            >
                              +
                            </button>
                          </div>

                          {/* Line total */}
                          <span className="ct-item-total">
                            ₹
                            {(item.price * item.quantity).toLocaleString(
                              "en-IN",
                            )}
                          </span>

                          {/* Remove */}
                          <button
                            className="ct-remove-btn"
                            onClick={() => handleRemove(item)}
                            disabled={isBusy}
                            title="Remove item"
                          >
                            {isRemoving ? (
                              <span className="ct-spin" />
                            ) : (
                              <svg
                                width="14"
                                height="14"
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
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Continue shopping */}
              <Link to="/customer/home" className="ct-continue-link">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Continue Shopping
              </Link>
            </div>

            {/* ── Right: summary ── */}
            <div className="ct-summary-col">
              <div className="ct-summary">
                <h2 className="ct-summary-title">Order Summary</h2>

                <div className="ct-summary-rows">
                  <div className="ct-summary-row">
                    <span>
                      Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})
                    </span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="ct-summary-row">
                    <span>Delivery fee</span>
                    <span className="ct-summary-free">
                      Calculated at checkout
                    </span>
                  </div>
                  <div className="ct-summary-row">
                    <span>Tip (optional)</span>
                    <span className="ct-summary-free">Add at checkout</span>
                  </div>
                  <div className="ct-summary-row ct-summary-row--tax">
                    <span>Taxes & fees</span>
                    <span>Calculated at checkout</span>
                  </div>
                </div>

                <div className="ct-summary-divider" />

                <div className="ct-summary-total">
                  <span>Total</span>
                  <span className="ct-summary-total-amt">
                    ₹{subtotal.toLocaleString("en-IN")}
                  </span>
                </div>

                <button
                  className="ct-btn ct-btn--primary ct-checkout-btn"
                  onClick={() => navigate("/customer/checkout")}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  Proceed to Checkout
                </button>

                <Link to="/customer/addresses" className="ct-summary-addr-link">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Manage delivery addresses
                </Link>

                {/* Promo strip */}
                <div className="ct-summary-promos">
                  {[
                    "❄️ Always cold on delivery",
                    "🚀 45-min delivery",
                    "🌿 Natural ingredients",
                  ].map((p) => (
                    <div key={p} className="ct-summary-promo">
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="ct-footer">
        <span>🍦 FrozenDelights · © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
};

export default Cart;
