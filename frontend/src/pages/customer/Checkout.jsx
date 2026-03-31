import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { logoutUser } from "../../services/authService";
import "./Checkout.css";

/* ─── helpers ─────────────────────────────── */
const BASE_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${BASE_URL}/${url}` : null);
const TYPE_ICONS = { home: "🏠", work: "💼", shop: "🏪", other: "📍" };

const TIP_OPTIONS = [0, 10, 20, 30, 50];

/* ══════════════════════════════════════════
   STEP INDICATOR
══════════════════════════════════════════ */
const Steps = ({ current }) => {
  const steps = ["Address", "Payment", "Review"];
  return (
    <div className="ck-steps">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="ck-step-item">
            <div
              className={`ck-step-dot${done ? " ck-step-dot--done" : active ? " ck-step-dot--active" : ""}`}
            >
              {done ? (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                idx
              )}
            </div>
            <span
              className={`ck-step-label${active ? " ck-step-label--active" : done ? " ck-step-label--done" : ""}`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`ck-step-line${done ? " ck-step-line--done" : ""}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const Checkout = () => {
  const navigate = useNavigate();

  /* ── Data ── */
  const [cart, setCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Step ── */
  const [step, setStep] = useState(1); // 1=address, 2=payment, 3=review

  /* ── Selections ── */
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("razorpay");
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState("");
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(null);
  const [feeLoading, setFeeLoading] = useState(false);
  const [feeBreakdown, setFeeBreakdown] = useState(null);

  /* ── Placing order ── */
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState("");

  /* ── Toast ── */
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Load cart + addresses ── */
  const fetchData = useCallback(async () => {
    try {
      const [cartRes, addrRes] = await Promise.all([
        api.get("/cart"),
        api.get("/addresses"),
      ]);
      const cartData = cartRes.data.cart;
      const addrData = addrRes.data.data || [];
      setCart(cartData);
      setAddresses(addrData);

      const def = addrData.find((a) => a.isDefault) || addrData[0];
      if (def) {
        setSelectedAddressId(def._id);
        fetchDeliveryFee(def);
      }
    } catch {
      showToast("Failed to load checkout data", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Derived values ── */
  const items = cart?.items || [];
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const selectedAddress = addresses.find((a) => a._id === selectedAddressId);
  const activeTip = showCustomTip ? parseInt(customTip) || 0 : tip;
  const grandTotal = subtotal + (deliveryFee ?? 0) + activeTip;

  /* ── Step navigation ── */
  const fetchDeliveryFee = async (address) => {
    const coords = address?.location?.coordinates;
    if (!coords) {
      setDeliveryFee(null);
      setFeeBreakdown(null);
      return;
    }
    setFeeLoading(true);
    try {
      const r = await api.post("/delivery-config/preview", {
        lat: coords[1],
        lng: coords[0],
      });
      setDeliveryFee(r.data.data.deliveryFee);
      setFeeBreakdown(r.data.data);
    } catch {
      showToast("Could not calculate delivery fee", "error");
      setDeliveryFee(null);
    } finally {
      setFeeLoading(false);
    }
  };

  const goNext = () => {
    if (step === 1 && !selectedAddressId) {
      showToast("Please select a delivery address", "error");
      return;
    }
    setStep((s) => Math.min(s + 1, 3));
    setOrderError("");
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  /* ── Tip helpers ── */
  const handleTipSelect = (val) => {
    setShowCustomTip(false);
    setCustomTip("");
    setTip(val);
  };
  const handleCustomTipToggle = () => {
    setShowCustomTip(true);
    setTip(0);
  };

  /* ── Load Razorpay SDK ── */
  const loadRazorpay = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  /* ── Place order ── */
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      showToast("No address selected", "error");
      return;
    }
    setPlacing(true);
    setOrderError("");

    // Build order payload — include deliveryFee and tip so
    // backend totalAmount matches what the customer sees.
    const orderPayload = {
      items: items.map((item) => ({
        iceCreamId:
          typeof item.iceCreamId === "object"
            ? item.iceCreamId._id
            : item.iceCreamId,
        size: item.size,
        quantity: item.quantity,
      })),
      paymentMethod,
      tip: activeTip,
      deliveryAddress: {
        fullname: selectedAddress.fullname,
        phone: selectedAddress.phone,
        addressLine: selectedAddress.addressLine,
        city: selectedAddress.city,
        pincode: selectedAddress.pincode,
        location: selectedAddress.location,
      },
    };

    try {
      // 1. Create order in DB
      const orderRes = await api.post("/orders", orderPayload);
      const order = orderRes.data.data;

      if (paymentMethod === "cod") {
        // Clear cart and redirect
        await api.delete("/cart");
        navigate(`/customer/orders/${order._id}?placed=1`);
        return;
      }

      // 2. Razorpay: create payment order
      const loaded = await loadRazorpay();
      if (!loaded) {
        setOrderError("Failed to load payment gateway. Please try again.");
        setPlacing(false);
        return;
      }

      const payRes = await api.post("/payments/create-razorpay-order", {
        orderId: order._id,
      });
      const rzpOrder = payRes.data.data;

      // 3. Open Razorpay checkout
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "FrozenDelights",
        description: `Order #${order.orderNumber || order._id}`,
        order_id: rzpOrder.id,
        prefill: {
          name: selectedAddress.fullname,
          contact: selectedAddress.phone,
        },
        theme: { color: "#ec4899" },
        handler: async (response) => {
          try {
            await api.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await api.delete("/cart");
            navigate(`/customer/orders/${order._id}?placed=1`);
          } catch {
            setOrderError("Payment verification failed. Contact support.");
            setPlacing(false);
          }
        },
        modal: {
          ondismiss: () => {
            setOrderError("Payment cancelled. Your order was not placed.");
            setPlacing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setOrderError(
        err.response?.data?.message || "Failed to place order. Try again.",
      );
      setPlacing(false);
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
  if (loading) {
    return (
      <div className="ck-page">
        <div className="ck-loading">
          <div className="ck-loading-spin" />
          <p>Preparing checkout…</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="ck-page">
        <div className="ck-empty">
          <div className="ck-empty-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add some ice cream before checking out!</p>
          <button
            className="ck-btn ck-btn--primary"
            onClick={() => navigate("/customer/home")}
          >
            Browse Flavours
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ck-page">
      {/* ════ TOAST ════ */}
      {toast && (
        <div className={`ck-toast ck-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* ════ NAV ════ */}
      <nav className="ck-nav">
        <div className="ck-nav-inner">
          <button
            className="ck-nav-back"
            onClick={() => (step > 1 ? goBack() : navigate("/cart"))}
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
            {step > 1 ? "Back" : "Cart"}
          </button>
          <span className="ck-nav-brand">
            <span>🍦</span> Checkout
          </span>
          <button className="ck-nav-logout" onClick={handleLogout}>
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

      {/* ════ STEPS ════ */}
      <div className="ck-steps-wrap">
        <Steps current={step} />
      </div>

      {/* ════ CONTENT ════ */}
      <div className="ck-content">
        <div className="ck-layout">
          {/* ── LEFT: step panels ── */}
          <div className="ck-main-col">
            {/* ════ STEP 1: ADDRESS ════ */}
            {step === 1 && (
              <div className="ck-panel ck-panel--enter">
                <h2 className="ck-panel-title">
                  <span className="ck-panel-icon">📍</span>
                  Delivery Address
                </h2>

                {addresses.length === 0 ? (
                  <div className="ck-no-addr">
                    <p>You have no saved addresses.</p>
                    <button
                      className="ck-btn ck-btn--outline"
                      onClick={() => navigate("/customer/addresses")}
                    >
                      Add an Address
                    </button>
                  </div>
                ) : (
                  <div className="ck-addr-list">
                    {addresses.map((addr) => (
                      <label
                        key={addr._id}
                        className={`ck-addr-card${selectedAddressId === addr._id ? " ck-addr-card--selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={addr._id}
                          checked={selectedAddressId === addr._id}
                          onChange={() => {
                            setSelectedAddressId(addr._id);
                            fetchDeliveryFee(addr);
                          }}
                          className="ck-addr-radio"
                        />
                        <div className="ck-addr-body">
                          <div className="ck-addr-top">
                            <span className="ck-addr-type-badge">
                              {TYPE_ICONS[addr.addressType] || "📍"}{" "}
                              {addr.addressType}
                            </span>
                            {addr.isDefault && (
                              <span className="ck-addr-default-badge">
                                ⭐ Default
                              </span>
                            )}
                          </div>
                          <p className="ck-addr-name">{addr.fullname}</p>
                          <p className="ck-addr-phone">{addr.phone}</p>
                          <p className="ck-addr-line">
                            {addr.addressLine}, {addr.city}
                            {addr.state ? `, ${addr.state}` : ""} —{" "}
                            {addr.pincode}
                          </p>
                          {addr.location?.coordinates && (
                            <p className="ck-addr-coords">
                              📡 GPS: {addr.location.coordinates[1].toFixed(4)},{" "}
                              {addr.location.coordinates[0].toFixed(4)}
                            </p>
                          )}
                        </div>
                        <div className="ck-addr-check">
                          {selectedAddressId === addr._id && (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                      </label>
                    ))}

                    <button
                      className="ck-addr-add-btn"
                      onClick={() => navigate("/customer/addresses")}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add New Address
                    </button>
                  </div>
                )}

                {addresses.length > 0 && (
                  <div className="ck-panel-foot">
                    <button
                      className="ck-btn ck-btn--primary ck-btn--full"
                      onClick={goNext}
                    >
                      Continue to Payment
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ════ STEP 2: PAYMENT ════ */}
            {step === 2 && (
              <div className="ck-panel ck-panel--enter">
                <h2 className="ck-panel-title">
                  <span className="ck-panel-icon">💳</span>
                  Payment Method
                </h2>

                <div className="ck-pay-options">
                  {/* Razorpay */}
                  <label
                    className={`ck-pay-card${paymentMethod === "razorpay" ? " ck-pay-card--selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="razorpay"
                      checked={paymentMethod === "razorpay"}
                      onChange={() => setPaymentMethod("razorpay")}
                      className="ck-pay-radio"
                    />
                    <div className="ck-pay-body">
                      <div className="ck-pay-logo">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="2" y="5" width="20" height="14" rx="2" />
                          <line x1="2" y1="10" x2="22" y2="10" />
                        </svg>
                      </div>
                      <div>
                        <p className="ck-pay-name">Pay Online</p>
                        <p className="ck-pay-sub">
                          UPI · Cards · Net Banking via Razorpay
                        </p>
                      </div>
                    </div>
                    <div className="ck-pay-check">
                      {paymentMethod === "razorpay" && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </label>

                  {/* COD */}
                  <label
                    className={`ck-pay-card${paymentMethod === "cod" ? " ck-pay-card--selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="ck-pay-radio"
                    />
                    <div className="ck-pay-body">
                      <div className="ck-pay-logo ck-pay-logo--cod">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M17 9V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                          <rect x="9" y="11" width="12" height="10" rx="2" />
                          <circle cx="15" cy="16" r="2" />
                        </svg>
                      </div>
                      <div>
                        <p className="ck-pay-name">Cash on Delivery</p>
                        <p className="ck-pay-sub">
                          Pay when your order arrives
                        </p>
                      </div>
                    </div>
                    <div className="ck-pay-check">
                      {paymentMethod === "cod" && (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </label>
                </div>

                {/* Tip section */}
                <div className="ck-tip-section">
                  <div className="ck-tip-hd">
                    <h3 className="ck-tip-title">
                      Tip your delivery person 🙏
                    </h3>
                    <p className="ck-tip-sub">
                      100% goes directly to them. Totally optional.
                    </p>
                  </div>
                  <div className="ck-tip-options">
                    {TIP_OPTIONS.map((val) => (
                      <button
                        key={val}
                        className={`ck-tip-btn${!showCustomTip && tip === val ? " ck-tip-btn--active" : ""}`}
                        onClick={() => handleTipSelect(val)}
                      >
                        {val === 0 ? "No tip" : `₹${val}`}
                      </button>
                    ))}
                    <button
                      className={`ck-tip-btn${showCustomTip ? " ck-tip-btn--active" : ""}`}
                      onClick={handleCustomTipToggle}
                    >
                      Custom
                    </button>
                  </div>
                  {showCustomTip && (
                    <div className="ck-tip-custom">
                      <span className="ck-tip-custom-prefix">₹</span>
                      <input
                        className="ck-tip-input"
                        type="number"
                        min="1"
                        placeholder="Enter amount"
                        value={customTip}
                        onChange={(e) => setCustomTip(e.target.value)}
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div className="ck-panel-foot">
                  <button className="ck-btn ck-btn--ghost" onClick={goBack}>
                    Back
                  </button>
                  <button className="ck-btn ck-btn--primary" onClick={goNext}>
                    Review Order
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* ════ STEP 3: REVIEW ════ */}
            {step === 3 && (
              <div className="ck-panel ck-panel--enter">
                <h2 className="ck-panel-title">
                  <span className="ck-panel-icon">✅</span>
                  Review Your Order
                </h2>

                {/* Delivery address recap */}
                {selectedAddress && (
                  <div className="ck-review-section">
                    <div className="ck-review-sec-hd">
                      <span>📍 Delivering to</span>
                      <button
                        className="ck-review-edit"
                        onClick={() => setStep(1)}
                      >
                        Edit
                      </button>
                    </div>
                    <div className="ck-review-addr">
                      <p className="ck-review-addr-name">
                        {selectedAddress.fullname}
                      </p>
                      <p className="ck-review-addr-detail">
                        {selectedAddress.addressLine}, {selectedAddress.city}
                        {selectedAddress.state
                          ? `, ${selectedAddress.state}`
                          : ""}{" "}
                        — {selectedAddress.pincode}
                      </p>
                      <p className="ck-review-addr-phone">
                        📞 {selectedAddress.phone}
                      </p>
                    </div>
                  </div>
                )}

                {/* Payment recap */}
                <div className="ck-review-section">
                  <div className="ck-review-sec-hd">
                    <span>💳 Payment</span>
                    <button
                      className="ck-review-edit"
                      onClick={() => setStep(2)}
                    >
                      Edit
                    </button>
                  </div>
                  <p className="ck-review-pay">
                    {paymentMethod === "razorpay"
                      ? "Online Payment (Razorpay)"
                      : "Cash on Delivery"}
                  </p>
                </div>

                {/* Items recap */}
                <div className="ck-review-section">
                  <div className="ck-review-sec-hd">
                    <span>🍦 Items ({itemCount})</span>
                  </div>
                  <div className="ck-review-items">
                    {items.map((item, idx) => {
                      const src = imgSrc(
                        typeof item.iceCreamId === "object"
                          ? item.iceCreamId.imageUrl
                          : null,
                      );
                      const name =
                        typeof item.iceCreamId === "object"
                          ? item.iceCreamId.name
                          : "Ice Cream";
                      return (
                        <div key={idx} className="ck-review-item">
                          <div className="ck-review-item-img">
                            {src ? (
                              <img
                                src={src}
                                alt={name}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  e.target.nextSibling.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className="ck-review-item-placeholder"
                              style={{ display: src ? "none" : "flex" }}
                            >
                              🍦
                            </div>
                          </div>
                          <div className="ck-review-item-info">
                            <span className="ck-review-item-name">{name}</span>
                            <span className="ck-review-item-meta">
                              {item.size} × {item.quantity}
                            </span>
                          </div>
                          <span className="ck-review-item-price">
                            ₹
                            {(item.price * item.quantity).toLocaleString(
                              "en-IN",
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Error */}
                {orderError && (
                  <div className="ck-order-error">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {orderError}
                  </div>
                )}

                <div className="ck-panel-foot">
                  <button
                    className="ck-btn ck-btn--ghost"
                    onClick={goBack}
                    disabled={placing}
                  >
                    Back
                  </button>
                  <button
                    className="ck-btn ck-btn--primary ck-btn--place"
                    onClick={handlePlaceOrder}
                    disabled={placing}
                  >
                    {placing ? (
                      <>
                        <span className="ck-spin" />
                        {paymentMethod === "razorpay"
                          ? "Opening Payment…"
                          : "Placing Order…"}
                      </>
                    ) : (
                      <>
                        {paymentMethod === "razorpay"
                          ? "Pay Now"
                          : "Place Order"}
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: order summary (sticky) ── */}
          <div className="ck-summary-col">
            <div className="ck-summary">
              <h2 className="ck-summary-title">Order Summary</h2>

              {/* Mini item list */}
              <div className="ck-summary-items">
                {items.map((item, idx) => {
                  const name =
                    typeof item.iceCreamId === "object"
                      ? item.iceCreamId.name
                      : "Ice Cream";
                  return (
                    <div key={idx} className="ck-summary-item">
                      <span className="ck-summary-item-qty">
                        {item.quantity}×
                      </span>
                      <span className="ck-summary-item-name">
                        {name}{" "}
                        <span className="ck-summary-item-size">
                          ({item.size})
                        </span>
                      </span>
                      <span className="ck-summary-item-price">
                        ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="ck-summary-divider" />

              <div className="ck-summary-rows">
                <div className="ck-summary-row">
                  <span>
                    Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})
                  </span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="ck-summary-row">
                  <span>
                    Delivery fee
                    {feeBreakdown?.surgeEnabled && (
                      <span className="ck-summary-row-hint ck-surge-badge">
                        {" "}
                        ⚡ Surge
                      </span>
                    )}
                  </span>
                  <span>
                    {feeLoading ? (
                      <span className="ck-fee-loading">⋯</span>
                    ) : deliveryFee !== null ? (
                      <>₹{deliveryFee}</>
                    ) : (
                      <span className="ck-summary-row-hint">
                        Select address
                      </span>
                    )}
                  </span>
                </div>
                {feeBreakdown && !feeLoading && (
                  <div className="ck-fee-breakdown">
                    <span>₹{feeBreakdown.basePay} base</span>
                    <span>
                      + ₹{feeBreakdown.distancePay.toFixed(0)} distance (
                      {feeBreakdown.distanceKm.toFixed(1)} km)
                    </span>
                    {feeBreakdown.surgeBonus > 0 && (
                      <span>+ ₹{feeBreakdown.surgeBonus} surge</span>
                    )}
                  </div>
                )}
                {activeTip > 0 && (
                  <div className="ck-summary-row ck-summary-row--tip">
                    <span>Tip 🙏</span>
                    <span>₹{activeTip}</span>
                  </div>
                )}
              </div>

              <div className="ck-summary-divider" />

              <div className="ck-summary-total">
                <span>Total</span>
                <span className="ck-summary-total-amt">
                  ₹{grandTotal.toLocaleString("en-IN")}
                </span>
              </div>

              {/* Address preview on summary */}
              {selectedAddress && (
                <div className="ck-summary-addr-preview">
                  <span className="ck-summary-addr-icon">📍</span>
                  <span>
                    {selectedAddress.addressLine}, {selectedAddress.city}
                  </span>
                </div>
              )}

              {/* Promos */}
              <div className="ck-summary-promos">
                {[
                  "❄️ Always cold on delivery",
                  "🚀 45-min delivery",
                  "🔒 Secure payments",
                ].map((p) => (
                  <div key={p} className="ck-summary-promo">
                    {p}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="ck-footer">
        <span>🍦 FrozenDelights · © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
};

export default Checkout;
