import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./Delivery.css";

const VEHICLE_LABELS = {
  bicycle: "🚲 Bicycle",
  e_bike: "⚡ E-Bike",
  scooter: "🛵 Scooter",
  e_scooter: "⚡ E-Scooter",
  motorcycle: "🏍️ Motorcycle",
};

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState("success");
  const [form, setForm] = useState({
    fullname: "",
    phone: "",
    vehicleType: "",
  });

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
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("fullname", form.fullname);
      formData.append("phone", form.phone);
      formData.append("vehicleType", form.vehicleType);
      await api.patch("/delivery-persons", formData, {
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

  const getStatusConfig = (status) => {
    const configs = {
      active: { label: "Active", color: "green", icon: "✅" },
      pending: { label: "Pending Review", color: "yellow", icon: "⏳" },
      suspended: { label: "Suspended", color: "red", icon: "🚫" },
      inactive: { label: "Inactive", color: "gray", icon: "⭕" },
      rejected: { label: "Rejected", color: "red", icon: "❌" },
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="dd-loading">
        <div className="dd-spinner" />
        <p>Loading profile…</p>
      </div>
    );
  }

  const statusCfg = getStatusConfig(profile?.status);

  return (
    <div className="dd-page">
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
          {profile?.status === "active" && (
            <button
              className="dd-edit-btn"
              onClick={() => (editing ? setEditing(false) : setEditing(true))}
            >
              {editing ? "Cancel" : "✏️ Edit Profile"}
            </button>
          )}
        </div>

        <div className="dd-profile-grid">
          {/* Profile Card */}
          <div className="dd-card profile-hero-card">
            <div className="dd-profile-avatar-wrap">
              {profile?.profilePicUrl ? (
                <img
                  className="dd-profile-avatar"
                  src={`/${profile.profilePicUrl}`}
                  alt="Profile"
                />
              ) : (
                <div className="dd-profile-avatar-placeholder">
                  {profile?.fullname?.[0] || "R"}
                </div>
              )}
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

          {/* Edit / Info Card */}
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
                <div className="dd-info-row">
                  <span className="dd-info-label">Full Name</span>
                  <span className="dd-info-value">{profile?.fullname}</span>
                </div>
                <div className="dd-info-row">
                  <span className="dd-info-label">Phone</span>
                  <span className="dd-info-value">{profile?.phone}</span>
                </div>
                <div className="dd-info-row">
                  <span className="dd-info-label">Vehicle</span>
                  <span className="dd-info-value">
                    {VEHICLE_LABELS[profile?.vehicleType]}
                  </span>
                </div>
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

          {/* Bank Details Card */}
          <div className="dd-card">
            <div className="dd-card-title">🏦 Bank Details</div>
            <div className="dd-info-rows">
              <div className="dd-info-row">
                <span className="dd-info-label">Bank Name</span>
                <span className="dd-info-value">
                  {profile?.bankDetails?.bankName || "—"}
                </span>
              </div>
              <div className="dd-info-row">
                <span className="dd-info-label">Account Number</span>
                <span className="dd-info-value masked">
                  {"•".repeat(8)}
                  {(profile?.bankDetails?.accountNumber || "").slice(-4)}
                </span>
              </div>
              <div className="dd-info-row">
                <span className="dd-info-label">IFSC Code</span>
                <span className="dd-info-value masked">
                  {(profile?.bankDetails?.ifscCode || "").slice(0, 4)}
                  {"•".repeat(4)}
                </span>
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
            <p className="dd-bank-note">
              To update bank details, please contact support.
            </p>
          </div>

          {/* Documents Card */}
          <div className="dd-card">
            <div className="dd-card-title">📄 Documents</div>
            <div className="dd-docs-list">
              <div className="dd-doc-row">
                <span className="dd-doc-icon">🪪</span>
                <span className="dd-doc-name">Government ID</span>
                <span
                  className={`dd-doc-status ${profile?.govtIdUrl ? "uploaded" : "missing"}`}
                >
                  {profile?.govtIdUrl ? "Uploaded ✓" : "Missing"}
                </span>
              </div>
              <div className="dd-doc-row">
                <span className="dd-doc-icon">📸</span>
                <span className="dd-doc-name">Profile Picture</span>
                <span
                  className={`dd-doc-status ${profile?.profilePicUrl ? "uploaded" : "missing"}`}
                >
                  {profile?.profilePicUrl ? "Uploaded ✓" : "Missing"}
                </span>
              </div>
              {["scooter", "motorcycle", "e_scooter"].includes(
                profile?.vehicleType,
              ) && (
                <>
                  <div className="dd-doc-row">
                    <span className="dd-doc-icon">🪪</span>
                    <span className="dd-doc-name">Driving License</span>
                    <span
                      className={`dd-doc-status ${profile?.drivingLicenseUrl ? "uploaded" : "missing"}`}
                    >
                      {profile?.drivingLicenseUrl ? "Uploaded ✓" : "Missing"}
                    </span>
                  </div>
                  <div className="dd-doc-row">
                    <span className="dd-doc-icon">📋</span>
                    <span className="dd-doc-name">Vehicle Registration</span>
                    <span
                      className={`dd-doc-status ${profile?.vehicleRegistrationUrl ? "uploaded" : "missing"}`}
                    >
                      {profile?.vehicleRegistrationUrl
                        ? "Uploaded ✓"
                        : "Missing"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {toastMsg && <div className={`dd-toast ${toastType}`}>{toastMsg}</div>}
    </div>
  );
};

export default ProfilePage;
