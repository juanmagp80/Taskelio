const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserSubscription(email) {
  console.log('\n🔧 Activando suscripción PRO para:', email);
  console.log('='.repeat(60));

  try {
    // Buscar el perfil
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email);

    if (profileError || !profiles || profiles.length === 0) {
      console.error('❌ Usuario no encontrado');
      return;
    }

    const profile = profiles[0];
    console.log('✅ Usuario encontrado:', profile.id);

    // Actualizar el perfil a PRO
    const subscriptionEnd = new Date();
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1); // 1 mes desde ahora

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_plan: 'pro',
        subscription_current_period_end: subscriptionEnd.toISOString(),
      })
      .eq('id', profile.id)
      .select();

    if (updateError) {
      console.error('❌ Error actualizando perfil:', updateError);
      return;
    }

    console.log('✅ Perfil actualizado exitosamente:');
    console.log('   subscription_status:', updatedProfile[0].subscription_status);
    console.log('   subscription_plan:', updatedProfile[0].subscription_plan);
    console.log('   subscription_current_period_end:', updatedProfile[0].subscription_current_period_end);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Suscripción PRO activada correctamente');
    console.log('📅 Válida hasta:', subscriptionEnd.toLocaleDateString('es-ES'));
    console.log('\n⚠️  IMPORTANTE: El usuario debe cerrar sesión y volver a iniciar sesión');
    console.log('    o refrescar el navegador (Ctrl+Shift+R) para ver los cambios.');

  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

const email = process.argv[2];

if (!email) {
  console.error('❌ Debes proporcionar un email como argumento');
  console.log('Uso: node fix-user-subscription.js email@example.com');
  process.exit(1);
}

fixUserSubscription(email).then(() => {
  console.log('\n✅ Proceso completado');
  process.exit(0);
});
