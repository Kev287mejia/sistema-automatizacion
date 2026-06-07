import dotenv from 'dotenv';
dotenv.config();

import { supabase } from './integrations/database/supabase';

async function cleanSupabase() {
  console.log('=== RUNNING SUPABASE DATA CLEANUP ===');

  const titlesToDelete = [
    'Introducción IA',
    'Introducción a la IA',
    'Innovación',
    'Null'
  ];

  for (const title of titlesToDelete) {
    const { error } = await supabase
      .from('events')
      .delete()
      .ilike('title', `%${title}%`); // Use ilike to match case-insensitively just in case

    if (error) {
      console.error(`❌ Failed to delete "${title}":`, error.message);
    } else {
      console.log(`✅ Deleted events matching "${title}"`);
    }
  }
  
  // Also delete where title is empty or literally 'null'
  await supabase.from('events').delete().eq('title', 'null');
  await supabase.from('events').delete().eq('title', '');

  console.log('=== DATA CLEANUP COMPLETE ===');
}

cleanSupabase().catch(err => {
  console.error('Unexpected error:', err);
});
