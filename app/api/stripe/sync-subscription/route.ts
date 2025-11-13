import { createSupabaseAdmin } from '@/src/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {

    const { userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email de usuario requerido' },
        { status: 400 }
      );
    }


    // Buscar cliente en Stripe
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No Stripe customer found',
        hasActiveSubscription: false,
      });
    }

    const customer = customers.data[0];

    // Buscar suscripciones activas
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 10,
    });

    const activeSubscription = subscriptions.data.find(sub => {
      const subWithPeriod = sub as Stripe.Subscription & {
        current_period_end: number;
      };
      return sub.status === 'active' &&
        new Date(subWithPeriod.current_period_end * 1000) > new Date();
    });

    if (activeSubscription) {

      // Usar cliente admin para actualizar
      const supabaseAdmin = createSupabaseAdmin();

      // Buscar usuario por email
      const { data: profiles, error: findError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', userEmail)
        .single();

      if (findError) {
        console.error('❌ Error finding user profile:', findError);
        return NextResponse.json({
          success: false,
          error: 'Usuario no encontrado',
        }, { status: 404 });
      }

      // Actualizar perfil del usuario
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          subscription_status: 'active',
          subscription_plan: 'pro',
          stripe_customer_id: customer.id,
          stripe_subscription_id: activeSubscription.id,
          subscription_current_period_end: new Date((activeSubscription as any).current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profiles.id);

      if (profileError) {
        console.error('❌ Error updating profile:', profileError);
        return NextResponse.json({
          success: false,
          error: 'Error actualizando perfil',
          details: profileError
        }, { status: 500 });
      } else {
      }

      return NextResponse.json({
        success: true,
        message: 'Suscripción sincronizada exitosamente - ¡Ahora eres PRO!',
        hasActiveSubscription: true,
        subscription: {
          id: activeSubscription.id,
          status: activeSubscription.status,
          plan: 'pro',
          current_period_end: (activeSubscription as any).current_period_end,
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'No se encontró suscripción activa',
        hasActiveSubscription: false,
      });
    }

  } catch (error: any) {
    console.error('Error syncing subscription:', error);
    return NextResponse.json(
      {
        error: 'Error syncing subscription',
        message: error.message
      },
      { status: 500 }
    );
  }
}
