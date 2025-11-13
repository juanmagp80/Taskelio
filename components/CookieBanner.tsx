'use client';

import { Button } from '@/components/ui/Button';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { Cookie, Eye, Settings, Shield, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

interface CookieBannerProps {
  userEmail?: string | null;
}

export default function CookieBanner({ userEmail }: CookieBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Siempre necesarias
    analytics: false,
    marketing: false,
    functional: false,
  });

  useEffect(() => {
    // Verificar estado de autenticación
    const checkAuthStatus = async () => {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };

    checkAuthStatus();

    // Escuchar cambios de autenticación
    const supabase = createSupabaseClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
      setIsAuthenticated(!!session?.user);

      // Cuando el usuario se autentica, verificar si necesita ver el banner
      if (session?.user && event === 'SIGNED_IN') {
        checkCookieConsent();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkCookieConsent = () => {
    // Verificar si el usuario ya ha dado su consentimiento
    const consent = localStorage.getItem('cookie-consent');

    if (!consent) {
      // Solo mostrar si el usuario está autenticado
      if (isAuthenticated) {
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 2000); // 2 segundos después del login

        return () => clearTimeout(timer);
      }
    } else {
      // Ya tiene consentimiento, verificar si es válido
      try {
        const parsedConsent = JSON.parse(consent);
        const consentDate = new Date(parsedConsent.timestamp);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - consentDate.getTime()) / (1000 * 60 * 60 * 24));

        // Si el consentimiento es muy antiguo (más de 365 días), pedirlo de nuevo
        if (daysDiff > 365) {
          localStorage.removeItem('cookie-consent');
          if (isAuthenticated) {
            setIsVisible(true);
          }
        }
      } catch (error) {
        // Si hay error parseando, eliminar y pedir consentimiento
        localStorage.removeItem('cookie-consent');
        if (isAuthenticated) {
          setIsVisible(true);
        }
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      checkCookieConsent();
    } else {
      // Si no está autenticado, ocultar el banner
      setIsVisible(false);
    }
  }, [isAuthenticated]);

  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      functional: true,
    };

    saveConsent(allAccepted);
    setIsVisible(false);
  };

  const acceptSelected = () => {
    saveConsent(preferences);
    setIsVisible(false);
  };

  const rejectAll = () => {
    const onlyNecessary: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
    };

    saveConsent(onlyNecessary);
    setIsVisible(false);
  };

  const saveConsent = async (prefs: CookiePreferences) => {
    const supabase = createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const consentData = {
      preferences: prefs,
      timestamp: new Date().toISOString(),
      version: '1.0',
      userId: user?.id || null,
      userAgent: navigator.userAgent,
    };

    // Guardar localmente
    localStorage.setItem('cookie-consent', JSON.stringify(consentData));

    // Guardar en la base de datos si el usuario está autenticado
    if (user) {
      try {
        // Primero verificar si ya existe un registro
        const { data: existingConsent } = await supabase
          .from('user_cookie_consents')
          .select('id')
          .eq('user_id', user.id)
          .single();

        const consentRecord = {
          user_id: user.id,
          preferences: prefs,
          version: '1.0',
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString(),
        };

        if (existingConsent) {
          // Actualizar registro existente
          await supabase
            .from('user_cookie_consents')
            .update(consentRecord)
            .eq('user_id', user.id);
        } else {
          // Crear nuevo registro
          await supabase
            .from('user_cookie_consents')
            .insert({
              ...consentRecord,
              created_at: new Date().toISOString(),
            });
        }
      } catch (error) {
        console.warn('No se pudo guardar el consentimiento en la base de datos:', error);
        // Continuar sin fallar, el localStorage es suficiente
      }
    }

    // Activar/desactivar scripts según las preferencias
    if (prefs.analytics) {
      // Activar Google Analytics
      if (typeof window.gtag !== 'undefined') {
        window.gtag('consent', 'update', {
          analytics_storage: 'granted'
        });
      }
    }

    if (prefs.marketing) {
      // Activar píxeles de marketing
      if (typeof window.gtag !== 'undefined') {
        window.gtag('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted'
        });
      }
    }

    if (prefs.functional) {
      // Activar cookies funcionales (chat, preferencias, etc.)
    }
  };

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }));
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300" />

      {/* Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Cookie className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    🍪 Configuración de Cookies
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Respetamos tu privacidad y cumplimos con el RGPD
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVisible(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
              Utilizamos cookies para mejorar tu experiencia, analizar el uso del sitio y personalizar el contenido.
              Puedes elegir qué tipos de cookies aceptar o rechazar todas las opcionales.
            </p>

            {!showDetails ? (
              /* Vista Simple */
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <Button
                  onClick={acceptAll}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                >
                  ✅ Aceptar Todas
                </Button>

                <Button
                  onClick={rejectAll}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  ❌ Solo Necesarias
                </Button>

                <Button
                  onClick={() => setShowDetails(true)}
                  variant="ghost"
                  className="w-full sm:w-auto flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Personalizar
                </Button>
              </div>
            ) : (
              /* Vista Detallada */
              <div className="space-y-4">
                {/* Cookies Necesarias */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Cookies Necesarias
                      </span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        OBLIGATORIAS
                      </span>
                    </div>
                    <div className="w-10 h-6 bg-green-500 rounded-full flex items-center justify-end px-1">
                      <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Esenciales para el funcionamiento básico del sitio (autenticación, sesiones, seguridad).
                  </p>
                </div>

                {/* Cookies Analytics */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Cookies de Análisis
                      </span>
                    </div>
                    <button
                      onClick={() => handlePreferenceChange('analytics', !preferences.analytics)}
                      className={`w-10 h-6 rounded-full flex items-center transition-all duration-200 ${preferences.analytics
                          ? 'bg-blue-500 justify-end'
                          : 'bg-gray-300 dark:bg-gray-600 justify-start'
                        } px-1`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow"></div>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Nos ayudan a entender cómo usas el sitio para mejorarlo (Google Analytics, métricas de uso).
                  </p>
                </div>

                {/* Cookies Marketing */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Cookie className="w-4 h-4 text-purple-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Cookies de Marketing
                      </span>
                    </div>
                    <button
                      onClick={() => handlePreferenceChange('marketing', !preferences.marketing)}
                      className={`w-10 h-6 rounded-full flex items-center transition-all duration-200 ${preferences.marketing
                          ? 'bg-purple-500 justify-end'
                          : 'bg-gray-300 dark:bg-gray-600 justify-start'
                        } px-1`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow"></div>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Para mostrarte contenido y anuncios relevantes en otros sitios web.
                  </p>
                </div>

                {/* Cookies Funcionales */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-orange-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        Cookies Funcionales
                      </span>
                    </div>
                    <button
                      onClick={() => handlePreferenceChange('functional', !preferences.functional)}
                      className={`w-10 h-6 rounded-full flex items-center transition-all duration-200 ${preferences.functional
                          ? 'bg-orange-500 justify-end'
                          : 'bg-gray-300 dark:bg-gray-600 justify-start'
                        } px-1`}
                    >
                      <div className="w-4 h-4 bg-white rounded-full shadow"></div>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mejoran la funcionalidad recordando tus preferencias (tema, idioma, configuración).
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <Button
                    onClick={acceptSelected}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    ✅ Guardar Preferencias
                  </Button>

                  <Button
                    onClick={acceptAll}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Aceptar Todas
                  </Button>

                  <Button
                    onClick={() => setShowDetails(false)}
                    variant="ghost"
                    className="w-full sm:w-auto"
                  >
                    ← Volver
                  </Button>
                </div>
              </div>
            )}

            {/* Footer con enlaces */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Para más información, consulta nuestra{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Política de Privacidad
                </a>{' '}
                y{' '}
                <a href="/cookies" className="text-blue-600 hover:underline">
                  Política de Cookies
                </a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
