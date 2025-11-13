'use client';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { useTrialStatus } from '@/src/lib/useTrialStatus';
import { showToast } from '@/utils/toast';
import {
    Check,
    CreditCard,
    Crown,
    Shield,
    Sparkles,
    TrendingUp,
    Users,
    X,
    Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface BillingPageClientProps {
    userEmail: string;
}

export default function BillingPageClient({ userEmail }: BillingPageClientProps) {
    const router = useRouter();
    const supabase = createSupabaseClient();
    const { trialInfo, loading: trialLoading } = useTrialStatus(userEmail);
    const [processing, setProcessing] = useState(false);
    const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('monthly');

    const handleLogout = async () => {
        try {
            if (!supabase) return;
            await supabase.auth.signOut();
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleUpgrade = async (interval: 'monthly' | 'yearly') => {
        setProcessing(true);
        try {
            // Usar el priceId correcto según el intervalo seleccionado
            const priceId = interval === 'monthly' 
                ? 'price_1RyeBiHFKglWYpZiSeo70KYD'  // Mensual €10
                : 'price_1SSfEoHFKglWYpZiGFAItEpk'; // Anual €100

            const response = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId: priceId,
                    successUrl: `${window.location.origin}/dashboard/billing?success=true`,
                    cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`,
                }),
            });

            const data = await response.json();

            if (data.sessionId) {
                const { getStripe } = await import('@/lib/stripe-client');
                const stripe = await getStripe();

                if (stripe) {
                    const { error } = await stripe.redirectToCheckout({
                        sessionId: data.sessionId
                    });

                    if (error) {
                        throw new Error('Error redirigiendo a Stripe: ' + error.message);
                    }
                }
            }
        } catch (error: any) {
            console.error('Error al iniciar checkout:', error);
            showToast.error('Error al procesar el pago. Inténtalo de nuevo.');
        } finally {
            setProcessing(false);
        }
    };

    const isPro = trialInfo?.plan === 'pro' && trialInfo?.status === 'active';
    const isOnTrial = trialInfo?.status === 'trial' && !trialInfo?.isExpired;

    const features = {
        trial: [
            { name: 'ACCESO COMPLETO A PLAN PRO', included: true, highlight: true },
            { name: 'Clientes ilimitados', included: true },
            { name: 'Proyectos ilimitados', included: true },
            { name: 'Portal del cliente', included: true },
            { name: 'Contratos digitales', included: true },
            { name: 'Automatizaciones IA', included: true },
            { name: 'Reportes avanzados', included: true },
            { name: 'Seguimiento de tiempo', included: true },
            { name: 'Comunicación con clientes', included: true },
            { name: 'Dashboard completo', included: true },
            { name: 'Facturación avanzada', included: true },
            { name: 'Todas las funciones Pro', included: true },
        ],
        free: [
            { name: 'Hasta 3 clientes', included: true },
            { name: 'Hasta 5 proyectos', included: true },
            { name: 'Gestión básica de tareas', included: true },
            { name: 'Dashboard simple', included: true },
            { name: 'Facturación básica', included: true },
            { name: 'Calendario básico', included: true },
            { name: 'Clientes ilimitados', included: false },
            { name: 'Proyectos ilimitados', included: false },
            { name: 'Portal del cliente', included: false },
            { name: 'Contratos digitales', included: false },
            { name: 'Automatizaciones IA', included: false },
            { name: 'Reportes avanzados', included: false },
            { name: 'Seguimiento de tiempo', included: false },
            { name: 'Comunicación con clientes', included: false },
            { name: 'Soporte prioritario', included: false },
        ],
        pro: [
            { name: 'Clientes ilimitados', included: true, highlight: true },
            { name: 'Proyectos ilimitados', included: true, highlight: true },
            { name: 'Portal del cliente personalizado', included: true, highlight: true },
            { name: 'Contratos digitales con firma', included: true, highlight: true },
            { name: 'Automatizaciones con IA', included: true, highlight: true },
            { name: 'Reportes y análisis avanzados', included: true, highlight: true },
            { name: 'Seguimiento de tiempo detallado', included: true },
            { name: 'Comunicación integrada', included: true },
            { name: 'Dashboard completo', included: true },
            { name: 'Facturación avanzada', included: true },
            { name: 'Calendario avanzado', included: true },
            { name: 'Gestión de presupuestos', included: true },
            { name: '10GB de almacenamiento', included: true },
            { name: 'Exportación de reportes PDF/CSV', included: true },
            { name: 'Soporte prioritario 24/7', included: true },
        ]
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header con menú de usuario */}
                <Header userEmail={userEmail} onLogout={handleLogout} />

                <div className="flex-1 overflow-auto">
                <div className="p-8 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                    <CreditCard className="h-8 w-8 text-indigo-600" />
                                    Facturación y Planes
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400 mt-2">
                                    Gestiona tu suscripción y facturación
                                </p>
                            </div>

                            {isPro && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-lg shadow-lg">
                                    <Crown className="h-5 w-5 text-yellow-300" />
                                    <span className="font-semibold">Plan Pro Activo</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Trial Status Banner */}
                    {isOnTrial && (
                        <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                            <CardContent className="pt-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                                            <Sparkles className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                                Periodo de Prueba Activo
                                            </h3>
                                            <p className="text-blue-700 dark:text-blue-300 text-sm">
                                                Te quedan <span className="font-bold">{trialInfo?.daysRemaining} días</span> de prueba gratuita con todas las funciones Pro.
                                            </p>
                                            <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                                                Finaliza el {trialInfo?.trialEndsAt ? new Date(trialInfo.trialEndsAt).toLocaleDateString('es-ES', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                }) : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => handleUpgrade(selectedInterval)}
                                        disabled={processing}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        {processing ? 'Procesando...' : 'Actualizar a Pro'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Pricing Cards */}
                    <div className="grid md:grid-cols-2 gap-8 mb-12">
                        {/* Trial/Free Plan */}
                        <Card className={`border-2 ${isOnTrial ? 'border-blue-500 shadow-lg' : 'border-slate-200 dark:border-slate-700'}`}>
                            <CardHeader className={isOnTrial ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20' : ''}>
                                <div className="flex items-center justify-between mb-4">
                                    {isOnTrial ? (
                                        <Sparkles className="h-8 w-8 text-blue-600" />
                                    ) : (
                                        <Users className="h-8 w-8 text-slate-400" />
                                    )}
                                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                                        isOnTrial 
                                            ? 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40'
                                            : 'text-slate-500 bg-slate-100'
                                    }`}>
                                        {isOnTrial ? 'TRIAL ACTIVO' : 'GRATUITO'}
                                    </span>
                                </div>
                                <CardTitle className="text-2xl">
                                    {isOnTrial ? 'Trial de 14 Días' : 'Plan Gratuito'}
                                </CardTitle>
                                <CardDescription>
                                    {isOnTrial 
                                        ? 'Acceso completo a todas las funciones Pro'
                                        : 'Perfecto para empezar y probar la plataforma'
                                    }
                                </CardDescription>
                                <div className="mt-4">
                                    <span className="text-4xl font-bold text-slate-900 dark:text-white">€0</span>
                                    <span className="text-slate-600 dark:text-slate-400">/mes</span>
                                    {isOnTrial && (
                                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 font-semibold">
                                            {trialInfo?.daysRemaining} días restantes
                                        </p>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {(isOnTrial ? features.trial : features.free).map((feature, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            {feature.included ? (
                                                <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                                                    (feature as any).highlight ? 'text-blue-600' : 'text-green-500'
                                                }`} />
                                            ) : (
                                                <X className="h-5 w-5 text-slate-300 flex-shrink-0 mt-0.5" />
                                            )}
                                            <span className={
                                                feature.included 
                                                    ? (feature as any).highlight 
                                                        ? 'font-semibold text-blue-900 dark:text-blue-300'
                                                        : 'text-slate-700 dark:text-slate-300'
                                                    : 'text-slate-400 dark:text-slate-600'
                                            }>
                                                {feature.name}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {!isOnTrial && (
                                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <p className="text-sm text-blue-800 dark:text-blue-200">
                                            <strong>🎁 Inicia tu trial:</strong> Prueba todas las funciones Pro gratis durante 14 días.
                                        </p>
                                    </div>
                                )}

                                {isOnTrial && (
                                    <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-1">
                                            ✨ Estás disfrutando de acceso completo
                                        </p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300">
                                            Después del trial, el plan gratuito tendrá limitaciones. Actualiza a Pro para mantener todo sin límites.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Pro Plan */}
                        <Card className="border-2 border-indigo-500 relative overflow-hidden shadow-xl">
                            <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-yellow-300 text-yellow-900 px-6 py-1 text-xs font-bold">
                                RECOMENDADO
                            </div>
                            <CardHeader className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                                <div className="flex items-center justify-between mb-4">
                                    <Crown className="h-8 w-8 text-yellow-300" />
                                    <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
                                        PROFESIONAL
                                    </span>
                                </div>
                                <CardTitle className="text-2xl text-white">Plan Pro</CardTitle>
                                <CardDescription className="text-indigo-100">
                                    Todo lo que necesitas para gestionar tu freelancing
                                </CardDescription>
                                
                                {/* Selector de intervalo */}
                                <div className="mt-4 flex gap-2 bg-white/10 rounded-lg p-1">
                                    <button
                                        onClick={() => setSelectedInterval('monthly')}
                                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                            selectedInterval === 'monthly'
                                                ? 'bg-white text-indigo-600 shadow-sm'
                                                : 'text-white/80 hover:text-white'
                                        }`}
                                    >
                                        Mensual
                                    </button>
                                    <button
                                        onClick={() => setSelectedInterval('yearly')}
                                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                            selectedInterval === 'yearly'
                                                ? 'bg-white text-indigo-600 shadow-sm'
                                                : 'text-white/80 hover:text-white'
                                        }`}
                                    >
                                        Anual
                                        <span className="ml-1 text-xs">(-17%)</span>
                                    </button>
                                </div>

                                <div className="mt-4">
                                    {selectedInterval === 'monthly' ? (
                                        <>
                                            <span className="text-4xl font-bold text-white">€10</span>
                                            <span className="text-indigo-100">/mes</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-4xl font-bold text-white">€100</span>
                                            <span className="text-indigo-100">/año</span>
                                            <p className="text-sm text-yellow-300 mt-1 font-semibold">
                                                ✨ Ahorra €20 al año
                                            </p>
                                        </>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <ul className="space-y-3 mb-6">
                                    {features.pro.map((feature, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${feature.highlight ? 'text-indigo-600' : 'text-green-500'}`} />
                                            <span className={`${feature.highlight ? 'font-semibold text-indigo-900 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {feature.name}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {!isPro && (
                                    <Button
                                        onClick={() => handleUpgrade(selectedInterval)}
                                        disabled={processing}
                                        className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold py-3"
                                        size="lg"
                                    >
                                        {processing ? (
                                            'Procesando...'
                                        ) : (
                                            <>
                                                <Zap className="h-5 w-5 mr-2" />
                                                {selectedInterval === 'monthly' ? 'Suscribirse Mensualmente' : 'Suscribirse Anualmente'}
                                            </>
                                        )}
                                    </Button>
                                )}

                                {isPro && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                        <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                                            <Check className="h-5 w-5" />
                                            <span className="font-semibold">Plan Pro Activo</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Benefits Section */}
                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                        <Card>
                            <CardHeader>
                                <Shield className="h-10 w-10 text-indigo-600 mb-3" />
                                <CardTitle className="text-lg">Pago Seguro</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Procesamiento de pagos seguro con Stripe. Tus datos están protegidos con encriptación de nivel bancario.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <TrendingUp className="h-10 w-10 text-green-600 mb-3" />
                                <CardTitle className="text-lg">Cancela Cuando Quieras</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Sin compromisos. Cancela tu suscripción en cualquier momento y mantén acceso hasta el final del período.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <Sparkles className="h-10 w-10 text-purple-600 mb-3" />
                                <CardTitle className="text-lg">Actualizaciones Incluidas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Acceso a todas las nuevas funciones y mejoras sin costo adicional. Siempre a la última.
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* FAQ */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Preguntas Frecuentes</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                                    ¿Qué incluye el trial de 14 días?
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    El trial incluye acceso completo a todas las funciones del Plan Pro durante 14 días. No se requiere tarjeta de crédito para empezar.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                                    ¿Puedo cambiar de plan después?
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Sí, puedes actualizar a Pro en cualquier momento o cancelar tu suscripción cuando lo desees. Los cambios se aplican inmediatamente.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                                    ¿Qué métodos de pago aceptan?
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Aceptamos todas las tarjetas de crédito y débito principales (Visa, Mastercard, American Express) a través de Stripe.
                                </p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                                    ¿Ofrecen descuentos para suscripciones anuales?
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Sí, el plan anual cuesta €100/año, lo que representa un ahorro de €20 comparado con pagar mensualmente.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            </div>
        </div>
    );
}
