import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf8');
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function updateImages() {
  const { data: items, error } = await supabase.from('menu_items').select('*');
  if (error) {
    console.error('Error fetching items', error);
    return;
  }

  let updated = 0;
  for (const item of items) {
    // Generate a reliable, fast dynamic image url based on the dish name.
    // Using loremflickr with keywords of the dish name (first 2 words) + food.
    const keywords = item.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(Boolean).slice(0, 2).join(',');
    const imageUrl = `https://loremflickr.com/600/400/food,${keywords}/all?lock=${item.id}`; // Lock parameter ensures same item gets same image across renders

    await supabase.from('menu_items').update({ image_url: imageUrl }).eq('id', item.id);
    updated++;
  }
  console.log(`Updated ${updated} menu items with related dynamic images!`);
}

updateImages();
