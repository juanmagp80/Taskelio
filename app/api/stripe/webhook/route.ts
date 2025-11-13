import { stripe } from '@/lib/stripe';
import { createSupabaseAdmin } from '@/src/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    console.log('🔔 Webhook received');

    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
        console.error('❌ No signature provided');
        return NextResponse.json(
            { error: 'No signature provided' },
            { status: 400 }
        );
    }

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
        console.log('✅ Webhook signature verified. Event type:', event.type);
    } catch (error) {
        console.error('❌ Webhook signature verification failed:', error);
        return NextResponse.json(
            { error: 'Webhook signature verification failed' },
            { status: 400 }
        );
    }

    // Usar cliente admin en endpoints de webhook para poder actualizar perfiles y suscripciones
    const supabase = createSupabaseAdmin();

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                console.log('📦 Checkout session completed:', {
                    sessionId: session.id,
                    customer: session.customer,
                    mode: session.mode,
                    client_reference_id: session.client_reference_id
                });

                if (session.mode === 'subscription') {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription);
                    console.log('💳 Subscription retrieved:', {
                        id: subscription.id,
                        status: subscription.status
                    });

                    const userId = session.client_reference_id;

                if (userId) {
                    console.log('👤 Processing subscription for user:', userId);
                    
                    const { error: subError } = await supabase
                        .from('subscriptions')
                        .upsert({
                            user_id: userId,
                            stripe_customer_id: session.customer,
                            stripe_subscription_id: subscription.id,
                            status: subscription.status,
                            price_id: subscription.items.data[0].price.id,
                            current_period_start: (subscription as any).current_period_start ? new Date((subscription as any).current_period_start * 1000).toISOString() : null,
                            current_period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
                            cancel_at_period_end: subscription.cancel_at_period_end || false,
                        });

                    if (subError) {
                        console.error('❌ Error upserting subscription:', subError);
                    } else {
                        console.log('✅ Subscription upserted successfully');
                    }

                    // Además, actualizar el perfil del usuario para reflejar el nuevo estado PRO
                    try {
                        const { error: profileError } = await supabase
                            .from('profiles')
                            .update({
                                subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
                                subscription_plan: 'pro',
                                stripe_subscription_id: subscription.id,
                                stripe_customer_id: session.customer,
                                subscription_current_period_end: (subscription as any).current_period_end ? new Date((subscription as any).current_period_end * 1000).toISOString() : null,
                            })
                            .eq('id', userId);

                        if (profileError) {
                            console.error('❌ Error updating profile:', profileError);
                        } else {
                            console.log('✅ Profile updated successfully to PRO');
                        }
                    } catch (profileErr) {
                        console.error('💥 Exception updating profile:', profileErr);
                    }
                } else {
                    console.error('❌ No client_reference_id found in session. Cannot update user.');
                    console.error('Session data:', JSON.stringify(session, null, 2));
                }
        } else {
            console.log('ℹ️ Session mode is not subscription:', session.mode);
        }
        break;
    }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;

        await supabase
            .from('subscriptions')
            .update({
                status: subscription.status,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: subscription.cancel_at_period_end,
            })
            .eq('stripe_subscription_id', subscription.id);

        // También reflejar cambios en el perfil (si existe)
        try {
            await supabase
                .from('profiles')
                .update({
                    subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
                    subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancel_at_period_end: subscription.cancel_at_period_end || false
                })
                .eq('stripe_subscription_id', subscription.id);
        } catch (profileErr) {
            console.warn('No se pudo actualizar el perfil tras subscription.updated/deleted:', profileErr);
        }
        break;
    }

            case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any;

        if (invoice.subscription) {
            await supabase
                .from('subscriptions')
                .update({
                    status: 'active',
                })
                .eq('stripe_subscription_id', invoice.subscription);

            // Marcar perfil como activo si encontramos la suscripción
            try {
                await supabase
                    .from('profiles')
                    .update({ subscription_status: 'active', subscription_plan: 'pro' })
                    .eq('stripe_subscription_id', invoice.subscription);
            } catch (profileErr) {
                console.warn('No se pudo actualizar el perfil tras invoice.payment_succeeded:', profileErr);
            }
        }
        break;
    }

            case 'invoice.payment_failed': {
        const invoice = event.data.object as any;

        if (invoice.subscription) {
            await supabase
                .from('subscriptions')
                .update({
                    status: 'past_due',
                })
                .eq('stripe_subscription_id', invoice.subscription);
        }
        break;
    }
}

return NextResponse.json({ received: true });
    } catch (error) {
    console.error('💥 Error processing webhook:', error);
    return NextResponse.json(
        { error: 'Error processing webhook' },
        { status: 500 }
    );
}
}