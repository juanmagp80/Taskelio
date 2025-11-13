import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/src/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail, subscriptionId = 'sub_test_simulation', customerId = 'cus_test_simulation' } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'userEmail is required' },
        { status: 400 }
      );
    }


    const supabase = createSupabaseAdmin();

    // Simular el mismo comportamiento que tendría el webhook real
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_plan: 'pro',
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        subscription_current_period_start: new Date().toISOString(),
        subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 días
        updated_at: new Date().toISOString(),
      })
      .eq('email', userEmail);

    if (error) {
      console.error('❌ Error simulando pago:', error);
      return NextResponse.json(
        { error: 'Error updating profile', details: error },
        { status: 500 }
      );
    }


    return NextResponse.json({
      success: true,
      message: 'Payment simulation completed',
      userEmail,
      subscriptionId,
      customerId
    });

  } catch (error) {
    console.error('Error en simulación de pago:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
