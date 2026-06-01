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
  Loader2,
  UploadCloud,
  FileText,
  Image as ImageIcon
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

  // AI Menu Generator states
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiCuisine, setAiCuisine] = useState('italian');
  const [aiVibe, setAiVibe] = useState('bistro');
  const [aiCount, setAiCount] = useState(5);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [generatedItems, setGeneratedItems] = useState<{
    id: string;
    name: string;
    description: string;
    price: number;
    imageUrl: string;
    categoryId: string;
    selected: boolean;
  }[]>([]);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  
  // OCR Scanner states
  const [aiTab, setAiTab] = useState<'prompt' | 'scanner'>('prompt');
  const [scannedFile, setScannedFile] = useState<string | null>(null);
  const [scannedFileName, setScannedFileName] = useState('');
  const [scannedFileSize, setScannedFileSize] = useState('');

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

  const generateAiMenu = async () => {
    setIsGenerating(true);
    setGenerationStep('Analyzing cuisine and vibe templates...');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setGenerationStep('Simulating deep neural recipe generation...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setGenerationStep('Mapping high-res dish graphics and stock assets...');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setGenerationStep('Finalizing pricing optimization vectors...');
    await new Promise(resolve => setTimeout(resolve, 600));

    // Choose items based on cuisine and vibe
    const baseItems: { name: string; description: string; price: number; imageUrl: string; catName: string }[] = [];

    if (aiCuisine === 'italian') {
      if (aiVibe === 'fine_dining') {
        baseItems.push(
          { name: "Truffle Porcini Risotto", description: "Rich Arborio rice slow-simmered with wild porcini mushrooms, freshly shaved black summer truffles, and 24-month aged Parmigiano-Reggiano.", price: 28.00, imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60", catName: "Main Course" },
          { name: "Lobster Fettuccine Nero", description: "Squid ink pasta tossed with butter-poached Maine lobster, sun-ripened cherry tomatoes, and a light garlic white wine emulsion.", price: 34.00, imageUrl: "https://images.unsplash.com/photo-1559737607-3578909a22fa?w=500&auto=format&fit=crop&q=60", catName: "Main Course" },
          { name: "Aged Carpaccio di Manzo", description: "Paper-thin slices of prime beef tenderloin topped with wild baby arugula, capers, mustard aioli, and shaved parmesan.", price: 19.50, imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60", catName: "Starters" }
        );
      } else {
        baseItems.push(
          { name: "Classic Margherita DOP", description: "Wood-fired crispy artisan crust topped with San Marzano tomatoes, fresh buffalo mozzarella, aromatic sweet basil, and extra virgin olive oil.", price: 14.50, imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60", catName: "Main Course" },
          { name: "Spaghetti Carbonara Romano", description: "Al dente spaghetti tossed with crispy guanciale, rich egg yolks, pecorino romano cheese, and freshly ground coarse black pepper.", price: 17.00, imageUrl: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=60", catName: "Main Course" },
          { name: "Bruschetta Classic Trio", description: "Toasted garlic artisan baguettes topped with heirloom cherry tomatoes, fresh sweet basil, garlic, and sweet balsamic glaze.", price: 8.50, imageUrl: "https://images.unsplash.com/photo-1572656631137-7935297eff55?w=500&auto=format&fit=crop&q=60", catName: "Starters" }
        );
      }
    } else if (aiCuisine === 'indian') {
      baseItems.push(
        { name: "Charcoal Smoked Butter Chicken", description: "Tandoor-roasted chicken tikka simmered in a velvet tomato cream gravy finished with active charcoal smoke and real butter.", price: 18.00, imageUrl: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=60", catName: "Main Course" },
        { name: "Delhi Samosa Chaat", description: "Crispy spiced potato pastries crushed and topped with warm spiced yellow peas, sweetened yoghurt, mint, and tangy tamarind chutneys.", price: 9.00, imageUrl: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=60", catName: "Starters" },
        { name: "Zafrani Saffron Paneer Tikka", description: "Chunky cottage cheese cubes marinated in real saffron, thick yoghurt, tandoori spices, and char-grilled with bell peppers.", price: 16.50, imageUrl: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60", catName: "Main Course" }
      );
    } else if (aiCuisine === 'mexican') {
      baseItems.push(
        { name: "Tacos al Pastor Platter", description: "Thinly sliced marinated pork spit-roasted with sweet pineapple, cilantro, and white onions on warm stone-ground double-corn tortillas.", price: 13.00, imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=500&auto=format&fit=crop&q=60", catName: "Main Course" },
        { name: "Street Style Cotija Elote", description: "Sweet corn on the cob char-grilled and slathered in lime-infused cotija cheese mayonnaise and dusted with mild tajin powder.", price: 7.00, imageUrl: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60", catName: "Starters" },
        { name: "Ancho Chili Glazed Salmon", description: "Fresh salmon fillet pan-seared and glazed with sweet ancho chili honey, served with black bean corn relish and avocado lime purée.", price: 23.50, imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=60", catName: "Main Course" }
      );
    } else if (aiCuisine === 'american') {
      baseItems.push(
        { name: "Avocado Smashed Prime Burger", description: "USDA Prime beef patty topped with fresh hand-mashed avocado, heirloom tomatoes, sharp Wisconsin cheddar, and chipotle aioli on toasted brioche.", price: 16.00, imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60", catName: "Main Course" },
        { name: "Texas Honey BBQ Ribs", description: "Half-rack of baby back pork ribs glazed in our signature sweet honey-bourbon BBQ sauce, served with creamy coleslaw and buttered corn.", price: 24.50, imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60", catName: "Main Course" },
        { name: "Garlic Parmesan Crispy Wings", description: "Double-fried crispy jumbo chicken wings tossed in rich butter, garlic confit, and freshly grated imported parmesan cheese.", price: 11.50, imageUrl: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60", catName: "Starters" }
      );
    } else if (aiCuisine === 'desserts') {
      baseItems.push(
        { name: "White Matcha Lava Cake", description: "Warm green tea cake filled with an oozing liquid white chocolate matcha center, served with cold sweet red bean paste and ice cream.", price: 10.50, imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60", catName: "Desserts" },
        { name: "Classic New York Cheesecake", description: "Dense and creamy traditional cheesecake on a buttery graham cracker crust, topped with fresh glaze strawberries and sweet compote.", price: 8.90, imageUrl: "https://images.unsplash.com/photo-1524351199679-46cddf530c04?w=500&auto=format&fit=crop&q=60", catName: "Desserts" }
      );
    } else { // Beverages
      baseItems.push(
        { name: "Fresh Mint Mojito Cooler", description: "Refreshing carbonated soda infused with freshly muddled organic mint leaves, fresh lime wedges, and pure sugar cane syrup.", price: 7.00, imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60", catName: "Beverages" },
        { name: "Iced Caramel Espresso Macchiato", description: "Freshly brewed dark espresso layered with cold whole milk, vanilla bean syrup, and rich butter caramel drizzle over crushed ice.", price: 5.50, imageUrl: "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=500&auto=format&fit=crop&q=60", catName: "Beverages" }
      );
    }

    // Populate items dynamically by duplicate scaling
    const generated: typeof generatedItems = [];
    
    for (let i = 0; i < aiCount; i++) {
      const template = baseItems[i % baseItems.length];
      const basePrice = activeSettings?.currency === 'INR' ? template.price * 80 : template.price;
      
      let finalName = template.name;
      let finalDescription = template.description;
      
      if (i >= baseItems.length) {
        finalName = `${template.name} Double`;
        finalDescription = `Extra large serving. ${template.description}`;
      }

      if (aiPrompt.trim()) {
        finalDescription = `${finalDescription} (Notes: ${aiPrompt})`;
      }

      let matchedCategory = categories[0]?.id || '';
      const categoryMatch = categories.find(c => c.name.toLowerCase().includes(template.catName.toLowerCase()));
      if (categoryMatch) {
        matchedCategory = categoryMatch.id;
      }

      generated.push({
        id: `ai_gen_${Date.now()}_${i}`,
        name: finalName,
        description: finalDescription,
        price: Math.round(basePrice),
        imageUrl: template.imageUrl,
        categoryId: matchedCategory,
        selected: true
      });
    }

    setGeneratedItems(generated);
    setIsGenerating(false);
    setShowReviewScreen(true);
  };

  const simulateOcrScan = async () => {
    if (!scannedFile) {
      alert("Please upload or select a menu image to scan first!");
      return;
    }

    setIsGenerating(true);
    setGenerationStep('Initializing optical character recognition (OCR) engine...');
    await new Promise(resolve => setTimeout(resolve, 900));

    setGenerationStep('Binarizing image text layout and isolating grids...');
    await new Promise(resolve => setTimeout(resolve, 1100));

    setGenerationStep('Extracting titles, descriptions, and parsing currency indices...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    setGenerationStep('Structuring dish catalog lists & category mappings...');
    await new Promise(resolve => setTimeout(resolve, 800));

    const ocrTemplates = [
      { name: "Wood-Fired Garlic Prawns", description: "Jumbo ocean prawns sautéed in white wine garlic butter, flat-leaf parsley, and charred sourdough slices.", price: 21.00, imageUrl: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500&auto=format&fit=crop&q=60", catName: "Starters" },
      { name: "Tuscan Rosemary Ribeye Steak", description: "400g Prime grass-fed ribeye flame-grilled, brushed with rosemary-infused garlic butter, served with truffle chips.", price: 38.00, imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60", catName: "Main Course" },
      { name: "Signature Rigatoni Bolognese", description: "Slow-braised beef & veal ragù with red wine, aromatic soffritto, and freshly grated aged pecorino romano.", price: 19.50, imageUrl: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=60", catName: "Main Course" },
      { name: "Salted Caramel Tart", description: "Decadent dark chocolate shell filled with fleur de sel caramel ganache, topped with vanilla bean whip.", price: 9.50, imageUrl: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60", catName: "Desserts" },
      { name: "Hibiscus Citrus Mocktail", description: "Cold-brewed organic hibiscus herbal tea shaken with sweet orange nectar, fresh key lime juice, and sparkling club soda.", price: 7.50, imageUrl: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60", catName: "Beverages" }
    ];

    const generated: typeof generatedItems = [];

    for (let i = 0; i < ocrTemplates.length; i++) {
      const template = ocrTemplates[i];
      const basePrice = activeSettings?.currency === 'INR' ? template.price * 80 : template.price;

      let matchedCategory = categories[0]?.id || '';
      const categoryMatch = categories.find(c => c.name.toLowerCase().includes(template.catName.toLowerCase()));
      if (categoryMatch) {
        matchedCategory = categoryMatch.id;
      }

      generated.push({
        id: `ocr_gen_${Date.now()}_${i}`,
        name: template.name,
        description: template.description,
        price: Math.round(basePrice),
        imageUrl: template.imageUrl,
        categoryId: matchedCategory,
        selected: true
      });
    }

    setGeneratedItems(generated);
    setIsGenerating(false);
    setShowReviewScreen(true);
  };

  const importGeneratedItems = async () => {
    const selected = generatedItems.filter(item => item.selected);
    if (selected.length === 0) {
      alert("No items selected for import!");
      return;
    }

    try {
      for (const item of selected) {
        const newItem: MenuItem = {
          id: item.id,
          name: item.name,
          categoryId: item.categoryId,
          description: item.description,
          price: item.price,
          imageUrl: item.imageUrl,
          isAvailable: true,
          createdAt: new Date().toISOString()
        };
        await db.saveMenuItem(newItem);
      }

      const mList = await db.getMenuItems();
      setMenuItems(mList);

      setShowAiModal(false);
      setShowReviewScreen(false);
      setGeneratedItems([]);
      setAiPrompt('');
      alert(`Successfully imported ${selected.length} items into your POS Menu Catalog!`);
    } catch (err) {
      console.error("Failed to import generated menu items", err);
    }
  };

  const updateGeneratedItemName = (index: number, newName: string) => {
    setGeneratedItems(prev => prev.map((item, idx) => idx === index ? { ...item, name: newName } : item));
  };

  const updateGeneratedItemPrice = (index: number, newPrice: number) => {
    setGeneratedItems(prev => prev.map((item, idx) => idx === index ? { ...item, price: newPrice } : item));
  };

  const updateGeneratedItemCategory = (index: number, catId: string) => {
    setGeneratedItems(prev => prev.map((item, idx) => idx === index ? { ...item, categoryId: catId } : item));
  };

  const updateGeneratedItemDescription = (index: number, desc: string) => {
    setGeneratedItems(prev => prev.map((item, idx) => idx === index ? { ...item, description: desc } : item));
  };

  const toggleGeneratedItemSelection = (index: number) => {
    setGeneratedItems(prev => prev.map((item, idx) => idx === index ? { ...item, selected: !item.selected } : item));
  };

  const toggleAllGeneratedItemsSelection = (selectAll: boolean) => {
    setGeneratedItems(prev => prev.map(item => ({ ...item, selected: selectAll })));
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

          <div className="flex flex-col sm:flex-row gap-2.5 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setShowAiModal(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/10 active-press transition-all justify-center cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-purple-200 animate-pulse" /> AI Menu Generator
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 active-press transition-all justify-center cursor-pointer"
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

        {/* AI MENU GENERATOR MODAL */}
        {showAiModal && (
          <div className="fixed inset-0 z-50 bg-[#090d16]/70 backdrop-blur-sm flex items-center justify-center px-4 overflow-y-auto py-8 select-none">
            <div className="glass-panel w-full max-w-4xl rounded-3xl p-6 relative animate-scale-in max-h-[90vh] flex flex-col">
              
              {/* Close Button */}
              {!isGenerating && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAiModal(false);
                    setShowReviewScreen(false);
                    setGeneratedItems([]);
                  }}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* STEP 1: FORM WIZARD */}
              {!isGenerating && !showReviewScreen && (
                <div className="flex-1 flex flex-col overflow-y-auto">
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" /> AI Menu Generator
                  </h3>
                  <p className="text-xs text-slate-400 mb-6">
                    Craft gourmet dishes automatically powered by advanced neural recipe profiles or OCR scanners.
                  </p>

                  {/* Mode Tab Bar */}
                  <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 select-none shrink-0">
                    <button
                      type="button"
                      onClick={() => setAiTab('prompt')}
                      className={`px-6 py-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                        aiTab === 'prompt'
                          ? 'text-indigo-550 border-b-2 border-indigo-500 font-black'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> AI Prompt Synthesizer
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiTab('scanner')}
                      className={`px-6 py-3 text-xs font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
                        aiTab === 'scanner'
                          ? 'text-indigo-550 border-b-2 border-indigo-500 font-black'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Printed Menu OCR Scanner
                    </button>
                  </div>

                  {aiTab === 'scanner' ? (
                    <div className="space-y-5 flex-1 pr-1">
                      {/* Drag & Drop zone */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">Upload Printed Menu Photo</label>
                        {!scannedFile ? (
                          <div
                            onClick={() => {
                              // Simulate selecting a file
                              setScannedFile('https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=800&auto=format&fit=crop&q=60');
                              setScannedFileName('printed_menu_hq.jpg');
                              setScannedFileSize('1.8 MB');
                            }}
                            className="border-dashed border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 hover:bg-slate-200/5 dark:hover:bg-slate-800/10 transition-all select-none"
                          >
                            <UploadCloud className="w-12 h-12 text-slate-400 mb-3 animate-bounce" />
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 text-center">
                              Drag & drop your physical menu photo here, or <span className="text-indigo-400 hover:underline">browse files</span>
                            </p>
                            <p className="text-[9px] text-slate-500 mt-1">Supports JPG, PNG, WEBP (Max 5MB)</p>
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/20 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center shrink-0 border border-slate-700">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={scannedFile} alt="Scanned file preview" className="object-cover w-full h-full opacity-80" />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                  <ImageIcon className="w-3.5 h-3.5 text-indigo-400" /> {scannedFileName}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{scannedFileSize} • Image Loaded Successfully</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setScannedFile(null);
                                setScannedFileName('');
                                setScannedFileSize('');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold transition-all"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Fast OCR Presets */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">Or Choose a Sample Menu Image Preset</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {[
                            { name: "Bistro Cafe Printed Menu", size: "1.4 MB", preview: "https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60" },
                            { name: "Spice Fusion Tavern Menu", size: "2.1 MB", preview: "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500&auto=format&fit=crop&q=60" }
                          ].map((p, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setScannedFile(p.preview);
                                setScannedFileName(p.name + ".png");
                                setScannedFileSize(p.size);
                              }}
                              className={`p-3 rounded-2xl border text-left transition-all active-press flex items-center gap-3 cursor-pointer ${
                                scannedFileName.startsWith(p.name)
                                  ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-slate-400 hover:text-slate-255 hover:border-slate-700'
                              }`}
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center shrink-0">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={p.preview} alt="Preset thumbnail" className="object-cover w-full h-full opacity-70" />
                              </div>
                              <div>
                                <h5 className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{p.name}</h5>
                                <p className="text-[9px] text-slate-400 font-semibold">{p.size} • Template Image</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5 flex-1 pr-1">
                      {/* Cuisine Type Grid Selection */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">Cuisine Type</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {[
                            { id: 'italian', label: 'Italian', icon: '🇮🇹' },
                            { id: 'indian', label: 'Indian', icon: '🇮🇳' },
                            { id: 'mexican', label: 'Mexican', icon: '🇲🇽' },
                            { id: 'american', label: 'American', icon: '🇺🇸' },
                            { id: 'desserts', label: 'Desserts', icon: '🍰' },
                            { id: 'beverages', label: 'Beverages', icon: '🍹' },
                          ].map((cuisine) => (
                            <button
                              key={cuisine.id}
                              type="button"
                              onClick={() => setAiCuisine(cuisine.id)}
                              className={`p-3 rounded-2xl border text-left transition-all active-press flex items-center gap-2 cursor-pointer ${
                                aiCuisine === cuisine.id
                                  ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-slate-400 hover:text-slate-250 hover:border-slate-700'
                              }`}
                            >
                              <span className="text-xl">{cuisine.icon}</span>
                              <span className="text-xs">{cuisine.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Vibe / Style pills */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">Establishment Vibe & Style</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'bistro', label: 'Casual Bistro' },
                            { id: 'fine_dining', label: 'Fine Dining' },
                            { id: 'fast_food', label: 'Fast Food / Express' },
                            { id: 'cafe', label: 'Cozy Café' },
                          ].map((vibe) => (
                            <button
                              key={vibe.id}
                              type="button"
                              onClick={() => setAiVibe(vibe.id)}
                              className={`px-4 py-2.5 rounded-full text-xs font-semibold border transition-all active-press cursor-pointer ${
                                aiVibe === vibe.id
                                  ? 'border-purple-500 bg-purple-500/10 text-white font-bold'
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {vibe.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dish Count Stepper/Slider */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Number of Dishes to Synthesize</label>
                          <span className="text-xs font-black text-indigo-400">{aiCount} Dishes</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={aiCount}
                          onChange={(e) => setAiCount(parseInt(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
                        />
                        <div className="flex justify-between text-[9px] text-slate-500 font-bold px-1 mt-1">
                          <span>1 Dish</span>
                          <span>5 Dishes</span>
                          <span>10 Dishes</span>
                        </div>
                      </div>

                      {/* Custom Prompt Constraints */}
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">Custom Style Prompt (Optional)</label>
                        <textarea
                          placeholder="e.g. Include vegetarian recipes, make them extra spicy, style with gold leaf accents..."
                          rows={3}
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          className="w-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl px-4 py-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 dark:text-white placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* Wizard Footer Action */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowAiModal(false)}
                      className="w-1/3 py-3 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-800 dark:text-white"
                    >
                      Close Wizard
                    </button>
                    {aiTab === 'scanner' ? (
                      <button
                        type="button"
                        onClick={simulateOcrScan}
                        className="flex-1 py-3 rounded-2xl text-xs font-black bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active-press transition-all cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-indigo-250 animate-pulse" /> Analyze & Parse Menu via OCR
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={generateAiMenu}
                        className="flex-1 py-3 rounded-2xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active-press transition-all cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-purple-200" /> Synthesize Dishes via AI
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: ANIMATED LOADER */}
              {isGenerating && (
                <div className="flex-1 flex flex-col items-center justify-center py-16 text-center select-none animate-pulse">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-ping scale-75"></div>
                    <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative" />
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white mb-2">Generating Gourmet Recipe Matrix...</h4>
                  <div className="px-6 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 max-w-sm">
                    <span className="text-[10px] uppercase tracking-widest font-black text-indigo-400 animate-pulse">
                      {generationStep}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-4 font-semibold">Running deep pricing optimization and asset mapping...</p>
                </div>
              )}

              {/* STEP 3: HIGH-FIDELITY REVIEW & EDIT SCREEN */}
              {!isGenerating && showReviewScreen && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4 shrink-0 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <Check className="w-5 h-5 text-emerald-500 bg-emerald-500/10 rounded-full p-0.5" /> Review Synthesized Dishes
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Customize prices, names, and descriptions, and choose which dishes to import.
                      </p>
                    </div>

                    {/* Mass Selection Toggle button */}
                    <div className="flex items-center gap-2 self-start sm:self-auto select-none">
                      <button
                        type="button"
                        onClick={() => toggleAllGeneratedItemsSelection(true)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-bold text-slate-650 dark:text-slate-350 transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAllGeneratedItemsSelection(false)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-[10px] font-bold text-slate-650 dark:text-slate-350 transition-colors"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Generated Items Editor */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh]">
                    {generatedItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center gap-4 relative ${
                          item.selected
                            ? 'border-indigo-500/50 bg-indigo-500/5'
                            : 'border-slate-200 dark:border-slate-800/80 bg-slate-950/20 opacity-60'
                        }`}
                      >
                        {/* Checkbox selector */}
                        <div className="absolute top-4 right-4 md:static flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleGeneratedItemSelection(idx)}
                            className="rounded border-slate-350 bg-slate-800 text-indigo-500 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </div>

                        {/* Round Cover Preview */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={item.imageUrl} alt={item.name} className="object-cover w-full h-full" />
                        </div>

                        {/* Editor Inputs Grid */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 w-full">
                          {/* Dish Name */}
                          <div className="md:col-span-2">
                            <label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1">Dish Name</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateGeneratedItemName(idx, e.target.value)}
                              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                            />
                          </div>

                          {/* Category and Price */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1">Category</label>
                              <select
                                value={item.categoryId}
                                onChange={(e) => updateGeneratedItemCategory(idx, e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-400 dark:text-slate-200 focus:outline-none"
                              >
                                {categories.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1">Price ({currencySymbol})</label>
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) => updateGeneratedItemPrice(idx, parseFloat(e.target.value) || 0)}
                                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs font-black text-slate-800 dark:text-white focus:outline-none text-right"
                              />
                            </div>
                          </div>

                          {/* Description */}
                          <div className="md:col-span-3">
                            <label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block mb-1">Description</label>
                            <textarea
                              rows={1}
                              value={item.description}
                              onChange={(e) => updateGeneratedItemDescription(idx, e.target.value)}
                              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-350 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReviewScreen(false);
                        setGeneratedItems([]);
                      }}
                      className="w-1/3 py-3 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-800 dark:text-white"
                    >
                      Back to Prompt
                    </button>
                    <button
                      type="button"
                      onClick={importGeneratedItems}
                      className="flex-1 py-3 rounded-2xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active-press transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Import {generatedItems.filter(i => i.selected).length} Selected Dishes
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </Navigation>
  );
}
