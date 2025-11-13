import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/src/lib/supabase-server';

export async function POST(request: NextRequest) {
    try {
        const { userEmail } = await request.json();
        
        if (!userEmail) {
            return NextResponse.json(
                { error: 'Email de usuario requerido' },
                { status: 400 }
            );
        }


        const supabase = await createServerSupabaseClient();
        
        // Primero, intentar buscar el perfil existente
        const { data: existingProfiles, error: searchError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', userEmail);

        if (searchError) {
            console.error('❌ Error buscando perfil:', searchError);
            return NextResponse.json(
                { error: 'Error buscando perfil', details: searchError },
                { status: 500 }
            );
        }

        if (existingProfiles && existingProfiles.length > 0) {
            // El perfil existe, actualizarlo
            const { data, error } = await supabase
                .from('profiles')
                .update({
                    subscription_status: 'active',
                    subscription_plan: 'pro',
                    subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingProfiles[0].id)
                .select();

            if (error) {
                console.error('❌ Error actualizando suscripción:', error);
                return NextResponse.json(
                    { error: 'Error actualizando suscripción', details: error },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                message: 'Suscripción actualizada a PRO exitosamente',
                profile: data[0]
            });
        } else {
            // No hay perfil existente
            return NextResponse.json(
                { 
                    error: 'Perfil no encontrado', 
                    message: 'Debes iniciar sesión primero para crear tu perfil',
                    userEmail 
                },
                { status: 404 }
            );
        }
        
    } catch (error) {
        console.error('💥 Error general:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error },
            { status: 500 }
        );
    }
}
