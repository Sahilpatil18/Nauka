"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { addPriceRecord, listHarbours, Harbour, ApiError } from "@/lib/api";

const TODAY = () => new Date().toISOString().slice(0, 10);

export default function AdminPricesPage() {
  const { user, loading } = useSession();
  const router = useRouter();

  const [harbours, setHarbours] = useState<Harbour[]>([]);
  const [harbourId, setHarbourId] = useState("");
  const [species, setSpecies] = useState("");
  const [recordDate, setRecordDate] = useState(TODAY());
  const [landingVolume, setLandingVolume] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [avgPrice, setAvgPrice] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/login");
      return;
    }
    listHarbours().then((h) => {
      setHarbours(h);
      if (h.length) setHarbourId(h[0].id);
    });
  }, [loading, user, router]);

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      await addPriceRecord(
        {
          harbour_id: harbourId,
          species,
          record_date: recordDate,
          landing_volume_kg: landingVolume ? Number(landingVolume) : null,
          min_price_per_kg: Number(minPrice),
          max_price_per_kg: Number(maxPrice),
          avg_price_per_kg: Number(avgPrice),
        },
        user.id
      );
      setMessage(`Recorded ${species} at ₹${avgPrice}/kg for ${recordDate}.`);
      setSpecies("");
      setLandingVolume("");
      setMinPrice("");
      setMaxPrice("");
      setAvgPrice("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save price record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg bg-white border rounded-lg p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Enter daily harbour price</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manual entry — Phase 1 has no live price feed (CMFRI FishWatch / MPEDA-NETFISH)
          confirmed yet. See docs/phase1_decisions.md.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Harbour</label>
          <select value={harbourId} onChange={(e) => setHarbourId(e.target.value)} className="w-full border rounded px-3 py-2">
            {harbours.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input type="date" required value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Species</label>
          <input required value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="Pomfret" className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Landing volume (kg)</label>
          <input type="number" min={0} value={landingVolume} onChange={(e) => setLandingVolume(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div />
        <div>
          <label className="block text-sm font-medium mb-1">Min price (₹/kg)</label>
          <input type="number" required min={0} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max price (₹/kg)</label>
          <input type="number" required min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1">Average price (₹/kg)</label>
          <input type="number" required min={0} value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        {message && <p className="text-sm text-green-700 sm:col-span-2">{message}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="sm:col-span-2 bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 disabled:opacity-50 w-fit"
        >
          Save price record
        </button>
      </form>
    </div>
  );
}
