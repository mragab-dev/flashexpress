

import { User, Shipment, UserRole, Zone, ShipmentStatus, PaymentMethod, ClientTransaction, TransactionType, Notification, FinancialSettings, CourierStats, CommissionType, CourierTransaction, ShipmentPriority } from './types';

// In a real app, passwords would be hashed. For this demo, we use plaintext.
export const mockUsers: User[] = [
  { id: 1, name: 'Admin User', email: 'admin@flash.com', password: 'password123', role: UserRole.ADMIN },
  { id: 2, name: 'Super User One', email: 'superuser1@flash.com', password: 'password123', role: UserRole.SUPER_USER },
  { id: 3, name: 'Assigner One', email: 'assigner1@flash.com', password: 'password123', role: UserRole.ASSIGNING_USER },
  { 
    id: 4, 
    name: 'Client Alice', 
    email: 'alice@example.com', 
    password: 'password123', 
    role: UserRole.CLIENT, 
    walletBalance: 1500,
    phone: '01012345678',
    address: { street: '123 Maadi St', city: 'Cairo', zone: Zone.CAIRO_ZONE_A, details: 'Apt 5' },
    flatRateFee: 5.0,
    taxCardNumber: '123-456-789'
  },
  { 
    id: 5, 
    name: 'Client Bob', 
    email: 'bob@example.com', 
    password: 'password123', 
    role: UserRole.CLIENT, 
    walletBalance: 250,
    phone: '01187654321',
    address: { street: '789 Dokki St', city: 'Giza', zone: Zone.GIZA_ZONE_A, details: 'Villa 10' },
    flatRateFee: 7.5,
    taxCardNumber: '987-654-321'
  },
  // Couriers for Cairo Zone A
  { id: 6, name: 'Courier Ahmed', email: 'ahmed@flash.com', password: 'password123', role: UserRole.COURIER, zone: Zone.CAIRO_ZONE_A, location: { lat: 30.0444, lng: 31.2357 } },
  { id: 10, name: 'Courier Youssef', email: 'youssef@flash.com', password: 'password123', role: UserRole.COURIER, zone: Zone.CAIRO_ZONE_A, location: { lat: 30.0626, lng: 31.2497 } },
  
  // Couriers for Cairo Zone B
  { id: 8, name: 'Courier Omar', email: 'omar@flash.com', password: 'password123', role: UserRole.COURIER, zone: Zone.CAIRO_ZONE_B, location: { lat: 30.0769, lng: 31.3436 } },
  { id: 11, name: 'Courier Mariam', email: 'mariam@flash.com', password: 'password123', role: UserRole.COURIER, zone: Zone.CAIRO_ZONE_B, location: { lat: 30.0875, lng: 31.3284 } },
  
  // Couriers for Giza Zone A
  { id: 9, name: 'Courier Layla', email: 'layla@flash.com', password: 'password123', role: UserRole.COURIER, zone: Zone.GIZA_ZONE_A, location: { lat: 30.0131, lng: 31.2089 } },
  { id: 12, name: 'Courier Hassan', email: 'hassan@flash.com', password: 'password123', role: UserRole.COURIER, zone: Zone.GIZA_ZONE_A, location: { lat: 30.0254, lng: 31.2113 } },
  
  // Couriers for Giza Zone B
  { id: 7, name: 'Courier Fatima', email: 'fatima@flash.com', password: 'password123', role: UserRole.COURIER, zone: Zone.GIZA_ZONE_B, location: { lat: 29.9792, lng: 31.1342 } },
  { id: 13, name: 'Courier Amr', email: 'amr@flash.com', password: 'password123', role: UserRole.COURIER, zone: Zone.GIZA_ZONE_B, location: { lat: 29.9756, lng: 31.1378 } },
];

export const mockShipments: Shipment[] = [
  {
    id: 'FLS' + Math.floor(Math.random() * 900000 + 100000),
    clientId: 4,
    clientName: 'Client Alice',
    recipientName: 'John Doe',
    recipientPhone: '01234567890',
    fromAddress: { street: '123 Maadi St', city: 'Cairo', zone: Zone.CAIRO_ZONE_A, details: 'Apt 5' },
    toAddress: { street: '456 Nasr City St', city: 'Cairo', zone: Zone.CAIRO_ZONE_B, details: 'Bldg 2' },
    packageDescription: 'Box of electronics',
    isLargeOrder: false,
    price: 75,
    paymentMethod: PaymentMethod.COD,
    status: ShipmentStatus.PENDING_ASSIGNMENT,
    creationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    priority: ShipmentPriority.STANDARD,
    packageValue: 800,
  },
  {
    id: 'FLS' + Math.floor(Math.random() * 900000 + 100000),
    clientId: 5,
    clientName: 'Client Bob',
    recipientName: 'Jane Smith',
    recipientPhone: '01123456789',
    fromAddress: { street: '789 Dokki St', city: 'Giza', zone: Zone.GIZA_ZONE_A, details: 'Villa 10' },
    toAddress: { street: '101 Haram St', city: 'Giza', zone: Zone.GIZA_ZONE_B, details: 'Floor 3' },
    packageDescription: 'Large furniture item',
    isLargeOrder: true,
    price: 450,
    paymentMethod: PaymentMethod.INSTAPAY,
    status: ShipmentStatus.IN_TRANSIT,
    courierId: 7,
    creationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    priority: ShipmentPriority.STANDARD,
    packageValue: 3000,
  },
  {
    id: 'FLS' + Math.floor(Math.random() * 900000 + 100000),
    clientId: 4,
    clientName: 'Client Alice',
    recipientName: 'Sam Wilson',
    recipientPhone: '01098765432',
    fromAddress: { street: '123 Maadi St', city: 'Cairo', zone: Zone.CAIRO_ZONE_A, details: 'Apt 5' },
    toAddress: { street: '213 Zamalek Ave', city: 'Cairo', zone: Zone.CAIRO_ZONE_A, details: 'Office 404' },
    packageDescription: 'Documents',
    isLargeOrder: false,
    price: 75,
    paymentMethod: PaymentMethod.WALLET,
    status: ShipmentStatus.OUT_FOR_DELIVERY,
    courierId: 6,
    creationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    priority: ShipmentPriority.URGENT,
    packageValue: 100,
  },
    {
    id: 'FLS' + Math.floor(Math.random() * 900000 + 100000),
    clientId: 5,
    clientName: 'Client Bob',
    recipientName: 'Emily Carter',
    recipientPhone: '01555123456',
    fromAddress: { street: '789 Dokki St', city: 'Giza', zone: Zone.GIZA_ZONE_A, details: 'Villa 10' },
    toAddress: { street: '321 Mohandessin Rd', city: 'Giza', zone: Zone.GIZA_ZONE_A, details: 'Shop 7' },
    packageDescription: 'Fashion apparel',
    isLargeOrder: false,
    price: 75,
    paymentMethod: PaymentMethod.COD,
    status: ShipmentStatus.DELIVERED,
    courierId: 9,
    creationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    priority: ShipmentPriority.EXPRESS,
    packageValue: 1200,
  },
];

export const mockClientTransactions: ClientTransaction[] = [
    {
        id: 'TXN' + Math.floor(Math.random() * 900000 + 100000),
        userId: 4,
        type: TransactionType.DEPOSIT,
        amount: 2000,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Initial wallet deposit'
    },
    {
        id: 'TXN' + Math.floor(Math.random() * 900000 + 100000),
        userId: 4,
        type: TransactionType.PAYMENT,
        amount: -75,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Payment for shipment to Sam Wilson'
    },
     {
        id: 'TXN' + Math.floor(Math.random() * 900000 + 100000),
        userId: 5,
        type: TransactionType.DEPOSIT,
        amount: 500,
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Bank Transfer Top-up'
    },
];

export const mockNotifications: Notification[] = [];

// --- New Financial System Data ---

export const mockFinancialSettings: FinancialSettings = {
    baseCommissionRate: 15,
    penaltyAmount: 10,
    consecutiveFailureLimit: 3,
    performanceThreshold: 2.0,
    bonusThreshold: 50,
    urgentDeliveryBonus: 5,
    expressDeliveryBonus: 10,
};

export const mockCourierStats: CourierStats[] = [
    { courierId: 6, deliveriesCompleted: 45, deliveriesFailed: 2, totalEarnings: 685.00, pendingEarnings: 45.00, currentBalance: 640.00, commissionType: CommissionType.FLAT, commissionValue: 15, consecutiveFailures: 0, isRestricted: false, performanceRating: 4.7 },
    { courierId: 7, deliveriesCompleted: 80, deliveriesFailed: 10, totalEarnings: 1200.00, pendingEarnings: 200.00, currentBalance: 1000.00, commissionType: CommissionType.FLAT, commissionValue: 15, consecutiveFailures: 1, isRestricted: false, performanceRating: 4.2 },
    { courierId: 8, deliveriesCompleted: 20, deliveriesFailed: 5, totalEarnings: 250.00, pendingEarnings: 0, currentBalance: 250.00, commissionType: CommissionType.PERCENTAGE, commissionValue: 10, consecutiveFailures: 2, isRestricted: true, restrictionReason: 'Performance rating too low', performanceRating: 1.8 },
    { courierId: 9, deliveriesCompleted: 150, deliveriesFailed: 3, totalEarnings: 2500.00, pendingEarnings: 500.00, currentBalance: 2000.00, commissionType: CommissionType.FLAT, commissionValue: 18, consecutiveFailures: 0, isRestricted: false, performanceRating: 4.9 },
    { courierId: 10, deliveriesCompleted: 35, deliveriesFailed: 1, totalEarnings: 520.00, pendingEarnings: 75.00, currentBalance: 445.00, commissionType: CommissionType.FLAT, commissionValue: 15, consecutiveFailures: 0, isRestricted: false, performanceRating: 4.8 },
    { courierId: 11, deliveriesCompleted: 62, deliveriesFailed: 4, totalEarnings: 895.00, pendingEarnings: 120.00, currentBalance: 775.00, commissionType: CommissionType.FLAT, commissionValue: 15, consecutiveFailures: 0, isRestricted: false, performanceRating: 4.5 },
    { courierId: 12, deliveriesCompleted: 28, deliveriesFailed: 2, totalEarnings: 410.00, pendingEarnings: 45.00, currentBalance: 365.00, commissionType: CommissionType.FLAT, commissionValue: 15, consecutiveFailures: 0, isRestricted: false, performanceRating: 4.6 },
    { courierId: 13, deliveriesCompleted: 91, deliveriesFailed: 8, totalEarnings: 1340.00, pendingEarnings: 180.00, currentBalance: 1160.00, commissionType: CommissionType.FLAT, commissionValue: 15, consecutiveFailures: 0, isRestricted: false, performanceRating: 4.3 },
];

export const mockCourierTransactions: CourierTransaction[] = [];
