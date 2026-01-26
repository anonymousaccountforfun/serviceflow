/**
 * Industry-based defaults utility for ServiceFlow
 * Provides sensible default configurations based on business industry/type
 */

export interface IndustryDefaults {
  businessHours: { open: string; close: string };
  serviceTypes: string[];
  appointmentDuration: number; // minutes
}

interface IndustryConfig extends IndustryDefaults {
  keywords: string[];
}

const INDUSTRY_CONFIGS: Record<string, IndustryConfig> = {
  plumbing: {
    businessHours: { open: "07:00", close: "18:00" },
    serviceTypes: ["Leak Repair", "Drain Cleaning", "Water Heater", "Pipe Installation", "Sewer Line", "Faucet Repair"],
    appointmentDuration: 60,
    keywords: ["plumb", "plumber", "plumbing", "pipe", "drain", "sewer"],
  },
  hvac: {
    businessHours: { open: "07:00", close: "18:00" },
    serviceTypes: ["AC Repair", "Heating", "Maintenance", "Installation", "Duct Cleaning", "Thermostat"],
    appointmentDuration: 90,
    keywords: ["hvac", "heating", "cooling", "air conditioning", "ac ", "furnace", "heat pump"],
  },
  electrical: {
    businessHours: { open: "07:00", close: "17:00" },
    serviceTypes: ["Wiring", "Panel Upgrade", "Outlet Install", "Lighting", "Circuit Repair", "Inspection"],
    appointmentDuration: 60,
    keywords: ["electric", "electrical", "electrician", "wiring", "power"],
  },
  landscaping: {
    businessHours: { open: "07:00", close: "16:00" },
    serviceTypes: ["Lawn Care", "Tree Trimming", "Irrigation", "Mulching", "Planting", "Hardscaping"],
    appointmentDuration: 120,
    keywords: ["landscape", "landscaping", "lawn", "garden", "tree", "yard", "mowing", "turf"],
  },
  cleaning: {
    businessHours: { open: "08:00", close: "18:00" },
    serviceTypes: ["Deep Clean", "Regular Service", "Move-out", "Move-in", "Office Cleaning", "Window Cleaning"],
    appointmentDuration: 180,
    keywords: ["clean", "cleaning", "cleaner", "maid", "janitorial", "housekeeping"],
  },
  pest_control: {
    businessHours: { open: "08:00", close: "17:00" },
    serviceTypes: ["Inspection", "Treatment", "Prevention", "Termite", "Rodent Control", "Bed Bug"],
    appointmentDuration: 45,
    keywords: ["pest", "exterminator", "termite", "rodent", "bug", "insect"],
  },
  appliance_repair: {
    businessHours: { open: "08:00", close: "18:00" },
    serviceTypes: ["Washer/Dryer", "Refrigerator", "Dishwasher", "Oven/Stove", "Microwave", "Garbage Disposal"],
    appointmentDuration: 60,
    keywords: ["appliance", "washer", "dryer", "refrigerator", "dishwasher", "repair"],
  },
  default: {
    businessHours: { open: "09:00", close: "17:00" },
    serviceTypes: ["Consultation", "Standard Service", "Premium Service", "Emergency Service"],
    appointmentDuration: 60,
    keywords: [],
  },
};

/**
 * Get default configuration values for a specific industry
 * @param industry - The industry identifier (e.g., "plumbing", "hvac")
 * @returns IndustryDefaults object with businessHours, serviceTypes, and appointmentDuration
 */
export function getIndustryDefaults(industry: string): IndustryDefaults {
  const normalizedIndustry = industry.toLowerCase().trim().replace(/\s+/g, "_");
  const config = INDUSTRY_CONFIGS[normalizedIndustry] || INDUSTRY_CONFIGS.default;

  // Return only the public interface (exclude keywords)
  return {
    businessHours: config.businessHours,
    serviceTypes: config.serviceTypes,
    appointmentDuration: config.appointmentDuration,
  };
}

/**
 * Attempt to detect the industry type from a business name
 * @param businessName - The name of the business (e.g., "Joe's Plumbing")
 * @returns The detected industry identifier or null if no match found
 */
export function detectIndustryFromName(businessName: string): string | null {
  if (!businessName || typeof businessName !== "string") {
    return null;
  }

  const normalizedName = businessName.toLowerCase();

  // Check each industry's keywords for a match
  for (const [industry, config] of Object.entries(INDUSTRY_CONFIGS)) {
    if (industry === "default") continue;

    for (const keyword of config.keywords) {
      if (normalizedName.includes(keyword)) {
        return industry;
      }
    }
  }

  return null;
}

/**
 * Get a list of all supported industries
 * @returns Array of industry identifiers
 */
export function getSupportedIndustries(): string[] {
  return Object.keys(INDUSTRY_CONFIGS).filter((key) => key !== "default");
}

/**
 * Check if an industry is supported
 * @param industry - The industry identifier to check
 * @returns true if the industry has specific defaults, false otherwise
 */
export function isIndustrySupported(industry: string): boolean {
  const normalizedIndustry = industry.toLowerCase().trim().replace(/\s+/g, "_");
  return normalizedIndustry in INDUSTRY_CONFIGS && normalizedIndustry !== "default";
}

/**
 * Get merged defaults, combining industry-specific values with custom overrides
 * @param industry - The industry identifier
 * @param overrides - Partial overrides for any default values
 * @returns Merged IndustryDefaults
 */
export function getMergedDefaults(
  industry: string,
  overrides: Partial<IndustryDefaults> = {}
): IndustryDefaults {
  const defaults = getIndustryDefaults(industry);

  return {
    businessHours: overrides.businessHours || defaults.businessHours,
    serviceTypes: overrides.serviceTypes || defaults.serviceTypes,
    appointmentDuration: overrides.appointmentDuration ?? defaults.appointmentDuration,
  };
}
