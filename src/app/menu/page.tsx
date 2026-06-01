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
  EyeOff,
  Sparkles,
  UploadCloud,
  Wand2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function MenuPage() {
  const { activeSettings } = useSessionStore();
  
  // Data states
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  
  // Modals / Form toggles
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // AI Menu Generator States
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiStep, setAiStep] = useState<1 | 2 | 3>(1);
  const [menuImageBase64, setMenuImageBase64] = useState<string | null>(null);
  const [menuImageMimeType, setMenuImageMimeType] = useState<string>('image/jpeg');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiScanStatus, setAiScanStatus] = useState<string>('');
  const [aiScanProgress, setAiScanProgress] = useState(0);
  const [aiGeneratedMenu, setAiGeneratedMenu] = useState<{
    categories: {
      name: string;
      slug: string;
      items: {
        name: string;
        description: string;
        price: number;
        presetImage: string;
      }[];
    }[];
  } | null>(null);

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

  // AI Menu Generator Logic Handlers
  const handleMenuImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMenuImageMimeType(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMenuImageBase64(reader.result as string);
      setAiStep(2);
      startAIScan(reader.result as string, file.type);
    };
    reader.readAsDataURL(file);
  };

  const startAIScan = async (base64Image: string, mimeType: string) => {
    setIsAiLoading(true);
    setAiError(null);
    setAiScanProgress(0);
    setAiScanStatus("Reading menu sheet image...");

    // Progress counter simulation
    const interval = setInterval(() => {
      setAiScanProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        
        // Dynamic scan updates
        if (prev < 30) setAiScanStatus("Analyzing layout and columns...");
        else if (prev < 65) setAiScanStatus("Detecting menu categories and items...");
        else setAiScanStatus("Refining price strings and details...");

        return prev + 5;
      });
    }, 150);

    try {
      const response = await fetch('/api/menu/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image, mimeType })
      });

      clearInterval(interval);

      if (!response.ok) {
        throw new Error("Failed to parse menu image. Please try again.");
      }

      const data = await response.json();
      setAiScanProgress(100);
      setAiScanStatus("Menu parsed successfully!");
      setAiGeneratedMenu(data);
      
      setTimeout(() => {
        setAiStep(3);
      }, 500);

    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setAiError(err.message || "An unexpected error occurred during parsing.");
      setAiStep(1);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveAIGeneratedMenu = async () => {
    if (!aiGeneratedMenu) return;

    try {
      setIsAiLoading(true);
      const dbCategories = await db.getCategories();
      
      for (const cat of aiGeneratedMenu.categories) {
        let categoryIdToUse = '';
        const existingCat = dbCategories.find(c => c.name.toLowerCase() === cat.name.toLowerCase());
        
        if (existingCat) {
          categoryIdToUse = existingCat.id;
        } else {
          const newCatId = crypto.randomUUID();
          const newCategory: MenuCategory = {
            id: newCatId,
            name: cat.name,
            slug: cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-'),
            createdAt: new Date().toISOString()
          };
          await db.saveCategory(newCategory);
          dbCategories.push(newCategory); // Cache in memory list
          categoryIdToUse = newCatId;
        }

        // Save menu items under this category
        for (const item of cat.items) {
          const matchedImage = presetImages.find(p => p.name === item.presetImage)?.url || presetImages[0].url;
          const newItem: MenuItem = {
            id: crypto.randomUUID(),
            name: item.name,
            categoryId: categoryIdToUse,
            description: item.description,
            price: item.price,
            imageUrl: matchedImage,
            isAvailable: true,
            createdAt: new Date().toISOString()
          };
          await db.saveMenuItem(newItem);
        }
      }

      // Confetti burst
      confetti({ particleCount: 180, spread: 90 });

      // Clean up modal states
      setShowAIModal(false);
      setAiStep(1);
      setMenuImageBase64(null);
      setAiGeneratedMenu(null);

      // Reload menu listing in main table
      const [mList, cList] = await Promise.all([
        db.getMenuItems(),
        db.getCategories()
      ]);
      setMenuItems(mList);
      setCategories(cList);

      alert("AI Menu Catalog successfully generated and imported!");
    } catch (err) {
      console.error(err);
      alert("Failed to save imported menu items.");
    } finally {
      setIsAiLoading(false);
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

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto self-stretch md:self-auto shrink-0 select-none">
            <button
              type="button"
              onClick={() => {
                setAiStep(1);
                setAiError(null);
                setMenuImageBase64(null);
                setAiGeneratedMenu(null);
                setShowAIModal(true);
              }}
              className="px-5 py-3 rounded-2xl bg-[#0b4f48] hover:bg-[#083d37] text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-[#0b4f48]/15 active-press transition-all w-full sm:w-auto justify-center cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-350 animate-pulse" /> AI Menu Generator
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 active-press transition-all w-full sm:w-auto justify-center cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Menu Item
            </button>
          </div>
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

        {/* AI MENU GENERATOR WIZARD MODAL */}
        {showAIModal && (
          <div className="fixed inset-0 z-50 bg-[#090d16]/75 backdrop-blur-md flex items-center justify-center px-4 py-6 overflow-y-auto select-none">
            <div className="glass-panel w-full max-w-3xl rounded-[32px] overflow-hidden flex flex-col relative animate-scale-in max-h-[90vh] shadow-2xl border border-slate-100 dark:border-slate-800/80">
              
              {/* Header */}
              <div className="p-6 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-white/20 dark:bg-[#0b1120]/45">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-teal-400 animate-pulse" />
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800 dark:text-white leading-tight">AI Menu Generator</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                      {aiStep === 1 ? 'Step 1: Upload Menu Image' : aiStep === 2 ? 'Step 2: Scanning & Processing' : 'Step 3: Review & Edit Items'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAIModal(false)}
                  disabled={isAiLoading}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-[#060913]/30">
                {aiError && (
                  <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-start gap-2.5 text-xs font-semibold select-text">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Extraction Failed</p>
                      <p className="opacity-90 mt-0.5">{aiError}</p>
                    </div>
                  </div>
                )}

                {/* STEP 1: UPLOAD FILE TARGET */}
                {aiStep === 1 && (
                  <div className="py-8 flex flex-col items-center justify-center">
                    <label className="w-full max-w-md border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-400/40 rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white dark:bg-[#0b1120] hover:shadow-[0_0_24px_rgba(20,184,166,0.02)] active:scale-[0.99] select-none group">
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleMenuImageUpload}
                        className="hidden"
                      />
                      <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-250 select-none">
                        <UploadCloud className="w-8 h-8 text-teal-500 dark:text-teal-400" />
                      </div>
                      <h4 className="font-black text-slate-800 dark:text-white text-sm">Select Restaurant Menu Image</h4>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed max-w-[280px]">
                        Drop your printed menu photo, brochure, or sheet here. Supports PNG, JPG (Max 5MB).
                      </p>
                    </label>
                  </div>
                )}

                {/* STEP 2: SCANNERS & PROGRESS TIMELINE */}
                {aiStep === 2 && menuImageBase64 && (
                  <div className="flex flex-col items-center justify-center py-6 select-none">
                    <div className="w-full max-w-sm rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 relative bg-white dark:bg-[#0b1120] shadow-xl">
                      {/* Scaled Preview */}
                      <img src={menuImageBase64} alt="Menu Preview" className="w-full h-64 object-cover filter brightness-[0.75]" />
                      
                      {/* Laser scanning moving bar */}
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#2dd4bf] animate-bounce z-10" style={{ top: '10%', animationDuration: '3s' }}></div>

                      {/* Mock scanning bounding boxes */}
                      {aiScanProgress > 15 && aiScanProgress < 75 && (
                        <div className="absolute top-[25%] left-[10%] px-2 py-1 bg-teal-500/20 text-teal-400 text-[8px] font-black border border-teal-500/40 rounded uppercase tracking-wider animate-pulse z-15">
                          [STARTERS DETECTED]
                        </div>
                      )}
                      {aiScanProgress > 35 && aiScanProgress < 85 && (
                        <div className="absolute top-[50%] right-[15%] px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[8px] font-black border border-emerald-500/40 rounded uppercase tracking-wider animate-pulse z-15">
                          [EXTRACTING PRICES]
                        </div>
                      )}
                      {aiScanProgress > 55 && (
                        <div className="absolute bottom-[20%] left-[20%] px-2 py-1 bg-indigo-500/20 text-indigo-400 text-[8px] font-black border border-indigo-500/40 rounded uppercase tracking-wider animate-pulse z-15">
                          [MAPPING RELATIONSHIPS]
                        </div>
                      )}
                    </div>

                    {/* Progress Bar container */}
                    <div className="w-full max-w-md mt-8 space-y-3">
                      <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5 text-teal-400 animate-spin" /> {aiScanStatus}
                        </span>
                        <span>{aiScanProgress}%</span>
                      </div>
                      
                      <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                        <div 
                          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-300 shadow-md shadow-teal-500/10"
                          style={{ width: `${aiScanProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: EXTREMELY HIGH FIDELITY EDITING & VALIDATION GRID */}
                {aiStep === 3 && aiGeneratedMenu && (
                  <div className="space-y-6">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-850 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80">
                      ✨ **AI menu scan completed!** Check categories and dishes below. You can correct descriptions, tweak estimated prices, or delete items before adding them to the database.
                    </p>

                    <div className="space-y-8 select-text">
                      {aiGeneratedMenu.categories.map((cat, catIdx) => (
                        <div key={catIdx} className="bg-white dark:bg-[#0b1120] border border-slate-150/70 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                          {/* Category Header */}
                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">POS Menu Category</span>
                              <input
                                type="text"
                                required
                                value={cat.name}
                                onChange={(e) => {
                                  const updated = { ...aiGeneratedMenu };
                                  updated.categories[catIdx].name = e.target.value;
                                  updated.categories[catIdx].slug = e.target.value.toLowerCase().replace(/\s+/g, '-');
                                  setAiGeneratedMenu(updated);
                                }}
                                className="text-sm font-black text-slate-800 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
                              />
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                const updated = { ...aiGeneratedMenu };
                                updated.categories.splice(catIdx, 1);
                                setAiGeneratedMenu(updated);
                              }}
                              className="text-[10px] font-black text-red-500 hover:text-red-600 hover:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/10"
                            >
                              Delete Category
                            </button>
                          </div>

                          {/* Category Items List */}
                          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 space-y-4">
                            {cat.items.map((item, itemIdx) => (
                              <div key={itemIdx} className="pt-4 first:pt-0 flex flex-col md:flex-row gap-4 items-start justify-between">
                                <div className="flex-1 space-y-3 w-full">
                                  {/* Row 1: Name and Price */}
                                  <div className="grid grid-cols-4 gap-3">
                                    <div className="col-span-3">
                                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Dish Name</label>
                                      <input
                                        type="text"
                                        required
                                        value={item.name}
                                        onChange={(e) => {
                                          const updated = { ...aiGeneratedMenu };
                                          updated.categories[catIdx].items[itemIdx].name = e.target.value;
                                          setAiGeneratedMenu(updated);
                                        }}
                                        className="w-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Price ({currencySymbol})</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={item.price}
                                        onChange={(e) => {
                                          const updated = { ...aiGeneratedMenu };
                                          updated.categories[catIdx].items[itemIdx].price = parseFloat(e.target.value) || 0;
                                          setAiGeneratedMenu(updated);
                                        }}
                                        className="w-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs font-black focus:outline-none text-right"
                                      />
                                    </div>
                                  </div>

                                  {/* Row 2: Description and Preset image */}
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="md:col-span-2">
                                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Ingredients / Description</label>
                                      <input
                                        type="text"
                                        value={item.description}
                                        onChange={(e) => {
                                          const updated = { ...aiGeneratedMenu };
                                          updated.categories[catIdx].items[itemIdx].description = e.target.value;
                                          setAiGeneratedMenu(updated);
                                        }}
                                        className="w-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5">Graphic Preset</label>
                                      <select
                                        value={item.presetImage}
                                        onChange={(e) => {
                                          const updated = { ...aiGeneratedMenu };
                                          updated.categories[catIdx].items[itemIdx].presetImage = e.target.value;
                                          setAiGeneratedMenu(updated);
                                        }}
                                        className="w-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800/80 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none"
                                      >
                                        {presetImages.map((p, pIdx) => (
                                          <option key={pIdx} value={p.name}>{p.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = { ...aiGeneratedMenu };
                                    updated.categories[catIdx].items.splice(itemIdx, 1);
                                    setAiGeneratedMenu(updated);
                                  }}
                                  className="p-2.5 rounded-xl border border-rose-500/10 hover:border-rose-500/30 text-rose-500 hover:bg-rose-500/10 shrink-0 md:mt-5 transition-all duration-150 active-press self-end md:self-auto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-150 dark:border-slate-800 flex gap-2.5 bg-white/20 dark:bg-[#0b1120]/45">
                <button
                  type="button"
                  onClick={() => {
                    setShowAIModal(false);
                    setAiStep(1);
                    setMenuImageBase64(null);
                    setAiGeneratedMenu(null);
                  }}
                  disabled={isAiLoading}
                  className="w-1/3 py-3 rounded-2xl text-xs font-black bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-350 disabled:opacity-50 disabled:cursor-not-allowed text-center transition-colors active-press"
                >
                  Cancel
                </button>

                {aiStep === 3 && aiGeneratedMenu && (
                  <button
                    type="button"
                    onClick={handleSaveAIGeneratedMenu}
                    disabled={isAiLoading || aiGeneratedMenu.categories.length === 0}
                    className="flex-1 py-3 rounded-2xl text-xs font-black bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-50 disabled:cursor-not-allowed text-center shadow-md shadow-teal-600/15 transition-all active-press"
                  >
                    {isAiLoading ? 'Importing Menu Items...' : 'Confirm & Add to POS Catalog'}
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

      </div>
    </Navigation>
  );
}
