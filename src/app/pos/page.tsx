'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { db } from '@/lib/db';
import { 
  Table, Order, OrderItem, MenuItem, MenuCategory, 
  Customer, Payment, PendingPayment, CustomerLedger, AuditLog, KitchenTicket 
} from '@/lib/db/types';
import { useSessionStore, useCartStore } from '@/lib/store';
import { 
  ShoppingCart, Search, Tag, X, Check, CreditCard, Landmark, 
  FileText, ShieldAlert, BadgePercent, ChevronRight, UserPlus, 
  Plus, Minus, ArrowRight, Grid3X3, Clock, Receipt, Move, 
  GitMerge, Award, SlidersHorizontal, Delete, CheckSquare, PlusCircle 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import jsPDF from 'jspdf';

export default function PosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tableParam = searchParams.get('tableId');

  // Zustand Store variables
  const { activeSettings, operatorRole } = useSessionStore();
  const { 
    items: cartItems, 
    selectedTableId, 
    selectedCustomerId, 
    discountAmount, 
    taxRate,
    addItem, 
    removeItem, 
    decreaseQuantity, 
    setTable, 
    setCustomer, 
    setDiscount, 
    setTaxRate,
    clearCart,
    getTotals 
  } = useCartStore();

  // Mode controllers
  // 'board' -> The gorgeous Bitepoint running orders card board
  // 'cart'  -> The item selection and cart creation view
  const [viewMode, setViewMode] = useState<'board' | 'cart'>('board');
  const [filterTab, setFilterTab] = useState<'all' | 'process' | 'completed'>('process');
  const [searchQuery, setSearchQuery] = useState('');

  // Primary database structures
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  // Category selections inside cart mode
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

  // Interactive Payment Checkout modal states (Reference Image 2)
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [checkoutPaymentsList, setCheckoutPaymentsList] = useState<{ method: string; amount: number }[]>([]);
  const [typedAmount, setTypedAmount] = useState<string>('0');
  const [selectedMethod, setSelectedMethod] = useState<string>('cash');

  // Standard checkout modals/managers
  const [showDetailsOrder, setShowDetailsOrder] = useState<Order | null>(null);
  
  // Custom discounts modal states
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountVal, setDiscountVal] = useState('0');
  const [passcodeConfirm, setPasscodeConfirm] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Load database structures
  const loadData = async () => {
    try {
      const [mits, cats, tbls, custs, ords, oits, pays] = await Promise.all([
        db.getMenuItems(),
        db.getCategories(),
        db.getTables(),
        db.getCustomers(),
        db.getOrders(),
        db.getOrderItems(),
        db.getPayments()
      ]);
      setMenuItems(mits);
      setCategories(cats);
      setTables(tbls);
      setCustomers(custs);
      setOrders(ords);
      setOrderItems(oits);
      setPayments(pays);

      // If redirected from seating floorplan with tableId
      if (tableParam) {
        setTable(tableParam);
        setViewMode('cart');
        // Find if this table already has an active occupied order
        const occupiedT = tbls.find(t => t.id === tableParam && (t.status === 'occupied' || t.status === 'bill_ready'));
        if (occupiedT?.runningOrderId) {
          const activeOrd = ords.find(o => o.id === occupiedT.runningOrderId);
          if (activeOrd) {
            // Load items into Zustand cart store
            clearCart();
            const activeItems = oits.filter(oi => oi.orderId === activeOrd.id);
            for (const item of activeItems) {
              const mi = mits.find(m => m.id === item.menuItemId);
              if (mi) {
                // Loop add quantity
                for (let i = 0; i < item.quantity; i++) {
                  addItem(mi);
                }
              }
            }
            if (activeOrd.customerId) setCustomer(activeOrd.customerId);
            if (activeOrd.discount) setDiscount(activeOrd.discount);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load POS database data", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [tableParam]);

  // Sync tax percentage
  useEffect(() => {
    if (activeSettings) {
      setTaxRate(activeSettings.taxPercentage);
    }
  }, [activeSettings]);

  // Dynamic cart calculations
  const totals = getTotals();

  // Create or save draft order
  const handlePlaceOrder = async (isDraft: boolean) => {
    if (cartItems.length === 0) return;

    try {
      const orderId = selectedTableId 
        ? (tables.find(t => t.id === selectedTableId)?.runningOrderId || `ord_${Date.now()}`)
        : `ord_${Date.now()}`;

      const generatedNum = `INV-${Math.floor(100000 + Math.random() * 900000)}`;

      const newOrder: Order = {
        id: orderId,
        orderNumber: generatedNum,
        tableId: selectedTableId,
        customerId: selectedCustomerId,
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        grandTotal: totals.grandTotal,
        status: isDraft ? 'draft' : 'placed',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString()
      };

      const mappedItems: OrderItem[] = cartItems.map(c => ({
        id: `oi_${Date.now()}_${Math.random()}`,
        orderId: orderId,
        menuItemId: c.item.id,
        quantity: c.quantity,
        price: c.item.price,
        subtotal: parseFloat((c.item.price * c.quantity).toFixed(2)),
        createdAt: new Date().toISOString()
      }));

      await db.saveOrder(newOrder, mappedItems);

      // Occupy table
      if (selectedTableId) {
        const tbl = tables.find(t => t.id === selectedTableId);
        if (tbl) {
          const updatedTable: Table = {
            ...tbl,
            status: isDraft ? 'occupied' : 'occupied',
            runningOrderId: orderId,
            occupiedAt: tbl.occupiedAt || new Date().toISOString()
          };
          await db.saveTable(updatedTable);
        }
      }

      // Generate Kitchen Order Ticket (KOT) if placed
      if (!isDraft) {
        const kot: KitchenTicket = {
          id: `kt_${Date.now()}`,
          orderId: orderId,
          tableId: selectedTableId,
          status: 'new',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        await db.saveKitchenTicket(kot);
      }

      clearCart();
      setViewMode('board');
      await loadData();
      alert(isDraft ? "Draft pre-order saved successfully!" : "Order placed and sent to Kitchen Queue (KOT)!");
    } catch (err) {
      console.error(err);
    }
  };

  // Open modern checkout modal
  const handleOpenCheckout = (order: Order) => {
    setCheckoutOrder(order);
    setTypedAmount(order.grandTotal.toFixed(2));
    setCheckoutPaymentsList([{ method: 'cash', amount: order.grandTotal }]);
    setSelectedMethod('cash');
  };

  // Numpad key triggers (Reference Image 2)
  const handleNumpadKey = (val: string) => {
    if (val === 'delete') {
      if (typedAmount.length <= 1) {
        setTypedAmount('0');
      } else {
        setTypedAmount(typedAmount.slice(0, -1));
      }
    } else if (val === '.') {
      if (!typedAmount.includes('.')) {
        setTypedAmount(typedAmount + '.');
      }
    } else {
      if (typedAmount === '0') {
        setTypedAmount(val);
      } else {
        setTypedAmount(typedAmount + val);
      }
    }
  };

  // Submit payment checkout
  const handleCheckoutSubmit = async () => {
    if (!checkoutOrder) return;

    try {
      const isCredit = selectedMethod === 'credit';
      let enterPaid = parseFloat(typedAmount);

      if (isCredit) {
        if (!checkoutOrder.customerId) {
          alert(`Due/Credit checkout is only allowed for registered customers. Please close this checkout modal, select/link a customer under "Guest Linkage" in the Cart panel, and try again.`);
          return;
        }
        enterPaid = 0; // nothing paid now, it is due
      } else {
        if (isNaN(enterPaid) || enterPaid < checkoutOrder.grandTotal) {
          alert(`Insufficient payment entered! Grand total is ${currencySymbol}${checkoutOrder.grandTotal.toFixed(2)}.`);
          return;
        }
      }

      if (isCredit) {
        // Calculate current outstanding debt balance for this customer
        let currentBalance = 0;
        const ledgerList = await db.getCustomerLedger();
        const entries = ledgerList.filter(l => l.customerId === checkoutOrder.customerId);
        const credits = entries.filter(e => e.transactionType === 'credit').reduce((sum, e) => sum + e.amount, 0);
        const payments = entries.filter(e => e.transactionType === 'payment').reduce((sum, e) => sum + e.amount, 0);
        currentBalance = credits - payments;

        const newBalance = parseFloat((currentBalance + checkoutOrder.grandTotal).toFixed(2));

        // 1. Save PendingPayment log
        const pendingPayment: PendingPayment = {
          id: `pp_${Date.now()}`,
          orderId: checkoutOrder.id,
          customerId: checkoutOrder.customerId!,
          amountDue: checkoutOrder.grandTotal,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days due
          status: 'pending',
          notes: `Placed due for Order ${checkoutOrder.orderNumber}`,
          createdAt: new Date().toISOString()
        };
        await db.savePendingPayment(pendingPayment);

        // 2. Record to Customer Ledger
        const ledgerEntry: CustomerLedger = {
          id: `cl_${Date.now()}`,
          customerId: checkoutOrder.customerId!,
          transactionType: 'credit',
          amount: checkoutOrder.grandTotal,
          balance: newBalance,
          transactionDate: new Date().toISOString().split('T')[0],
          notes: `Credit sale invoice ${checkoutOrder.orderNumber}`,
          createdAt: new Date().toISOString()
        };
        await db.saveLedgerEntry(ledgerEntry);

        // 3. Save pending payment record
        const newPayment: Payment = {
          id: `pay_${Date.now()}`,
          orderId: checkoutOrder.id,
          paymentType: 'pending',
          amountPaid: 0,
          paymentMethod: 'credit',
          details: `Credit/Due Checkout`,
          createdAt: new Date().toISOString()
        };
        await db.savePayment(newPayment);
      } else {
        // Record collections payments for cash/upi/card
        const newPayment: Payment = {
          id: `pay_${Date.now()}`,
          orderId: checkoutOrder.id,
          paymentType: selectedMethod === 'cash' ? 'cash' : 'online',
          amountPaid: checkoutOrder.grandTotal,
          paymentMethod: selectedMethod as any,
          createdAt: new Date().toISOString()
        };
        await db.savePayment(newPayment);
      }

      // Update Order Status to Paid/Settled
      const matchedItems = orderItems.filter(oi => oi.orderId === checkoutOrder.id);
      await db.saveOrder({ 
        ...checkoutOrder, 
        status: 'paid', 
        paymentStatus: isCredit ? 'pending' : 'paid' 
      }, matchedItems);

      // Release Table
      if (checkoutOrder.tableId) {
        const tbl = tables.find(t => t.id === checkoutOrder.tableId);
        if (tbl) {
          const updatedTable: Table = {
            ...tbl,
            status: 'available',
            runningOrderId: null,
            occupiedAt: null,
            mergedWithTableId: null
          };
          await db.saveTable(updatedTable);
        }
      }

      // Confetti burst
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

      setCheckoutOrder(null);
      await loadData();
      alert(isCredit ? "Order successfully charged to customer due account!" : "Order settled successfully!");
    } catch (err) {
      console.error(err);
    }
  };

  // Edit / Add items to existing running order
  const handleEditOrder = (order: Order) => {
    clearCart();
    setTable(order.tableId);
    setCustomer(order.customerId);
    setDiscount(order.discount);
    
    // Load active items
    const activeItems = orderItems.filter(oi => oi.orderId === order.id);
    for (const item of activeItems) {
      const mi = menuItems.find(m => m.id === item.menuItemId);
      if (mi) {
        for (let i = 0; i < item.quantity; i++) {
          addItem(mi);
        }
      }
    }
    setViewMode('cart');
  };

  // Cancel order entirely
  const handleCancelOrder = async (order: Order) => {
    if (!confirm("Are you sure you want to cancel this entire order ticket?")) return;
    try {
      const matchedItems = orderItems.filter(oi => oi.orderId === order.id);
      await db.saveOrder({ ...order, status: 'cancelled' }, matchedItems);

      if (order.tableId) {
        const tbl = tables.find(t => t.id === order.tableId);
        if (tbl) {
          await db.saveTable({ ...tbl, status: 'available', runningOrderId: null, occupiedAt: null });
        }
      }
      await loadData();
      alert("Order ticket cancelled.");
    } catch (err) {
      console.error(err);
    }
  };

  // Verified Discount Override checks
  const handleApplyDiscount = () => {
    const val = parseFloat(discountVal);
    if (isNaN(val) || val < 0) return;

    const actualPasscode = activeSettings?.passcode || '1234';
    const subtotal = totals.subtotal;

    // Check manager PIN overrides if Discount > 20% or ₹200
    const exceedsPercent = discountType === 'percentage' && val > 20;
    const exceedsFixed = discountType === 'fixed' && val > 200;

    if (exceedsPercent || exceedsFixed) {
      if (passcodeConfirm !== actualPasscode) {
        setDiscountError("Manager PIN override verification failed.");
        return;
      }
    }

    let finalDiscountFlat = 0;
    if (discountType === 'percentage') {
      finalDiscountFlat = totals.subtotal * (val / 100);
    } else {
      finalDiscountFlat = val;
    }

    setDiscount(finalDiscountFlat);
    setShowDiscountModal(false);
    setPasscodeConfirm('');
    setDiscountVal('0');
    setDiscountError(null);
  };

  // Chronological filter mappings
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // Basic searches
      const searchMatch = 
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (customers.find(c => c.id === o.customerId)?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tables.find(t => t.id === o.tableId)?.tableNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!searchMatch) return false;

      // Status filters
      if (filterTab === 'process') {
        return o.status === 'placed' || o.status === 'preparing' || o.status === 'ready' || o.status === 'served' || o.status === 'draft';
      }
      if (filterTab === 'completed') {
        return o.status === 'paid' || o.status === 'closed';
      }
      return o.status !== 'cancelled';
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, searchQuery, filterTab, tables, customers]);

  // Menu items filter inside cart mode
  const filteredMenuItems = useMemo(() => {
    if (activeCategoryId === 'all') return menuItems.filter(m => m.isAvailable);
    return menuItems.filter(m => m.categoryId === activeCategoryId && m.isAvailable);
  }, [menuItems, activeCategoryId]);

  const currencySymbol = activeSettings?.currency === 'INR' ? '₹' : '$';

  return (
    <Navigation activeTab="pos">
      <div className="flex-1 flex flex-col gap-5 max-h-screen overflow-hidden">
        
        {/* ORDERS BOARD TERMINAL (REFERENCE IMAGE 1) */}
        {viewMode === 'board' && (
          <div className="flex-1 flex flex-col gap-5 overflow-hidden animate-fade-in">
            {/* Header tools bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 select-none bg-white dark:bg-[#0b1120] p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">Orders</h1>
                <span className="text-xs text-slate-400 font-bold block mt-0.5">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto">
                <div className="relative flex-grow sm:w-64">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search order, guest, or table..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl py-2.5 pl-4 pr-10 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setViewMode('cart')}
                  className="px-4 py-2.5 rounded-2xl bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-900 dark:hover:bg-slate-200 font-black text-xs flex items-center gap-1.5 shadow-md shadow-slate-800/15 active-press shrink-0"
                >
                  <PlusCircle className="w-4 h-4" /> New Order
                </button>
              </div>
            </div>

            {/* Filter segments & toolbar */}
            <div className="flex justify-between items-center shrink-0 select-none px-1">
              <div className="flex gap-2 bg-white dark:bg-[#0b1120] p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800/80 w-max">
                {[
                  { id: 'process', label: 'On Process' },
                  { id: 'completed', label: 'Completed' },
                  { id: 'all', label: 'All Bills' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterTab(tab.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                      filterTab === tab.id
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets Grid Display */}
            <div className="flex-grow overflow-y-auto pr-1 pb-4">
              {filteredOrders.length === 0 ? (
                <div className="glass-panel rounded-3xl p-16 text-center flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#0b1120]">
                  <ShoppingCart className="w-10 h-10 text-slate-350 mb-3" />
                  <p className="text-slate-400 dark:text-slate-500 text-xs font-bold">No active running orders active in this queue.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredOrders.map(order => {
                    const tableObj = tables.find(t => t.id === order.tableId);
                    const custObj = customers.find(c => c.id === order.customerId);
                    const items = orderItems.filter(oi => oi.orderId === order.id);

                    // Map specific Bitepoint badge statuses
                    let statusLabel = 'In Progress';
                    let statusText = 'Cooking Now';
                    let badgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
                    let statusBullet = 'bg-amber-500';

                    if (order.status === 'ready' || order.status === 'served') {
                      statusLabel = 'Ready';
                      statusText = 'Ready to serve';
                      badgeColor = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400';
                      statusBullet = 'bg-emerald-500';
                    } else if (order.status === 'paid' || order.status === 'closed') {
                      statusLabel = 'Completed';
                      statusText = 'Waiting for Payment';
                      badgeColor = 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400';
                      statusBullet = 'bg-sky-500';
                    }

                    return (
                      <div key={order.id} className="glass-card rounded-[24px] bg-white dark:bg-[#0b1120] p-5 flex flex-col justify-between border border-slate-100 dark:border-slate-800 gap-4">
                        {/* Header card details */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex items-center gap-3">
                            {/* Circular Seating identifier code badge */}
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-xs shrink-0 select-none uppercase ${
                              tableObj ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400'
                            }`}>
                              {tableObj ? tableObj.tableNumber : 'TA'}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                                {custObj ? custObj.name : 'Walk-In Guest'}
                              </h4>
                              <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                                {order.orderNumber} / {tableObj ? 'Dine In' : 'Takeaway'}
                              </span>
                            </div>
                          </div>

                          <div className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold flex items-center gap-1 select-none shrink-0 ${badgeColor}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusBullet}`}></span>
                            <span>{statusLabel}</span>
                          </div>
                        </div>

                        {/* Date Tag */}
                        <div className="text-[10px] font-bold text-slate-400 flex justify-between select-none">
                          <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                          <span>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Order items lists limits to first 3 items */}
                        <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-3">
                          <div className="grid grid-cols-5 text-[9px] font-black text-slate-400 uppercase tracking-wider select-none mb-1">
                            <span className="col-span-3">Items</span>
                            <span className="text-center">Qty</span>
                            <span className="text-right">Price</span>
                          </div>
                          {items.slice(0, 3).map((oi, idx) => {
                            const mi = menuItems.find(m => m.id === oi.menuItemId);
                            return (
                              <div key={idx} className="grid grid-cols-5 text-xs font-bold text-slate-700 dark:text-slate-350">
                                <span className="col-span-3 truncate">{mi ? mi.name : 'Dish Item'}</span>
                                <span className="text-center font-black text-slate-500">{oi.quantity}</span>
                                <span className="text-right">{currencySymbol}{oi.subtotal.toFixed(2)}</span>
                              </div>
                            );
                          })}

                          {items.length > 3 && (
                            <span className="text-[10px] text-slate-800 dark:text-slate-200 font-black block pt-1 text-center bg-slate-50 dark:bg-slate-800/40 rounded py-0.5">
                              +{items.length - 3} more items in list
                            </span>
                          )}
                        </div>

                        {/* Total grand summaries block */}
                        <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80 pt-3.5 select-none mt-2">
                          <span className="text-xs font-black text-slate-400 uppercase tracking-wide">Total</span>
                          <span className="text-lg font-black text-slate-800 dark:text-white">
                            {currencySymbol}{order.grandTotal.toFixed(2)}
                          </span>
                        </div>

                        {/* Quick Action board button options */}
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <button
                            type="button"
                            onClick={() => handleEditOrder(order)}
                            className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-black text-slate-700 dark:text-slate-300 tracking-wide transition-colors active-press"
                          >
                            Edit Order
                          </button>

                          {order.paymentStatus === 'pending' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCheckout(order)}
                              className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 text-xs font-black tracking-wide transition-all shadow-md shadow-slate-800/10 active-press"
                            >
                              Pay Bills
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-400 tracking-wide text-center uppercase"
                            >
                              Settle Paid
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CART ORDER CREATION TERMINAL (STEP 1 WORKFLOW) */}
        {viewMode === 'cart' && (
          <div className="flex-grow flex flex-col xl:flex-row gap-5 overflow-hidden animate-fade-in pb-4">
            
            {/* Left menu item picker grid catalog */}
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              {/* Toolbar search row */}
              <div className="flex items-center justify-between shrink-0 select-none bg-white dark:bg-[#0b1120] p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setViewMode('board'); clearCart(); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-black text-slate-700 rounded-xl transition-colors active-press"
                >
                  ← Back to Orders list
                </button>
                <span className="text-xs font-black text-slate-400">Order Creation Terminal</span>
              </div>

              {/* Dynamic Category Pill selections */}
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setActiveCategoryId('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all active-press ${
                    activeCategoryId === 'all'
                      ? 'bg-[#0b4f48] text-white shadow-md'
                      : 'bg-white dark:bg-[#0b1120] text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  All Items
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all active-press ${
                      activeCategoryId === cat.id
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-md'
                        : 'bg-white dark:bg-[#0b1120] text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Items Card Grids listing catalog */}
              <div className="flex-1 overflow-y-auto pr-1">
                {filteredMenuItems.length === 0 ? (
                  <div className="glass-panel p-16 rounded-3xl text-center flex flex-col items-center justify-center bg-white dark:bg-[#0b1120]">
                    <p className="text-slate-400 text-xs font-bold">No active dish items found in this section.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredMenuItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => addItem(item)}
                        className="glass-card rounded-2xl bg-white dark:bg-[#0b1120] p-3 flex flex-col justify-between border border-slate-100 dark:border-slate-800 gap-3 cursor-pointer relative select-none"
                      >
                        {item.imageUrl ? (
                          <div className="w-full h-24 rounded-xl overflow-hidden bg-slate-100">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-full h-24 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 font-extrabold text-xs">
                            Dish Graphic
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-white line-clamp-1">{item.name}</h4>
                          <p className="text-[10px] text-slate-400 font-bold line-clamp-2 mt-0.5 leading-tight">{item.description}</p>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2">
                          <span className="text-xs font-black text-slate-800 dark:text-white">
                            {currencySymbol}{item.price.toFixed(2)}
                          </span>
                          <span className="text-[9px] font-black uppercase text-slate-800 dark:text-slate-200 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-850 rounded-lg">
                            Add +
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Cart Sidebar (Order Summary calculations) */}
            <div className="w-full xl:w-96 bg-white dark:bg-[#0b1120] border border-slate-250/50 dark:border-slate-800/80 rounded-[24px] p-5 flex flex-col justify-between overflow-hidden shadow-sm shrink-0">
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 select-none">
                  <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">Summary checkout</span>
                  <button type="button" onClick={clearCart} className="text-[10px] font-black text-red-500 hover:text-red-600">Clear All</button>
                </div>

                {/* Binding Dropdowns configuration */}
                <div className="space-y-2 mb-4 shrink-0 select-none">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Dining Table</label>
                      <select
                        value={selectedTableId || ''}
                        onChange={(e) => setTable(e.target.value || null)}
                        className="w-full mt-1 bg-slate-100 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800/80 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
                      >
                        <option value="">-- Choose Seating --</option>
                        {tables.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.tableNumber} (Pax: {t.capacity}) {t.status === 'occupied' ? '🔴 OCCUPIED' : '🟢 FREE'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Guest Linkage</label>
                      <select
                        value={selectedCustomerId || ''}
                        onChange={(e) => setCustomer(e.target.value || null)}
                        className="w-full mt-1 bg-slate-100 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800/80 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
                      >
                        <option value="">-- Select Guest --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Added items list */}
                <div className="flex-grow overflow-y-auto pr-1 space-y-3 mb-4">
                  {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 select-none">
                      <ShoppingCart className="w-8 h-8 mb-2 text-slate-300" />
                      <p className="text-[11px] font-bold">Your cart is currently empty. Tap menu dishes to add.</p>
                    </div>
                  ) : (
                    cartItems.map((cart, idx) => (
                      <div key={idx} className="flex justify-between items-center gap-2 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex-grow truncate">
                          <h5 className="text-xs font-black text-slate-800 dark:text-white truncate">{cart.item.name}</h5>
                          <span className="text-[10px] font-bold text-slate-400">{currencySymbol}{cart.item.price.toFixed(2)} each</span>
                        </div>

                        <div className="flex items-center gap-2 select-none shrink-0">
                          <button
                            type="button"
                            onClick={() => decreaseQuantity(cart.item.id)}
                            className="p-1 rounded bg-white border border-slate-200/60 dark:bg-slate-800 dark:border-slate-700"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black text-slate-700 dark:text-slate-300 w-4 text-center">{cart.quantity}</span>
                          <button
                            type="button"
                            onClick={() => addItem(cart.item)}
                            className="p-1 rounded bg-white border border-slate-200/60 dark:bg-slate-800 dark:border-slate-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Total tallies section */}
              <div className="border-t border-slate-100/80 pt-4 space-y-2 select-none shrink-0">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{totals.subtotal.toFixed(2)}</span>
                </div>

                {totals.discount > 0 && (
                  <div className="flex justify-between text-xs font-bold text-amber-500">
                    <span>Discount Code Applied</span>
                    <span>-{currencySymbol}{totals.discount.toFixed(2)}</span>
                  </div>
                )}

                {activeSettings?.enableGst !== false && (
                  <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                    <span>GST Tax ({taxRate}%)</span>
                    <span>{currencySymbol}{totals.tax.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-extrabold text-slate-800 dark:text-white pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-850">
                  <span>Grand Total</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {currencySymbol}{totals.grandTotal.toFixed(2)}
                  </span>
                </div>

                {/* Create POS Checkouts Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => handlePlaceOrder(true)}
                    disabled={cartItems.length === 0}
                    className="py-3 bg-slate-150 hover:bg-slate-250 disabled:bg-slate-100 disabled:text-slate-350 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-black text-slate-700 dark:text-slate-350 active-press text-center"
                  >
                    Save Draft
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePlaceOrder(false)}
                    disabled={cartItems.length === 0}
                    className="py-3 bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-900 dark:hover:bg-slate-200 disabled:bg-slate-100 disabled:text-slate-350 rounded-xl text-xs font-black active-press text-center shadow-md shadow-slate-800/15"
                  >
                    Place KOT
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* HIGH FIDELITY CHECKOUT PAYMENT MODAL (REFERENCE IMAGE 2) */}
        {checkoutOrder && (
          <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-md flex items-center justify-center px-4 select-none">
            <div className="bg-slate-50 dark:bg-[#0b1120] w-full max-w-4xl rounded-[28px] overflow-hidden flex flex-col md:flex-row relative animate-scale-in max-h-[90vh] shadow-2xl border border-slate-150/60">
              
              {/* Close Button overlay */}
              <button
                type="button"
                onClick={() => setCheckoutOrder(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 z-30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* LEFT COLUMN: Printed Paper Ticket Cut */}
              <div className="w-full md:w-1/2 p-6 flex flex-col justify-between overflow-y-auto max-h-[85vh]">
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400 block">Payment Check</span>
                  
                  {/* The printed Scalloped ticket card */}
                  <div className="bg-white dark:bg-[#131a2e] rounded-t-3xl p-5 border border-slate-150 dark:border-slate-800 scalloped-bottom shadow-sm">
                    {/* Header customer code circular info */}
                    <div className="flex justify-between items-start gap-2 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 flex items-center justify-center font-black text-xs uppercase shrink-0">
                          {tables.find(t => t.id === checkoutOrder.tableId)?.tableNumber || 'TA'}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-white leading-tight">
                            {customers.find(c => c.id === checkoutOrder.customerId)?.name || 'Walk-In Guest'}
                          </h4>
                          <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                            Order {checkoutOrder.orderNumber} / Dine In
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-black text-slate-400">{new Date(checkoutOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {/* Receipt Itemized Details list */}
                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-3 mb-6 select-text">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Transaction Details</span>
                      {orderItems.filter(oi => oi.orderId === checkoutOrder.id).map((oi, idx) => {
                        const mi = menuItems.find(m => m.id === oi.menuItemId);
                        return (
                          <div key={idx} className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-350">
                            <div className="flex-grow truncate pr-2">
                              <span className="font-extrabold text-slate-800 dark:text-white block">{mi ? mi.name : 'Dish Item'}</span>
                              <span className="text-[10px] text-slate-400">{currencySymbol}{oi.price.toFixed(2)}</span>
                            </div>
                            <span className="font-black text-slate-400 shrink-0 select-none mr-4">x{oi.quantity}</span>
                            <span className="font-black text-slate-900 dark:text-white text-right shrink-0">{currencySymbol}{oi.subtotal.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Receipt Totals Summary tallies */}
                    <div className="border-t border-dashed border-slate-200 dark:border-slate-800 pt-3.5 space-y-2 text-xs">
                      <div className="flex justify-between font-bold text-slate-500">
                        <span>Items ({orderItems.filter(oi => oi.orderId === checkoutOrder.id).reduce((s,i)=>s+i.quantity,0)})</span>
                        <span>{currencySymbol}{checkoutOrder.subtotal.toFixed(2)}</span>
                      </div>
                      {checkoutOrder.discount > 0 && (
                        <div className="flex justify-between font-bold text-amber-500">
                          <span>Discount Applied</span>
                          <span>-{currencySymbol}{checkoutOrder.discount.toFixed(2)}</span>
                        </div>
                      )}
                      {activeSettings?.enableGst !== false && (
                        <div className="flex justify-between font-bold text-slate-500">
                          <span>Tax ({activeSettings?.taxPercentage || 5}%)</span>
                          <span>{currencySymbol}{checkoutOrder.tax.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-black text-slate-900 dark:text-white text-sm pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
                        <span>Total Payable</span>
                        <span>{currencySymbol}{checkoutOrder.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Tactile Digit Keypad Numpad */}
              <div className="w-full md:w-1/2 p-6 bg-white dark:bg-[#0b1120] border-l border-slate-200/50 dark:border-slate-800/80 flex flex-col justify-between max-h-[85vh]">
                <div className="space-y-6">
                  {/* Select Payment Method Options */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-black tracking-wider text-slate-400">Select payment method</label>
                    <select
                      value={selectedMethod}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-black focus:outline-none"
                    >
                      <option value="cash">💵 Cash Checkout</option>
                      <option value="upi">📲 UPI Instant QR</option>
                      <option value="card">💳 Credit / Debit Card</option>
                      <option value="credit">📌 Credit / Due Checkout</option>
                    </select>

                    {selectedMethod === 'credit' && (
                      <div className="mt-2 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/40">
                        {checkoutOrder.customerId ? (
                          <span>This order total of <strong>{currencySymbol}{checkoutOrder.grandTotal.toFixed(2)}</strong> will be charged as debt to customer <strong>{customers.find(c => c.id === checkoutOrder.customerId)?.name}</strong>.</span>
                        ) : (
                          <span className="text-rose-500 font-extrabold block">⚠️ No customer linked! Please select/link a customer in "Guest Linkage" dropdown in the Cart panel before placing this due order.</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Gigantic input display */}
                  <div className="text-center py-4 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 relative select-text">
                    <span className="text-slate-350 dark:text-slate-500 font-extrabold text-xl align-middle mr-1">{currencySymbol}</span>
                    <span className="text-3xl font-black text-slate-800 dark:text-white align-middle">{typedAmount}</span>
                    <span className="w-1.5 h-6 bg-indigo-500 inline-block animate-pulse ml-1 align-middle"></span>
                  </div>

                  {/* Quick-denomination selection row */}
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: '100', label: `${currencySymbol}100` },
                      { val: '200', label: `${currencySymbol}200` },
                      { val: '500', label: `${currencySymbol}500` },
                      { val: '2000', label: `${currencySymbol}2k` }
                    ].map(den => (
                      <button
                        key={den.val}
                        type="button"
                        onClick={() => setTypedAmount(den.val)}
                        className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 hover:text-slate-800 text-slate-500 font-black text-[11px] text-center transition-all duration-150 active-press shadow-sm"
                      >
                        {den.label}
                      </button>
                    ))}
                  </div>

                  {/* Keyboard Digit Panel */}
                  <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mx-auto select-none">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(key => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleNumpadKey(key)}
                        className="w-14 h-14 rounded-full border border-slate-100 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-350 text-lg font-black flex items-center justify-center transition-all duration-100 active-press mx-auto"
                      >
                        {key}
                      </button>
                    ))}

                    <button
                      key="dot"
                      type="button"
                      onClick={() => handleNumpadKey('.')}
                      className="w-14 h-14 rounded-full border border-slate-100 dark:border-slate-800 hover:bg-slate-50 text-slate-750 text-lg font-black flex items-center justify-center active-press mx-auto"
                    >
                      .
                    </button>

                    <button
                      key="0"
                      type="button"
                      onClick={() => handleNumpadKey('0')}
                      className="w-14 h-14 rounded-full border border-slate-100 dark:border-slate-800 hover:bg-slate-50 text-slate-750 text-lg font-black flex items-center justify-center active-press mx-auto"
                    >
                      0
                    </button>

                    <button
                      key="delete"
                      type="button"
                      onClick={() => handleNumpadKey('delete')}
                      className="w-14 h-14 rounded-full bg-slate-100/50 hover:bg-slate-200/50 text-slate-500 flex items-center justify-center active-press mx-auto"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Settle pay now giant button */}
                <button
                  type="button"
                  onClick={handleCheckoutSubmit}
                  className="w-full py-4 mt-6 rounded-2xl bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 hover:bg-slate-900 dark:hover:bg-slate-200 text-sm font-black uppercase tracking-wider transition-all shadow-md shadow-slate-800/15 active-press text-center"
                >
                  {selectedMethod === 'credit' ? 'Record Customer Due' : 'Pay Now'}
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </Navigation>
  );
}
