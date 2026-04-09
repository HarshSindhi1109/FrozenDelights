import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import { logoutUser } from "../../services/authService";
import "./Admin.css";

/* ── Nav config ── */
const NAV = [
  {
    group: "OVERVIEW",
    items: [
      { path: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
    ],
  },
  {
    group: "CATALOG",
    items: [
      { path: "/admin/categories", label: "Categories", icon: "category" },
      { path: "/admin/flavours", label: "Flavours", icon: "flavour" },
      { path: "/admin/ice-creams", label: "Ice Creams", icon: "icecream" },
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      { path: "/admin/orders", label: "Orders", icon: "orders" },
      {
        path: "/admin/delivery-persons",
        label: "Delivery Persons",
        icon: "delivery",
      },
      { path: "/admin/payouts", label: "Payouts", icon: "payout" },
    ],
  },
];

const NavIcon = ({ type }) => {
  const props = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    className: "ap-nav-icon",
  };
  if (type === "dashboard")
    return (
      <svg {...props}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  if (type === "category")
    return (
      <svg {...props}>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    );
  if (type === "flavour")
    return (
      <svg {...props}>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
    );
  if (type === "icecream")
    return (
      <svg {...props}>
        <path d="M12 22V12M8 12l4-10 4 10" />
        <path d="M6 12a6 6 0 0 0 12 0" />
      </svg>
    );
  if (type === "orders")
    return (
      <svg {...props}>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    );
  if (type === "delivery")
    return (
      <svg {...props}>
        <circle cx="5" cy="18" r="2" />
        <circle cx="19" cy="18" r="2" />
        <path d="M5 16H3v-4l4-5h8l4 5v4H5z" />
      </svg>
    );
  if (type === "payout")
    return (
      <svg {...props}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    );
  return null;
};

/* ══════════════════════════════════════════
   LAYOUT COMPONENT
══════════════════════════════════════════ */
const AdminLayout = ({ children, pageTitle, breadcrumb }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Error occurred while logging out:", err);
    }
    navigate("/admin/login");
  };

  const now = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="ap-shell">
      {/* ── SIDEBAR ── */}
      <aside className="ap-sidebar">
        <div className="ap-sidebar-logo">
          <div className="ap-sidebar-logo-icon">🍨</div>
          <div className="ap-sidebar-logo-text">
            <span className="ap-sidebar-logo-brand">FrozenDelights</span>
            <span className="ap-sidebar-logo-scope">Admin Panel</span>
          </div>
        </div>

        <nav className="ap-sidebar-nav">
          {NAV.map((group) => (
            <div key={group.group}>
              <div className="ap-nav-label">{group.group}</div>
              {group.items.map((item) => (
                <button
                  key={item.path}
                  className={`ap-nav-item${location.pathname === item.path ? " active" : ""}`}
                  onClick={() => navigate(item.path)}
                >
                  <NavIcon type={item.icon} />
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="ap-sidebar-bottom">
          {user && (
            <div
              className="ap-sidebar-user"
              onClick={() => navigate("/admin/profile")}
              style={{ cursor: "pointer" }}
              title="View profile"
            >
              <div className="ap-sidebar-avatar">👤</div>
              <div className="ap-sidebar-user-info">
                <div className="ap-sidebar-username">
                  {user.username || user.email}
                </div>
                <div className="ap-sidebar-role">ADMINISTRATOR</div>
              </div>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ color: "var(--a-text4)", flexShrink: 0 }}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          )}
          <button className="ap-logout-btn" onClick={handleLogout}>
            <svg
              width="14"
              height="14"
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
      </aside>

      {/* ── MAIN ── */}
      <div className="ap-main">
        {/* Topbar */}
        <div className="ap-topbar">
          <div className="ap-topbar-title">
            <span className="ap-topbar-page">{pageTitle}</span>
            <span className="ap-topbar-breadcrumb">
              ADMIN / {breadcrumb || pageTitle.toUpperCase()}
            </span>
          </div>
          <div className="ap-topbar-right">
            <div className="ap-topbar-status">
              <div className="ap-topbar-dot" />
              SYSTEM ONLINE · {now}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="ap-content">{children}</div>
      </div>
    </div>
  );
};

export default AdminLayout;
