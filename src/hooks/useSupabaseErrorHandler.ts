import { useCallback } from 'react';
import { cleanSupabaseCookies, hasCorruptedSupabaseCookies } from '@/src/utils/cookie-cleanup';
import { showToast } from '@/utils/toast';

// Tipo para errores de Supabase
interface SupabaseError {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
    status?: number;
}

// Función para determinar si es un error real de Supabase
export const isSupabaseError = (error: any): error is SupabaseError => {
    if (!error) return false;
    
    // Si el error es null, undefined, o un array/string vacío, no es un error
    if (error === null || error === undefined || error === '' || (Array.isArray(error) && error.length === 0)) {
        return false;
    }
    
    // Si es un objeto vacío {}, no es un error real
    if (typeof error === 'object' && Object.keys(error).length === 0) {
        return false;
    }
    
    // Verificar si tiene propiedades típicas de error de Supabase
    return !!(
        error.message || 
        error.code || 
        error.details || 
        error.hint || 
        error.status
    );
};

// Hook personalizado para manejar operaciones de Supabase con manejo de errores
export const useSupabaseErrorHandler = () => {
    const handleSupabaseOperation = useCallback(async <T>(
        operation: () => Promise<{ data: T | null; error: any }>,
        context: string = 'operación'
    ): Promise<{ data: T | null; success: boolean }> => {
        try {
            // Verificar cookies antes de la operación
            if (hasCorruptedSupabaseCookies()) {
                console.warn('🍪 Detected corrupted cookies, cleaning...');
                cleanSupabaseCookies();
                return { data: null, success: false };
            }

            const result = await operation();

            // Log de debug
                hasData: !!result.data,
                hasError: !!result.error,
                errorType: typeof result.error,
                errorKeys: result.error ? Object.keys(result.error) : null,
                isRealError: isSupabaseError(result.error),
                errorContent: JSON.stringify(result.error)
            });

            // Verificar si hay un error real
            if (isSupabaseError(result.error)) {
                console.error(`❌ Error en ${context}:`, result.error);
                
                // Si es un error de autenticación, limpiar cookies
                if (result.error.code === 'PGRST301' || result.error.message?.includes('JWT')) {
                    console.warn('🔐 Authentication error, cleaning cookies...');
                    cleanSupabaseCookies();
                    return { data: null, success: false };
                }
                
                showToast.error(`Error en ${context}: ${result.error.message || 'Error desconocido'}`);
                return { data: null, success: false };
            }

            return { data: result.data, success: true };

        } catch (exception) {
            console.error(`💥 Excepción en ${context}:`, exception);
            
            // Si es un error de autenticación, intentar limpiar cookies
            if (exception instanceof Error && 
                (exception.message.includes('JWT') || 
                 exception.message.includes('auth') || 
                 exception.message.includes('unauthorized'))) {
                console.warn('🔐 Authentication exception, cleaning cookies...');
                cleanSupabaseCookies();
                return { data: null, success: false };
            }
            
            showToast.error(`Error de conexión en ${context}`);
            return { data: null, success: false };
        }
    }, []);

    return { handleSupabaseOperation, isSupabaseError };
};

// Función de utilidad para logs de debug más claros
export const debugSupabaseResult = (result: any, context: string) => {
        timestamp: new Date().toISOString(),
        hasData: !!result?.data,
        dataType: typeof result?.data,
        hasError: !!result?.error,
        errorType: typeof result?.error,
        errorKeys: result?.error ? Object.keys(result.error) : null,
        isRealError: isSupabaseError(result?.error),
        errorStringified: JSON.stringify(result?.error),
        fullResult: JSON.stringify(result, null, 2)
    });
};
