"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { Category, Product, listCategories, listProducts, createRfq, ApiError } from "@/lib/api";

export default function BuyerDashboardPage() {
  const { user, loading } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState("");
  const [rfqSentFor, setRfqSentFor] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [cats, prods] = await Promise.all([listCategories(), listProducts(categoryFilter || undefined)]);
    setCategories(cats);
    setProducts(prods);
  }, [categoryFilter]);

  useEffect(() => {
    if (!loading && (!user || user.role !== "buyer")) {
      router.push("/login");
      return;
    }
    if (user) {
      if (user.kyc_status !== "full_kyc") {
        router.push("/buyer/onboarding");
        return;
      }
      // Standard fetch-on-mount pattern; see lib/session.tsx for why this rule is disabled here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh().catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"));
    }
  }, [loading, user, router, refresh]);

  if (!user) return null;

  const handleRequestQuote = async (productId: string) => {
    setError("");
    try {
      await createRfq(user.id, { product_id: productId, quantity: 1, message: "Interested — please send a quote." });
      setRfqSentFor(productId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send RFQ");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Sourcing catalog</h1>

      <div className="flex gap-3 items-center">
        <label className="text-sm font-medium">Category</label>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        {products.map((p) => (
          <div key={p.id} className="bg-white border rounded-lg p-4">
            <h2 className="font-medium">{p.name}</h2>
            {p.port_location && <p className="text-sm text-gray-500">{p.port_location}</p>}
            {p.spec_summary && <p className="text-sm text-gray-600 mt-1">{p.spec_summary}</p>}
            <button
              onClick={() => handleRequestQuote(p.id)}
              disabled={rfqSentFor === p.id}
              className="mt-3 text-sm bg-blue-600 text-white rounded px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50"
            >
              {rfqSentFor === p.id ? "Quote requested" : "Request quote"}
            </button>
          </div>
        ))}
        {products.length === 0 && <p className="text-sm text-gray-500">No products listed yet.</p>}
      </div>
    </div>
  );
}
