import { createSupabaseAdmin } from '@/src/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userEmail } = body;


        const supabase = createSupabaseAdmin();

        // 1. Probar búsqueda directa (método actualizado)
        const { data: sqlResult, error: sqlError } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', userEmail)
            .single();


        // 2. Probar búsqueda directa en profiles
        const { data: profileResult, error: profileError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .eq('email', userEmail)
            .limit(1);


        // 3. Listar todos los usuarios para debug
        const { data: allProfiles, error: allError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .limit(10);


        return NextResponse.json({
            success: true,
            requestedEmail: userEmail,
            sqlFunction: {
                result: sqlResult,
                error: sqlError?.message
            },
            directLookup: {
                result: profileResult,
                error: profileError?.message
            },
            allUsers: allProfiles?.map(p => ({ email: p.email, id: p.id.substring(0, 8) + '...' }))
        });

    } catch (error) {
        console.error('❌ Debug endpoint error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Error desconocido'
        }, { status: 500 });
    }
}
