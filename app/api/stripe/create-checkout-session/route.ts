import { createCheckoutSession } from '@/lib/stripe-server';
import { createServerSupabaseClient } from '@/src/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { priceId, successUrl, cancelUrl } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Obtener el usuario autenticado desde Supabase
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticación del usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    const userId = user.id;
    const userEmail = user.email;

    // Crear sesión de checkout en Stripe
    const session = await createCheckoutSession(
      priceId,
      successUrl,
      cancelUrl,
      userId,
      userEmail
    );


    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    console.error('Error in create-checkout-session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
