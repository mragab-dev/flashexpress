

export const ZONES = {
  "GreaterCairo": {
    "Cairo": [
      "Nasr City",
      "Heliopolis",
      "New Cairo",
      "5th Settlement",
      "3rd Settlement",
      "1st Settlement",
      "Rehab City",
      "Madinty",
      "El Shorouk",
      "El Obour",
      "Maadi",
      "Zahraa El Maadi",
      "Katameya",
      "Mokattam",
      "Downtown Cairo",
      "Garden City",
      "Zamalek",
      "Shubra",
      "Abbassia",
      "Ain Shams",
      "El Marg",
      "Matariya",
      "Helwan",
      "15th of May City",
      "New Administrative Capital"
    ],
    "Giza": [
      "Mohandessin",
      "Dokki",
      "Agouza",
      "Haram",
      "Faisal",
      "Giza Square",
      "Imbaba",
      "Boulak El Dakrour",
      "Warraq",
      "6th of October City",
      "Sheikh Zayed",
      "Hadayek October",
      "Mansoureya",
      "Nazlet El Semman",
      "Maryoteya",
      "Bahariya Oasis Road"
    ]
  },
  "Alexandria": [
    "Alexandria - Raml Station",
    "Alexandria - Laurent",
    "Alexandria - Smouha",
    "Alexandria - Asafra",
  ],
  "Other": [
    "Other - Shibin El Kom",
    "Other - Port Said",
    "Other - Mansoura (University)",
    "Other - Mansoura (El Geish)",
    "Other - Tanta",
    "Other - Ismailia",
    "Other - Zagazig",
    "Other - Suez",
    "Other - Mahalla",
    "Other - Assiut",
    "Other - Marina",
    "Other - Hurghada",
    "Other - Matrouh",
  ]
};


export enum UserRole {
  CLIENT = 'Client',
  COURIER = 'Courier',
  ASSIGNING_USER = 'Assigning User',
  SUPER_USER = 'Super User',
  ADMIN = 'Administrator',
}

export enum ShipmentStatus {
  WAITING_FOR_PACKAGING = 'Waiting for Packaging',
  PACKAGED_AND_WAITING_FOR_ASSIGNMENT = 'Packaged and Waiting for Assignment',
  ASSIGNED_TO_COURIER = 'Assigned to Courier',
  PICKED_UP = 'Picked Up',
  IN_TRANSIT = 'In Transit',
  OUT_FOR_DELIVERY = 'Out for Delivery',
  DELIVERED = 'Delivered',
  DELIVERY_FAILED = 'Delivery Failed',
}

export enum PaymentMethod {
  COD = 'Cash on Delivery',
  INSTAPAY = 'InstaPay',
  WALLET = 'Wallet',
}

export enum ShipmentPriority {
    STANDARD = 'Standard',
    URGENT = 'Urgent',
    EXPRESS = 'Express',
}

export interface Address {
  street: string;
  city: string; // e.g., 'Cairo', 'Giza', 'Alexandria', 'Other'
  zone: string; // e.g., 'Nasr City', 'Mohandessin'
  details: string;
}

export interface User {
  id: number;
  publicId: string;
  name: string;
  email: string;
  password?: string; // Made optional as it's not always present on the client
  roles: string[]; // Replaced role: string
  zones?: string[]; // For couriers
  walletBalance?: number; // For clients
  flatRateFee?: number; // For clients
  phone?: string; // Phone number
  
  location?: { lat: number; lng: number };
  
  // Priority pricing multipliers for clients (defaults: Standard=1.0, Urgent=1.5, Express=2.0)
  priorityMultipliers?: {
    [ShipmentPriority.STANDARD]: number;
    [ShipmentPriority.URGENT]: number;
    [ShipmentPriority.EXPRESS]: number;
  };
  
  address?: Address; // Optional default address for clients (pickup location)
  taxCardNumber?: string; // Client-specific tax card number (only admins can set)
  permissions?: Permission[]; // For RBAC, populated client-side

  // For courier referrals
  referrerId?: number; // ID of the courier who referred this one
  referralCommission?: number; // Amount the referee gets per delivery
}

export interface PackagingLogEntry {
    inventoryItemId: string;
    itemName: string;
    quantityUsed: number;
}

export interface StatusHistoryEntry {
    status: ShipmentStatus;
    timestamp: string;
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
  failureReason?: string; // reason for delivery failure
  failurePhotoPath?: string; // path to the failure evidence photo
  priority: ShipmentPriority;
  packageValue: number;
  clientFlatRateFee?: number; // Snapshot of client's fee at creation
  courierCommission?: number; // Snapshot of courier's commission at assignment
  packagingNotes?: string;
  packagingLog?: PackagingLogEntry[];
  statusHistory?: StatusHistoryEntry[];
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
    REFERRAL_BONUS = 'Referral Bonus', // New type
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

// --- Role-Based Access Control (RBAC) Types ---

export enum Permission {
  // User Management
  MANAGE_USERS = 'manage_users', // Create, edit, delete users
  MANAGE_ROLES = 'manage_roles', // Create, edit, delete roles and permissions
  
  // Shipment Management
  CREATE_SHIPMENTS = 'create_shipments',
  VIEW_OWN_SHIPMENTS = 'view_own_shipments',
  VIEW_ALL_SHIPMENTS = 'view_all_shipments',
  ASSIGN_SHIPMENTS = 'assign_shipments',
  
  // Courier-specific tasks
  VIEW_COURIER_TASKS = 'view_courier_tasks',
  UPDATE_SHIPMENT_STATUS = 'update_shipment_status',
  VIEW_COURIER_COMPLETED_ORDERS = 'view_courier_completed_orders',
  
  // Financials
  VIEW_OWN_WALLET = 'view_own_wallet',
  VIEW_OWN_FINANCIALS = 'view_own_financials',
  VIEW_ADMIN_FINANCIALS = 'view_admin_financials', // Top-level company financials
  VIEW_CLIENT_ANALYTICS = 'view_client_analytics',
  VIEW_COURIER_PERFORMANCE = 'view_courier_performance',
  MANAGE_COURIER_PAYOUTS = 'manage_courier_payouts',
  VIEW_COURIER_EARNINGS = 'view_courier_earnings',
  
  // System & Logs
  VIEW_NOTIFICATIONS_LOG = 'view_notifications_log',
  VIEW_DASHBOARD = 'view_dashboard',
  VIEW_PROFILE = 'view_profile',
  VIEW_TOTAL_SHIPMENTS_OVERVIEW = 'view_total_shipments_overview',

  // Inventory Management
  MANAGE_INVENTORY = 'manage_inventory',
  DELETE_INVENTORY_ITEM = 'delete_inventory_item',

  // Asset Management
  MANAGE_ASSETS = 'manage_assets',
  VIEW_OWN_ASSETS = 'view_own_assets',
  DELETE_ASSET = 'delete_asset',
}

export interface CustomRole {
  id: string;
  name: string;
  permissions: Permission[];
  isSystemRole?: boolean; // System roles cannot be deleted
}

// --- Inventory Management Types ---
export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
    lastUpdated: string;
    minStock?: number;
    unitPrice?: number;
}

// --- Asset Management Types ---
export enum AssetType {
    MOTORCYCLE = 'Motorcycle',
    BOX = 'Delivery Box',
    TSHIRT = 'T-Shirt',
    DEVICE = 'Device',
}

export enum AssetStatus {
    AVAILABLE = 'Available',
    ASSIGNED = 'Assigned',
    IN_REPAIR = 'In Repair',
}

export interface Asset {
    id: string;
    type: AssetType;
    name: string;
    identifier?: string; // e.g., license plate, serial number
    status: AssetStatus;
    assignedToUserId?: number;
    assignmentDate?: string;
}
