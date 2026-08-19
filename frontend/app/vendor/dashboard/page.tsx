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
import { Card, CardHeader } from "@/components/ui/Card";
import { Label, inputClass, ErrorText, HelpText } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { EmptyState, LoadingRows } from "@/components/ui/EmptyState";

const RFQ_TONE: Record<string, "amber" | "teal" | "slate"> = {
  open: "amber",
  responded: "teal",
  closed: "slate",
};

export default function VendorDashboardPage() {
  const { user, loading } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [portLocation, setPortLocation] = useState("");
  const [specSummary, setSpecSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(
    async (userId: string) => {
      const [cats, prods, myRfqs] = await Promise.all([
        listCategories(),
        listProducts(),
        listRfqsForVendor(userId),
      ]);
      setCategories(cats);
      setProducts(prods);
      setRfqs(myRfqs);
      if (cats.length && !categoryId) setCategoryId(cats[0].id);
    },
    [categoryId]
  );

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
      refresh(user.id)
        .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
        .finally(() => setDataLoading(false));
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Vendor dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your catalog and respond to buyer inquiries.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 h-fit">
          <CardHeader title="List a product" />
          <form onSubmit={handleAddProduct} className="space-y-4">
            <div>
              <Label htmlFor="name">Product name</Label>
              <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="port" hint="optional">Port location</Label>
              <input id="port" value={portLocation} onChange={(e) => setPortLocation(e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="spec" hint="optional">Spec summary</Label>
              <textarea id="spec" rows={3} value={specSummary} onChange={(e) => setSpecSummary(e.target.value)} className={inputClass} />
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <Button type="submit" loading={submitting} fullWidth>
              Add product
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader title={`Catalog (${products.length})`} />
            <HelpText>
              The Phase 1 API doesn&apos;t scope this list to your vendor id yet — showing all listed products.
            </HelpText>
            <div className="mt-4">
              {dataLoading ? (
                <LoadingRows />
              ) : products.length === 0 ? (
                <EmptyState title="No products listed yet" description="Add your first product using the form." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <li key={p.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{p.name}</p>
                        {p.port_location && <p className="text-xs text-slate-500">{p.port_location}</p>}
                      </div>
                      {!p.in_stock && <Badge tone="red">Out of stock</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title={`RFQ inbox (${rfqs.length})`} />
            {dataLoading ? (
              <LoadingRows count={2} />
            ) : rfqs.length === 0 ? (
              <EmptyState title="No RFQs yet" description="Buyer inquiries will show up here." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {rfqs.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-900">Qty {r.quantity ?? "—"}</span>
                      <Badge tone={RFQ_TONE[r.status]}>{r.status}</Badge>
                    </div>
                    {r.message && <p className="text-sm text-slate-500 mt-1">{r.message}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
