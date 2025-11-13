import Stripe from 'stripe';

// Verificación más suave para las claves de Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

// Objeto mock para desarrollo cuando no hay clave configurada
const stripeMock = {
  prices: { create: async () => ({ id: 'price_mock' }) },
  products: { create: async () => ({ id: 'prod_mock' }) },
  checkout: { sessions: { create: async () => ({ url: '#' }) } }
} as unknown as Stripe;

if (!stripeSecretKey) {
  console.warn('⚠️ Stripe servidor no configurado. Por favor configura STRIPE_SECRET_KEY en .env.local');
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
    apiVersion: '2025-08-27.basil',
  })
  : stripeMock;

export const createCheckoutSession = async (
  priceId: string,
  successUrl: string,
  cancelUrl: string,
  userId?: string,
  customerEmail?: string
) => {
  if (!stripe) {
    throw new Error('Stripe no está configurado correctamente. Verifica tu STRIPE_SECRET_KEY en .env.local');
  }

  try {
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      client_reference_id: userId,
      subscription_data: {
        metadata: {
          userId: userId || '',
        },
      },
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return session;
  } catch (error) {
    console.error('❌ Error creating Stripe checkout session:', error);
    throw error;
  }
};

export const createPortalSession = async (customerId: string, returnUrl: string) => {
  if (!stripe) {
    throw new Error('Stripe no está configurado correctamente. Verifica tu STRIPE_SECRET_KEY en .env.local');
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session;
  } catch (error) {
    console.error('Error creating Stripe portal session:', error);
    throw error;
  }
};
