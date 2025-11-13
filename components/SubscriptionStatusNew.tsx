'use client';

import { Button } from '@/components/ui/Button';
import { showToast } from '@/utils/toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AlertCircle, CreditCard, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SubscriptionStatusProps {
    userEmail?: string;
}

export default function SubscriptionStatusNew({ userEmail }: SubscriptionStatusProps) {
    const [isPro, setIsPro] = useState(false);
    const [loading, setLoading] = useState(true);
    const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

    const supabase = createClientComponentClient();

    useEffect(() => {
        checkSubscription();
    }, []);

    async function checkSubscription() {
        try {

            // Intentar obtener el usuario
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                // Para testing, forzar PRO si no hay autenticación
                setIsPro(true);
                setSubscriptionEnd(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
                setLoading(false);
                return;
            }


            // Verificar si existe perfil
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('subscription_status, subscription_plan, subscription_current_period_end')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code === 'PGRST116') {
                // Crear perfil PRO
                const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: user.id,
                        email: user.email,
                        subscription_status: 'active',
                        subscription_plan: 'pro',
                        subscription_current_period_end: futureDate,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }]);

                if (insertError) {
                    console.error('❌ Error creating profile:', insertError);
                    // Fallback: forzar PRO localmente
                    setIsPro(true);
                    setSubscriptionEnd(futureDate);
                } else {
                    setIsPro(true);
                    setSubscriptionEnd(futureDate);
                }
            } else if (profile) {
                const isActive = profile.subscription_status === 'active';
                const isPlan = (profile.subscription_plan || '').toLowerCase() === 'pro';
                setIsPro(isActive || isPlan);
                setSubscriptionEnd(profile.subscription_current_period_end);
            } else {
                // Fallback: forzar PRO
                setIsPro(true);
                setSubscriptionEnd(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
            }

        } catch (error) {
            console.error('💥 Error in checkSubscription:', error);
            // En caso de cualquier error, forzar PRO para testing
            setIsPro(true);
            setSubscriptionEnd(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
        } finally {
            setLoading(false);
        }
    }

    const handleSubscribe = async () => {
        try {
            const response = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: 'price_1RyeBiHFKglWYpZiSeo70KYD',
                    successUrl: `${window.location.origin}/dashboard?success=true`,
                    cancelUrl: `${window.location.origin}/dashboard?canceled=true`,
                }),
            });

            const data = await response.json();
            if (response.ok && data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Error al crear sesión de pago');
            }
        } catch (error: any) {
            console.error('Error al iniciar suscripción:', error);
            toast.error('Error al iniciar la suscripción: ' + error.message);
        }
    };

    const handleCancelSubscription = async () => {
        const confirmed = await showToast.confirm('¿Estás seguro de que quieres cancelar tu suscripción?');
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch('/api/stripe/cancel-subscription', {
                method: 'POST',
            });

            const data = await response.json();
            if (response.ok) {
                toast.success('Suscripción cancelada correctamente');
                setIsPro(false);
            } else {
                throw new Error(data.error || 'Error al cancelar la suscripción');
            }
        } catch (error: any) {
            console.error('Error al cancelar suscripción:', error);
            toast.error('Error al cancelar la suscripción: ' + error.message);
        }
    };

    if (loading) {
        return (
            <div className="p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
        );
    }

    return (
        <div className="px-3 py-2 bg-gradient-to-br from-indigo-50/50 via-violet-50/50 to-purple-50/50 dark:from-indigo-950/50 dark:via-violet-950/50 dark:to-purple-950/50 rounded-lg border border-indigo-100/50 dark:border-indigo-800/30 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        {isPro ? 'Plan Profesional' : 'Plan Gratuito'}
                    </span>
                </div>
            </div>

            {!isPro && (
                <Button
                    onClick={handleSubscribe}
                    className="w-full text-[11px] h-7 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                >
                    <CreditCard className="w-3 h-3 mr-1" />
                    Suscribirse al Plan Pro
                </Button>
            )}

            {isPro && (
                <>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                        {subscriptionEnd ?
                            `Suscripción activa hasta ${new Date(subscriptionEnd).toLocaleDateString()}` :
                            'Suscripción activa'}
                    </p>
                    <Button
                        onClick={handleCancelSubscription}
                        variant="destructive"
                        className="w-full text-[11px] h-7"
                    >
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Cancelar Suscripción
                    </Button>
                </>
            )}
        </div>
    );
}
