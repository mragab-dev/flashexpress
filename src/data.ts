
import { User, Shipment, UserRole, Zone, ShipmentStatus, PaymentMethod, Transaction, TransactionType, Notification } from './types';

// In a real app, passwords would be hashed. For this demo, we use plaintext.
export const mockUsers: User[] = [
  { id: 1, name: 'Admin User', email: 'admin@flash.com', password: 'password123', role: UserRole.ADMIN },
  { id: 2, name: 'Assigner One', email: 'assigner1@flash.com', password: 'password123', role: UserRole.ASSIGNING_USER },
  { 
    id: 3, 
    name: 'Client Alice', 
    email: 'alice@example.com', 
    password: 'password123', 
    role: UserRole.CLIENT, 
    walletBalance: 1500,
    phone: '01012345678',
    address: { street: '123 Maadi St', city: 'Cairo', zone: Zone.CAIRO_ZONE_A, details: 'Apt 5' }
  },
  { 
    id: 4, 
    name: 'Client Bob', 
    email: 'bob@example.com', 
    password: 'password123', 
    role: UserRole.CLIENT, 
    walletBalance: 250,
    phone: '01187654321',
    address: { street: '789 Dokki St', city: 'Giza', zone: Zone.GIZA_ZONE_A, details: 'Villa 10' }
  },
  { id: 5, name: 'Courier Ahmed', email: 'ahmed@flash.com', password: 'password123', role: UserRole.COURIER, zone: Zone.CAIRO_ZONE_A, location: { lat: 30.0444, lng: 31.2357 } },
  { id: 6, name: 'Courier Fatima', email: 'fatima@flash.com', password: 'password123', role: UserRole.COURIER, zone: Zone.GIZA_ZONE_B, location: { lat: 29.9792, lng: 31.1342 } },
  { id: 7, name: 'Courier Omar', email: 'omar@flash.com', password: 'password123', role: UserRole.COURIER, zone: Zone.CAIRO_ZONE_B, location: { lat: 30.0769, lng: 31.3436 } },
  { id: 8, name: 'Courier Layla', email: 'layla@flash.com', password: 'password123', role: UserRole.COURIER, zone: Zone.GIZA_ZONE_A, location: { lat: 30.0131, lng: 31.2089 } },
];

export const mockShipments: Shipment[] = [
  {
    id: 'FLS' + Math.floor(Math.random() * 900000 + 100000),
    clientId: 3,
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
  },
  {
    id: 'FLS' + Math.floor(Math.random() * 900000 + 100000),
    clientId: 4,
    clientName: 'Client Bob',
    recipientName: 'Jane Smith',
    recipientPhone: '01123456789',
    fromAddress: { street: '789 Dokki St', city: 'Giza', zone: Zone.GIZA_ZONE_A, details: 'Villa 10' },
    toAddress: { street: '101 Haram St', city: 'Giza', zone: Zone.GIZA_ZONE_B, details: 'Floor 3' },
    packageDescription: 'Large furniture item',
    isLargeOrder: true,
    price: 450,
    paymentMethod: PaymentMethod.INSTAPAY,
    status: ShipmentStatus.ASSIGNED_TO_COURIER,
    courierId: 6,
    creationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'FLS' + Math.floor(Math.random() * 900000 + 100000),
    clientId: 3,
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
    courierId: 5,
    creationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
    {
    id: 'FLS' + Math.floor(Math.random() * 900000 + 100000),
    clientId: 4,
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
    courierId: 8,
    creationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    deliveryDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const mockTransactions: Transaction[] = [
    {
        id: 'TXN' + Math.floor(Math.random() * 900000 + 100000),
        userId: 3,
        type: TransactionType.DEPOSIT,
        amount: 2000,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Initial wallet deposit'
    },
    {
        id: 'TXN' + Math.floor(Math.random() * 900000 + 100000),
        userId: 3,
        type: TransactionType.PAYMENT,
        amount: -75,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Payment for shipment to Sam Wilson'
    },
     {
        id: 'TXN' + Math.floor(Math.random() * 900000 + 100000),
        userId: 4,
        type: TransactionType.DEPOSIT,
        amount: 500,
        date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        description: 'Bank Transfer Top-up'
    },
];

export const mockNotifications: Notification[] = [];