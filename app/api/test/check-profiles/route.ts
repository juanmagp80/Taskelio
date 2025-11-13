import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/src/lib/supabase-admin';

export async function GET(request: NextRequest) {
    try {

        const supabaseAdmin = createSupabaseAdmin();
        
        // Obtener todos los perfiles para diagnóstico usando admin client
        const { data: profiles, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error obteniendo perfiles:', error);
            return NextResponse.json(
                { error: 'Error obteniendo perfiles', details: error },
                { status: 500 }
            );
        }

        
        return NextResponse.json({
            success: true,
            totalProfiles: profiles?.length || 0,
            profiles: profiles?.map(p => ({
                id: p.id,
                email: p.email,
                subscription_status: p.subscription_status,
                subscription_plan: p.subscription_plan,
                stripe_customer_id: p.stripe_customer_id,
                stripe_subscription_id: p.stripe_subscription_id,
                created_at: p.created_at,
                updated_at: p.updated_at
            })) || []
        });
        
    } catch (error) {
        console.error('💥 Error general:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error },
            { status: 500 }
        );
    }
}
