

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
  CAIRO_ZONE_A = 'Cairo - Zone A',
  CAIRO_ZONE_B = 'Cairo - Zone B',
  GIZA_ZONE_A = 'Giza - Zone A',
  GIZA_ZONE_B = 'Giza - Zone B',
}

export enum ShipmentPriority {
    STANDARD = 'Standard',
    URGENT = 'Urgent',
    EXPRESS = 'Express',
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface Address {
  street: string;
  city: 'Cairo' | 'Giza';
  zone: Zone;
  details: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string; // Made optional for existing data, but required for new users
  role: UserRole;
  zone?: Zone;
  walletBalance?: number;
  phone?: string;
  address?: Address;
  location?: GeoLocation;
  flatRateFee?: number; // Client-specific flat rate fee (only for clients)
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
  signature?: string; // base64 encoded image
  priority: ShipmentPriority;
  packageValue: number;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
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
  bonusThreshold: number;
  urgentDeliveryBonus: number;
  expressDeliveryBonus: number;
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
  grossRevenue: number;
  netRevenue: number;
  totalClientFees: number;
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
