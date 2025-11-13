
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    // Verificar si hay error de Google
    if (error) {
      console.error('❌ Error de Google OAuth:', error);
      return NextResponse.redirect('/dashboard/google-calendar?error=oauth_error');
    }

    // Verificar que tenemos el código de autorización
    if (!code) {
      console.error('❌ Código de autorización no recibido');
      return NextResponse.redirect('/dashboard/google-calendar?error=no_code');
    }

    // Verificar state para seguridad
    if (state !== 'taskelio-google-calendar') {
      console.error('❌ Estado de OAuth inválido');
      return NextResponse.redirect('/dashboard/google-calendar?error=invalid_state');
    }


    // Intercambiar código por tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);


    // Obtener información del usuario
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const googleUser = {
      google_id: userInfo.data.id,
      email: userInfo.data.email,
      name: userInfo.data.name,
      picture: userInfo.data.picture,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiry_date,
      connected_at: new Date().toISOString()
    };


    // TODO: En una implementación completa, aquí guardarías los tokens en Supabase
    // asociados al usuario actual de la sesión
    
    // Por ahora, los guardamos en una tabla temporal para pruebas
    const { error: dbError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        email: googleUser.email,
        google_id: googleUser.google_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(tokens.expiry_date || Date.now() + 3600000).toISOString(),
        user_info: googleUser
      }, {
        onConflict: 'email'
      });

    if (dbError) {
      console.error('❌ Error guardando tokens:', dbError);
      // Continuamos sin fallar, solo loggeamos el error
    } else {
    }

    // Redirigir de vuelta al dashboard con éxito
    return NextResponse.redirect('/dashboard/google-calendar?success=connected');

  } catch (error) {
    console.error('❌ Error en callback de Google OAuth:', error);
    return NextResponse.redirect('/dashboard/google-calendar?error=callback_failed');
  }
}
