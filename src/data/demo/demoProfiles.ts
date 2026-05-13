import type { AttorneyAd, Profile } from "../../types";

export const demoConsumerProfile: Profile = {
  id: "demo-profile-consumer",
  auth_user_id: "demo-auth-consumer",
  full_name: "Maria Demo Customer",
  phone: "555-0101",
  email: "maria.demo@example.com",
  role: "consumer",
  created_at: "2026-05-01T15:00:00.000Z",
  updated_at: "2026-05-01T15:00:00.000Z",
};

export const demoAgencyProfile: Profile = {
  id: "demo-profile-agency",
  auth_user_id: "demo-auth-agency",
  full_name: "Elena Demo Provider",
  phone: "555-0102",
  email: "provider.demo@example.com",
  role: "agency",
  created_at: "2026-05-01T15:05:00.000Z",
  updated_at: "2026-05-01T15:05:00.000Z",
};

export const demoAdminProfile: Profile = {
  id: "demo-profile-admin",
  auth_user_id: "demo-auth-admin",
  full_name: "Admin Demo Operator",
  phone: "555-0103",
  email: "admin.demo@example.com",
  role: "admin",
  created_at: "2026-05-01T15:10:00.000Z",
  updated_at: "2026-05-01T15:10:00.000Z",
};

export const demoAttorneyProfile: Profile = {
  id: "demo-profile-attorney",
  auth_user_id: "demo-auth-attorney",
  full_name: "Avery Demo Attorney",
  phone: "555-0104",
  email: "attorney.demo@example.com",
  role: "attorney",
  created_at: "2026-05-01T15:15:00.000Z",
  updated_at: "2026-05-01T15:15:00.000Z",
};

export const demoAttorneyAdPlaceholder: AttorneyAd = {
  id: "demo-attorney-ad-1",
  advertiser_name: "Avery Demo Attorney",
  practice_areas: ["Criminal defense consultation", "Post-release planning"],
  jurisdictions: ["Riverside County", "San Bernardino County", "Orange County"],
  phone: "555-0104",
  website_url: "https://attorney-demo.example.com",
  status: "draft",
};
