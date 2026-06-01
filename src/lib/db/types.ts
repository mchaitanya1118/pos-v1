export interface Settings {
  restaurantName: string;
  address: string;
  phone: string;
  gstNumber: string;
  taxPercentage: number;
  currency: string; // e.g. "USD", "INR", "EUR"
  passcode: string; // admin login & authentication passcode
  enableGst: boolean; // toggle to enable or disable GST tax calculation
}

export interface User {
  id: string;
  name: string;
  passcode?: string;
  role: 'admin' | 'staff' | 'no_login';
  createdAt: string;
}

export interface Table {
  id: string;
  tableNumber: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved' | 'bill_ready';
  runningOrderId?: string | null;
  occupiedAt?: string | null;
  mergedWithTableId?: string | null;
  createdAt: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  tableId: string | null;
  customerId: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  status: 'draft' | 'placed' | 'preparing' | 'ready' | 'served' | 'paid' | 'closed' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'partially_paid';
  activeDurationMinutes?: number;
  discountType?: 'percentage' | 'fixed' | null;
  discountValue?: number;
  discountApprovedBy?: string | null;
  discountReason?: string | null;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  price: number;
  subtotal: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  orderId: string;
  paymentType: 'cash' | 'online' | 'pending';
  amountPaid: number;
  paymentMethod: 'cash' | 'upi' | 'phonepe' | 'gpay' | 'paytm' | 'bank_transfer' | 'credit';
  details?: string;
  createdAt: string;
}

export interface PendingPayment {
  id: string;
  orderId: string;
  customerId: string;
  amountDue: number;
  dueDate: string;
  status: 'pending' | 'settled';
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  notes?: string;
  createdAt: string;
}

export interface CustomerLedger {
  id: string;
  customerId: string;
  transactionType: 'credit' | 'payment'; // credit = credit sale (increases debt), payment = payment received (reduces debt)
  amount: number;
  balance: number;
  transactionDate: string;
  notes?: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  categoryId: string;
  description: string;
  amount: number;
  paymentMethod: 'cash' | 'online';
  createdAt: string;
}

export interface KitchenTicket {
  id: string;
  orderId: string;
  tableId: string | null;
  status: 'new' | 'preparing' | 'ready' | 'served';
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  operator: string;
  action: string;
  oldValue: string;
  newValue: string;
  details: string;
  createdAt: string;
}

export interface StaffTransaction {
  id: string;
  userId: string;
  type: 'salary' | 'advance' | 'bonus' | 'deduction';
  amount: number;
  date: string;
  paymentMethod: 'cash' | 'upi' | 'phonepe' | 'gpay' | 'paytm' | 'bank_transfer';
  notes?: string;
  createdAt: string;
}
