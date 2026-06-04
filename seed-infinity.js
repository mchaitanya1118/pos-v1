const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://yhboirzqofsqravwbxtd.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloYm9pcnpxb2ZzcXJhdndieHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMDE2ODQsImV4cCI6MjA5NTg3NzY4NH0.syPdQufMd8r1ESZLks8wc1WvMPV_FCZSExnsrIx3u9Y');

const menuData = {
  "TEA / COFFEE": [
    { name: "HOME STYLE TEA", price: 100 },
    { name: "MASALA TEA", price: 100 },
    { name: "GINGER TEA", price: 100 },
    { name: "GREEN TEA", price: 100 },
    { name: "BRU COFFEE", price: 100 },
    { name: "BLACK COFFEE", price: 100 }
  ],
  "MILKSHAKES": [
    { name: "VANILLA", price: 200 },
    { name: "STRAWBERRY", price: 200 },
    { name: "BLACK CURRENT", price: 200 },
    { name: "CHOCOLATE", price: 200 },
    { name: "KITKAT", price: 200 },
    { name: "OREO COOKIE", price: 200 },
    { name: "SNICKERS", price: 200 },
    { name: "FERRERO ROCHER", price: 250 }
  ],
  "MAGGIE": [
    { name: "VEG CHEESE MAGGIE", price: 150 },
    { name: "MASALA CHEESE MAGGIE", price: 150 },
    { name: "EGG CHEESE MAGGIE", price: 150 },
    { name: "CHICKEN CHEESE MAGGIE", price: 150 }
  ],
  "MOCKTAILS": [
    { name: "POMEGRANATE DELIGHT", price: 150 },
    { name: "BLUE CURACAO ANGLE", price: 150 },
    { name: "VIRGIN MOJITO", price: 150 },
    { name: "WATERMELON", price: 150 },
    { name: "GREEN APPLE", price: 150 },
    { name: "BLUE BERRY TEA", price: 150 },
    { name: "PEACH PASSION TEA", price: 150 },
    { name: "BLACK BERRY TEA", price: 150 },
    { name: "LEMON ICE TEA", price: 150 },
    { name: "FRESH LIME SODA SWEET & SALT", price: 150 }
  ],
  "SANDWICH": [
    { name: "VEG SANDWICH", price: 250 },
    { name: "PANEER SANDWICH", price: 250 },
    { name: "PANEER 65 SANDWICH", price: 250 },
    { name: "DOUBLE EGG SANDWICH", price: 250 },
    { name: "CHICKEN SANDWICH", price: 250 },
    { name: "CHICKEN 65 SANDWICH", price: 250 },
    { name: "NUTELLA SANDWICH", price: 250 },
    { name: "PEANUT BUTTER SANDWICH", price: 250 }
  ],
  "QUICK BITES": [
    { name: "SALTED FRENCH FRIES", price: 200 },
    { name: "PERI PERI FRENCH FRIES", price: 200 },
    { name: "CHICKEN NUGGETS", price: 200 },
    { name: "CHICKEN POPCORN", price: 200 },
    { name: "CHILLI CHEESE TOAST", price: 200 },
    { name: "CHEESE GARLIC BREAD", price: 200 }
  ],
  "PASTA": [
    { name: "ARRABIATA RED SAUCE PASTA", price: 350 },
    { name: "CREAMY WHITE SAUCE PASTA", price: 350 },
    { name: "BASIL RED SAUCE PASTA", price: 350 },
    { name: "MIXED SAUCE PASTA", price: 350 }
  ],
  "DIET": [
    { name: "BOILED ENGLISH VEGETABLES", price: 300 },
    { name: "BOILED EGGS WITH BOILED VEGETABLES", price: 300 },
    { name: "GRILLED FISH WITH BOILED VEGETABLES", price: 350 },
    { name: "GRILLED CHICKEN WITH BOILED VEGETABLES", price: 350 }
  ],
  "SALAD": [
    { name: "CUCUMBER YOGURT SALAD", price: 250 },
    { name: "ITALIAN PASTA SALAD", price: 300 },
    { name: "CAESAR SALAD", price: 300 }
  ],
  "SOUP": [
    { name: "MANCHOW SOUP", price: 150 },
    { name: "HOT & SOUR SOUP", price: 150 },
    { name: "SWEET CORN SOUP", price: 150 }
  ],
  "VEG STARTERS": [
    { name: "VEG MANCHURIA", price: 300 },
    { name: "CHILLI BABY CORN", price: 300 },
    { name: "CHILLI MUSHROOM", price: 300 },
    { name: "MUSHROOM 65", price: 300 },
    { name: "PEPPER PANEER", price: 300 },
    { name: "DRAGON PANEER", price: 300 },
    { name: "PANEER MAJESTIC", price: 300 },
    { name: "PANEER 555", price: 300 },
    { name: "GOBI MANCHURIA", price: 300 },
    { name: "PANEER MANCHURIA", price: 300 },
    { name: "PANEER 65", price: 300 },
    { name: "CHILLI PANEER", price: 300 },
    { name: "CRISPY CORN", price: 300 },
    { name: "CRISPY FRIED BABY CORN", price: 300 },
    { name: "VEG SALT AND PEPPER", price: 300 },
    { name: "HONEY CHILLI POTATO", price: 300 }
  ],
  "EXTRA": [
    { name: "PAROTTA", price: 50 },
    { name: "CURD / RAITA", price: 50 },
    { name: "MAYONNAISE", price: 50 },
    { name: "ONION SALAD", price: 50 }
  ],
  "NON VEG STARTERS": [
    { name: "CHILLI CHICKEN", price: 350 },
    { name: "CHICKEN 65", price: 350 },
    { name: "CHICKEN MANCHURIA", price: 350 },
    { name: "CHICKEN DRUMSTICK (6)", price: 350 },
    { name: "CHICKEN LOLLIPOP", price: 350 },
    { name: "CHICKEN 555", price: 350 },
    { name: "CHICKEN WINGS", price: 350 },
    { name: "PEPPER CHICKEN", price: 350 },
    { name: "FISH & CHIPS", price: 350 },
    { name: "CHILLI FISH", price: 350 },
    { name: "APOLLO FISH", price: 350 },
    { name: "LOOSE PRAWNS", price: 350 },
    { name: "CHILLI PRAWNS", price: 350 },
    { name: "DRAGON CHICKEN", price: 350 },
    { name: "CHICKEN MAJESTIC", price: 350 },
    { name: "BUTTER GARLIC CHICKEN", price: 350 },
    { name: "BASIL LEMON CHICKEN", price: 350 },
    { name: "TAI PAI CHICKEN", price: 350 },
    { name: "BLACK PEPPER CHICKEN", price: 350 },
    { name: "TERIYAKI CHICKEN", price: 350 },
    { name: "BBQ CHICKEN", price: 350 },
    { name: "CHICKEN SALT & PEPPER", price: 350 },
    { name: "CHICKEN HONG KONG", price: 350 },
    { name: "BANGKOK CHICKEN", price: 350 },
    { name: "SCHEZWAN CHICKEN", price: 350 }
  ],
  "MAIN COURSE": [
    { name: "JEERA RICE / CURD RICE", price: 200 },
    { name: "SOFT FRIED RICE", price: 250 },
    { name: "SOFT NOODLES", price: 250 },
    { name: "CHILLI GARLIC RICE", price: 250 },
    { name: "CHILLI GARLIC NOODLES", price: 250 },
    { name: "SCHEZWAN RICE", price: 250 },
    { name: "SCHEZWAN NOODLES", price: 250 },
    { name: "DOUBLE EGG RICE", price: 300 },
    { name: "DOUBLE EGG NOODLES", price: 300 }
  ],
  "SPECIAL MAIN COURSE": [
    { name: "CHICKEN BUTTER GARLIC FRIED RICE", price: 400 },
    { name: "BUTTER RICE WITH GRILLED CHICKEN", price: 400 },
    { name: "BUTTER RICE WITH GRILLED FISH", price: 400 },
    { name: "BUTTER CHICKEN WITH JEERA RICE", price: 400 },
    { name: "CHICKEN KHEEMA WITH JEERA RICE", price: 400 },
    { name: "PANEER BUTTER MASLA WITH JEERA RICE", price: 400 },
    { name: "PAROTTA WITH ANY CURRY / STARTER", price: 400 },
    { name: "PAROTTA WITH CHICKEN KHEEMA", price: 400 }
  ],
  "BEVERAGES": [
    { name: "WATER BOTTLE (500ML)", price: 30 },
    { name: "SOFT DRINK CAN (300ML)", price: 100 },
    { name: "DIET COKE", price: 100 },
    { name: "PULPY ORANGE", price: 100 },
    { name: "HELL", price: 100 },
    { name: "REDBULL", price: 200 }
  ]
};

async function seedMenu() {
  console.log("Seeding Infinity Cafe menu to Supabase...");
  
  for (const [catName, items] of Object.entries(menuData)) {
    const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const catId = require('crypto').randomUUID();
    
    const { error: catErr } = await supabase.from('menu_categories').insert({
      id: catId,
      name: catName,
      slug: slug,
      created_at: new Date().toISOString()
    });
    
    if (catErr) {
      console.error('Error inserting category ' + catName + ':', catErr.message);
      continue;
    }
    console.log('+ Added Category: ' + catName);

    for (const item of items) {
      const itemId = require('crypto').randomUUID();
      const { error: itemErr } = await supabase.from('menu_items').insert({
        id: itemId,
        name: item.name,
        category_id: catId,
        description: '',
        price: item.price,
        image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=400',
        is_available: true,
        created_at: new Date().toISOString()
      });
      
      if (itemErr) {
        console.error('Error inserting item ' + item.name + ':', itemErr.message);
      }
    }
    console.log('  -> Added ' + items.length + ' items');
  }
  
  console.log("Done!");
}

seedMenu();
