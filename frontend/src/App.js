import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

const api = axios.create({
  baseURL: "http://localhost:8000",
});

const csvEscape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  rows.push(row);

  return rows.filter((currentRow) => currentRow.some((cell) => cell.trim() !== ""));
}

function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    id: "",
    name: "",
    description: "",
    price: "",
    quantity: "",
  });
  const [editId, setEditId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("asc");
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/products/");
      setProducts(res.data);
      setError("");
    } catch (err) {
      setError("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("asc");
  };

  const filteredProducts = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? products.filter((product) => {
          return (
            String(product.id).includes(q) ||
            product.name?.toLowerCase().includes(q) ||
            product.description?.toLowerCase().includes(q)
          );
        })
      : products;

    return [...filtered].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "id" || sortField === "price" || sortField === "quantity") {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [products, filter, sortField, sortDirection]);

  const resetForm = () => {
    setForm({ id: "", name: "", description: "", price: "", quantity: "" });
    setEditId(null);
  };

  const openCreatePanel = () => {
    resetForm();
    setIsFormOpen(true);
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const openEditPanel = (product) => {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      quantity: product.quantity,
    });
    setEditId(product.id);
    setIsFormOpen(true);
    setMessage("");
    setError("");
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        ...form,
        id: Number(form.id),
        price: Number(form.price),
        quantity: Number(form.quantity),
      };

      if (editId) {
        await api.put(`/products/${editId}`, payload);
        setMessage("Item updated successfully");
      } else {
        await api.post("/products/", payload);
        setMessage("Item created successfully");
      }

      resetForm();
      setIsFormOpen(false);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.detail || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = window.confirm("Delete this item?");
    if (!ok) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      await api.delete(`/products/${id}`);
      setMessage("Item deleted successfully");
      fetchProducts();
    } catch (err) {
      setError("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ["id", "name", "description", "price", "quantity"];
    const rows = [
      headers.join(","),
      ...filteredProducts.map((product) =>
        [product.id, product.name, product.description, product.price, product.quantity]
          .map(csvEscape)
          .join(",")
      ),
    ];

    const blob = new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventrack-items.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (rows.length < 2) {
        throw new Error("CSV file is empty");
      }

      const headers = rows[0].map((header) => header.trim().toLowerCase());
      const required = ["id", "name", "description", "price", "quantity"];

      for (const field of required) {
        if (!headers.includes(field)) {
          throw new Error(`Missing required column: ${field}`);
        }
      }

      const indexOf = (field) => headers.indexOf(field);
      const imported = rows.slice(1).map((row) => {
        const product = {
          id: Number(row[indexOf("id")] ?? ""),
          name: row[indexOf("name")] ?? "",
          description: row[indexOf("description")] ?? "",
          price: Number(row[indexOf("price")] ?? ""),
          quantity: Number(row[indexOf("quantity")] ?? ""),
        };

        if (
          Number.isNaN(product.id) ||
          Number.isNaN(product.price) ||
          Number.isNaN(product.quantity) ||
          !product.name ||
          !product.description
        ) {
          throw new Error("CSV contains invalid product rows");
        }

        return product;
      });

      const existingById = new Map(products.map((product) => [Number(product.id), product]));

      for (const product of imported) {
        if (existingById.has(product.id)) {
          await api.put(`/products/${product.id}`, product);
        } else {
          await api.post("/products/", product);
        }
        existingById.set(product.id, product);
      }

      await fetchProducts();
      setMessage(`Imported ${imported.length} items successfully`);
    } catch (err) {
      setError(err.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const printItems = () => {
    window.print();
  };

  const currency = (n) =>
    typeof n === "number" ? n.toFixed(2) : Number(n || 0).toFixed(2);

  return (
    <div className="app-bg">
      <div className="dashboard-shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-badge">IN</span>
            <div className="brand-copy">
              <h1>Inventrack</h1>
              <p>Inventory management workspace</p>
            </div>
          </div>

          <div className="top-actions">
            <span className="status-chip">{products.length} items</span>
            <button className="btn btn-soft" onClick={fetchProducts} disabled={loading}>
              Refresh
            </button>
          </div>
        </header>

        <main className="page">
          <section className="card page-toolbar">
            <div className="page-toolbar__actions">
              <button type="button" className="btn btn-primary" onClick={openCreatePanel}>
                + Create
              </button>
            </div>

            <div className="page-toolbar__actions page-toolbar__actions--right">
              <button type="button" className="btn btn-soft" onClick={printItems}>
                Download as PDF
              </button>
              <button type="button" className="btn btn-soft" onClick={handleExportCsv}>
                Download as CSV
              </button>
              <button
                type="button"
                className="btn btn-soft"
                onClick={() => fileInputRef.current?.click()}
              >
                Import from CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="visually-hidden"
                onChange={handleImportCsv}
              />
            </div>

            <div className="page-toolbar__filters">
              <input
                type="text"
                className="search-input"
                placeholder="Search items by id, name, or description..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <button type="button" className="clear-link" onClick={() => setFilter("")}>
                Clear
              </button>
              <span className="results-chip">{filteredProducts.length} results</span>
            </div>
          </section>

          {isFormOpen && (
            <section className="card form-panel" ref={formRef}>
              <div className="section-heading">
                <h2>{editId ? "Edit item" : "Create item"}</h2>
                <p>Add or update an inventory record, then return to the list.</p>
              </div>

              <form onSubmit={handleSubmit} className="form-grid">
                <input
                  type="number"
                  name="id"
                  placeholder="ID"
                  value={form.id}
                  onChange={handleChange}
                  required
                  disabled={!!editId}
                />
                <input
                  type="text"
                  name="name"
                  placeholder="Part description"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
                <input
                  type="text"
                  name="description"
                  placeholder="Group / description"
                  value={form.description}
                  onChange={handleChange}
                  required
                />
                <input
                  type="number"
                  name="price"
                  placeholder="Cost"
                  value={form.price}
                  onChange={handleChange}
                  required
                  step="0.01"
                />
                <input
                  type="number"
                  name="quantity"
                  placeholder="Quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  required
                />
                <div className="form-actions">
                  <button className="btn btn-primary" type="submit" disabled={loading}>
                    {editId ? "Update" : "Save"}
                  </button>
                  <button
                    className="btn btn-soft"
                    type="button"
                    onClick={() => {
                      resetForm();
                      setIsFormOpen(false);
                      setMessage("");
                      setError("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {message && <div className="success-msg">{message}</div>}
              {error && <div className="error-msg">{error}</div>}
            </section>
          )}

          <section className="card items-card">
            {loading ? (
              <div className="loader">Loading...</div>
            ) : (
              <>
                <div className="table-view">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort("id")} className="sortable">
                          #
                          {sortField === "id" ? (
                            <span>{sortDirection === "asc" ? " ^" : " v"}</span>
                          ) : null}
                        </th>
                        <th onClick={() => handleSort("name")} className="sortable">
                          Part description
                          {sortField === "name" ? (
                            <span>{sortDirection === "asc" ? " ^" : " v"}</span>
                          ) : null}
                        </th>
                        <th>Description</th>
                        <th onClick={() => handleSort("quantity")} className="sortable">
                          Quantity
                          {sortField === "quantity" ? (
                            <span>{sortDirection === "asc" ? " ^" : " v"}</span>
                          ) : null}
                        </th>
                        <th onClick={() => handleSort("price")} className="sortable">
                          Cost
                          {sortField === "price" ? (
                            <span>{sortDirection === "asc" ? " ^" : " v"}</span>
                          ) : null}
                        </th>
                        <th className="actions-cell">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => (
                        <tr key={product.id}>
                          <td className="item-id">{product.id}</td>
                          <td className="item-name">{product.name}</td>
                          <td className="item-desc" title={product.description}>
                            {product.description}
                          </td>
                          <td>
                            <span className="qty-badge">{product.quantity}</span>
                          </td>
                          <td className="cost-cell">${currency(product.price)}</td>
                          <td>
                            <div className="row-actions">
                              <button
                                type="button"
                                className="btn btn-row btn-edit"
                                onClick={() => openEditPanel(product)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-row btn-delete"
                                onClick={() => handleDelete(product.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredProducts.length === 0 && (
                        <tr>
                          <td colSpan={6} className="empty">
                            No items found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="cards-view">
                  {filteredProducts.map((product) => (
                    <article className="product-card" key={product.id}>
                      <div className="product-card__top">
                        <div>
                          <p className="product-card__eyebrow">Item {product.id}</p>
                          <h3>{product.name}</h3>
                        </div>
                        <span className="qty-badge">{product.quantity}</span>
                      </div>

                      <p className="product-card__desc">{product.description}</p>

                      <div className="product-card__meta">
                        <div>
                          <span>Cost</span>
                          <strong>${currency(product.price)}</strong>
                        </div>
                        <div>
                          <span>Quantity</span>
                          <strong>{product.quantity}</strong>
                        </div>
                      </div>

                      <div className="row-actions row-actions-mobile">
                        <button
                          type="button"
                          className="btn btn-row btn-edit"
                          onClick={() => openEditPanel(product)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-row btn-delete"
                          onClick={() => handleDelete(product.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}

                  {filteredProducts.length === 0 && (
                    <div className="empty empty-card">No items found.</div>
                  )}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
