"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import {
  Category,
  Product,
  RFQ,
  listCategories,
  listProducts,
  createProduct,
  listRfqsForVendor,
  ApiError,
} from "@/lib/api";

export default function VendorDashboardPage() {
  const { user, loading } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [portLocation, setPortLocation] = useState("");
  const [specSummary, setSpecSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async (userId: string) => {
    const [cats, prods, myRfqs] = await Promise.all([
      listCategories(),
      listProducts(),
      listRfqsForVendor(userId),
    ]);
    setCategories(cats);
    setProducts(prods);
    setRfqs(myRfqs);
    if (cats.length && !categoryId) setCategoryId(cats[0].id);
  }, [categoryId]);

  useEffect(() => {
    if (!loading && (!user || user.role !== "vendor")) {
      router.push("/login");
      return;
    }
    if (user) {
      if (user.kyc_status !== "full_kyc") {
        router.push("/vendor/onboarding");
        return;
      }
      // Standard fetch-on-mount pattern; see lib/session.tsx for why this rule is disabled here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh(user.id).catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, router]);

  if (!user) return null;

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createProduct(user.id, {
        category_id: categoryId,
        name,
        spec_summary: specSummary || null,
        port_location: portLocation || null,
        in_stock: true,
      });
      setName("");
      setSpecSummary("");
      setPortLocation("");
      await refresh(user.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">Vendor dashboard</h1>

      <section className="bg-white border rounded-lg p-6">
        <h2 className="font-medium mb-4">List a product</h2>
        <form onSubmit={handleAddProduct} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Product name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border rounded px-3 py-2">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Port location</label>
            <input value={portLocation} onChange={(e) => setPortLocation(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Spec summary</label>
            <textarea value={specSummary} onChange={(e) => setSpecSummary(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="sm:col-span-2 bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 disabled:opacity-50 w-fit"
          >
            Add product
          </button>
        </form>
      </section>

      <section className="bg-white border rounded-lg p-6">
        <h2 className="font-medium mb-4">Catalog ({products.length})</h2>
        <p className="text-xs text-gray-500 mb-3">
          Note: the Phase 1 API doesn&apos;t scope this list to your vendor id yet — showing all listed products.
        </p>
        <ul className="divide-y">
          {products.map((p) => (
            <li key={p.id} className="py-2 text-sm">
              <span className="font-medium">{p.name}</span>
              {p.port_location && <span className="text-gray-500"> — {p.port_location}</span>}
              {!p.in_stock && <span className="text-red-600 ml-2">out of stock</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white border rounded-lg p-6">
        <h2 className="font-medium mb-4">RFQ inbox ({rfqs.length})</h2>
        <ul className="divide-y">
          {rfqs.map((r) => (
            <li key={r.id} className="py-2 text-sm">
              <span className="font-medium">Qty {r.quantity ?? "—"}</span>
              <span className="text-gray-500"> · {r.status}</span>
              {r.message && <p className="text-gray-600">{r.message}</p>}
            </li>
          ))}
          {rfqs.length === 0 && <li className="py-2 text-sm text-gray-500">No RFQs yet.</li>}
        </ul>
      </section>
    </div>
  );
}
