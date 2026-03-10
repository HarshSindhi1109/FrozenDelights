import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { logoutUser } from "../../services/authService";
import "./Addresses.css";

/* ══════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════ */
const TYPE_ICONS = { home: "🏠", work: "💼", shop: "🏪", other: "📍" };
const TYPE_LABELS = {
  home: "Home",
  work: "Work",
  shop: "Shop",
  other: "Other",
};

const EMPTY_FORM = {
  fullname: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  addressType: "home",
  isDefault: false,
  lat: "",
  lng: "",
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const Addresses = () => {
  const navigate = useNavigate();

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ── Drawer state ── */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  /* ── Delete confirm ── */
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ── Geolocation ── */
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  /* ── Toast ── */
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* ── Fetch addresses ── */
  const fetchAddresses = async () => {
    try {
      const r = await api.get("/addresses");
      setAddresses(r.data.data || []);
    } catch {
      showToast("Failed to load addresses", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  /* ── Open drawer ── */
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setGeoError("");
    setDrawerOpen(true);
  };

  const openEdit = (addr) => {
    setEditingId(addr._id);
    setForm({
      fullname: addr.fullname,
      phone: addr.phone,
      addressLine: addr.addressLine,
      city: addr.city,
      state: addr.state || "",
      pincode: addr.pincode,
      addressType: addr.addressType || "home",
      isDefault: addr.isDefault || false,
      lat: addr.location?.coordinates?.[1] ?? "",
      lng: addr.location?.coordinates?.[0] ?? "",
    });
    setFormError("");
    setGeoError("");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setFormError("");
    setGeoError("");
  };

  /* ── Form change ── */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  /* ── Use current location ── */
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported by your browser.");
      return;
    }
    setGeoLoading(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        }));
        setGeoLoading(false);
      },
      () => {
        setGeoError("Could not get your location. Enter coordinates manually.");
        setGeoLoading(false);
      },
      { timeout: 8000 },
    );
  };

  /* ── Submit form ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);

    if (isNaN(lat) || isNaN(lng)) {
      setFormError(
        "Please provide valid coordinates (use the locate button or enter manually).",
      );
      return;
    }

    const payload = {
      fullname: form.fullname.trim(),
      phone: form.phone.trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      addressType: form.addressType,
      isDefault: form.isDefault,
      location: {
        type: "Point",
        coordinates: [lng, lat], // GeoJSON: [longitude, latitude]
      },
    };

    setFormLoading(true);
    try {
      if (editingId) {
        const r = await api.patch(`/addresses/${editingId}`, payload);
        setAddresses((prev) =>
          prev.map((a) => (a._id === editingId ? r.data.data : a)),
        );
        showToast("Address updated ✅");
      } else {
        const r = await api.post("/addresses", payload);
        // if new address is default, unset others locally
        if (payload.isDefault) {
          setAddresses((prev) =>
            prev.map((a) => ({ ...a, isDefault: false })).concat(r.data.data),
          );
        } else {
          setAddresses((prev) => [...prev, r.data.data]);
        }
        showToast("Address added 📍");
      }
      closeDrawer();
      // re-fetch to get correct sort order
      fetchAddresses();
    } catch (err) {
      setFormError(err.response?.data?.message || "Something went wrong.");
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.delete(`/addresses/${deleteId}`);
      setAddresses((prev) => prev.filter((a) => a._id !== deleteId));
      showToast("Address deleted");
    } catch {
      showToast("Failed to delete address", "error");
    } finally {
      setDeleteLoading(false);
      setDeleteId(null);
    }
  };

  /* ── Set default ── */
  const handleSetDefault = async (id) => {
    try {
      await api.post(`/addresses/${id}/default`);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a._id === id })),
      );
      showToast("Default address updated ⭐");
    } catch {
      showToast("Failed to update default", "error");
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
    <div className="ad-page">
      {/* ════ TOAST ════ */}
      {toast && (
        <div className={`ad-toast ad-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* ════ DELETE MODAL ════ */}
      {deleteId && (
        <div className="ad-modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ad-modal-icon">🗑️</div>
            <h3 className="ad-modal-title">Delete address?</h3>
            <p className="ad-modal-body">
              This address will be permanently removed.
            </p>
            <div className="ad-modal-btns">
              <button
                className="ad-modal-cancel"
                onClick={() => setDeleteId(null)}
              >
                Cancel
              </button>
              <button
                className="ad-modal-confirm"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ ADD/EDIT DRAWER ════ */}
      {drawerOpen && (
        <div className="ad-drawer-overlay" onClick={closeDrawer}>
          <div className="ad-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="ad-drawer-hd">
              <h2 className="ad-drawer-title">
                {editingId ? "Edit Address" : "Add New Address"}
              </h2>
              <button className="ad-drawer-close" onClick={closeDrawer}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="ad-form">
              {/* Row: fullname + phone */}
              <div className="ad-form-row">
                <div className="ad-field">
                  <label className="ad-label">Full Name</label>
                  <input
                    className="ad-input"
                    name="fullname"
                    value={form.fullname}
                    onChange={handleChange}
                    placeholder="Recipient's name"
                    required
                  />
                </div>
                <div className="ad-field">
                  <label className="ad-label">Phone</label>
                  <input
                    className="ad-input"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="10-digit number"
                    required
                  />
                </div>
              </div>

              {/* Address line */}
              <div className="ad-field">
                <label className="ad-label">Address Line</label>
                <input
                  className="ad-input"
                  name="addressLine"
                  value={form.addressLine}
                  onChange={handleChange}
                  placeholder="Flat / House no., Street, Area"
                  required
                />
              </div>

              {/* Row: city + state + pincode */}
              <div className="ad-form-row ad-form-row--3">
                <div className="ad-field">
                  <label className="ad-label">City</label>
                  <input
                    className="ad-input"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="City"
                    required
                  />
                </div>
                <div className="ad-field">
                  <label className="ad-label">State</label>
                  <input
                    className="ad-input"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="State"
                  />
                </div>
                <div className="ad-field">
                  <label className="ad-label">Pincode</label>
                  <input
                    className="ad-input"
                    name="pincode"
                    value={form.pincode}
                    onChange={handleChange}
                    placeholder="6-digit"
                    required
                  />
                </div>
              </div>

              {/* Address type */}
              <div className="ad-field">
                <label className="ad-label">Address Type</label>
                <div className="ad-type-pills">
                  {Object.entries(TYPE_LABELS).map(([val, label]) => (
                    <label
                      key={val}
                      className={`ad-type-pill${form.addressType === val ? " ad-type-pill--active" : ""}`}
                    >
                      <input
                        type="radio"
                        name="addressType"
                        value={val}
                        checked={form.addressType === val}
                        onChange={handleChange}
                        style={{ display: "none" }}
                      />
                      {TYPE_ICONS[val]} {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="ad-field">
                <label className="ad-label">
                  Location Coordinates
                  <span className="ad-label-hint">
                    {" "}
                    (required for delivery)
                  </span>
                </label>
                <div className="ad-geo-row">
                  <input
                    className="ad-input ad-input--coord"
                    name="lat"
                    value={form.lat}
                    onChange={handleChange}
                    placeholder="Latitude"
                    type="number"
                    step="any"
                  />
                  <input
                    className="ad-input ad-input--coord"
                    name="lng"
                    value={form.lng}
                    onChange={handleChange}
                    placeholder="Longitude"
                    type="number"
                    step="any"
                  />
                  <button
                    type="button"
                    className="ad-geo-btn"
                    onClick={handleGeolocate}
                    disabled={geoLoading}
                    title="Use my current location"
                  >
                    {geoLoading ? (
                      <span className="ad-spin" />
                    ) : (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <circle cx="12" cy="12" r="3" />
                        <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
                        <circle cx="12" cy="12" r="8" strokeDasharray="2 3" />
                      </svg>
                    )}
                    {geoLoading ? "Locating…" : "Use My Location"}
                  </button>
                </div>
                {geoError && <p className="ad-geo-err">{geoError}</p>}
                <p className="ad-geo-hint">
                  Click "Use My Location" to auto-fill, or open Google Maps,
                  right-click your address and copy the coordinates.
                </p>
              </div>

              {/* Default checkbox */}
              <label className="ad-checkbox-row">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={form.isDefault}
                  onChange={handleChange}
                  className="ad-checkbox"
                />
                <span className="ad-checkbox-label">
                  Set as default address
                </span>
              </label>

              {formError && <div className="ad-alert">{formError}</div>}

              <div className="ad-form-foot">
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost"
                  onClick={closeDrawer}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ad-btn ad-btn--primary"
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <>
                      <span className="ad-spin ad-spin--sm" /> Saving…
                    </>
                  ) : editingId ? (
                    "Save Changes"
                  ) : (
                    "Add Address"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════ NAV ════ */}
      <nav className="ad-nav">
        <div className="ad-nav-inner">
          <button className="pf-nav-back" onClick={() => navigate(-1)}>
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
          <span className="ad-nav-brand">
            <span>🍦</span> My Addresses
          </span>
          <button className="ad-nav-logout" onClick={handleLogout}>
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
      <div className="ad-content">
        <div className="ad-page-hd">
          <div>
            <h1 className="ad-page-title">Saved Addresses</h1>
            <p className="ad-page-sub">
              {loading
                ? "Loading…"
                : `${addresses.length} address${addresses.length !== 1 ? "es" : ""} saved`}
            </p>
          </div>
          <button
            className="ad-btn ad-btn--primary ad-add-btn"
            onClick={openCreate}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Address
          </button>
        </div>

        {/* Loading skeletons */}
        {loading && (
          <div className="ad-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="ad-card ad-card--skeleton">
                <div className="ad-sk ad-sk--title" />
                <div className="ad-sk ad-sk--line" />
                <div className="ad-sk ad-sk--line ad-sk--short" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && addresses.length === 0 && (
          <div className="ad-empty">
            <div className="ad-empty-icon">📍</div>
            <h2 className="ad-empty-title">No addresses yet</h2>
            <p className="ad-empty-sub">
              Add your first delivery address to get started.
            </p>
            <button className="ad-btn ad-btn--primary" onClick={openCreate}>
              Add Your First Address
            </button>
          </div>
        )}

        {/* Address cards */}
        {!loading && addresses.length > 0 && (
          <div className="ad-grid">
            {addresses.map((addr, i) => (
              <div
                key={addr._id}
                className={`ad-card${addr.isDefault ? " ad-card--default" : ""}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                {addr.isDefault && (
                  <div className="ad-default-badge">⭐ Default</div>
                )}

                <div className="ad-card-hd">
                  <span className="ad-type-badge">
                    {TYPE_ICONS[addr.addressType]}{" "}
                    {TYPE_LABELS[addr.addressType]}
                  </span>
                  <div className="ad-card-actions">
                    <button
                      className="ad-icon-btn"
                      onClick={() => openEdit(addr)}
                      title="Edit"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      className="ad-icon-btn ad-icon-btn--danger"
                      onClick={() => setDeleteId(addr._id)}
                      title="Delete"
                    >
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
                    </button>
                  </div>
                </div>

                <p className="ad-card-name">{addr.fullname}</p>
                <p className="ad-card-phone">{addr.phone}</p>
                <p className="ad-card-addr">
                  {addr.addressLine},<br />
                  {addr.city}
                  {addr.state ? `, ${addr.state}` : ""} — {addr.pincode}
                </p>

                {!addr.isDefault && (
                  <button
                    className="ad-set-default-btn"
                    onClick={() => handleSetDefault(addr._id)}
                  >
                    Set as Default
                  </button>
                )}
              </div>
            ))}

            {/* Add new card */}
            <button className="ad-card ad-card--add" onClick={openCreate}>
              <div className="ad-card-add-inner">
                <div className="ad-card-add-icon">+</div>
                <p className="ad-card-add-label">Add New Address</p>
              </div>
            </button>
          </div>
        )}
      </div>

      <footer className="ad-footer">
        <span>🍦 FrozenDelights · © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
};

export default Addresses;
