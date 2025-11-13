'use client';

import { Button } from '@/components/ui/Button';
import { useTrialStatus } from '@/src/lib/useTrialStatus';
import { AlertTriangle, Calendar, Clock, Crown, X, Zap } from 'lucide-react';
import { useState } from 'react';

interface TrialBannerProps {
    userEmail?: string;
}

export default function TrialBanner({ userEmail }: TrialBannerProps) {
    const { trialInfo, loading, redirectToUpgrade } = useTrialStatus(userEmail);
    const [dismissed, setDismissed] = useState(false);

    if (loading || !trialInfo || dismissed) return null;

    // No mostrar banner si tiene suscripción activa O si puede usar funciones (incluye suscripción de Stripe)
    if (trialInfo.status === 'active' || trialInfo.canUseFeatures) return null;
    
    // No mostrar banner si quedan más de 7 días
    if (trialInfo.daysRemaining > 7) return null;

    const getBannerConfig = () => {
        const { daysRemaining, isExpired } = trialInfo;

        if (isExpired) {
            return {
                bgGradient: 'from-red-500 to-red-600',
                bgSecondary: 'from-red-50 to-red-100',
                textColor: 'text-white',
                icon: AlertTriangle,
                title: '¡Tu trial ha expirado!',
                message: 'Actualiza ahora para continuar usando todas las funciones',
                buttonText: 'Actualizar Ahora',
                buttonVariant: 'secondary' as const,
                urgent: true
            };
        } else if (daysRemaining <= 3) {
            return {
                bgGradient: 'from-orange-500 to-red-500',
                bgSecondary: 'from-orange-50 to-red-50',
                textColor: 'text-white',
                icon: Clock,
                title: `¡Solo ${daysRemaining} días restantes!`,
                message: 'Tu trial expira pronto. Actualiza para no perder acceso',
                buttonText: 'Actualizar Ahora',
                buttonVariant: 'secondary' as const,
                urgent: true
            };
        } else if (daysRemaining <= 7) {
            return {
                bgGradient: 'from-yellow-500 to-orange-500',
                bgSecondary: 'from-yellow-50 to-orange-50',
                textColor: 'text-white',
                icon: Calendar,
                title: `${daysRemaining} días restantes de trial`,
                message: 'Considera actualizar para acceso completo',
                buttonText: 'Ver Planes',
                buttonVariant: 'secondary' as const,
                urgent: false
            };
        } else {
            return {
                bgGradient: 'from-blue-500 to-indigo-600',
                bgSecondary: 'from-blue-50 to-indigo-50',
                textColor: 'text-white',
                icon: Crown,
                title: `Probando Taskelio PRO - ${daysRemaining} días restantes`,
                message: 'Tienes acceso completo durante tu trial gratuito',
                buttonText: 'Ver Planes',
                buttonVariant: 'secondary' as const,
                urgent: false
            };
        }
    };

    const config = getBannerConfig();
    const IconComponent = config.icon;

    return (
        <div className={`relative bg-gradient-to-r ${config.bgGradient} shadow-lg ${config.urgent ? 'animate-pulse' : ''}`}>
            {/* Patrón de fondo sutil */}
            <div className="absolute inset-0 bg-white/10 opacity-20">
                <div className="absolute inset-0" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    backgroundSize: '60px 60px'
                }} />
            </div>

            <div className="relative px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Contenido principal */}
                    <div className="flex items-center space-x-4 flex-1">
                        {/* Icono */}
                        <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                                <IconComponent className={`w-5 h-5 ${config.textColor}`} />
                            </div>
                        </div>

                        {/* Texto */}
                        <div className="flex-1 min-w-0">
                            <h3 className={`text-lg font-bold ${config.textColor} truncate`}>
                                {config.title}
                            </h3>
                            <p className={`text-sm ${config.textColor} opacity-90`}>
                                {config.message}
                            </p>
                        </div>

                        {/* Stats rápidas */}
                        <div className="hidden lg:flex items-center space-x-6 text-sm">
                            <div className={`${config.textColor} opacity-90 text-center`}>
                                <div className="font-bold text-lg">{trialInfo.usage.clients}</div>
                                <div className="text-xs">Clientes</div>
                            </div>
                            <div className={`${config.textColor} opacity-90 text-center`}>
                                <div className="font-bold text-lg">{trialInfo.usage.projects}</div>
                                <div className="text-xs">Proyectos</div>
                            </div>
                            <div className={`${config.textColor} opacity-90 text-center`}>
                                <div className="font-bold text-lg">{Math.round(trialInfo.usage.storage / 1024 * 100) / 100}</div>
                                <div className="text-xs">GB Usados</div>
                            </div>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center space-x-3 ml-4">
                        <Button
                            onClick={redirectToUpgrade}
                            variant={config.buttonVariant}
                            className={`
                                font-semibold transition-all duration-200 hover:scale-105 shadow-lg
                                ${config.urgent
                                    ? 'bg-white text-red-600 hover:bg-red-50 border-2 border-white'
                                    : 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30'
                                }
                            `}
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            {config.buttonText}
                        </Button>

                        {/* Botón cerrar - solo si no es urgente */}
                        {!config.urgent && (
                            <button
                                onClick={() => setDismissed(true)}
                                className={`p-2 rounded-lg ${config.textColor} opacity-70 hover:opacity-100 hover:bg-white/10 transition-all duration-200`}
                                title="Cerrar banner"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Barra de progreso del trial */}
                <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs ${config.textColor} opacity-80`}>
                            Progreso del trial
                        </span>
                        <span className={`text-xs ${config.textColor} opacity-80 font-medium`}>
                            {trialInfo.daysRemaining} de 14 días restantes
                        </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                            className="bg-white rounded-full h-2 transition-all duration-300 shadow-sm"
                            style={{
                                width: `${Math.max(5, ((14 - trialInfo.daysRemaining) / 14) * 100)}%`
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
