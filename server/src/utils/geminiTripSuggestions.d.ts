export type GeneratedTripSuggestion = {
    name: string;
    whyVisit: string;
    estimatedCostPerPerson: number;
    vibeMatchPercent: number;
    imageUrl: string;
};
export declare const generateTripSuggestions: (input: {
    destination: string;
    travelerType: string;
    collectiveMood: string;
    interest: string;
    budget: string;
    food: string;
    crowds: string;
}) => Promise<GeneratedTripSuggestion[]>;
//# sourceMappingURL=geminiTripSuggestions.d.ts.map