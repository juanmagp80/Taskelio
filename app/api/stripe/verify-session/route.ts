import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/src/lib/supabase-admin';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('session_id');

        if (!sessionId) {
            return NextResponse.json({
                success: false,
                error: 'Session ID requerido'
            }, { status: 400 });
        }


        // Importar Stripe
        const { stripe } = await import('@/lib/stripe');

        // Obtener la sesión de checkout
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        id: session.id,
            status: session.payment_status,
                customer: session.customer,
                    subscription: session.subscription
    });

    if (session.payment_status !== 'paid') {
        return NextResponse.json({
            success: false,
            error: 'Pago no completado'
        });
    }

    // Verificar que sea para suscripción
    if (!session.subscription) {
        return NextResponse.json({
            success: false,
            error: 'No es una suscripción'
        });
    }

    // Obtener la suscripción completa
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

    id: subscription.id,
        status: subscription.status,
            customer: subscription.customer
});

// Obtener el usuario usando client_reference_id de la sesión
const userId = session.client_reference_id;

if (!userId) {
    return NextResponse.json({
        success: false,
        error: 'No se pudo identificar al usuario'
    });
}


// Usar admin client para actualizar
const supabaseAdmin = createSupabaseAdmin();

// Actualizar perfil del usuario
const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
        subscription_status: 'active',
        subscription_plan: 'pro',
        stripe_customer_id: session.customer,
        stripe_subscription_id: subscription.id,
        subscription_current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

if (profileError) {
    console.error('❌ Error actualizando perfil:', profileError);
    return NextResponse.json({
        success: false,
        error: 'Error actualizando perfil'
    }, { status: 500 });
}

// Actualizar tabla de suscripciones
const { error: subError } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
        user_id: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        price_id: subscription.items.data[0].price.id,
        current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
        current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
    });

if (subError) {
    console.error('❌ Error actualizando suscripciones:', subError);
}


return NextResponse.json({
    success: true,
    subscription: {
        id: subscription.id,
        status: subscription.status,
        plan: 'pro'
    }
});

    } catch (error: any) {
    console.error('💥 Error verificando sesión:', error);
    return NextResponse.json({
        success: false,
        error: 'Error interno del servidor'
    }, { status: 500 });
}
}