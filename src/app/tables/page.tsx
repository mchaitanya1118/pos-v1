'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { db } from '@/lib/db';
import { Table, Order, AuditLog, OrderItem } from '@/lib/db/types';
import { useSessionStore } from '@/lib/store';
import { 
  Grid3X3, Plus, Trash2, Edit2, Check, X, ShieldAlert, 
  Users, Clock, Receipt, RefreshCw, GitMerge, ArrowRight, AlertTriangle 
} from 'lucide-react';

export default function TablesPage() {
  const { activeSettings, operatorRole } = useSessionStore();
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Real-time tick to refresh timers
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modals / Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // Selected table for detailed actions
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedTableOrder, setSelectedTableOrder] = useState<Order | null>(null);
  
  // Transfer / Merge sub-states
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [targetTableId, setTargetTableId] = useState('');
  const [showMergeForm, setShowMergeForm] = useState(false);
  const [mergeTargetTableId, setMergeTargetTableId] = useState('');

  // Form inputs for creating/editing tables
  const [tableNum, setTableNum] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [status, setStatus] = useState<'available' | 'occupied' | 'reserved' | 'bill_ready'>('available');

  // Load floorplan layout data
  const loadData = async () => {
    try {
      const [tbls, ords] = await Promise.all([
        db.getTables(),
        db.getOrders()
      ]);
      setTables(tbls.sort((a, b) => a.tableNumber.localeCompare(b.tableNumber, undefined, { numeric: true })));
      setOrders(ords);
    } catch (err) {
      console.error("Failed to load floorplan data", err);
    }
  };

  useEffect(() => {
    loadData();

    // Set interval to update timers every 10 seconds
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);

    const unsubscribe = db.onDatabaseUpdate(() => {
      loadData();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  // Recalculate selected table order details when selected table or orders update
  useEffect(() => {
    if (selectedTable) {
      const activeOrd = orders.find(o => 
        (o.id === selectedTable.runningOrderId || o.tableId === selectedTable.id) &&
        o.status !== 'closed' && o.status !== 'paid' && o.status !== 'cancelled'
      );
      setSelectedTableOrder(activeOrd || null);
    } else {
      setSelectedTableOrder(null);
    }
  }, [selectedTable, orders]);

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNum || isNaN(parseInt(capacity))) return;

    const newTable: Table = {
      id: `t_${Date.now()}`,
      tableNumber: tableNum.toUpperCase().startsWith('T-') ? tableNum.toUpperCase() : `T-${tableNum.padStart(2, '0')}`,
      capacity: parseInt(capacity),
      status: 'available',
      createdAt: new Date().toISOString()
    };

    try {
      await db.saveTable(newTable);
      setShowAddModal(false);
      setTableNum('');
      setCapacity('4');
      await loadData();
    } catch (err) {
      console.error("Failed to add dining table", err);
    }
  };

  const handleStartEdit = (tbl: Table, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening the detailed action modal
    setEditingTable(tbl);
    setTableNum(tbl.tableNumber.replace('T-', ''));
    setCapacity(String(tbl.capacity));
    setStatus(tbl.status);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || !tableNum || isNaN(parseInt(capacity))) return;

    const updatedTable: Table = {
      ...editingTable,
      tableNumber: tableNum.toUpperCase().startsWith('T-') ? tableNum.toUpperCase() : `T-${tableNum.padStart(2, '0')}`,
      capacity: parseInt(capacity),
      status: status
    };

    try {
      await db.saveTable(updatedTable);
      setShowEditModal(false);
      setEditingTable(null);
      setTableNum('');
      setCapacity('4');
      await loadData();
    } catch (err) {
      console.error("Failed to edit dining table", err);
    }
  };

  const handleDeleteTable = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening the detailed action modal
    if (!confirm("Are you sure you want to remove this dining table?")) return;
    try {
      await db.deleteTable(id);
      await loadData();
    } catch (err) {
      console.error("Failed to delete dining table", err);
    }
  };

  const handleQuickRelease = async (tbl: Table, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to release and clear table ${tbl.tableNumber}? This will reset its state to Available.`)) return;
    
    try {
      // Find active order linked to it
      const activeOrd = orders.find(o => 
        (o.id === tbl.runningOrderId || o.tableId === tbl.id) &&
        o.status !== 'closed' && o.status !== 'paid' && o.status !== 'cancelled'
      );

      if (activeOrd) {
        // Cancel/close running order mock
        const updatedOrd: Order = { ...activeOrd, status: 'cancelled' };
        await db.saveOrder(updatedOrd, []);
      }

      const updatedTable: Table = { 
        ...tbl, 
        status: 'available',
        runningOrderId: null,
        occupiedAt: null,
        mergedWithTableId: null
      };

      await db.saveTable(updatedTable);
      setSelectedTable(null);
      await loadData();
    } catch (err) {
      console.error("Failed to release dining table", err);
    }
  };

  // Floor plan active Table Transfer Action
  const executeTransfer = async () => {
    if (!selectedTable || !targetTableId || !selectedTableOrder) return;

    const oldT = selectedTable;
    const newT = tables.find(t => t.id === targetTableId);

    if (!newT || newT.status === 'occupied') {
      alert("Invalid target table or table already occupied.");
      return;
    }

    try {
      // Clear old table status
      const updatedOldT: Table = {
        ...oldT,
        status: 'available',
        runningOrderId: null,
        occupiedAt: null,
        mergedWithTableId: null
      };
      await db.saveTable(updatedOldT);

      // Set new table occupied
      const updatedNewT: Table = {
        ...newT,
        status: oldT.status === 'bill_ready' ? 'bill_ready' : 'occupied',
        runningOrderId: selectedTableOrder.id,
        occupiedAt: oldT.occupiedAt || new Date().toISOString()
      };
      await db.saveTable(updatedNewT);

      // Update Order Table linkage
      const updatedOrd: Order = { ...selectedTableOrder, tableId: targetTableId };
      const itemsList = await db.getOrderItems();
      const items = itemsList.filter(oi => oi.orderId === selectedTableOrder.id);
      await db.saveOrder(updatedOrd, items);

      // Record Audit trail log
      const auditLog: AuditLog = {
        id: `al_${Date.now()}`,
        operator: operatorRole || 'staff',
        action: 'table_transfer',
        oldValue: oldT.tableNumber,
        newValue: newT.tableNumber,
        details: `Floor Plan: Transferred running order ${selectedTableOrder.orderNumber} from table ${oldT.tableNumber} to ${newT.tableNumber}`,
        createdAt: new Date().toISOString()
      };
      await db.saveAuditLog(auditLog);

      setShowTransferForm(false);
      setTargetTableId('');
      setSelectedTable(null);
      alert(`Order successfully transferred to Table ${newT.tableNumber}.`);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to complete table transfer");
    }
  };

  // Floor plan active Table Merge Action
  const executeMerge = async () => {
    if (!selectedTable || !mergeTargetTableId || !selectedTableOrder) return;

    const sourceT = selectedTable;
    const targetT = tables.find(t => t.id === mergeTargetTableId);

    if (!targetT || targetT.status !== 'occupied' || !targetT.runningOrderId) {
      alert("Merge target table must be active and occupied.");
      return;
    }

    try {
      // Merge source order items into target order
      const itemsList = await db.getOrderItems();
      const sourceItems = itemsList.filter(oi => oi.orderId === selectedTableOrder.id);
      const targetItems = itemsList.filter(oi => oi.orderId === targetT.runningOrderId);

      // Re-map source items to target order ID
      const mergedItems: OrderItem[] = [...targetItems];
      sourceItems.forEach(si => {
        const match = mergedItems.find(mi => mi.menuItemId === si.menuItemId);
        if (match) {
          match.quantity += si.quantity;
          match.subtotal = parseFloat((match.price * match.quantity).toFixed(2));
        } else {
          mergedItems.push({
            ...si,
            id: `oi_${targetT.runningOrderId}_merged_${Date.now()}_${Math.random()}`,
            orderId: targetT.runningOrderId!
          });
        }
      });

      // Recalculate target order totals
      const taxRate = activeSettings?.taxPercentage || 5;
      const isGstEnabled = activeSettings?.enableGst !== false;
      const newSubtotal = mergedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const newTax = isGstEnabled ? newSubtotal * (taxRate / 100) : 0;
      const newGrandTotal = newSubtotal + newTax;

      const targetOrd = orders.find(o => o.id === targetT.runningOrderId);
      if (targetOrd) {
        const updatedTargetOrd: Order = {
          ...targetOrd,
          subtotal: parseFloat(newSubtotal.toFixed(2)),
          tax: parseFloat(newTax.toFixed(2)),
          grandTotal: parseFloat(newGrandTotal.toFixed(2))
        };

        await db.saveOrder(updatedTargetOrd, mergedItems);

        // Cancel/cancel source order
        const updatedSourceOrd: Order = { ...selectedTableOrder, status: 'cancelled' };
        await db.saveOrder(updatedSourceOrd, []);

        // Clear source table status
        const updatedSourceT: Table = {
          ...sourceT,
          status: 'available',
          runningOrderId: null,
          occupiedAt: null,
          mergedWithTableId: null
        };
        await db.saveTable(updatedSourceT);

        // Record Audit trail log
        const auditLog: AuditLog = {
          id: `al_${Date.now()}`,
          operator: operatorRole || 'staff',
          action: 'table_merged',
          oldValue: sourceT.tableNumber,
          newValue: targetT.tableNumber,
          details: `Floor Plan: Merged table ${sourceT.tableNumber} running order into ${targetT.tableNumber}'s bill`,
          createdAt: new Date().toISOString()
        };
        await db.saveAuditLog(auditLog);

        setShowMergeForm(false);
        setMergeTargetTableId('');
        setSelectedTable(null);
        alert(`Successfully merged Table ${sourceT.tableNumber} into Table ${targetT.tableNumber}.`);
        await loadData();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to merge tables.");
    }
  };

  const getDurationString = (occupiedAtStr?: string | null) => {
    if (!occupiedAtStr) return '';
    const elapsedMs = currentTime.getTime() - new Date(occupiedAtStr).getTime();
    const elapsedMins = Math.max(0, Math.floor(elapsedMs / 60000));
    const hours = Math.floor(elapsedMins / 60);
    const mins = elapsedMins % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const currencySymbol = activeSettings?.currency === 'INR' ? '₹' : '$';

  return (
    <Navigation activeTab="tables">
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Header toolbar section */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm select-none">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <Grid3X3 className="w-6 h-6 text-indigo-500" /> Floor Plan Management
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Real-time table visual layouts, active totals, elapsed timers, and routing controls.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 active-press transition-all self-stretch md:self-auto justify-center"
          >
            <Plus className="w-4 h-4" /> Add Dining Table
          </button>
        </div>

        {/* Legend Indicator Map */}
        <div className="flex flex-wrap gap-4 px-2 py-1 text-xs font-bold text-slate-500 dark:text-slate-400 select-none">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500"></div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-500"></div>
            <span>Reserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500"></div>
            <span>Occupied / Dining</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-sky-500"></div>
            <span>Bill Ready (Pending Pay)</span>
          </div>
        </div>

        {/* Grid Seating Layout */}
        {tables.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center flex-1 flex flex-col items-center justify-center">
            <Grid3X3 className="w-12 h-12 text-slate-400 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-semibold">No active table floorplan found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tables.map((tbl) => {
              // Find matching active order for occupied/bill_ready tables
              const activeOrd = orders.find(o => 
                (o.id === tbl.runningOrderId || o.tableId === tbl.id) &&
                o.status !== 'closed' && o.status !== 'paid' && o.status !== 'cancelled'
              );

              // Map dynamic status based on order status or payment state
              let mappedStatus = tbl.status;
              if (tbl.status === 'occupied' && activeOrd) {
                if (activeOrd.status === 'ready' || activeOrd.status === 'served' || activeOrd.paymentStatus === 'partially_paid') {
                  mappedStatus = 'bill_ready';
                }
              }

              const statusColor = 
                mappedStatus === 'available'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/70 shadow-emerald-500/5'
                  : mappedStatus === 'reserved'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:border-amber-500/70 shadow-amber-500/5'
                  : mappedStatus === 'bill_ready'
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400 hover:border-sky-500/70 shadow-sky-500/5'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:border-rose-500/70 shadow-rose-500/5';

              const indicatorBullet =
                mappedStatus === 'available' ? 'bg-emerald-500 shadow-emerald-500/30' :
                mappedStatus === 'reserved' ? 'bg-amber-500 shadow-amber-500/30' : 
                mappedStatus === 'bill_ready' ? 'bg-sky-500 shadow-sky-500/30' : 
                'bg-rose-500 shadow-rose-500/30';

              const durationText = getDurationString(tbl.occupiedAt);

              return (
                <div
                  key={tbl.id}
                  onClick={() => setSelectedTable(tbl)}
                  className={`glass-panel border-2 rounded-3xl p-5 flex flex-col justify-between h-48 shadow-lg hover:shadow-xl transition-all duration-200 group relative cursor-pointer select-none ${statusColor}`}
                >
                  <div className="flex justify-between items-start">
                    {/* Visual status pin */}
                    <div className="flex items-center gap-1.5 bg-white/40 dark:bg-black/10 px-2 py-0.5 rounded-full border border-current">
                      <div className={`w-2 h-2 rounded-full ${indicatorBullet} ${mappedStatus !== 'available' ? 'animate-pulse' : ''}`}></div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wide">
                        {mappedStatus === 'bill_ready' ? 'Bill Ready' : mappedStatus}
                      </span>
                    </div>

                    {/* Quick configs panel */}
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(tbl, e)}
                        className="p-1 rounded bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-500 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTable(tbl.id, e)}
                        className="p-1 rounded bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Table details */}
                  <div className="my-2 flex-1 flex flex-col justify-center">
                    <h3 className="text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                      {tbl.tableNumber}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400 font-bold">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tbl.capacity} Seats</span>
                    </div>
                    
                    {/* Duration and running bill indicator */}
                    {(tbl.status === 'occupied' || tbl.status === 'bill_ready' || activeOrd) && (
                      <div className="mt-2 space-y-1">
                        {durationText && (
                          <div className="flex items-center gap-1 text-[11px] font-black text-rose-500 dark:text-rose-400">
                            <Clock className="w-3 h-3" />
                            <span>Dining: {durationText}</span>
                          </div>
                        )}
                        {activeOrd && (
                          <div className="flex items-center gap-1 text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded-md w-max">
                            <Receipt className="w-3 h-3" />
                            <span>{currencySymbol}{activeOrd.grandTotal.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Context quick release actions */}
                  <div className="pt-2 border-t border-slate-200/40 dark:border-slate-800/40 shrink-0">
                    {tbl.status === 'occupied' || tbl.status === 'bill_ready' || activeOrd ? (
                      <button
                        type="button"
                        onClick={(e) => handleQuickRelease(tbl, e)}
                        className="w-full py-1.5 rounded-xl bg-rose-500/15 dark:bg-rose-400/10 hover:bg-rose-500 hover:text-white text-rose-600 dark:text-rose-400 text-[10px] font-bold tracking-wider uppercase transition-colors"
                      >
                        Clear Table
                      </button>
                    ) : tbl.status === 'reserved' ? (
                      <button
                        type="button"
                        onClick={(e) => handleQuickRelease(tbl, e)}
                        className="w-full py-1.5 rounded-xl bg-emerald-500/15 dark:bg-emerald-400/10 hover:bg-emerald-500 hover:text-white text-emerald-600 dark:text-emerald-400 text-[10px] font-bold tracking-wider uppercase transition-colors"
                      >
                        Arrive / Release
                      </button>
                    ) : (
                      <div className="text-[9px] uppercase tracking-wide font-black text-slate-400 text-center py-1">
                        Awaiting Order
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* DETAILS & OPERATIONAL ACTIONS MODAL */}
        {selectedTable && (
          <div className="fixed inset-0 z-50 bg-[#090d16]/80 backdrop-blur-md flex items-center justify-center px-4 select-none">
            <div className="glass-panel w-full max-w-lg rounded-3xl p-6 relative animate-scale-in max-h-[90vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedTable(null);
                  setShowTransferForm(false);
                  setShowMergeForm(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-800 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-indigo-500" /> Dining Station {selectedTable.tableNumber}
              </h2>
              
              <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 mb-6 bg-slate-100 dark:bg-slate-800/40 p-3 rounded-2xl">
                <div>Capacity: <span className="text-slate-800 dark:text-white font-extrabold">{selectedTable.capacity} Pax</span></div>
                <div>Status: <span className="text-slate-800 dark:text-white font-extrabold uppercase">{selectedTable.status}</span></div>
                {selectedTable.occupiedAt && (
                  <div>Occupied Since: <span className="text-rose-500 font-extrabold">{new Date(selectedTable.occupiedAt).toLocaleTimeString()} ({getDurationString(selectedTable.occupiedAt)})</span></div>
                )}
              </div>

              {/* Running Order Info if occupied */}
              {selectedTableOrder ? (
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-6 bg-indigo-500/5">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-black text-indigo-500 dark:text-indigo-400">RUNNING BILL TAB</span>
                    <span className="text-[10px] font-black bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                      ID: {selectedTableOrder.orderNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center select-none">
                    <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl">
                      <div className="text-[9px] uppercase font-bold text-slate-400">Subtotal</div>
                      <div className="text-sm font-black text-slate-700 dark:text-white mt-0.5">
                        {currencySymbol}{selectedTableOrder.subtotal.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl">
                      <div className="text-[9px] uppercase font-bold text-slate-400">
                        {activeSettings?.enableGst !== false ? `Tax (${activeSettings?.taxPercentage || 5}%)` : 'Tax (Disabled)'}
                      </div>
                      <div className="text-sm font-black text-slate-700 dark:text-white mt-0.5">
                        {currencySymbol}{selectedTableOrder.tax.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-indigo-500 text-white p-2.5 rounded-xl">
                      <div className="text-[9px] uppercase font-bold text-indigo-200">Grand Total</div>
                      <div className="text-sm font-black mt-0.5">
                        {currencySymbol}{selectedTableOrder.grandTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center text-xs font-bold text-slate-400 mb-6 bg-slate-50 dark:bg-black/10 select-none">
                  No running bill active on this station. Table is vacant.
                </div>
              )}

              {/* ACTION TOGGLES */}
              {selectedTableOrder ? (
                <div className="space-y-4">
                  {/* Normal actions buttons */}
                  {!showTransferForm && !showMergeForm && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setShowTransferForm(true)}
                        className="py-3 px-4 rounded-xl text-xs font-black bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2 border border-indigo-500/20 transition-all active-press"
                      >
                        <RefreshCw className="w-4 h-4" /> Transfer Table
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowMergeForm(true)}
                        className="py-3 px-4 rounded-xl text-xs font-black bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center gap-2 border border-amber-500/20 transition-all active-press"
                      >
                        <GitMerge className="w-4 h-4" /> Merge Bills
                      </button>
                    </div>
                  )}

                  {/* Transfer Seating sub-form */}
                  {showTransferForm && (
                    <div className="bg-indigo-500/5 border border-indigo-500/20 p-4 rounded-2xl animate-scale-in">
                      <h4 className="text-xs font-black text-indigo-500 dark:text-indigo-400 mb-2 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" /> Transfer {selectedTable.tableNumber} Session
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mb-3">
                        Relocate all dining orders and timers to a vacant dining table.
                      </p>

                      <div className="flex gap-2">
                        <select
                          value={targetTableId}
                          onChange={(e) => setTargetTableId(e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-extrabold focus:outline-none"
                        >
                          <option value="">-- Choose Vacant Table --</option>
                          {tables
                            .filter(t => t.status === 'available' && t.id !== selectedTable.id)
                            .map(t => (
                              <option key={t.id} value={t.id}>
                                {t.tableNumber} ({t.capacity} Pax Capacity)
                              </option>
                            ))}
                        </select>

                        <button
                          type="button"
                          onClick={executeTransfer}
                          disabled={!targetTableId}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-400 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                        >
                          Transfer <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowTransferForm(false)}
                        className="text-[10px] text-slate-400 hover:text-rose-500 font-bold mt-3 block"
                      >
                        Cancel Transfer
                      </button>
                    </div>
                  )}

                  {/* Merge Seating sub-form */}
                  {showMergeForm && (
                    <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-2xl animate-scale-in">
                      <h4 className="text-xs font-black text-amber-500 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                        <GitMerge className="w-3.5 h-3.5" /> Merge {selectedTable.tableNumber} Session
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold mb-3">
                        Combine this table's running order items into another active dining table's bill.
                      </p>

                      <div className="flex gap-2">
                        <select
                          value={mergeTargetTableId}
                          onChange={(e) => setMergeTargetTableId(e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-extrabold focus:outline-none"
                        >
                          <option value="">-- Select Active Dining Table --</option>
                          {tables
                            .filter(t => t.id !== selectedTable.id && (t.status === 'occupied' || t.status === 'bill_ready'))
                            .map(t => (
                              <option key={t.id} value={t.id}>
                                {t.tableNumber} (Order total: {currencySymbol}{(orders.find(o => o.tableId === t.id && o.status !== 'closed' && o.status !== 'paid' && o.status !== 'cancelled')?.grandTotal || 0).toFixed(2)})
                              </option>
                            ))}
                        </select>

                        <button
                          type="button"
                          onClick={executeMerge}
                          disabled={!mergeTargetTableId}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-400 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                        >
                          Merge Bills <GitMerge className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowMergeForm(false)}
                        className="text-[10px] text-slate-400 hover:text-rose-500 font-bold mt-3 block"
                      >
                        Cancel Merge
                      </button>
                    </div>
                  )}

                  {/* Immediate Manual Reset / Emergency Session Release */}
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center select-none">
                    <span className="text-[10px] font-black text-rose-500/80 flex items-center gap-1 uppercase">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Session Control Lockout
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuickRelease(selectedTable)}
                      className="py-1.5 px-3 rounded-lg border border-rose-500/30 hover:bg-rose-500 text-rose-500 hover:text-white text-[10px] font-black tracking-wide uppercase transition-all"
                    >
                      Clear & Release Table
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-slate-400 font-bold mb-2">
                    Station is currently empty. You can quickly set it as reserved or book it immediately.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTable.status === 'available' ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const updated: Table = { ...selectedTable, status: 'reserved' };
                          await db.saveTable(updated);
                          setSelectedTable(null);
                          await loadData();
                        }}
                        className="py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white border border-amber-500/20 text-center transition-all"
                      >
                        Reserve Table
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={async () => {
                          const updated: Table = { ...selectedTable, status: 'available' };
                          await db.saveTable(updated);
                          setSelectedTable(null);
                          await loadData();
                        }}
                        className="py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white border border-emerald-500/20 text-center transition-all"
                      >
                        Set Available
                      </button>
                    )}
                    
                    <a
                      href={`/pos?tableId=${selectedTable.id}`}
                      className="py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white text-center transition-all flex items-center justify-center gap-1 shadow-md shadow-indigo-600/10"
                    >
                      Go to POS Ordering <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ADD TABLE MODAL DIALOGUE */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-[#090d16]/70 backdrop-blur-sm flex items-center justify-center px-4 select-none">
            <form onSubmit={handleAddTable} className="glass-panel w-full max-w-sm rounded-3xl p-6 relative animate-scale-in">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-indigo-500" /> Add New Table
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Table Designation (e.g. 05 or T-05)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter table number..."
                    value={tableNum}
                    onChange={(e) => setTableNum(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Seating Capacity (pax count)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                  Create Dining Card
                </button>
              </div>
            </form>
          </div>
        )}

        {/* EDIT TABLE MODAL DIALOGUE */}
        {showEditModal && editingTable && (
          <div className="fixed inset-0 z-50 bg-[#090d16]/70 backdrop-blur-sm flex items-center justify-center px-4 select-none">
            <form onSubmit={handleSaveEdit} className="glass-panel w-full max-w-sm rounded-3xl p-6 relative animate-scale-in">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTable(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-500" /> Configure Table {editingTable.tableNumber}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Table Designation
                  </label>
                  <input
                    type="text"
                    required
                    value={tableNum}
                    onChange={(e) => setTableNum(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                    Dining Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'available' | 'occupied' | 'reserved' | 'bill_ready')}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  >
                    <option value="available">Available (Green)</option>
                    <option value="reserved">Reserved (Orange)</option>
                    <option value="occupied">Occupied (Red)</option>
                    <option value="bill_ready">Bill Ready (Blue)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTable(null);
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
