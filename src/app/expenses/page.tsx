'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import { db } from '@/lib/db';
import { Expense, ExpenseCategory } from '@/lib/db/types';
import { useSessionStore } from '@/lib/store';
import { 
  DollarSign, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  TrendingUp, 
  CreditCard,
  Coins,
  Calendar,
  AlertCircle
} from 'lucide-react';

export default function ExpensesPage() {
  const { activeSettings } = useSessionStore();
  
  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  
  // Modals / Form toggles
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Input states for forms
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('online');

  // Load database structures
  useEffect(() => {
    const loadExpenses = async () => {
      try {
        const [eList, cList] = await Promise.all([
          db.getExpenses(),
          db.getExpenseCategories()
        ]);
        setExpenses(eList);
        setExpenseCategories(cList);
        if (cList.length > 0) {
          setCategoryId(cList[0].id);
        }
      } catch (err) {
        console.error("Failed to load expenses list", err);
      }
    };
    loadExpenses();
  }, []);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesCategory = selectedCategory === 'all' || exp.categoryId === selectedCategory;
      const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (exp.paymentMethod && exp.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [expenses, selectedCategory, searchQuery]);

  // Cumulative outflow total
  const cumulativeExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, current) => sum + current.amount, 0);
  }, [filteredExpenses]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0 || !categoryId) return;

    const newExpense: Expense = {
      id: `ex_${Date.now()}`,
      date: date || new Date().toISOString().split('T')[0],
      categoryId: categoryId,
      description: description,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod,
      createdAt: new Date().toISOString()
    };

    try {
      await db.saveExpense(newExpense);
      setExpenses(prev => [newExpense, ...prev].sort((a,b) => b.date.localeCompare(a.date)));
      
      // Reset inputs
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setAmount('');
      setPaymentMethod('online');
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to record expense", err);
    }
  };

  const handleStartEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setDate(exp.date);
    setCategoryId(exp.categoryId);
    setDescription(exp.description);
    setAmount(String(exp.amount));
    setPaymentMethod(exp.paymentMethod);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense || !amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return;

    const updatedExpense: Expense = {
      ...editingExpense,
      date: date,
      categoryId: categoryId,
      description: description,
      amount: parseFloat(amount),
      paymentMethod: paymentMethod
    };

    try {
      await db.saveExpense(updatedExpense);
      setExpenses(prev => prev.map(e => e.id === editingExpense.id ? updatedExpense : e).sort((a,b) => b.date.localeCompare(a.date)));
      setShowEditModal(false);
      setEditingExpense(null);
      
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setAmount('');
      setPaymentMethod('online');
    } catch (err) {
      console.error("Failed to save expense edit", err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await db.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      console.error("Failed to delete expense record", err);
    }
  };

  const currencySymbol = activeSettings?.currency === 'INR' ? '₹' : '$';

  return (
    <Navigation activeTab="expenses">
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Header controller and stats summaries */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 shrink-0 shadow-sm select-none">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-indigo-500" /> Operational Expense Logger
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Track restaurant operational expenses, supplier invoices, salaries, and recurring bills
            </p>
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto self-stretch lg:self-auto justify-between lg:justify-end">
            <div className="bg-slate-100/50 dark:bg-slate-850 px-4 py-3 rounded-2xl border border-slate-200/55 dark:border-slate-800 text-right shrink-0">
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-0.5 tracking-wider">Total Cumulative Outflow</span>
              <span className="text-lg font-black text-red-500 tracking-tight glow-text">
                {currencySymbol}{cumulativeExpenses.toFixed(2)}
              </span>
            </div>
            
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 active-press transition-all justify-center"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        </div>

        {/* Search and filters block */}
        <div className="glass-panel p-4 rounded-3xl flex flex-col md:flex-row gap-3 items-center shrink-0 shadow-sm select-none">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search expenses by memo/remarks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="w-full md:w-56">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Expense Categories</option>
              {expenseCategories.map(ec => (
                <option key={ec.id} value={ec.id}>{ec.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Expenses List Table */}
        {expenses.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center flex-1 flex flex-col items-center justify-center">
            <DollarSign className="w-12 h-12 text-slate-400 mb-4 animate-pulse" />
            <p className="text-slate-500 dark:text-slate-400 font-semibold">No operational expenses recorded.</p>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 font-bold uppercase tracking-wider text-slate-500 text-[9px] select-none">
                    <th className="p-4">Date</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Description Memo</th>
                    <th className="p-4">Method</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 font-medium">
                  {filteredExpenses.map((exp) => {
                    const catName = expenseCategories.find(c => c.id === exp.categoryId)?.name || 'General';
                    return (
                      <tr key={exp.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10">
                        
                        <td className="p-4 text-slate-400 flex items-center gap-1.5 select-none">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500/80" />
                          {new Date(exp.date).toLocaleDateString()}
                        </td>

                        <td className="p-4 select-none">
                          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-red-500/10 text-red-500 dark:text-red-400">
                            {catName}
                          </span>
                        </td>

                        <td className="p-4 text-slate-700 dark:text-slate-350 max-w-xs truncate italic">
                          {exp.description}
                        </td>

                        <td className="p-4 select-none">
                          <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-slate-400">
                            {exp.paymentMethod === 'cash' ? (
                              <>
                                <Coins className="w-3.5 h-3.5 text-amber-500" /> Cash Offset
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-3.5 h-3.5 text-indigo-500" /> Digital Pay
                              </>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-right font-extrabold text-red-500 text-sm">
                          -{currencySymbol}{exp.amount.toFixed(2)}
                        </td>

                        <td className="p-4 text-center select-none">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(exp)}
                              className="p-2 rounded bg-indigo-500/10 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all active-press"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-2 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active-press"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ADD EXPENSE MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-[#090d16]/70 backdrop-blur-sm flex items-center justify-center px-4 select-none">
            <form onSubmit={handleAddExpense} className="glass-panel w-full max-w-sm rounded-3xl p-6 relative animate-scale-in">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-500" /> Log Operational Expense
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Expense Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Amount Due ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Account Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    >
                      {expenseCategories.map(ec => (
                        <option key={ec.id} value={ec.id}>{ec.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Payment Offset</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'online')}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="online">Digital Bank/Card</option>
                      <option value="cash">Cash Settlement</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Audit Memo / Description</label>
                  <textarea
                    required
                    placeholder="Remarks for this outflow transaction..."
                    rows={2.5}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        )}

        {/* EDIT EXPENSE MODAL */}
        {showEditModal && editingExpense && (
          <div className="fixed inset-0 z-50 bg-[#090d16]/70 backdrop-blur-sm flex items-center justify-center px-4 select-none">
            <form onSubmit={handleSaveEdit} className="glass-panel w-full max-w-sm rounded-3xl p-6 relative animate-scale-in">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingExpense(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-500" /> Edit Expense Details
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Expense Date</label>
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Amount ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    >
                      {expenseCategories.map(ec => (
                        <option key={ec.id} value={ec.id}>{ec.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Offset Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'online')}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="online">Digital Bank/Card</option>
                      <option value="cash">Cash Settlement</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Audit Memo</label>
                  <textarea
                    required
                    placeholder="Remarks..."
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingExpense(null);
                  }}
                  className="w-1/3 py-2.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </Navigation>
  );
}
