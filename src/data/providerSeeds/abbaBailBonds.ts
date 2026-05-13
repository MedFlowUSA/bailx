export type ProviderDirectorySeed = {
  id: string;
  providerName: string;
  mainPhone: string;
  websiteUrl: string;
  sourceType: "public_website";
  verificationStatus: "unclaimed_directory";
  publicListingDisclaimer: string;
  serviceCounties: string[];
  serviceCities?: Record<string, string[]>;
};

export const abbaBailBondsSeed: ProviderDirectorySeed = {
  id: "abba-bail-bonds-southern-california",
  providerName: "ABBA Bail Bonds",
  mainPhone: "877-330-5557",
  websiteUrl: "https://abbabailbonds.com/locations/",
  sourceType: "public_website",
  verificationStatus: "unclaimed_directory",
  publicListingDisclaimer:
    "Unclaimed public listing. This provider has not completed BailX marketplace verification.",
  serviceCounties: [
    "Riverside County",
    "Imperial County",
    "Orange County",
    "Kern County",
    "Los Angeles County",
  ],
};
