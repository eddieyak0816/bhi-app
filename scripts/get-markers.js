const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://fgduvnmsvkhrhcxykkyc.supabase.co';
const SERVICE_ROLE = 'sb_secret_0BaFhRcYEfojLAp9siIu9A_RHvzCSbG';

const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

async function getMarkers() {
  const { data, error } = await sb.from('lab_markers').select('*');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Current markers:');
    data.forEach(m => {
      console.log(`  ${m.id}: ${m.name} (${m.unit})`);
    });
  }
  process.exit(0);
}

getMarkers();
