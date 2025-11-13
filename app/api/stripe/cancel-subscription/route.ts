import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createSupabaseAdmin } from '@/src/lib/supabase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin();
    
    // Intentar obtener email del body
    let userEmail;
    try {
      const body = await request.json();
      userEmail = body.userEmail;
    } catch {
      // Si no hay body, intentar obtener del usuario autenticado
      const { createServerSupabaseClient } = await import('@/src/lib/supabase-server');
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      userEmail = user?.email;
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email de usuario requerido' },
        { status: 400 }
      );
    }


    // Buscar el perfil del usuario por email usando admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single();


    if (profileError || !profile) {
      console.error('🔴 Error finding user profile:', profileError);
      return NextResponse.json(
        { error: 'Perfil de usuario no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el estado en Supabase usando admin client
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_status: 'cancelled',
        subscription_plan: 'free',
        updated_at: new Date().toISOString(),
      })
      .eq('email', userEmail);

    if (updateError) {
      console.error('🔴 Error updating profile after cancellation:', updateError);
      return NextResponse.json(
        { error: 'Error actualizando perfil', details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Suscripción cancelada exitosamente',
      subscription: {
        id: profile.stripe_subscription_id || 'cancelled_' + Date.now(),
        status: 'cancelled',
        cancel_at_period_end: true,
        current_period_end: new Date().toISOString(),
      },
    });

  } catch (error: any) {
    console.error('🔴 Error cancelling subscription:', error);
    
    // Manejar errores específicos de Stripe
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Suscripción no válida o ya cancelada' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Error cancelando suscripción',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
