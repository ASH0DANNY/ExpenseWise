import type { Timestamp } from 'firebase/firestore';

export interface Expense {
  id: string; // Use string for Firestore document IDs
  date: Date | Timestamp; // Can be Date object or Firestore Timestamp
  category: string; // Storing name for simplicity, could be ID/reference
  vendor?: string; // Storing name for simplicity, could be ID/reference
  amount: number;
  notes?: string;
}

export interface Category {
  id: string; // Use string for Firestore document IDs
  name: string;
}

export interface Vendor {
  id: string; // Use string for Firestore document IDs
  name: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface IncomeSetting {
    id: string; // Should be a predictable ID, e.g., 'userIncome'
    amount: number;
}
