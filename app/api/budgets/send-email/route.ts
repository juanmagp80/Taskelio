import { createSupabaseServerClient } from '@/src/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {

        const { budgetId } = await request.json();

        if (!budgetId) {
            console.error('❌ Budget ID no proporcionado');
            return NextResponse.json(
                { error: 'Budget ID is required' },
                { status: 400 }
            );
        }


        // Verificar autenticación
        const supabase = await createSupabaseServerClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('❌ Error de autenticación:', authError);
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }


        // Obtener el presupuesto completo con cliente y items
        const { data: budget, error: budgetError } = await supabase
            .from('budgets')
            .select(`
                *,
                clients:client_id (
                    id,
                    name,
                    email,
                    company
                ),
                budget_items (
                    id,
                    title,
                    description,
                    quantity,
                    unit_price,
                    total,
                    type
                )
            `)
            .eq('id', budgetId)
            .eq('user_id', user.id)
            .single();

        if (budgetError || !budget) {
            console.error('❌ Error obteniendo presupuesto:', budgetError);
            return NextResponse.json(
                { error: 'Budget not found' },
                { status: 404 }
            );
        }


        if (!budget.clients?.email) {
            return NextResponse.json(
                { error: 'Client email not found' },
                { status: 400 }
            );
        }

        // Obtener información del perfil del usuario
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, company, email, phone, website')
            .eq('id', user.id)
            .single();


        // Verificar configuración de Resend

        if (!process.env.RESEND_API_KEY) {
            console.warn('⚠️ RESEND_API_KEY no configurada, enviando simulado');
            return await sendSimulatedEmail(budget, supabase, budgetId, user.id);
        }


        // Generar contenido del email
        const emailHtml = generateBudgetEmailHtml(budget, profile);
        const fromEmail = process.env.FROM_EMAIL || 'noreply@resend.dev';

        // Email de respuesta (reply-to) - SIEMPRE usar el email del usuario autenticado
        // Este es el email al que deben llegar las respuestas del cliente
        const replyToEmail = user.email || fromEmail;

        // Usar un nombre personalizado en el From para que sea más claro
        const fromName = profile?.full_name || profile?.company || 'Taskelio';
        const formattedFrom = `${fromName} <${fromEmail}>`;


        try {
            // Enviar email con Resend

            const emailResult = await resend.emails.send({
                from: formattedFrom,
                to: budget.clients.email,
                replyTo: replyToEmail,
                subject: `Presupuesto: ${budget.title}`,
                html: emailHtml,
                headers: {
                    'X-Entity-Ref-ID': budgetId,
                    'X-Mailer': 'Taskelio Budget System',
                    'X-Priority': '3',
                    'X-MSMail-Priority': 'Normal',
                    'Importance': 'Normal',
                    'Reply-To': replyToEmail
                }
            });


            if (emailResult.error) {
                console.error('❌ Error enviando email:', emailResult.error);
                return NextResponse.json(
                    { error: 'Failed to send email: ' + emailResult.error.message },
                    { status: 500 }
                );
            }


            // Actualizar el estado del presupuesto
            const { error: updateError } = await supabase
                .from('budgets')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString()
                })
                .eq('id', budgetId)
                .eq('user_id', user.id);

            if (updateError) {
                console.error('❌ Error actualizando presupuesto:', updateError);
                return NextResponse.json(
                    { error: 'Email sent but failed to update budget status' },
                    { status: 500 }
                );
            }


            return NextResponse.json({
                success: true,
                message: '📧 Presupuesto enviado por email exitosamente',
                budgetTitle: budget.title,
                clientEmail: budget.clients.email,
                emailId: emailResult.data?.id,
                sentAt: new Date().toISOString()
            });

        } catch (emailError) {
            console.error('❌ Error en Resend (catch):', emailError);
            console.error('❌ Tipo de error:', typeof emailError);
            if (emailError instanceof Error) {
                console.error('❌ Stack trace:', emailError.stack);
            } else {
                console.error('❌ Stack trace:', emailError);
            }
            let errorMsg = 'Failed to send email: ';
            if (emailError instanceof Error) {
                errorMsg += emailError.message;
            } else {
                errorMsg += String(emailError);
            }
            return NextResponse.json(
                { error: errorMsg },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('❌ Error en send-email route:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Función de fallback para envío simulado
async function sendSimulatedEmail(budget: any, supabase: any, budgetId: string, userId: string) {

    // Simular delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Actualizar estado
    const { error: updateError } = await supabase
        .from('budgets')
        .update({
            status: 'sent',
            sent_at: new Date().toISOString()
        })
        .eq('id', budgetId)
        .eq('user_id', userId);

    if (updateError) {
        console.error('❌ Error actualizando presupuesto:', updateError);
        return NextResponse.json(
            { error: 'Failed to update budget status' },
            { status: 500 }
        );
    }

    return NextResponse.json({
        success: true,
        message: '📧 Presupuesto enviado exitosamente (simulado)',
        budgetTitle: budget.title,
        clientEmail: budget.clients.email,
        sentAt: new Date().toISOString(),
        simulated: true
    });
}

// Generar HTML del email
function generateBudgetEmailHtml(budget: any, profile: any): string {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const subtotal = budget.total_amount || 0;
    const taxAmount = subtotal * (budget.tax_rate / 100);
    const total = subtotal + taxAmount;

    // Obtener información de la empresa/freelancer
    // Buscar el nombre del emisor en este orden de prioridad:
    // 1. Nombre de la empresa (si está configurado)
    // 2. Nombre completo del usuario
    // 3. Email del usuario (sin el dominio)
    const getUserNameFromEmail = (email: string) => {
        return email.split('@')[0].replace(/[._-]/g, ' ').split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };
    
    const companyName = profile?.company || 
                        profile?.full_name || 
                        (profile?.email ? getUserNameFromEmail(profile.email) : 'Prestador del Servicio');
    const contactEmail = profile?.email || 'contacto@ejemplo.com';
    const contactPhone = profile?.phone || '';
    const website = profile?.website || '';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Presupuesto - ${budget.title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        .container {
            background-color: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #007bff;
            margin: 0;
            font-size: 2.5em;
            font-weight: 600;
        }
        .company-info {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
        }
        .company-name {
            font-size: 1.5em;
            font-weight: 600;
            color: #007bff;
            margin-bottom: 10px;
        }
        .contact-info {
            color: #666;
            font-size: 0.9em;
            line-height: 1.4;
        }
        .budget-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
        }
        .info-section h3 {
            color: #007bff;
            border-bottom: 2px solid #e9ecef;
            padding-bottom: 8px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        .info-item {
            margin-bottom: 8px;
            display: flex;
            align-items: center;
        }
        .info-label {
            font-weight: 600;
            color: #495057;
            min-width: 80px;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .items-table th,
        .items-table td {
            border: 1px solid #dee2e6;
            padding: 12px;
            text-align: left;
        }
        .items-table th {
            background-color: #007bff;
            color: white;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85em;
        }
        .items-table tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        .items-table tr:hover {
            background-color: #e3f2fd;
        }
        .total-section {
            text-align: right;
            border-top: 2px solid #007bff;
            padding-top: 20px;
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
        }
        .total-final {
            font-size: 1.4em;
            font-weight: bold;
            color: #007bff;
            border-top: 2px solid #007bff;
            padding-top: 15px;
            margin-top: 10px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding: 25px;
            background-color: #f8f9fa;
            border-radius: 8px;
            color: #666;
            font-size: 0.9em;
            border-top: 1px solid #dee2e6;
        }
        .response-info {
            background-color: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        @media (max-width: 600px) {
            .budget-info { grid-template-columns: 1fr; }
            .container { padding: 20px; }
            .total-row { flex-direction: column; text-align: right; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>PRESUPUESTO</h1>
            <p style="margin: 10px 0 0 0; color: #666; font-size: 1.1em;">Propuesta comercial profesional</p>
        </div>

        <div class="company-info">
            <div class="company-name">${companyName}</div>
            <div class="contact-info">
                ${contactEmail ? `📧 ${contactEmail}` : ''}
                ${contactPhone ? ` • 📞 ${contactPhone}` : ''}
                ${website ? ` • 🌐 ${website}` : ''}
            </div>
        </div>

        <div class="budget-info">
            <div class="info-section">
                <h3>📋 Información del Cliente</h3>
                <div class="info-item">
                    <span class="info-label">Cliente:</span>
                    <span>${budget.clients?.name || 'Cliente'}</span>
                </div>
                ${budget.clients?.company ? `
                <div class="info-item">
                    <span class="info-label">Empresa:</span>
                    <span>${budget.clients.company}</span>
                </div>` : ''}
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span>${budget.clients?.email}</span>
                </div>
            </div>
            <div class="info-section">
                <h3>📊 Detalles del Presupuesto</h3>
                <div class="info-item">
                    <span class="info-label">Número:</span>
                    <span>#${budget.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Fecha:</span>
                    <span>${formatDate(budget.created_at)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Estado:</span>
                    <span style="color: #28a745; font-weight: 600;">✅ Enviado</span>
                </div>
                ${budget.expires_at ? `
                <div class="info-item">
                    <span class="info-label">Válido hasta:</span>
                    <span style="color: #dc3545; font-weight: 600;">${formatDate(budget.expires_at)}</span>
                </div>` : ''}
            </div>
        </div>

        <h3 style="color: #007bff; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">${budget.title}</h3>
        ${budget.description ? `<div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px; color: #666; border-left: 4px solid #007bff;"><strong>Descripción:</strong> ${budget.description}</div>` : ''}

        <table class="items-table">
            <thead>
                <tr>
                    <th>Concepto</th>
                    <th>Descripción</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${budget.budget_items?.map((item: any) => `
                    <tr>
                        <td><strong>${item.title}</strong></td>
                        <td>${item.description || '-'}</td>
                        <td style="text-align: center;">${item.quantity}</td>
                        <td style="text-align: right;">${formatCurrency(item.unit_price)}</td>
                        <td style="text-align: right; font-weight: 600;">${formatCurrency(item.total)}</td>
                    </tr>
                `).join('') || '<tr><td colspan="5" style="text-align: center; color: #666; font-style: italic;">No hay items en este presupuesto</td></tr>'}
            </tbody>
        </table>

        <div class="total-section">
            <div class="total-row">
                <span><strong>Subtotal:</strong></span>
                <span style="font-weight: 600;">${formatCurrency(subtotal)}</span>
            </div>
            <div class="total-row">
                <span><strong>IVA (${budget.tax_rate}%):</strong></span>
                <span style="font-weight: 600;">${formatCurrency(taxAmount)}</span>
            </div>
            <div class="total-row total-final">
                <span><strong>TOTAL:</strong></span>
                <span><strong>${formatCurrency(total)}</strong></span>
            </div>
        </div>

        ${budget.notes ? `
            <div style="margin-top: 30px; padding: 20px; background-color: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h3 style="color: #856404; margin-top: 0;">📝 Notas adicionales</h3>
                <p style="color: #856404; margin-bottom: 0;">${budget.notes}</p>
            </div>
        ` : ''}

        ${budget.terms_conditions ? `
            <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #6c757d;">
                <h3 style="color: #495057; margin-top: 0;">📋 Términos y condiciones</h3>
                <p style="color: #495057; margin-bottom: 0;">${budget.terms_conditions}</p>
            </div>
        ` : ''}

        <div class="response-info">
            <h3 style="color: #0056b3; margin-top: 0;">💬 ¿Tienes preguntas?</h3>
            <p style="margin-bottom: 0; color: #0056b3;">
                Puedes responder directamente a este email o contactarme en: <strong>${contactEmail}</strong>
            </p>
        </div>

        <div class="footer">
            <p>Este es un email automático generado por nuestro sistema de gestión.</p>
            <p style="margin-bottom: 0;">Gracias por confiar en nuestros servicios profesionales.</p>
        </div>
    </div>
</body>
</html>
    `;
}