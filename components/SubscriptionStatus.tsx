'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Zap, CreditCard, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { showToast } from '@/utils/toast';

interface SubscriptionStatusProps {
    userEmail?: string;
}

export default function SubscriptionStatus({ userEmail }: SubscriptionStatusProps) {
    
    const [status, setStatus] = useState({
        is_subscribed: false,
        trial_end: null as string | null,
        subscription_end: null as string | null,
        plan_type: 'free' as string
    });
    const [loading, setLoading] = useState(true);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
    const supabase = createClientComponentClient();

    useEffect(() => {
        let unsubAuth: (() => void) | undefined;
        const channel: ReturnType<typeof supabase.channel> | null = null;

        async function fetchProfile(userId: string, email: string) {
            
            try {
                // Usar el nuevo endpoint que maneja la autenticación correctamente
                const response = await fetch('/api/user/profile', {
                    method: 'GET',
                    credentials: 'include', // Incluir cookies de sesión
                });

                const result = await response.json();

                if (!response.ok) {
                    console.error('❌ Error from profile API:', result);
                    // Fallback a datos por defecto
                    setStatus({
                        is_subscribed: false,
                        trial_end: null,
                        subscription_end: null,
                        plan_type: 'free'
                    });
                    return;
                }

                if (result.success && result.profile) {
                    const profile = result.profile;
                    const plan = (profile.subscription_plan || '').toLowerCase();
                        plan, 
                        status: profile.subscription_status,
                        email: profile.email,
                        stripe_id: profile.stripe_subscription_id,
                        trial_ends_at: profile.trial_ends_at,
                        trial_started_at: profile.trial_started_at
                    });
                    
                    setStatus({
                        is_subscribed: profile.subscription_status === 'active',
                        trial_end: profile.trial_ends_at,
                        subscription_end: profile.subscription_current_period_end,
                        plan_type: plan
                    });
                } else {
                    console.warn('⚠️ No profile data in response');
                    setStatus({
                        is_subscribed: false,
                        trial_end: null,
                        subscription_end: null,
                        plan_type: 'free'
                    });
                }
            } catch (error) {
                console.error('💥 Error fetching profile:', error);
                // Fallback a datos por defecto
                setStatus({
                    is_subscribed: false,
                    trial_end: null,
                    subscription_end: null,
                    plan_type: 'free'
                });
            }
        }

        async function init() {
            try {
                setLoading(true);
                
                // Si tenemos userEmail, consultamos directamente el perfil por email
                if (userEmail) {
                    setCurrentUserEmail(userEmail);
                    await fetchProfileByEmail(userEmail);
                    return;
                }
                
                // Fallback: intentar obtener usuario autenticado
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Auth timeout')), 5000)
                );
                
                const authPromise = supabase.auth.getUser();
                const result = await Promise.race([authPromise, timeoutPromise]);
                const { data: { user }, error: authError } = result as any;
                
                    hasUser: !!user, 
                    email: user?.email, 
                    error: authError?.message || 'none' 
                });
                
                if (!user || authError) {
                    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
                        if (session?.user) {
                            setCurrentUserEmail(session.user.email || '');
                            fetchProfile(session.user.id, session.user.email || '');
                        }
                    });
                    unsubAuth = () => listener.subscription.unsubscribe();
                    return;
                }

                // Establecer el email del usuario
                const email = user.email || '';
                setCurrentUserEmail(email);
                
                await fetchProfile(user.id, email);

            } catch (error) {
                console.error('💥 SubscriptionStatus Error in init:', error);
                // Si hay error, usar valores por defecto
                setStatus({
                    is_subscribed: false,
                    trial_end: null,
                    subscription_end: null,
                    plan_type: 'free'
                });
            } finally {
                setLoading(false);
            }
        }

        // Nueva función para consultar perfil por email directamente
        async function fetchProfileByEmail(email: string) {
            
            try {
                const response = await fetch(`/api/user/profile?email=${encodeURIComponent(email)}`, {
                    method: 'GET',
                    credentials: 'include',
                });

                const result = await response.json();

                if (!response.ok) {
                    console.error('❌ Error from profile API:', result);
                    setStatus({
                        is_subscribed: false,
                        trial_end: null,
                        subscription_end: null,
                        plan_type: 'free'
                    });
                    return;
                }

                if (result.success && result.profile) {
                    const profile = result.profile;
                    const plan = (profile.subscription_plan || '').toLowerCase();
                        plan, 
                        status: profile.subscription_status,
                        email: profile.email,
                        stripe_id: profile.stripe_subscription_id,
                        trial_ends_at: profile.trial_ends_at,
                        trial_started_at: profile.trial_started_at
                    });
                    
                    setStatus({
                        is_subscribed: profile.subscription_status === 'active',
                        trial_end: profile.trial_ends_at,
                        subscription_end: profile.subscription_current_period_end,
                        plan_type: plan
                    });
                } else {
                    console.warn('⚠️ No profile data in response (by email)');
                    setStatus({
                        is_subscribed: false,
                        trial_end: null,
                        subscription_end: null,
                        plan_type: 'free'
                    });
                }
            } catch (error) {
                console.error('💥 Error fetching profile by email:', error);
                setStatus({
                    is_subscribed: false,
                    trial_end: null,
                    subscription_end: null,
                    plan_type: 'free'
                });
            }
        }

        init();
        return () => {
            if (unsubAuth) unsubAuth();
            if (channel) {
                try { (channel as any).unsubscribe(); } catch {}
            }
        };
    }, [userEmail]); // Agregar userEmail como dependencia para que se re-ejecute cuando cambie

    // Verificación automática periódica para detectar pagos
    useEffect(() => {
        if (loading || status.plan_type === 'pro') return; // No verificar si ya es PRO o está cargando

        
        // Verificar inmediatamente al cargar
        const timer = setTimeout(() => {
            checkForActiveSubscription();
        }, 1000); // Reducido a 1 segundo para más rapidez

        // Verificar cada 15 segundos para ser más agresivo
        const interval = setInterval(() => {
            if (status.plan_type !== 'pro') { // Solo verificar si no es PRO
                checkForActiveSubscription();
            }
        }, 15000);

        return () => {
            clearTimeout(timer);
            clearInterval(interval);
        };
    }, [status.plan_type, loading]);

    if (loading) {
        return (
            <div className="p-3 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
            </div>
        );
    }

    const isSubscribed = status.is_subscribed;
    const isPro = isSubscribed || (status.plan_type || '').toLowerCase() === 'pro';
    
    // Calcular días restantes del trial (usando días naturales)
    const calculateDaysRemaining = () => {
        if (!status.trial_end) return 0;
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Resetear a medianoche del día actual
        const endDate = new Date(status.trial_end);
        endDate.setHours(0, 0, 0, 0); // Resetear a medianoche del día final
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
    };
    
    const daysRemaining = calculateDaysRemaining();
    const isTrialActive = !isPro && status.trial_end && new Date(status.trial_end) > new Date();
    
        isPro,
        isTrialActive,
        daysRemaining,
        trial_end: status.trial_end,
        plan_type: status.plan_type,
        is_subscribed: status.is_subscribed
    });

    const handleSubscribe = async () => {
        try {
            
            const response = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: 'price_1RyeBiHFKglWYpZiSeo70KYD', // ID real de tu producto en Stripe
                    successUrl: `${window.location.origin}/dashboard?success=true`,
                    cancelUrl: `${window.location.origin}/dashboard?canceled=true`,
                }),
            });


            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Error HTTP: ${response.status}`);
            }

            if (data.sessionId) {
                
                // Usar el sistema de redirección de Stripe
                const { getStripe } = await import('@/lib/stripe-client');
                const stripe = await getStripe();
                
                if (stripe) {
                    const { error } = await stripe.redirectToCheckout({
                        sessionId: data.sessionId
                    });
                    
                    if (error) {
                        throw new Error('Error redirigiendo a Stripe: ' + error.message);
                    }
                } else {
                    throw new Error('Stripe no está configurado correctamente');
                }
            } else {
                console.error('Respuesta sin sessionId:', data);
                throw new Error('No se pudo obtener la sesión de pago');
            }
        } catch (error: any) {
            console.error('Error al iniciar suscripción:', error);
            toast.error('Error al iniciar la suscripción: ' + error.message);
        }
    };

    // Función para verificar automáticamente si el usuario pagó
    const checkForActiveSubscription = async () => {
        try {

            const response = await fetch('/api/stripe/sync-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    userEmail: currentUserEmail 
                }),
            });

            if (!response.ok) {
                return; // Silencioso si hay error
            }

            const data = await response.json();

            if (data.success && data.hasActiveSubscription) {
                
                // Actualizar estado local
                setStatus(prevStatus => ({
                    ...prevStatus,
                    is_subscribed: true,
                    plan_type: 'pro',
                    subscription_end: data.subscription.current_period_end
                }));
                
                // Mostrar notificación de éxito
                toast.success('¡Suscripción PRO detectada automáticamente! 🎉');
            }
        } catch (error) {
            // Silencioso, no molestar al usuario
        }
    };

    const handleCancelSubscription = async () => {
        const confirmed = await showToast.confirm('¿Estás seguro de que quieres cancelar tu suscripción?');
        if (!confirmed) {
            return;
        }

        try {
            
            // Actualizar estado local
            const newStatus = {
                is_subscribed: false,
                plan_type: 'free',
                trial_end: null,
                subscription_end: null
            };
            
            setStatus(prev => ({
                ...prev,
                ...newStatus
            }));

            // Guardar en localStorage
            localStorage.setItem('subscription_status', JSON.stringify({
                ...newStatus,
                cancelled_at: new Date().toISOString()
            }));

            toast.success('Suscripción cancelada correctamente');

            // Opcional: también intentar cancelar en el servidor si está disponible
            try {
                const response = await fetch('/api/stripe/cancel-subscription', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                } else {
                }
            } catch (serverError) {
            }

        } catch (error: any) {
            console.error('Error al cancelar suscripción:', error);
            toast.error('Error al cancelar la suscripción: ' + error.message);
        }
    };

    return (
        <div className="px-3 py-2 bg-gradient-to-br from-indigo-50/50 via-violet-50/50 to-purple-50/50 dark:from-indigo-950/50 dark:via-violet-950/50 dark:to-purple-950/50 rounded-lg border border-indigo-100/50 dark:border-indigo-800/30 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                        {isTrialActive ? 'Periodo de Prueba' : 
                         isPro ? 'Plan Profesional' : 
                         'Plan Gratuito'}
                    </span>
                </div>
            </div>
            
            {isTrialActive && (
                <>
                    <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-200 dark:border-blue-700">
                        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 text-center">
                            {daysRemaining} {daysRemaining === 1 ? 'día restante' : 'días restantes'}
                        </p>
                        <p className="text-[10px] text-blue-700 dark:text-blue-300 text-center mt-0.5">
                            Finaliza el {status.trial_end ? new Date(status.trial_end).toLocaleDateString('es-ES', { 
                                day: 'numeric', 
                                month: 'long' 
                            }) : 'N/A'}
                        </p>
                    </div>
                    <Button 
                        onClick={handleSubscribe}
                        className="w-full text-[11px] h-7 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
                    >
                        <CreditCard className="w-3 h-3 mr-1" />
                        Activar Plan Pro
                    </Button>
                </>
            )}
            
            {!isTrialActive && !isPro && (
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
                        {status.subscription_end ? 
                            `Suscripción activa hasta ${new Date(status.subscription_end).toLocaleDateString()}` :
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
