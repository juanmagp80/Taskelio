import { createSupabaseServerClient } from '@/src/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {

        const { invoiceId } = await request.json();

        if (!invoiceId) {
            return NextResponse.json(
                { error: 'ID de la factura requerido' },
                { status: 400 }
            );
        }

        const supabase = await createSupabaseServerClient();

        // Obtener datos de autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('❌ Error de autenticación:', authError);
            return NextResponse.json(
                { error: 'Usuario no autenticado' },
                { status: 401 }
            );
        }


        // Obtener datos del perfil
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('❌ Error obteniendo perfil:', profileError);
        }

        // Obtener datos de la empresa
        const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (companyError) {
        }

        // Validar configuración de email
        if (!process.env.RESEND_API_KEY) {
            console.error('❌ RESEND_API_KEY no está configurado');
            return NextResponse.json(
                { error: 'Configuración de email no disponible' },
                { status: 500 }
            );
        }

        // Obtener factura
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', invoiceId)
            .single();

        if (invoiceError || !invoice) {
            console.error('❌ Error obteniendo factura:', invoiceError);
            return NextResponse.json(
                { error: 'Factura no encontrada' },
                { status: 404 }
            );
        }

        // Validar que la factura tenga email del cliente
        if (!invoice.client_email) {
            console.error('❌ La factura no tiene email del cliente');
            return NextResponse.json(
                { error: 'La factura no tiene email del cliente configurado' },
                { status: 400 }
            );
        }


        // Generar HTML del email
        const emailHtml = generateInvoiceEmailHtml(invoice, profile, companyData);

        // Generar PDF de la factura
        const pdfBuffer = await generateInvoicePDF(invoice, profile, companyData);

        // Configurar el email
        const senderName = companyData?.name || profile?.full_name || user.email?.split('@')[0] || 'Taskelio';
        const fromEmail = `${senderName} <noreply@taskelio.app>`;

        const emailData = {
            from: fromEmail,
            to: [invoice.client_email],
            subject: `Factura ${invoice.invoice_number || 'Nueva Factura'}`,
            html: emailHtml,
            attachments: [
                {
                    filename: `Factura_${invoice.invoice_number?.replace(/[^a-zA-Z0-9]/g, '_') || 'Factura'}.pdf`,
                    content: pdfBuffer,
                }
            ]
        };

        const emailResult = await resend.emails.send(emailData);

        if (emailResult.error) {
            console.error('❌ Error enviando email:', emailResult.error);
            return NextResponse.json(
                { error: 'Error enviando email', details: emailResult.error },
                { status: 500 }
            );
        }


        // Actualizar la factura como enviada
        const { error: updateError } = await supabase
            .from('invoices')
            .update({
                sent_at: new Date().toISOString(),
                status: 'sent'
            })
            .eq('id', invoiceId);

        if (updateError) {
            console.error('❌ Error actualizando factura:', updateError);
        }

        return NextResponse.json({
            success: true,
            message: 'Factura enviada exitosamente',
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

// Función para generar HTML del email de factura
function generateInvoiceEmailHtml(invoice: any, profile: any, companyData: any): string {
    const companyName = companyData?.name || profile?.full_name || 'Empresa';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura</title>
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
                border-bottom: 3px solid #2563eb;
                padding-bottom: 30px;
                margin-bottom: 30px;
            }
            .header h1 {
                color: #2563eb;
                font-size: 28px;
                font-weight: 700;
                margin: 0 0 10px 0;
            }
            .content p {
                font-size: 16px;
                margin-bottom: 15px;
            }
            .invoice-details {
                background: #f1f5f9;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .invoice-details h3 {
                color: #1e293b;
                font-size: 18px;
                font-weight: 600;
                margin: 0 0 15px 0;
            }
            .detail-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                padding: 5px 0;
            }
            .detail-label {
                font-weight: 600;
                color: #475569;
            }
            .detail-value {
                color: #1e293b;
                font-weight: 500;
            }
            .attachment-notice {
                background: #dbeafe;
                border: 1px solid #3b82f6;
                border-radius: 8px;
                padding: 16px;
                margin: 25px 0;
                text-align: center;
            }
            .attachment-notice h4 {
                color: #1d4ed8;
                font-size: 20px;
                font-weight: 700;
                margin: 0 0 8px 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📄 Factura</h1>
            </div>

            <div class="content">
                <p>Estimado/a <strong>${invoice.client_name || 'Cliente'}</strong>,</p>
                
                <p>Adjunto encontrará la factura correspondiente a los servicios prestados.</p>

                <div class="invoice-details">
                    <h3>📄 Detalles de la Factura</h3>
                    <div class="detail-row">
                        <span class="detail-label">Número de Factura:</span>
                        <span class="detail-value">${invoice.invoice_number || 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Fecha de Emisión:</span>
                        <span class="detail-value">${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('es-ES') : 'N/A'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Importe Total:</span>
                        <span class="detail-value">${invoice.total || '0'} €</span>
                    </div>
                </div>

                <div class="attachment-notice">
                    <h4>📎 PDF Adjunto</h4>
                    <p>La factura completa se encuentra adjunta a este email en formato PDF</p>
                </div>

                <p>Si tiene alguna pregunta sobre esta factura, no dude en ponerse en contacto con nosotros.</p>

                <p>Gracias por su confianza.</p>
            </div>

            <div class="footer">
                <p><strong>${companyName}</strong></p>
                ${companyData?.email ? `<p>${companyData.email}</p>` : ''}
                ${companyData?.phone ? `<p>${companyData.phone}</p>` : ''}
            </div>
        </div>
    </body>
    </html>
    `;
}

// Función para generar PDF de la factura
async function generateInvoicePDF(invoice: any, profile: any, companyData: any): Promise<Buffer> {
    const { jsPDF } = await import('jspdf');

    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const marginLeft = 20;
    const marginTop = 20;
    const pageWidth = 210;
    let currentY = marginTop;

    // Función para limpiar texto
    const cleanText = (text: string) => {
        if (!text) return '';
        return text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .normalize('NFC')
            .replace(/á/g, 'a').replace(/Á/g, 'A')
            .replace(/é/g, 'e').replace(/É/g, 'E')
            .replace(/í/g, 'i').replace(/Í/g, 'I')
            .replace(/ó/g, 'o').replace(/Ó/g, 'O')
            .replace(/ú/g, 'u').replace(/Ú/g, 'U')
            .replace(/[^\x20-\x7E\nñÑ¿¡€]/g, '')
            .trim();
    };

    // Encabezado
    doc.setFontSize(24);
    doc.setTextColor(37, 99, 235);
    doc.text('FACTURA', marginLeft, currentY);
    currentY += 15;

    // Número de factura
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Numero: ${invoice.invoice_number || 'N/A'}`, marginLeft, currentY);
    currentY += 7;
    doc.text(`Fecha: ${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString('es-ES') : 'N/A'}`, marginLeft, currentY);
    currentY += 15;

    // Datos del emisor
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text('DATOS DEL EMISOR', marginLeft, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    if (companyData?.name || profile?.full_name) {
        doc.text(cleanText(companyData?.name || profile?.full_name), marginLeft, currentY);
        currentY += 5;
    }
    if (companyData?.tax_id) {
        doc.text(`NIF/CIF: ${companyData.tax_id}`, marginLeft, currentY);
        currentY += 5;
    }
    if (companyData?.address) {
        doc.text(cleanText(companyData.address), marginLeft, currentY);
        currentY += 5;
    }
    if (companyData?.email) {
        doc.text(companyData.email, marginLeft, currentY);
        currentY += 5;
    }
    currentY += 10;

    // Datos del cliente
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text('DATOS DEL CLIENTE', marginLeft, currentY);
    currentY += 8;

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    if (invoice.client_name) {
        doc.text(cleanText(invoice.client_name), marginLeft, currentY);
        currentY += 5;
    }
    if (invoice.client_nif) {
        doc.text(`NIF/CIF: ${invoice.client_nif}`, marginLeft, currentY);
        currentY += 5;
    }
    if (invoice.client_address) {
        doc.text(cleanText(invoice.client_address), marginLeft, currentY);
        currentY += 5;
    }
    currentY += 15;

    // Conceptos
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text('CONCEPTOS', marginLeft, currentY);
    currentY += 10;

    // Tabla de conceptos
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    // Cabecera de tabla
    doc.setFillColor(240, 240, 240);
    doc.rect(marginLeft, currentY - 5, 170, 7, 'F');
    doc.text('Descripcion', marginLeft + 2, currentY);
    doc.text('Cant.', marginLeft + 100, currentY);
    doc.text('Precio', marginLeft + 120, currentY);
    doc.text('Total', marginLeft + 150, currentY);
    currentY += 8;

    // Items
    const items = invoice.items || [];
    for (const item of items) {
        if (currentY > 260) {
            doc.addPage();
            currentY = marginTop;
        }
        doc.text(cleanText(item.description || ''), marginLeft + 2, currentY);
        doc.text(String(item.quantity || 0), marginLeft + 100, currentY);
        doc.text(`${item.unit_price || 0}€`, marginLeft + 120, currentY);
        doc.text(`${item.total || 0}€`, marginLeft + 150, currentY);
        currentY += 7;
    }

    currentY += 10;

    // Totales
    doc.setFontSize(11);
    doc.text(`Subtotal: ${invoice.subtotal || 0}€`, marginLeft + 120, currentY);
    currentY += 7;
    doc.text(`IVA (${invoice.vat_rate || 21}%): ${invoice.vat_amount || 0}€`, marginLeft + 120, currentY);
    currentY += 7;
    doc.setFontSize(13);
    doc.setTextColor(37, 99, 235);
    doc.text(`TOTAL: ${invoice.total || 0}€`, marginLeft + 120, currentY);

    // Notas
    if (invoice.notes) {
        currentY += 15;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('NOTAS:', marginLeft, currentY);
        currentY += 5;
        const notesLines = doc.splitTextToSize(cleanText(invoice.notes), 170);
        doc.text(notesLines, marginLeft, currentY);
    }

    const pdfArrayBuffer = doc.output('arraybuffer');
    return Buffer.from(pdfArrayBuffer);
}
