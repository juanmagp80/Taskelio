'use client';

import Sidebar from '@/components/Sidebar';
import TrialBanner from '@/components/TrialBanner';
import { Button } from '@/components/ui/Button';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { useTrialStatus } from '@/src/lib/useTrialStatus';
import {
    Check,
    Clock,
    Crown,
    Mail,
    Shield,
    Users,
    Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { showToast } from '@/utils/toast';

interface UpgradePageClientProps {
    userEmail: string;
}

type PlanInterval = 'monthly' | 'yearly';

interface Plan {
    id: string;
    name: string;
    description: string;
    priceMonthly: number;
    priceYearly: number;
    features: string[];
    maxClients: number;
    maxProjects: number;
    maxStorageGB: number;
    isPopular?: boolean;
    icon: any;
    gradient: string;
}

export default function UpgradePageClient({ userEmail }: UpgradePageClientProps) {
    const { trialInfo, loading } = useTrialStatus(userEmail);
    const [selectedInterval, setSelectedInterval] = useState<PlanInterval>('monthly');
    const [processingPlan, setProcessingPlan] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createSupabaseClient();

    const handleLogout = async () => {
        try {
            if (!supabase) return;
            await supabase.auth.signOut();
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const plans: Plan[] = [
        {
            id: 'pro',
            name: 'Pro',
            description: 'Perfecto para freelancers profesionales',
            priceMonthly: 10.00,
            priceYearly: 100.00,
            features: [
                'Clientes ilimitados',
                'Proyectos ilimitados',
                '10GB almacenamiento',
                'Facturación automática',
                'Seguimiento de tiempo',
                'Reportes avanzados',
                'Gestión de tareas',
                'Portal de cliente',
                'Soporte prioritario'
            ],
            maxClients: -1,
            maxProjects: -1,
            maxStorageGB: 10,
            isPopular: false,
            icon: Crown,
            gradient: 'from-blue-600 to-indigo-600'
        }
    ];

    const handleSubscribe = async (planId: string) => {
        setProcessingPlan(planId);

        try {
            // Aquí iría la integración con Stripe

            // Simular proceso
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Por ahora, solo mostrar mensaje
            showToast.error(`¡Próximamente! Procesando suscripción a ${planId} (${selectedInterval})`);

        } catch (error) {
            console.error('Error procesando suscripción:', error);
            showToast.error('Error procesando la suscripción. Inténtalo de nuevo.');
        } finally {
            setProcessingPlan(null);
        }
    };

    const calculateYearlySavings = (monthlyPrice: number, yearlyPrice: number) => {
        const monthlyCost = monthlyPrice * 12;
        const savings = monthlyCost - yearlyPrice;
        const percentage = Math.round((savings / monthlyCost) * 100);
        return { savings, percentage };
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Cargando información del plan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            {/* Sidebar */}
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            {/* Main Content */}
            <div className="flex-1 ml-56 overflow-hidden">
                <div className="h-full overflow-y-auto">
                    {/* Trial Banner */}
                    <TrialBanner userEmail={userEmail} />

                    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-blue-50/90 to-indigo-100/80 backdrop-blur-3xl">
                        <div className="container mx-auto px-6 py-8">
                            {/* Header */}
                            <div className="text-center mb-12">
                                <div className="mb-6">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full text-blue-700 font-semibold text-sm mb-4">
                                        <Zap className="w-4 h-4" />
                                        Suscríbete al Plan Pro
                                    </div>
                                </div>
                                <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent mb-6">
                                    Continúa con el Plan Pro
                                </h1>
                                <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium">
                                    Desbloquea todo el potencial de tu CRM y lleva tu negocio freelance al siguiente nivel
                                </p>

                                {/* Estado actual del trial */}
                                {trialInfo && (
                                    <div className="mt-8 max-w-lg mx-auto">
                                        <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 shadow-xl p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                                        <Clock className="w-5 h-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900">Trial Actual</h3>
                                                        <p className="text-sm text-slate-600">
                                                            {trialInfo.daysRemaining} días restantes
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-bold text-slate-900">
                                                        {trialInfo.usage.clients}
                                                    </div>
                                                    <div className="text-sm text-slate-600">clientes</div>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                                                    style={{
                                                        width: `${Math.max(5, ((14 - trialInfo.daysRemaining) / 14) * 100)}%`
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Toggle mensual/anual */}
                            <div className="flex justify-center mb-12">
                                <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 shadow-xl p-2 flex items-center gap-1">
                                    <button
                                        onClick={() => setSelectedInterval('monthly')}
                                        className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${selectedInterval === 'monthly'
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                                : 'text-slate-700 hover:bg-white/60'
                                            }`}
                                    >
                                        Mensual
                                    </button>
                                    <button
                                        onClick={() => setSelectedInterval('yearly')}
                                        className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 relative ${selectedInterval === 'yearly'
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                                : 'text-slate-700 hover:bg-white/60'
                                            }`}
                                    >
                                        Anual
                                        <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                            -17%
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Planes */}
                            <div className="grid grid-cols-1 max-w-2xl mx-auto">
                                {plans.map((plan) => {
                                    const IconComponent = plan.icon;
                                    const price = selectedInterval === 'monthly' ? plan.priceMonthly : plan.priceYearly;
                                    const originalPrice = selectedInterval === 'yearly' ? plan.priceMonthly * 12 : null;
                                    const { savings, percentage } = selectedInterval === 'yearly'
                                        ? calculateYearlySavings(plan.priceMonthly, plan.priceYearly)
                                        : { savings: 0, percentage: 0 };

                                    return (
                                        <div
                                            key={plan.id}
                                            className={`relative bg-white/60 backdrop-blur-xl rounded-3xl border shadow-2xl p-8 hover:scale-105 transition-all duration-300 ${plan.isPopular
                                                    ? 'border-blue-200 shadow-blue-500/20 ring-2 ring-blue-500/20'
                                                    : 'border-white/60 shadow-slate-500/10'
                                                }`}
                                        >
                                            {/* Badge popular */}
                                            {plan.isPopular && (
                                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                                                        🔥 Más Popular
                                                    </div>
                                                </div>
                                            )}

                                            {/* Header del plan */}
                                            <div className="text-center mb-8">
                                                <div className={`w-16 h-16 bg-gradient-to-br ${plan.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl`}>
                                                    <IconComponent className="w-8 h-8 text-white" />
                                                </div>
                                                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                                                <p className="text-slate-600">{plan.description}</p>
                                            </div>

                                            {/* Precio */}
                                            <div className="text-center mb-8">
                                                <div className="flex items-baseline justify-center gap-2 mb-2">
                                                    <span className="text-5xl font-bold text-slate-900">
                                                        €{price}
                                                    </span>
                                                    <span className="text-slate-600">
                                                        /{selectedInterval === 'monthly' ? 'mes' : 'año'}
                                                    </span>
                                                </div>
                                                {selectedInterval === 'yearly' && originalPrice && (
                                                    <div className="flex items-center justify-center gap-2 text-sm">
                                                        <span className="line-through text-slate-400">
                                                            €{originalPrice}/año
                                                        </span>
                                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                                                            Ahorra €{savings}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Features */}
                                            <div className="space-y-4 mb-8">
                                                {plan.features.map((feature, index) => (
                                                    <div key={index} className="flex items-center gap-3">
                                                        <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <Check className="w-3 h-3 text-green-600" />
                                                        </div>
                                                        <span className="text-slate-700 font-medium">{feature}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* CTA */}
                                            <Button
                                                onClick={() => handleSubscribe(plan.id)}
                                                disabled={processingPlan === plan.id}
                                                className={`w-full py-4 text-lg font-semibold rounded-2xl transition-all duration-200 ${plan.isPopular
                                                        ? `bg-gradient-to-r ${plan.gradient} text-white shadow-2xl hover:shadow-blue-500/40 hover:scale-105`
                                                        : 'bg-white/80 text-slate-900 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                                    }`}
                                            >
                                                {processingPlan === plan.id ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                        Procesando...
                                                    </div>
                                                ) : (
                                                    `Elegir ${plan.name}`
                                                )}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Garantía y soporte */}
                            <div className="mt-16 text-center">
                                <div className="max-w-4xl mx-auto">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="flex flex-col items-center">
                                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
                                                <Shield className="w-6 h-6 text-white" />
                                            </div>
                                            <h4 className="font-bold text-slate-900 mb-2">Garantía 30 días</h4>
                                            <p className="text-slate-600 text-sm">
                                                Si no estás satisfecho, te devolvemos tu dinero
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                                                <Users className="w-6 h-6 text-white" />
                                            </div>
                                            <h4 className="font-bold text-slate-900 mb-2">Soporte experto</h4>
                                            <p className="text-slate-600 text-sm">
                                                Equipo dedicado para ayudarte a crecer
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                                                <Mail className="w-6 h-6 text-white" />
                                            </div>
                                            <h4 className="font-bold text-slate-900 mb-2">Migración gratuita</h4>
                                            <p className="text-slate-600 text-sm">
                                                Te ayudamos a migrar desde otras plataformas
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
