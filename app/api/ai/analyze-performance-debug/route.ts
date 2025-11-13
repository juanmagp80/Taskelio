import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    
    // Primero leer el body
    const body = await request.json();
    const { period = '30_days', userId } = body;
    

    // Método 1: Intentar con Route Handler Client
    let supabase = createRouteHandlerClient({ cookies });
    let user = null;
    let authError = null;

    try {
      const authResult = await supabase.auth.getUser();
      user = authResult.data?.user;
      authError = authResult.error;
    } catch (error) {
    }

    // Método 2: Si falla, intentar con Service Role
    if (authError || !user) {
      
      if (userId) {
        try {
          supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          // Crear objeto user ficticio para las consultas
          user = { id: userId };
        } catch (error) {
        }
      }
    }
    
    if (!user) {
      console.error('❌ All auth methods failed');
      return NextResponse.json({ 
        error: 'No se pudo autenticar el usuario.',
        debug: {
          authError: authError?.message,
          userId,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      }, { status: 401 });
    }


    // Prueba simple de conexión a la base de datos
    try {
      const { data: testEvents, error: testError } = await supabase
        .from('calendar_events')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (testError) {
        return NextResponse.json({
          error: 'Error de conexión a base de datos',
          debug: {
            dbError: testError.message,
            userId: user.id
          }
        }, { status: 500 });
      }

    } catch (dbError) {
      return NextResponse.json({
        error: 'Error de base de datos',
        debug: {
          dbError: dbError instanceof Error ? dbError.message : 'Unknown error'
        }
      }, { status: 500 });
    }

    // Respuesta de éxito simplificada
    const debugResponse = {
      success: true,
      debug: true,
      userId: user.id,
      userEmail: user.email || 'Service role',
      period,
      message: 'Autenticación y conexión DB exitosa',
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(debugResponse);

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Error en debug analysis',
        debug: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
        }
      }, 
      { status: 500 }
    );
  }
}
