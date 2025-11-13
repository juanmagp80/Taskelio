import { createSupabaseServerClient } from '@/src/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {

        const { token } = await request.json();

        if (!token) {
            return NextResponse.json(
                { error: 'Token de confirmación requerido' },
                { status: 400 }
            );
        }


        // Crear cliente Supabase server
        const supabase = await createSupabaseServerClient();

        // Buscar el token en la base de datos
        const { data: confirmation, error: findError } = await supabase
            .from('email_confirmations')
            .select('*')
            .eq('token', token)
            .single();

        if (findError || !confirmation) {
            console.error('❌ Token no encontrado:', findError);
            return NextResponse.json(
                {
                    error: 'Token de confirmación inválido o expirado',
                    code: 'INVALID_TOKEN'
                },
                { status: 400 }
            );
        }


        // Verificar si el token ya fue usado
        if (confirmation.confirmed_at) {
            return NextResponse.json(
                {
                    error: 'Este enlace de confirmación ya fue utilizado',
                    code: 'TOKEN_ALREADY_USED'
                },
                { status: 400 }
            );
        }

        // Verificar si el token ha expirado
        const now = new Date();
        const expiresAt = new Date(confirmation.expires_at);

        if (now > expiresAt) {

            // Eliminar token expirado
            await supabase
                .from('email_confirmations')
                .delete()
                .eq('token', token);

            return NextResponse.json(
                {
                    error: 'El enlace de confirmación ha expirado. Por favor, registrate nuevamente.',
                    code: 'TOKEN_EXPIRED'
                },
                { status: 400 }
            );
        }


        // Marcar el token como confirmado
        const { error: updateTokenError } = await supabase
            .from('email_confirmations')
            .update({
                confirmed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('token', token);

        if (updateTokenError) {
            console.error('❌ Error actualizando token:', updateTokenError);
            return NextResponse.json(
                { error: 'Error procesando confirmación' },
                { status: 500 }
            );
        }


        // Actualizar el usuario en auth.users para marcarlo como confirmado
        // Nota: En Supabase, necesitamos usar la tabla auth.users pero puede requerir permisos especiales

        // Alternativa: Actualizar una columna personalizada en profiles
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                email_confirmed_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', confirmation.user_id);

        if (profileError) {
            console.error('⚠️ Error actualizando perfil (no crítico):', profileError);
            // No es crítico, el token ya está marcado como confirmado
        }


        // Obtener información del usuario para respuesta
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', confirmation.user_id)
            .single();


        return NextResponse.json({
            success: true,
            message: 'Email confirmado exitosamente',
            user: {
                id: confirmation.user_id,
                email: confirmation.email,
                name: profile?.full_name || 'Usuario',
                confirmed_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error general en confirmación:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error },
            { status: 500 }
        );
    }
}

// Método GET para manejar confirmaciones desde enlaces (cuando el usuario hace clic)
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            // Redirigir a página de error
            return NextResponse.redirect(new URL('/auth/confirm?error=missing_token', request.url));
        }

        // Usar el mismo método POST pero adaptado para GET
        const result = await POST(new NextRequest(request.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        }));

        const data = await result.json();

        if (data.success) {
            // Redirigir a página de éxito
            return NextResponse.redirect(new URL('/auth/confirm?success=true', request.url));
        } else {
            // Redirigir a página de error con código específico
            const errorCode = data.code || 'unknown_error';
            return NextResponse.redirect(new URL(`/auth/confirm?error=${errorCode}`, request.url));
        }

    } catch (error) {
        console.error('❌ Error en GET confirmación:', error);
        return NextResponse.redirect(new URL('/auth/confirm?error=server_error', request.url));
    }
}