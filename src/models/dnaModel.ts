export const TRAVEL_ROLE_OPTIONS = ['The Navigator', 'The Foodie', 'The Photographer', 'The Budgeter'] as const;

export type TravelRole = (typeof TRAVEL_ROLE_OPTIONS)[number];

export type TravelDNA = {
  socialBattery: number;
  planningStyle: number;
  budgetFlexibility: number;
  morningSync: number;
  riskAppetite: number;
  cleanliness: number;
  travelRoles: TravelRole[];
};

export type UserDNA = TravelDNA;
export type TripDNA = TravelDNA;

export type TravelDNAField = Exclude<keyof TravelDNA, 'travelRoles'>;

export const TRAVEL_DNA_DIMENSIONS: Array<{
  key: TravelDNAField;
  label: string;
  lowLabel: string;
  highLabel: string;
}> = [
  {
    key: 'socialBattery',
    label: 'Social Battery',
    lowLabel: 'Quiet recharge',
    highLabel: 'Always social',
  },
  {
    key: 'planningStyle',
    label: 'Planning Style',
    lowLabel: 'Spontaneous',
    highLabel: 'Structured planner',
  },
  {
    key: 'budgetFlexibility',
    label: 'Budget Flexibility',
    lowLabel: 'Strict budget',
    highLabel: 'Flexible spend',
  },
  {
    key: 'morningSync',
    label: 'Morning Sync',
    lowLabel: 'Night owl',
    highLabel: 'Early riser',
  },
  {
    key: 'riskAppetite',
    label: 'Risk Appetite',
    lowLabel: 'Safety first',
    highLabel: 'Adventure heavy',
  },
  {
    key: 'cleanliness',
    label: 'Cleanliness',
    lowLabel: 'Relaxed',
    highLabel: 'Very tidy',
  },
];

export const defaultUserDNA: UserDNA = {
  socialBattery: 5,
  planningStyle: 5,
  budgetFlexibility: 5,
  morningSync: 5,
  riskAppetite: 5,
  cleanliness: 5,
  travelRoles: [],
};

export const clampTravelDNAValue = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 5;
  }

  return Math.min(10, Math.max(1, Math.round(value)));
};

export const normalizeTravelDNA = (value?: Partial<TravelDNA> | null): TravelDNA => {
  const source = value ?? {};

  const normalizedRoles = Array.isArray(source.travelRoles)
    ? source.travelRoles.filter((role): role is TravelRole => TRAVEL_ROLE_OPTIONS.includes(role as TravelRole))
    : [];

  return {
    socialBattery: clampTravelDNAValue(source.socialBattery ?? 5),
    planningStyle: clampTravelDNAValue(source.planningStyle ?? 5),
    budgetFlexibility: clampTravelDNAValue(source.budgetFlexibility ?? 5),
    morningSync: clampTravelDNAValue(source.morningSync ?? 5),
    riskAppetite: clampTravelDNAValue(source.riskAppetite ?? 5),
    cleanliness: clampTravelDNAValue(source.cleanliness ?? 5),
    travelRoles: normalizedRoles.filter((role, index, allRoles) => allRoles.indexOf(role) === index),
  };
};
