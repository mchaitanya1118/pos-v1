import { create } from 'zustand';
import { db } from './db';
import { Settings, MenuItem, User } from './db/types';

interface SessionState {
  isAuthenticated: boolean;
  operatorRole: 'admin' | 'staff' | 'no_login' | null;
  operatorName: string | null;
  activeSettings: Settings | null;
  theme: 'light' | 'dark';
  isLoading: boolean;
  loadSession: () => Promise<void>;
  login: (passcode: string, remember: boolean) => Promise<boolean>;
  logout: () => void;
  updateSettings: (settings: Settings) => Promise<void>;
  toggleTheme: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  isAuthenticated: false,
  operatorRole: null,
  operatorName: null,
  activeSettings: null,
  theme: 'dark', // Locked to premium dark mode as default
  isLoading: true,

  loadSession: async () => {
    try {
      set({ isLoading: true });
      const settings = await db.getSettings();
      
      let theme: 'light' | 'dark' = 'dark';
      let isAuthenticated = false;
      let operatorRole: 'admin' | 'staff' | null = null;
      let operatorName: string | null = null;

      if (typeof window !== 'undefined') {
        const rememberState = localStorage.getItem('pos_remembered');
        if (rememberState === 'true') {
          isAuthenticated = true;
          operatorRole = localStorage.getItem('pos_role') as 'admin' | 'staff' || 'staff';
          operatorName = localStorage.getItem('pos_user_name') || (operatorRole === 'admin' ? 'Administrator' : 'Staff Member');
        }
      }

      set({ activeSettings: settings, theme: 'dark', isAuthenticated, operatorRole, operatorName, isLoading: false });
      
      // Enforce light mode class on html root element
      if (typeof window !== 'undefined') {
        document.documentElement.classList.remove('dark');
      }
    } catch (err) {
      console.error("Failed to load session details", err);
      set({ isLoading: false });
    }
  },

  login: async (passcode: string, remember: boolean) => {
    const settings = get().activeSettings || await db.getSettings();
    const adminPasscode = settings?.passcode || '1234';
    
    // Attempt dynamic database user matching
    try {
      const dbUsers = await db.getUsers();
      const matchedUser = dbUsers.find((u: User) => u.passcode === passcode && u.role !== 'no_login' && u.passcode);
      if (matchedUser) {
        set({ isAuthenticated: true, operatorRole: matchedUser.role, operatorName: matchedUser.name });
        if (typeof window !== 'undefined') {
          localStorage.setItem('pos_role', matchedUser.role);
          localStorage.setItem('pos_user_name', matchedUser.name);
          localStorage.setItem('pos_user_id', matchedUser.id);
          if (remember) {
            localStorage.setItem('pos_remembered', 'true');
          }
        }
        return true;
      }
    } catch (err) {
      console.error("Dynamic user query failed on login:", err);
    }
    
    // Fallbacks:
    // If it matches adminPasscode, log in as 'admin'.
    if (passcode === adminPasscode) {
      set({ isAuthenticated: true, operatorRole: 'admin', operatorName: 'Administrator' });
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_role', 'admin');
        localStorage.setItem('pos_user_name', 'Administrator');
        if (remember) {
          localStorage.setItem('pos_remembered', 'true');
        }
      }
      return true;
    } else if (passcode === '4321') {
      // Secondary preset staff code for test environments
      set({ isAuthenticated: true, operatorRole: 'staff', operatorName: 'Staff Member' });
      if (typeof window !== 'undefined') {
        localStorage.setItem('pos_role', 'staff');
        localStorage.setItem('pos_user_name', 'Staff Member');
        if (remember) {
          localStorage.setItem('pos_remembered', 'true');
        }
      }
      return true;
    }
    return false;
  },

  logout: () => {
    set({ isAuthenticated: false, operatorRole: null, operatorName: null });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pos_remembered');
      localStorage.removeItem('pos_role');
      localStorage.removeItem('pos_user_name');
      localStorage.removeItem('pos_user_id');
    }
  },

  updateSettings: async (settings: Settings) => {
    await db.saveSettings(settings);
    set({ activeSettings: settings });
  },

  toggleTheme: () => {
    // Locked to dark theme permanently
  },
}));

interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  selectedTableId: string | null;
  selectedCustomerId: string | null;
  discountAmount: number; // Flat discount
  taxRate: number; // e.g. 12.5
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  decreaseQuantity: (itemId: string) => void;
  setTable: (tableId: string | null) => void;
  setCustomer: (customerId: string | null) => void;
  setDiscount: (amount: number) => void;
  setTaxRate: (rate: number) => void;
  clearCart: () => void;
  getTotals: () => {
    subtotal: number;
    tax: number;
    discount: number;
    grandTotal: number;
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  selectedTableId: null,
  selectedCustomerId: null,
  discountAmount: 0,
  taxRate: 12.5,

  addItem: (item: MenuItem) => {
    if (!item.isAvailable) return;
    const currentItems = get().items;
    const index = currentItems.findIndex(i => i.item.id === item.id);
    if (index >= 0) {
      const copy = [...currentItems];
      copy[index].quantity += 1;
      set({ items: copy });
    } else {
      set({ items: [...currentItems, { item, quantity: 1 }] });
    }
  },

  removeItem: (itemId: string) => {
    set({ items: get().items.filter(i => i.item.id !== itemId) });
  },

  decreaseQuantity: (itemId: string) => {
    const currentItems = get().items;
    const index = currentItems.findIndex(i => i.item.id === itemId);
    if (index >= 0) {
      const copy = [...currentItems];
      if (copy[index].quantity > 1) {
        copy[index].quantity -= 1;
        set({ items: copy });
      } else {
        set({ items: currentItems.filter(i => i.item.id !== itemId) });
      }
    }
  },

  setTable: (tableId: string | null) => set({ selectedTableId: tableId }),
  setCustomer: (customerId: string | null) => set({ selectedCustomerId: customerId }),
  setDiscount: (amount: number) => set({ discountAmount: Math.max(0, amount) }),
  setTaxRate: (rate: number) => set({ taxRate: Math.max(0, rate) }),
  clearCart: () => set({ items: [], selectedTableId: null, selectedCustomerId: null, discountAmount: 0 }),

  getTotals: () => {
    const items = get().items;
    const discount = get().discountAmount;
    const taxRate = get().taxRate;

    const subtotal = items.reduce((sum, current) => sum + current.item.price * current.quantity, 0);
    
    // Check if GST is enabled in settings
    const sessionStore = useSessionStore.getState();
    const isGstEnabled = sessionStore.activeSettings?.enableGst !== false;

    const tax = isGstEnabled ? Math.max(0, (subtotal - discount) * (taxRate / 100)) : 0;
    const grandTotal = Math.max(0, subtotal - discount + tax);

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      tax: parseFloat(tax.toFixed(2)),
      discount: parseFloat(discount.toFixed(2)),
      grandTotal: parseFloat(grandTotal.toFixed(2)),
    };
  },
}));
