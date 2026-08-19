"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { addPriceRecord, listHarbours, Harbour, ApiError } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Label, inputClass, ErrorText, SuccessText, HelpText } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

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
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Enter daily harbour price</h1>
      </div>

      <HelpText>
        Manual entry — Phase 1 has no live price feed (CMFRI FishWatch / MPEDA-NETFISH) confirmed
        yet. See docs/phase1_decisions.md.
      </HelpText>

      <Card>
        <CardHeader title="Price record" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="harbour">Harbour</Label>
              <select id="harbour" value={harbourId} onChange={(e) => setHarbourId(e.target.value)} className={inputClass}>
                {harbours.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <input id="date" type="date" required value={recordDate} onChange={(e) => setRecordDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <Label htmlFor="species">Species</Label>
            <input id="species" required value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="Pomfret" className={inputClass} />
          </div>
          <div>
            <Label htmlFor="landingVolume" hint="optional">Landing volume (kg)</Label>
            <input
              id="landingVolume"
              type="number"
              min={0}
              value={landingVolume}
              onChange={(e) => setLandingVolume(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="minPrice">Min ₹/kg</Label>
              <input id="minPrice" type="number" required min={0} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="maxPrice">Max ₹/kg</Label>
              <input id="maxPrice" type="number" required min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="avgPrice">Avg ₹/kg</Label>
              <input id="avgPrice" type="number" required min={0} value={avgPrice} onChange={(e) => setAvgPrice(e.target.value)} className={inputClass} />
            </div>
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          {message && <SuccessText>{message}</SuccessText>}
          <Button type="submit" loading={submitting}>
            Save price record
          </Button>
        </form>
      </Card>
    </div>
  );
}
