import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./Profile.css";
import { logoutUser } from "../../services/authService";

/* ─── helpers ─────────────────────────────── */
const BASE_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${BASE_URL}/${url}` : null);

const PROVIDER_LABEL = {
  local: "Email & Password",
  google: "Google Account",
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const Profile = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [user, setUser] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  /* ── Edit username ── */
  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState("");

  /* ── Change password ── */
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [showPw, setShowPw] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  /* ── Avatar ── */
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");

  /* ── Delete account ── */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  /* ── Toast ── */
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  /* ── Fetch current user ── */
  useEffect(() => {
    api
      .get("/auth/me")
      .then((r) => {
        setUser(r.data.user);
        setNewUsername(r.data.user.username);
      })
      .catch(() => navigate("/login"))
      .finally(() => setPageLoading(false));
  }, [navigate]);

  /* ── Update username ── */
  const handleNameSave = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed || trimmed === user.username) {
      setEditingName(false);
      return;
    }
    setNameError("");
    setNameLoading(true);
    try {
      const r = await api.patch("/auth/me", { username: trimmed });
      setUser((u) => ({ ...u, username: r.data.user.username }));
      setEditingName(false);
      showToast("Username updated! 🎉");
    } catch (err) {
      setNameError(err.response?.data?.message || "Failed to update username.");
    } finally {
      setNameLoading(false);
    }
  };

  /* ── Change password ── */
  const handlePwSubmit = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("New passwords don't match.");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    setPwLoading(true);
    try {
      await api.patch("/auth/me/password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwSuccess("Password changed successfully!");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Password updated 🔒");
      setTimeout(() => setPwSuccess(""), 3500);
    } catch (err) {
      setPwError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPwLoading(false);
    }
  };

  /* ── Avatar upload ── */
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be under 2 MB.");
      return;
    }
    setAvatarError("");
    setAvatarLoading(true);
    const formData = new FormData();
    formData.append("profilePicture", file);
    try {
      const r = await api.patch("/auth/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser((u) => ({ ...u, profilePicUrl: r.data.user.profilePicUrl }));
      showToast("Profile photo updated 📸");
    } catch (err) {
      setAvatarError(err.response?.data?.message || "Upload failed.");
    } finally {
      setAvatarLoading(false);
      e.target.value = "";
    }
  };

  /* ── Delete account ── */
  const handleDelete = async () => {
    if (deleteConfirm !== user.username) {
      setDeleteError(`Type your username "${user.username}" to confirm.`);
      return;
    }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await api.delete("/auth/me");
      navigate("/login");
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Delete failed.");
      setDeleteLoading(false);
    }
  };

  /* ── Logout ── */
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.log(err);
    }
    navigate("/login");
  };

  /* ────────────────────────────────────────── */

  if (pageLoading) {
    return (
      <div className="pf-page">
        <div className="pf-full-loader">
          <div className="pf-spinner" />
          <p>Loading your profile…</p>
        </div>
      </div>
    );
  }

  const avatarUrl = imgSrc(user?.profilePicUrl);
  const initials = (user?.username?.[0] || "U").toUpperCase();

  return (
    <div className="pf-page">
      {/* ════ TOAST ════ */}
      {toastMsg && <div className="pf-toast">{toastMsg}</div>}

      {/* ════ DELETE MODAL ════ */}
      {showDeleteModal && (
        <div
          className="pf-modal-overlay"
          onClick={() => setShowDeleteModal(false)}
        >
          <div className="pf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pf-modal-emoji">⚠️</div>
            <h3 className="pf-modal-title">Delete your account?</h3>
            <p className="pf-modal-body">
              This is <strong>permanent</strong>. All your orders, addresses,
              and data will be erased. Type <strong>{user.username}</strong>{" "}
              below to confirm.
            </p>
            <input
              className="pf-modal-input"
              type="text"
              placeholder={`Type "${user.username}"`}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            {deleteError && <p className="pf-modal-error">{deleteError}</p>}
            <div className="pf-modal-btns">
              <button
                className="pf-modal-cancel"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirm("");
                  setDeleteError("");
                }}
              >
                Cancel
              </button>
              <button
                className="pf-modal-confirm"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? "Deleting…" : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ NAV ════ */}
      <nav className="pf-nav">
        <div className="pf-nav-inner">
          <Link to="/" className="pf-nav-back">
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
          </Link>

          <span className="pf-nav-brand">
            <span className="pf-nav-brand-icon">🍦</span>
            My Profile
          </span>

          <button className="pf-nav-logout" onClick={handleLogout}>
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

      <div className="pf-content">
        {/* ════ HERO CARD ════ */}
        <div className="pf-hero">
          <div className="pf-hero-blob pf-hero-blob-1" />
          <div className="pf-hero-blob pf-hero-blob-2" />

          <div className="pf-hero-inner">
            {/* Avatar column */}
            <div className="pf-avatar-col">
              <div className="pf-avatar-ring">
                <div className="pf-avatar">
                  {avatarLoading && (
                    <div className="pf-avatar-overlay">
                      <div className="pf-spinner pf-spinner--sm" />
                    </div>
                  )}
                  {!avatarLoading && avatarUrl && (
                    <img
                      src={avatarUrl}
                      alt={user.username}
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  )}
                  <div
                    className="pf-avatar-initials"
                    style={{
                      display: !avatarLoading && avatarUrl ? "none" : "flex",
                    }}
                  >
                    {initials}
                  </div>
                </div>
              </div>

              <button
                className="pf-avatar-edit"
                onClick={() => fileRef.current?.click()}
                disabled={avatarLoading}
                title="Change photo"
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
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleAvatarChange}
              />
              {avatarError && <p className="pf-avatar-err">{avatarError}</p>}
            </div>

            {/* Info column */}
            <div className="pf-hero-info">
              <div className="pf-name-row">
                {editingName ? (
                  <div className="pf-name-edit-row">
                    <input
                      className="pf-name-input"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleNameSave();
                        if (e.key === "Escape") {
                          setEditingName(false);
                          setNewUsername(user.username);
                          setNameError("");
                        }
                      }}
                      maxLength={30}
                      autoFocus
                    />
                    <button
                      className="pf-name-save"
                      onClick={handleNameSave}
                      disabled={nameLoading}
                    >
                      {nameLoading ? "…" : "Save"}
                    </button>
                    <button
                      className="pf-name-x"
                      onClick={() => {
                        setEditingName(false);
                        setNewUsername(user.username);
                        setNameError("");
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="pf-username">{user.username}</h1>
                    <button
                      className="pf-name-pencil"
                      onClick={() => {
                        setEditingName(true);
                        setNameError("");
                      }}
                      title="Edit username"
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
                  </>
                )}
              </div>
              {nameError && <p className="pf-name-err">{nameError}</p>}

              <p className="pf-email">{user.email}</p>

              <div className="pf-chips">
                <span className="pf-chip pf-chip--role">
                  {user.role === "customer"
                    ? "🛍️"
                    : user.role === "admin"
                      ? "⚙️"
                      : "🛵"}{" "}
                  {user.role}
                </span>
                <span className="pf-chip pf-chip--provider">
                  {user.authProvider === "google" ? "🔵 Google" : "🔑 Email"}
                </span>
                {user.isEmailVerified && (
                  <span className="pf-chip pf-chip--verified">✅ Verified</span>
                )}
              </div>

              <p className="pf-joined">
                Member since{" "}
                {new Date(user.createdAt).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* ════ CARDS GRID ════ */}
        <div className="pf-grid">
          {/* ── Change Password (local accounts only) ── */}
          {user.authProvider !== "google" && (
            <div className="pf-card">
              <div className="pf-card-hd">
                <span className="pf-card-icon">🔒</span>
                <div>
                  <h2 className="pf-card-title">Change Password</h2>
                  <p className="pf-card-sub">Keep your account secure</p>
                </div>
              </div>

              <form onSubmit={handlePwSubmit} className="pf-form">
                {[
                  {
                    name: "currentPassword",
                    label: "Current Password",
                    key: "current",
                  },
                  { name: "newPassword", label: "New Password", key: "new" },
                  {
                    name: "confirmPassword",
                    label: "Confirm New Password",
                    key: "confirm",
                  },
                ].map(({ name, label, key }) => (
                  <div className="pf-field" key={name}>
                    <label className="pf-label">{label}</label>
                    <div className="pf-input-wrap">
                      <input
                        className="pf-input"
                        type={showPw[key] ? "text" : "password"}
                        name={name}
                        value={pwForm[name]}
                        onChange={(e) =>
                          setPwForm((f) => ({ ...f, [name]: e.target.value }))
                        }
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        className="pf-pw-eye"
                        onClick={() =>
                          setShowPw((s) => ({ ...s, [key]: !s[key] }))
                        }
                      >
                        {showPw[key] ? (
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}

                {pwError && (
                  <div className="pf-alert pf-alert--err">{pwError}</div>
                )}
                {pwSuccess && (
                  <div className="pf-alert pf-alert--ok">{pwSuccess}</div>
                )}

                <button
                  className="pf-btn pf-btn--primary"
                  type="submit"
                  disabled={pwLoading}
                >
                  {pwLoading ? (
                    <>
                      <span className="pf-btn-spin" /> Updating…
                    </>
                  ) : (
                    "Update Password"
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ── Account details ── */}
          <div className="pf-card">
            <div className="pf-card-hd">
              <span className="pf-card-icon">ℹ️</span>
              <div>
                <h2 className="pf-card-title">Account Details</h2>
                <p className="pf-card-sub">Your account information</p>
              </div>
            </div>

            <ul className="pf-info-list">
              {[
                { icon: "👤", label: "Username", val: user.username },
                { icon: "✉️", label: "Email", val: user.email },
                { icon: "🏷️", label: "Role", val: user.role },
                {
                  icon: "🔐",
                  label: "Sign-in",
                  val: PROVIDER_LABEL[user.authProvider] || user.authProvider,
                },
                {
                  icon: "📧",
                  label: "Email verified",
                  val: user.isEmailVerified ? "Yes ✅" : "No ❌",
                },
                {
                  icon: "📅",
                  label: "Joined",
                  val: new Date(user.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }),
                },
              ].map(({ icon, label, val }) => (
                <li className="pf-info-row" key={label}>
                  <span className="pf-info-icon">{icon}</span>
                  <span className="pf-info-label">{label}</span>
                  <span className="pf-info-val">{val}</span>
                </li>
              ))}
            </ul>

            <div className="pf-shortcut-list">
              {[
                { to: "/orders", icon: "📦", label: "My Orders" },
                { to: "/customer/addresses", icon: "📍", label: "Saved Addresses" },
                { to: "/cart", icon: "🛒", label: "My Cart" },
              ].map(({ to, icon, label }) => (
                <Link key={to} to={to} className="pf-shortcut">
                  <span>{icon}</span>
                  {label}
                  <svg
                    className="pf-shortcut-arrow"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Danger zone ── */}
          <div className="pf-card pf-card--danger">
            <div className="pf-card-hd">
              <span className="pf-card-icon">⚠️</span>
              <div>
                <h2 className="pf-card-title pf-card-title--red">
                  Danger Zone
                </h2>
                <p className="pf-card-sub">These actions cannot be undone</p>
              </div>
            </div>

            <div className="pf-danger-row">
              <div className="pf-danger-text">
                <p className="pf-danger-label">Delete Account</p>
                <p className="pf-danger-desc">
                  Permanently removes your account, all orders, addresses, and
                  reviews.
                </p>
              </div>
              <button
                className="pf-btn pf-btn--danger"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="pf-footer">
        <span>🍦 FrozenDelights · © {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
};

export default Profile;
