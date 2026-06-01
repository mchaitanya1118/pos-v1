import { createClient } from '@supabase/supabase-js';
import { Settings, User, Table, MenuCategory, MenuItem, Customer, CustomerLedger, ExpenseCategory, Expense, Order, OrderItem, Payment, PendingPayment, KitchenTicket, AuditLog, StaffTransaction } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const supabaseDb = {
  // Settings
  getSettings: async (): Promise<Settings> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    // Map settings from key-value pairs or single row
    const result: Partial<Settings> = {};
    data.forEach((row: { key: string; value: string }) => {
      const key = row.key as keyof Settings;
      if (key === 'taxPercentage') {
        result[key] = parseFloat(row.value);
      } else if (key === 'enableGst') {
        result[key] = row.value === 'true';
      } else {
        (result as any)[key] = row.value;
      }
    });
    return result as Settings;
  },
  saveSettings: async (settings: Settings): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
    if (error) throw error;
  },

  // Tables
  getTables: async (): Promise<Table[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('tables').select('*').order('table_number');
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      tableNumber: item.table_number,
      capacity: item.capacity,
      status: item.status,
      createdAt: item.created_at,
    }));
  },
  saveTable: async (table: Table): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('tables').upsert({
      id: table.id,
      table_number: table.tableNumber,
      capacity: table.capacity,
      status: table.status,
      created_at: table.createdAt,
    });
    if (error) throw error;
  },
  deleteTable: async (id: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('tables').delete().eq('id', id);
    if (error) throw error;
  },

  // Categories
  getCategories: async (): Promise<MenuCategory[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('menu_categories').select('*').order('name');
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      createdAt: item.created_at,
    }));
  },
  saveCategory: async (category: MenuCategory): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('menu_categories').upsert({
      id: category.id,
      name: category.name,
      slug: category.slug,
      created_at: category.createdAt,
    });
    if (error) throw error;
  },
  deleteCategory: async (id: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('menu_categories').delete().eq('id', id);
    if (error) throw error;
  },

  // Menu Items
  getMenuItems: async (): Promise<MenuItem[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('menu_items').select('*').order('name');
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      name: item.name,
      categoryId: item.category_id,
      description: item.description,
      price: item.price,
      imageUrl: item.image_url,
      isAvailable: item.is_available,
      createdAt: item.created_at,
    }));
  },
  saveMenuItem: async (item: MenuItem): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('menu_items').upsert({
      id: item.id,
      name: item.name,
      category_id: item.categoryId,
      description: item.description,
      price: item.price,
      image_url: item.imageUrl,
      is_available: item.isAvailable,
      created_at: item.createdAt,
    });
    if (error) throw error;
  },
  deleteMenuItem: async (id: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (error) throw error;
  },

  // Customers
  getCustomers: async (): Promise<Customer[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      name: item.name,
      mobile: item.mobile,
      address: item.address,
      notes: item.notes,
      createdAt: item.created_at,
    }));
  },
  saveCustomer: async (customer: Customer): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('customers').upsert({
      id: customer.id,
      name: customer.name,
      mobile: customer.mobile,
      address: customer.address,
      notes: customer.notes,
      created_at: customer.createdAt,
    });
    if (error) throw error;
  },
  deleteCustomer: async (id: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) throw error;
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      orderNumber: item.order_number,
      tableId: item.table_id,
      customerId: item.customer_id,
      subtotal: item.subtotal,
      tax: item.tax,
      discount: item.discount,
      grandTotal: item.grand_total,
      status: item.status,
      paymentStatus: item.payment_status,
      createdAt: item.created_at,
    }));
  },
  getOrderItems: async (): Promise<OrderItem[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('order_items').select('*');
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      orderId: item.order_id,
      menuItemId: item.menu_item_id,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      createdAt: item.created_at,
    }));
  },
  saveOrder: async (order: Order, items: OrderItem[]): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error: orderError } = await supabase.from('orders').upsert({
      id: order.id,
      order_number: order.orderNumber,
      table_id: order.tableId,
      customer_id: order.customerId,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      grand_total: order.grandTotal,
      status: order.status,
      payment_status: order.paymentStatus,
      created_at: order.createdAt,
    });
    if (orderError) throw orderError;

    // Delete existing items for order
    const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', order.id);
    if (deleteError) throw deleteError;

    // Insert new items
    const rows = items.map(item => ({
      id: item.id,
      order_id: item.orderId,
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.subtotal,
      created_at: item.createdAt,
    }));
    const { error: itemsError } = await supabase.from('order_items').insert(rows);
    if (itemsError) throw itemsError;
  },

  // Payments
  getPayments: async (): Promise<Payment[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      orderId: item.order_id,
      paymentType: item.payment_type,
      amountPaid: item.amount_paid,
      paymentMethod: item.payment_method,
      details: item.details,
      createdAt: item.created_at,
    }));
  },
  savePayment: async (payment: Payment): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('payments').insert({
      id: payment.id,
      order_id: payment.orderId,
      payment_type: payment.paymentType,
      amount_paid: payment.amountPaid,
      payment_method: payment.paymentMethod,
      details: payment.details,
      created_at: payment.createdAt,
    });
    if (error) throw error;
  },

  // Pending Payments
  getPendingPayments: async (): Promise<PendingPayment[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('pending_payments').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      orderId: item.order_id,
      customerId: item.customer_id,
      amountDue: item.amount_due,
      dueDate: item.due_date,
      status: item.status,
      notes: item.notes,
      createdAt: item.created_at,
    }));
  },
  savePendingPayment: async (pp: PendingPayment): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('pending_payments').upsert({
      id: pp.id,
      order_id: pp.orderId,
      customer_id: pp.customerId,
      amount_due: pp.amountDue,
      due_date: pp.dueDate,
      status: pp.status,
      notes: pp.notes,
      created_at: pp.createdAt,
    });
    if (error) throw error;
  },
  deletePendingPayment: async (id: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('pending_payments').delete().eq('id', id);
    if (error) throw error;
  },

  // Customer Ledger
  getCustomerLedger: async (): Promise<CustomerLedger[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('customer_ledger').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      customerId: item.customer_id,
      transactionType: item.transaction_type,
      amount: item.amount,
      balance: item.balance,
      transactionDate: item.transaction_date,
      notes: item.notes,
      createdAt: item.created_at,
    }));
  },
  saveLedgerEntry: async (entry: CustomerLedger): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('customer_ledger').insert({
      id: entry.id,
      customer_id: entry.customerId,
      transaction_type: entry.transactionType,
      amount: entry.amount,
      balance: entry.balance,
      transaction_date: entry.transactionDate,
      notes: entry.notes,
      created_at: entry.createdAt,
    });
    if (error) throw error;
  },

  // Expenses
  getExpenses: async (): Promise<Expense[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      date: item.date,
      categoryId: item.category_id,
      description: item.description,
      amount: item.amount,
      paymentMethod: item.payment_method,
      createdAt: item.created_at,
    }));
  },
  saveExpense: async (expense: Expense): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('expenses').upsert({
      id: expense.id,
      date: expense.date,
      category_id: expense.categoryId,
      description: expense.description,
      amount: expense.amount,
      payment_method: expense.paymentMethod,
      created_at: expense.createdAt,
    });
    if (error) throw error;
  },
  deleteExpense: async (id: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  },

  // Expense Categories
  getExpenseCategories: async (): Promise<ExpenseCategory[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('expense_categories').select('*').order('name');
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      name: item.name,
      createdAt: item.created_at,
    }));
  },

  // Kitchen Tickets
  getKitchenTickets: async (): Promise<KitchenTicket[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('kitchen_tickets').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      orderId: item.order_id,
      tableId: item.table_id,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },
  saveKitchenTicket: async (ticket: KitchenTicket): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('kitchen_tickets').upsert({
      id: ticket.id,
      order_id: ticket.orderId,
      table_id: ticket.tableId,
      status: ticket.status,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,
    });
    if (error) throw error;
  },
  deleteKitchenTicket: async (id: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('kitchen_tickets').delete().eq('id', id);
    if (error) throw error;
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      operator: item.operator,
      action: item.action,
      oldValue: item.old_value,
      newValue: item.new_value,
      details: item.details,
      createdAt: item.created_at,
    }));
  },
  saveAuditLog: async (log: AuditLog): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('audit_logs').insert({
      id: log.id,
      operator: log.operator,
      action: log.action,
      old_value: log.oldValue,
      new_value: log.newValue,
      details: log.details,
      created_at: log.createdAt,
    });
    if (error) throw error;
  },

  // Users & Personnel
  getUsers: async (): Promise<User[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      name: item.name,
      passcode: item.passcode,
      role: item.role,
      createdAt: item.created_at,
    }));
  },
  saveUser: async (user: User): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      name: user.name,
      passcode: user.passcode,
      role: user.role,
      created_at: user.createdAt,
    });
    if (error) throw error;
  },
  deleteUser: async (id: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw error;
  },

  // Staff Transactions
  getStaffTransactions: async (): Promise<StaffTransaction[]> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { data, error } = await supabase.from('staff_transactions').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      type: item.type,
      amount: item.amount,
      date: item.date,
      paymentMethod: item.payment_method,
      notes: item.notes,
      createdAt: item.created_at,
    }));
  },
  saveStaffTransaction: async (transaction: StaffTransaction): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('staff_transactions').upsert({
      id: transaction.id,
      user_id: transaction.userId,
      type: transaction.type,
      amount: transaction.amount,
      date: transaction.date,
      payment_method: transaction.paymentMethod,
      notes: transaction.notes,
      created_at: transaction.createdAt,
    });
    if (error) throw error;
  },
  deleteStaffTransaction: async (id: string): Promise<void> => {
    if (!supabase) throw new Error("Supabase is not initialized");
    const { error } = await supabase.from('staff_transactions').delete().eq('id', id);
    if (error) throw error;
  },
};
