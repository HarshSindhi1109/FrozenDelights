import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import "./LandingPage.css";

/* ─── helpers ─────────────────────────────────── */
const BASE_URL = import.meta.env.VITE_API_URL;

const imgSrc = (url) => (url ? `${BASE_URL}/${url.replace(/\\/g, "/")}` : null);

const StarRating = ({ rating = 0 }) => {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="fd-review-stars">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i}>{i < full ? "⭐" : i === full && half ? "✨" : "☆"}</span>
      ))}
    </div>
  );
};

const MARQUEE_ITEMS = [
  "🍦 Fresh Daily",
  "🍧 100+ Flavours",
  "🚀 Fast Delivery",
  "🍨 Premium Quality",
  "🎉 Family Loved",
  "🍡 Natural Ingredients",
  "🏆 Award Winning",
  "❄️ Always Chilled",
];

const WHY_US = [
  {
    icon: "🌿",
    title: "Natural Ingredients",
    desc: "Every scoop is crafted from the finest natural ingredients — no artificial colours, no shortcuts.",
  },
  {
    icon: "🚀",
    title: "Lightning Delivery",
    desc: "From our freezer to your door in under 45 minutes. Ice cream that arrives still perfectly frozen.",
  },
  {
    icon: "🎨",
    title: "100+ Flavours",
    desc: "Classic, seasonal, exotic — there's always a new flavour waiting to become your new obsession.",
  },
  {
    icon: "💝",
    title: "Made with Love",
    desc: "Every tub is hand-packed and quality-checked because we believe dessert deserves extra care.",
  },
];

/* ─── Scroll Reveal Hook ──────────────────────── */
const useScrollReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) =>
          e.target.classList.toggle("visible", e.isIntersecting),
        ),
      { threshold: 0.12 },
    );
    document
      .querySelectorAll(".fd-reveal")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
};

/* ─── Sprinkles config ────────────────────────── */
const SPRINKLES = [
  { w: 6, h: 22, bg: "#f06292", top: "18%", left: "4%", dur: "7s", rot: 0 },
  { w: 5, h: 18, bg: "#ffe082", top: "30%", right: "3%", dur: "9s", rot: 45 },
  { w: 6, h: 20, bg: "#80deea", top: "55%", left: "2%", dur: "6s", rot: 120 },
  { w: 5, h: 16, bg: "#ce93d8", top: "70%", right: "5%", dur: "8s", rot: 70 },
  { w: 6, h: 24, bg: "#a5d6a7", top: "80%", left: "8%", dur: "11s", rot: 200 },
  {
    w: 5,
    h: 18,
    bg: "#ffab91",
    top: "12%",
    right: "10%",
    dur: "7.5s",
    rot: 160,
  },
];

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const LandingPage = () => {
  const [categories, setCategories] = useState([]);
  const [iceCreams, setIceCreams] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [catLoading, setCatLoading] = useState(true);
  const [icLoading, setIcLoading] = useState(true);
  const [revLoading, setRevLoading] = useState(true);

  const [contact, setContact] = useState({
    username: "",
    email: "",
    phone: "",
    message: "",
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState("");
  const [contactSuccess, setContactSuccess] = useState("");

  useScrollReveal();

  /* ── Fetch categories ── */
  useEffect(() => {
    api
      .get("/categories?limit=8")
      .then((r) => setCategories(r.data.data || []))
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false));
  }, []);

  /* ── Fetch featured ice creams ── */
  useEffect(() => {
    api
      .get("/ice-creams?limit=8&sort=-averageRating")
      .then((r) => setIceCreams(r.data.data || []))
      .catch(() => setIceCreams([]))
      .finally(() => setIcLoading(false));
  }, []);

  /* ── Fetch reviews (from a popular item if available) ── */
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const icRes = await api.get("/ice-creams?limit=1&sort=-averageRating");
        const items = icRes.data.data || [];
        if (items.length) {
          const revRes = await api.get(`/reviews/${items[0]._id}?limit=6`);
          setReviews((revRes.data.data || []).slice(0, 6));
        }
      } catch {
        setReviews([]);
      } finally {
        setRevLoading(false);
      }
    };
    fetchReviews();
  }, []);

  /* ── Contact submit ── */
  const handleContactChange = (e) =>
    setContact((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setContactError("");
    setContactSuccess("");
    setContactLoading(true);
    try {
      await api.post("/contacts", contact);
      setContactSuccess("🎉 Message sent! We'll get back to you soon.");
      setContact({ username: "", email: "", phone: "", message: "" });
    } catch (err) {
      setContactError(
        err.response?.data?.message ||
          "Failed to send message. Please try again.",
      );
    } finally {
      setContactLoading(false);
    }
  };

  /* ── Helpers ── */
  const getMinPrice = (variants = []) => {
    const prices = variants
      .filter((v) => v.isAvailable)
      .map((v) => v.basePrice);
    return prices.length ? Math.min(...prices) : null;
  };

  return (
    <div className="fd-landing">
      {/* ════════ NAVBAR ════════ */}
      <nav className="fd-nav">
        <a href="#hero" className="fd-nav-logo">
          <span className="fd-nav-logo-icon">🍦</span>
          <span className="fd-nav-logo-text">FrozenDelights</span>
        </a>

        <ul className="fd-nav-links">
          <li>
            <a href="#categories">Categories</a>
          </li>
          <li>
            <a href="#flavours">Flavours</a>
          </li>
          <li>
            <a href="#why-us">Why Us</a>
          </li>
          <li>
            <a href="#reviews">Reviews</a>
          </li>
          <li>
            <a href="#contact">Contact</a>
          </li>
        </ul>

        <div className="fd-nav-actions">
          <a href="#flavours" className="fd-nav-cart-btn">
            🛒 Order Now
          </a>
          <Link to="/login" className="fd-nav-btn fd-nav-btn-outline">
            Login
          </Link>
          <Link to="/register" className="fd-nav-btn fd-nav-btn-fill">
            Sign Up 🎉
          </Link>
        </div>
      </nav>

      {/* ════════ HERO ════════ */}
      <section id="hero" className="fd-hero">
        {/* blobs */}
        <div className="fd-hero-blob fd-hero-blob-1" />
        <div className="fd-hero-blob fd-hero-blob-2" />
        <div className="fd-hero-blob fd-hero-blob-3" />

        {/* sprinkles */}
        {SPRINKLES.map((s, i) => (
          <div
            key={i}
            className="fd-hero-sprinkle"
            style={{
              width: s.w,
              height: s.h,
              background: s.bg,
              top: s.top,
              left: s.left,
              right: s.right,
              animationDuration: s.dur,
              transform: `rotate(${s.rot}deg)`,
            }}
          />
        ))}

        <div className="fd-hero-inner">
          {/* left */}
          <div className="fd-hero-content">
            <div className="fd-hero-badge">
              <div className="fd-hero-badge-dot" />
              Now delivering in your city!
            </div>

            <h1 className="fd-hero-title">
              Life is Sweet,
              <span>Scoop it Up!</span>
            </h1>

            <p className="fd-hero-subtitle">
              Handcrafted ice creams made from the freshest ingredients. Over
              100+ flavours, fast delivery, and smiles guaranteed — every single
              scoop.
            </p>

            <div className="fd-hero-actions">
              <a href="#flavours" className="fd-btn-primary">
                🍨 Explore Flavours
              </a>
              <a href="#why-us" className="fd-btn-secondary">
                ✨ Why We're Different
              </a>
            </div>

            <div className="fd-hero-stats">
              <div className="fd-hero-stat">
                <span className="fd-hero-stat-num">100+</span>
                <span className="fd-hero-stat-label">Flavours</span>
              </div>
              <div className="fd-hero-stat-divider" />
              <div className="fd-hero-stat">
                <span className="fd-hero-stat-num">50k+</span>
                <span className="fd-hero-stat-label">Happy Scoops</span>
              </div>
              <div className="fd-hero-stat-divider" />
              <div className="fd-hero-stat">
                <span className="fd-hero-stat-num">45min</span>
                <span className="fd-hero-stat-label">Avg. Delivery</span>
              </div>
            </div>
          </div>

          {/* right visual */}
          <div className="fd-hero-visual">
            <div className="fd-hero-cone-wrap">
              <div className="fd-hero-cone-ring fd-hero-cone-ring-1" />
              <div className="fd-hero-cone-ring fd-hero-cone-ring-2" />
              <span className="fd-hero-cone-emoji">🍦</span>

              <div className="fd-hero-float-tag fd-hero-float-tag-1">
                ⭐ 4.9 Rating
              </div>
              <div className="fd-hero-float-tag fd-hero-float-tag-2">
                🚀 Fast Delivery
              </div>
              <div className="fd-hero-float-tag fd-hero-float-tag-3">
                🌿 100% Natural
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════ MARQUEE ════════ */}
      <div className="fd-marquee-strip">
        <div className="fd-marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <div key={i} className="fd-marquee-item">
              {item}
              <div className="fd-marquee-dot" />
            </div>
          ))}
        </div>
      </div>

      {/* ════════ CATEGORIES ════════ */}
      <div className="fd-categories-bg">
        <section id="categories" className="fd-section">
          <div className="fd-section-header fd-reveal">
            <span className="fd-section-label">Browse by Category</span>
            <h2 className="fd-section-title">Find Your Favourite 🍧</h2>
            <p className="fd-section-subtitle">
              From classic scoops to exotic seasonal surprises — there's
              something for every craving.
            </p>
          </div>

          {catLoading ? (
            <div className="fd-loading-wrap">
              <div className="fd-spinner" />
              <p className="fd-loading-text">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="fd-empty-state">
              <span className="fd-empty-icon">🍦</span>
              <p className="fd-empty-text">No categories found yet!</p>
            </div>
          ) : (
            <div className="fd-categories-grid">
              {categories.map((cat, i) => (
                <a
                  key={cat._id}
                  href="#flavours"
                  className="fd-cat-card fd-reveal"
                  style={{ transitionDelay: `${i * 0.06}s` }}
                >
                  <div className="fd-cat-img-wrap">
                    {imgSrc(cat.imageUrl) ? (
                      <img
                        src={imgSrc(cat.imageUrl)}
                        alt={cat.name}
                        className="fd-cat-img"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.parentNode.querySelector(
                            ".fd-cat-placeholder",
                          ).style.display = "flex";
                        }}
                      />
                    ) : null}
                    <div
                      className="fd-cat-placeholder"
                      style={{
                        display: imgSrc(cat.imageUrl) ? "none" : "flex",
                      }}
                    >
                      🍨
                    </div>
                  </div>
                  <div className="fd-cat-name">{cat.name}</div>
                  {cat.description && (
                    <div className="fd-cat-desc">{cat.description}</div>
                  )}
                </a>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ════════ FEATURED ICE CREAMS ════════ */}
      <div className="fd-products-bg">
        <section id="flavours" className="fd-section">
          <div className="fd-section-header fd-reveal">
            <span className="fd-section-label">Top Picks</span>
            <h2 className="fd-section-title">Fan Favourite Flavours 🏆</h2>
            <p className="fd-section-subtitle">
              Our highest-rated, most-loved ice creams — picked by thousands of
              happy customers.
            </p>
          </div>

          {icLoading ? (
            <div className="fd-loading-wrap">
              <div className="fd-spinner" />
              <p className="fd-loading-text">Scooping the best flavours...</p>
            </div>
          ) : iceCreams.length === 0 ? (
            <div className="fd-empty-state">
              <span className="fd-empty-icon">🍦</span>
              <p className="fd-empty-text">
                No ice creams listed yet — check back soon!
              </p>
            </div>
          ) : (
            <div className="fd-products-grid">
              {iceCreams.map((ic, i) => {
                const minPrice = getMinPrice(ic.variants);
                return (
                  <div
                    key={ic._id}
                    className="fd-product-card fd-reveal"
                    style={{ transitionDelay: `${i * 0.07}s` }}
                  >
                    <div className="fd-product-img-wrap">
                      {imgSrc(ic.imageUrl) ? (
                        <img
                          src={imgSrc(ic.imageUrl)}
                          alt={ic.name}
                          className="fd-product-img"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentNode.querySelector(
                              ".fd-product-placeholder",
                            ).style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="fd-product-placeholder"
                        style={{
                          display: imgSrc(ic.imageUrl) ? "none" : "flex",
                        }}
                      >
                        🍦
                      </div>

                      {i < 3 && (
                        <div className="fd-product-badge">
                          {i === 0
                            ? "🥇 #1 Bestseller"
                            : i === 1
                              ? "🥈 Top Pick"
                              : "🥉 Fan Fave"}
                        </div>
                      )}

                      {ic.averageRating > 0 && (
                        <div className="fd-product-rating-badge">
                          ⭐ {ic.averageRating.toFixed(1)}
                        </div>
                      )}
                    </div>

                    <div className="fd-product-body">
                      {ic.flavourId?.name && (
                        <div className="fd-product-flavour">
                          {ic.flavourId.name}
                        </div>
                      )}
                      <div className="fd-product-name">{ic.name}</div>

                      {ic.variants?.length > 0 && (
                        <div className="fd-product-variants">
                          {ic.variants
                            .filter((v) => v.isAvailable)
                            .slice(0, 3)
                            .map((v) => (
                              <span key={v._id} className="fd-product-variant">
                                {v.size}
                              </span>
                            ))}
                        </div>
                      )}

                      <div className="fd-product-footer">
                        <div className="fd-product-price">
                          {minPrice != null ? (
                            <>
                              ₹{minPrice}
                              <span>onwards</span>
                            </>
                          ) : (
                            <span
                              style={{ fontSize: "0.85rem", color: "#bdbdbd" }}
                            >
                              Coming soon
                            </span>
                          )}
                        </div>
                        <Link
                          to="/register"
                          className="fd-product-add-btn"
                          title="Order Now"
                        >
                          +
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ════════ WHY US ════════ */}
      <div className="fd-why-bg" id="why-us">
        <div className="fd-why-inner">
          <div className="fd-section-header fd-reveal">
            <span className="fd-section-label">Why FrozenDelights</span>
            <h2 className="fd-section-title">More Than Just Ice Cream 💝</h2>
            <p className="fd-section-subtitle">
              We're obsessed with quality, speed, and making every single
              customer smile.
            </p>
          </div>

          <div className="fd-why-grid">
            {WHY_US.map((w, i) => (
              <div
                key={i}
                className="fd-why-card fd-reveal"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <span className="fd-why-icon">{w.icon}</span>
                <div className="fd-why-title">{w.title}</div>
                <div className="fd-why-desc">{w.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════════ REVIEWS ════════ */}
      <div className="fd-reviews-bg">
        <section id="reviews" className="fd-section">
          <div className="fd-section-header fd-reveal">
            <span className="fd-section-label">Customer Love</span>
            <h2 className="fd-section-title">What Our Scoopers Say 💬</h2>
            <p className="fd-section-subtitle">
              Real reviews from real customers who can't stop coming back for
              more.
            </p>
          </div>

          {revLoading ? (
            <div className="fd-loading-wrap">
              <div className="fd-spinner" />
              <p className="fd-loading-text">Loading reviews...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="fd-empty-state">
              <span className="fd-empty-icon">💬</span>
              <p className="fd-empty-text">
                No reviews yet — be the first to scoop and share!
              </p>
            </div>
          ) : (
            <div className="fd-reviews-grid">
              {reviews.map((rev, i) => (
                <div
                  key={rev._id}
                  className="fd-review-card fd-reveal"
                  style={{ transitionDelay: `${i * 0.08}s` }}
                >
                  <div className="fd-review-quote">"</div>
                  <StarRating rating={rev.rating} />
                  <p className="fd-review-text">
                    {rev.description || "Absolutely loved it!"}
                  </p>

                  <div className="fd-review-footer">
                    <div className="fd-review-avatar">
                      {rev.userId?.profilePicUrl ? (
                        <img
                          src={imgSrc(rev.userId.profilePicUrl)}
                          alt={rev.userId.name}
                        />
                      ) : (
                        (rev.userId?.name?.[0] || "U").toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="fd-review-author">
                        {rev.userId?.name || "Happy Customer"}
                      </div>
                      <div className="fd-review-item">Verified Purchase 🛒</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ════════ CONTACT ════════ */}
      <div className="fd-contact-bg" id="contact">
        <div className="fd-contact-inner">
          {/* left info */}
          <div className="fd-contact-info">
            <div
              className="fd-section-header"
              style={{ textAlign: "left", marginBottom: 36 }}
            >
              <span className="fd-section-label">Get in Touch</span>
              <h2 className="fd-section-title">
                We'd Love to Hear from You 🍦
              </h2>
              <p className="fd-section-subtitle" style={{ margin: 0 }}>
                Questions, special orders, or just want to say hi? Drop us a
                message and we'll get back to you faster than our ice cream
                melts!
              </p>
            </div>

            <div className="fd-contact-icon-row">
              <div className="fd-contact-icon-box">📍</div>
              <div>
                <div className="fd-contact-icon-label">Visit Us</div>
                <div className="fd-contact-icon-value">
                  123 Sweet Street, Ice Cream Lane, Mumbai
                </div>
              </div>
            </div>

            <div className="fd-contact-icon-row">
              <div className="fd-contact-icon-box">📞</div>
              <div>
                <div className="fd-contact-icon-label">Call Us</div>
                <div className="fd-contact-icon-value">+91 98765 43210</div>
              </div>
            </div>

            <div className="fd-contact-icon-row">
              <div className="fd-contact-icon-box">✉️</div>
              <div>
                <div className="fd-contact-icon-label">Email Us</div>
                <div className="fd-contact-icon-value">
                  hello@frozendelights.in
                </div>
              </div>
            </div>

            <div className="fd-contact-icon-row">
              <div className="fd-contact-icon-box">🕐</div>
              <div>
                <div className="fd-contact-icon-label">Opening Hours</div>
                <div className="fd-contact-icon-value">
                  Mon–Sun: 10:00 AM – 11:00 PM
                </div>
              </div>
            </div>
          </div>

          {/* right form */}
          <div className="fd-contact-form fd-reveal">
            <div
              className="fd-section-header"
              style={{ textAlign: "left", marginBottom: 24 }}
            >
              <h3
                style={{
                  fontFamily: "'Pacifico', cursive",
                  fontSize: "1.4rem",
                  color: "var(--text-dark)",
                }}
              >
                Send a Message 🍪
              </h3>
            </div>

            <form onSubmit={handleContactSubmit}>
              <div className="fd-form-row">
                <div className="fd-form-group">
                  <label className="fd-form-label" htmlFor="c-name">
                    Your Name
                  </label>
                  <input
                    id="c-name"
                    className="fd-form-input"
                    type="text"
                    name="username"
                    placeholder="Jane Doe"
                    value={contact.username}
                    onChange={handleContactChange}
                    required
                  />
                </div>
                <div className="fd-form-group">
                  <label className="fd-form-label" htmlFor="c-phone">
                    Phone
                  </label>
                  <input
                    id="c-phone"
                    className="fd-form-input"
                    type="tel"
                    name="phone"
                    placeholder="+91 98765 43210"
                    value={contact.phone}
                    onChange={handleContactChange}
                    required
                  />
                </div>
              </div>

              <div className="fd-form-group">
                <label className="fd-form-label" htmlFor="c-email">
                  Email
                </label>
                <input
                  id="c-email"
                  className="fd-form-input"
                  type="email"
                  name="email"
                  placeholder="you@example.com"
                  value={contact.email}
                  onChange={handleContactChange}
                  required
                />
              </div>

              <div className="fd-form-group">
                <label className="fd-form-label" htmlFor="c-msg">
                  Message
                </label>
                <textarea
                  id="c-msg"
                  className="fd-form-textarea"
                  name="message"
                  placeholder="Tell us what's on your mind... or just tell us your favourite flavour! 🍦"
                  value={contact.message}
                  onChange={handleContactChange}
                  required
                />
              </div>

              {contactError && (
                <div className="fd-form-error">❌ {contactError}</div>
              )}
              {contactSuccess && (
                <div className="fd-form-success">{contactSuccess}</div>
              )}

              <button
                type="submit"
                className="fd-form-submit"
                disabled={contactLoading}
              >
                {contactLoading
                  ? "Sending your scoop... 🍨"
                  : "Send Message 🚀"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ════════ FOOTER ════════ */}
      <footer className="fd-footer">
        <div className="fd-footer-inner">
          <div className="fd-footer-top">
            {/* brand */}
            <div>
              <a href="#hero" className="fd-footer-brand-logo">
                <span style={{ fontSize: 24 }}>🍦</span>
                <span className="fd-footer-brand-logo-text">
                  FrozenDelights
                </span>
              </a>
              <p className="fd-footer-brand-desc">
                Handcrafted ice creams made with love and the finest natural
                ingredients. Bringing smiles, one scoop at a time.
              </p>
              <div className="fd-footer-social">
                {["📘", "📸", "🐦", "▶️"].map((icon, i) => (
                  <a key={i} href="#" className="fd-footer-social-btn">
                    {icon}
                  </a>
                ))}
              </div>
            </div>

            {/* explore */}
            <div>
              <div className="fd-footer-col-title">Explore</div>
              <ul className="fd-footer-links">
                <li>
                  <a href="#categories">Categories</a>
                </li>
                <li>
                  <a href="#flavours">Flavours</a>
                </li>
                <li>
                  <a href="#why-us">Why Us</a>
                </li>
                <li>
                  <a href="#reviews">Reviews</a>
                </li>
              </ul>
            </div>

            {/* account */}
            <div>
              <div className="fd-footer-col-title">Account</div>
              <ul className="fd-footer-links">
                <li>
                  <Link to="/login">Login</Link>
                </li>
                <li>
                  <Link to="/register">Register</Link>
                </li>
                <li>
                  <a href="#contact">My Orders</a>
                </li>
                <li>
                  <a href="#contact">Track Order</a>
                </li>
              </ul>
            </div>

            {/* support */}
            <div>
              <div className="fd-footer-col-title">Support</div>
              <ul className="fd-footer-links">
                <li>
                  <a href="#contact">Contact Us</a>
                </li>
                <li>
                  <a href="#contact">FAQs</a>
                </li>
                <li>
                  <a href="#contact">Delivery Info</a>
                </li>
                <li>
                  <a href="#contact">Return Policy</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="fd-footer-bottom">
            <p className="fd-footer-copy">
              © {new Date().getFullYear()} FrozenDelights. All rights reserved.
            </p>
            <p className="fd-footer-made">
              Made with <span>♥</span> for ice cream lovers everywhere 🍦
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
