"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { Category, Product, listCategories, listProducts, createRfq, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ErrorText } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { EmptyState, LoadingRows } from "@/components/ui/EmptyState";

export default function BuyerDashboardPage() {
  const { user, loading } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [dataLoading, setDataLoading] = useState(true);
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
      setDataLoading(true);
      // Standard fetch-on-mount pattern; see lib/session.tsx for why this rule is disabled here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh()
        .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
        .finally(() => setDataLoading(false));
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
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Sourcing catalog</h1>
        <p className="text-sm text-slate-500 mt-1">Browse vendor listings and request quotes.</p>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="categoryFilter" className="text-sm font-medium text-slate-700 shrink-0">
          Category
        </label>
        <select
          id="categoryFilter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {dataLoading ? (
        <LoadingRows count={4} />
      ) : products.length === 0 ? (
        <Card>
          <EmptyState title="No products listed yet" description="Check back once vendors add their catalog." />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <h2 className="font-medium text-slate-900">{p.name}</h2>
              {p.port_location && <p className="text-sm text-slate-500">{p.port_location}</p>}
              {p.spec_summary && <p className="text-sm text-slate-600 mt-2 flex-1">{p.spec_summary}</p>}
              <Button
                size="sm"
                onClick={() => handleRequestQuote(p.id)}
                disabled={rfqSentFor === p.id}
                className="mt-4 w-fit"
                variant={rfqSentFor === p.id ? "secondary" : "primary"}
              >
                {rfqSentFor === p.id ? "Quote requested" : "Request quote"}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
