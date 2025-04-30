
export interface Expense {
  id: number;
  date: Date;
  category: string;
  vendor?: string;
  amount: number;
  notes?: string;
}

export interface Category {
  id: number;
  name: string;
  // description?: string; // Optional description
  // icon?: string; // Optional icon identifier
}

export interface Vendor {
  id: number;
  name: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
}

    