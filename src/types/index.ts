import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  name: string;
  email: string;
  createdAt: Timestamp | Date;
  role: 'user' | 'admin';
  tier: 'T1' | 'T2' | 'T3';
  withdrawalFrozen: boolean;
  freezeReason: string;
  preferredMarket: 'stock' | 'crypto' | null;
  onboardingCompleted: boolean;
}

export type UserTier = User['tier'];

export interface Asset {
  id: string;
  name: string;
  ticker: string;
  type: 'stock' | 'crypto';
  minDeposit: number;
  maxDeposit: number;
  logoUrl: string;
  currentPrice: number;
  coingeckoId?: string;
  createdAt: Timestamp | Date;
}

export interface AssetPrice {
  ticker: string;
  price: number;
  updatedAt: Timestamp | Date;
}

export interface Holding {
  id?: string;
  userId: string;
  assetId: string;
  assetName: string;
  ticker: string;
  type: 'stock' | 'crypto';
  quantity: number;
  createdAt: Timestamp | Date;
}

export interface Transaction {
  id: string;
  userId: string;
  assetId: string;
  assetName: string;
  ticker: string;
  type: 'deposit' | 'withdrawal' | 'admin_credit';
  amount: number;
  quantity: number;
  status: 'pending' | 'completed' | 'declined';
  createdAt: Timestamp | Date;
  visibleToUser: boolean;
}

export interface DepositAddress {
  id: string;
  label: string;
  network: string;
  address: string;
  qrCodeUrl: string;
  active: boolean;
  createdAt: Timestamp | Date;
}

export interface SupportChat {
  id: string;
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageAt: Timestamp | Date;
  unreadByAdmin: boolean;
  unreadByUser: boolean;
}

export interface SupportMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderRole: 'user' | 'admin';
  message: string;
  createdAt: Timestamp | Date;
}

export interface AdminCredit {
  id: string;
  userId: string;
  assetId: string;
  assetName: string;
  ticker: string;
  amountAdded: number;
  quantityAdded: number;
  priceAtTime: number;
  creditedBy: 'admin';
  createdAt: Timestamp | Date;
}

export interface AdminHoldingAction {
  id: string;
  userId: string;
  assetId: string;
  assetName: string;
  ticker: string;
  type: Holding['type'];
  action: 'delete_holding';
  quantityRemoved: number;
  estimatedValueAtTime: number;
  priceAtTime: number;
  performedBy: 'admin';
  createdAt: Timestamp | Date;
}
