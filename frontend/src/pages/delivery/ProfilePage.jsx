import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./Delivery.css";

const IMG_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${IMG_URL}/${url.replace(/\\/g, "/")}` : null);

const VEHICLE_LABELS = {
  bicycle: "🚲 Bicycle",
  e_bike: "⚡ E-Bike",
  scooter: "🛵 Scooter",
  e_scooter: "⚡ E-Scooter",
  motorcycle: "🏍️ Motorcycle",
};

/* ── Inline document viewer ── */
const DocViewer = ({ label, url, onClose }) => {
  const isPdf = url?.toLowerCase().endsWith(".pdf");
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          width: "min(760px, 95vw)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <span
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              letterSpacing: 1,
              color: "#9ca3af",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "#9ca3af",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              ↗ Open
            </a>
            <button
              onClick={onClose}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "#9ca3af",
                fontSize: "0.78rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕ Close
            </button>
          </div>
        </div>
        <div
          style={{
            background: "#111",
            minHeight: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isPdf ? (
            <iframe
              src={url}
              title={label}
              style={{ width: "100%", height: "60vh", border: "none" }}
            />
          ) : (
            <img
              src={url}
              alt={label}
              style={{
                maxWidth: "100%",
                maxHeight: "60vh",
                objectFit: "contain",
                display: "block",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Personal edit
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullname: "",
    phone: "",
    vehicleType: "",
  });

  // Bank details edit
  const [editingBank, setEditingBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
  });

  // Reveal toggles
  const [showAccount, setShowAccount] = useState(false);
  const [showIfsc, setShowIfsc] = useState(false);

  // Profile pic upload
  const [uploadingPic, setUploadingPic] = useState(false);
  const picInputRef = useRef();

  // Document viewer
  const [docViewer, setDocViewer] = useState(null);

  // Toast
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");

  const showToast = (msg, type = "success") => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(""), 3000);
  };

  useEffect(() => {
    api
      .get("/delivery-persons/me")
      .then((res) => {
        const p = res.data.data;
        setProfile(p);
        setForm({
          fullname: p.fullname,
          phone: p.phone,
          vehicleType: p.vehicleType,
        });
        setBankForm({
          bankName: p.bankDetails?.bankName || "",
          accountNumber: p.bankDetails?.accountNumber || "",
          ifscCode: p.bankDetails?.ifscCode || "",
          upiId: p.bankDetails?.upiId || "",
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── Save personal details ── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("fullname", form.fullname);
      fd.append("phone", form.phone);
      fd.append("vehicleType", form.vehicleType);
      await api.patch("/delivery-persons", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile((prev) => ({ ...prev, ...form }));
      setEditing(false);
      showToast("Profile updated successfully!");
    } catch (err) {
      showToast(err.response?.data?.message || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── Save bank details ── */
  const handleSaveBank = async () => {
    if (!bankForm.bankName.trim())
      return showToast("Bank name is required", "error");
    if (!bankForm.accountNumber.trim())
      return showToast("Account number is required", "error");
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankForm.ifscCode.toUpperCase()))
      return showToast("Enter a valid IFSC code (e.g. HDFC0001234)", "error");

    setSavingBank(true);
    try {
      const fd = new FormData();
      fd.append(
        "bankDetails",
        JSON.stringify({
          bankName: bankForm.bankName.trim(),
          accountNumber: bankForm.accountNumber.trim(),
          ifscCode: bankForm.ifscCode.trim().toUpperCase(),
          ...(bankForm.upiId.trim() ? { upiId: bankForm.upiId.trim() } : {}),
        }),
      );
      await api.patch("/delivery-persons", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile((prev) => ({
        ...prev,
        bankDetails: {
          ...bankForm,
          ifscCode: bankForm.ifscCode.toUpperCase(),
        },
      }));
      setEditingBank(false);
      showToast("Bank details updated!");
    } catch (err) {
      showToast(err.response?.data?.message || "Bank update failed", "error");
    } finally {
      setSavingBank(false);
    }
  };

  /* ── Replace profile picture ── */
  const handlePicChange = async (file) => {
    if (!file) return;
    setUploadingPic(true);
    try {
      const fd = new FormData();
      fd.append("profilePicture", file);
      await api.patch("/delivery-persons", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const res = await api.get("/delivery-persons/me");
      setProfile(res.data.data);
      showToast("Profile picture updated!");
    } catch (err) {
      showToast(err.response?.data?.message || "Upload failed", "error");
    } finally {
      setUploadingPic(false);
    }
  };

  const getStatusConfig = (status) =>
    ({
      active: { label: "Active", color: "green", icon: "✅" },
      pending: { label: "Pending Review", color: "yellow", icon: "⏳" },
      suspended: { label: "Suspended", color: "red", icon: "🚫" },
      inactive: { label: "Inactive", color: "gray", icon: "⭕" },
      rejected: { label: "Rejected", color: "red", icon: "❌" },
    })[status] || { label: "Pending Review", color: "yellow", icon: "⏳" };

  if (loading) {
    return (
      <div className="dd-loading">
        <div className="dd-spinner" />
        <p>Loading profile…</p>
      </div>
    );
  }

  const statusCfg = getStatusConfig(profile?.status);
  const isActive = profile?.status === "active";
  const needsDocs = ["scooter", "motorcycle", "e_scooter"].includes(
    profile?.vehicleType,
  );

  const revealBtnStyle = {
    background: "none",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6,
    cursor: "pointer",
    padding: "2px 8px",
    fontSize: "0.7rem",
    color: "#9ca3af",
    fontWeight: 700,
    lineHeight: 1.6,
    fontFamily: "Barlow, sans-serif",
    flexShrink: 0,
  };

  const viewBtnStyle = {
    ...revealBtnStyle,
    borderColor: "rgba(245,158,11,0.3)",
    color: "#f59e0b",
  };

  return (
    <div className="dd-page">
      {docViewer && (
        <DocViewer
          label={docViewer.label}
          url={docViewer.url}
          onClose={() => setDocViewer(null)}
        />
      )}

      <div className="dd-noise" />

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
          <Link to="/delivery/profile" className="dd-nav-item active">
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

      <main className="dd-main">
        <div className="dd-header">
          <div>
            <h1 className="dd-header-title">Profile</h1>
            <p className="dd-header-sub">Manage your rider information</p>
          </div>
          {isActive && (
            <button
              className="dd-edit-btn"
              onClick={() => {
                setEditing((v) => !v);
                setEditingBank(false);
              }}
            >
              {editing ? "Cancel" : "✏️ Edit Profile"}
            </button>
          )}
        </div>

        <div className="dd-profile-grid">
          {/* ── Profile Hero Card ── */}
          <div className="dd-card profile-hero-card">
            <div className="dd-profile-avatar-wrap">
              <div style={{ position: "relative", display: "inline-block" }}>
                {imgSrc(profile?.profilePicUrl) ? (
                  <img
                    className="dd-profile-avatar"
                    src={imgSrc(profile.profilePicUrl)}
                    alt="Profile"
                  />
                ) : (
                  <div className="dd-profile-avatar-placeholder">
                    {profile?.fullname?.[0] || "R"}
                  </div>
                )}
                {isActive && (
                  <>
                    <button
                      onClick={() => picInputRef.current?.click()}
                      disabled={uploadingPic}
                      title="Replace profile picture"
                      style={{
                        position: "absolute",
                        bottom: 4,
                        right: 4,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "rgba(15,15,15,0.9)",
                        border: "1px solid rgba(245,158,11,0.4)",
                        color: "#f59e0b",
                        fontSize: "0.75rem",
                        cursor: uploadingPic ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {uploadingPic ? "…" : "📷"}
                    </button>
                  </>
                )}
              </div>
              <div className={`dd-profile-status-badge ${statusCfg.color}`}>
                {statusCfg.icon} {statusCfg.label}
              </div>
            </div>
            <div className="dd-profile-name">{profile?.fullname}</div>
            <div className="dd-profile-vehicle">
              {VEHICLE_LABELS[profile?.vehicleType] || profile?.vehicleType}
            </div>
            <div className="dd-profile-rating">
              <span className="dd-rating-stars">
                {"★".repeat(Math.round(profile?.averageRating || 0))}
              </span>
              <span className="dd-rating-val">
                {profile?.averageRating?.toFixed(1) || "—"}
              </span>
              <span className="dd-rating-count">
                ({profile?.totalReviews || 0} reviews)
              </span>
            </div>
            {profile?.status === "suspended" && profile?.suspension && (
              <div className="dd-suspension-box">
                <div className="dd-suspension-title">⚠️ Account Suspended</div>
                <div className="dd-suspension-reason">
                  {profile.suspension.reason}
                </div>
                <div className="dd-suspension-dates">
                  {new Date(profile.suspension.from).toLocaleDateString()} –{" "}
                  {new Date(profile.suspension.to).toLocaleDateString()}
                </div>
              </div>
            )}
          </div>

          {/* ── Personal Details Card ── */}
          <div className="dd-card">
            <div className="dd-card-title">Personal Details</div>
            {editing ? (
              <div className="dd-form-fields">
                <div className="dd-field">
                  <label className="dd-label">Full Name</label>
                  <input
                    className="dd-input"
                    value={form.fullname}
                    onChange={(e) =>
                      setForm({ ...form, fullname: e.target.value })
                    }
                  />
                </div>
                <div className="dd-field">
                  <label className="dd-label">Phone Number</label>
                  <input
                    className="dd-input"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </div>
                <div className="dd-field">
                  <label className="dd-label">Vehicle Type</label>
                  <select
                    className="dd-input"
                    value={form.vehicleType}
                    onChange={(e) =>
                      setForm({ ...form, vehicleType: e.target.value })
                    }
                  >
                    <option value="bicycle">Bicycle</option>
                    <option value="e_bike">E-Bike</option>
                    <option value="scooter">Scooter</option>
                    <option value="e_scooter">E-Scooter</option>
                    <option value="motorcycle">Motorcycle</option>
                  </select>
                </div>
                <button
                  className="dd-primary-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            ) : (
              <div className="dd-info-rows">
                {[
                  ["Full Name", profile?.fullname],
                  ["Phone", profile?.phone],
                  ["Vehicle", VEHICLE_LABELS[profile?.vehicleType]],
                ].map(([label, val]) => (
                  <div className="dd-info-row" key={label}>
                    <span className="dd-info-label">{label}</span>
                    <span className="dd-info-value">{val}</span>
                  </div>
                ))}
                <div className="dd-info-row">
                  <span className="dd-info-label">Status</span>
                  <span
                    className={`dd-info-value status-text ${statusCfg.color}`}
                  >
                    {statusCfg.label}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Bank Details Card ── */}
          <div className="dd-card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div className="dd-card-title" style={{ marginBottom: 0 }}>
                🏦 Bank Details
              </div>
              {isActive && (
                <button
                  className="dd-edit-btn"
                  style={{ fontSize: "0.78rem", padding: "6px 12px" }}
                  onClick={() => {
                    setEditingBank((v) => !v);
                    setEditing(false);
                  }}
                >
                  {editingBank ? "Cancel" : "✏️ Edit"}
                </button>
              )}
            </div>

            {editingBank ? (
              <div className="dd-form-fields">
                <div className="dd-field">
                  <label className="dd-label">Bank Name</label>
                  <input
                    className="dd-input"
                    placeholder="e.g. HDFC Bank"
                    value={bankForm.bankName}
                    onChange={(e) =>
                      setBankForm({ ...bankForm, bankName: e.target.value })
                    }
                  />
                </div>
                <div className="dd-field">
                  <label className="dd-label">Account Number</label>
                  <input
                    className="dd-input"
                    placeholder="Enter account number"
                    value={bankForm.accountNumber}
                    onChange={(e) =>
                      setBankForm({
                        ...bankForm,
                        accountNumber: e.target.value.replace(/\D/g, ""),
                      })
                    }
                  />
                </div>
                <div className="dd-field">
                  <label className="dd-label">IFSC Code</label>
                  <input
                    className="dd-input"
                    placeholder="e.g. HDFC0001234"
                    maxLength={11}
                    value={bankForm.ifscCode}
                    onChange={(e) =>
                      setBankForm({
                        ...bankForm,
                        ifscCode: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
                <div className="dd-field">
                  <label className="dd-label">
                    UPI ID{" "}
                    <span
                      style={{
                        color: "#4b5563",
                        fontWeight: 400,
                        textTransform: "none",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    className="dd-input"
                    placeholder="e.g. name@upi"
                    value={bankForm.upiId}
                    onChange={(e) =>
                      setBankForm({ ...bankForm, upiId: e.target.value })
                    }
                  />
                </div>
                <p
                  style={{
                    fontSize: "0.72rem",
                    color: "#4b5563",
                    fontStyle: "italic",
                  }}
                >
                  🔒 Your details are encrypted and stored securely.
                </p>
                <button
                  className="dd-primary-btn"
                  onClick={handleSaveBank}
                  disabled={savingBank}
                >
                  {savingBank ? "Saving…" : "Save Bank Details"}
                </button>
              </div>
            ) : (
              <div className="dd-info-rows">
                <div className="dd-info-row">
                  <span className="dd-info-label">Bank Name</span>
                  <span className="dd-info-value">
                    {profile?.bankDetails?.bankName || "—"}
                  </span>
                </div>

                {/* Account number with reveal toggle */}
                <div className="dd-info-row">
                  <span className="dd-info-label">Account No.</span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span className="dd-info-value masked">
                      {showAccount
                        ? profile?.bankDetails?.accountNumber
                        : "•".repeat(8) +
                          (profile?.bankDetails?.accountNumber || "").slice(-4)}
                    </span>
                    <button
                      style={revealBtnStyle}
                      onClick={() => setShowAccount((v) => !v)}
                    >
                      {showAccount ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {/* IFSC with reveal toggle */}
                <div className="dd-info-row">
                  <span className="dd-info-label">IFSC Code</span>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span className="dd-info-value masked">
                      {showIfsc
                        ? profile?.bankDetails?.ifscCode
                        : (profile?.bankDetails?.ifscCode || "").slice(0, 4) +
                          "•".repeat(7)}
                    </span>
                    <button
                      style={revealBtnStyle}
                      onClick={() => setShowIfsc((v) => !v)}
                    >
                      {showIfsc ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                {profile?.bankDetails?.upiId && (
                  <div className="dd-info-row">
                    <span className="dd-info-label">UPI ID</span>
                    <span className="dd-info-value">
                      {profile.bankDetails.upiId}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Documents Card ── */}
          <div className="dd-card">
            <div className="dd-card-title">📄 Documents</div>
            <div className="dd-docs-list">
              {[
                {
                  icon: "📸",
                  label: "Profile Picture",
                  urlKey: "profilePicUrl",
                  canReplace: true,
                },
                {
                  icon: "🪪",
                  label: "Government ID",
                  urlKey: "govtIdUrl",
                  canReplace: false,
                },
                ...(needsDocs
                  ? [
                      {
                        icon: "🪪",
                        label: "Driving License",
                        urlKey: "drivingLicenseUrl",
                        canReplace: false,
                      },
                      {
                        icon: "📋",
                        label: "Vehicle Registration",
                        urlKey: "vehicleRegistrationUrl",
                        canReplace: false,
                      },
                    ]
                  : []),
              ].map(({ icon, label, urlKey, canReplace }) => {
                const url = imgSrc(profile?.[urlKey]);
                return (
                  <div className="dd-doc-row" key={urlKey}>
                    <span className="dd-doc-icon">{icon}</span>
                    <span className="dd-doc-name">{label}</span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginLeft: "auto",
                      }}
                    >
                      {url ? (
                        <>
                          <span className="dd-doc-status uploaded">✓</span>
                          <button
                            style={viewBtnStyle}
                            onClick={() => setDocViewer({ label, url })}
                          >
                            👁 View
                          </button>
                          {canReplace && isActive && (
                            <button
                              style={{
                                ...revealBtnStyle,
                                borderColor: "rgba(59,130,246,0.3)",
                                color: "#60a5fa",
                              }}
                              onClick={() => picInputRef.current?.click()}
                              disabled={uploadingPic}
                            >
                              {uploadingPic ? "…" : "🔄 Replace"}
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="dd-doc-status missing">Missing</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Hidden file input reused for profile picture replace from documents card */}
            <input
              ref={picInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handlePicChange(e.target.files[0])}
            />
          </div>
        </div>
      </main>

      {toastMsg && <div className={`dd-toast ${toastType}`}>{toastMsg}</div>}
    </div>
  );
};

export default ProfilePage;
