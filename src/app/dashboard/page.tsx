'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import { db } from '@/lib/db';
import { Order, Expense, Table, Customer, Payment, PendingPayment, ExpenseCategory, StaffTransaction } from '@/lib/db/types';
import { useSessionStore } from '@/lib/store';
import { 
  DollarSign, 
  ShoppingCart, 
  Grid3X3, 
  FileText, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp,
  Percent,
  Calendar,
  Layers
} from 'lucide-react';
import dynamic from 'next/dynamic';

const SalesAreaChart = dynamic(() => import('@/components/DashboardCharts').then(mod => mod.SalesAreaChart), { ssr: false });
const PaymentPieChart = dynamic(() => import('@/components/DashboardCharts').then(mod => mod.PaymentPieChart), { ssr: false });
const ExpenseBarChart = dynamic(() => import('@/components/DashboardCharts').then(mod => mod.ExpenseBarChart), { ssr: false });

export default function DashboardPage() {
  const { activeSettings } = useSessionStore();
  
  // Database datasets
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [staffTransactions, setStaffTransactions] = useState<StaffTransaction[]>([]);

  // Hydration safety flag
  const [isMounted, setIsMounted] = useState(false);

  // Load database structures
  useEffect(() => {
    setIsMounted(true);
    const loadDashboardData = async () => {
      try {
        const [oList, eList, tList, cList, pList, ppList, ecList, stList] = await Promise.all([
          db.getOrders(),
          db.getExpenses(),
          db.getTables(),
          db.getCustomers(),
          db.getPayments(),
          db.getPendingPayments(),
          db.getExpenseCategories(),
          db.getStaffTransactions()
        ]);
        setOrders(oList);
        setExpenses(eList);
        setTables(tList);
        setCustomers(cList);
        setPayments(pList);
        setPendingPayments(ppList);
        setExpenseCategories(ecList);
        setStaffTransactions(stList);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };
    loadDashboardData();
    const unsubscribe = db.onDatabaseUpdate(() => {
      loadDashboardData();
    });
    return unsubscribe;
  }, []);

  // MATHEMATICAL METRICS COMPUTATION (TODAY'S SUMMARY)
  const statsToday = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Filter today's transactions
    const todayOrders = orders.filter(o => o.createdAt.startsWith(todayStr));
    const todayExpenses = expenses.filter(e => e.date === todayStr);

    const totalSales = todayOrders.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalExpenses = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate collection methods
    let cashReceived = 0;
    let onlinePayments = 0;
    let pendingPaymentsDue = 0;

    todayOrders.forEach(order => {
      // Find payments for this order
      const orderPayments = payments.filter(p => p.orderId === order.id);
      
      orderPayments.forEach(p => {
        if (p.paymentType === 'cash') {
          cashReceived += p.amountPaid;
        } else if (p.paymentType === 'online') {
          onlinePayments += p.amountPaid;
        }
      });

      if (order.paymentStatus === 'pending') {
        pendingPaymentsDue += order.grandTotal;
      }
    });

    const netProfit = totalSales - totalExpenses;

    return {
      totalSales: parseFloat(totalSales.toFixed(2)),
      cashReceived: parseFloat(cashReceived.toFixed(2)),
      onlinePayments: parseFloat(onlinePayments.toFixed(2)),
      pendingPaymentsDue: parseFloat(pendingPaymentsDue.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
    };
  }, [orders, expenses, payments]);

  // Operational metrics
  const cardsSummary = useMemo(() => {
    const activeTables = tables.filter(t => t.status === 'occupied').length;
    const pendingBills = orders.filter(o => o.paymentStatus === 'pending').length;
    
    // Customers with outstanding credit
    const creditCustomerIds = new Set(pendingPayments.filter(p => p.status === 'pending').map(p => p.customerId));
    const creditCustomersCount = creditCustomerIds.size;

    // Calculate outstanding advances
    const advancesOutstanding = staffTransactions
      .filter(t => t.type === 'advance')
      .reduce((sum, t) => sum + t.amount, 0) -
      staffTransactions
      .filter(t => t.type === 'deduction')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalOrdersCount: orders.length,
      activeTablesCount: activeTables,
      pendingBillsCount: pendingBills,
      creditCustomersCount: creditCustomersCount,
      advancesOutstanding: Math.max(0, advancesOutstanding)
    };
  }, [orders, tables, pendingPayments, staffTransactions]);

  // RECHARTS VISUALIZATION MATH COMPUTATIONS
  // 1. Daily Sales Trend Chart (Rolling 7 days)
  const chartSalesTrend = useMemo(() => {
    const trend: Record<string, number> = {};
    // Populate last 7 dates
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - 86400000 * i);
      const dateStr = date.toISOString().split('T')[0];
      const formattedLabel = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      trend[dateStr] = 0;
    }

    orders.forEach(o => {
      const dateStr = o.createdAt.split('T')[0];
      if (trend[dateStr] !== undefined) {
        trend[dateStr] += o.grandTotal;
      }
    });

    return Object.entries(trend).map(([dateStr, total]) => {
      const dateObj = new Date(dateStr);
      return {
        date: dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        Sales: parseFloat(total.toFixed(2))
      };
    });
  }, [orders]);

  // 2. Payment Method Distribution Chart
  const chartPaymentsDistribution = useMemo(() => {
    let cash = 0;
    let online = 0;
    let credit = 0;

    orders.forEach(o => {
      if (o.paymentStatus === 'pending') {
        credit += o.grandTotal;
      } else {
        const orderPays = payments.filter(p => p.orderId === o.id);
        orderPays.forEach(p => {
          if (p.paymentType === 'cash') cash += p.amountPaid;
          else if (p.paymentType === 'online') online += p.amountPaid;
        });
      }
    });

    const total = cash + online + credit;
    if (total === 0) {
      return [
        { name: 'Cash', value: 33 },
        { name: 'UPI/Online', value: 33 },
        { name: 'Store Credit', value: 34 }
      ];
    }

    return [
      { name: 'Cash', value: parseFloat(((cash / total) * 100).toFixed(0)) },
      { name: 'UPI/Online', value: parseFloat(((online / total) * 100).toFixed(0)) },
      { name: 'Store Credit', value: parseFloat(((credit / total) * 100).toFixed(0)) }
    ];
  }, [orders, payments]);

  // 3. Expense Breakdown Chart
  const chartExpensesBreakdown = useMemo(() => {
    const catalog: Record<string, number> = {};
    expenseCategories.forEach(ec => {
      catalog[ec.id] = 0;
    });

    expenses.forEach(e => {
      if (catalog[e.categoryId] !== undefined) {
        catalog[e.categoryId] += e.amount;
      }
    });

    const result = Object.entries(catalog)
      .map(([catId, amount]) => {
        const name = expenseCategories.find(c => c.id === catId)?.name || 'General';
        return {
          name: name,
          Amount: parseFloat(amount.toFixed(2))
        };
      })
      .filter(item => item.Amount > 0);

    if (result.length === 0) {
      return [
        { name: 'Supplies', Amount: 50 },
        { name: 'Utility', Amount: 80 },
        { name: 'Salaries', Amount: 120 }
      ];
    }
    return result;
  }, [expenses, expenseCategories]);

  const COLORS = ['#10B981', '#6366F1', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];

  const currencySymbol = activeSettings?.currency === 'INR' ? '₹' : '$';

  return (
    <Navigation activeTab="dashboard">
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Header operators section */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 shadow-sm select-none">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-indigo-500 animate-pulse" /> Analytics Terminal Dashboard
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Active sales overview, billing channels, dining statuses, and outlays
            </p>
          </div>
          
          <div className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl flex items-center gap-1.5 self-stretch sm:self-auto justify-center select-none">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Today: {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        {/* TODAY'S FINANCIAL SUMMARY SECTION */}
        <section className="select-none">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-3.5 px-1">Today&apos;s Financial Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            
            {/* Sales Card */}
            <div className="glass-panel rounded-3xl p-5 border-l-4 border-l-indigo-500 shadow-md">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Sales</span>
                <ArrowUpRight className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white mt-2 truncate">
                {currencySymbol}{statsToday.totalSales.toFixed(2)}
              </p>
              <span className="text-[9px] font-bold text-indigo-500/80 dark:text-indigo-400/80 mt-1 block">Invoiced orders</span>
            </div>

            {/* Cash Received Card */}
            <div className="glass-panel rounded-3xl p-5 border-l-4 border-l-emerald-500 shadow-md">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Cash Received</span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white mt-2 truncate">
                {currencySymbol}{statsToday.cashReceived.toFixed(2)}
              </p>
              <span className="text-[9px] font-bold text-emerald-500/85 block mt-1">Cash in hand drawer</span>
            </div>

            {/* Online Payments Card */}
            <div className="glass-panel rounded-3xl p-5 border-l-4 border-l-blue-500 shadow-md">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Online UPI</span>
                <Percent className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white mt-2 truncate">
                {currencySymbol}{statsToday.onlinePayments.toFixed(2)}
              </p>
              <span className="text-[9px] font-bold text-blue-500/85 block mt-1">Digital bank settlements</span>
            </div>

            {/* Store Credit Card */}
            <div className="glass-panel rounded-3xl p-5 border-l-4 border-l-amber-500 shadow-md">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Store Credit</span>
                <ArrowDownRight className="w-4 h-4 text-amber-500 animate-pulse" />
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white mt-2 truncate">
                {currencySymbol}{statsToday.pendingPaymentsDue.toFixed(2)}
              </p>
              <span className="text-[9px] font-bold text-amber-500/85 block mt-1">Pending receivables</span>
            </div>

            {/* Expenses Card */}
            <div className="glass-panel rounded-3xl p-5 border-l-4 border-l-rose-500 shadow-md">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Expenses</span>
                <ArrowDownRight className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-xl font-black text-slate-800 dark:text-white mt-2 truncate">
                {currencySymbol}{statsToday.totalExpenses.toFixed(2)}
              </p>
              <span className="text-[9px] font-bold text-rose-500/85 block mt-1">Outflows recorded</span>
            </div>

            {/* Profits Card */}
            <div className="glass-panel rounded-3xl p-5 border-l-4 border-l-indigo-400 shadow-md">
              <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Net Profit</span>
                <TrendingUp className="w-4 h-4 text-indigo-400" />
              </div>
              <p className={`text-xl font-black mt-2 truncate ${statsToday.netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {currencySymbol}{statsToday.netProfit.toFixed(2)}
              </p>
              <span className="text-[9px] font-bold text-indigo-400/85 block mt-1">Earnings post overheads</span>
            </div>

          </div>
        </section>

        {/* OPERATIONS STATS TALLIES */}
        <section className="select-none">
          <h2 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-3.5 px-1">Terminal Seating & Billing Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="glass-panel rounded-3xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Orders logged</span>
                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{cardsSummary.totalOrdersCount}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Active Tables (Occupied)</span>
                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{cardsSummary.activeTablesCount}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                <Grid3X3 className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Pending Invoices</span>
                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{cardsSummary.pendingBillsCount}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Active Credit Accounts</span>
                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{cardsSummary.creditCustomersCount}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-400/10 text-indigo-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Staff Advances Due</span>
                <p className="text-2xl font-black text-amber-500 mt-1">{currencySymbol}{cardsSummary.advancesOutstanding.toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

          </div>
        </section>

        {/* DYNAMIC RECHARTS CHARTS PANELS CONTAINER */}
        {isMounted && (
          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6 pb-6">
            
            {/* Sales trend Area chart */}
            <div className="xl:col-span-2 glass-panel rounded-3xl p-6 shadow-sm min-h-[380px] flex flex-col justify-between">
              <div className="flex justify-between items-center mb-4 select-none">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-white">Daily Sales Performance Trend</h3>
                <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Last 7 Days</span>
              </div>
              
              <div className="flex-1 w-full h-[280px]">
                <SalesAreaChart data={chartSalesTrend} />
              </div>
            </div>

            {/* Payment allocations Pie Chart */}
            <div className="glass-panel rounded-3xl p-6 shadow-sm min-h-[380px] flex flex-col justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white mb-4 select-none">Payment Methods Share</h3>
              
              <div className="flex-1 h-[200px] flex items-center justify-center relative">
                <PaymentPieChart data={chartPaymentsDistribution} colors={COLORS} />
              </div>

              {/* Pie Legends */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center select-none">
                {chartPaymentsDistribution.map((entry, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                      <span>{entry.name}</span>
                    </div>
                    <span className="text-sm font-black text-slate-800 dark:text-white mt-1">{entry.value}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses breakdown Chart */}
            <div className="xl:col-span-3 glass-panel rounded-3xl p-6 shadow-sm min-h-[350px] flex flex-col justify-between">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-white mb-4 select-none">Expense Outflow Allocations</h3>
              
              <div className="flex-1 w-full h-[250px]">
                <ExpenseBarChart data={chartExpensesBreakdown} colors={COLORS} />
              </div>
            </div>

          </section>
        )}

      </div>
    </Navigation>
  );
}
