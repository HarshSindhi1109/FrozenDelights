import { useState, useEffect, useCallback } from "react";
import AdminLayout from "./AdminLayout";
import api from "../../services/api";
import "./Admin.css";

const BASE_URL = import.meta.env.VITE_IMG_URL;
const imgSrc = (url) => (url ? `${BASE_URL}/${url.replace(/\\/g, "/")}` : null);
// eslint-disable-next-line no-unused-vars
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
const fmtINR = (n) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

/* ── Create Modal ── */
const CreateModal = ({ flavours, onClose, onSaved }) => {
  const [form, setForm] = useState({ name: "", flavourId: "", isActive: true });
  const [variants, setVariants] = useState([
    { size: "", basePrice: "", costPrice: "", stock: "", isAvailable: true },
  ]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addVariant = () =>
    setVariants((v) => [
      ...v,
      { size: "", basePrice: "", costPrice: "", stock: "", isAvailable: true },
    ]);
  const removeVariant = (i) =>
    setVariants((v) => v.filter((_, idx) => idx !== i));
  const updateVariant = (i, key, val) =>
    setVariants((v) =>
      v.map((item, idx) => (idx === i ? { ...item, [key]: val } : item)),
    );

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.flavourId) {
      setError("Name and flavour are required.");
      return;
    }
    if (!image) {
      setError("Image is required.");
      return;
    }
    if (variants.some((v) => !v.size.trim() || !v.basePrice || !v.costPrice)) {
      setError("All variant fields are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("flavourId", form.flavourId);
      fd.append("isActive", form.isActive);
      fd.append(
        "variants",
        JSON.stringify(
          variants.map((v) => ({
            size: v.size.trim(),
            basePrice: Number(v.basePrice),
            costPrice: Number(v.costPrice),
            stock: Number(v.stock) || 0,
            isAvailable: v.isAvailable,
          })),
        ),
      );
      fd.append("iceCreamImage", image);
      await api.post("/ice-creams", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      <div
        className="ap-modal"
        style={{ maxWidth: 600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ap-modal-strip" />
        <div
          className="ap-modal-inner"
          style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
          <div className="ap-modal-title">Create Ice Cream</div>
          <div className="ap-modal-sub">Add a new product to the catalog</div>
          {error && <div className="ap-error-box">{error}</div>}

          <div className="ap-grid-2">
            <div className="ap-field">
              <label className="ap-label">Name</label>
              <input
                className="ap-input"
                placeholder="e.g. Mango Delight Cup"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="ap-field">
              <label className="ap-label">Flavour</label>
              <select
                className="ap-input"
                value={form.flavourId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, flavourId: e.target.value }))
                }
              >
                <option value="">Select flavour…</option>
                {flavours.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ap-field">
            <label className="ap-label">Ice Cream Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              style={{ color: "var(--a-text2)", fontSize: "0.83rem" }}
            />
            {preview && (
              <img
                src={preview}
                alt=""
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 10,
                  marginTop: 8,
                  border: "1px solid var(--a-border)",
                }}
              />
            )}
          </div>

          <div className="ap-divider" />
          <div
            style={{
              fontFamily: "var(--ff-mono)",
              fontSize: "0.62rem",
              color: "var(--a-text3)",
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            // VARIANTS
          </div>

          {variants.map((v, i) => (
            <div
              key={i}
              style={{
                background: "rgba(99,102,241,0.04)",
                border: "1px solid var(--a-border2)",
                borderRadius: 10,
                padding: "14px",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--ff-mono)",
                    fontSize: "0.62rem",
                    color: "var(--a-indigo)",
                    letterSpacing: 1,
                  }}
                >
                  VARIANT {i + 1}
                </span>
                {variants.length > 1 && (
                  <button
                    className="ap-btn ap-btn--danger ap-btn--sm"
                    onClick={() => removeVariant(i)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <div className="ap-field" style={{ marginBottom: 0 }}>
                  <label className="ap-label">Size</label>
                  <input
                    className="ap-input"
                    placeholder="Small"
                    value={v.size}
                    onChange={(e) => updateVariant(i, "size", e.target.value)}
                  />
                </div>
                <div className="ap-field" style={{ marginBottom: 0 }}>
                  <label className="ap-label">Price (₹)</label>
                  <input
                    className="ap-input"
                    type="number"
                    placeholder="99"
                    value={v.basePrice}
                    onChange={(e) =>
                      updateVariant(i, "basePrice", e.target.value)
                    }
                  />
                </div>
                <div className="ap-field" style={{ marginBottom: 0 }}>
                  <label className="ap-label">Cost (₹)</label>
                  <input
                    className="ap-input"
                    type="number"
                    placeholder="40"
                    value={v.costPrice}
                    onChange={(e) =>
                      updateVariant(i, "costPrice", e.target.value)
                    }
                  />
                </div>
                <div className="ap-field" style={{ marginBottom: 0 }}>
                  <label className="ap-label">Stock</label>
                  <input
                    className="ap-input"
                    type="number"
                    placeholder="100"
                    value={v.stock}
                    onChange={(e) => updateVariant(i, "stock", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            className="ap-btn ap-btn--ghost ap-btn--sm"
            onClick={addVariant}
            style={{ marginBottom: 16 }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Variant
          </button>
        </div>
        <div className="ap-modal-footer">
          <button
            className="ap-btn ap-btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="ap-btn ap-btn--primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="ap-spin" /> Creating…
              </>
            ) : (
              "Create"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Edit Modal ── */
const EditModal = ({ iceCream, flavours, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: iceCream.name,
    flavourId: iceCream.flavourId?._id || iceCream.flavourId,
    isActive: iceCream.isActive,
  });
  const [variants, setVariants] = useState(
    iceCream.variants.map((v) => ({ ...v })),
  );
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(imgSrc(iceCream.imageUrl));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImage(f);
    setPreview(URL.createObjectURL(f));
  };

  const updateVariant = (i, key, val) =>
    setVariants((v) =>
      v.map((item, idx) => (idx === i ? { ...item, [key]: val } : item)),
    );

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("flavourId", form.flavourId);
      fd.append("isActive", form.isActive);
      fd.append(
        "variants",
        JSON.stringify(
          variants.map((v) => ({
            _id: v._id,
            size: v.size,
            basePrice: Number(v.basePrice),
            costPrice: Number(v.costPrice),
            stock: Number(v.stock),
            isAvailable: v.isAvailable,
          })),
        ),
      );
      if (image) fd.append("iceCreamImage", image);
      await api.patch(`/ice-creams/${iceCream._id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      <div
        className="ap-modal"
        style={{ maxWidth: 600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ap-modal-strip" />
        <div
          className="ap-modal-inner"
          style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
          <div className="ap-modal-title">Edit Ice Cream</div>
          <div className="ap-modal-sub">Updating "{iceCream.name}"</div>
          {error && <div className="ap-error-box">{error}</div>}

          <div className="ap-grid-2">
            <div className="ap-field">
              <label className="ap-label">Name</label>
              <input
                className="ap-input"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>
            <div className="ap-field">
              <label className="ap-label">Flavour</label>
              <select
                className="ap-input"
                value={form.flavourId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, flavourId: e.target.value }))
                }
              >
                {flavours.map((f) => (
                  <option key={f._id} value={f._id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ap-field">
            <label className="ap-label">
              Image (leave empty to keep existing)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFile}
              style={{ color: "var(--a-text2)", fontSize: "0.83rem" }}
            />
            {preview && (
              <img
                src={preview}
                alt=""
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 10,
                  marginTop: 8,
                  border: "1px solid var(--a-border)",
                }}
              />
            )}
          </div>

          <div
            className="ap-field"
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <label className="ap-toggle">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              <span className="ap-toggle-slider" />
            </label>
            <label className="ap-label" style={{ marginBottom: 0 }}>
              Active
            </label>
          </div>

          <div className="ap-divider" />
          <div
            style={{
              fontFamily: "var(--ff-mono)",
              fontSize: "0.62rem",
              color: "var(--a-text3)",
              letterSpacing: 1,
              marginBottom: 12,
            }}
          >
            // VARIANTS
          </div>

          {variants.map((v, i) => (
            <div
              key={v._id || i}
              style={{
                background: "rgba(99,102,241,0.04)",
                border: "1px solid var(--a-border2)",
                borderRadius: 10,
                padding: "14px",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--ff-mono)",
                  fontSize: "0.62rem",
                  color: "var(--a-indigo)",
                  letterSpacing: 1,
                  marginBottom: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>SIZE: {v.size}</span>
                <label className="ap-toggle" title="Available">
                  <input
                    type="checkbox"
                    checked={v.isAvailable}
                    onChange={(e) =>
                      updateVariant(i, "isAvailable", e.target.checked)
                    }
                  />
                  <span className="ap-toggle-slider" />
                </label>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <div className="ap-field" style={{ marginBottom: 0 }}>
                  <label className="ap-label">Price (₹)</label>
                  <input
                    className="ap-input"
                    type="number"
                    value={v.basePrice}
                    onChange={(e) =>
                      updateVariant(i, "basePrice", e.target.value)
                    }
                  />
                </div>
                <div className="ap-field" style={{ marginBottom: 0 }}>
                  <label className="ap-label">Cost (₹)</label>
                  <input
                    className="ap-input"
                    type="number"
                    value={v.costPrice}
                    onChange={(e) =>
                      updateVariant(i, "costPrice", e.target.value)
                    }
                  />
                </div>
                <div className="ap-field" style={{ marginBottom: 0 }}>
                  <label className="ap-label">Stock</label>
                  <input
                    className="ap-input"
                    type="number"
                    value={v.stock}
                    onChange={(e) => updateVariant(i, "stock", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="ap-modal-footer">
          <button
            className="ap-btn ap-btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="ap-btn ap-btn--primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="ap-spin" /> Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Delete Confirm ── */
const DeleteConfirm = ({ item, onClose, onDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const handleDelete = async () => {
    setLoading(true);
    try {
      await api.delete(`/ice-creams/${item._id}`);
      onDeleted();
    } catch (err) {
      setError(err.response?.data?.message || "Failed.");
      setLoading(false);
    }
  };
  return (
    <div className="ap-modal-overlay" onClick={onClose}>
      <div
        className="ap-modal"
        style={{ maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ap-modal-strip" />
        <div className="ap-modal-inner">
          <div className="ap-confirm-icon">🗑️</div>
          <div className="ap-modal-title">Delete Ice Cream?</div>
          <div className="ap-modal-sub">
            "{item.name}" will be permanently deleted.
          </div>
          {error && <div className="ap-error-box">{error}</div>}
        </div>
        <div className="ap-modal-footer">
          <button
            className="ap-btn ap-btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="ap-btn ap-btn--danger"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="ap-spin" /> Deleting…
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const AdminIceCreams = () => {
  const [items, setItems] = useState([]);
  const [flavours, setFlavours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch flavours once on mount ──
  useEffect(() => {
    api
      .get("/flavours?limit=100")
      .then((r) => setFlavours(r.data.data || []))
      .catch(() => showToast("Failed to load flavours", "error"));
  }, []);

  // ── Fetch ice creams ──
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 12 });
      if (search.trim()) params.set("search", search.trim());
      if (!showInactive) params.set("isActive", "true");
      const res = await api.get(`/ice-creams?${params}`);
      setItems(res.data.data || []);
      setPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch {
      showToast("Failed to load ice creams", "error");
    } finally {
      setLoading(false);
    }
  }, [page, search, showInactive]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSaved = (msg = "Saved!") => {
    setModal(null);
    showToast(msg);
    fetchItems();
  };

  return (
    <AdminLayout pageTitle="Ice Creams" breadcrumb="CATALOG / ICE CREAMS">
      {toast && (
        <div className={`ap-toast ap-toast--${toast.type}`}>{toast.msg}</div>
      )}
      {modal === "create" && (
        <CreateModal
          flavours={flavours}
          onClose={() => setModal(null)}
          onSaved={() => handleSaved("Ice cream created!")}
        />
      )}
      {modal?.edit && (
        <EditModal
          iceCream={modal.edit}
          flavours={flavours}
          onClose={() => setModal(null)}
          onSaved={() => handleSaved("Updated!")}
        />
      )}
      {modal?.delete && (
        <DeleteConfirm
          item={modal.delete}
          onClose={() => setModal(null)}
          onDeleted={() => handleSaved("Deleted.")}
        />
      )}

      <div className="ap-page-hd">
        <div className="ap-page-hd-left">
          <h1>Ice Creams</h1>
          <p>{total} products</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontSize: "0.82rem",
              color: "var(--a-text2)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => {
                setShowInactive(e.target.checked);
                setPage(1);
              }}
            />
            Show inactive
          </label>
          <button
            className="ap-btn ap-btn--primary"
            onClick={() => setModal("create")}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Ice Cream
          </button>
        </div>
      </div>

      <div className="ap-card">
        <div className="ap-card-body" style={{ paddingBottom: 0 }}>
          <div className="ap-filters">
            <div className="ap-search-wrap">
              <div className="ap-search-icon">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <input
                className="ap-search"
                placeholder="Search ice creams…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="ap-center">
            <div className="ap-spin" />
            <span>Loading…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="ap-center">
            <div className="ap-empty-icon">🍦</div>
            <span>No ice creams found</span>
          </div>
        ) : (
          <div
            className="ap-table-wrap"
            style={{ border: "none", borderTop: "1px solid var(--a-border2)" }}
          >
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Flavour</th>
                  <th>Variants</th>
                  <th>Rating</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((ic) => (
                  <tr key={ic._id}>
                    <td>
                      <div className="ap-thumb">
                        {imgSrc(ic.imageUrl) ? (
                          <img
                            src={imgSrc(ic.imageUrl)}
                            alt=""
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        ) : (
                          "🍦"
                        )}
                      </div>
                    </td>
                    <td className="ap-td-strong">{ic.name}</td>
                    <td>
                      <span className="ap-badge ap-badge--indigo">
                        {ic.flavourId?.name || "—"}
                      </span>
                    </td>
                    <td>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
                      >
                        {ic.variants?.map((v) => (
                          <span
                            key={v._id}
                            className={`ap-badge ap-badge--${v.isAvailable ? "blue" : "gray"}`}
                            title={`Stock: ${v.stock}`}
                          >
                            {v.size} · ₹{fmtINR(v.basePrice)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{ color: "var(--a-yellow)", fontSize: "0.8rem" }}
                      >
                        ★ {(ic.averageRating || 0).toFixed(1)}
                      </span>
                      <span
                        style={{
                          color: "var(--a-text4)",
                          fontSize: "0.72rem",
                          marginLeft: 4,
                        }}
                      >
                        ({ic.totalReviews})
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ap-badge ap-badge--${ic.isActive ? "green" : "gray"}`}
                      >
                        {ic.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="ap-row-actions">
                        <button
                          className="ap-btn ap-btn--ghost ap-btn--sm"
                          onClick={() => setModal({ edit: ic })}
                        >
                          Edit
                        </button>
                        <button
                          className="ap-btn ap-btn--danger ap-btn--sm"
                          onClick={() => setModal({ delete: ic })}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="ap-pagination">
            <span className="ap-pagination-info">
              PAGE {page} / {pages} · {total} PRODUCTS
            </span>
            <div className="ap-pagination-btns">
              <button
                className="ap-page-btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
              >
                ← Prev
              </button>
              <button
                className="ap-page-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pages}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminIceCreams;