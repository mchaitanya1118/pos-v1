'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import { db } from '@/lib/db';
import { Order, Expense, Payment, Customer, AuditLog } from '@/lib/db/types';
import { useSessionStore } from '@/lib/store';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Printer, 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  FileText,
  DollarSign,
  Briefcase,
  AlertCircle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import jsPDF from 'jspdf';

export default function ReportsPage() {
  const { activeSettings } = useSessionStore();

  // Raw database tables
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Time boundaries states
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0] // default 7 days range
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [preset, setPreset] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses' | 'payments' | 'audits'>('sales');

  // Load database structures
  const loadData = async () => {
    try {
      const [oList, eList, pList, cList, aList] = await Promise.all([
        db.getOrders(),
        db.getExpenses(),
        db.getPayments(),
        db.getCustomers(),
        db.getAuditLogs()
      ]);
      setOrders(oList);
      setExpenses(eList);
      setPayments(pList);
      setCustomers(cList);
      setAuditLogs(aList);
    } catch (err) {
      console.error("Failed to load reports datasets", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update dates when presets change
  const handlePresetChange = (p: 'today' | 'week' | 'month') => {
    setPreset(p);
    const today = new Date().toISOString().split('T')[0];
    
    if (p === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (p === 'week') {
      const lastWeek = new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0];
      setStartDate(lastWeek);
      setEndDate(today);
    } else if (p === 'month') {
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstOfMonth);
      setEndDate(today);
    }
  };

  // Filtered datasets strictly within time boundaries
  const filteredData = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    const fOrders = orders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    });

    const fExpenses = expenses.filter(e => {
      const d = new Date(e.date + 'T12:00:00');
      return d >= start && d <= end;
    });

    const fAuditLogs = auditLogs.filter(al => {
      const d = new Date(al.createdAt);
      return d >= start && d <= end;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // newest first

    return {
      orders: fOrders,
      expenses: fExpenses,
      auditLogs: fAuditLogs
    };
  }, [orders, expenses, auditLogs, startDate, endDate]);

  // Dynamic metrics computations based on filtered boundaries
  const statementSummary = useMemo(() => {
    const sales = filteredData.orders.reduce((sum, o) => sum + o.grandTotal, 0);
    const overheads = filteredData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const profits = sales - overheads;

    // payment breakdown
    let cash = 0;
    let online = 0;
    let pendingCredit = 0;

    filteredData.orders.forEach(o => {
      if (o.paymentStatus === 'pending') {
        pendingCredit += o.grandTotal;
      } else {
        const oPays = payments.filter(p => p.orderId === o.id);
        oPays.forEach(p => {
          if (p.paymentType === 'cash') cash += p.amountPaid;
          else if (p.paymentType === 'online') online += p.amountPaid;
        });
      }
    });

    return {
      sales: parseFloat(sales.toFixed(2)),
      overheads: parseFloat(overheads.toFixed(2)),
      profits: parseFloat(profits.toFixed(2)),
      cash: parseFloat(cash.toFixed(2)),
      online: parseFloat(online.toFixed(2)),
      pendingCredit: parseFloat(pendingCredit.toFixed(2))
    };
  }, [filteredData, payments]);

  // Generate statement CSV for Excel compatibility
  const exportToCSV = () => {
    let csvContent = "";
    
    if (activeTab === 'sales') {
      csvContent = "Invoice Number,Date,Customer,Subtotal,Tax,Discount,Grand Total,Status,Payment Channel\n";
      filteredData.orders.forEach(o => {
        const custName = customers.find(c => c.id === o.customerId)?.name || "Walk-In";
        const oPays = payments.filter(p => p.orderId === o.id);
        const method = o.paymentStatus === 'pending' ? 'CREDIT' : oPays.map(p => p.paymentMethod.toUpperCase()).join('+') || 'PAID';
        
        csvContent += `${o.orderNumber},${new Date(o.createdAt).toLocaleDateString()},"${custName}",${o.subtotal},${o.tax},${o.discount},${o.grandTotal},${o.status.toUpperCase()},${method}\n`;
      });
    } else if (activeTab === 'expenses') {
      csvContent = "Expense Date,Category ID,Description Memo,Method,Amount\n";
      filteredData.expenses.forEach(e => {
        csvContent += `${e.date},${e.categoryId},"${e.description.replace(/"/g, '""')}",${e.paymentMethod.toUpperCase()},${e.amount}\n`;
      });
    } else if (activeTab === 'payments') {
      csvContent = "Collection Date,Payment Type,Method,Amount Collected,Details\n";
      filteredData.orders.forEach(o => {
        const oPays = payments.filter(p => p.orderId === o.id);
        oPays.forEach(p => {
          csvContent += `${new Date(p.createdAt).toLocaleDateString()},${p.paymentType.toUpperCase()},${p.paymentMethod.toUpperCase()},${p.amountPaid},"${p.details || ''}"\n`;
        });
      });
    } else if (activeTab === 'audits') {
      csvContent = "Timestamp,Operator,Action,Old Value,New Value,Details Remarks\n";
      filteredData.auditLogs.forEach(al => {
        csvContent += `${al.createdAt},${al.operator},${al.action},"${(al.oldValue || '').replace(/"/g, '""')}","${(al.newValue || '').replace(/"/g, '""')}","${al.details.replace(/"/g, '""')}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bistro-report-${activeTab}-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compile detailed statement PDF using jsPDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const currency = activeSettings?.currency === 'INR' ? 'Rs' : '$';

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(activeSettings?.restaurantName || "BISTRO & CO.", 14, 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Reports Statement: ${startDate} to ${endDate}`, 14, 20);
    doc.text("------------------------------------------------------------------------------------------------", 14, 24);

    // Summary financials
    doc.setFont("helvetica", "bold");
    doc.text("FINANCIAL SUMMARY STATEMENT", 14, 30);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Sales: ${currency}${statementSummary.sales.toFixed(2)}`, 14, 36);
    doc.text(`Total Expenses: ${currency}${statementSummary.overheads.toFixed(2)}`, 14, 41);
    doc.text(`Net Income Profit: ${currency}${statementSummary.profits.toFixed(2)}`, 14, 46);

    doc.text(`Cash Collections: ${currency}${statementSummary.cash.toFixed(2)}`, 110, 36);
    doc.text(`Digital Online Settlements: ${currency}${statementSummary.online.toFixed(2)}`, 110, 41);
    doc.text(`Store Credit Sales: ${currency}${statementSummary.pendingCredit.toFixed(2)}`, 110, 46);
    doc.text("------------------------------------------------------------------------------------------------", 14, 52);

    let y = 60;
    doc.setFont("helvetica", "bold");
    doc.text(`${activeTab.toUpperCase()} DETAILED STATEMENT`, 14, y);
    doc.setFont("helvetica", "normal");

    y += 8;
    if (activeTab === 'sales') {
      doc.setFontSize(8);
      doc.text("Inv Number", 14, y);
      doc.text("Date", 38, y);
      doc.text("Guest Name", 60, y);
      doc.text("Subtotal", 110, y);
      doc.text("Tax", 130, y);
      doc.text("Discount", 150, y);
      doc.text("Grand Total", 175, y);
      y += 2;
      doc.text("-------------------------------------------------------------------------------------------------------------------------------", 14, y);
      y += 4;
      
      filteredData.orders.forEach(o => {
        if (y > 270) { doc.addPage(); y = 15; }
        const custName = customers.find(c => c.id === o.customerId)?.name || "Walk-In";
        doc.text(o.orderNumber, 14, y);
        doc.text(new Date(o.createdAt).toLocaleDateString(), 38, y);
        doc.text(custName.slice(0, 20), 60, y);
        doc.text(`${currency}${o.subtotal.toFixed(2)}`, 110, y);
        doc.text(`${currency}${o.tax.toFixed(2)}`, 130, y);
        doc.text(`${currency}${o.discount.toFixed(2)}`, 150, y);
        doc.text(`${currency}${o.grandTotal.toFixed(2)}`, 175, y);
        y += 5;
      });
    } else if (activeTab === 'expenses') {
      doc.setFontSize(8);
      doc.text("Date", 14, y);
      doc.text("Description Memo", 40, y);
      doc.text("Method", 120, y);
      doc.text("Amount Paid", 165, y);
      y += 2;
      doc.text("-------------------------------------------------------------------------------------------------------------------------------", 14, y);
      y += 4;

      filteredData.expenses.forEach(e => {
        if (y > 270) { doc.addPage(); y = 15; }
        doc.text(new Date(e.date).toLocaleDateString(), 14, y);
        doc.text(e.description.slice(0, 45), 40, y);
        doc.text(e.paymentMethod.toUpperCase(), 120, y);
        doc.text(`-${currency}${e.amount.toFixed(2)}`, 165, y);
        y += 5;
      });
    } else if (activeTab === 'payments') {
      doc.setFontSize(8);
      doc.text("Date", 14, y);
      doc.text("Settlement Type", 45, y);
      doc.text("Channel Option", 85, y);
      doc.text("Collected Amount", 155, y);
      y += 2;
      doc.text("-------------------------------------------------------------------------------------------------------------------------------", 14, y);
      y += 4;

      filteredData.orders.forEach(o => {
        const oPays = payments.filter(p => p.orderId === o.id);
        oPays.forEach(p => {
          if (y > 270) { doc.addPage(); y = 15; }
          doc.text(new Date(p.createdAt).toLocaleDateString(), 14, y);
          doc.text(p.paymentType.toUpperCase(), 45, y);
          doc.text(p.paymentMethod.toUpperCase(), 85, y);
          doc.text(`${currency}${p.amountPaid.toFixed(2)}`, 155, y);
          y += 5;
        });
      });
    } else if (activeTab === 'audits') {
      doc.setFontSize(8);
      doc.text("Timestamp", 14, y);
      doc.text("Operator", 48, y);
      doc.text("Action", 70, y);
      doc.text("Details remarks log", 110, y);
      y += 2;
      doc.text("-------------------------------------------------------------------------------------------------------------------------------", 14, y);
      y += 4;

      filteredData.auditLogs.forEach(al => {
        if (y > 270) { doc.addPage(); y = 15; }
        doc.text(new Date(al.createdAt).toLocaleString(), 14, y);
        doc.text(al.operator.toUpperCase(), 48, y);
        doc.text(al.action.toUpperCase().replace('_', ' '), 70, y);
        doc.text(al.details.slice(0, 50), 110, y);
        y += 5;
      });
    }

    doc.save(`bistro-statement-${activeTab}-${startDate}-to-${endDate}.pdf`);
  };

  const currencySymbol = activeSettings?.currency === 'INR' ? '₹' : '$';

  return (
    <Navigation activeTab="reports">
      <div className="flex-1 flex flex-col gap-6 select-none">
        
        {/* Header visual toolbar */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 shadow-sm">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-indigo-500" /> Sales & Overheads Reports
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Analyze restaurant income flow, settlement collections, expense margins, and audit trail logs.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full xl:w-auto self-stretch xl:self-auto justify-end">
            <button
              type="button"
              onClick={exportToCSV}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors text-slate-700 dark:text-slate-350 active-press"
            >
              <Download className="w-4 h-4" /> Export CSV (Excel)
            </button>
            <button
              type="button"
              onClick={exportToPDF}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors text-indigo-500 hover:text-indigo-400 active-press"
            >
              <FileText className="w-4 h-4" /> Compile PDF Statement
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors active-press"
            >
              <Printer className="w-4 h-4" /> Print thermal Page
            </button>
          </div>
        </div>

        {/* Date Boundaries Filters */}
        <div className="glass-panel p-5 rounded-3xl flex flex-col lg:flex-row gap-4 items-center shrink-0 shadow-sm">
          <div className="flex gap-2 w-full lg:w-auto shrink-0 scrollbar-none overflow-x-auto">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetChange(p.id as 'today' | 'week' | 'month')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active-press ${
                  preset === p.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <div className="flex-1 lg:w-40 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPreset('custom'); }}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none"
              />
            </div>
            
            <span className="text-xs font-bold text-slate-400">to</span>

            <div className="flex-1 lg:w-40 relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPreset('custom'); }}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-9 pr-3 text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* TIME-RANGE FINANCIAL METRICS OVERVIEW */}
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          
          <div className="glass-panel p-5 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">Total Income Sales</span>
              <p className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                {currencySymbol}{statementSummary.sales.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">Cash Offset Collected</span>
              <p className="text-xl font-black text-emerald-500 tracking-tight">
                {currencySymbol}{statementSummary.cash.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">Operational Overheads</span>
              <p className="text-xl font-black text-red-500 tracking-tight">
                {currencySymbol}{statementSummary.overheads.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>

          <div className="glass-panel p-5 rounded-3xl flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">Estimated Net Profit</span>
              <p className={`text-xl font-black tracking-tight ${statementSummary.profits >= 0 ? 'text-indigo-500' : 'text-red-500'}`}>
                {currencySymbol}{statementSummary.profits.toFixed(2)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-indigo-400/10 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

        </section>

        {/* DETAILED STATEMENTS TABBED PANEL CONTAINER */}
        <section className="glass-panel rounded-3xl p-5 flex flex-col h-full shadow-md">
          {/* Tab selector */}
          <div className="flex gap-2 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0 overflow-x-auto scrollbar-none">
            {[
              { id: 'sales', label: 'Sales Invoices Log' },
              { id: 'expenses', label: 'Expense Outflows Log' },
              { id: 'payments', label: 'Payments Collection Audits' },
              { id: 'audits', label: 'Audit Trail Logs' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as 'sales' | 'expenses' | 'payments' | 'audits')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 uppercase tracking-wider active-press ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Details Tables */}
          <div className="pt-4 overflow-y-auto max-h-[450px]">
            {activeTab === 'sales' && (
              filteredData.orders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold">No sales invoices logged within this range.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 font-bold uppercase tracking-wider text-slate-500 text-[9px]">
                      <th className="p-3">Invoice</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Guest Name</th>
                      <th className="p-3 text-right">Subtotal</th>
                      <th className="p-3 text-right">GST Tax</th>
                      <th className="p-3 text-right">Discount</th>
                      <th className="p-3 text-right">Total Payable</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {filteredData.orders.map(o => {
                      const custName = customers.find(c => c.id === o.customerId)?.name || 'Walk-In';
                      return (
                        <tr key={o.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10">
                          <td className="p-3 font-bold text-indigo-500">{o.orderNumber}</td>
                           <td className="p-3 text-slate-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                          <td className="p-3">{custName}</td>
                          <td className="p-3 text-right text-slate-500">{currencySymbol}{o.subtotal.toFixed(2)}</td>
                          <td className="p-3 text-right text-slate-500">{currencySymbol}{o.tax.toFixed(2)}</td>
                          <td className="p-3 text-right text-slate-550">-{currencySymbol}{o.discount.toFixed(2)}</td>
                          <td className="p-3 text-right font-extrabold text-slate-900 dark:text-white">
                            {currencySymbol}{o.grandTotal.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              o.paymentStatus === 'paid'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/15 text-amber-505 text-amber-600 dark:text-amber-400'
                            }`}>
                              {o.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            )}

            {activeTab === 'expenses' && (
              filteredData.expenses.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold">No expense records logged within this range.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 font-bold uppercase tracking-wider text-slate-500 text-[9px]">
                      <th className="p-3">Expense Date</th>
                      <th className="p-3">Description Memo</th>
                      <th className="p-3">Payment Method</th>
                      <th className="p-3 text-right">Outflow Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {filteredData.expenses.map(e => (
                      <tr key={e.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10">
                        <td className="p-3 text-slate-400">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="p-3 italic text-slate-700 dark:text-slate-350">{e.description}</td>
                        <td className="p-3 uppercase font-bold text-slate-400">{e.paymentMethod}</td>
                        <td className="p-3 text-right font-black text-red-500">-{currencySymbol}{e.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}

            {activeTab === 'payments' && (
              filteredData.orders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold">No collection history within this range.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 font-bold uppercase tracking-wider text-slate-500 text-[9px]">
                      <th className="p-3">Invoice</th>
                      <th className="p-3">Payment Type</th>
                      <th className="p-3">Channel Option</th>
                      <th className="p-3 text-right">Amount Collected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                    {filteredData.orders.map(o => {
                      const oPays = payments.filter(p => p.orderId === o.id);
                      return oPays.map(p => (
                        <tr key={p.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10">
                          <td className="p-3 font-bold text-indigo-500">{o.orderNumber}</td>
                          <td className="p-3 uppercase">{p.paymentType}</td>
                          <td className="p-3 uppercase font-bold text-slate-400">{p.paymentMethod}</td>
                          <td className="p-3 text-right font-black text-emerald-500">{currencySymbol}{p.amountPaid.toFixed(2)}</td>
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              )
            )}

            {activeTab === 'audits' && (
              filteredData.auditLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 font-semibold">No audit trail records logged within this range.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 font-bold uppercase tracking-wider text-slate-500 text-[9px]">
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Operator</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Change Description</th>
                      <th className="p-3">Remarks & Logs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium font-semibold text-slate-700 dark:text-slate-350">
                    {filteredData.auditLogs.map(al => (
                      <tr key={al.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10">
                        <td className="p-3 text-slate-400 font-medium">{new Date(al.createdAt).toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            al.operator === 'admin'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                          }`}>
                            {al.operator}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-extrabold uppercase text-[10px] tracking-wide text-indigo-500 dark:text-indigo-400">
                            {al.action.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">
                          {al.oldValue || al.newValue ? (
                            <span className="flex items-center gap-1.5 text-xs">
                              {al.oldValue && <span className="line-through">{al.oldValue}</span>}
                              {al.oldValue && al.newValue && <ArrowRight className="w-3.5 h-3.5 text-slate-400" />}
                              {al.newValue && <span className="font-bold text-slate-800 dark:text-slate-100">{al.newValue}</span>}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{al.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
          </div>
        </section>

      </div>
    </Navigation>
  );
}
