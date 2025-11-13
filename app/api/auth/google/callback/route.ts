import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const error = searchParams.get('error');

        if (error) {
            console.error('❌ Error en OAuth:', error);
            return NextResponse.redirect(new URL('/dashboard/google-calendar?error=oauth_failed', request.url));
        }

        if (!code) {
            // Generar URL de autorización
            const scopes = [
                'https://www.googleapis.com/auth/calendar.readonly',
                'https://www.googleapis.com/auth/calendar.events'
            ];

            const authUrl = oauth2Client.generateAuthUrl({
                access_type: 'offline',
                scope: scopes,
                prompt: 'consent'
            });

            return NextResponse.redirect(authUrl);
        }

        // Intercambiar código por tokens usando getToken
        const { tokens } = await oauth2Client.getToken(code);
        const access_token = tokens?.access_token;

        if (access_token) {

            // Aquí guardarías el token en tu base de datos normalmente
            // Por ahora, lo pasamos como parámetro de URL (solo para desarrollo)
            const redirectUrl = new URL('/dashboard/google-calendar', request.url);
            redirectUrl.searchParams.set('auth_success', 'true');
            redirectUrl.searchParams.set('access_token', access_token);

            return NextResponse.redirect(redirectUrl);
        }

        throw new Error('No se pudo obtener el access_token');

    } catch (error) {
        console.error('❌ Error en callback OAuth:', error);
        return NextResponse.redirect(new URL('/dashboard/google-calendar?error=oauth_error', request.url));
    }
}

export async function POST(request: NextRequest) {
    // Endpoint para iniciar el flujo de OAuth
    try {
        const scopes = [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/calendar.events'
        ];

        const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });

        return NextResponse.json({ authUrl });
    } catch (error) {
        console.error('❌ Error generando URL de autorización:', error);
        return NextResponse.json(
            { error: 'Error generando URL de autorización' },
            { status: 500 }
        );
    }
}
