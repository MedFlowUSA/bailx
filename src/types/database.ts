export type Profile = {
  id: string;
  auth_user_id?: string | null;
  full_name: string;
  phone?: string;
  email: string;
  role: "consumer" | "agency" | "admin" | "attorney";
  created_at: string;
  updated_at: string;
};

export type Agency = {
  id: string;
  owner_profile_id?: string | null;
  business_name: string;
  contact_name: string;
  phone: string;
  email: string;
  license_number: string;
  service_counties: string[];
  languages: string[];
  collateral_accepted: string[];
  verification_status: "pending" | "approved" | "rejected" | "more_info_requested";
  subscription_tier?: string;
  created_at: string;
  updated_at: string;
};

export type AgencyDocument = {
  id: string;
  agency_id: string;
  uploaded_by_profile_id?: string | null;
  document_type: "bail_license" | "business_registration" | "insurance_bond" | "other";
  file_name: string;
  file_path: string;
  mime_type?: string | null;
  file_size?: number | null;
  review_status: "pending" | "approved" | "rejected" | "more_info_requested";
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
  agencies?: {
    business_name?: string;
  } | null;
};

export type BailRequest = {
  id: string;
  consumer_profile_id?: string | null;
  requester_name: string;
  requester_phone: string;
  requester_email: string;
  defendant_name: string;
  jail_location: string;
  jail_city?: string;
  jail_county?: string;
  jail_state?: string;
  jail_zip?: string;
  bond_amount: number | null;
  charges?: string;
  urgency_level: "standard" | "urgent" | "critical";
  preferred_language: string;
  collateral_available: string[];
  notes?: string;
  status:
    | "submitted"
    | "providers_notified"
    | "offers_received"
    | "provider_selected"
    | "closed"
    | "cancelled";
  created_at: string;
  updated_at: string;
};

export type AgencyOffer = {
  id: string;
  agency_id: string;
  bail_request_id: string;
  down_payment: number | null;
  estimated_release_time?: string;
  financing_available?: boolean;
  collateral_notes?: string;
  message?: string;
  status: "submitted" | "viewed" | "selected" | "declined" | "expired";
  created_at: string;
  updated_at: string;
  agencies?: {
    business_name?: string;
    phone?: string;
    email?: string;
  } | null;
};

export type Review = {
  id: string;
  agency_id: string;
  profile_id: string;
  rating: number;
  comment?: string;
  created_at: string;
};

export type Subscription = {
  id: string;
  agency_id: string;
  tier: "starter" | "pro" | "priority";
  status: "trialing" | "active" | "past_due" | "canceled";
  renews_at?: string;
};

export type AttorneyAd = {
  id: string;
  advertiser_name: string;
  practice_areas: string[];
  jurisdictions: string[];
  phone: string;
  website_url?: string;
  status: "draft" | "active" | "paused";
};

export type AdminNote = {
  id: string;
  related_table?: string;
  related_id?: string;
  note: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

export type BailXTables = {
  profiles: Profile;
  agencies: Agency;
  agency_documents: AgencyDocument;
  bail_requests: BailRequest;
  agency_offers: AgencyOffer;
  reviews: Review;
  subscriptions: Subscription;
  attorney_ads: AttorneyAd;
  admin_notes: AdminNote;
};
