import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/src/lib/supabase-server';

export async function POST(request: NextRequest) {
    try {

        const supabase = await createServerSupabaseClient();
        
        // Crear usuario de prueba con suscripción activa
        const testUser = {
            id: crypto.randomUUID(),
            email: 'amazonjgp80@gmail.com',
            subscription_status: 'active',
            subscription_plan: 'pro',
            stripe_customer_id: 'cus_test_123',
            stripe_subscription_id: 'sub_test_123',
            subscription_current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('profiles')
            .insert([testUser])
            .select();

        if (error) {
            console.error('❌ Error creando usuario de prueba:', error);
            return NextResponse.json(
                { error: 'Error creando usuario de prueba', details: error },
                { status: 500 }
            );
        }

        
        return NextResponse.json({
            success: true,
            message: 'Usuario de prueba creado exitosamente',
            user: data[0]
        });
        
    } catch (error) {
        console.error('💥 Error general:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error },
            { status: 500 }
        );
    }
}
