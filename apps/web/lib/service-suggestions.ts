// ServiceFlow Service Suggestions Utility
// Suggests service offerings based on business name analysis

// ============================================
// TYPES
// ============================================

export interface ServiceSuggestion {
  name: string;
  description: string;
  estimatedDuration: number; // minutes
  suggestedPrice?: number;
}

export type Industry = 'plumbing' | 'hvac' | 'electrical' | 'cleaning' | 'default';

// ============================================
// INDUSTRY KEYWORDS
// ============================================

const INDUSTRY_KEYWORDS: Record<Exclude<Industry, 'default'>, string[]> = {
  plumbing: [
    'plumb',
    'pipe',
    'drain',
    'sewer',
    'water',
    'leak',
    'faucet',
    'toilet',
    'septic',
    'rooter',
  ],
  hvac: [
    'hvac',
    'heating',
    'cooling',
    'air condition',
    'ac ',
    'a/c',
    'furnace',
    'heat pump',
    'ventilation',
    'climate',
    'thermal',
  ],
  electrical: [
    'electric',
    'wiring',
    'power',
    'volt',
    'circuit',
    'lighting',
    'solar',
    'panel',
    'outlet',
  ],
  cleaning: [
    'clean',
    'maid',
    'janitorial',
    'housekeep',
    'sanit',
    'wash',
    'spotless',
    'pristine',
    'tidy',
  ],
};

// ============================================
// SERVICE SUGGESTIONS BY INDUSTRY
// ============================================

const INDUSTRY_SERVICES: Record<Industry, ServiceSuggestion[]> = {
  plumbing: [
    {
      name: 'Leak Repair',
      description: 'Diagnose and repair water leaks in pipes, fixtures, or appliances',
      estimatedDuration: 60,
      suggestedPrice: 150,
    },
    {
      name: 'Drain Cleaning',
      description: 'Clear clogged drains using professional equipment',
      estimatedDuration: 45,
      suggestedPrice: 125,
    },
    {
      name: 'Water Heater Install',
      description: 'Install or replace residential water heater (tank or tankless)',
      estimatedDuration: 180,
      suggestedPrice: 500,
    },
    {
      name: 'Faucet Repair',
      description: 'Repair or replace kitchen or bathroom faucets',
      estimatedDuration: 30,
      suggestedPrice: 100,
    },
  ],
  hvac: [
    {
      name: 'AC Tune-up',
      description: 'Comprehensive air conditioning maintenance and performance check',
      estimatedDuration: 60,
      suggestedPrice: 150,
    },
    {
      name: 'Heating Repair',
      description: 'Diagnose and repair heating system issues',
      estimatedDuration: 90,
      suggestedPrice: 200,
    },
    {
      name: 'Duct Cleaning',
      description: 'Professional cleaning of HVAC ductwork and vents',
      estimatedDuration: 120,
      suggestedPrice: 300,
    },
    {
      name: 'Thermostat Install',
      description: 'Install or upgrade to a programmable or smart thermostat',
      estimatedDuration: 30,
      suggestedPrice: 100,
    },
  ],
  electrical: [
    {
      name: 'Outlet Install',
      description: 'Install new electrical outlets or replace existing ones',
      estimatedDuration: 30,
      suggestedPrice: 100,
    },
    {
      name: 'Panel Upgrade',
      description: 'Upgrade electrical panel to higher capacity for modern power needs',
      estimatedDuration: 240,
      suggestedPrice: 1500,
    },
    {
      name: 'Light Fixture',
      description: 'Install or replace indoor or outdoor light fixtures',
      estimatedDuration: 45,
      suggestedPrice: 150,
    },
    {
      name: 'Ceiling Fan',
      description: 'Install ceiling fan with or without existing wiring',
      estimatedDuration: 60,
      suggestedPrice: 200,
    },
  ],
  cleaning: [
    {
      name: 'Deep Clean',
      description: 'Thorough top-to-bottom cleaning including hard-to-reach areas',
      estimatedDuration: 180,
      suggestedPrice: 250,
    },
    {
      name: 'Regular Service',
      description: 'Standard recurring cleaning service for home or office',
      estimatedDuration: 120,
      suggestedPrice: 150,
    },
    {
      name: 'Move-out Clean',
      description: 'Comprehensive cleaning for move-out or move-in preparation',
      estimatedDuration: 240,
      suggestedPrice: 350,
    },
  ],
  default: [
    {
      name: 'Service Call',
      description: 'On-site service visit for diagnosis and minor repairs',
      estimatedDuration: 60,
      suggestedPrice: 100,
    },
    {
      name: 'Consultation',
      description: 'Professional consultation to assess needs and provide recommendations',
      estimatedDuration: 30,
      suggestedPrice: 50,
    },
    {
      name: 'Repair',
      description: 'General repair service for common issues',
      estimatedDuration: 90,
      suggestedPrice: 150,
    },
  ],
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Detects the industry based on business name keywords
 * @param businessName - The name of the business to analyze
 * @returns The detected industry or 'default' if no match found
 */
export function detectIndustry(businessName: string): Industry {
  const normalizedName = businessName.toLowerCase();

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedName.includes(keyword)) {
        return industry as Industry;
      }
    }
  }

  return 'default';
}

/**
 * Suggests service offerings based on business name analysis
 * @param businessName - The name of the business to analyze
 * @param industry - Optional explicit industry override
 * @returns Array of service suggestions appropriate for the detected/specified industry
 */
export function suggestServices(
  businessName: string,
  industry?: string
): ServiceSuggestion[] {
  // If industry is explicitly provided and valid, use it
  if (industry && industry in INDUSTRY_SERVICES) {
    return [...INDUSTRY_SERVICES[industry as Industry]];
  }

  // Otherwise, detect industry from business name
  const detectedIndustry = detectIndustry(businessName);
  return [...INDUSTRY_SERVICES[detectedIndustry]];
}

/**
 * Gets all available industries
 * @returns Array of industry identifiers
 */
export function getAvailableIndustries(): Industry[] {
  return ['plumbing', 'hvac', 'electrical', 'cleaning', 'default'];
}

/**
 * Gets services for a specific industry
 * @param industry - The industry to get services for
 * @returns Array of service suggestions for the industry
 */
export function getServicesByIndustry(industry: Industry): ServiceSuggestion[] {
  return [...(INDUSTRY_SERVICES[industry] || INDUSTRY_SERVICES.default)];
}
