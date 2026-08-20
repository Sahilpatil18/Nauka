const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ---- Types (mirrors backend/app/schemas) ----

export type UserRole = "fisherman" | "cooperative" | "vendor" | "buyer" | "admin";
export type KycStatus = "unverified" | "phone_verified" | "full_kyc";
export type DocumentStatus = "unverified" | "pending_review" | "verified" | "rejected";

export interface User {
  id: string;
  phone_number: string;
  role: UserRole;
  kyc_status: KycStatus;
  created_at: string;
}

export interface Harbour {
  id: string;
  name: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface Product {
  id: string;
  vendor_id: string;
  category_id: string;
  name: string;
  spec_summary: string | null;
  port_location: string | null;
  price_hint: number | null;
  in_stock: number;
  created_at: string;
}

export interface RFQ {
  id: string;
  product_id: string;
  requested_by_user_id: string;
  quantity: number | null;
  message: string | null;
  status: "open" | "responded" | "closed";
  created_at: string;
}

export interface PFZAdvisory {
  id: string;
  latitude: number;
  longitude: number;
  reference_point: string | null;
  landing_center: string | null;
  direction: string | null;
  bearing_deg: number | null;
  distance_km_range: string | null;
  depth_m_range: string | null;
  latitude_dms: string | null;
  longitude_dms: string | null;
  sea_surface_temp_c: number | null;
  chlorophyll_mg_m3: number | null;
  valid_from: string;
  valid_to: string;
  source_updated_at: string | null;
  source: string;
}

export interface PFZAdvisoryWithDistance extends PFZAdvisory {
  distance_km: number;
  is_live: boolean;
}

export type BoatType = "mechanized" | "motorized" | "traditional";

export interface FishermanProfile {
  id: string;
  user_id: string;
  home_harbour_id: string | null;
  boat_type: BoatType | null;
  target_species: string | null;
  boat_registration_no: string | null;
  access_pass_no: string | null;
  high_sea_pass_no: string | null;
  document_status: DocumentStatus;
  document_review_notes: string | null;
  document_reviewed_by_user_id: string | null;
  document_reviewed_at: string | null;
}

export interface PendingReview {
  fisherman_profile_id: string;
  user_id: string;
  phone_number: string;
  boat_registration_no: string | null;
  access_pass_no: string | null;
  high_sea_pass_no: string | null;
  document_status: DocumentStatus;
}

export interface CatchLog {
  id: string;
  fisherman_id: string;
  species: string;
  quantity_kg: number;
  catch_latitude: number | null;
  catch_longitude: number | null;
  harbour_id: string | null;
  device_recorded_at: string;
  synced_at: string;
}

export interface PriceIndexEntry {
  species: string;
  harbour_id: string;
  harbour_name: string;
  latest_date: string;
  min_price_per_kg: number;
  max_price_per_kg: number;
  avg_price_per_kg: number;
  trend_7day: "rising" | "falling" | "flat" | "insufficient_data";
}

// ---- Auth ----

export const requestOtp = (phone_number: string) =>
  request<{ status: string; note: string }>("/auth/otp/request", {
    method: "POST",
    body: JSON.stringify({ phone_number }),
  });

export const verifyOtp = (phone_number: string, code: string, role: UserRole) =>
  request<User>("/auth/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone_number, code, role }),
  });

// ---- Onboarding ----

export const upsertFishermanProfile = (userId: string, payload: Record<string, unknown>) =>
  request<FishermanProfile>(`/onboarding/${userId}/fisherman-profile`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

export const getFishermanProfile = (userId: string) =>
  request<FishermanProfile>(`/onboarding/${userId}/fisherman-profile`);

export const upsertVendorProfile = (userId: string, payload: Record<string, unknown>) =>
  request(`/onboarding/${userId}/vendor-profile`, { method: "PUT", body: JSON.stringify(payload) });

export const upsertBuyerProfile = (userId: string, payload: Record<string, unknown>) =>
  request(`/onboarding/${userId}/buyer-profile`, { method: "PUT", body: JSON.stringify(payload) });

export const upsertCooperativeProfile = (userId: string, payload: Record<string, unknown>) =>
  request(`/onboarding/${userId}/cooperative-profile`, { method: "PUT", body: JSON.stringify(payload) });

export const submitKyc = (userId: string, aadhaar_last4?: string) =>
  request<User>(`/onboarding/${userId}/kyc`, {
    method: "POST",
    body: JSON.stringify({ aadhaar_last4 }),
  });

// ---- Reference data ----

export const listHarbours = () => request<Harbour[]>("/harbours");
export const listCategories = () => request<Category[]>("/catalog/categories");
export const getPfz = () => request<PFZAdvisory[]>("/pfz");
export const getPfzNearHarbour = (harbourId: string) =>
  request<PFZAdvisoryWithDistance[]>(`/pfz/near-harbour/${harbourId}`);
export const getPriceIndex = (species?: string, harbourId?: string) => {
  const params = new URLSearchParams();
  if (species) params.set("species", species);
  if (harbourId) params.set("harbour_id", harbourId);
  const qs = params.toString();
  return request<PriceIndexEntry[]>(`/harbours/price-index${qs ? `?${qs}` : ""}`);
};

export const addPriceRecord = (payload: Record<string, unknown>, enteredByUserId?: string) => {
  const params = enteredByUserId ? `?entered_by_user_id=${enteredByUserId}` : "";
  return request(`/harbours/price-records${params}`, { method: "POST", body: JSON.stringify(payload) });
};

// ---- Catalog / RFQ ----

export const listProducts = (categoryId?: string, portLocation?: string) => {
  const params = new URLSearchParams();
  if (categoryId) params.set("category_id", categoryId);
  if (portLocation) params.set("port_location", portLocation);
  const qs = params.toString();
  return request<Product[]>(`/catalog/products${qs ? `?${qs}` : ""}`);
};

export const createProduct = (vendorUserId: string, payload: Record<string, unknown>) =>
  request<Product>(`/catalog/products?vendor_user_id=${vendorUserId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const createRfq = (requesterUserId: string, payload: Record<string, unknown>) =>
  request<RFQ>(`/catalog/rfqs?requester_user_id=${requesterUserId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const listRfqsForVendor = (vendorUserId: string) =>
  request<RFQ[]>(`/catalog/rfqs/for-vendor/${vendorUserId}`);

// ---- Catch log ----

export const logCatch = (fishermanUserId: string, payload: Record<string, unknown>) =>
  request<CatchLog>(`/catch-logs?fisherman_user_id=${fishermanUserId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const listCatchLogs = (fishermanUserId: string) =>
  request<CatchLog[]>(`/catch-logs/for-fisherman/${fishermanUserId}`);

// ---- Document verification (admin review of self-reported boat docs) ----

export const listPendingReviews = (reviewerUserId: string) =>
  request<PendingReview[]>(`/verification/pending?reviewer_user_id=${reviewerUserId}`);

export const reviewDocuments = (
  fishermanProfileId: string,
  reviewerUserId: string,
  status: "verified" | "rejected",
  notes?: string
) =>
  request<FishermanProfile>(`/verification/${fishermanProfileId}/review?reviewer_user_id=${reviewerUserId}`, {
    method: "POST",
    body: JSON.stringify({ status, notes: notes || null }),
  });
