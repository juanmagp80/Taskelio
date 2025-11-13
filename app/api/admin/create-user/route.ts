import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase con service role para bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    const { userEmail, userId } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    // Generar un UUID si no se proporciona
    const finalUserId = userId || crypto.randomUUID();


    const profileData = {
      id: finalUserId,
      email: userEmail,
      subscription_status: 'active',
      subscription_plan: 'pro',
      stripe_customer_id: `cus_real_${finalUserId.substring(0, 8)}`,
      stripe_subscription_id: `sub_real_${finalUserId.substring(0, 8)}`,
      subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      trial_started_at: new Date().toISOString(),
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Verificar si ya existe
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single();

    let result;
    if (existingProfile) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_plan: 'pro',
          stripe_customer_id: profileData.stripe_customer_id,
          stripe_subscription_id: profileData.stripe_subscription_id,
          subscription_current_period_end: profileData.subscription_current_period_end,
          updated_at: profileData.updated_at
        })
        .eq('email', userEmail)
        .select()
        .single();

      result = { data, error };
    } else {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      result = { data, error };
    }

    if (result.error) {
      console.error('❌ Error saving profile:', result.error);
      return NextResponse.json(
        { error: 'Error guardando perfil', details: result.error },
        { status: 500 }
      );
    }

    
    return NextResponse.json({
      success: true,
      message: 'Usuario PRO creado exitosamente',
      profile: result.data
    });
    
  } catch (error) {
    console.error('💥 Error general:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error },
      { status: 500 }
    );
  }
}
