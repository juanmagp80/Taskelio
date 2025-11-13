'use client';

import { createSupabaseClient } from '@/src/lib/supabase-client';
import { useEffect, useState } from 'react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

interface CookieConsent {
  preferences: CookiePreferences;
  timestamp: string;
  version: string;
  userId?: string | null;
}

export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [hasConsent, setHasConsent] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadConsent();
  }, []);

  const loadConsent = async () => {
    setIsLoading(true);

    try {
      const supabase = createSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Primero intentar cargar desde la base de datos si hay usuario
      if (user) {
        try {
          const { data: dbConsent } = await supabase
            .from('user_cookie_consents')
            .select('preferences, version, created_at, updated_at')
            .eq('user_id', user.id)
            .single();

          if (dbConsent) {
            const consentData: CookieConsent = {
              preferences: dbConsent.preferences,
              timestamp: dbConsent.updated_at || dbConsent.created_at,
              version: dbConsent.version,
              userId: user.id,
            };

            // Actualizar localStorage con los datos de la BD
            localStorage.setItem('cookie-consent', JSON.stringify(consentData));
            setConsent(consentData);
            setHasConsent(true);
            activateScripts(consentData.preferences);
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.warn('No se pudo cargar el consentimiento desde la BD:', error);
        }
      }

      // Si no hay datos en BD, cargar desde localStorage
      const savedConsent = localStorage.getItem('cookie-consent');
      if (savedConsent) {
        try {
          const parsedConsent: CookieConsent = JSON.parse(savedConsent);

          // Verificar si el consentimiento no es muy antiguo (365 días)
          const consentDate = new Date(parsedConsent.timestamp);
          const now = new Date();
          const daysDiff = Math.floor((now.getTime() - consentDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysDiff <= 365) {
            setConsent(parsedConsent);
            setHasConsent(true);
            activateScripts(parsedConsent.preferences);
          } else {
            // Consentimiento expirado
            localStorage.removeItem('cookie-consent');
          }
        } catch (error) {
          console.error('Error parsing cookie consent:', error);
          localStorage.removeItem('cookie-consent');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const activateScripts = (preferences: CookiePreferences) => {
    // Google Analytics
    if (preferences.analytics) {
      // Aquí puedes agregar el código de Google Analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          analytics_storage: 'granted'
        });
      }
    }

    // Marketing/Advertising
    if (preferences.marketing) {
      // Aquí puedes agregar píxeles de Facebook, Google Ads, etc.
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted'
        });
      }
    }

    // Funcionales
    if (preferences.functional) {
      // Aquí puedes agregar herramientas como Hotjar, Intercom, etc.
    }
  };

  const updateConsent = async (newPreferences: CookiePreferences) => {
    const supabase = createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const newConsent: CookieConsent = {
      preferences: newPreferences,
      timestamp: new Date().toISOString(),
      version: '1.0',
      userId: user?.id || null,
    };

    // Guardar localmente
    localStorage.setItem('cookie-consent', JSON.stringify(newConsent));
    setConsent(newConsent);
    setHasConsent(true);

    // Guardar en BD si hay usuario
    if (user) {
      try {
        const { data: existingConsent } = await supabase
          .from('user_cookie_consents')
          .select('id')
          .eq('user_id', user.id)
          .single();

        const consentRecord = {
          user_id: user.id,
          preferences: newPreferences,
          version: '1.0',
          user_agent: navigator.userAgent,
          updated_at: new Date().toISOString(),
        };

        if (existingConsent) {
          await supabase
            .from('user_cookie_consents')
            .update(consentRecord)
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('user_cookie_consents')
            .insert({
              ...consentRecord,
              created_at: new Date().toISOString(),
            });
        }
      } catch (error) {
        console.warn('No se pudo sincronizar con la BD:', error);
      }
    }

    // Activar scripts con las nuevas preferencias
    activateScripts(newPreferences);
  };

  const revokeConsent = async () => {
    const supabase = createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Eliminar localmente
    localStorage.removeItem('cookie-consent');
    setConsent(null);
    setHasConsent(false);

    // Eliminar de BD si hay usuario
    if (user) {
      try {
        await supabase
          .from('user_cookie_consents')
          .delete()
          .eq('user_id', user.id);
      } catch (error) {
        console.warn('No se pudo eliminar de la BD:', error);
      }
    }

    // Desactivar todos los scripts opcionales
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
    }
  };

  const canUseAnalytics = consent?.preferences.analytics || false;
  const canUseMarketing = consent?.preferences.marketing || false;
  const canUseFunctional = consent?.preferences.functional || false;

  return {
    consent,
    hasConsent,
    isLoading,
    canUseAnalytics,
    canUseMarketing,
    canUseFunctional,
    updateConsent,
    revokeConsent,
    loadConsent, // Para refrescar manualmente
  };
}

// Tipos para TypeScript
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}
