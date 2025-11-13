'use client';

import Sidebar from '@/components/Sidebar';
import TrialBanner from '@/components/TrialBanner';
import { Button } from '@/components/ui/Button';
import { useCookieConsent } from '@/src/hooks/useCookieConsent';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { showToast } from '@/utils/toast';
import {
  ArrowLeft,
  Clock,
  Cookie,
  Eye,
  Save,
  Settings,
  Shield,
  Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CookiePreferencesClientProps {
  userEmail: string;
}

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export default function CookiePreferencesClient({ userEmail }: CookiePreferencesClientProps) {
  const router = useRouter();
  const { consent, hasConsent, updateConsent, revokeConsent, isLoading } = useCookieConsent();
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    functional: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (consent?.preferences) {
      setPreferences(consent.preferences);
    }
  }, [consent]);

  const handleLogout = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConsent(preferences);
      showToast.success('Preferencias guardadas correctamente');
    } catch (error) {
      console.error('Error saving preferences:', error);
      showToast.error('Error al guardar las preferencias');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeAll = async () => {
    const confirmed = await showToast.confirm('¿Estás seguro de que quieres revocar todas las cookies opcionales? Esta acción no se puede deshacer.');
    if (confirmed) {
      setSaving(true);
      try {
        await revokeConsent();
        showToast.success('Consentimiento revocado correctamente');
        router.push('/dashboard');
      } catch (error) {
        console.error('Error revoking consent:', error);
        showToast.error('Error al revocar el consentimiento');
      } finally {
        setSaving(false);
      }
    }
  };

  const cookieTypes = [
    {
      key: 'necessary' as keyof CookiePreferences,
      title: 'Cookies Necesarias',
      description: 'Esenciales para el funcionamiento básico del sitio (autenticación, sesiones, seguridad)',
      icon: Shield,
      color: 'green',
      required: true,
    },
    {
      key: 'analytics' as keyof CookiePreferences,
      title: 'Cookies de Análisis',
      description: 'Nos ayudan a entender cómo usas el sitio para mejorarlo (Google Analytics, métricas de uso)',
      icon: Eye,
      color: 'blue',
      required: false,
    },
    {
      key: 'marketing' as keyof CookiePreferences,
      title: 'Cookies de Marketing',
      description: 'Para mostrarte contenido y anuncios relevantes en otros sitios web',
      icon: Cookie,
      color: 'purple',
      required: false,
    },
    {
      key: 'functional' as keyof CookiePreferences,
      title: 'Cookies Funcionales',
      description: 'Mejoran la funcionalidad recordando tus preferencias (tema, idioma, configuración)',
      icon: Settings,
      color: 'orange',
      required: false,
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar userEmail={userEmail} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col overflow-hidden ml-56">
        <TrialBanner userEmail={userEmail} />

        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="h-full px-6 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-6">
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard/settings')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a Configuración
                </Button>
              </div>

              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Cookie className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Preferencias de Cookies
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Gestiona cómo utilizamos las cookies para mejorar tu experiencia
                  </p>
                </div>
              </div>

              {/* Estado actual */}
              {hasConsent && consent && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-900 dark:text-blue-100">
                        Consentimiento actual
                      </h3>
                      <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                        Última actualización: {new Date(consent.timestamp).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-300">
                        Versión de política: {consent.version}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Loading state */}
            {isLoading ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Cargando preferencias...</p>
              </div>
            ) : (
              <>
                {/* Cookie Types */}
                <div className="space-y-4 mb-8">
                  {cookieTypes.map((type) => {
                    const Icon = type.icon;
                    const isEnabled = preferences[type.key];

                    return (
                      <div key={type.key} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <div className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                              <div className={`p-3 rounded-lg bg-${type.color}-100 dark:bg-${type.color}-900/50`}>
                                <Icon className={`w-6 h-6 text-${type.color}-600 dark:text-${type.color}-400`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {type.title}
                                  </h3>
                                  {type.required && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                      OBLIGATORIAS
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                                  {type.description}
                                </p>
                              </div>
                            </div>

                            <div className="ml-4">
                              {type.required ? (
                                <div className="w-12 h-6 bg-green-500 rounded-full flex items-center justify-end px-1">
                                  <div className="w-4 h-4 bg-white rounded-full shadow"></div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handlePreferenceChange(type.key, !isEnabled)}
                                  className={`w-12 h-6 rounded-full flex items-center transition-all duration-200 ${isEnabled
                                      ? `bg-${type.color}-500 justify-end`
                                      : 'bg-gray-300 dark:bg-gray-600 justify-start'
                                    } px-1`}
                                >
                                  <div className="w-4 h-4 bg-white rounded-full shadow"></div>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save className="w-4 h-4" />
                      {saving ? 'Guardando...' : 'Guardar Preferencias'}
                    </Button>

                    <Button
                      onClick={handleRevokeAll}
                      variant="outline"
                      disabled={saving}
                      className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Revocar Todo
                    </Button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      💡 <strong>Nota:</strong> Los cambios se aplicarán inmediatamente.
                      Las cookies necesarias no se pueden desactivar ya que son esenciales
                      para el funcionamiento del sitio.
                    </p>
                  </div>
                </div>

                {/* Links to policies */}
                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
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
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
