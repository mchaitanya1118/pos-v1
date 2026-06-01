'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navigation from '@/components/Navigation';
import { db } from '@/lib/db';
import { MenuItem, MenuCategory } from '@/lib/db/types';
import { useSessionStore } from '@/lib/store';
import { 
  ChefHat, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff
} from 'lucide-react';

export default function MenuPage() {
  const { activeSettings } = useSessionStore();
  
  // Data states
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  
  // Modals / Form toggles
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Input states for form
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  // Pre-seeded image catalog choices
  const presetImages = [
    { name: 'Starter/Rolls', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60' },
    { name: 'Chicken Wings', url: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60' },
    { name: 'Main Course/Steak', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60' },
    { name: 'Pasta Alfredo', url: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=60' },
    { name: 'Salad/Salmon', url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=60' },
    { name: 'Beverage/Mojito', url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60' },
    { name: 'Coffee Latte', url: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500&auto=format&fit=crop&q=60' },
    { name: 'Cake Dessert', url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60' },
  ];

  // Load menu catalog
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [mList, cList] = await Promise.all([
          db.getMenuItems(),
          db.getCategories()
        ]);
        setMenuItems(mList);
        setCategories(cList);
        if (cList.length > 0) {
          setCategoryId(cList[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch menu list", err);
      }
    };
    loadCatalog();
  }, []);

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Handle live touch toggle availability status
  const handleToggleAvailability = async (item: MenuItem) => {
    const updated: MenuItem = { ...item, isAvailable: !item.isAvailable };
    try {
      await db.saveMenuItem(updated);
      setMenuItems(prev => prev.map(m => m.id === item.id ? updated : m));
    } catch (err) {
      console.error("Failed to toggle item availability", err);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || isNaN(parseFloat(price))) return;

    const finalImage = imageUrl || presetImages[0].url;

    const newItem: MenuItem = {
      id: `m_${Date.now()}`,
      name: name,
      categoryId: categoryId,
      description: description,
      price: parseFloat(price),
      imageUrl: finalImage,
      isAvailable: isAvailable,
      createdAt: new Date().toISOString()
    };

    try {
      await db.saveMenuItem(newItem);
      setMenuItems(prev => [...prev, newItem].sort((a,b) => a.name.localeCompare(b.name)));
      
      // Reset inputs
      setName('');
      setDescription('');
      setPrice('');
      setImageUrl('');
      setIsAvailable(true);
      setShowAddModal(false);
    } catch (err) {
      console.error("Failed to add menu item", err);
    }
  };

  const handleStartEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategoryId(item.categoryId);
    setDescription(item.description);
    setPrice(String(item.price));
    setImageUrl(item.imageUrl);
    setIsAvailable(item.isAvailable);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !name || !price || isNaN(parseFloat(price))) return;

    const updatedItem: MenuItem = {
      ...editingItem,
      name: name,
      categoryId: categoryId,
      description: description,
      price: parseFloat(price),
      imageUrl: imageUrl || presetImages[0].url,
      isAvailable: isAvailable
    };

    try {
      await db.saveMenuItem(updatedItem);
      setMenuItems(prev => prev.map(m => m.id === editingItem.id ? updatedItem : m).sort((a,b) => a.name.localeCompare(b.name)));
      setShowEditModal(false);
      setEditingItem(null);
      
      setName('');
      setDescription('');
      setPrice('');
      setImageUrl('');
      setIsAvailable(true);
    } catch (err) {
      console.error("Failed to edit menu item", err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu dish?")) return;
    try {
      await db.deleteMenuItem(id);
      setMenuItems(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error("Failed to delete menu item", err);
    }
  };

  const currencySymbol = activeSettings?.currency === 'INR' ? '₹' : '$';

  return (
    <Navigation activeTab="menu">
      <div className="flex-1 flex flex-col gap-6">
        
        {/* Header controller dashboard */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm select-none">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-indigo-500" /> Menu Catalog Manager
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Add dishes, edit prices, descriptions, and toggle stock availability
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 active-press transition-all self-stretch md:self-auto justify-center"
          >
            <Plus className="w-4 h-4" /> Add Menu Item
          </button>
        </div>

        {/* Filters control block */}
        <div className="glass-panel p-4 rounded-3xl flex flex-col md:flex-row gap-3 items-center shrink-0 shadow-sm select-none">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search dishes by name..."
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
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Database List Table */}
        {menuItems.length === 0 ? (
          <div className="glass-panel rounded-3xl p-16 text-center flex-1 flex flex-col items-center justify-center">
            <ChefHat className="w-12 h-12 text-slate-400 mb-4 animate-bounce" />
            <p className="text-slate-500 dark:text-slate-400 font-semibold">No active menu items catalog loaded.</p>
          </div>
        ) : (
          <div className="glass-panel rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-750 font-bold uppercase tracking-wider text-slate-500 text-[9px] select-none">
                    <th className="p-4">Item Details</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-right">Price</th>
                    <th className="p-4 text-center">Availability Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {filteredMenuItems.map((item) => {
                    const itemCat = categories.find(c => c.id === item.categoryId)?.name || 'General';
                    return (
                      <tr key={item.id} className="hover:bg-slate-200/20 dark:hover:bg-slate-800/10 font-medium">
                        {/* Rounded thumbnail and text info */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full" />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">{item.name}</h4>
                              <p className="text-[10px] text-slate-400 line-clamp-1 max-w-xs">{item.description}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 select-none">
                            {itemCat}
                          </span>
                        </td>

                        <td className="p-4 text-right font-black text-slate-900 dark:text-white text-sm">
                          {currencySymbol}{item.price.toFixed(2)}
                        </td>

                        {/* Visual stock availability toggle */}
                        <td className="p-4 text-center select-none">
                          <button
                            type="button"
                            onClick={() => handleToggleAvailability(item)}
                            className={`px-3 py-1.5 rounded-2xl text-[9px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1 transition-all active-press ${
                              item.isAvailable
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-red-500/15 text-red-500'
                            }`}
                          >
                            {item.isAvailable ? (
                              <>
                                <Eye className="w-3.5 h-3.5" /> In Stock
                              </>
                            ) : (
                              <>
                                <EyeOff className="w-3.5 h-3.5" /> Out of Stock
                              </>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="p-2 rounded bg-indigo-500/10 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-all active-press"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id)}
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

        {/* ADD MENU ITEM MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-[#090d16]/70 backdrop-blur-sm flex items-center justify-center px-4 overflow-y-auto py-8 select-none">
            <form onSubmit={handleAddMenuItem} className="glass-panel w-full max-w-md rounded-3xl p-6 relative animate-scale-in">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-indigo-500" /> Create Menu Item
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Truffle Steak Fries"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Menu Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Price ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Dish Description</label>
                  <textarea
                    placeholder="Describe main ingredients or style..."
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                {/* Thumbnails picker or custom entry */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Image URL (or select preset below)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none mb-2"
                  />
                  <div className="grid grid-cols-4 gap-1.5 overflow-x-auto py-1">
                    {presetImages.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImageUrl(p.url)}
                        className={`p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-500/10 text-[9px] font-bold border truncate ${
                          imageUrl === p.url ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAvailableCheckbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="rounded border-slate-350 bg-slate-800 text-indigo-500 focus:ring-indigo-500 w-4 h-4"
                  />
                  <label htmlFor="isAvailableCheckbox" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Immediately Available in POS Catalog
                  </label>
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
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 animate-pulse"
                >
                  Create Catalog Card
                </button>
              </div>
            </form>
          </div>
        )}

        {/* EDIT MENU ITEM MODAL */}
        {showEditModal && editingItem && (
          <div className="fixed inset-0 z-50 bg-[#090d16]/70 backdrop-blur-sm flex items-center justify-center px-4 overflow-y-auto py-8 select-none">
            <form onSubmit={handleSaveEdit} className="glass-panel w-full max-w-md rounded-3xl p-6 relative animate-scale-in">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingItem(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-500" /> Edit {editingItem.name}
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Category</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Price ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Image URL</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none mb-2"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsAvailable"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="rounded border-slate-350 bg-slate-800 text-indigo-500 focus:ring-indigo-500 w-4 h-4"
                  />
                  <label htmlFor="editIsAvailable" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Immediately Available in POS Catalog
                  </label>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                  }}
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

      </div>
    </Navigation>
  );
}
