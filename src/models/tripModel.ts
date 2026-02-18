import type { TripDNA } from './dnaModel';

export interface Trip {
  id: string;
  title: string;
  hostName: string;
  priceShare: number;
  matchPercentage: number;
  tripDNA: TripDNA;
  imageUrl: string;
  isVerified: boolean;
  route: string;
  duration: string;
  totalExpectedFromPartner: number;
  partnerExpectations: string[];
  notes: string;
  highlights: string[];
}

export const tripCatalog: Trip[] = [
  {
    id: 'trip-1',
    title: 'Bali Wellness Escape',
    hostName: 'Maya',
    priceShare: 420,
    matchPercentage: 93,
    tripDNA: { socialEnergy: 5, budgetRange: 6, pace: 'Chill' },
    imageUrl:
      'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?auto=format&fit=crop&w=1000&q=80',
    isVerified: true,
    route: 'Denpasar -> Ubud -> Uluwatu',
    duration: '7 Days',
    totalExpectedFromPartner: 1680,
    partnerExpectations: ['Morning activity participation', 'Shared villa respect', 'Flexible meal planning'],
    notes: 'Looking for easy-going travelers who enjoy wellness, nature, and calm evenings.',
    highlights: ['Rice terrace cycling', 'Yoga retreat day pass', 'Sunset dinner in Uluwatu'],
  },
  {
    id: 'trip-2',
    title: 'Lisbon Food + Nightlife Week',
    hostName: 'Andre',
    priceShare: 360,
    matchPercentage: 88,
    tripDNA: { socialEnergy: 8, budgetRange: 5, pace: 'Active' },
    imageUrl:
      'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?auto=format&fit=crop&w=1000&q=80',
    isVerified: true,
    route: 'Alfama -> Bairro Alto -> Belem',
    duration: '6 Days',
    totalExpectedFromPartner: 1440,
    partnerExpectations: ['Group dinners on 4 nights', 'On-time for tours', 'Shared transport splits'],
    notes: 'Ideal for social travelers who enjoy local cuisine and live music scenes.',
    highlights: ['Pastel workshop', 'Fado night', 'Sunset miradouro crawl'],
  },
  {
    id: 'trip-3',
    title: 'Patagonia Trek Crew Trip',
    hostName: 'Sofia',
    priceShare: 510,
    matchPercentage: 95,
    tripDNA: { socialEnergy: 6, budgetRange: 7, pace: 'Active' },
    imageUrl:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80',
    isVerified: false,
    route: 'El Calafate -> El Chalten -> Torres del Paine',
    duration: '10 Days',
    totalExpectedFromPartner: 2040,
    partnerExpectations: ['Moderate hiking fitness', 'Packing discipline', 'Early start commitment'],
    notes: 'Weather can be unpredictable. Looking for resilient and supportive teammates.',
    highlights: ['Laguna de los Tres trek', 'Glacier viewpoints', 'Mountain cabin nights'],
  },
  {
    id: 'trip-4',
    title: 'Tokyo Culture + Cafe Crawl',
    hostName: 'Kenji',
    priceShare: 470,
    matchPercentage: 84,
    tripDNA: { socialEnergy: 6, budgetRange: 7, pace: 'Chill' },
    imageUrl:
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1000&q=80',
    isVerified: true,
    route: 'Shibuya -> Asakusa -> Shimokitazawa',
    duration: '7 Days',
    totalExpectedFromPartner: 1880,
    partnerExpectations: ['Respectful group etiquette', 'Flexible train schedules', 'Cafe budget planning'],
    notes: 'Great fit for creative travelers into design, city walks, and niche food spots.',
    highlights: ['Vintage district crawl', 'Ramen map challenge', 'Digital art museum'],
  },
  {
    id: 'trip-5',
    title: 'Iceland Northern Lights Drive',
    hostName: 'Leah',
    priceShare: 640,
    matchPercentage: 90,
    tripDNA: { socialEnergy: 4, budgetRange: 8, pace: 'Active' },
    imageUrl:
      'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1000&q=80',
    isVerified: true,
    route: 'Reykjavik -> Vik -> Jokulsarlon',
    duration: '8 Days',
    totalExpectedFromPartner: 2560,
    partnerExpectations: ['Shared driving rotation', 'Cold-weather readiness', 'Photo stop flexibility'],
    notes: 'Trip pace depends on weather windows. Team coordination is important.',
    highlights: ['Ice cave tour', 'Aurora hunting', 'Black sand beach sunrise'],
  },
  {
    id: 'trip-6',
    title: 'Cartagena Beach + Music Weekend',
    hostName: 'Nico',
    priceShare: 330,
    matchPercentage: 86,
    tripDNA: { socialEnergy: 9, budgetRange: 4, pace: 'Active' },
    imageUrl:
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1000&q=80',
    isVerified: false,
    route: 'Getsemani -> Rosario Islands -> Old Town',
    duration: '5 Days',
    totalExpectedFromPartner: 1320,
    partnerExpectations: ['Social group activities', 'Beach day contribution', 'Music event participation'],
    notes: 'Fun-focused trip with vibrant nightlife and island day plans.',
    highlights: ['Island boat day', 'Salsa night', 'Historic city bike ride'],
  },
];
