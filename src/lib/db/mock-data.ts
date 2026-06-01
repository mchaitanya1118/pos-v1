import { Settings, Table, MenuCategory, MenuItem, Customer, ExpenseCategory, Expense } from './types';

export const DEFAULT_SETTINGS: Settings = {
  restaurantName: "The Bistro & Co.",
  address: "123 Gourmet Blvd, Food District, CA 90210",
  phone: "+1 (555) 767-4387",
  gstNumber: "27AAAAA1111A1Z1",
  taxPercentage: 12.5,
  currency: "INR",
  passcode: "1234", // Default passcode
  enableGst: true,
};

export const DEFAULT_TABLES: Table[] = [
  { id: "t1", tableNumber: "T-01", capacity: 2, status: "available", createdAt: new Date().toISOString() },
  { id: "t2", tableNumber: "T-02", capacity: 4, status: "available", createdAt: new Date().toISOString() },
  { id: "t3", tableNumber: "T-03", capacity: 4, status: "occupied", runningOrderId: "ord_mock_1", occupiedAt: new Date(Date.now() - 7200000).toISOString(), createdAt: new Date().toISOString() },
  { id: "t4", tableNumber: "T-04", capacity: 6, status: "reserved", createdAt: new Date().toISOString() },
  { id: "t5", tableNumber: "T-05", capacity: 8, status: "available", createdAt: new Date().toISOString() },
  { id: "t6", tableNumber: "T-06", capacity: 2, status: "available", createdAt: new Date().toISOString() },
  { id: "t7", tableNumber: "T-07", capacity: 4, status: "available", createdAt: new Date().toISOString() },
  { id: "t8", tableNumber: "T-08", capacity: 6, status: "occupied", runningOrderId: "ord_mock_2", occupiedAt: new Date(Date.now() - 1800000).toISOString(), createdAt: new Date().toISOString() },
];

export const DEFAULT_CATEGORIES: MenuCategory[] = [
  { id: "cat1", name: "Starters", slug: "starters", createdAt: new Date().toISOString() },
  { id: "cat2", name: "Main Course", slug: "main-course", createdAt: new Date().toISOString() },
  { id: "cat3", name: "Beverages", slug: "beverages", createdAt: new Date().toISOString() },
  { id: "cat4", name: "Desserts", slug: "desserts", createdAt: new Date().toISOString() },
  { id: "cat5", name: "Special Items", slug: "special-items", createdAt: new Date().toISOString() },
];

export const DEFAULT_MENU_ITEMS: MenuItem[] = [
  // Starters
  {
    id: "m1",
    name: "Golden fried vegetable rolls",
    categoryId: "cat1",
    description: "Served with sweet chili dip.",
    price: 7.99,
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60",
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "m2",
    name: "Crispy chicken wings",
    categoryId: "cat1",
    description: "Tossed in rich butter, garlic, and fresh herbs.",
    price: 11.49,
    imageUrl: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60",
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "m3",
    name: "Bruschetta Classic",
    categoryId: "cat1",
    description: "Toasted baguette topped with diced tomatoes, garlic, basil, and balsamic glaze.",
    price: 8.99,
    imageUrl: "https://images.unsplash.com/photo-1572656631137-7935297eff55?w=500&auto=format&fit=crop&q=60",
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },

  // Main Course
  {
    id: "m4",
    name: "Truffle Ribeye Steak",
    categoryId: "cat2",
    description: "12oz USDA Prime ribeye steak served with truffle herb butter and asparagus.",
    price: 34.99,
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60",
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "m5",
    name: "Fettuccine Alfredo with Chicken",
    categoryId: "cat2",
    description: "Creamy parmesan alfredo sauce tossed with fettuccine pasta and grilled chicken breast.",
    price: 18.99,
    imageUrl: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=60",
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "m6",
    name: "Pan Seared Salmon",
    categoryId: "cat2",
    description: "Fresh salmon fillet pan-seared and served with lemon dill cream sauce and wild rice.",
    price: 24.99,
    imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=60",
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },

  // Beverages
  {
    id: "m7",
    name: "Iced Caramel Macchiato",
    categoryId: "cat3",
    description: "Freshly brewed espresso with cold milk and rich caramel syrup over ice.",
    price: 5.49,
    imageUrl: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500&auto=format&fit=crop&q=60",
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "m8",
    name: "Fresh Mint Mojito",
    categoryId: "cat3",
    description: "Refreshing sparkling drink infused with fresh mint leaves, lime juice, and cane sugar.",
    price: 6.99,
    imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60",
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },

  // Desserts
  {
    id: "m9",
    name: "Molten Lava Chocolate Cake",
    categoryId: "cat4",
    description: "Warm chocolate cake with a rich molten center, served with vanilla bean ice cream.",
    price: 9.99,
    imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60",
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "m10",
    name: "Classic New York Cheesecake",
    categoryId: "cat4",
    description: "Creamy cheesecake on a buttery graham cracker crust, topped with fresh strawberry compote.",
    price: 8.99,
    imageUrl: "https://images.unsplash.com/photo-1524351199679-46cddf530c04?w=500&auto=format&fit=crop&q=60",
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },

  // Special Items
  {
    id: "m11",
    name: "Lobster Thermidor",
    categoryId: "cat5",
    description: "Sautéed lobster meat cooked in a rich cognac-cream sauce, stuffed back into the shell and broiled with cheese.",
    price: 49.99,
    imageUrl: "https://images.unsplash.com/photo-1559737607-3578909a22fa?w=500&auto=format&fit=crop&q=60",
    isAvailable: true,
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_CUSTOMERS: Customer[] = [
  { id: "c1", name: "Mehar Medavarapu", mobile: "9876543210", address: "Tech Enclave, Suite 501, San Francisco", notes: "Regular VIP guest. Prefers window tables.", createdAt: new Date().toISOString() },
  { id: "c2", name: "Alice Johnson", mobile: "9912883477", address: "456 Oakwood St, Oakland", notes: "Allergic to nuts.", createdAt: new Date().toISOString() },
  { id: "c3", name: "Bob Smith", mobile: "9887711223", address: "789 Pine Ave, San Jose", notes: "Prefers online payment invoices emailed.", createdAt: new Date().toISOString() },
  { id: "c4", name: "Sarah Connor", mobile: "9001112233", address: "101 Cyberdyne Way, Los Angeles", notes: "Pending balance limit capped at $500.", createdAt: new Date().toISOString() },
];

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: "ec1", name: "Grocery", createdAt: new Date().toISOString() },
  { id: "ec2", name: "Vegetables", createdAt: new Date().toISOString() },
  { id: "ec3", name: "Meat", createdAt: new Date().toISOString() },
  { id: "ec4", name: "Salaries", createdAt: new Date().toISOString() },
  { id: "ec5", name: "Electricity", createdAt: new Date().toISOString() },
  { id: "ec6", name: "Rent", createdAt: new Date().toISOString() },
  { id: "ec7", name: "Maintenance", createdAt: new Date().toISOString() },
  { id: "ec8", name: "Internet", createdAt: new Date().toISOString() },
  { id: "ec9", name: "Miscellaneous", createdAt: new Date().toISOString() },
];

export const DEFAULT_EXPENSES: Expense[] = [
  { id: "ex1", date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], categoryId: "ec1", description: "Baking flour, olive oil & spices replenishment", amount: 150.00, paymentMethod: "online", createdAt: new Date().toISOString() },
  { id: "ex2", date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], categoryId: "ec2", description: "Fresh tomato, leafy greens & organic root veggies", amount: 84.50, paymentMethod: "cash", createdAt: new Date().toISOString() },
  { id: "ex3", date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0], categoryId: "ec3", description: "USDA beef, organic chicken breast & salmon supply", amount: 320.00, paymentMethod: "online", createdAt: new Date().toISOString() },
  { id: "ex4", date: new Date().toISOString().split('T')[0], categoryId: "ec8", description: "High-speed broadband restaurant connection", amount: 65.00, paymentMethod: "online", createdAt: new Date().toISOString() },
];
