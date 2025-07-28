
export enum UserRole {
  CLIENT = 'Client',
  COURIER = 'Courier',
  ASSIGNING_USER = 'Assigning User',
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

export interface Transaction {
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