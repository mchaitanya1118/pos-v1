'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import { db } from '@/lib/db';
import { Customer, CustomerLedger, Payment, PendingPayment } from '@/lib/db/types';
import { useSessionStore } from '@/lib/store';
import { 
  Users, 
  Search, 
  Plus, 
  X, 
  Printer, 
  Check, 
  AlertCircle, 
  Coins, 
  History,
  TrendingDown,
  UserCheck,
  Pencil,
  Trash2
} from 'lucide-react';

export default function CustomersPage() {
  const { activeSettings, operatorRole } = useSessionStore();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledger, setLedger] = useState<CustomerLedger[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Form toggles / input states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Quick Add Form
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  // Settle Payment Form
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'cash' | 'upi' | 'phonepe' | 'gpay' | 'paytm' | 'bank_transfer'>('cash');
  const [payNotes, setPayNotes] = useState('');

  // Load database structures
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cList, lList, ppList] = await Promise.all([
          db.getCustomers(),
          db.getCustomerLedger(),
          db.getPendingPayments()
        ]);
        setCustomers(cList);
        setLedger(lList);
        setPendingPayments(ppList);
        if (cList.length > 0) {
          setSelectedCustomerId(cList[0].id);
        }
      } catch (err) {
        console.error("Failed to load customer datasets", err);
      }
    };
    loadData();
  }, []);

  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Compute stats for each customer
  const customerStats = useMemo(() => {
    const stats: Record<string, { pending: number; paid: number; lastPaymentDate: string | null }> = {};
    
    customers.forEach(c => {
      // Find all ledger entries
      const entries = ledger.filter(l => l.customerId === c.id);
      
      const credits = entries.filter(e => e.transactionType === 'credit').reduce((sum, e) => sum + e.amount, 0);
      const payments = entries.filter(e => e.transactionType === 'payment').reduce((sum, e) => sum + e.amount, 0);
      
      const lastPaymentEntry = entries
        .filter(e => e.transactionType === 'payment')
        .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      stats[c.id] = {
        pending: parseFloat(Math.max(0, credits - payments).toFixed(2)),
        paid: parseFloat(payments.toFixed(2)),
        lastPaymentDate: lastPaymentEntry ? lastPaymentEntry.transactionDate : null
      };
    });

    return stats;
  }, [customers, ledger]);

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      return c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             c.mobile.includes(searchQuery) ||
             (c.notes && c.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [customers, searchQuery]);

  // Settle transaction payment towards debt
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !payAmount || isNaN(parseFloat(payAmount))) return;

    const amount = parseFloat(payAmount);
    const activeStat = customerStats[selectedCustomerId];
    if (amount <= 0 || amount > activeStat.pending) {
      alert("Invalid payment amount. Amount must be greater than zero and less than or equal to outstanding balance.");
      return;
    }

    try {
      const orderId = `pay_offset_${Date.now()}`;
      
      // Save Payment log
      const newPayment: Payment = {
        id: `pay_${Date.now()}`,
        orderId: orderId,
        paymentType: 'cash',
        amountPaid: amount,
        paymentMethod: payMethod,
        details: payNotes || `Debt settlement`,
        createdAt: new Date().toISOString()
      };
      await db.savePayment(newPayment);

      // Settle Pending payments in database (FIFO model or direct reduction)
      const outstandingPP = pendingPayments
        .filter(p => p.customerId === selectedCustomerId && p.status === 'pending')
        .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      let remainingPayment = amount;
      for (const pp of outstandingPP) {
        if (remainingPayment <= 0) break;
        if (pp.amountDue <= remainingPayment) {
          remainingPayment -= pp.amountDue;
          const updatedPP: PendingPayment = { ...pp, status: 'settled', amountDue: 0 };
          await db.savePendingPayment(updatedPP);
          setPendingPayments(prev => prev.map(p => p.id === pp.id ? updatedPP : p));
        } else {
          const updatedPP: PendingPayment = { ...pp, amountDue: parseFloat((pp.amountDue - remainingPayment).toFixed(2)) };
          await db.savePendingPayment(updatedPP);
          remainingPayment = 0;
          setPendingPayments(prev => prev.map(p => p.id === pp.id ? updatedPP : p));
        }
      }

      // Record to Customer Ledger
      const currentBalance = activeStat.pending;
      const newBalance = parseFloat((currentBalance - amount).toFixed(2));
      const ledgerEntry: CustomerLedger = {
        id: `cl_${Date.now()}`,
        customerId: selectedCustomerId,
        transactionType: 'payment',
        amount: amount,
        balance: newBalance,
        transactionDate: new Date().toISOString().split('T')[0],
        notes: payNotes || `Payment offset registered using ${payMethod.toUpperCase()}`,
        createdAt: new Date().toISOString()
      };
      
      await db.saveLedgerEntry(ledgerEntry);
      setLedger(prev => [...prev, ledgerEntry]);
      
      setPayAmount('');
      setPayNotes('');
      setShowPayModal(false);
    } catch (err) {
      console.error("Failed to register credit settlement payment", err);
    }
  };

  // Add new customer profile
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile) return;

    const newCustomer: Customer = {
      id: `c_${Date.now()}`,
      name: name,
      mobile: mobile,
      address: address,
      notes: notes,
      createdAt: new Date().toISOString()
    };

    try {
      await db.saveCustomer(newCustomer);
      setCustomers(prev => [...prev, newCustomer]);
      setSelectedCustomerId(newCustomer.id);
      
      setName('');
      setMobile('');
      setAddress('');
      setNotes('');
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add customer", err);
    }
  };

  const handleOpenEditModal = (customer: Customer) => {
    setEditName(customer.name);
    setEditMobile(customer.mobile);
    setEditAddress(customer.address || '');
    setEditNotes(customer.notes || '');
    setShowEditModal(true);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !editName || !editMobile) return;
    if (operatorRole !== 'admin') {
      alert("Access Denied: Administrative privileges required.");
      return;
    }
    
    const updatedCustomer: Customer = {
      ...activeCustomer!,
      name: editName,
      mobile: editMobile,
      address: editAddress,
      notes: editNotes
    };

    try {
      await db.saveCustomer(updatedCustomer);
      setCustomers(prev => prev.map(c => c.id === selectedCustomerId ? updatedCustomer : c));
      setShowEditModal(false);
    } catch (err) {
      console.error("Failed to update customer", err);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (operatorRole !== 'admin') {
      alert("Access Denied: Administrative privileges required.");
      return;
    }
    
    const stats = customerStats[id];
    if (stats && stats.pending > 0) {
      alert(`Cannot delete customer: This customer has an outstanding balance of ${currencySymbol}${stats.pending.toFixed(2)}. Please settle all balances before removing the profile.`);
      return;
    }

    if (!confirm("Are you sure you want to delete this customer profile? This action is permanent and cannot be undone.")) {
      return;
    }

    try {
      await db.deleteCustomer(id);
      const updatedCustomers = customers.filter(c => c.id !== id);
      setCustomers(updatedCustomers);
      
      // Self-Selection Sync
      if (selectedCustomerId === id) {
        if (updatedCustomers.length > 0) {
          setSelectedCustomerId(updatedCustomers[0].id);
        } else {
          setSelectedCustomerId(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete customer", err);
    }
  };

  const activeCustomerLedger = useMemo(() => {
    if (!selectedCustomerId) return [];
    return ledger
      .filter(l => l.customerId === selectedCustomerId)
      .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ledger, selectedCustomerId]);

  const currencySymbol = activeSettings?.currency === 'INR' ? '₹' : '$';

  return (
    <Navigation activeTab="customers">
      <div className="flex-1 flex flex-col gap-6 h-[calc(100vh-100px)] md:h-[calc(100vh-48px)] overflow-hidden">
        
        {/* Top header bar */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm select-none">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-500" /> Customer Credit Ledger
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Manage accounts receivable, outstanding debts, and customer profiles
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs flex items-center gap-2 shadow-md active-press self-stretch md:self-auto justify-center"
          >
            <Plus className="w-4 h-4" /> Add Guest Profile
          </button>
        </div>

        {/* Dynamic Split Dashboard Panel */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-0">
          
          {/* LEFT INDEX: Customer list & search */}
          <div className="w-full md:w-80 glass-panel rounded-3xl p-4 flex flex-col h-full min-h-0 shrink-0">
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {filteredCustomers.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-xs font-semibold">No customers registered.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredCustomers.map(c => {
                    const stats = customerStats[c.id] || { pending: 0 };
                    const isSelected = selectedCustomerId === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-slate-100/50 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-700/35 hover:bg-slate-150 dark:hover:bg-slate-800'
                        }`}
                      >
                        <h4 className="font-bold text-xs truncate">{c.name}</h4>
                        <p className={`text-[10px] mt-1 font-semibold ${isSelected ? 'text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                          {c.mobile}
                        </p>
                        
                        {/* Outstanding Badging */}
                        <div className="mt-2 flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                          <span>Pending Debt</span>
                          <span className={stats.pending > 0 ? (isSelected ? 'text-white' : 'text-amber-500') : (isSelected ? 'text-slate-200' : 'text-emerald-500')}>
                            {currencySymbol}{stats.pending.toFixed(2)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT VIEW: Credit Ledger ledger table details */}
          <div className="flex-1 glass-panel rounded-3xl p-6 flex flex-col h-full overflow-hidden min-h-0 select-none">
            {activeCustomer ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-indigo-500" /> {activeCustomer.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      Mobile: {activeCustomer.mobile} | Address: {activeCustomer.address || 'N/A'}
                    </p>
                    {activeCustomer.notes && (
                      <p className="text-[10px] text-slate-400 italic mt-1 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md inline-block">
                        Memo: {activeCustomer.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto self-stretch sm:self-auto justify-end">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-4 h-4" /> Print Statement
                    </button>
                    {operatorRole === 'admin' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(activeCustomer)}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors active-press"
                        >
                          <Pencil className="w-4 h-4 text-indigo-500" /> Edit Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomer(activeCustomer.id)}
                          className="px-4 py-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-colors active-press"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" /> Delete Profile
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowPayModal(true)}
                      disabled={(customerStats[activeCustomer.id]?.pending || 0) === 0}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Coins className="w-4 h-4" /> Settle Credit / Pay
                    </button>
                  </div>
                </div>

                {/* Summary Credit Cards */}
                <div className="grid grid-cols-3 gap-4 py-6 shrink-0 border-b border-slate-200 dark:border-slate-800">
                  <div className="bg-slate-100/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/40">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Total Outstanding Debt</span>
                    <span className="text-xl font-extrabold text-red-500 tracking-tight">
                      {currencySymbol}{(customerStats[activeCustomer.id]?.pending || 0).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="bg-slate-100/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/40">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Total Paid Back</span>
                    <span className="text-xl font-extrabold text-emerald-500 tracking-tight">
                      {currencySymbol}{(customerStats[activeCustomer.id]?.paid || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-slate-100/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/40">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Last Payment Date</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mt-2">
                      {customerStats[activeCustomer.id]?.lastPaymentDate 
                        ? new Date(customerStats[activeCustomer.id].lastPaymentDate!).toLocaleDateString()
                        : 'No payments yet'}
                    </span>
                  </div>
                </div>

                {/* Historical Ledger Audit list */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 pt-4">
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-3 flex items-center gap-1.5 shrink-0 select-none">
                    <History className="w-4 h-4 text-slate-400" /> Account Audit History Log
                  </h3>

                  <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    {activeCustomerLedger.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 dark:text-slate-500 h-full flex flex-col justify-center items-center">
                        <AlertCircle className="w-8 h-8 mb-2" />
                        <p className="text-xs font-semibold">Clean Account profile. No transactions logged.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 font-bold uppercase tracking-wider text-slate-500 text-[9px] select-none">
                            <th className="p-3">Date</th>
                            <th className="p-3">Transaction</th>
                            <th className="p-3 text-right">Debit (Debt)</th>
                            <th className="p-3 text-right">Credit (Paid)</th>
                            <th className="p-3 text-right">Balance Due</th>
                            <th className="p-3">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                          {activeCustomerLedger.map(entry => (
                            <tr key={entry.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10 font-medium">
                              <td className="p-3 text-slate-400">{new Date(entry.transactionDate).toLocaleDateString()}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  entry.transactionType === 'credit'
                                    ? 'bg-red-500/15 text-red-500'
                                    : 'bg-emerald-500/15 text-emerald-500'
                                }`}>
                                  {entry.transactionType === 'credit' ? 'Debt Sale' : 'Settlement'}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-300">
                                {entry.transactionType === 'credit' ? `${currencySymbol}${entry.amount.toFixed(2)}` : '-'}
                              </td>
                              <td className="p-3 text-right font-bold text-emerald-500">
                                {entry.transactionType === 'payment' ? `${currencySymbol}${entry.amount.toFixed(2)}` : '-'}
                              </td>
                              <td className="p-3 text-right font-bold text-slate-800 dark:text-white">
                                {currencySymbol}{entry.balance.toFixed(2)}
                              </td>
                              <td className="p-3 text-slate-400 italic max-w-xs truncate">{entry.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-center items-center text-center text-slate-500">
                <Users className="w-12 h-12 text-slate-400 mb-3" />
                <p className="font-semibold">Select a customer profile to inspect credit details.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-md flex items-center justify-center px-4">
          <form onSubmit={handleAddCustomer} className="glass-panel w-full max-w-md rounded-3xl p-6 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base mb-4">Add Guest Profile</h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="Address details"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Preferences & Notes</label>
                <textarea
                  placeholder="Dietary details or preferences"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-1/3 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Create Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {showEditModal && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-md flex items-center justify-center px-4">
          <form onSubmit={handleUpdateCustomer} className="glass-panel w-full max-w-md rounded-3xl p-6 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-indigo-500" /> Edit Customer Profile
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Customer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Billing Address</label>
                <input
                  type="text"
                  placeholder="Address details"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Preferences & Notes</label>
                <textarea
                  placeholder="Dietary details or preferences"
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-1/3 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SETTLE CREDIT / RECORD PAYMENT MODAL */}
      {showPayModal && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-md flex items-center justify-center px-4">
          <form onSubmit={handleRecordPayment} className="glass-panel w-full max-w-sm rounded-3xl p-6 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setShowPayModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-1.5">
              <Coins className="w-5 h-5 text-emerald-500" /> Settle Credit Debt
            </h3>

            {/* Total balance info */}
            <div className="p-3 bg-red-500/10 dark:bg-red-400/5 rounded-2xl mb-4 flex justify-between items-center text-xs font-semibold text-red-500">
              <span>Outstanding Debt:</span>
              <span className="text-base font-extrabold">
                {currencySymbol}{(customerStats[activeCustomer.id]?.pending || 0).toFixed(2)}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Payment Amount Received ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Settle Full Balance Button */}
              <button
                type="button"
                onClick={() => setPayAmount(String(customerStats[activeCustomer.id]?.pending || 0))}
                className="w-full py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-colors"
              >
                Settle Full Outstanding Balance
              </button>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Settlement Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as 'cash' | 'upi' | 'phonepe' | 'gpay' | 'paytm' | 'bank_transfer')}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="cash">Cash Offset</option>
                  <option value="upi">UPI QR Offset</option>
                  <option value="gpay">Google Pay</option>
                  <option value="phonepe">PhonePe Transfer</option>
                  <option value="paytm">Paytm Offset</option>
                  <option value="bank_transfer">Direct Bank Deposit</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  Notes / Audit Remarks
                </label>
                <input
                  type="text"
                  placeholder="Remarks for this collection..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="w-1/3 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!payAmount || isNaN(parseFloat(payAmount)) || parseFloat(payAmount) <= 0 || parseFloat(payAmount) > (customerStats[activeCustomer.id]?.pending || 0)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Record Payment Settlement
              </button>
            </div>
          </form>
        </div>
      )}

    </Navigation>
  );
}
