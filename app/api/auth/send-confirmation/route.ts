import { createSupabaseServerClient } from '@/src/lib/supabase-server';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {

        const { userId, email, userName } = await request.json();

        if (!userId || !email) {
            return NextResponse.json(
                { error: 'UserId y email son requeridos' },
                { status: 400 }
            );
        }

        // Generar token único para confirmación
        const confirmationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas


        // Crear cliente Supabase server
        const supabase = await createSupabaseServerClient();

        // Guardar token en la base de datos
        const { error: tokenError } = await supabase
            .from('email_confirmations')
            .insert({
                user_id: userId,
                token: confirmationToken,
                email: email,
                expires_at: expiresAt.toISOString(),
                created_at: new Date().toISOString()
            });

        if (tokenError) {
            console.error('❌ Error guardando token:', tokenError);
            // Si la tabla no existe, la creamos automáticamente
            if (tokenError.message.includes('relation "email_confirmations" does not exist')) {

                const { error: createTableError } = await supabase.rpc('create_email_confirmations_table');

                if (createTableError) {
                    console.error('❌ Error creando tabla:', createTableError);
                    return NextResponse.json(
                        { error: 'Error de configuración de base de datos' },
                        { status: 500 }
                    );
                }

                // Intentar insertar nuevamente
                const { error: retryError } = await supabase
                    .from('email_confirmations')
                    .insert({
                        user_id: userId,
                        token: confirmationToken,
                        email: email,
                        expires_at: expiresAt.toISOString(),
                        created_at: new Date().toISOString()
                    });

                if (retryError) {
                    console.error('❌ Error en segundo intento:', retryError);
                    return NextResponse.json(
                        { error: 'Error guardando token de confirmación' },
                        { status: 500 }
                    );
                }
            } else {
                return NextResponse.json(
                    { error: 'Error guardando token de confirmación' },
                    { status: 500 }
                );
            }
        }

        // Generar URL de confirmación (producción vs desarrollo)
        const isDevelopment = process.env.NODE_ENV === 'development';
        const baseUrl = isDevelopment
            ? 'http://localhost:3000'
            : (process.env.NEXT_PUBLIC_SITE_URL || 'https://taskelio.app');

        const confirmationUrl = `${baseUrl}/auth/confirm?token=${confirmationToken}`;


        // Generar HTML del email de confirmación
        const emailHtml = generateConfirmationEmail(userName || 'Usuario', confirmationUrl);

        // Enviar email usando Resend

        const emailResult = await resend.emails.send({
            from: 'Taskelio <noreply@taskelio.app>',
            to: [email],
            subject: '✅ Confirma tu cuenta en Taskelio',
            html: emailHtml
        });

        if (emailResult.error) {
            console.error('❌ Error enviando email:', emailResult.error);
            return NextResponse.json(
                { error: 'Error enviando email de confirmación', details: emailResult.error },
                { status: 500 }
            );
        }


        return NextResponse.json({
            success: true,
            message: 'Email de confirmación enviado exitosamente',
            emailId: emailResult.data?.id
        });

    } catch (error) {
        console.error('❌ Error general:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error },
            { status: 500 }
        );
    }
}

// Función para generar HTML del email de confirmación
function generateConfirmationEmail(userName: string, confirmationUrl: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirma tu cuenta - Taskelio</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8fafc;
            }
            .container {
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            }
            .header {
                text-align: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 30px;
                border-radius: 10px;
                margin-bottom: 30px;
            }
            .header h1 {
                color: white;
                margin: 0;
                font-size: 28px;
                font-weight: 700;
            }
            .header .subtitle {
                color: white;
                opacity: 0.9;
                margin: 10px 0 0 0;
                font-size: 16px;
            }
            .content {
                padding: 0 10px;
            }
            .content p {
                font-size: 16px;
                margin-bottom: 20px;
                line-height: 1.6;
            }
            .cta-button {
                display: block;
                width: fit-content;
                margin: 30px auto;
                background: #2563eb;
                color: white !important;
                padding: 16px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                text-align: center;
                transition: background-color 0.3s ease;
            }
            .cta-button:hover {
                background: #1d4ed8;
            }
            .backup-link {
                background: #f1f5f9;
                padding: 15px;
                border-radius: 8px;
                margin: 25px 0;
                font-size: 14px;
                color: #64748b;
            }
            .backup-link a {
                color: #2563eb;
                word-break: break-all;
            }
            .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                color: #64748b;
                font-size: 14px;
            }
            .warning {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                color: #92400e;
                padding: 15px;
                border-radius: 8px;
                margin: 20px 0;
                font-size: 14px;
            }
            .features {
                background: #f8fafc;
                padding: 20px;
                border-radius: 8px;
                margin: 25px 0;
            }
            .features h3 {
                color: #1e293b;
                margin: 0 0 15px 0;
                font-size: 18px;
            }
            .features ul {
                margin: 0;
                padding-left: 20px;
                color: #475569;
            }
            .features li {
                margin-bottom: 8px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 ¡Bienvenido a Taskelio!</h1>
                <p class="subtitle">Confirma tu cuenta y empieza a crecer</p>
            </div>

            <div class="content">
                <p><strong>Hola ${userName},</strong></p>
                
                <p>¡Gracias por unirte a <strong>Taskelio</strong>! Estamos emocionados de tenerte en nuestra plataforma.</p>
                
                <p>Para completar tu registro y activar todas las funcionalidades de tu cuenta, por favor confirma tu dirección de email haciendo clic en el botón de abajo:</p>

                <a href="${confirmationUrl}" class="cta-button">
                    ✅ Confirmar mi cuenta
                </a>

                <div class="features">
                    <h3>🚀 Lo que puedes hacer en Taskelio:</h3>
                    <ul>
                        <li>Gestionar contratos de servicios profesionales</li>
                        <li>Enviar propuestas y presupuestos</li>
                        <li>Controlar el tiempo de trabajo en proyectos</li>
                        <li>Generar informes y estadísticas</li>
                        <li>Automatizar tu flujo de trabajo</li>
                    </ul>
                </div>

                <div class="warning">
                    <strong>⏰ Importante:</strong> Este enlace de confirmación expirará en 24 horas. Si no confirmas tu cuenta dentro de este tiempo, deberás registrarte nuevamente.
                </div>

                <div class="backup-link">
                    <p><strong>¿Problemas con el botón?</strong></p>
                    <p>Copia y pega este enlace en tu navegador:</p>
                    <a href="${confirmationUrl}">${confirmationUrl}</a>
                </div>

                <p>Si no creaste una cuenta en Taskelio, puedes ignorar este email de forma segura.</p>
            </div>

            <div class="footer">
                <p><strong>¡Gracias por elegir Taskelio!</strong></p>
                <p>El equipo de Taskelio</p>
                <p style="margin-top: 15px; font-size: 12px; color: #94a3b8;">
                    Este email fue enviado automáticamente. Por favor no respondas a este mensaje.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
}