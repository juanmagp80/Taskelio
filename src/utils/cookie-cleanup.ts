// Utilidad para limpiar cookies corruptas de Supabase
export const cleanSupabaseCookies = () => {
    if (typeof window === 'undefined') return; // Solo en el navegador
    
    try {
        // Lista de prefijos de cookies de Supabase a limpiar
        const supabaseCookiePrefixes = [
            'sb-',
            'supabase-auth-token',
            'supabase.auth.token'
        ];
        
        // Obtener todas las cookies
        const cookies = document.cookie.split(';');
        let cleaned = 0;
        
        cookies.forEach(cookie => {
            const trimmedCookie = cookie.trim();
            const cookieName = trimmedCookie.split('=')[0];
            
            // Verificar si es una cookie de Supabase
            const isSupabaseCookie = supabaseCookiePrefixes.some(prefix => 
                cookieName.startsWith(prefix)
            );
            
            if (isSupabaseCookie) {
                // Verificar si la cookie está realmente corrupta
                const cookieValue = trimmedCookie.split('=')[1];
                if (cookieValue && (
                    cookieValue === 'undefined' ||
                    cookieValue === 'null' ||
                    cookieValue === '' ||
                    cookieValue.includes('base64-undefined') ||
                    cookieValue.includes('base64-null') ||
                    (cookieValue.startsWith('base64-') && cookieValue.length < 10)
                )) {
                    // Eliminar la cookie corrupta
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`;
                    document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
                    cleaned++;
                }
            }
        });
        
        if (cleaned > 0) {
            // Recargar la página después de limpiar cookies para que Supabase se reinicie limpiamente
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
        
    } catch (error) {
        console.warn('Error cleaning Supabase cookies:', error);
    }
};

// Función para verificar si hay cookies corruptas
export const hasCorruptedSupabaseCookies = (): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
        const cookies = document.cookie.split(';');
        return cookies.some(cookie => {
            const trimmedCookie = cookie.trim();
            const cookieName = trimmedCookie.split('=')[0];
            const cookieValue = trimmedCookie.split('=')[1];
            
            // Detectar cookies específicamente malformadas que causan errores de parsing
            return cookieName.startsWith('sb-') && cookieValue && (
                cookieValue === 'base64-eyJ' || // Cookie incompleta específica del error
                cookieValue.startsWith('base64-eyJ"') || // Cookie con comillas mal cerradas
                cookieValue.includes('undefined') ||
                cookieValue === 'null' ||
                // Detectar JSON malformado que empieza con "base64-
                (cookieValue.startsWith('"base64-') && !cookieValue.endsWith('"'))
            );
        });
    } catch (error) {
        return false;
    }
};
