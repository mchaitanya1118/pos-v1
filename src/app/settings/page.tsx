'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { db } from '@/lib/db';
import { Settings, User } from '@/lib/db/types';
import { useSessionStore } from '@/lib/store';
import { 
  Settings as SettingsIcon,
  Store, 
  Percent, 
  ShieldCheck, 
  Check, 
  X, 
  HelpCircle,
  AlertTriangle,
  Users,
  UserPlus,
  Trash2,
  Eye,
  EyeOff,
  Shield,
  Pencil
} from 'lucide-react';

export default function SettingsPage() {
  const { activeSettings, updateSettings } = useSessionStore();
  const [success, setSuccess] = useState<string | null>(null);

  // Personnel state
  const [users, setUsers] = useState<User[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'staff' | 'no_login'>('staff');
  const [newUserPasscode, setNewUserPasscode] = useState('');
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [showPasscodes, setShowPasscodes] = useState<{ [key: string]: boolean }>({});
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const loadUsers = async () => {
    try {
      const uList = await db.getUsers();
      setUsers(uList);
    } catch (err) {
      console.error("Failed to load users", err);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const startEditUser = (user: User) => {
    setEditingUser(user);
    setNewUserName(user.name);
    setNewUserRole(user.role);
    setNewUserPasscode(user.passcode || '');
    setUserError(null);
    setUserSuccess(null);
  };

  const cancelEditUser = () => {
    setEditingUser(null);
    setNewUserName('');
    setNewUserRole('staff');
    setNewUserPasscode('');
    setUserError(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);

    if (!newUserName.trim()) {
      setUserError("Please enter a valid operator name.");
      return;
    }

    if (newUserRole !== 'no_login') {
      if (newUserPasscode.length !== 4 || isNaN(parseInt(newUserPasscode))) {
        setUserError("Passcode must be exactly 4 numeric digits.");
        return;
      }

      // Verify passcode uniqueness (excluding user being edited)
      const passcodeExists = users.some(u => u.passcode === newUserPasscode && (!editingUser || u.id !== editingUser.id));
      const isGlobalAdminPasscode = newUserPasscode === (activeSettings?.passcode || '1234');
      const isGlobalStaffPasscode = newUserPasscode === '4321';
      if (passcodeExists || isGlobalAdminPasscode || isGlobalStaffPasscode) {
        setUserError("This passcode is already assigned. Please choose a unique PIN.");
        return;
      }
    }

    let currentUserId = '';
    if (typeof window !== 'undefined') {
      currentUserId = localStorage.getItem('pos_user_id') || '';
    }

    // Security Block: Avoid downgrading own role from admin to staff
    if (editingUser && editingUser.id === currentUserId && newUserRole === 'staff') {
      setUserError("Security Block: You cannot downgrade your own active administrator role to staff.");
      return;
    }

    const updatedUser: User = {
      id: editingUser ? editingUser.id : `u_${Date.now()}`,
      name: newUserName,
      role: newUserRole,
      passcode: newUserRole === 'no_login' ? '' : newUserPasscode,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString()
    };

    try {
      await db.saveUser(updatedUser);
      setUserSuccess(editingUser ? `Operator "${newUserName}" updated successfully!` : `Operator "${newUserName}" added successfully!`);
      setNewUserName('');
      setNewUserPasscode('');
      setNewUserRole('staff');
      setEditingUser(null);
      await loadUsers();
      setTimeout(() => setUserSuccess(null), 3000);
    } catch (err) {
      setUserError("Failed to save operator account.");
      console.error(err);
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    let currentUserId = '';
    if (typeof window !== 'undefined') {
      currentUserId = localStorage.getItem('pos_user_id') || '';
    }

    if (id === currentUserId || (id === 'u_admin' && useSessionStore.getState().operatorRole === 'admin')) {
      alert("Security Block: You cannot delete your own active administrator account.");
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete operator "${name}"?`)) {
      return;
    }

    try {
      await db.deleteUser(id);
      setUserSuccess(`Operator "${name}" deleted successfully.`);
      if (editingUser && editingUser.id === id) {
        cancelEditUser();
      }
      await loadUsers();
      setTimeout(() => setUserSuccess(null), 3000);
    } catch (err) {
      setUserError("Failed to delete operator account.");
      console.error(err);
    }
  };

  // Form states
  const [restaurantName, setRestaurantName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [taxPercentage, setTaxPercentage] = useState('12.5');
  const [currency, setCurrency] = useState('USD');
  const [enableGst, setEnableGst] = useState(true);
  
  // Security locks passcode
  const [currentPasscode, setCurrentPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Prepopulate form
  useEffect(() => {
    if (activeSettings) {
      setRestaurantName(activeSettings.restaurantName);
      setAddress(activeSettings.address);
      setPhone(activeSettings.phone);
      setGstNumber(activeSettings.gstNumber);
      setTaxPercentage(String(activeSettings.taxPercentage));
      setCurrency(activeSettings.currency);
      setEnableGst(activeSettings.enableGst !== false); // Default to true if not false
    }
  }, [activeSettings]);

  // Handle saving general configuration
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantName || isNaN(parseFloat(taxPercentage))) return;

    const updated: Settings = {
      restaurantName,
      address,
      phone,
      gstNumber,
      taxPercentage: parseFloat(taxPercentage),
      currency,
      passcode: activeSettings?.passcode || '1234', // keep existing passcode
      enableGst: enableGst
    };

    try {
      await updateSettings(updated);
      setSuccess("Store configuration saved successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to save store settings", err);
    }
  };

  // Handle changing passcode
  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError(null);

    const actualPasscode = activeSettings?.passcode || '1234';
    if (currentPasscode !== actualPasscode) {
      setPasscodeError("Current passcode is incorrect.");
      return;
    }

    if (newPasscode.length !== 4 || isNaN(parseInt(newPasscode))) {
      setPasscodeError("New passcode must be exactly 4 numeric digits.");
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setPasscodeError("New passcode and confirmation do not match.");
      return;
    }

    const updated: Settings = {
      restaurantName: activeSettings?.restaurantName || "Bistro POS",
      address: activeSettings?.address || "",
      phone: activeSettings?.phone || "",
      gstNumber: activeSettings?.gstNumber || "",
      taxPercentage: activeSettings?.taxPercentage || 12.5,
      currency: activeSettings?.currency || "USD",
      passcode: newPasscode,
      enableGst: activeSettings?.enableGst !== false
    };

    try {
      await updateSettings(updated);
      setSuccess("Operator passcode changed successfully!");
      setCurrentPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Failed to update passcode settings", err);
    }
  };

  return (
    <Navigation activeTab="settings">
      <div className="flex-1 flex flex-col gap-6 select-none">
        
        {/* Header visual toolbar */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-indigo-500 animate-spin-slow" /> Administrative POS Settings
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Configure store profiles, currency symbols, sales taxes, and security locks
            </p>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="p-3 bg-emerald-500/10 dark:bg-emerald-400/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-2xl flex items-center gap-2 animate-bounce">
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Configurations split forms */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* General profile configuration card */}
          <div className="glass-panel rounded-3xl p-6 shadow-md">
            <h2 className="text-base font-black tracking-tight mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <Store className="w-5 h-5 text-indigo-500" /> Store Identity & Accounting
            </h2>

            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Restaurant Name</label>
                <input
                  type="text"
                  required
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Store Address</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Contact Telephone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Store GSTIN / Tax Code</label>
                  <input
                    type="text"
                    placeholder="Enter GSTIN code..."
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">GST Tax Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    required
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">System Currency symbol</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="USD">USD ($) - US Dollars</option>
                    <option value="INR">INR (₹) - Indian Rupees</option>
                    <option value="EUR">EUR (€) - Euros</option>
                    <option value="GBP">GBP (£) - British Pounds</option>
                  </select>
                </div>
              </div>

              <div className="glass-panel p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between mt-2 select-none">
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">Enable GST Billing</h4>
                  <p className="text-[9px] font-semibold text-slate-405 text-slate-400 mt-0.5">Toggle to apply or skip GST tax on customer checks</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setEnableGst(!enableGst)}
                  className={`w-11 h-6 rounded-full transition-all duration-200 flex items-center p-1 cursor-pointer select-none ${
                    enableGst ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200"></div>
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 mt-4 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs shadow-md transition-colors active-press"
              >
                Save General Configurations
              </button>
            </form>
          </div>

          {/* passcode change configuration card */}
          <div className="glass-panel rounded-3xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <h2 className="text-base font-black tracking-tight mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <ShieldCheck className="w-5 h-5 text-indigo-500" /> Operator passcode Security
              </h2>

              <div className="p-3 bg-amber-500/10 dark:bg-amber-400/5 border border-amber-500/20 rounded-2xl mb-4 flex gap-2.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold">Authorized passcode Shield</span>
                  <p className="text-[10px] mt-0.5">Changing this updates the secret passcode locks needed on terminal auth lockscrens.</p>
                </div>
              </div>

              <form onSubmit={handleSaveSecurity} className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Verify Current Passcode</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    placeholder="Enter current PIN..."
                    value={currentPasscode}
                    onChange={(e) => setCurrentPasscode(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">New 4-digit Passcode</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      placeholder="e.g. 5678"
                      value={newPasscode}
                      onChange={(e) => setNewPasscode(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Confirm New Passcode</label>
                    <input
                      type="password"
                      maxLength={4}
                      required
                      placeholder="e.g. 5678"
                      value={confirmPasscode}
                      onChange={(e) => setConfirmPasscode(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                {passcodeError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-pulse">
                    <X className="w-4 h-4 stroke-[3]" />
                    <span>{passcodeError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 mt-6 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs shadow-md transition-colors active-press"
                >
                  Change Operator Lock Passcode
                </button>
              </form>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Operator security updates are reflected system-wide instantly on save.</span>
            </div>
          </div>

        </div>

        {/* Personnel & Access Control Management Card */}
        <div className="glass-panel rounded-3xl p-6 shadow-md bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-black tracking-tight mb-4 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
            <Users className="w-5 h-5 text-indigo-500" /> Personnel & Access Control
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Operator Directory List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex justify-between items-center select-none">
                <div>
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Active Operators</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Active profiles authorized to authenticate on terminal locks</p>
                </div>
                
                {userSuccess && (
                  <div className="p-2 bg-emerald-500/10 dark:bg-emerald-400/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-xl flex items-center gap-1.5 animate-pulse">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{userSuccess}</span>
                  </div>
                )}
              </div>

              <div className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                {users.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs font-bold bg-slate-50/50 dark:bg-slate-900/10">
                    No custom operator accounts configured. Default overrides remain active.
                  </div>
                ) : (
                  users.map((user) => {
                    const isShown = showPasscodes[user.id] || false;
                    const isSelfEditing = editingUser && editingUser.id === user.id;
                    return (
                      <div key={user.id} className={`p-4 flex items-center justify-between gap-4 bg-white dark:bg-[#0b1120] hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors ${
                        isSelfEditing ? 'border-l-4 border-indigo-500 bg-indigo-50/10' : ''
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs select-none ${
                            user.role === 'admin' 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                              : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                          }`}>
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800 dark:text-white leading-tight">
                              {user.name}
                            </h4>
                            <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                              Created on {new Date(user.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 select-none">
                          {/* Role Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide flex items-center gap-1 ${
                            user.role === 'admin'
                              ? 'bg-rose-500/10 text-rose-600'
                              : user.role === 'no_login'
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-indigo-500/10 text-indigo-600'
                          }`}>
                            <Shield className="w-2.5 h-2.5" />
                            {user.role === 'no_login' ? 'No Login' : user.role}
                          </span>

                          {/* Passcode PIN Indicator */}
                          {user.role === 'no_login' ? (
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider italic bg-slate-100 dark:bg-slate-850 px-2.5 py-1.5 rounded-xl">
                              No Login Access
                            </span>
                          ) : (
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-850 px-2.5 py-1 rounded-xl">
                              <span className="text-[10px] font-bold text-slate-500 font-mono tracking-widest">
                                {isShown ? user.passcode : '••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowPasscodes(prev => ({ ...prev, [user.id]: !isShown }))}
                                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                              >
                                {isShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          )}

                          {/* Edit operator action */}
                          <button
                            type="button"
                            onClick={() => startEditUser(user)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isSelfEditing 
                                ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30' 
                                : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
                            }`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Delete Account */}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id, user.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Onboard / Edit Operator Form */}
            <div className="p-5 bg-slate-50/50 dark:bg-slate-900/20 border border-slate-150/50 dark:border-slate-800 rounded-2xl select-none">
              <h3 className="text-xs font-black uppercase text-slate-600 dark:text-slate-350 tracking-wider mb-4 flex items-center gap-1.5">
                {editingUser ? (
                  <>
                    <Pencil className="w-4 h-4 text-indigo-500" /> Edit Operator
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 text-indigo-500" /> Onboard Operator
                  </>
                )}
              </h3>

              <form onSubmit={handleSaveUser} className="space-y-4">
                <div>
                  <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className={newUserRole === 'no_login' ? 'space-y-4' : 'grid grid-cols-2 gap-2'}>
                  {newUserRole !== 'no_login' && (
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Security PIN</label>
                      <input
                        type="password"
                        maxLength={4}
                        required
                        placeholder="e.g. 5678"
                        value={newUserPasscode}
                        onChange={(e) => setNewUserPasscode(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Authority Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold focus:outline-none"
                    >
                      <option value="staff">Staff Operator (With Login)</option>
                      <option value="no_login">Staff (No System Login)</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                {userError && (
                  <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold rounded-xl flex items-center gap-1.5 animate-pulse">
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                    <span>{userError}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  {editingUser && (
                    <button
                      type="button"
                      onClick={cancelEditUser}
                      className="flex-1 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-850 dark:hover:bg-slate-750 dark:text-slate-350 font-black text-xs transition-all active-press cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-grow py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 font-black text-xs shadow-md transition-all active-press cursor-pointer"
                  >
                    {editingUser ? "Update Operator Details" : "Onboard Operator Profile"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </div>
    </Navigation>
  );
}
