const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfile(email) {
  console.log('\n🔍 Buscando perfil por email:', email);
  console.log('='.repeat(60));

  try {
    // Buscar directamente en profiles por email
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email);

    if (profileError) {
      console.error('\n❌ Error obteniendo profiles:', profileError);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('\n⚠️ No se encontró ningún perfil con ese email');
      return;
    }

    console.log(`\n✅ Se encontraron ${profiles.length} perfil(es):`);
    
    profiles.forEach((profile, idx) => {
      console.log(`\n[${idx + 1}] Profile:`);
      console.log('   ID:', profile.id);
      console.log('   Email:', profile.email);
      console.log('   Nombre:', profile.full_name || 'NULL');
      console.log('   subscription_status:', profile.subscription_status || 'NULL');
      console.log('   subscription_plan:', profile.subscription_plan || 'NULL');
      console.log('   stripe_customer_id:', profile.stripe_customer_id || 'NULL');
      console.log('   stripe_subscription_id:', profile.stripe_subscription_id || 'NULL');
      console.log('   subscription_current_period_end:', profile.subscription_current_period_end || 'NULL');
    });

    // Buscar en subscriptions para cada perfil encontrado
    for (const profile of profiles) {
      const { data: subscriptions, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', profile.id);

      if (subsError) {
        console.error(`\n❌ Error obteniendo subscriptions para ${profile.id}:`, subsError);
      } else if (subscriptions && subscriptions.length > 0) {
        console.log(`\n💳 Subscriptions para perfil ${profile.id}:`);
        subscriptions.forEach((sub, idx) => {
          console.log(`   [${idx + 1}]`);
          console.log('      status:', sub.status);
          console.log('      price_id:', sub.price_id);
          console.log('      stripe_subscription_id:', sub.stripe_subscription_id);
          console.log('      current_period_end:', sub.current_period_end);
        });
      } else {
        console.log(`\n⚠️ No se encontraron subscriptions para perfil ${profile.id}`);
      }
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

const email = process.argv[2];

if (!email) {
  console.error('❌ Debes proporcionar un email como argumento');
  console.log('Uso: node check-profile-by-email.js email@example.com');
  process.exit(1);
}

checkProfile(email).then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
});
