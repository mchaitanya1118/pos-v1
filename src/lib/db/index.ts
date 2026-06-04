import { isSupabaseConfigured, supabaseDb } from './supabase-db';
import { mockDb } from './mock-db';
import { Settings, User, Table, MenuCategory, MenuItem, Customer, CustomerLedger, ExpenseCategory, Expense, Order, OrderItem, Payment, PendingPayment, KitchenTicket, AuditLog, StaffTransaction } from './types';

// Log the active connection profile to the browser developer console
if (typeof window !== 'undefined') {
  if (isSupabaseConfigured) {
    console.log(
      "%c Restaurant POS Active DB Mode: SUPABASE ONLINE (Cloud PostgreSQL) ",
      "background: #10B981; color: white; font-weight: bold; padding: 4px; border-radius: 4px;"
    );
  } else {
    console.log(
      "%c Restaurant POS Active DB Mode: OFFLINE LOCAL-FIRST (Browser localStorage Sandbox) ",
      "background: #3B82F6; color: white; font-weight: bold; padding: 4px; border-radius: 4px;"
    );
  }
}

export const db = {
  // Settings
  getSettings: async (): Promise<Settings> => {
    return isSupabaseConfigured ? supabaseDb.getSettings() : Promise.resolve(mockDb.getSettings());
  },
  saveSettings: async (settings: Settings): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.saveSettings(settings);
    } else {
      mockDb.saveSettings(settings);
    }
  },

  // Tables
  getTables: async (): Promise<Table[]> => {
    return isSupabaseConfigured ? supabaseDb.getTables() : Promise.resolve(mockDb.getTables());
  },
  saveTable: async (table: Table): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.saveTable(table);
    } else {
      mockDb.saveTable(table);
    }
  },
  deleteTable: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.deleteTable(id);
    } else {
      mockDb.deleteTable(id);
    }
  },

  // Categories
  getCategories: async (): Promise<MenuCategory[]> => {
    return isSupabaseConfigured ? supabaseDb.getCategories() : Promise.resolve(mockDb.getCategories());
  },
  saveCategory: async (category: MenuCategory): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.saveCategory(category);
    } else {
      mockDb.saveCategory(category);
    }
  },
  deleteCategory: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.deleteCategory(id);
    } else {
      mockDb.deleteCategory(id);
    }
  },

  // Menu Items
  getMenuItems: async (): Promise<MenuItem[]> => {
    return isSupabaseConfigured ? supabaseDb.getMenuItems() : Promise.resolve(mockDb.getMenuItems());
  },
  saveMenuItem: async (item: MenuItem): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.saveMenuItem(item);
    } else {
      mockDb.saveMenuItem(item);
    }
  },
  deleteMenuItem: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.deleteMenuItem(id);
    } else {
      mockDb.deleteMenuItem(id);
    }
  },

  // Customers
  getCustomers: async (): Promise<Customer[]> => {
    return isSupabaseConfigured ? supabaseDb.getCustomers() : Promise.resolve(mockDb.getCustomers());
  },
  saveCustomer: async (customer: Customer): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.saveCustomer(customer);
    } else {
      mockDb.saveCustomer(customer);
    }
  },
  deleteCustomer: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.deleteCustomer(id);
    } else {
      mockDb.deleteCustomer(id);
    }
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    return isSupabaseConfigured ? supabaseDb.getOrders() : Promise.resolve(mockDb.getOrders());
  },
  getOrderItems: async (): Promise<OrderItem[]> => {
    return isSupabaseConfigured ? supabaseDb.getOrderItems() : Promise.resolve(mockDb.getOrderItems());
  },
  saveOrder: async (order: Order, items: OrderItem[]): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.saveOrder(order, items);
    } else {
      mockDb.saveOrder(order, items);
    }
  },

  // Payments
  getPayments: async (): Promise<Payment[]> => {
    return isSupabaseConfigured ? supabaseDb.getPayments() : Promise.resolve(mockDb.getPayments());
  },
  savePayment: async (payment: Payment): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.savePayment(payment);
    } else {
      mockDb.savePayment(payment);
    }
  },

  // Pending Payments
  getPendingPayments: async (): Promise<PendingPayment[]> => {
    return isSupabaseConfigured ? supabaseDb.getPendingPayments() : Promise.resolve(mockDb.getPendingPayments());
  },
  savePendingPayment: async (pp: PendingPayment): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.savePendingPayment(pp);
    } else {
      mockDb.savePendingPayment(pp);
    }
  },
  deletePendingPayment: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.deletePendingPayment(id);
    } else {
      mockDb.deletePendingPayment(id);
    }
  },

  // Customer Ledger
  getCustomerLedger: async (): Promise<CustomerLedger[]> => {
    return isSupabaseConfigured ? supabaseDb.getCustomerLedger() : Promise.resolve(mockDb.getCustomerLedger());
  },
  saveLedgerEntry: async (entry: CustomerLedger): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.saveLedgerEntry(entry);
    } else {
      mockDb.saveLedgerEntry(entry);
    }
  },

  // Expenses
  getExpenses: async (): Promise<Expense[]> => {
    return isSupabaseConfigured ? supabaseDb.getExpenses() : Promise.resolve(mockDb.getExpenses());
  },
  saveExpense: async (expense: Expense): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.saveExpense(expense);
    } else {
      mockDb.saveExpense(expense);
    }
  },
  deleteExpense: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.deleteExpense(id);
    } else {
      mockDb.deleteExpense(id);
    }
  },

  // Expense Categories
  getExpenseCategories: async (): Promise<ExpenseCategory[]> => {
    return isSupabaseConfigured ? supabaseDb.getExpenseCategories() : Promise.resolve(mockDb.getExpenseCategories());
  },

  // Kitchen Tickets
  getKitchenTickets: async (): Promise<KitchenTicket[]> => {
    return isSupabaseConfigured ? supabaseDb.getKitchenTickets() : Promise.resolve(mockDb.getKitchenTickets());
  },
  saveKitchenTicket: async (ticket: KitchenTicket): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.saveKitchenTicket(ticket);
    } else {
      mockDb.saveKitchenTicket(ticket);
    }
  },
  deleteKitchenTicket: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.deleteKitchenTicket(id);
    } else {
      mockDb.deleteKitchenTicket(id);
    }
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    return isSupabaseConfigured ? supabaseDb.getAuditLogs() : Promise.resolve(mockDb.getAuditLogs());
  },
  saveAuditLog: async (log: AuditLog): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.saveAuditLog(log);
    } else {
      mockDb.saveAuditLog(log);
    }
  },

  // Users & Personnel
  getUsers: async (): Promise<User[]> => {
    return isSupabaseConfigured ? supabaseDb.getUsers() : Promise.resolve(mockDb.getUsers());
  },
  saveUser: async (user: User): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.saveUser(user);
    } else {
      mockDb.saveUser(user);
    }
  },
  deleteUser: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.deleteUser(id);
    } else {
      mockDb.deleteUser(id);
    }
  },

  // Staff Transactions
  getStaffTransactions: async (): Promise<StaffTransaction[]> => {
    return isSupabaseConfigured ? supabaseDb.getStaffTransactions() : Promise.resolve(mockDb.getStaffTransactions());
  },
  saveStaffTransaction: async (transaction: StaffTransaction): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.saveStaffTransaction(transaction);
    } else {
      mockDb.saveStaffTransaction(transaction);
    }
  },
  deleteStaffTransaction: async (id: string): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.deleteStaffTransaction(id);
    } else {
      mockDb.deleteStaffTransaction(id);
    }
  },

  // Database Lifecycle & Utilities
  onDatabaseUpdate: (callback: () => void): (() => void) => {
    if (isSupabaseConfigured) {
      return supabaseDb.onDatabaseUpdate(callback);
    } else {
      return mockDb.onDatabaseUpdate(callback);
    }
  },
  wipeTransactionData: async (): Promise<void> => {
    if (isSupabaseConfigured) {
      await supabaseDb.wipeTransactionData();
    } else {
      await mockDb.wipeTransactionData();
    }
  },
};
