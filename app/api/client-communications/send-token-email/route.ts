import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getBaseUrlFromRequest } from '../../../../lib/url';

// Verificar variables de entorno de manera segura
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    supabaseUrl: supabaseUrl ? '✅ Configurada' : '❌ Faltante',
    serviceKey: supabaseServiceKey ? '✅ Configurada' : '❌ Faltante',
    resendKey: process.env.RESEND_API_KEY ? '✅ Configurada' : '❌ Faltante',
    fromEmail: process.env.FROM_EMAIL || 'No configurado'
});

export async function POST(request: NextRequest) {
    
    try {
        const body = await request.json();
        const { clientId, message, freelancerName } = body;
        

        if (!clientId) {
            return NextResponse.json(
                { error: 'ID de cliente requerido' },
                { status: 400 }
            );
        }

        // Verificar que las variables de entorno estén configuradas
        if (!supabaseUrl) {
            console.error('❌ SUPABASE_URL faltante');
            return NextResponse.json(
                { error: 'Error de configuración del servidor. SUPABASE_URL faltante.' },
                { status: 500 }
            );
        }

        // Intentar primero con service role, luego con anon key como fallback
        let supabase;
        if (supabaseServiceKey) {
            supabase = createClient(supabaseUrl, supabaseServiceKey);
        } else {
            const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (!anonKey) {
                return NextResponse.json(
                    { error: 'Error de configuración del servidor. Ninguna clave válida.' },
                    { status: 500 }
                );
            }
            supabase = createClient(supabaseUrl, anonKey);
        }

        // Obtener información del cliente
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .single();

            clientId, 
            found: !!client, 
            error: clientError?.message || 'ninguno'
        });

        if (clientError || !client) {
            return NextResponse.json(
                { error: 'Cliente no encontrado', details: clientError?.message },
                { status: 404 }
            );
        }

        if (!client.email) {
            return NextResponse.json(
                { error: 'El cliente no tiene email configurado' },
                { status: 400 }
            );
        }

            name: client.name, 
            email: client.email,
            company: client.company || 'Sin empresa'
        });

        // Buscar token existente activo - simplificado para anon key
        let token;
        
        try {
            const { data: existingToken, error: tokenError } = await supabase
                .from('client_tokens')
                .select('token')
                .eq('client_id', clientId)
                .eq('is_active', true)
                .single();

            if (existingToken && !tokenError) {
                token = existingToken.token;
            } else {
                
                // Generar token manualmente
                const manualToken = generateManualToken();
                
                // Intentar insertar el token en la base de datos
                const { data: insertData, error: insertError } = await supabase
                    .from('client_tokens')
                    .insert({
                        client_id: clientId,
                        token: manualToken,
                        is_active: true,
                        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                    })
                    .select('token')
                    .single();

                if (insertError) {
                    console.error('❌ Error insertando token:', insertError);
                    // Usar token temporal sin guardar para desarrollo
                    token = manualToken;
                } else {
                    token = insertData.token;
                }
            }
        } catch (error) {
            console.error('❌ Error en gestión de tokens:', error);
            // Generar token temporal para desarrollo
            token = generateManualToken();
        }

        // Generar URL del portal usando detección automática de host/puerto
        const baseUrl = getBaseUrlFromRequest(request);
        const portalUrl = `${baseUrl}/client-portal/${token}`;
        

        // Preparar el email
        const emailContent = {
            to: client.email,
            subject: `Portal de Comunicación - ${freelancerName || 'Tu Freelancer'}`,
            html: generateEmailTemplate({
                clientName: client.name,
                freelancerName: freelancerName || 'Tu Freelancer',
                portalUrl,
                message: message || 'Te comparto el acceso a nuestro portal de comunicación seguro.',
                companyName: client.company
            })
        };

        // Enviar email usando el proveedor configurado
        try {
            await sendEmail(emailContent);
        } catch (emailError) {
            console.error('❌ Error enviando email:', emailError);
            // No lanzar error aquí para que el token se genere aunque falle el email
        }

        // Registrar el envío en logs (opcional) - simplificado
        try {
            await supabase
                .from('client_notifications')
                .insert({
                    client_id: clientId,
                    type: 'portal_access',
                    title: 'Portal de comunicación enviado',
                    content: `Email enviado a ${client.email}`,
                    is_sent: true,
                    sent_at: new Date().toISOString()
                });
        } catch (logError) {
        }

        return NextResponse.json({
            success: true,
            message: 'Token generado y email preparado',
            portalUrl,
            clientEmail: client.email,
            // En producción, quita esta información sensible
            emailPreview: emailContent
        });

    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}

function generateEmailTemplate({
    clientName,
    freelancerName,
    portalUrl,
    message,
    companyName
}: {
    clientName: string;
    freelancerName: string;
    portalUrl: string;
    message: string;
    companyName?: string;
}) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portal de Comunicación</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 30px; }
        .greeting { font-size: 18px; margin-bottom: 20px; color: #2d3748; }
        .message { background: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
        .security-note { background: #fef3cd; border: 1px solid #f6e05e; padding: 15px; border-radius: 6px; margin: 20px 0; color: #744210; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Portal de Comunicación Seguro</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Hola ${clientName}${companyName ? ` (${companyName})` : ''},
            </div>
            
            <div class="message">
                ${message}
            </div>
            
            <p>He configurado un portal de comunicación seguro para nosotros. A través de este portal podrás:</p>
            
            <ul>
                <li>📝 Enviar mensajes directamente</li>
                <li>📎 Compartir archivos de forma segura</li>
                <li>📊 Ver el historial de nuestras conversaciones</li>
                <li>🔒 Comunicarte sin necesidad de crear cuentas adicionales</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="${portalUrl}" class="cta-button">
                    🚀 Acceder al Portal de Comunicación
                </a>
            </div>
            
            <div class="security-note">
                <strong>🔐 Nota de Seguridad:</strong> Este enlace es único y personal. No lo compartas con terceros. El portal está diseñado para mantener nuestras comunicaciones privadas y profesionales.
            </div>
            
            <p>Si tienes alguna duda sobre cómo usar el portal, no dudes en contactarme.</p>
            
            <p>Saludos cordiales,<br>
            <strong>${freelancerName}</strong></p>
        </div>
        
        <div class="footer">
            <p>Este es un mensaje automático del sistema de gestión de proyectos.</p>
            <p>Portal seguro desarrollado con tecnología de última generación.</p>
        </div>
    </div>
</body>
</html>`;
}

// Función para enviar emails con múltiples proveedores
async function sendEmail(emailContent: any) {
    const { to, subject, html } = emailContent;

    // OPCIÓN 1: RESEND (Recomendado)
    if (process.env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: process.env.FROM_EMAIL || 'Taskelio <onboarding@resend.dev>',
                to: [to],
                subject,
                html,
            }),
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`Error de Resend: ${result.message || response.statusText}`);
        }

        return { provider: 'Resend', id: result.id };
    }

    // OPCIÓN 2: SENDGRID
    if (process.env.SENDGRID_API_KEY) {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email: to }] }],
                from: { email: process.env.FROM_EMAIL || 'noreply@yourdomain.com', name: 'Taskelio' },
                subject,
                content: [{ type: 'text/html', value: html }],
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Error de SendGrid: ${error}`);
        }

        return { provider: 'SendGrid', status: 'sent' };
    }

    // OPCIÓN 3: POSTMARK
    if (process.env.POSTMARK_API_KEY) {
        const response = await fetch('https://api.postmarkapp.com/email', {
            method: 'POST',
            headers: {
                'X-Postmark-Server-Token': process.env.POSTMARK_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                From: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
                To: to,
                Subject: subject,
                HtmlBody: html,
            }),
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(`Error de Postmark: ${result.Message || response.statusText}`);
        }

        return { provider: 'Postmark', id: result.MessageID };
    }

    // OPCIÓN 4: NODEMAILER (Gmail/SMTP)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        // Para Nodemailer necesitarías instalarlo: npm install nodemailer
        
        // const nodemailer = require('nodemailer');
        // const transporter = nodemailer.createTransporter({ ... });
        // await transporter.sendMail({ ... });
        
        throw new Error('Nodemailer no implementado. Usa Resend, SendGrid o Postmark');
    }

    // Si no hay ningún proveedor configurado
    
    throw new Error('No hay proveedor de email configurado. Revisa tu archivo .env.local');
}

// Función auxiliar para generar tokens manualmente
function generateManualToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
