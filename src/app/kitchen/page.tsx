'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import { db } from '@/lib/db';
import { KitchenTicket, Order, OrderItem, MenuItem, Table, AuditLog } from '@/lib/db/types';
import { useSessionStore } from '@/lib/store';
import { 
  ChefHat, Clock, ArrowRight, ArrowLeft, Check, 
  RefreshCw, Play, CheckSquare, Trash2, AlertTriangle, Coffee 
} from 'lucide-react';

export default function KitchenPage() {
  const { activeSettings, operatorRole } = useSessionStore();
  
  // Lists of records
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  
  // Live duration ticks
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load KDS data
  const loadData = async () => {
    try {
      const [tkts, ords, oits, mits, tbls] = await Promise.all([
        db.getKitchenTickets(),
        db.getOrders(),
        db.getOrderItems(),
        db.getMenuItems(),
        db.getTables()
      ]);
      setTickets(tkts);
      setOrders(ords);
      setOrderItems(oits);
      setMenuItems(mits);
      setTables(tbls);
    } catch (err) {
      console.error("Failed to load KDS data", err);
    }
  };

  useEffect(() => {
    loadData();

    // Timer to update live cooked duration counters
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);

    const unsubscribe = db.onDatabaseUpdate(() => {
      loadData();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  // Update a KOT's status
  const updateTicketStatus = async (ticket: KitchenTicket, nextStatus: 'new' | 'preparing' | 'ready' | 'served') => {
    const prevStatus = ticket.status;
    const updatedTicket: KitchenTicket = {
      ...ticket,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };

    try {
      await db.saveKitchenTicket(updatedTicket);
      
      // Update order status if ticket advances to preparing/served
      const order = orders.find(o => o.id === ticket.orderId);
      if (order) {
        let nextOrdStatus = order.status;
        if (nextStatus === 'preparing') {
          nextOrdStatus = 'preparing';
        } else if (nextStatus === 'ready') {
          nextOrdStatus = 'ready';
        } else if (nextStatus === 'served') {
          nextOrdStatus = 'served';
        }

        if (nextOrdStatus !== order.status) {
          const matchedItems = orderItems.filter(oi => oi.orderId === order.id);
          await db.saveOrder({ ...order, status: nextOrdStatus }, matchedItems);
        }
      }

      // Record Audit trail log
      const table = tables.find(t => t.id === ticket.tableId);
      const auditLog: AuditLog = {
        id: `al_${Date.now()}`,
        operator: operatorRole || 'staff',
        action: 'kot_updated',
        oldValue: prevStatus,
        newValue: nextStatus,
        details: `KOT Order: Ticket status for ${order?.orderNumber || 'order'} (Table ${table?.tableNumber || 'Takeaway'}) updated from ${prevStatus} to ${nextStatus}`,
        createdAt: new Date().toISOString()
      };
      await db.saveAuditLog(auditLog);

      await loadData();
    } catch (err) {
      console.error("Failed to advance KOT status", err);
    }
  };

  // Delete/Clear served ticket
  const handleDeleteTicket = async (id: string) => {
    if (!confirm("Are you sure you want to dismiss this ticket from the active queue?")) return;
    try {
      await db.deleteKitchenTicket(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Get cooked duration in minutes
  const getElapsedMins = (createdAtStr: string) => {
    const elapsedMs = currentTime.getTime() - new Date(createdAtStr).getTime();
    return Math.max(0, Math.floor(elapsedMs / 60000));
  };

  // Organize KOT items and names
  const getTicketItems = (orderId: string) => {
    const items = orderItems.filter(oi => oi.orderId === orderId);
    return items.map(oi => {
      const menu = menuItems.find(mi => mi.id === oi.menuItemId);
      return {
        name: menu ? menu.name : 'Unknown Item',
        quantity: oi.quantity,
        description: menu ? menu.description : ''
      };
    });
  };

  // Filter columns
  const filterTickets = (status: 'new' | 'preparing' | 'ready' | 'served') => {
    return tickets
      .filter(t => t.status === status)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  return (
    <Navigation activeTab="kitchen">
      <div className="flex-1 flex flex-col gap-6 max-h-screen overflow-hidden">
        
        {/* KDS Header toolbar */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 shadow-sm select-none">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <ChefHat className="w-7 h-7 text-indigo-500" /> Kitchen Display System (KDS)
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Active operational KOT queue and live preparation tracking board.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500 hover:text-white transition-all duration-200 border border-indigo-500/20 text-xs font-bold flex items-center gap-1.5 self-stretch sm:self-auto justify-center active-press"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Queue
          </button>
        </div>

        {/* Dynamic 4-Column Board */}
        <div className="flex-1 flex overflow-x-auto lg:grid lg:grid-cols-4 gap-4 lg:overflow-hidden select-none pb-4 snap-x snap-mandatory">
          
          {/* COLUMN 1: NEW / QUEUED */}
          <div className="w-[85vw] md:w-[45vw] lg:w-auto shrink-0 snap-center lg:snap-align-none flex flex-col bg-slate-100/50 dark:bg-slate-900/30 rounded-3xl p-4 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 shrink-0">
              <span className="text-xs font-black text-sky-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                NEW INCOMING
              </span>
              <span className="text-[10px] font-black bg-sky-500/10 text-sky-500 px-2 py-0.5 rounded-full">
                {filterTickets('new').length} Tickets
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filterTickets('new').map(t => (
                <KdsCard 
                  key={t.id}
                  ticket={t}
                  tables={tables}
                  orders={orders}
                  getTicketItems={getTicketItems}
                  elapsedMins={getElapsedMins(t.createdAt)}
                  onNext={() => updateTicketStatus(t, 'preparing')}
                  nextLabel="Start Prep"
                  nextIcon={<Play className="w-3.5 h-3.5" />}
                  colorClass="border-l-sky-500"
                />
              ))}
              {filterTickets('new').length === 0 && <EmptyState text="No incoming tickets" />}
            </div>
          </div>

          {/* COLUMN 2: PREPARING */}
          <div className="w-[85vw] md:w-[45vw] lg:w-auto shrink-0 snap-center lg:snap-align-none flex flex-col bg-slate-100/50 dark:bg-slate-900/30 rounded-3xl p-4 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 shrink-0">
              <span className="text-xs font-black text-amber-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                PREPARING
              </span>
              <span className="text-[10px] font-black bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full">
                {filterTickets('preparing').length} KOTs
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filterTickets('preparing').map(t => (
                <KdsCard 
                  key={t.id}
                  ticket={t}
                  tables={tables}
                  orders={orders}
                  getTicketItems={getTicketItems}
                  elapsedMins={getElapsedMins(t.createdAt)}
                  onNext={() => updateTicketStatus(t, 'ready')}
                  nextLabel="Mark Ready"
                  nextIcon={<Check className="w-3.5 h-3.5" />}
                  onPrev={() => updateTicketStatus(t, 'new')}
                  colorClass="border-l-amber-500 bg-amber-500/5 border-amber-500/10"
                />
              ))}
              {filterTickets('preparing').length === 0 && <EmptyState text="Nothing cooking right now" />}
            </div>
          </div>

          {/* COLUMN 3: READY / TO SERVE */}
          <div className="w-[85vw] md:w-[45vw] lg:w-auto shrink-0 snap-center lg:snap-align-none flex flex-col bg-slate-100/50 dark:bg-slate-900/30 rounded-3xl p-4 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 shrink-0">
              <span className="text-xs font-black text-emerald-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                READY TO SERVE
              </span>
              <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full">
                {filterTickets('ready').length} Orders
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filterTickets('ready').map(t => (
                <KdsCard 
                  key={t.id}
                  ticket={t}
                  tables={tables}
                  orders={orders}
                  getTicketItems={getTicketItems}
                  elapsedMins={getElapsedMins(t.createdAt)}
                  onNext={() => updateTicketStatus(t, 'served')}
                  nextLabel="Deliver"
                  nextIcon={<CheckSquare className="w-3.5 h-3.5" />}
                  onPrev={() => updateTicketStatus(t, 'preparing')}
                  colorClass="border-l-emerald-500 bg-emerald-500/5 border-emerald-500/10"
                />
              ))}
              {filterTickets('ready').length === 0 && <EmptyState text="Waiting for chef tickets" />}
            </div>
          </div>

          {/* COLUMN 4: COMPLETED / SERVED */}
          <div className="w-[85vw] md:w-[45vw] lg:w-auto shrink-0 snap-center lg:snap-align-none flex flex-col bg-slate-100/50 dark:bg-slate-900/30 rounded-3xl p-4 border border-slate-200/50 dark:border-slate-800/50 overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800 mb-3 shrink-0">
              <span className="text-xs font-black text-slate-500 flex items-center gap-1">
                SERVED / HISTORY
              </span>
              <span className="text-[10px] font-black bg-slate-500/10 text-slate-500 px-2 py-0.5 rounded-full">
                {filterTickets('served').length} Dismissable
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filterTickets('served').map(t => (
                <KdsCard 
                  key={t.id}
                  ticket={t}
                  tables={tables}
                  orders={orders}
                  getTicketItems={getTicketItems}
                  elapsedMins={getElapsedMins(t.createdAt)}
                  onNext={() => handleDeleteTicket(t.id)}
                  nextLabel="Dismiss"
                  nextIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onPrev={() => updateTicketStatus(t, 'ready')}
                  colorClass="border-l-slate-400 bg-slate-500/5 dark:bg-slate-400/5 border-slate-400/10 opacity-70"
                />
              ))}
              {filterTickets('served').length === 0 && <EmptyState text="No served orders in list" />}
            </div>
          </div>

        </div>

      </div>
    </Navigation>
  );
}

// Small components helper KDS visual cards
interface KdsCardProps {
  ticket: KitchenTicket;
  tables: Table[];
  orders: Order[];
  getTicketItems: (orderId: string) => { name: string; quantity: number; description: string }[];
  elapsedMins: number;
  onNext: () => void;
  nextLabel: string;
  nextIcon: React.ReactNode;
  onPrev?: () => void;
  colorClass?: string;
}

function KdsCard({ 
  ticket, tables, orders, getTicketItems, elapsedMins, 
  onNext, nextLabel, nextIcon, onPrev, colorClass = "" 
}: KdsCardProps) {
  const table = tables.find(t => t.id === ticket.tableId);
  const order = orders.find(o => o.id === ticket.orderId);
  const items = getTicketItems(ticket.orderId);

  // Time warnings styles
  const timeWarning = 
    ticket.status === 'served' ? 'text-slate-400' :
    elapsedMins > 15 ? 'text-rose-500 font-extrabold animate-pulse' :
    elapsedMins > 8 ? 'text-amber-500 font-extrabold' : 'text-slate-500 dark:text-slate-400';

  return (
    <div className={`glass-panel border-2 border-l-4 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md transition-all duration-200 hover:shadow-lg ${colorClass}`}>
      <div>
        {/* Card Header information */}
        <div className="flex justify-between items-start gap-1 select-none">
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white">
              {table ? `Table ${table.tableNumber}` : 'Takeaway / Delivery'}
            </h4>
            <div className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 mt-0.5">
              Order: {order?.orderNumber || 'N/A'}
            </div>
          </div>

          <div className={`flex items-center gap-1 text-[11px] font-black ${timeWarning}`}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{elapsedMins}m</span>
          </div>
        </div>

        {/* Items Listing block */}
        <div className="mt-3 space-y-2 border-t border-b border-slate-200/50 dark:border-slate-800/40 py-2.5">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-start text-xs text-slate-700 dark:text-slate-300 font-bold">
              <span className="flex-1 break-words">
                {item.name}
                {item.description && (
                  <span className="block text-[9px] font-medium text-slate-400 dark:text-slate-500 italic">
                    {item.description}
                  </span>
                )}
              </span>
              <span className="font-black text-slate-900 dark:text-white bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded ml-2 text-[10px] shrink-0">
                x{item.quantity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Quick control board */}
      <div className="flex items-center gap-2 select-none">
        {onPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="p-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shrink-0"
            title="Move Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onNext}
          className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 active-press transition-colors"
        >
          {nextIcon}
          <span>{nextLabel}</span>
        </button>
      </div>

    </div>
  );
}

// Small empty state KDS helper
function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 text-center select-none bg-slate-50 dark:bg-black/10 py-10">
      <Coffee className="w-8 h-8 text-slate-400 mx-auto mb-2" />
      <p className="text-slate-400 dark:text-slate-500 text-xs font-bold">{text}</p>
    </div>
  );
}
