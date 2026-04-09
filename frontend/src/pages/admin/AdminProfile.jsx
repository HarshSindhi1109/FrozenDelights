import { useState, useEffect, useRef } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../services/api";
import "./Admin.css";

const BASE_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${BASE_URL}/${url.replace(/\\/g, "/")}` : null);
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

/* ══════════════════════════════════════════
   SECTION CARD
══════════════════════════════════════════ */
const SectionCard = ({ title, children }) => (
  <div className="ap-card" style={{ marginBottom: 20 }}>
    <div className="ap-card-hd">
      <h2
        style={{
          fontFamily: "var(--ff-mono)",
          fontSize: "0.72rem",
          letterSpacing: 1.5,
        }}
      >
        {title}
      </h2>
    </div>
    <div className="ap-card-body">{children}</div>
  </div>
);

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const AdminProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  /* Username edit */
  const [username, setUsername] = useState("");
  const [usernameLoading, setUsernameLoading] = useState(false);

  /* Password change */
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPw, setShowPw] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [pwLoading, setPwLoading] = useState(false);

  /* Avatar */
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const avatarRef = useRef(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* Fetch user */
  useEffect(() => {
    api
      .get("/auth/me")
      .then((r) => {
        setUser(r.data.user);
        setUsername(r.data.user.username || "");
      })
      .catch(() => showToast("Failed to load profile", "error"))
      .finally(() => setLoading(false));
  }, []);

  /* ── Username update ── */
  const handleUsernameUpdate = async () => {
    if (!username.trim()) {
      showToast("Username cannot be empty", "error");
      return;
    }
    if (username.trim() === user.username) {
      showToast("No changes made", "info");
      return;
    }
    setUsernameLoading(true);
    try {
      const res = await api.patch("/auth/me", { username: username.trim() });
      setUser(res.data.user);
      showToast("Username updated successfully!");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to update username",
        "error",
      );
    } finally {
      setUsernameLoading(false);
    }
  };

  /* ── Password change ── */
  const handlePasswordChange = async () => {
    const { currentPassword, newPassword, confirmPassword } = pwForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast("All password fields are required", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }
    if (currentPassword === newPassword) {
      showToast("New password must differ from current", "error");
      return;
    }
    setPwLoading(true);
    try {
      await api.patch("/auth/me/password", { currentPassword, newPassword });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Password changed successfully!");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to change password",
        "error",
      );
    } finally {
      setPwLoading(false);
    }
  };

  /* ── Avatar ── */
  const handleAvatarSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setAvatarFile(f);
    setAvatarPreview(URL.createObjectURL(f));
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setAvatarLoading(true);
    try {
      const fd = new FormData();
      fd.append("profilePicture", avatarFile);
      const res = await api.patch("/auth/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(res.data.user);
      setAvatarFile(null);
      setAvatarPreview(null);
      showToast("Avatar updated!");
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to upload avatar",
        "error",
      );
    } finally {
      setAvatarLoading(false);
    }
  };

  const cancelAvatarChange = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
    if (avatarRef.current) avatarRef.current.value = "";
  };

  /* ── Password strength ── */
  const pwStrength = (() => {
    const p = pwForm.newPassword;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1)
      return { label: "Weak", color: "var(--a-red)", width: "25%" };
    if (score === 2)
      return { label: "Fair", color: "var(--a-yellow)", width: "50%" };
    if (score === 3) return { label: "Good", color: "#3b82f6", width: "75%" };
    return { label: "Strong", color: "var(--a-green)", width: "100%" };
  })();

  const currentAvatarSrc = avatarPreview || imgSrc(user?.profilePicUrl);
  const authProviderIsGoogle = user?.authProvider === "google";

  if (loading) {
    return (
      <AdminLayout pageTitle="Profile">
        <div className="ap-center">
          <div className="ap-spin" />
          <span>Loading profile…</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Profile" breadcrumb="ACCOUNT / PROFILE">
      {toast && (
        <div className={`ap-toast ap-toast--${toast.type}`}>
          {toast.type === "success" && "✓ "}
          {toast.type === "error" && "✕ "}
          {toast.msg}
        </div>
      )}

      <div className="ap-page-hd">
        <div className="ap-page-hd-left">
          <h1>My Profile</h1>
          <p>Manage your administrator account</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 20,
          alignItems: "start",
        }}
      >
        {/* ── LEFT: Identity card ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Avatar card */}
          <div className="ap-card">
            <div
              className="ap-card-body"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                padding: "28px 20px",
              }}
            >
              {/* Avatar display */}
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 22,
                    background:
                      "linear-gradient(135deg, var(--a-indigo-d), var(--a-indigo))",
                    border: "2px solid var(--a-border)",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.4rem",
                    boxShadow: "0 0 0 4px rgba(99,102,241,0.12)",
                  }}
                >
                  {currentAvatarSrc ? (
                    <img
                      src={currentAvatarSrc}
                      alt="Avatar"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  ) : (
                    "👤"
                  )}
                </div>
                {/* Camera overlay button */}
                <button
                  onClick={() => avatarRef.current?.click()}
                  style={{
                    position: "absolute",
                    bottom: -4,
                    right: -4,
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "var(--a-indigo)",
                    border: "2px solid var(--a-bg)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "transform 0.15s",
                  }}
                  title="Change avatar"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2.5"
                  >
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
              </div>

              <input
                ref={avatarRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                style={{ display: "none" }}
              />

              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--a-text)",
                    marginBottom: 4,
                  }}
                >
                  {user?.username}
                </div>
                <div
                  style={{
                    fontFamily: "var(--ff-mono)",
                    fontSize: "0.6rem",
                    color: "var(--a-indigo)",
                    letterSpacing: 2,
                    marginBottom: 8,
                  }}
                >
                  ADMINISTRATOR
                </div>
                <span className="ap-badge ap-badge--green">Active</span>
              </div>

              {/* Avatar file selected — show actions */}
              {avatarFile && (
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--a-text2)",
                      textAlign: "center",
                      fontFamily: "var(--ff-mono)",
                    }}
                  >
                    {avatarFile.name}
                  </div>
                  <button
                    className="ap-btn ap-btn--primary"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={handleAvatarUpload}
                    disabled={avatarLoading}
                  >
                    {avatarLoading ? (
                      <>
                        <span className="ap-spin" /> Uploading…
                      </>
                    ) : (
                      "Upload Avatar"
                    )}
                  </button>
                  <button
                    className="ap-btn ap-btn--ghost"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={cancelAvatarChange}
                    disabled={avatarLoading}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Account meta */}
          <div className="ap-card">
            <div className="ap-card-hd">
              <h2
                style={{
                  fontFamily: "var(--ff-mono)",
                  fontSize: "0.65rem",
                  letterSpacing: 1.5,
                }}
              >
                // ACCOUNT INFO
              </h2>
            </div>
            <div
              className="ap-card-body"
              style={{
                padding: "14px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {[
                { label: "Email", value: user?.email, mono: true },
                {
                  label: "Auth Provider",
                  value:
                    user?.authProvider === "google" ? "🔵 Google" : "🔐 Local",
                },
                {
                  label: "Email Verified",
                  value: user?.isEmailVerified
                    ? "✅ Verified"
                    : "❌ Unverified",
                },
                { label: "Member Since", value: fmtDate(user?.createdAt) },
                {
                  label: "Role",
                  value: user?.role?.replace(/_/g, " ")?.toUpperCase(),
                },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <div
                    style={{
                      fontFamily: "var(--ff-mono)",
                      fontSize: "0.58rem",
                      color: "var(--a-text4)",
                      letterSpacing: 1,
                      marginBottom: 3,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--a-text2)",
                      fontFamily: mono ? "var(--ff-mono)" : "var(--ff-body)",
                      wordBreak: "break-all",
                    }}
                  >
                    {value || "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Edit forms ── */}
        <div>
          {/* ── Username ── */}
          <SectionCard title="// USERNAME">
            <div style={{ maxWidth: 420 }}>
              <div className="ap-field">
                <label className="ap-label">Username</label>
                <input
                  className="ap-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter new username"
                  onKeyDown={(e) => e.key === "Enter" && handleUsernameUpdate()}
                />
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--a-text4)",
                    fontFamily: "var(--ff-mono)",
                    marginTop: 4,
                  }}
                >
                  Current: {user?.username}
                </div>
              </div>
              <button
                className="ap-btn ap-btn--primary"
                onClick={handleUsernameUpdate}
                disabled={usernameLoading || username.trim() === user?.username}
              >
                {usernameLoading ? (
                  <>
                    <span className="ap-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Save Username
                  </>
                )}
              </button>
            </div>
          </SectionCard>

          {/* ── Password ── */}
          <SectionCard title="// CHANGE PASSWORD">
            {authProviderIsGoogle ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  background: "rgba(99,102,241,0.06)",
                  border: "1px solid var(--a-border)",
                  borderRadius: 10,
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>🔵</span>
                <div>
                  <div
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "var(--a-text)",
                      marginBottom: 2,
                    }}
                  >
                    Google Account
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--a-text2)" }}>
                    Password cannot be changed for Google-authenticated
                    accounts. Manage your password via Google.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 420 }}>
                {[
                  {
                    key: "currentPassword",
                    label: "Current Password",
                    showKey: "current",
                  },
                  { key: "newPassword", label: "New Password", showKey: "new" },
                  {
                    key: "confirmPassword",
                    label: "Confirm New Password",
                    showKey: "confirm",
                  },
                ].map(({ key, label, showKey }) => (
                  <div className="ap-field" key={key}>
                    <label className="ap-label">{label}</label>
                    <div style={{ position: "relative" }}>
                      <input
                        className="ap-input"
                        type={showPw[showKey] ? "text" : "password"}
                        placeholder="••••••••••••"
                        value={pwForm[key]}
                        onChange={(e) =>
                          setPwForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        style={{ paddingRight: 42 }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPw((s) => ({ ...s, [showKey]: !s[showKey] }))
                        }
                        style={{
                          position: "absolute",
                          right: 12,
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "var(--a-text4)",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        {showPw[showKey] ? (
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

                {/* Strength bar */}
                {pwStrength && (
                  <div style={{ marginBottom: 18 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--ff-mono)",
                          fontSize: "0.58rem",
                          color: "var(--a-text4)",
                          letterSpacing: 1,
                        }}
                      >
                        STRENGTH
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--ff-mono)",
                          fontSize: "0.58rem",
                          color: pwStrength.color,
                          letterSpacing: 1,
                        }}
                      >
                        {pwStrength.label.toUpperCase()}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: pwStrength.width,
                          background: pwStrength.color,
                          borderRadius: 2,
                          transition: "width 0.3s ease, background 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Match indicator */}
                {pwForm.confirmPassword && (
                  <div
                    style={{
                      marginBottom: 14,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: "0.78rem",
                      fontFamily: "var(--ff-mono)",
                      letterSpacing: 0.5,
                    }}
                  >
                    {pwForm.newPassword === pwForm.confirmPassword ? (
                      <>
                        <span style={{ color: "var(--a-green)" }}>✓</span>
                        <span style={{ color: "var(--a-green)" }}>
                          Passwords match
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ color: "var(--a-red)" }}>✕</span>
                        <span style={{ color: "var(--a-red)" }}>
                          Passwords do not match
                        </span>
                      </>
                    )}
                  </div>
                )}

                <button
                  className="ap-btn ap-btn--primary"
                  onClick={handlePasswordChange}
                  disabled={
                    pwLoading ||
                    !pwForm.currentPassword ||
                    !pwForm.newPassword ||
                    !pwForm.confirmPassword
                  }
                >
                  {pwLoading ? (
                    <>
                      <span className="ap-spin" /> Updating…
                    </>
                  ) : (
                    <>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <rect
                          x="3"
                          y="11"
                          width="18"
                          height="11"
                          rx="2"
                          ry="2"
                        />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      Change Password
                    </>
                  )}
                </button>
              </div>
            )}
          </SectionCard>

          {/* ── Security info ── */}
          <div className="ap-card">
            <div className="ap-card-hd">
              <h2
                style={{
                  fontFamily: "var(--ff-mono)",
                  fontSize: "0.65rem",
                  letterSpacing: 1.5,
                }}
              >
                // SECURITY
              </h2>
            </div>
            <div
              className="ap-card-body"
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {[
                {
                  icon: "🔐",
                  title: "CSRF Protection",
                  desc: "All state-changing requests are CSRF protected.",
                },
                {
                  icon: "🍪",
                  title: "HTTPOnly Cookies",
                  desc: "Session tokens are stored in secure, HTTPOnly cookies.",
                },
                {
                  icon: "🔄",
                  title: "Token Invalidation",
                  desc: "Logging out invalidates all existing sessions via token versioning.",
                },
              ].map(({ icon, title, desc }) => (
                <div
                  key={title}
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    padding: "10px 14px",
                    background: "rgba(99,102,241,0.04)",
                    border: "1px solid var(--a-border2)",
                    borderRadius: 10,
                  }}
                >
                  <span
                    style={{ fontSize: "1rem", flexShrink: 0, marginTop: 1 }}
                  >
                    {icon}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--ff-mono)",
                        fontSize: "0.65rem",
                        color: "var(--a-indigo-l)",
                        letterSpacing: 1,
                        marginBottom: 3,
                      }}
                    >
                      {title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--a-text2)",
                        lineHeight: 1.5,
                      }}
                    >
                      {desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
