export interface Bid {
  id: string;
  carrier_id?: string;
  carrierName: string;
  carrierMc: string;
  amount: number;
  rating: number;
  status: "pending" | "accepted" | "rejected";
  submittedAt: string;
}

export interface Load {
  id: string;
  db_id?: string;
  shipperName: string;
  carrierName: string | null;
  originCity: string;
  originState: string;
  destinationCity: string;
  destinationState: string;
  pickupDate: string;
  deliveryDate: string;
  rate: number;
  margin: number; // profit margin for broker (e.g. rate is what shipper pays, margin is what broker keeps)
  shipperPrice: number; // rate + margin
  status: "posted" | "booked" | "in_transit" | "delivered" | "completed" | "cancelled";
  weightLbs: number;
  equipmentType: "Reefer" | "Flatbed" | "Dry Van" | "Power Only";
  description: string;
  createdAt: string;
  bids: Bid[];
  carrierSignature?: string;
  signedAt?: string;
}

export interface CarrierCompliance {
  id: string;
  companyName: string;
  mcNumber: string;
  dotNumber: string;
  insuranceStatus: "compliant" | "non_compliant" | "pending";
  insuranceExpiration: string;
  cargoLimit: number;
  autoLimit: number;
  w9Status: "verified" | "missing" | "pending_review";
  safetyRating: "Satisfactory" | "Conditional" | "Unsatisfactory";
}

export const INITIAL_LOADS: Load[] = [
  {
    id: "L-9081",
    shipperName: "Cargill Agriculture",
    carrierName: "Apex Trucking Inc.",
    originCity: "Minneapolis",
    originState: "MN",
    destinationCity: "Chicago",
    destinationState: "IL",
    pickupDate: "2026-07-18",
    deliveryDate: "2026-07-19",
    rate: 1450,
    margin: 250,
    shipperPrice: 1700,
    status: "booked",
    weightLbs: 43500,
    equipmentType: "Reefer",
    description: "Palletized grain product. Temp controlled at 45°F.",
    createdAt: "2026-07-15",
    bids: []
  },
  {
    id: "L-9082",
    shipperName: "Georgia Pacific",
    carrierName: null,
    originCity: "Savannah",
    originState: "GA",
    destinationCity: "Dallas",
    destinationState: "TX",
    pickupDate: "2026-07-20",
    deliveryDate: "2026-07-22",
    rate: 2200,
    margin: 400,
    shipperPrice: 2600,
    status: "posted",
    weightLbs: 45000,
    equipmentType: "Dry Van",
    description: "Paper rolls. Secure with straps, dry van required.",
    createdAt: "2026-07-16",
    bids: [
      {
        id: "B-201",
        carrierName: "Swift Logistics",
        carrierMc: "MC-789012",
        amount: 2150,
        rating: 4.6,
        status: "pending",
        submittedAt: "2026-07-16T10:15:00Z"
      },
      {
        id: "B-202",
        carrierName: "J.B. Hunt Express",
        carrierMc: "MC-456789",
        amount: 2300,
        rating: 4.9,
        status: "pending",
        submittedAt: "2026-07-16T11:30:00Z"
      }
    ]
  },
  {
    id: "L-9083",
    shipperName: "Tesla Gigafactory",
    carrierName: "Ironclad Heavy Haul",
    originCity: "Austin",
    originState: "TX",
    destinationCity: "Fremont",
    destinationState: "CA",
    pickupDate: "2026-07-15",
    deliveryDate: "2026-07-18",
    rate: 4200,
    margin: 800,
    shipperPrice: 5000,
    status: "in_transit",
    weightLbs: 38000,
    equipmentType: "Flatbed",
    description: "Machinery components. Oversized load tags required.",
    createdAt: "2026-07-14",
    bids: []
  },
  {
    id: "L-9084",
    shipperName: "Anheuser-Busch",
    carrierName: "Roadrunners Inc.",
    originCity: "St. Louis",
    originState: "MO",
    destinationCity: "Denver",
    destinationState: "CO",
    pickupDate: "2026-07-12",
    deliveryDate: "2026-07-14",
    rate: 1950,
    margin: 300,
    shipperPrice: 2250,
    status: "delivered",
    weightLbs: 44000,
    equipmentType: "Reefer",
    description: "Beverages. Keep temp at 38°F. Multi-stop load.",
    createdAt: "2026-07-10",
    bids: []
  },
  {
    id: "L-9085",
    shipperName: "Home Depot Co.",
    carrierName: "Interstate Freight",
    originCity: "Atlanta",
    originState: "GA",
    destinationCity: "Orlando",
    destinationState: "FL",
    pickupDate: "2026-07-10",
    deliveryDate: "2026-07-11",
    rate: 1100,
    margin: 200,
    shipperPrice: 1300,
    status: "completed",
    weightLbs: 35000,
    equipmentType: "Dry Van",
    description: "Building materials. Forklift unload at dock.",
    createdAt: "2026-07-09",
    bids: []
  }
];

export const INITIAL_COMPLIANCE: CarrierCompliance[] = [
  {
    id: "C-001",
    companyName: "Apex Trucking Inc.",
    mcNumber: "MC-342981",
    dotNumber: "DOT-8897621",
    insuranceStatus: "compliant",
    insuranceExpiration: "2027-02-18",
    cargoLimit: 250000,
    autoLimit: 1000000,
    w9Status: "verified",
    safetyRating: "Satisfactory"
  },
  {
    id: "C-002",
    companyName: "Swift Logistics",
    mcNumber: "MC-789012",
    dotNumber: "DOT-5544192",
    insuranceStatus: "compliant",
    insuranceExpiration: "2026-11-05",
    cargoLimit: 150000,
    autoLimit: 1000000,
    w9Status: "verified",
    safetyRating: "Satisfactory"
  },
  {
    id: "C-003",
    companyName: "J.B. Hunt Express",
    mcNumber: "MC-456789",
    dotNumber: "DOT-1239841",
    insuranceStatus: "compliant",
    insuranceExpiration: "2027-05-30",
    cargoLimit: 500000,
    autoLimit: 2000000,
    w9Status: "verified",
    safetyRating: "Satisfactory"
  },
  {
    id: "C-004",
    companyName: "Ironclad Heavy Haul",
    mcNumber: "MC-110022",
    dotNumber: "DOT-7766554",
    insuranceStatus: "compliant",
    insuranceExpiration: "2026-08-25",
    cargoLimit: 1000000,
    autoLimit: 5000000,
    w9Status: "verified",
    safetyRating: "Satisfactory"
  },
  {
    id: "C-005",
    companyName: "Wildcat Transport",
    mcNumber: "MC-998811",
    dotNumber: "DOT-6611223",
    insuranceStatus: "non_compliant",
    insuranceExpiration: "2026-06-15", // Expired
    cargoLimit: 100000,
    autoLimit: 500000, // Insufficient Auto limit
    w9Status: "missing",
    safetyRating: "Conditional"
  },
  {
    id: "C-006",
    companyName: "Roadrunners Inc.",
    mcNumber: "MC-662233",
    dotNumber: "DOT-3322119",
    insuranceStatus: "pending",
    insuranceExpiration: "2026-07-20",
    cargoLimit: 100000,
    autoLimit: 1000000,
    w9Status: "pending_review",
    safetyRating: "Satisfactory"
  }
];
