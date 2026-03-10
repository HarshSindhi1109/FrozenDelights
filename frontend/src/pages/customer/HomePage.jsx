import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api";
import "./HomePage.css";
import { logoutUser } from "../../services/authService";

/* ─── helpers ─────────────────────────────── */
const BASE_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${BASE_URL}/${url}` : null);

const StarRating = ({ rating = 0, size = "sm" }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className={`hp-stars hp-stars--${size}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={
            i < full
              ? "hp-star--full"
              : i === full && half
                ? "hp-star--half"
                : "hp-star--empty"
          }
        >
          ★
        </span>
      ))}
    </div>
  );
};

const getMinPrice = (variants = []) => {
  const prices = variants.filter((v) => v.isAvailable).map((v) => v.basePrice);
  return prices.length ? Math.min(...prices) : null;
};

/* ─── Scroll reveal ───────────────────────── */
const useScrollReveal = (dep) => {
  useEffect(() => {
    const els = document.querySelectorAll(".hp-reveal");
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) =>
          e.target.classList.toggle("hp-visible", e.isIntersecting),
        ),
      { threshold: 0.1 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [dep]);
};

/* ─── Greeting ────────────────────────────── */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", emoji: "☀️" };
  if (h < 17) return { text: "Good afternoon", emoji: "🌤️" };
  return { text: "Good evening", emoji: "🌙" };
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const HomePage = () => {
  // user from Zustand / context — adjust import to your store
  // For now we read from a simple prop or you can wire your store here
  // eslint-disable-next-line no-unused-vars
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [iceCreams, setIceCreams] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("-averageRating");
  const [cartCount, setCartCount] = useState(0);

  const [catLoading, setCatLoading] = useState(true);
  const [icLoading, setIcLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const [addingId, setAddingId] = useState(null);
  const [addedId, setAddedId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef(null);

  useScrollReveal([iceCreams, categories]);

  /* ── Fetch user ── */
  useEffect(() => {
    api
      .get("/auth/me")
      .then((r) => setUser(r.data.user))
      .catch(() => {});
  }, []);

  /* ── Navbar scroll shadow ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ── Debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  /* ── Reset page on filter change ── */
  useEffect(() => {
    setPage(1);
    setIceCreams([]);
  }, [activeCategory, debouncedSearch, sortBy]);

  /* ── Fetch user & cart count ── */
  useEffect(() => {
    api
      .get("/cart")
      .then((r) => {
        const items = r.data?.cart?.items || [];
        setCartCount(items.reduce((s, i) => s + i.quantity, 0));
      })
      .catch(() => {});
  }, []);

  /* ── Fetch categories ── */
  useEffect(() => {
    api
      .get("/categories?limit=20")
      .then((r) => setCategories(r.data.data || []))
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false));
  }, []);

  /* ── Fetch ice creams ── */
  const fetchIceCreams = useCallback(
    async (pageNum = 1, append = false) => {
      if (pageNum === 1) setIcLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          limit: "12",
          page: pageNum,
          sort: sortBy,
        });
        if (debouncedSearch) params.set("search", debouncedSearch);

        // If a category is selected, find its flavours first
        // For simplicity we filter by search + sort; category filter via flavourId
        // would need a join — so we filter client-side by flavour category name if needed

        const res = await api.get(`/ice-creams?${params}`);
        const data = res.data.data || [];
        setTotalPages(res.data.pages || 1);
        setIceCreams((prev) => (append ? [...prev, ...data] : data));
      } catch {
        if (!append) setIceCreams([]);
      } finally {
        setIcLoading(false);
        setLoadingMore(false);
      }
    },
    [debouncedSearch, sortBy],
  );

  useEffect(() => {
    fetchIceCreams(1, false);
  }, [fetchIceCreams]);

  /* ── Load more ── */
  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchIceCreams(next, true);
  };

  /* ── Add to cart ── */
  const handleQuickAdd = async (ic) => {
    const availableVariant = ic.variants?.find((v) => v.isAvailable);
    if (!availableVariant) {
      showToast("No variant available 😢");
      return;
    }
    setAddingId(ic._id);
    try {
      await api.post("/cart", {
        iceCreamId: ic._id,
        size: availableVariant.size,
        quantity: 1,
      });
      setAddedId(ic._id);
      setCartCount((c) => c + 1);
      showToast(`${ic.name} added to cart! 🛒`);
      setTimeout(() => setAddedId(null), 1500);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to add to cart";
      if (msg.toLowerCase().includes("login") || err.response?.status === 401) {
        navigate("/login");
      } else {
        showToast(msg);
      }
    } finally {
      setAddingId(null);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
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

  const greeting = getGreeting();

  // Filter displayed ice creams by active category (client side on loaded data)
  const displayedIceCreams =
    activeCategory === "all"
      ? iceCreams
      : iceCreams.filter((ic) =>
          ic.flavourId?.name
            ?.toLowerCase()
            .includes(
              categories
                .find((c) => c._id === activeCategory)
                ?.name?.toLowerCase() || "",
            ),
        );

  return (
    <div className="hp-page">
      {/* ════════ TOAST ════════ */}
      {toastMsg && (
        <div className="hp-toast">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ════════ NAVBAR ════════ */}
      <nav className={`hp-nav${scrolled ? " hp-nav--scrolled" : ""}`}>
        <div className="hp-nav-inner">
          <a href="#top" className="hp-nav-logo">
            <span className="hp-nav-logo-icon">🍦</span>
            <span className="hp-nav-logo-text">FrozenDelights</span>
          </a>

          <div className="hp-nav-search-wrap">
            <span className="hp-nav-search-icon">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </span>
            <input
              ref={searchRef}
              className="hp-nav-search"
              type="text"
              placeholder="Search flavours, names..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="hp-nav-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ×
              </button>
            )}
          </div>

          <div className="hp-nav-right">
            <Link to="/cart" className="hp-nav-cart">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {cartCount > 0 && (
                <span className="hp-nav-cart-badge">{cartCount}</span>
              )}
            </Link>

            <div
              className="hp-nav-avatar-wrap"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <div className="hp-nav-avatar">
                {user?.profilePicUrl ? (
                  <img src={imgSrc(user.profilePicUrl)} alt="avatar" />
                ) : (
                  <span>{(user?.username?.[0] || "U").toUpperCase()}</span>
                )}
              </div>
              {menuOpen && (
                <div className="hp-nav-dropdown">
                  <div className="hp-nav-dropdown-user">
                    <strong>{user?.username || "Welcome!"}</strong>
                    <span>{user?.email}</span>
                  </div>
                  <div className="hp-nav-dropdown-divider" />
                  <Link
                    to="/customer/profile"
                    className="hp-nav-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    👤 My Profile
                  </Link>
                  <Link
                    to="/orders"
                    className="hp-nav-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    📦 My Orders
                  </Link>
                  <Link
                    to="/customer/addresses"
                    className="hp-nav-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    📍 Addresses
                  </Link>
                  <div className="hp-nav-dropdown-divider" />
                  <button
                    className="hp-nav-dropdown-item hp-nav-dropdown-item--danger"
                    onClick={handleLogout}
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="hp-content" id="top">
        {/* ════════ HERO STRIP ════════ */}
        <section className="hp-hero">
          <div className="hp-hero-bg-blob hp-hero-bg-blob-1" />
          <div className="hp-hero-bg-blob hp-hero-bg-blob-2" />

          <div className="hp-hero-inner">
            <div className="hp-hero-left">
              <div className="hp-hero-greeting">
                <span>{greeting.emoji}</span>
                <span>
                  {greeting.text}
                  {user?.username ? `, ${user.username}` : ""}!
                </span>
              </div>
              <h1 className="hp-hero-title">
                What are you
                <br />
                <em>craving today?</em>
              </h1>
              <p className="hp-hero-sub">
                Over 100+ handcrafted flavours waiting to be scooped — delivered
                cold, delivered fast.
              </p>
              <button
                className="hp-hero-cta"
                onClick={() => searchRef.current?.focus()}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                Search a flavour
              </button>
            </div>
            <div className="hp-hero-right">
              <div className="hp-hero-visual">
                <div className="hp-hero-ring hp-hero-ring-1" />
                <div className="hp-hero-ring hp-hero-ring-2" />
                <span className="hp-hero-emoji">🍨</span>
                <div className="hp-hero-chip hp-hero-chip-1">
                  ⭐ 4.9 avg rating
                </div>
                <div className="hp-hero-chip hp-hero-chip-2">
                  🚀 45 min delivery
                </div>
              </div>
            </div>
          </div>

          {/* Promo chips */}
          <div className="hp-hero-promos">
            {[
              "🍦 Fresh Daily",
              "❄️ Always Cold",
              "🌿 Natural Only",
              "🎉 New Flavours Weekly",
            ].map((p, i) => (
              <span key={i} className="hp-hero-promo-chip">
                {p}
              </span>
            ))}
          </div>
        </section>

        {/* ════════ CATEGORIES ════════ */}
        <section className="hp-section">
          <div className="hp-section-head hp-reveal">
            <div>
              <h2 className="hp-section-title">Browse by Category</h2>
              <p className="hp-section-sub">Find your flavour family</p>
            </div>
          </div>

          {catLoading ? (
            <div className="hp-skeleton-row">
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="hp-skeleton hp-skeleton-cat" />
                ))}
            </div>
          ) : (
            <div className="hp-cats-scroll">
              <button
                className={`hp-cat-pill${activeCategory === "all" ? " hp-cat-pill--active" : ""}`}
                onClick={() => setActiveCategory("all")}
              >
                <span className="hp-cat-pill-icon">🍨</span>
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat._id}
                  className={`hp-cat-pill${activeCategory === cat._id ? " hp-cat-pill--active" : ""}`}
                  onClick={() => setActiveCategory(cat._id)}
                >
                  {cat.imageUrl ? (
                    <img
                      src={imgSrc(cat.imageUrl)}
                      alt={cat.name}
                      className="hp-cat-pill-img"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="hp-cat-pill-icon">🍦</span>
                  )}
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ════════ ICE CREAM GRID ════════ */}
        <section className="hp-section hp-section--products">
          <div className="hp-section-head hp-reveal">
            <div>
              <h2 className="hp-section-title">
                {debouncedSearch
                  ? `Results for "${debouncedSearch}"`
                  : "Our Flavours"}
              </h2>
              <p className="hp-section-sub">
                {icLoading
                  ? "Finding the best scoops..."
                  : `${iceCreams.length} flavours available`}
              </p>
            </div>

            <div className="hp-sort-wrap">
              <label className="hp-sort-label">Sort</label>
              <select
                className="hp-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="-averageRating">Top Rated</option>
                <option value="-createdAt">Newest</option>
                <option value="variants.basePrice">Price: Low</option>
                <option value="-variants.basePrice">Price: High</option>
              </select>
            </div>
          </div>

          {icLoading && page === 1 ? (
            <div className="hp-products-grid">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="hp-product-skeleton">
                    <div className="hp-skeleton hp-skeleton-img" />
                    <div className="hp-skeleton hp-skeleton-title" />
                    <div className="hp-skeleton hp-skeleton-sub" />
                    <div className="hp-skeleton hp-skeleton-price" />
                  </div>
                ))}
            </div>
          ) : displayedIceCreams.length === 0 ? (
            <div className="hp-empty">
              <span className="hp-empty-icon">🍦</span>
              <p className="hp-empty-title">No flavours found</p>
              <p className="hp-empty-sub">Try a different search or category</p>
              <button
                className="hp-empty-reset"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="hp-products-grid">
                {displayedIceCreams.map((ic, i) => {
                  const minPrice = getMinPrice(ic.variants);
                  const isAdding = addingId === ic._id;
                  const isAdded = addedId === ic._id;
                  const unavailable = !ic.variants?.some((v) => v.isAvailable);

                  return (
                    <div
                      key={ic._id}
                      className={`hp-product-card hp-reveal${unavailable ? " hp-product-card--unavailable" : ""}`}
                      style={{ animationDelay: `${(i % 12) * 0.05}s` }}
                    >
                      <Link
                        to={`/ice-cream/${ic._id}`}
                        className="hp-product-img-wrap"
                      >
                        {imgSrc(ic.imageUrl) ? (
                          <img
                            src={imgSrc(ic.imageUrl)}
                            alt={ic.name}
                            className="hp-product-img"
                            loading="lazy"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="hp-product-placeholder"
                          style={{
                            display: imgSrc(ic.imageUrl) ? "none" : "flex",
                          }}
                        >
                          🍦
                        </div>
                        {unavailable && (
                          <div className="hp-product-unavail-badge">
                            Out of Stock
                          </div>
                        )}
                        {!unavailable && i < 3 && (
                          <div className="hp-product-top-badge">
                            {i === 0 ? "🥇 #1" : i === 1 ? "🥈 #2" : "🥉 #3"}
                          </div>
                        )}
                      </Link>

                      <div className="hp-product-body">
                        {ic.flavourId?.name && (
                          <span className="hp-product-flavour-tag">
                            {ic.flavourId.name}
                          </span>
                        )}
                        <Link
                          to={`/ice-cream/${ic._id}`}
                          className="hp-product-name"
                        >
                          {ic.name}
                        </Link>

                        {ic.averageRating > 0 && (
                          <div className="hp-product-rating">
                            <StarRating rating={ic.averageRating} />
                            <span className="hp-product-rating-num">
                              {ic.averageRating.toFixed(1)}
                              {ic.totalReviews > 0 && (
                                <span className="hp-product-reviews">
                                  {" "}
                                  ({ic.totalReviews})
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {ic.variants?.length > 0 && (
                          <div className="hp-product-sizes">
                            {ic.variants
                              .filter((v) => v.isAvailable)
                              .slice(0, 4)
                              .map((v) => (
                                <span key={v._id} className="hp-product-size">
                                  {v.size}
                                </span>
                              ))}
                          </div>
                        )}

                        <div className="hp-product-foot">
                          <div className="hp-product-price">
                            {minPrice != null ? (
                              <>
                                <span className="hp-product-price-currency">
                                  ₹
                                </span>
                                <span className="hp-product-price-amount">
                                  {minPrice}
                                </span>
                                <span className="hp-product-price-label">
                                  onwards
                                </span>
                              </>
                            ) : (
                              <span className="hp-product-price-na">—</span>
                            )}
                          </div>

                          <button
                            className={`hp-product-add${isAdded ? " hp-product-add--added" : ""}${isAdding ? " hp-product-add--loading" : ""}`}
                            onClick={() => handleQuickAdd(ic)}
                            disabled={isAdding || unavailable}
                            title={
                              unavailable ? "Out of stock" : "Quick add to cart"
                            }
                          >
                            {isAdding ? (
                              <span className="hp-add-spinner" />
                            ) : isAdded ? (
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
                            ) : (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              >
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <line x1="5" y1="12" x2="19" y2="12" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {page < totalPages && (
                <div className="hp-load-more-wrap">
                  <button
                    className="hp-load-more"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <span className="hp-add-spinner" /> Loading more...
                      </>
                    ) : (
                      "Load More Flavours 🍦"
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ════════ QUICK LINKS ════════ */}
        <section className="hp-section hp-quick-section hp-reveal">
          <div className="hp-quick-grid">
            <Link to="/orders" className="hp-quick-card hp-quick-card--orders">
              <span className="hp-quick-icon">📦</span>
              <div className="hp-quick-text">
                <strong>My Orders</strong>
                <span>Track & reorder</span>
              </div>
              <svg
                className="hp-quick-arrow"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              to="/customer/addresses"
              className="hp-quick-card hp-quick-card--address"
            >
              <span className="hp-quick-icon">📍</span>
              <div className="hp-quick-text">
                <strong>Saved Addresses</strong>
                <span>Manage delivery spots</span>
              </div>
              <svg
                className="hp-quick-arrow"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            <Link to="/cart" className="hp-quick-card hp-quick-card--cart">
              <span className="hp-quick-icon">🛒</span>
              <div className="hp-quick-text">
                <strong>My Cart</strong>
                <span>
                  {cartCount > 0
                    ? `${cartCount} item${cartCount > 1 ? "s" : ""} waiting`
                    : "Empty — let's fix that"}
                </span>
              </div>
              <svg
                className="hp-quick-arrow"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              to="/customer/profile"
              className="hp-quick-card hp-quick-card--profile"
            >
              <span className="hp-quick-icon">👤</span>
              <div className="hp-quick-text">
                <strong>My Profile</strong>
                <span>Account settings</span>
              </div>
              <svg
                className="hp-quick-arrow"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      </div>

      {/* ════════ FOOTER ════════ */}
      <footer className="hp-footer">
        <div className="hp-footer-inner">
          <a href="#top" className="hp-footer-logo">
            <span>🍦</span> FrozenDelights
          </a>
          <p className="hp-footer-copy">
            © {new Date().getFullYear()} FrozenDelights · Made with ♥ for ice
            cream lovers
          </p>
          <div className="hp-footer-links">
            <a href="#top">Home</a>
            <Link to="/orders">Orders</Link>
            <Link to="/cart">Cart</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
