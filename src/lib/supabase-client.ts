// src/lib/supabase-client.ts
import { createBrowserClient } from '@supabase/ssr';

// Nota: Estas variables se acceden directamente en el navegador.
// Asegúrate de que estén prefijadas con NEXT_PUBLIC_ en tu archivo .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Función para verificar si Supabase está configurado
export const isSupabaseConfigured = () => {
    return !!(supabaseUrl && 
              supabaseAnonKey && 
              supabaseUrl !== 'your_supabase_project_url_here' && 
              supabaseAnonKey !== 'your_supabase_anon_key_here' &&
              supabaseUrl.startsWith('https://'));
};

// Función para limpiar cookies corruptas de Supabase
const cleanCorruptedSupabaseCookies = () => {
    try {
        // Obtener todas las cookies
        const cookies = document.cookie.split(';');
        
        // Buscar cookies de Supabase que puedan estar corruptas
        cookies.forEach(cookie => {
            const trimmedCookie = cookie.trim();
            if (trimmedCookie.startsWith('sb-') && trimmedCookie.includes('base64-')) {
                const cookieName = trimmedCookie.split('=')[0];
                // Eliminar la cookie corrupta
                document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
        });
    } catch (error) {
        console.warn('Error cleaning cookies:', error);
    }
};

// Cliente de Supabase para componentes de cliente (navegador)
export const createSupabaseClient = () => {
    if (!isSupabaseConfigured()) {
        console.warn('⚠️ Supabase no está configurado. La funcionalidad estará limitada.');
        // Devolvemos un objeto mock para evitar errores de 'null'
        const mockQuery = {
            select: () => mockQuery,
            insert: () => mockQuery,
            update: () => mockQuery,
            delete: () => mockQuery,
            eq: () => mockQuery,
            order: () => mockQuery,
            then: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } })
        };
        
        return {
            from: () => mockQuery,
            auth: {
                getUser: async () => ({ data: { user: null }, error: { message: 'Supabase not configured' } }),
                signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Supabase not configured' } }),
                signOut: async () => ({ error: null }),
            },
        } as any; // Usamos 'as any' para el mock
    }
    
    try {
        return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
    } catch (error: any) {
        // Si hay error de cookies corruptas, limpiarlas e intentar de nuevo
        if (error.message && error.message.includes('parse cookie')) {
            console.warn('🔧 Detected corrupted Supabase cookies, cleaning...');
            cleanCorruptedSupabaseCookies();
            
            try {
                return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
            } catch (retryError) {
                console.error('Failed to create Supabase client after cookie cleanup:', retryError);
                throw retryError;
            }
        }
        throw error;
    }
};

// Exportamos una instancia singleton para uso general si es necesario,
// pero se prefiere usar createSupabaseClient() en componentes.
export const supabase = createSupabaseClient();
