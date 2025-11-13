const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser(email) {
  console.log('\n🔍 Verificando estado del usuario:', email);
  console.log('='.repeat(60));

  try {
    // Buscar en auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error obteniendo usuarios de auth:', authError);
      return;
    }

    const user = authUsers.users.find(u => u.email === email);
    
    if (!user) {
      console.error('❌ Usuario no encontrado en auth.users');
      return;
    }

    console.log('\n✅ Usuario encontrado en auth.users:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);

    // Buscar en profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('\n❌ Error obteniendo profile:', profileError);
    } else if (profile) {
      console.log('\n📋 Profile:');
      console.log('   subscription_status:', profile.subscription_status || 'NULL');
      console.log('   subscription_plan:', profile.subscription_plan || 'NULL');
      console.log('   stripe_customer_id:', profile.stripe_customer_id || 'NULL');
      console.log('   stripe_subscription_id:', profile.stripe_subscription_id || 'NULL');
      console.log('   subscription_current_period_end:', profile.subscription_current_period_end || 'NULL');
    } else {
      console.log('\n⚠️ No se encontró perfil para este usuario');
    }

    // Buscar en subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id);

    if (subsError) {
      console.error('\n❌ Error obteniendo subscriptions:', subsError);
    } else if (subscriptions && subscriptions.length > 0) {
      console.log('\n💳 Subscriptions:');
      subscriptions.forEach((sub, idx) => {
        console.log(`   [${idx + 1}]`);
        console.log('      status:', sub.status);
        console.log('      price_id:', sub.price_id);
        console.log('      stripe_subscription_id:', sub.stripe_subscription_id);
        console.log('      current_period_end:', sub.current_period_end);
      });
    } else {
      console.log('\n⚠️ No se encontraron subscriptions para este usuario');
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

const email = process.argv[2];

if (!email) {
  console.error('❌ Debes proporcionar un email como argumento');
  console.log('Uso: node check-user-subscription.js email@example.com');
  process.exit(1);
}

checkUser(email).then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
});
