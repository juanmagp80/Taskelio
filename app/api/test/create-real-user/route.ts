import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/src/lib/supabase-server';

export async function POST(request: NextRequest) {
    try {

        const supabase = await createServerSupabaseClient();
        
        // Obtener datos del body o usar valores por defecto
        const body = await request.json().catch(() => ({}));
        const userEmail = body.userEmail || 'amazonjgp80@gmail.com';
        const userId = body.userId || crypto.randomUUID();


        const profileData = {
            id: userId,
            email: userEmail,
            subscription_status: 'active',
            subscription_plan: 'pro',
            stripe_customer_id: `cus_real_${userId.substring(0, 8)}`,
            stripe_subscription_id: `sub_real_${userId.substring(0, 8)}`,
            subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            trial_started_at: new Date().toISOString(),
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

            // Primero verificar si ya existe el usuario
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (existingUser) {
      const { data, error } = await supabase
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

      if (error) {
        console.error('❌ Error updating profile:', error);
        return NextResponse.json(
          { error: 'Error actualizando perfil', details: error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Usuario PRO actualizado exitosamente',
        profile: data
      });
    }

    // Si no existe, crear nuevo usuario
    const { data, error } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

        if (error) {
            console.error('❌ Error saving profile:', error);
            return NextResponse.json(
                { error: 'Error guardando perfil', details: error },
                { status: 500 }
            );
        }

        
        return NextResponse.json({
            success: true,
            message: 'Usuario de prueba con suscripción PRO creado exitosamente',
            profile: data
        });
        
    } catch (error) {
        console.error('💥 Error general:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error },
            { status: 500 }
        );
    }
}
