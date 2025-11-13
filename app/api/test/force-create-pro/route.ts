import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usar directamente las claves para bypasear RLS
const supabaseUrl = 'https://joyhaxtpmrmndmifsihn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpveWhheHRwbXJtbmRtaWZzaWhuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzk4MDk3NSwiZXhwIjoyMDY5NTU2OTc1fQ.8yajSVnLGwmwCz2S0SZ3Xkbfb8PlLHX7AUC_6Gd_7zU';

export async function POST(request: NextRequest) {
    try {
        const { userEmail } = await request.json();
        
        if (!userEmail) {
            return NextResponse.json(
                { error: 'Email de usuario requerido' },
                { status: 400 }
            );
        }


        // Crear cliente con clave de servicio (bypasa RLS)
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Primero buscar en auth.users para obtener el ID
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
            console.error('❌ Error listando usuarios:', authError);
            return NextResponse.json(
                { error: 'Error accediendo a usuarios', details: authError },
                { status: 500 }
            );
        }

        const user = authData.users.find(u => u.email === userEmail);
        
        if (!user) {
            return NextResponse.json(
                { error: 'Usuario no encontrado en autenticación' },
                { status: 404 }
            );
        }


        // Verificar si ya existe el perfil
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (existingProfile) {
            // Actualizar perfil existente a PRO
            const { data: updatedProfile, error: updateError } = await supabase
                .from('profiles')
                .update({
                    subscription_status: 'active',
                    subscription_plan: 'pro',
                    subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id)
                .select()
                .single();

            if (updateError) {
                console.error('❌ Error actualizando perfil:', updateError);
                return NextResponse.json(
                    { error: 'Error actualizando perfil', details: updateError },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                message: 'Perfil actualizado a PRO exitosamente',
                profile: updatedProfile
            });
        } else {
            // Crear nuevo perfil PRO
            const trialStartDate = new Date();
            const trialEndDate = new Date(trialStartDate.getTime() + (14 * 24 * 60 * 60 * 1000));

            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    email: userEmail,
                    subscription_status: 'active',
                    subscription_plan: 'pro',
                    subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    trial_started_at: trialStartDate.toISOString(),
                    trial_ends_at: trialEndDate.toISOString(),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (createError) {
                console.error('❌ Error creando perfil:', createError);
                return NextResponse.json(
                    { error: 'Error creando perfil PRO', details: createError },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                message: 'Perfil PRO creado exitosamente',
                profile: newProfile
            });
        }
        
    } catch (error) {
        console.error('💥 Error general:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error },
            { status: 500 }
        );
    }
}
