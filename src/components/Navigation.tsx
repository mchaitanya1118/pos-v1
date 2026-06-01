'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/lib/store';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Grid3X3, 
  ChefHat, 
  Users, 
  DollarSign, 
  BarChart3, 
  Settings as SettingsIcon,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  UserCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface NavigationProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'pos' | 'tables' | 'menu' | 'customers' | 'expenses' | 'reports' | 'settings' | 'kitchen' | 'staff';
}

export default function Navigation({ children, activeTab }: NavigationProps) {
  const router = useRouter();
  const { isAuthenticated, logout, toggleTheme, theme, activeSettings, operatorRole, operatorName } = useSessionStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [hoveredItem, setHoveredItem] = useState<{ name: string; top: number; isRed?: boolean } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pos_sidebar_collapsed');
      if (saved !== null) {
        setIsSidebarCollapsed(saved === 'true');
      }
    }
  }, []);

  const toggleSidebar = (collapsed: boolean) => {
    setIsSidebarCollapsed(collapsed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pos_sidebar_collapsed', String(collapsed));
    }
  };

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['admin'] },
    { id: 'pos', name: 'Orders', icon: ShoppingCart, path: '/pos', roles: ['admin', 'staff'] },
    { id: 'tables', name: 'Table Map', icon: Grid3X3, path: '/tables', roles: ['admin', 'staff'] },
    { id: 'kitchen', name: 'Kitchen Queue', icon: ChefHat, path: '/kitchen', roles: ['admin', 'staff'] },
    { id: 'menu', name: 'Menu Editor', icon: BookOpen, path: '/menu', roles: ['admin'] },
    { id: 'customers', name: 'Customers', icon: Users, path: '/customers', roles: ['admin', 'staff'] },
    { id: 'expenses', name: 'Expenses', icon: DollarSign, path: '/expenses', roles: ['admin'] },
    { id: 'staff', name: 'Staff Ledger', icon: UserCheck, path: '/staff', roles: ['admin'] },
    { id: 'reports', name: 'Reports', icon: BarChart3, path: '/reports', roles: ['admin'] },
    { id: 'settings', name: 'Settings', icon: SettingsIcon, path: '/settings', roles: ['admin'] },
  ];

  // Authenticate session & role protection check
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (operatorRole) {
      const activeMenuItem = menuItems.find(item => item.id === activeTab);
      if (activeMenuItem && !activeMenuItem.roles.includes(operatorRole)) {
        // Redirect unauthorized users to their default allowed screen (POS screen)
        router.push('/pos');
      }
    }
  }, [isAuthenticated, operatorRole, activeTab, router]);

  // Derive operator display name from dynamic session state
  const displayName = operatorName || (operatorRole === 'admin' ? 'Administrator' : 'Staff Operator');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'OP';
  };

  if (!isAuthenticated) {
    return null;
  }

  // Filter menu items by operator permissions
  const filteredMenuItems = menuItems.filter(item => item.roles.includes(operatorRole || 'staff'));

  const handleNav = (path: string) => {
    router.push(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Check if POS screen to hide standard margins for full screen touch optimization
  const isPosScreen = activeTab === 'pos';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f3f4f6] dark:bg-[#060913] transition-colors duration-300">
      
      {/* MOBILE HEADER BAR */}
      <header className="md:hidden bg-white dark:bg-[#0b1120] border-b border-slate-100 dark:border-slate-800 h-16 flex items-center justify-between px-4 z-40 sticky top-0 shadow-sm select-none">
        <div className="flex items-center gap-2">
          {/* Neqtra POS icon logo */}
          <div className="relative w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950 shadow-md shadow-slate-900/10">
            <span className="text-white font-black text-xs">np</span>
          </div>
          <span className="font-extrabold text-base tracking-tight text-slate-800 dark:text-white">
            <span className="text-slate-800 dark:text-white">neqtra</span><span className="text-slate-400 ml-1">pos</span>
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER ROUTER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-45 bg-slate-900/60 backdrop-blur-sm animate-fade-in flex">
          <div className="w-64 max-w-[80vw] h-full bg-white dark:bg-[#0b1120] p-6 flex flex-col justify-between animate-slide-in shadow-xl relative border-r border-slate-100 dark:border-slate-800">
            <div>
              <div className="mb-8 flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950 shadow-md shadow-slate-900/10">
                    <span className="text-white font-black text-xs">np</span>
                  </div>
                  <span className="text-slate-800 dark:text-white font-black text-base">neqtra pos</span>
                </div>
                <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="text-slate-450 hover:text-slate-800 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1.5">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNav(item.path)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all duration-150 active-press ${
                        active 
                          ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md shadow-slate-800/15' 
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      {item.name}
                    </button>
                  );
                })}
              </nav>
            </div>
            
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center font-black text-sm text-slate-700 dark:text-slate-350 shrink-0">
                  {getInitials(displayName)}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">{displayName}</h4>
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">{operatorRole === 'admin' ? 'Administrator' : 'Staff Operator'}</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-150 w-full"
              >
                <LogOut className="w-5 h-5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP STYLISH SIDEBAR (NEQTRA POS SYSTEM) */}
      <aside className={`hidden md:flex flex-col justify-between transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20 px-3 py-6' : 'w-64 p-6'} bg-white dark:bg-[#0b1120] border-r border-slate-200/80 dark:border-slate-800/80 h-screen sticky top-0 shrink-0 shadow-sm z-20 select-none`}>
        <div className="flex flex-col min-h-0 flex-grow">
          {/* Brand Logo Card */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-4 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950 shadow-md shadow-slate-900/15">
                <span className="text-white font-black text-sm">np</span>
              </div>
              <button
                type="button"
                onClick={() => toggleSidebar(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Expand Sidebar"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex shrink-0">
                  <div className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-800 dark:to-slate-950 shadow-md shadow-slate-900/15">
                    <span className="text-white font-black text-sm">np</span>
                  </div>
                </div>
                <span className="font-black text-xl tracking-tight text-slate-800 dark:text-white">
                  <span className="text-slate-800 dark:text-white">neqtra</span><span className="text-slate-400 ml-1">pos</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggleSidebar(true)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 flex-grow overflow-y-auto no-scrollbar pr-1">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.path)}
                  className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-4'} py-3.5 rounded-2xl text-xs font-extrabold tracking-wide transition-all duration-150 relative active-press ${
                    active 
                      ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 shadow-md shadow-slate-800/10 font-black' 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  onMouseEnter={(e) => {
                    if (!isSidebarCollapsed) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const aside = e.currentTarget.closest('aside');
                    if (rect && aside) {
                      const asideRect = aside.getBoundingClientRect();
                      setHoveredItem({
                        name: item.name,
                        top: rect.top - asideRect.top + rect.height / 2
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-200 hover:scale-105 ${active ? 'text-white dark:text-slate-900 stroke-[2.5]' : 'text-slate-400 dark:text-slate-500'}`} />
                  {!isSidebarCollapsed && <span className="relative z-10">{item.name}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Operations */}
        <div className={`flex flex-col gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 ${isSidebarCollapsed ? 'items-center' : ''} shrink-0`}>
          
          {/* Waiter profile info */}
          <div 
            className="flex items-center gap-3 w-full justify-start relative cursor-pointer"
            onMouseEnter={(e) => {
              if (!isSidebarCollapsed) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const aside = e.currentTarget.closest('aside');
              if (rect && aside) {
                const asideRect = aside.getBoundingClientRect();
                setHoveredItem({
                  name: displayName,
                  top: rect.top - asideRect.top + rect.height / 2
                });
              }
            }}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-855 flex items-center justify-center font-black text-sm text-slate-700 dark:text-slate-350 shrink-0 border border-slate-200/50 dark:border-slate-800">
              {getInitials(displayName)}
            </div>
            
            {!isSidebarCollapsed && (
              <div className="truncate">
                <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{displayName}</h4>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block">{operatorRole === 'admin' ? 'Administrator' : 'Staff Operator'}</span>
              </div>
            )}
          </div>

          {/* Logout row */}
          <div className="flex items-center justify-between gap-2 w-full">
            <button
              type="button"
              onClick={handleLogout}
              className={`relative group flex-grow py-2.5 rounded-xl border border-red-200 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 text-[10px] font-black tracking-wider uppercase text-center transition-all duration-150 active-press flex items-center justify-center ${isSidebarCollapsed ? 'px-0 w-10 h-10' : 'px-3 gap-1.5'}`}
              onMouseEnter={(e) => {
                if (!isSidebarCollapsed) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const aside = e.currentTarget.closest('aside');
                if (rect && aside) {
                  const asideRect = aside.getBoundingClientRect();
                  setHoveredItem({
                    name: 'Sign Out',
                    top: rect.top - asideRect.top + rect.height / 2,
                    isRed: true
                  });
                }
              }}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {!isSidebarCollapsed && <span>Logout</span>}
            </button>
          </div>

        </div>

        {/* Master Portal Tooltip rendered direct inside aside to avoid scroll clipping */}
        {isSidebarCollapsed && hoveredItem && (
          <div 
            className={`absolute left-full ml-4 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase rounded-xl shadow-xl transition-all duration-150 origin-left z-55 whitespace-nowrap flex items-center gap-1.5 border pointer-events-none ${
              hoveredItem.isRed 
                ? 'bg-red-650 dark:bg-red-600 text-white border-red-700 dark:border-red-500' 
                : 'bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 border-slate-800 dark:border-slate-700'
            }`}
            style={{ 
              top: `${hoveredItem.top}px`, 
              transform: 'translateY(-50%) scale(100%)',
              opacity: 1
            }}
          >
            {hoveredItem.name}
            <div className={`absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent ${
              hoveredItem.isRed 
                ? 'border-r-red-650 dark:border-r-red-600' 
                : 'border-r-slate-900 dark:border-r-slate-800'
            }`}></div>
          </div>
        )}
      </aside>

      {/* CORE WORKSPACE SPACE */}
      <main className={`flex-grow min-w-0 ${isPosScreen ? 'p-2 md:p-4' : 'p-4 md:p-6'}`}>
        <div className={`flex-1 flex flex-col h-full ${isPosScreen ? '' : 'max-w-7xl w-full mx-auto animate-fade-in'}`}>
          {children}
        </div>
      </main>

      {/* MOBILE NAVIGATION QUICK BAR DOCK */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0b1120] border-t border-slate-100 dark:border-slate-800 h-14 flex items-center justify-around px-2 z-30 shadow-lg select-none">
        {filteredMenuItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNav(item.path)}
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-150 ${
                active 
                  ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-sm scale-105 font-black' 
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-extrabold mt-0.5 tracking-tighter truncate max-w-full">
                {item.name.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
