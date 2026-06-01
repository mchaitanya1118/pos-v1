import { Settings, User, Table, MenuCategory, MenuItem, Customer, CustomerLedger, ExpenseCategory, Expense, Order, OrderItem, Payment, PendingPayment, KitchenTicket, AuditLog, StaffTransaction } from './types';
import { DEFAULT_SETTINGS, DEFAULT_TABLES, DEFAULT_CATEGORIES, DEFAULT_MENU_ITEMS, DEFAULT_CUSTOMERS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_EXPENSES } from './mock-data';

const DEFAULT_USERS: User[] = [
  {
    id: 'u_admin',
    name: 'Administrator',
    passcode: '1234',
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: 'u_staff',
    name: 'Staff Member',
    passcode: '4321',
    role: 'staff',
    createdAt: new Date().toISOString()
  }
];

// Helper to check if running in browser
const isBrowser = () => typeof window !== 'undefined';

// Safe localStorage wrapper
const getItem = <T>(key: string, defaultValue: T): T => {
  if (!isBrowser()) return defaultValue;
  const val = localStorage.getItem(`pos_${key}`);
  if (!val) {
    localStorage.setItem(`pos_${key}`, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(val) as T;
  } catch {
    return defaultValue;
  }
};

const setItem = <T>(key: string, value: T): void => {
  if (!isBrowser()) return;
  localStorage.setItem(`pos_${key}`, JSON.stringify(value));
};

// Seed database on first import
const initDb = () => {
  if (!isBrowser()) return;
  
  // Migrate existing localStorage cache from USD to INR if already created once
  const savedSettingsVal = localStorage.getItem('pos_settings');
  if (savedSettingsVal) {
    try {
      const parsed = JSON.parse(savedSettingsVal) as Settings;
      if (parsed.currency === 'USD') {
        parsed.currency = 'INR';
        localStorage.setItem('pos_settings', JSON.stringify(parsed));
      }
    } catch {
      // safe bypass
    }
  }

  getItem<Settings>('settings', DEFAULT_SETTINGS);
  getItem<Table[]>('tables', DEFAULT_TABLES);
  getItem<MenuCategory[]>('categories', DEFAULT_CATEGORIES);
  getItem<MenuItem[]>('menu_items', DEFAULT_MENU_ITEMS);
  getItem<Customer[]>('customers', DEFAULT_CUSTOMERS);
  getItem<ExpenseCategory[]>('expense_categories', DEFAULT_EXPENSE_CATEGORIES);
  getItem<Expense[]>('expenses', DEFAULT_EXPENSES);
  getItem<User[]>('users', DEFAULT_USERS);
  
  // Seed two placed orders and items for occupied tables T-03 and T-08
  getItem<Order[]>('orders', [
    {
      id: 'ord_mock_1',
      orderNumber: 'INV-382910',
      tableId: 't3',
      customerId: 'c1',
      subtotal: 53.98,
      tax: 6.75,
      discount: 0,
      grandTotal: 60.73,
      status: 'preparing',
      paymentStatus: 'pending',
      activeDurationMinutes: 120,
      createdAt: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: 'ord_mock_2',
      orderNumber: 'INV-982711',
      tableId: 't8',
      customerId: 'c3',
      subtotal: 24.99,
      tax: 3.12,
      discount: 5.00,
      grandTotal: 23.11,
      status: 'ready',
      paymentStatus: 'pending',
      activeDurationMinutes: 30,
      createdAt: new Date(Date.now() - 1800000).toISOString()
    }
  ]);
  
  getItem<OrderItem[]>('order_items', [
    // ord_mock_1 items
    { id: 'oi_mock_1', orderId: 'ord_mock_1', menuItemId: 'm5', quantity: 2, price: 18.99, subtotal: 37.98, createdAt: new Date().toISOString() },
    { id: 'oi_mock_2', orderId: 'ord_mock_1', menuItemId: 'm8', quantity: 1, price: 6.99, subtotal: 6.99, createdAt: new Date().toISOString() },
    { id: 'oi_mock_3', orderId: 'ord_mock_1', menuItemId: 'm9', quantity: 1, price: 9.99, subtotal: 9.99, createdAt: new Date().toISOString() },
    // ord_mock_2 items
    { id: 'oi_mock_4', orderId: 'ord_mock_2', menuItemId: 'm6', quantity: 1, price: 24.99, subtotal: 24.99, createdAt: new Date().toISOString() }
  ]);

  getItem<Payment[]>('payments', []);
  
  // Seed outstanding pending balance structures
  getItem<PendingPayment[]>('pending_payments', [
    { id: 'pp_mock_1', orderId: 'ord_mock_1', customerId: 'c1', amountDue: 60.73, dueDate: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0], status: 'pending', notes: 'Tab T-03 outstanding balance', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'pp_mock_2', orderId: 'ord_mock_2', customerId: 'c3', amountDue: 23.11, dueDate: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0], status: 'pending', notes: 'Tab T-08 outstanding balance', createdAt: new Date(Date.now() - 1800000).toISOString() }
  ]);
  
  getItem<CustomerLedger[]>('customer_ledger', [
    { id: 'cl_mock_1', customerId: 'c1', transactionType: 'credit', amount: 60.73, balance: 60.73, transactionDate: new Date().toISOString().split('T')[0], notes: 'Credit sale invoice INV-382910', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'cl_mock_2', customerId: 'c3', transactionType: 'credit', amount: 23.11, balance: 23.11, transactionDate: new Date().toISOString().split('T')[0], notes: 'Credit sale invoice INV-982711', createdAt: new Date(Date.now() - 1800000).toISOString() }
  ]);

  // Seed default kitchen tickets
  getItem<KitchenTicket[]>('kitchen_tickets', [
    { id: 'kt_1', orderId: 'ord_mock_1', tableId: 't3', status: 'preparing', createdAt: new Date(Date.now() - 7200000).toISOString(), updatedAt: new Date().toISOString() },
    { id: 'kt_2', orderId: 'ord_mock_2', tableId: 't8', status: 'ready', createdAt: new Date(Date.now() - 1800000).toISOString(), updatedAt: new Date().toISOString() }
  ]);

  // Seed default audit logs
  getItem<AuditLog[]>('audit_logs', [
    { id: 'al_1', operator: 'admin', action: 'order_placed', oldValue: '', newValue: 'ord_mock_1', details: 'Placed new order for Table T-03', createdAt: new Date(Date.now() - 7200000).toISOString() },
    { id: 'al_2', operator: 'admin', action: 'order_placed', oldValue: '', newValue: 'ord_mock_2', details: 'Placed new order for Table T-08', createdAt: new Date(Date.now() - 1800000).toISOString() }
  ]);
};

initDb();

export const mockDb = {
  // Settings
  getSettings: (): Settings => {
    const s = getItem<Settings>('settings', DEFAULT_SETTINGS);
    if (s.enableGst === undefined) {
      s.enableGst = true;
    }
    return s;
  },
  saveSettings: (settings: Settings): void => setItem<Settings>('settings', settings),

  // Tables
  getTables: (): Table[] => getItem<Table[]>('tables', DEFAULT_TABLES),
  saveTable: (table: Table): void => {
    const list = mockDb.getTables();
    const index = list.findIndex(t => t.id === table.id);
    if (index >= 0) {
      list[index] = table;
    } else {
      list.push(table);
    }
    setItem<Table[]>('tables', list);
  },
  deleteTable: (id: string): void => {
    const list = mockDb.getTables().filter(t => t.id !== id);
    setItem<Table[]>('tables', list);
  },

  // Categories
  getCategories: (): MenuCategory[] => getItem<MenuCategory[]>('categories', DEFAULT_CATEGORIES),
  saveCategory: (category: MenuCategory): void => {
    const list = mockDb.getCategories();
    const index = list.findIndex(c => c.id === category.id);
    if (index >= 0) {
      list[index] = category;
    } else {
      list.push(category);
    }
    setItem<MenuCategory[]>('categories', list);
  },
  deleteCategory: (id: string): void => {
    const list = mockDb.getCategories().filter(c => c.id !== id);
    setItem<MenuCategory[]>('categories', list);
  },

  // Menu Items
  getMenuItems: (): MenuItem[] => getItem<MenuItem[]>('menu_items', DEFAULT_MENU_ITEMS),
  saveMenuItem: (item: MenuItem): void => {
    const list = mockDb.getMenuItems();
    const index = list.findIndex(m => m.id === item.id);
    if (index >= 0) {
      list[index] = item;
    } else {
      list.push(item);
    }
    setItem<MenuItem[]>('menu_items', list);
  },
  deleteMenuItem: (id: string): void => {
    const list = mockDb.getMenuItems().filter(m => m.id !== id);
    setItem<MenuItem[]>('menu_items', list);
  },

  // Customers
  getCustomers: (): Customer[] => getItem<Customer[]>('customers', DEFAULT_CUSTOMERS),
  saveCustomer: (customer: Customer): void => {
    const list = mockDb.getCustomers();
    const index = list.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      list[index] = customer;
    } else {
      list.push(customer);
    }
    setItem<Customer[]>('customers', list);
  },
  deleteCustomer: (id: string): void => {
    const list = mockDb.getCustomers().filter(c => c.id !== id);
    setItem<Customer[]>('customers', list);
  },

  // Orders
  getOrders: (): Order[] => getItem<Order[]>('orders', []),
  getOrderItems: (): OrderItem[] => getItem<OrderItem[]>('order_items', []),
  saveOrder: (order: Order, items: OrderItem[]): void => {
    const orders = mockDb.getOrders();
    const index = orders.findIndex(o => o.id === order.id);
    if (index >= 0) {
      orders[index] = order;
    } else {
      orders.push(order);
    }
    setItem<Order[]>('orders', orders);

    let orderItems = mockDb.getOrderItems();
    // Remove existing items for this order first
    orderItems = orderItems.filter(item => item.orderId !== order.id);
    orderItems.push(...items);
    setItem<OrderItem[]>('order_items', orderItems);
  },

  // Payments
  getPayments: (): Payment[] => getItem<Payment[]>('payments', []),
  savePayment: (payment: Payment): void => {
    const list = mockDb.getPayments();
    list.push(payment);
    setItem<Payment[]>('payments', list);
  },

  // Pending Payments
  getPendingPayments: (): PendingPayment[] => getItem<PendingPayment[]>('pending_payments', []),
  savePendingPayment: (pp: PendingPayment): void => {
    const list = mockDb.getPendingPayments();
    const index = list.findIndex(p => p.id === pp.id);
    if (index >= 0) {
      list[index] = pp;
    } else {
      list.push(pp);
    }
    setItem<PendingPayment[]>('pending_payments', list);
  },
  deletePendingPayment: (id: string): void => {
    const list = mockDb.getPendingPayments().filter(p => p.id !== id);
    setItem<PendingPayment[]>('pending_payments', list);
  },

  // Customer Ledger
  getCustomerLedger: (): CustomerLedger[] => getItem<CustomerLedger[]>('customer_ledger', []),
  saveLedgerEntry: (entry: CustomerLedger): void => {
    const list = mockDb.getCustomerLedger();
    list.push(entry);
    setItem<CustomerLedger[]>('customer_ledger', list);
  },

  // Expenses
  getExpenses: (): Expense[] => getItem<Expense[]>('expenses', DEFAULT_EXPENSES),
  saveExpense: (expense: Expense): void => {
    const list = mockDb.getExpenses();
    const index = list.findIndex(e => e.id === expense.id);
    if (index >= 0) {
      list[index] = expense;
    } else {
      list.push(expense);
    }
    setItem<Expense[]>('expenses', list);
  },
  deleteExpense: (id: string): void => {
    const list = mockDb.getExpenses().filter(e => e.id !== id);
    setItem<Expense[]>('expenses', list);
  },

  // Expense Categories
  getExpenseCategories: (): ExpenseCategory[] => getItem<ExpenseCategory[]>('expense_categories', DEFAULT_EXPENSE_CATEGORIES),

  // Kitchen Tickets
  getKitchenTickets: (): KitchenTicket[] => getItem<KitchenTicket[]>('kitchen_tickets', []),
  saveKitchenTicket: (ticket: KitchenTicket): void => {
    const list = mockDb.getKitchenTickets();
    const index = list.findIndex(t => t.id === ticket.id);
    if (index >= 0) {
      list[index] = ticket;
    } else {
      list.push(ticket);
    }
    setItem<KitchenTicket[]>('kitchen_tickets', list);
  },
  deleteKitchenTicket: (id: string): void => {
    const list = mockDb.getKitchenTickets().filter(t => t.id !== id);
    setItem<KitchenTicket[]>('kitchen_tickets', list);
  },

  // Audit Logs
  getAuditLogs: (): AuditLog[] => getItem<AuditLog[]>('audit_logs', []),
  saveAuditLog: (log: AuditLog): void => {
    const list = mockDb.getAuditLogs();
    list.push(log);
    setItem<AuditLog[]>('audit_logs', list);
  },

  // Users & Personnel
  getUsers: (): User[] => {
    return getItem<User[]>('users', DEFAULT_USERS);
  },
  saveUser: (user: User): void => {
    const list = mockDb.getUsers();
    const index = list.findIndex(u => u.id === user.id);
    if (index >= 0) {
      list[index] = user;
    } else {
      list.push(user);
    }
    setItem<User[]>('users', list);
  },
  deleteUser: (id: string): void => {
    const list = mockDb.getUsers().filter(u => u.id !== id);
    setItem<User[]>('users', list);
  },

  // Staff Transactions
  getStaffTransactions: (): StaffTransaction[] => getItem<StaffTransaction[]>('staff_transactions', []),
  saveStaffTransaction: (transaction: StaffTransaction): void => {
    const list = mockDb.getStaffTransactions();
    const index = list.findIndex(t => t.id === transaction.id);
    if (index >= 0) {
      list[index] = transaction;
    } else {
      list.push(transaction);
    }
    setItem<StaffTransaction[]>('staff_transactions', list);
  },
  deleteStaffTransaction: (id: string): void => {
    const list = mockDb.getStaffTransactions().filter(t => t.id !== id);
    setItem<StaffTransaction[]>('staff_transactions', list);
  },
};
