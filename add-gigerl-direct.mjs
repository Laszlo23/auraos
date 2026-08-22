#!/usr/bin/env node
/**
 * Add Gigerl to Wien directory (paid local seat)
 * Run: SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node add-gigerl-direct.mjs
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set them in your environment or pass them:');
  console.error('  SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node add-gigerl-direct.mjs');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log('🔌 Connected to Supabase...');

try {
  // Get first user as owner
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .order('created_at')
    .limit(1);

  if (!users || users.length === 0) {
    throw new Error('No users found');
  }

  const ownerId = users[0].id;
  console.log(`👤 Using owner: ${ownerId}`);

  // Check if Gigerl already exists
  const { data: existing } = await supabase
    .from('companies')
    .select('id, slug, name, local_seat_paid_at, local_cohort_number')
    .eq('slug', 'gigerl')
    .maybeSingle();

  if (existing) {
    console.log('✅ Gigerl already exists!');
    console.log(`   ID: ${existing.id}`);
    console.log(`   Paid: ${existing.local_seat_paid_at ? 'Yes' : 'No'}`);
    console.log(`   Cohort: ${existing.local_cohort_number || 'Not assigned'}`);
    console.log(`   Wien page: https://aibusiness.fun/wien`);
    console.log(`   Business page: https://aibusiness.fun/b/gigerl`);
    process.exit(0);
  }

  console.log('📝 Inserting Gigerl...');

  // Insert Gigerl
  const { data: company, error: insertError } = await supabase
    .from('companies')
    .insert({
      owner_id: ownerId,
      name: 'Gigerl',
      slug: 'gigerl',
      tagline: 'Traditioneller Stadtheuriger im Herzen Wiens – 75% BIO-zertifiziert',
      emoji: '🍷',
      city: 'Wien',
      niche: 'Heuriger',
      homepage_url: 'https://www.gigerl.at/',
      google_review_url:
        'https://www.google.com/maps/search/?api=1&query=Stadtheuriger+Gigerl,Rauhensteingasse+3,1010+Wien',
      street: 'Rauhensteingasse 3 (Eingang Blumenstockgasse 2)',
      postal_code: '1010',
      district: '1. Bezirk',
      phone: '+43 1 513 44 31',
      public_email: 'office@gigerl.at',
      hours_note: 'Mo–Sa 16:00–24:00 Uhr | Warme Küche bis 23:00 | Sonntag geschlossen',
      services: [
        'Heurigenbuffet',
        'Wiener Küche',
        'Weinverkostung',
        'Gastgarten',
        'Kaiserschmarrn',
        'BIO-zertifiziert',
      ],
      is_local_business: true,
      featured: false,
      entry_funnel: 'local',
      ui_locale: 'de',
      local_seat_paid_at: new Date().toISOString(),
      network_backlink: true,
    })
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  console.log(`✅ Gigerl created! ID: ${company.id}`);

  // Assign local cohort number
  console.log('🔢 Assigning local cohort number...');
  const { error: cohortError } = await supabase.rpc('assign_local_cohort', {
    _company_id: company.id,
  });

  if (cohortError) {
    console.error('⚠️  Cohort assignment warning:', cohortError.message);
  } else {
    console.log('✅ Local cohort assigned');
  }

  // Grant initial boost credits
  console.log('💰 Granting 200 boost credits...');
  const { error: boostError } = await supabase.rpc('grant_local_boost', {
    _company_id: company.id,
    _amount: 200,
    _note: 'Local Seat unlock (Gigerl) – initial grant',
  });

  if (boostError) {
    console.error('⚠️  Boost grant warning:', boostError.message);
  } else {
    console.log('✅ Boost credits granted');
  }

  // Verify
  const { data: final } = await supabase
    .from('companies')
    .select('id, name, slug, local_cohort_number, local_seat_paid_at')
    .eq('id', company.id)
    .single();

  console.log('\n🎉 Success! Gigerl is now live:');
  console.log(`   Name: ${final.name}`);
  console.log(`   Slug: ${final.slug}`);
  console.log(`   Cohort: #${final.local_cohort_number}`);
  console.log(`   Paid: ${final.local_seat_paid_at}`);
  console.log(`\n🔗 Live URLs:`);
  console.log(`   Wien directory: https://aibusiness.fun/wien`);
  console.log(`   Business page: https://aibusiness.fun/b/gigerl`);
  
} catch (error) {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
