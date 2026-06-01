'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import { db } from '@/lib/db';
import { User, StaffTransaction } from '@/lib/db/types';
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
  DollarSign,
  Briefcase,
  Wallet,
  Gift,
  ArrowDownCircle,
  ArrowUpCircle,
  PlusCircle,
  MinusCircle,
  Trash2,
  UserPlus,
  Eye,
  EyeOff,
  Pencil
} from 'lucide-react';

export default function StaffLedgerPage() {
  const { activeSettings, operatorRole } = useSessionStore();
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<StaffTransaction[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Form toggles / input states
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Staff CRUD form toggles / input states
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState<'admin' | 'staff' | 'no_login'>('staff');
  const [staffPasscode, setStaffPasscode] = useState('');
  const [showPasscodeText, setShowPasscodeText] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  // Record Transaction Form State
  const [txType, setTxType] = useState<'salary' | 'advance' | 'bonus' | 'deduction'>('salary');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txMethod, setTxMethod] = useState<'cash' | 'upi' | 'phonepe' | 'gpay' | 'paytm' | 'bank_transfer'>('cash');
  const [txNotes, setTxNotes] = useState('');

  // Load database structures
  useEffect(() => {
    const loadData = async () => {
      try {
        const [uList, tList] = await Promise.all([
          db.getUsers(),
          db.getStaffTransactions()
        ]);
        setUsers(uList);
        setTransactions(tList);
        if (uList.length > 0) {
          setSelectedUserId(uList[0].id);
        }
      } catch (err) {
        console.error("Failed to load staff datasets", err);
      }
    };
    loadData();
  }, []);

  const activeStaff = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Compute live balances for each staff member
  const staffBalances = useMemo(() => {
    const balances: Record<string, { salaryPaid: number; advancesOutstanding: number; bonusesGiven: number; deductionsApplied: number }> = {};
    
    users.forEach(u => {
      const txs = transactions.filter(t => t.userId === u.id);
      
      const salary = txs.filter(t => t.type === 'salary').reduce((sum, t) => sum + t.amount, 0);
      const advance = txs.filter(t => t.type === 'advance').reduce((sum, t) => sum + t.amount, 0);
      const bonus = txs.filter(t => t.type === 'bonus').reduce((sum, t) => sum + t.amount, 0);
      const deduction = txs.filter(t => t.type === 'deduction').reduce((sum, t) => sum + t.amount, 0);

      balances[u.id] = {
        salaryPaid: parseFloat(salary.toFixed(2)),
        advancesOutstanding: parseFloat(Math.max(0, advance - deduction).toFixed(2)),
        bonusesGiven: parseFloat(bonus.toFixed(2)),
        deductionsApplied: parseFloat(deduction.toFixed(2))
      };
    });

    return balances;
  }, [users, transactions]);

  // Filtered staff list
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      return u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             u.role.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [users, searchQuery]);

  // Record a transaction
  const handleRecordTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !txAmount || isNaN(parseFloat(txAmount))) return;
    if (operatorRole !== 'admin') {
      alert("Access Denied: Administrative privileges required.");
      return;
    }

    const amount = parseFloat(txAmount);
    if (amount <= 0) {
      alert("Amount must be greater than zero.");
      return;
    }

    // Deduction Safeguard
    if (txType === 'deduction') {
      const activeBalance = staffBalances[selectedUserId]?.advancesOutstanding || 0;
      if (amount > activeBalance) {
        alert(`Deduction cannot exceed outstanding advance balance. Selected staff member has only ${currencySymbol}${activeBalance.toFixed(2)} in outstanding advances.`);
        return;
      }
    }

    const newTx: StaffTransaction = {
      id: `st_${Date.now()}`,
      userId: selectedUserId,
      type: txType,
      amount: amount,
      date: txDate,
      paymentMethod: txMethod,
      notes: txNotes || `${txType.toUpperCase()} recorded`,
      createdAt: new Date().toISOString()
    };

    try {
      await db.saveStaffTransaction(newTx);
      setTransactions(prev => [newTx, ...prev]);
      
      // Reset Form State
      setTxAmount('');
      setTxNotes('');
      setTxType('salary');
      setTxMethod('cash');
      setTxDate(new Date().toISOString().split('T')[0]);
      setShowRecordModal(false);
    } catch (err) {
      console.error("Failed to save staff transaction", err);
    }
  };

  // Revoke/Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    if (operatorRole !== 'admin') {
      alert("Access Denied: Administrative privileges required.");
      return;
    }

    const targetTx = transactions.find(t => t.id === id);
    if (!targetTx) return;

    // Guard: If revoking an advance, check that it won't make the outstanding advances negative (i.e. deductions exceed advances)
    if (targetTx.type === 'advance') {
      const activeBalance = staffBalances[targetTx.userId];
      // Outstanding advances = advances - deductions. If we remove an advance, new outstanding = (advances - amount) - deductions = activeBalance - amount.
      // If activeBalance - amount < 0, it means deductions exceed the new advance sum.
      if (activeBalance && (activeBalance.advancesOutstanding - targetTx.amount) < 0) {
        alert(`Cannot revoke this advance: The deductions applied (${currencySymbol}${activeBalance.deductionsApplied.toFixed(2)}) would exceed the remaining advances. Revoke the deductions first.`);
        return;
      }
    }

    if (!confirm("Are you sure you want to revoke this transaction? This action is permanent and cannot be undone.")) {
      return;
    }

    try {
      await db.deleteStaffTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Failed to delete staff transaction", err);
    }
  };

  const handleOpenAddStaff = () => {
    setStaffName('');
    setStaffRole('staff');
    setStaffPasscode('');
    setStaffError(null);
    setShowPasscodeText(false);
    setShowAddStaffModal(true);
  };

  const handleOpenEditStaff = () => {
    if (!activeStaff) return;
    setStaffName(activeStaff.name);
    setStaffRole(activeStaff.role);
    setStaffPasscode(activeStaff.passcode || '');
    setStaffError(null);
    setShowPasscodeText(false);
    setShowEditStaffModal(true);
  };

  const handleSaveStaff = async (e: React.FormEvent, isEditing: boolean) => {
    e.preventDefault();
    setStaffError(null);

    if (!staffName.trim()) {
      setStaffError("Please enter a valid operator name.");
      return;
    }

    if (staffRole !== 'no_login') {
      if (staffPasscode.length !== 4 || isNaN(parseInt(staffPasscode))) {
        setStaffError("Passcode must be exactly 4 numeric digits.");
        return;
      }

      // Verify passcode uniqueness
      const passcodeExists = users.some(u => u.passcode === staffPasscode && (!isEditing || u.id !== selectedUserId));
      const isGlobalAdminPasscode = staffPasscode === (activeSettings?.passcode || '1234');
      const isGlobalStaffPasscode = staffPasscode === '4321';
      if (passcodeExists || isGlobalAdminPasscode || isGlobalStaffPasscode) {
        setStaffError("This passcode is already assigned. Please choose a unique PIN.");
        return;
      }
    }

    let currentUserId = '';
    if (typeof window !== 'undefined') {
      currentUserId = localStorage.getItem('pos_user_id') || '';
    }

    // Security Block: Avoid downgrading own role
    if (isEditing && selectedUserId === currentUserId && staffRole === 'staff') {
      setStaffError("Security Block: You cannot downgrade your own active administrator role to staff.");
      return;
    }

    const targetUser: User = {
      id: isEditing && selectedUserId ? selectedUserId : `u_${Date.now()}`,
      name: staffName,
      role: staffRole,
      passcode: staffRole === 'no_login' ? '' : staffPasscode,
      createdAt: isEditing && activeStaff ? activeStaff.createdAt : new Date().toISOString()
    };

    try {
      await db.saveUser(targetUser);
      
      if (isEditing) {
        setUsers(prev => prev.map(u => u.id === selectedUserId ? targetUser : u));
        setShowEditStaffModal(false);
      } else {
        setUsers(prev => [...prev, targetUser]);
        setSelectedUserId(targetUser.id);
        setShowAddStaffModal(false);
      }
      
      setStaffName('');
      setStaffPasscode('');
      setStaffRole('staff');
    } catch (err) {
      setStaffError("Failed to save operator account.");
      console.error(err);
    }
  };

  const handleDeleteStaff = async () => {
    if (!selectedUserId || !activeStaff) return;
    if (operatorRole !== 'admin') {
      alert("Access Denied: Administrative privileges required.");
      return;
    }

    let currentUserId = '';
    if (typeof window !== 'undefined') {
      currentUserId = localStorage.getItem('pos_user_id') || '';
    }

    if (selectedUserId === currentUserId || (selectedUserId === 'u_admin' && operatorRole === 'admin')) {
      alert("Security Block: You cannot delete your own active administrator account.");
      return;
    }

    // Outstanding Advance check
    const stats = staffBalances[selectedUserId];
    if (stats && stats.advancesOutstanding > 0) {
      alert(`Cannot delete staff member: This employee has an outstanding advance of ${currencySymbol}${stats.advancesOutstanding.toFixed(2)}. Please settle or deduct all advances before removing their profile.`);
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete operator "${activeStaff.name}"?`)) {
      return;
    }

    try {
      await db.deleteUser(selectedUserId);
      
      const updatedUsers = users.filter(u => u.id !== selectedUserId);
      setUsers(updatedUsers);
      
      // Fallback selection sync
      if (updatedUsers.length > 0) {
        setSelectedUserId(updatedUsers[0].id);
      } else {
        setSelectedUserId(null);
      }
    } catch (err) {
      console.error("Failed to delete staff profile", err);
    }
  };

  const activeStaffTransactions = useMemo(() => {
    if (!selectedUserId) return [];
    return transactions
      .filter(t => t.userId === selectedUserId)
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [transactions, selectedUserId]);

  const currencySymbol = activeSettings?.currency === 'INR' ? '₹' : '$';

  return (
    <Navigation activeTab="staff">
      <div className="flex-1 flex flex-col gap-6 h-[calc(100vh-100px)] md:h-[calc(100vh-48px)] overflow-hidden">
        
        {/* Top header bar */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm select-none">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <UserCheck className="w-6 h-6 text-indigo-500" /> Staff Management & Ledger
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Record staff salaries, salary advances, bonuses, deductions, and payment ledger accounts
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowRecordModal(true)}
            className="px-5 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs flex items-center gap-2 shadow-md active-press self-stretch md:self-auto justify-center"
          >
            <Plus className="w-4 h-4" /> Record Transaction
          </button>
        </div>

        {/* Dynamic Split Dashboard Panel */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden min-h-0">
          
          {/* LEFT INDEX: Dynamic Staff Members List */}
          <div className="w-full md:w-80 glass-panel rounded-3xl p-4 flex flex-col h-full min-h-0 shrink-0">
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
              {operatorRole === 'admin' && (
                <button
                  type="button"
                  onClick={handleOpenAddStaff}
                  className="px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center shadow-md active-press transition-colors"
                  title="Add Staff Member"
                >
                  <UserPlus className="w-4.5 h-4.5" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {filteredUsers.length === 0 ? (
                <p className="text-slate-500 text-center py-8 text-xs font-semibold">No personnel found.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredUsers.map(u => {
                    const stats = staffBalances[u.id] || { salaryPaid: 0, advancesOutstanding: 0 };
                    const isSelected = selectedUserId === u.id;
                    const initials = u.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUserId(u.id)}
                        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-slate-100/50 dark:bg-slate-800/40 border-slate-200/50 dark:border-slate-700/35 hover:bg-slate-150 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isSelected 
                              ? 'bg-white/20 text-white' 
                              : 'bg-indigo-500/10 text-indigo-500'
                          }`}>
                            {initials || 'OP'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-xs truncate">{u.name}</h4>
                            <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-full ${
                              isSelected 
                                ? 'bg-white/10 text-white' 
                                : u.role === 'admin'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : u.role === 'no_login'
                                ? 'bg-slate-200/80 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                : 'bg-indigo-500/10 text-indigo-500'
                            }`}>
                              {u.role === 'admin' ? 'Administrator' : u.role === 'no_login' ? 'No Login' : 'Staff'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Outstanding Advances & Salary Badging */}
                        <div className="mt-3 pt-2.5 border-t border-dashed border-white/10 flex flex-col gap-1 text-[10px]">
                          <div className="flex justify-between items-center font-bold tracking-wide">
                            <span className={isSelected ? 'text-slate-200' : 'text-slate-400'}>Advances Due</span>
                            <span className={stats.advancesOutstanding > 0 ? (isSelected ? 'text-white' : 'text-amber-500 font-extrabold') : (isSelected ? 'text-slate-350' : 'text-slate-400')}>
                              {currencySymbol}{stats.advancesOutstanding.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center font-bold tracking-wide">
                            <span className={isSelected ? 'text-slate-200' : 'text-slate-400'}>Salary Paid</span>
                            <span className={isSelected ? 'text-white font-extrabold' : 'text-emerald-500 font-extrabold'}>
                              {currencySymbol}{stats.salaryPaid.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT VIEW: Staff Details & Ledgers Table */}
          <div className="flex-1 glass-panel rounded-3xl p-6 flex flex-col h-full overflow-hidden min-h-0 select-none">
            {activeStaff ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0">
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-indigo-500" /> {activeStaff.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      Position: {activeStaff.role === 'admin' ? 'Administrator Account' : activeStaff.role === 'no_login' ? 'Staff Personnel (No Login)' : 'Staff Personnel Member'}
                    </p>
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
                          onClick={handleOpenEditStaff}
                          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors active-press"
                        >
                          <Pencil className="w-4 h-4 text-indigo-500" /> Edit Profile
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteStaff}
                          className="px-4 py-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-colors active-press"
                        >
                          <Trash2 className="w-4 h-4 text-rose-500" /> Delete Profile
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Summary Credit Cards */}
                <div className="grid grid-cols-3 gap-4 py-6 shrink-0 border-b border-slate-200 dark:border-slate-800">
                  <div className="bg-slate-100/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/40">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Total Salary Paid</span>
                    <span className="text-xl font-extrabold text-emerald-500 tracking-tight">
                      {currencySymbol}{(staffBalances[activeStaff.id]?.salaryPaid || 0).toFixed(2)}
                    </span>
                  </div>
                  
                  <div className="bg-slate-100/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/40">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Outstanding Advances</span>
                    <span className="text-xl font-extrabold text-amber-500 tracking-tight">
                      {currencySymbol}{(staffBalances[activeStaff.id]?.advancesOutstanding || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="bg-slate-100/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-700/40">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Bonuses Given</span>
                    <span className="text-xl font-extrabold text-indigo-500 tracking-tight">
                      {currencySymbol}{(staffBalances[activeStaff.id]?.bonusesGiven || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Historical Ledger Audit list */}
                <div className="flex-1 flex flex-col overflow-hidden min-h-0 pt-4">
                  <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 mb-3 flex items-center gap-1.5 shrink-0 select-none">
                    <History className="w-4 h-4 text-slate-400" /> Transaction Ledger History Log
                  </h3>

                  <div className="flex-1 overflow-y-auto min-h-0 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    {activeStaffTransactions.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 dark:text-slate-500 h-full flex flex-col justify-center items-center">
                        <AlertCircle className="w-8 h-8 mb-2" />
                        <p className="text-xs font-semibold">No transactions logged for this member.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 font-bold uppercase tracking-wider text-slate-500 text-[9px] select-none">
                            <th className="p-3">Date</th>
                            <th className="p-3">Type</th>
                            <th className="p-3 text-right">Outlay Amount</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Audit Memo / Remarks</th>
                            {operatorRole === 'admin' && <th className="p-3 text-center">Action</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                          {activeStaffTransactions.map(entry => (
                            <tr key={entry.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10 font-medium">
                              <td className="p-3 text-slate-400">{new Date(entry.date).toLocaleDateString()}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  entry.type === 'salary'
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : entry.type === 'advance'
                                    ? 'bg-amber-500/15 text-amber-500'
                                    : entry.type === 'bonus'
                                    ? 'bg-indigo-500/15 text-indigo-500'
                                    : 'bg-rose-500/15 text-rose-500'
                                }`}>
                                  {entry.type}
                                </span>
                              </td>
                              <td className="p-3 text-right font-bold text-slate-800 dark:text-slate-350">
                                {currencySymbol}{entry.amount.toFixed(2)}
                              </td>
                              <td className="p-3 uppercase text-[10px] font-bold text-slate-400">
                                {entry.paymentMethod.replace('_', ' ')}
                              </td>
                              <td className="p-3 text-slate-400 italic max-w-xs truncate">{entry.notes}</td>
                              {operatorRole === 'admin' && (
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteTransaction(entry.id)}
                                    className="p-1 text-rose-500 hover:text-white rounded-lg hover:bg-rose-600 active-press transition-colors"
                                    title="Revoke Transaction"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              )}
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
                <p className="font-semibold">Select a staff member to inspect transaction ledgers.</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ADD STAFF MEMBER MODAL */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-md flex items-center justify-center px-4">
          <form onSubmit={(e) => handleSaveStaff(e, false)} className="glass-panel w-full max-w-sm rounded-3xl p-6 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setShowAddStaffModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-500" /> Add Staff Member
            </h3>

            {staffError && (
              <div className="p-3 bg-red-500/15 border border-red-500/25 rounded-2xl text-red-500 text-xs font-semibold mb-4 select-none flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" /> {staffError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Staff Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Waiter"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">System Role</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as 'admin' | 'staff' | 'no_login')}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="staff">Staff Operator (With Login)</option>
                  <option value="no_login">Staff (No System Login)</option>
                  <option value="admin">Administrator Account</option>
                </select>
              </div>

              {staffRole !== 'no_login' && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Security PIN (4 Digits)</label>
                  <div className="relative">
                    <input
                      type={showPasscodeText ? "text" : "password"}
                      maxLength={4}
                      required
                      placeholder="e.g. 8888"
                      value={staffPasscode}
                      onChange={(e) => setStaffPasscode(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-sm font-semibold tracking-widest focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscodeText(!showPasscodeText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPasscodeText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="w-1/3 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Add Staff Member
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT STAFF MEMBER MODAL */}
      {showEditStaffModal && activeStaff && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-md flex items-center justify-center px-4">
          <form onSubmit={(e) => handleSaveStaff(e, true)} className="glass-panel w-full max-w-sm rounded-3xl p-6 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setShowEditStaffModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-indigo-500" /> Edit Staff Profile
            </h3>

            {staffError && (
              <div className="p-3 bg-red-500/15 border border-red-500/25 rounded-2xl text-red-500 text-xs font-semibold mb-4 select-none flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" /> {staffError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Staff Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Waiter"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">System Role</label>
                <select
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value as 'admin' | 'staff' | 'no_login')}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="staff">Staff Operator (With Login)</option>
                  <option value="no_login">Staff (No System Login)</option>
                  <option value="admin">Administrator Account</option>
                </select>
              </div>

              {staffRole !== 'no_login' && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Security PIN (4 Digits)</label>
                  <div className="relative">
                    <input
                      type={showPasscodeText ? "text" : "password"}
                      maxLength={4}
                      required
                      placeholder="e.g. 8888"
                      value={staffPasscode}
                      onChange={(e) => setStaffPasscode(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-3 pr-10 py-2.5 text-sm font-semibold tracking-widest focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasscodeText(!showPasscodeText)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPasscodeText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowEditStaffModal(false)}
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

      {/* RECORD TRANSACTION MODAL */}
      {showRecordModal && activeStaff && (
        <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-md flex items-center justify-center px-4">
          <form onSubmit={handleRecordTransaction} className="glass-panel w-full max-w-md rounded-3xl p-6 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setShowRecordModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-extrabold text-base mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-indigo-500" /> Record Staff Outlay
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Recipient Staff</label>
                <input
                  type="text"
                  disabled
                  value={activeStaff.name}
                  className="w-full bg-slate-200/50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none opacity-80 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Transaction Type</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as any)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="salary">Salary Payment</option>
                  <option value="advance">Salary Advance</option>
                  <option value="bonus">Salary Bonus</option>
                  <option value="deduction">Advance Deduction Offset</option>
                </select>
              </div>

              {/* Outstanding Advance Tracker Display for Deductions */}
              {txType === 'deduction' && (
                <div className="p-3 bg-amber-500/10 rounded-2xl flex justify-between items-center text-xs font-semibold text-amber-500 select-none">
                  <span>Active Outstanding Advances:</span>
                  <span className="font-black text-sm">{currencySymbol}{(staffBalances[activeStaff.id]?.advancesOutstanding || 0).toFixed(2)}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Amount ({currencySymbol})</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Transaction Date</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Payment Method</label>
                <select
                  value={txMethod}
                  onChange={(e) => setTxMethod(e.target.value as any)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                >
                  <option value="cash">Cash Outflow</option>
                  <option value="bank_transfer">Direct Bank Transfer</option>
                  <option value="upi">UPI QR Payment</option>
                  <option value="gpay">Google Pay</option>
                  <option value="phonepe">PhonePe Transfer</option>
                  <option value="paytm">Paytm Transfer</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Audit Memo / Remarks</label>
                <input
                  type="text"
                  placeholder="Salary slips, advance deductions, etc."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowRecordModal(false)}
                className="w-1/3 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Record Outlay
              </button>
            </div>
          </form>
        </div>
      )}

    </Navigation>
  );
}
