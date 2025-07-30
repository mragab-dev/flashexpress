

export interface GeoLocation {
  lat: number;
  lng: number;
}

export enum UserRole {
  CLIENT = 'Client',
  COURIER = 'Courier',
  ASSIGNING_USER = 'Assigning User',
  SUPER_USER = 'Super User',
  ADMIN = 'Administrator',
}

export enum ShipmentStatus {
  PENDING_ASSIGNMENT = 'Pending Assignment',
  ASSIGNED_TO_COURIER = 'Assigned to Courier',
  PICKED_UP = 'Picked Up',
  IN_TRANSIT = 'In Transit',
  OUT_FOR_DELIVERY = 'Out for Delivery',
  DELIVERED = 'Delivered',
  DELIVERY_FAILED = 'Delivery Failed',
  RETURN_REQUESTED = 'Return Requested',
  RETURN_IN_PROGRESS = 'Return in Progress',
  RETURNED = 'Returned',
}

export enum PaymentMethod {
  COD = 'Cash on Delivery',
  INSTAPAY = 'InstaPay',
  WALLET = 'Wallet',
}

export enum Zone {
  // Cairo Areas
  CAIRO_DOWNTOWN = 'Cairo - Downtown (El Alfy)',
  CAIRO_HELIOPOLIS_SHERATON = 'Cairo - Heliopolis (Sheraton)',
  CAIRO_HELIOPOLIS_HEGAZ = 'Cairo - Heliopolis (Hegaz Square)',
  CAIRO_HELIOPOLIS_ROXY = 'Cairo - Heliopolis (Roxy)',
  CAIRO_HELIOPOLIS_SARAY = 'Cairo - Heliopolis (Saray El Qobba)',
  CAIRO_HELIOPOLIS_SUDAN = 'Cairo - Heliopolis (Misr w Sudan)',
  CAIRO_NASR_CITY_10TH = 'Cairo - Nasr City (10th District)',
  CAIRO_NASR_CITY_ABBAS = 'Cairo - Nasr City (Abbas El Akkad)',
  CAIRO_NASR_CITY_TAYARAN = 'Cairo - Nasr City (Tayaran St)',
  CAIRO_NASR_CITY_MAKRAM = 'Cairo - Nasr City (Makram Ebeid)',
  CAIRO_REHAB = 'Cairo - Rehab City',
  CAIRO_REHAB_SHELL = 'Cairo - Rehab City (Chill Out)',
  CAIRO_NEW_CAIRO_GOLDEN = 'Cairo - New Cairo (Golden Square)',
  CAIRO_NEW_CAIRO_SILVER = 'Cairo - New Cairo (Silver Star)',
  CAIRO_NEW_CAIRO_1ST = 'Cairo - New Cairo (1st Settlement)',
  CAIRO_NEW_CAIRO_90TH = 'Cairo - New Cairo (90th St)',
  CAIRO_MAADI_9 = 'Cairo - Maadi (Street 9)',
  CAIRO_MAADI_ZAHRA = 'Cairo - Maadi (Zahraa)',
  CAIRO_MOKATTAM = 'Cairo - Mokattam',
  CAIRO_SHOROUK = 'Cairo - Shorouk City',
  CAIRO_MADINATY = 'Cairo - Madinaty',
  CAIRO_OBOUR = 'Cairo - Obour City',
  CAIRO_SHUBRA = 'Cairo - Shubra',
  CAIRO_TALAAT_HARB = 'Cairo - Talaat Harb',
  CAIRO_HELWAN = 'Cairo - Helwan',
  CAIRO_AIN_SHAMS = 'Cairo - Ain Shams',
  
  // Giza Areas
  GIZA_HARAM = 'Giza - Haram',
  GIZA_FAISAL = 'Giza - Faisal',
  GIZA_FAISAL_MATBAA = 'Giza - Faisal (Matbaa)',
  GIZA_IMBABA = 'Giza - Imbaba',
  GIZA_HADAYEK_AHRAM = 'Giza - Hadayek El Ahram',
  GIZA_HADAYEK_AHRAM_2 = 'Giza - Hadayek El Ahram 2',
  GIZA_SHEIKH_ZAYED = 'Giza - Sheikh Zayed',
  GIZA_DAHSHOUR = 'Giza - Dahshur Link',
  GIZA_MOHANDISEEN = 'Giza - Mohandiseen',
  GIZA_MANIL = 'Giza - Manial',
  GIZA_OCTOBER_HOSARY = 'Giza - 6th of October (Hosary)',
  GIZA_DOKKI = 'Giza - Dokki',
  GIZA_OCTOBER_MOTAMAYEZ = 'Giza - 6th of October (Motamayez)',
  
  // Alexandria Areas
  ALEXANDRIA_RAML = 'Alexandria - Raml Station',
  ALEXANDRIA_LAURENT = 'Alexandria - Laurent',
  ALEXANDRIA_SMOUHA = 'Alexandria - Smouha',
  ALEXANDRIA_ASAFRA = 'Alexandria - Asafra',
  
  // Other Governorates
  OTHER_SHUBIN_KOM = 'Other - Shibin El Kom',
  OTHER_PORT_SAID = 'Other - Port Said',
  OTHER_MANSOURA_UNIVERSITY = 'Other - Mansoura (University)',
  OTHER_MANSOURA_GEISH = 'Other - Mansoura (El Geish)',
  OTHER_TANTA = 'Other - Tanta',
  OTHER_ISMAILIA = 'Other - Ismailia',
  OTHER_ZAGAZIG = 'Other - Zagazig',
  OTHER_SUEZ = 'Other - Suez',
  OTHER_MAHALLA = 'Other - Mahalla',
  OTHER_ASSIUT = 'Other - Assiut',
  OTHER_MARINA = 'Other - Marina',
  OTHER_HURGHADA = 'Other - Hurghada',
  OTHER_MATROUH = 'Other - Matrouh',
}

export enum ShipmentPriority {
    STANDARD = 'Standard',
    URGENT = 'Urgent',
    EXPRESS = 'Express',
}

export interface Address {
  street: string;
  city: 'Cairo' | 'Giza' | 'Alexandria' | 'Other';
  zone: Zone;
  details: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  zone?: Zone; // For couriers
  walletBalance?: number; // For couriers
  flatRateFee?: number; // For clients
  phone?: string; // Phone number
  location?: GeoLocation; // For couriers (GPS location)
  
  // Priority pricing multipliers for clients (defaults: Standard=1.0, Urgent=1.5, Express=2.0)
  priorityMultipliers?: {
    [ShipmentPriority.STANDARD]: number;
    [ShipmentPriority.URGENT]: number;
    [ShipmentPriority.EXPRESS]: number;
  };
  
  address?: Address; // Optional default address for clients (pickup location)
  taxCardNumber?: string; // Client-specific tax card number (only admins can set)
}

export interface Shipment {
  id: string;
  clientId: number;
  clientName: string;
  recipientName: string;
  recipientPhone: string;
  fromAddress: Address;
  toAddress: Address;
  packageDescription: string;
  isLargeOrder: boolean;
  price: number;
  paymentMethod: PaymentMethod;
  status: ShipmentStatus;
  courierId?: number;
  creationDate: string;
  deliveryDate?: string;
  deliveryPhoto?: string; // base64 encoded image for delivery proof
  failureReason?: string; // reason for delivery failure
  priority: ShipmentPriority;
  packageValue: number;
  clientFlatRateFee?: number; // Snapshot of client's fee at creation
  courierCommission?: number; // Snapshot of courier's commission at assignment
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number; // Auto-dismiss duration in milliseconds (default: 10000)
}

export enum TransactionType {
    DEPOSIT = 'Deposit',
    PAYMENT = 'Payment',
}

export interface ClientTransaction {
    id: string;
    userId: number;
    type: TransactionType;
    amount: number;
    date: string;
    description: string;
}

export enum NotificationChannel {
  EMAIL = 'Email',
  SMS = 'SMS',
}

export interface Notification {
  id: string;
  shipmentId: string;
  channel: NotificationChannel;
  recipient: string;
  message: string;
  date: string;
  status: ShipmentStatus;
  sent: boolean; // Track if the notification has been actioned
}

// --- New Courier Financial System Types ---

export interface FinancialSettings {
  baseCommissionRate: number;
  penaltyAmount: number;
  consecutiveFailureLimit: number;
  performanceThreshold: number;
}

export enum CommissionType {
    FLAT = 'flat',
    PERCENTAGE = 'percentage'
}

export interface CourierStats {
  courierId: number;
  deliveriesCompleted: number;
  deliveriesFailed: number;
  totalEarnings: number;
  pendingEarnings: number; // For payouts
  currentBalance: number; // totalEarnings - withdrawals
  commissionType: CommissionType;
  commissionValue: number;
  consecutiveFailures: number;
  lastDeliveryDate?: string;
  isRestricted: boolean;
  restrictionReason?: string;
  performanceRating: number;
}

export enum CourierTransactionType {
    COMMISSION = 'Commission',
    PENALTY = 'Penalty',
    BONUS = 'Bonus',
    WITHDRAWAL_REQUEST = 'Withdrawal Request',
    WITHDRAWAL_PROCESSED = 'Withdrawal Processed',
}

export enum CourierTransactionStatus {
    PENDING = 'Pending',
    PROCESSED = 'Processed',
    FAILED = 'Failed',
}

export interface CourierTransaction {
  id: string;
  courierId: number;
  type: CourierTransactionType;
  amount: number;
  description: string;
  shipmentId?: string;
  timestamp: string;
  status: CourierTransactionStatus;
}

// Admin Financial System Types
export interface AdminFinancials {
  // New enhanced metrics
  totalCollectedMoney: number; // Money collected by couriers (delivered packages)
  undeliveredPackagesValue: number; // Value of packages not yet delivered
  failedDeliveriesValue: number; // Value of packages that failed to deliver
  totalRevenue: number; // Sum of packageValue for all delivered packages
  totalFees: number; // Sum of flat rates of all orders
  totalCommission: number; // Total commission paid for all orders
  netRevenue: number; // Total Revenue + Total Fees - Total Commission
  
  // Legacy fields (keeping for backward compatibility)
  grossRevenue: number;
  totalClientFees: number;
  totalCourierPayouts: number;
  totalOrders: number;
  taxCarNumber: string;
}

export interface ClientFinancialSummary {
  clientId: number;
  clientName: string;
  totalOrders: number;
  orderSum: number;
  flatRateFee: number;
}