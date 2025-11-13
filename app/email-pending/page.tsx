'use client'

import { createSupabaseClient } from '@/src/lib/supabase-client';
import { showToast } from '@/utils/toast';
import { AlertCircle, Clock, Home, LogOut, Mail, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function EmailPendingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const redirectPath = searchParams.get('redirect') || '/dashboard';
    const supabase = createSupabaseClient();

    useEffect(() => {
        // Obtener información del usuario actual
        const getUser = async () => {
            if (!supabase) return;

            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
            } else {
                // Si no hay sesión, redirigir al login
                router.push('/login');
            }
        };

        getUser();

        // Verificar periódicamente si el email fue confirmado
        const checkConfirmation = async () => {
            if (!supabase || !user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('email_confirmed_at')
                .eq('id', user.id)
                .single();

            if (profile?.email_confirmed_at) {
                // Email confirmado, redirigir a la página original
                router.push(redirectPath);
            }
        };

        // Verificar cada 10 segundos
        const interval = setInterval(checkConfirmation, 10000);
        return () => clearInterval(interval);
    }, [user, redirectPath, router, supabase]);

    useEffect(() => {
        // Cooldown para reenvío de email
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                setResendCooldown(resendCooldown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleResendEmail = async () => {
        if (!user || !supabase || resendCooldown > 0) return;

        setLoading(true);
        try {
            const response = await fetch('/api/auth/send-confirmation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: user.id,
                    email: user.email
                })
            });

            const data = await response.json();

            if (data.success) {
                setResendCooldown(60); // 60 segundos de cooldown
                showToast.success('Email de confirmación reenviado exitosamente. Revisa tu bandeja de entrada.');
            } else {
                showToast.error('Error enviando email: ' + data.error);
            }
        } catch (error) {
            console.error('Error resending email:', error);
            showToast.error('Error enviando email. Por favor intenta más tarde.');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!supabase) return;

        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleCheckNow = async () => {
        if (!user || !supabase) return;

        setLoading(true);
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('email_confirmed_at')
                .eq('id', user.id)
                .single();

            if (profile?.email_confirmed_at) {
                router.push(redirectPath);
            } else {
                showToast.warning('Tu email aún no ha sido confirmado. Por favor revisa tu bandeja de entrada.');
            }
        } catch (error) {
            console.error('Error checking confirmation:', error);
            showToast.error('Error verificando confirmación. Por favor intenta más tarde.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
            <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                {/* Icono principal */}
                <div className="mb-6">
                    <div className="mx-auto w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                        <Mail className="h-12 w-12 text-orange-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Confirma tu Email
                    </h1>
                    <p className="text-lg text-gray-600">
                        Para acceder a tu cuenta, necesitas confirmar tu dirección de email.
                    </p>
                </div>

                {/* Información del usuario */}
                {user && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                        <div className="flex items-center justify-center mb-3">
                            <Clock className="h-5 w-5 text-blue-600 mr-2" />
                            <h3 className="text-lg font-semibold text-blue-800">
                                Email enviado a:
                            </h3>
                        </div>
                        <p className="text-blue-700 font-mono text-sm bg-blue-100 px-3 py-2 rounded-lg">
                            {user.email}
                        </p>
                    </div>
                )}

                {/* Instrucciones */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
                    <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div className="text-left">
                            <h3 className="font-semibold text-yellow-800 mb-2">
                                ¿Qué hacer ahora?
                            </h3>
                            <ol className="text-yellow-700 text-sm space-y-1">
                                <li>1. Revisa tu bandeja de entrada</li>
                                <li>2. Busca el email de "Taskelio"</li>
                                <li>3. Haz clic en el enlace de confirmación</li>
                                <li>4. Regresa aquí para continuar</li>
                            </ol>
                        </div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="space-y-4">
                    <button
                        onClick={handleCheckNow}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition duration-200 flex items-center justify-center disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                Verificando...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-5 w-5 mr-2" />
                                Ya confirmé mi email
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleResendEmail}
                        disabled={loading || resendCooldown > 0}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-6 rounded-xl transition duration-200 flex items-center justify-center disabled:opacity-50"
                    >
                        {resendCooldown > 0 ? (
                            <>
                                <Clock className="h-5 w-5 mr-2" />
                                Reenviar en {resendCooldown}s
                            </>
                        ) : loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Mail className="h-5 w-5 mr-2" />
                                Reenviar email
                            </>
                        )}
                    </button>

                    <div className="flex space-x-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition duration-200 flex items-center justify-center"
                        >
                            <Home className="h-5 w-5 mr-2" />
                            Inicio
                        </button>

                        <button
                            onClick={handleLogout}
                            className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-3 px-6 rounded-xl transition duration-200 flex items-center justify-center"
                        >
                            <LogOut className="h-5 w-5 mr-2" />
                            Cerrar Sesión
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                        El enlace de confirmación expira en 24 horas.
                        Si no recibes el email, revisa tu carpeta de spam.
                    </p>
                </div>
            </div>
        </div>
    );
}

// Forzar renderización dinámica para evitar errores de build
export const dynamic = 'force-dynamic';

export default function EmailPendingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
                <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-600 mx-auto mb-6"></div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        Cargando...
                    </h2>
                    <p className="text-gray-600">
                        Verificando estado de confirmación
                    </p>
                </div>
            </div>
        }>
            <EmailPendingContent />
        </Suspense>
    );
}