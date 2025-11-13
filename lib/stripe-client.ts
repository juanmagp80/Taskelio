import { loadStripe } from '@stripe/stripe-js';

// Verificación más suave para las claves de Stripe
const stripePublicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublicKey || stripePublicKey === 'pk_test_EJEMPLO_TEMPORAL') {
  console.warn('⚠️ Stripe no configurado correctamente. Configura tus claves reales en .env.local');
}

export const getStripe = () => {
  if (!stripePublicKey || stripePublicKey === 'pk_test_EJEMPLO_TEMPORAL') {
    console.error('❌ Stripe no está configurado. Ve a .env.local y agrega tus claves reales.');
    return null;
  }
  return loadStripe(stripePublicKey);
};

export const redirectToCheckout = async (sessionId: string) => {
  const stripe = await getStripe();
  
  if (!stripe) {
    throw new Error('Failed to load Stripe');
  }

  const { error } = await stripe.redirectToCheckout({ sessionId });
  
  if (error) {
    console.error('Error redirecting to checkout:', error);
    throw error;
  }
};

// Función utilitaria para crear una sesión de checkout y redirigir
export const createCheckoutAndRedirect = async (
  priceId: string,
  successUrl?: string,
  cancelUrl?: string
) => {
  try {
    // Verificar si Stripe está configurado
    if (!stripePublicKey || stripePublicKey === 'pk_test_EJEMPLO_TEMPORAL') {
      const { showToast } = await import('@/utils/toast');
      showToast.warning(
        '⚠️ Stripe no está configurado correctamente',
        'Para configurarlo:\n1. Ve a https://dashboard.stripe.com/\n2. Obtén tus claves API\n3. Actualiza .env.local con tus claves reales\n4. Reinicia el servidor'
      );
      return;
    }

    // Verificar si el usuario está autenticado
    const supabase = await import('@/src/lib/supabase-client').then(m => m.createSupabaseClient());
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const response = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        // URL de éxito que incluirá el session_id automáticamente por Stripe
        successUrl: successUrl || `${window.location.origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: cancelUrl || `${window.location.origin}/dashboard?canceled=true`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create checkout session');
    }

    const { sessionId } = await response.json();
    await redirectToCheckout(sessionId);
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};
