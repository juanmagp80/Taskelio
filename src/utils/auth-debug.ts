// Sistema de debug para cookies de Supabase sin limpieza automática
export const debugSupabaseCookies = () => {
    if (typeof window === 'undefined') return;
    
    try {
        const cookies = document.cookie.split(';');
        const supabaseCookies = cookies
            .map(cookie => cookie.trim())
            .filter(cookie => cookie.split('=')[0].startsWith('sb-'))
            .map(cookie => {
                const [name, value] = cookie.split('=');
                return {
                    name,
                    value: value ? value.substring(0, 50) + '...' : 'empty',
                    length: value ? value.length : 0,
                    isValid: value && value.length > 10 && !value.includes('undefined') && !value.includes('null')
                };
            });

            total: supabaseCookies.length,
            cookies: supabaseCookies,
            timestamp: new Date().toISOString()
        });

        return supabaseCookies;
    } catch (error) {
        console.warn('Error debugging cookies:', error);
        return [];
    }
};

// Función más segura para verificar estado de autenticación
export const checkAuthenticationState = async () => {
    if (typeof window === 'undefined') return false;
    
    try {
        // Verificar si hay cookies de Supabase
        const cookies = document.cookie.split(';')
            .map(cookie => cookie.trim())
            .filter(cookie => cookie.split('=')[0].startsWith('sb-'));
        
        const hasAuthCookies = cookies.length > 0;
        
            hasAuthCookies,
            cookieCount: cookies.length,
            timestamp: new Date().toISOString()
        });
        
        return hasAuthCookies;
    } catch (error) {
        console.warn('Error checking authentication state:', error);
        return false;
    }
};
