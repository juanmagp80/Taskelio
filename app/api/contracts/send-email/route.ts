import { createSupabaseServerClient } from '@/src/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
    try {

        const { contractId } = await request.json();

        if (!contractId) {
            return NextResponse.json(
                { error: 'ID del contrato requerido' },
                { status: 400 }
            );
        }

        // Crear cliente Supabase server
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


        // Validar configuración de email
        if (!process.env.RESEND_API_KEY) {
            console.error('❌ RESEND_API_KEY no está configurado');
            return NextResponse.json(
                { error: 'Configuración de email no disponible' },
                { status: 500 }
            );
        }


        // Obtener contrato
        const { data: contract, error: contractError } = await supabase
            .from('contracts')
            .select('*')
            .eq('id', contractId)
            .single();

        if (contractError || !contract) {
            console.error('❌ Error obteniendo contrato:', contractError);
            return NextResponse.json(
                { error: 'Contrato no encontrado' },
                { status: 404 }
            );
        }

        // Obtener cliente por separado para datos frescos
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('id, name, address, email, company, phone, nif')
            .eq('id', contract.client_id)
            .single();

        if (clientError || !clientData) {
            console.error('❌ Error obteniendo cliente:', clientError);
            return NextResponse.json(
                { error: 'Cliente no encontrado' },
                { status: 404 }
            );
        }

        // Combinar datos
        contract.clients = clientData;

        // Obtener datos de la empresa del usuario usando user_id
        let companyData = null;
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('name, email, phone, address, tax_id')
            .eq('user_id', user.id)
            .single();

        if (!companyError && company) {
            companyData = company;
        } else {
        }

        if (contractError) {
            console.error('❌ Error obteniendo contrato:', contractError);
            return NextResponse.json(
                { error: 'Contrato no encontrado' },
                { status: 404 }
            );
        }

        if (!contract.clients?.email) {
            console.error('❌ El cliente no tiene email configurado');
            return NextResponse.json(
                { error: 'El cliente no tiene email configurado' },
                { status: 400 }
            );
        }


        try {
            const pdfBuffer = await generateContractPDF(contract, profile, companyData);

            // Generar HTML del email
            const emailHtml = generateEmailHtml(contract, profile, user, companyData);

            // Configurar el email con el PDF adjunto usando dominio verificado
            const senderName = companyData?.name || profile?.full_name || user.email?.split('@')[0] || 'Freelancer';
            const fromEmail = `${senderName} <noreply@taskelio.app>`;

            const emailData = {
                from: fromEmail,
                to: [contract.clients.email],
                subject: `Contrato de Servicios - ${contract.title}`,
                html: emailHtml,
                attachments: [
                    {
                        filename: `Contrato_${contract.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
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


            // Actualizar el contrato como enviado
            const { error: updateError } = await supabase
                .from('contracts')
                .update({
                    sent_at: new Date().toISOString(),
                    status: 'sent'
                })
                .eq('id', contractId);

            if (updateError) {
                console.error('❌ Error actualizando contrato:', updateError);
            }

            return NextResponse.json({
                success: true,
                message: 'Contrato enviado exitosamente',
                emailId: emailResult.data?.id
            });

        } catch (pdfError) {
            console.error('❌ Error generando PDF:', pdfError);
            return NextResponse.json(
                { error: 'Error generando PDF del contrato', details: pdfError },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('❌ Error general:', error);
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error },
            { status: 500 }
        );
    }
}

// Función para generar HTML del email
function generateEmailHtml(contract: any, profile: any, user: any, companyData: any = null): string {
    // Usar nombre de empresa, nombre completo, o extraer nombre del email
    const extractNameFromEmail = (email: string) => {
        return email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    // Priorizar nombre de empresa de la tabla companies, luego profile, luego extraer del email
    const companyName = companyData?.name || profile?.company_name || profile?.full_name ||
        (user?.email ? extractNameFromEmail(user.email) : 'Freelancer');
    const userName = profile?.full_name ||
        (user?.email ? extractNameFromEmail(user.email) : 'Freelancer');


    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contrato de Servicios</title>
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
            .header .subtitle {
                color: #64748b;
                font-size: 22px;
                font-weight: 700;
                margin: 0;
            }
            .content p {
                font-size: 16px;
                margin-bottom: 15px;
            }
            .contract-details {
                background: #f1f5f9;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .contract-details h3 {
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
                font-size: 32px;
                font-weight: 700;
                margin: 0 0 8px 0;
            }
            .attachment-notice p {
                color: #1e40af;
                font-size: 14px;
                margin: 0;
            }
            .footer {
                text-align: center;
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
            }
            .footer p {
                font-size: 16px;
                color: #64748b;
            }
            .footer .signature {
                font-size: 14px;
                color: #94a3b8;
                margin-top: 15px;
            }
            .cta-section {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 25px;
                border-radius: 8px;
                text-align: center;
                margin: 25px 0;
            }
            .cta-section h3 {
                margin: 0 0 10px 0;
                font-size: 14px;
                opacity: 0.9;
            }
            .company-info {
                text-align: center;
                margin-bottom: 20px;
            }
            .company-info h2 {
                color: #1e293b;
                margin: 0 0 5px 0;
                font-size: 24px;
            }
            .company-info p {
                margin: 10px 0 0 0;
                font-size: 18px;
                opacity: 0.9;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📋 Contrato de Servicios</h1>
                <p class="subtitle">Documento contractual</p>
            </div>

            <div class="company-info">
                <h2>${companyName}</h2>
                <p>Propuesta contractual profesional</p>
            </div>

            <div class="content">
                <p>Estimado/a <strong>${contract.clients?.name || 'Cliente'}</strong>,</p>
                
                <p>Nos complace enviarle el contrato de servicios para su revisión y firma. Este documento establece los términos y condiciones de nuestros servicios profesionales.</p>

                <div class="contract-details">
                    <h3>📄 Detalles del Contrato</h3>
                    <div class="detail-row">
                        <span class="detail-label">Título:</span>
                        <span class="detail-value">${contract.title}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Tipo de Servicio:</span>
                        <span class="detail-value">${contract.service_type || 'General'}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Cliente:</span>
                        <span class="detail-value">${contract.clients?.name}</span>
                    </div>
                    ${contract.clients?.company ? `
                    <div class="detail-row">
                        <span class="detail-label">Empresa:</span>
                        <span class="detail-value">${contract.clients.company}</span>
                    </div>
                    ` : ''}
                    <div class="detail-row">
                        <span class="detail-label">Fecha de Creación:</span>
                        <span class="detail-value">${new Date(contract.created_at).toLocaleDateString('es-ES')}</span>
                    </div>
                </div>

                <div class="attachment-notice">
                    <h4>📎 PDF Adjunto</h4>
                    <p>El contrato completo se encuentra adjunto a este email en formato PDF</p>
                </div>

                <div class="cta-section">
                    <h3>Próximos Pasos</h3>
                    <p style="margin: 0; color: #4aacf7ff; font-weight: 600;">
                        Por favor, revise el contrato adjunto y no dude en contactarnos si tiene alguna pregunta o comentario.
                    </p>
                </div>

                <p>Si tiene alguna pregunta sobre este contrato, no dude en ponerse en contacto con nosotros. Estamos aquí para ayudarle en todo lo que necesite.</p>
            </div>

            <div class="footer">
                <p><strong>Gracias por confiar en nosotros</strong></p>
                <div class="signature">
                    <p>${userName}<br>
                    ${companyName}</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

// Función para generar PDF del contrato usando jsPDF (formato unificado igual al de la web)
async function generateContractPDF(contract: any, profile: any, companyData: any = null): Promise<Buffer> {
    const { jsPDF } = await import('jspdf');

    try {
        // Crear documento PDF con jsPDF
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            putOnlyUsedFonts: true,
            compress: true
        });

        // Configuración
        const marginLeft = 15;
        const marginTop = 20;
        const pageWidth = 210; // A4 width in mm
        const contentWidth = pageWidth - (marginLeft * 2);

        // Función para limpiar texto y convertir a caracteres seguros para jsPDF
        const cleanText = (text: string) => {
            if (!text) return '';

            return text
                // Normalizar caracteres Unicode primero
                .normalize('NFD')
                // Remover marcas diacríticas (acentos) excepto ñ
                .replace(/[\u0300-\u036f]/g, '')
                // Normalizar de vuelta
                .normalize('NFC')
                // Reemplazos específicos para caracteres españoles
                .replace(/á/g, 'a').replace(/Á/g, 'A')
                .replace(/é/g, 'e').replace(/É/g, 'E')
                .replace(/í/g, 'i').replace(/Í/g, 'I')
                .replace(/ó/g, 'o').replace(/Ó/g, 'O')
                .replace(/ú/g, 'u').replace(/Ú/g, 'U')
                .replace(/ü/g, 'u').replace(/Ü/g, 'U')
                // Mantener ñ y Ñ
                // Remover caracteres no imprimibles y especiales problemáticos
                .replace(/[^\x20-\x7E\nñÑ¿¡€]/g, '')
                // Limpiar comillas y llaves
                .replace(/["''""]/g, "'")
                .replace(/[{}]/g, "")
                .trim();
        };

        let currentY = marginTop;

        // Header principal
        doc.setFontSize(20);
        doc.setTextColor(37, 99, 235);
        const title = cleanText('CONTRATO DE SERVICIOS PROFESIONALES');
        const titleWidth = doc.getTextWidth(title);
        const titleX = (pageWidth - titleWidth) / 2;
        doc.text(title, titleX, currentY);
        currentY += 8;

        doc.setFontSize(14);
        doc.setTextColor(100, 100, 100);
        const subtitle = cleanText('DOCUMENTO OFICIAL');
        const subtitleWidth = doc.getTextWidth(subtitle);
        const subtitleX = (pageWidth - subtitleWidth) / 2;
        doc.text(subtitle, subtitleX, currentY);
        currentY += 6;

        // Número de contrato
        doc.setFontSize(12);
        const contractNumber = cleanText(`Numero de Contrato: CONT-2025-${contract.id?.substring(0, 4) || '0000'}`);
        const contractNumberWidth = doc.getTextWidth(contractNumber);
        const contractNumberX = (pageWidth - contractNumberWidth) / 2;
        doc.text(contractNumber, contractNumberX, currentY);
        currentY += 15;

        // Línea separadora
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.5);
        doc.line(marginLeft, currentY, pageWidth - marginLeft, currentY);
        currentY += 10;

        // Lugar y fecha
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        const place = `LUGAR Y FECHA: Madrid, ${new Date().toLocaleDateString('es-ES')}`;
        doc.text(cleanText(place), marginLeft, currentY);
        currentY += 15;

        // Partes contratantes
        doc.setFontSize(14);
        doc.setTextColor(37, 99, 235);
        doc.text('PARTES CONTRATANTES', marginLeft, currentY);
        currentY += 10;

        // Prestador de servicios (Freelancer)
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(cleanText('EL CONSULTOR/PRESTADOR DE SERVICIOS:'), marginLeft, currentY);
        currentY += 6;

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        // Usar datos de la empresa si están disponibles
        const freelancerName = companyData?.name || profile?.full_name || 'Freelancer';
        doc.text(`Nombre: ${cleanText(freelancerName)}`, marginLeft + 5, currentY);
        currentY += 5;

        if (companyData?.tax_id || profile?.document_number) {
            doc.text(`DNI/NIF: ${companyData?.tax_id || profile?.document_number}`, marginLeft + 5, currentY);
            currentY += 5;
        }

        if (companyData?.address || profile?.address) {
            doc.text(`Direccion: ${cleanText(companyData?.address || profile?.address)}`, marginLeft + 5, currentY);
            currentY += 5;
        }

        if (companyData?.email || profile?.email) {
            doc.text(`Email: ${companyData?.email || profile?.email}`, marginLeft + 5, currentY);
            currentY += 5;
        }
        currentY += 8;

        // Cliente
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(cleanText('EL CLIENTE/CONTRATANTE:'), marginLeft, currentY);
        currentY += 6;

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        if (contract.clients?.name) {
            doc.text(`Nombre/Razon Social: ${cleanText(contract.clients.name)}`, marginLeft + 5, currentY);
            currentY += 5;
        }
        if (contract.clients?.company) {
            doc.text(`Empresa: ${cleanText(contract.clients.company)}`, marginLeft + 5, currentY);
            currentY += 5;
        }
        if (contract.clients?.address) {
            doc.text(`Direccion: ${cleanText(contract.clients.address)}`, marginLeft + 5, currentY);
            currentY += 5;
        }
        if (contract.clients?.email) {
            doc.text(`Email: ${contract.clients.email}`, marginLeft + 5, currentY);
            currentY += 5;
        }
        if (contract.clients?.phone) {
            doc.text(`Telefono: ${contract.clients.phone}`, marginLeft + 5, currentY);
            currentY += 5;
        }
        currentY += 15;

        // Detalles del contrato
        doc.setFontSize(14);
        doc.setTextColor(37, 99, 235);
        doc.text('DETALLES DEL CONTRATO', marginLeft, currentY);
        currentY += 10;

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`TITULO DEL PROYECTO: ${cleanText(contract.title)}`, marginLeft, currentY);
        currentY += 6;

        if (contract.contract_value) {
            doc.text(`VALOR DEL CONTRATO: ${contract.contract_value} ${contract.currency || 'EUR'}`, marginLeft, currentY);
            currentY += 6;
        }

        doc.text('PERIODO DE VIGENCIA:', marginLeft, currentY);
        currentY += 5;
        if (contract.start_date) {
            doc.text(cleanText(`* Fecha de Inicio: ${new Date(contract.start_date).toLocaleDateString('es-ES')}`), marginLeft + 5, currentY);
            currentY += 5;
        }
        if (contract.end_date) {
            doc.text(cleanText(`* Fecha de Finalizacion: ${new Date(contract.end_date).toLocaleDateString('es-ES')}`), marginLeft + 5, currentY);
            currentY += 5;
        }

        if (contract.payment_terms) {
            currentY += 2;
            doc.text(`CONDICIONES DE PAGO: ${cleanText(contract.payment_terms)}`, marginLeft, currentY);
            currentY += 10;
        }

        // Contenido del contrato (versión simplificada para PDF del email)
        doc.setFontSize(14);
        doc.setTextColor(37, 99, 235);
        doc.text('CONTENIDO DEL CONTRATO', marginLeft, currentY);
        currentY += 8;

        // Generar contenido según el tipo de servicio
        const contractContent = generateContractContent(contract.service_type || 'general', contract, profile, companyData);

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        // Limpiar el contenido completo y dividir en líneas
        const cleanedContent = cleanText(contractContent);
        const lines = doc.splitTextToSize(cleanedContent, contentWidth);

        for (const line of lines) {
            if (currentY > 260) { // Nueva página si es necesario
                doc.addPage();
                currentY = marginTop;
            }
            doc.text(line, marginLeft, currentY);
            currentY += 5;
        }

        // Firma
        currentY += 15;
        if (currentY > 240) {
            doc.addPage();
            currentY = marginTop;
        }

        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('FIRMAS:', marginLeft, currentY);
        currentY += 15;

        doc.setFontSize(9);
        doc.text('Prestador del Servicio:', marginLeft, currentY);
        doc.text('Cliente:', marginLeft + 90, currentY);
        currentY += 20;

        doc.text('_________________________', marginLeft, currentY);
        doc.text('_________________________', marginLeft + 90, currentY);
        currentY += 8;

        const providerName = companyData?.name || profile?.full_name || 'Prestador del Servicio';
        doc.text(cleanText(providerName), marginLeft, currentY);
        doc.text(cleanText(contract.clients?.name || 'Cliente'), marginLeft + 90, currentY);

        // Convertir a buffer
        const pdfArrayBuffer = doc.output('arraybuffer');
        return Buffer.from(pdfArrayBuffer);

    } catch (error) {
        console.error('Error generando PDF con jsPDF:', error);
        throw new Error(`Error generando PDF: ${error}`);
    }
}

// Función para generar contenido del contrato según el tipo - VERSION UNIFICADA
function generateContractContent(serviceType: string, contract: any, profile: any, companyData: any = null): string {
    const companyName = companyData?.name || profile?.full_name || 'La Empresa';
    const clientName = contract.clients?.name || 'El Cliente';
    const dniProvider = companyData?.tax_id || '[DNI/NIF de la Empresa]';
    const addressProvider = companyData?.address || '[Dirección de la Empresa]';
    const addressClient = contract.clients?.address || '[Dirección del Cliente]';
    const dniClient = contract.clients?.nif || '[DNI/NIF del Cliente]';


    // Detectar el tipo de servicio del contrato
    const detectedServiceType = serviceType?.toLowerCase() || detectServiceTypeForEmail(contract.title, contract.description || '');


    const templates = {
        desarrollo: generateDesarrolloContentEmail(contract, companyName, clientName, addressProvider, addressClient, dniProvider, dniClient),
        consultoria: generateConsultoriaContentEmail(contract, companyName, clientName, addressProvider, addressClient, dniProvider, dniClient),
        marketing: generateMarketingContentEmail(contract, companyName, clientName, addressProvider, addressClient, dniProvider, dniClient),
        diseno: generateDisenoContentEmail(contract, companyName, clientName, addressProvider, addressClient, dniProvider, dniClient),
        contenido: generateContenidoContentEmail(contract, companyName, clientName, addressProvider, addressClient, dniProvider, dniClient),
        general: generateGeneralContentEmail(contract, companyName, clientName, addressProvider, addressClient, dniProvider, dniClient)
    };

    return templates[detectedServiceType as keyof typeof templates] || templates.general;
}

// Función para detectar tipo de servicio (duplicada para el email)
function detectServiceTypeForEmail(title: string, description: string): string {
    const text = (title + ' ' + description).toLowerCase();

    if (text.includes('desarrollo') || text.includes('programacion') || text.includes('software') || text.includes('web') || text.includes('app')) {
        return 'desarrollo';
    }
    if (text.includes('consultoria') || text.includes('asesoria') || text.includes('consultor') || text.includes('estrategia')) {
        return 'consultoria';
    }
    if (text.includes('marketing') || text.includes('publicidad') || text.includes('seo') || text.includes('social') || text.includes('campana')) {
        return 'marketing';
    }
    if (text.includes('diseno') || text.includes('diseño') || text.includes('grafico') || text.includes('logo') || text.includes('branding')) {
        return 'diseno';
    }
    if (text.includes('contenido') || text.includes('redaccion') || text.includes('copywriting') || text.includes('blog') || text.includes('articulo')) {
        return 'contenido';
    }
    return 'general';
}

// Templates para email (versiones simplificadas sin acentos para PDF)
function generateDesarrolloContentEmail(contract: any, companyName: string, clientName: string, addressProvider: string, addressClient: string, dniProvider: string, dniClient: string): string {
    return `
CONTRATO DE PRESTACION DE SERVICIOS DE DESARROLLO WEB

Entre ${companyName}, con DNI ${dniProvider}, domiciliado en ${addressProvider} (en adelante, "EL PRESTADOR"), y ${clientName}, con DNI ${dniClient}, domiciliado en ${addressClient} (en adelante, "EL CLIENTE"), se acuerda:

PRIMERA.- OBJETO DEL CONTRATO
EL PRESTADOR se compromete a desarrollar y entregar al CLIENTE el siguiente proyecto:
- Nombre del proyecto: ${contract.title}
- Descripcion: ${contract.description || 'Desarrollo de software personalizado'}
- Tecnologias a utilizar: ${contract.technologies || 'Tecnologias modernas'}
- Funcionalidades principales: ${contract.features || 'Segun especificaciones'}

SEGUNDA.- PLAZO DE EJECUCION
El proyecto se ejecutara desde ${contract.start_date ? new Date(contract.start_date).toLocaleDateString('es-ES') : '[Fecha inicio]'} hasta ${contract.end_date ? new Date(contract.end_date).toLocaleDateString('es-ES') : '[Fecha fin]'}.

TERCERA.- PRECIO Y FORMA DE PAGO
El precio total del proyecto es de ${contract.contract_value || '0'} ${contract.currency || 'EUR'}.
Forma de pago: ${contract.payment_terms || 'Segun acuerdo'}

CUARTA.- ENTREGABLES
- Codigo fuente completo y documentado
- Documentacion tecnica
- Manual de usuario
- ${contract.deliverables || 'Entregables adicionales segun especificaciones'}

En Madrid, a ${new Date().toLocaleDateString('es-ES')}

EL CONSULTOR:                     EL CLIENTE:
_____________________________     _____________________________
${companyName}                    ${clientName}
DNI: ${dniProvider}               DNI/CIF: ${dniClient}
    `;
}

function generateConsultoriaContentEmail(contract: any, companyName: string, clientName: string, addressProvider: string, addressClient: string, dniProvider: string, dniClient: string): string {
    return `
CONTRATO DE PRESTACION DE SERVICIOS DE CONSULTORIA

Entre ${companyName}, con DNI ${dniProvider}, domiciliado en ${addressProvider} (en adelante, "EL CONSULTOR"), y ${clientName}, con DNI ${dniClient}, domiciliado en ${addressClient} (en adelante, "EL CLIENTE"), se acuerda:

PRIMERA.- OBJETO DEL CONTRATO
EL CONSULTOR se compromete a proporcionar servicios de consultoria profesional:
- Area de consultoria: ${contract.title}
- Descripcion de servicios: ${contract.description || 'Servicios de consultoria especializada'}
- Metodologia: ${contract.methodology || 'Metodologia profesional adaptada'}
- Alcance: ${contract.scope || 'Segun especificaciones acordadas'}

SEGUNDA.- PLAZO DE EJECUCION
Los servicios se prestaran desde ${contract.start_date ? new Date(contract.start_date).toLocaleDateString('es-ES') : '[Fecha inicio]'} hasta ${contract.end_date ? new Date(contract.end_date).toLocaleDateString('es-ES') : '[Fecha fin]'}.

TERCERA.- PRECIO Y FORMA DE PAGO
El precio total de los servicios es de ${contract.contract_value || '0'} ${contract.currency || 'EUR'}.
Forma de pago: ${contract.payment_terms || 'Segun acuerdo'}

CUARTA.- ENTREGABLES
- Analisis y diagnostico de la situacion actual
- Recomendaciones estrategicas documentadas
- Plan de implementacion detallado
- ${contract.deliverables || 'Informes y documentacion segun alcance'}

En Madrid, a ${new Date().toLocaleDateString('es-ES')}

EL CONSULTOR:                     EL CLIENTE:
_____________________________     _____________________________
${companyName}                    ${clientName}
DNI: ${dniProvider}               DNI/CIF: ${dniClient}
    `;
}

function generateMarketingContentEmail(contract: any, companyName: string, clientName: string, addressProvider: string, addressClient: string, dniProvider: string, dniClient: string): string {
    return `
CONTRATO DE PRESTACION DE SERVICIOS DE MARKETING DIGITAL

Entre ${companyName}, con DNI ${dniProvider}, domiciliado en ${addressProvider} (en adelante, "EL PRESTADOR"), y ${clientName}, con DNI ${dniClient}, domiciliado en ${addressClient} (en adelante, "EL CLIENTE"), se acuerda:

PRIMERA.- OBJETO DEL CONTRATO
EL PRESTADOR se compromete a ejecutar servicios de marketing digital:
- Servicio principal: ${contract.title}
- Descripcion: ${contract.description || 'Servicios de marketing digital integral'}
- Canales: ${contract.channels || 'Plataformas digitales relevantes'}
- Objetivos: ${contract.objectives || 'Segun KPIs acordados'}

SEGUNDA.- PLAZO DE EJECUCION
Los servicios se ejecutaran desde ${contract.start_date ? new Date(contract.start_date).toLocaleDateString('es-ES') : '[Fecha inicio]'} hasta ${contract.end_date ? new Date(contract.end_date).toLocaleDateString('es-ES') : '[Fecha fin]'}.

TERCERA.- PRECIO Y FORMA DE PAGO
El precio total de los servicios es de ${contract.contract_value || '0'} ${contract.currency || 'EUR'}.
Forma de pago: ${contract.payment_terms || 'Segun acuerdo'}

En Madrid, a ${new Date().toLocaleDateString('es-ES')}

EL CONSULTOR:                     EL CLIENTE:
_____________________________     _____________________________
${companyName}                    ${clientName}
DNI: ${dniProvider}               DNI/CIF: ${dniClient}
    `;
}

function generateDisenoContentEmail(contract: any, companyName: string, clientName: string, addressProvider: string, addressClient: string, dniProvider: string, dniClient: string): string {
    return `
CONTRATO DE PRESTACION DE SERVICIOS DE DISEÑO

Entre ${companyName}, con DNI ${dniProvider}, domiciliado en ${addressProvider} (en adelante, "EL DISEÑADOR"), y ${clientName}, con DNI ${dniClient}, domiciliado en ${addressClient} (en adelante, "EL CLIENTE"), se acuerda:

PRIMERA.- OBJETO DEL CONTRATO
EL DISEÑADOR se compromete a crear y entregar servicios de diseño:
- Proyecto de diseño: ${contract.title}
- Descripcion: ${contract.description || 'Servicios de diseño grafico profesional'}
- Estilo: ${contract.style || 'Segun brief del cliente'}
- Formatos de entrega: ${contract.formats || 'Formatos digitales estandar'}

SEGUNDA.- PLAZO DE EJECUCION
El diseño se desarrollara desde ${contract.start_date ? new Date(contract.start_date).toLocaleDateString('es-ES') : '[Fecha inicio]'} hasta ${contract.end_date ? new Date(contract.end_date).toLocaleDateString('es-ES') : '[Fecha fin]'}.

TERCERA.- PRECIO Y FORMA DE PAGO
El precio total del diseño es de ${contract.contract_value || '0'} ${contract.currency || 'EUR'}.
Forma de pago: ${contract.payment_terms || 'Segun acuerdo'}

En Madrid, a ${new Date().toLocaleDateString('es-ES')}

EL CONSULTOR:                     EL CLIENTE:
_____________________________     _____________________________
${companyName}                    ${clientName}
DNI: ${dniProvider}               DNI/CIF: ${dniClient}
    `;
}

function generateContenidoContentEmail(contract: any, companyName: string, clientName: string, addressProvider: string, addressClient: string, dniProvider: string, dniClient: string): string {
    return `
CONTRATO DE PRESTACION DE SERVICIOS DE CREACION DE CONTENIDO

Entre ${companyName}, con DNI ${dniProvider}, domiciliado en ${addressProvider} (en adelante, "EL CREADOR"), y ${clientName}, con DNI ${dniClient}, domiciliado en ${addressClient} (en adelante, "EL CLIENTE"), se acuerda:

PRIMERA.- OBJETO DEL CONTRATO
EL CREADOR se compromete a producir contenido profesional:
- Tipo de contenido: ${contract.title}
- Descripcion: ${contract.description || 'Creacion de contenido original'}
- Formato: ${contract.format || 'Segun especificaciones'}
- Volumen: ${contract.volume || 'Segun alcance acordado'}

SEGUNDA.- PLAZO DE EJECUCION
El contenido se creara desde ${contract.start_date ? new Date(contract.start_date).toLocaleDateString('es-ES') : '[Fecha inicio]'} hasta ${contract.end_date ? new Date(contract.end_date).toLocaleDateString('es-ES') : '[Fecha fin]'}.

TERCERA.- PRECIO Y FORMA DE PAGO
El precio total por el contenido es de ${contract.contract_value || '0'} ${contract.currency || 'EUR'}.
Forma de pago: ${contract.payment_terms || 'Segun acuerdo'}

En Madrid, a ${new Date().toLocaleDateString('es-ES')}

EL CONSULTOR:                     EL CLIENTE:
_____________________________     _____________________________
${companyName}                    ${clientName}
DNI: ${dniProvider}               DNI/CIF: ${dniClient}
    `;
}

function generateGeneralContentEmail(contract: any, companyName: string, clientName: string, addressProvider: string, addressClient: string, dniProvider: string, dniClient: string): string {
    return `
CONTRATO DE PRESTACION DE SERVICIOS PROFESIONALES

Entre ${companyName}, con DNI ${dniProvider}, domiciliado en ${addressProvider} (en adelante, "EL PRESTADOR"), y ${clientName}, con DNI ${dniClient}, domiciliado en ${addressClient} (en adelante, "EL CLIENTE"), se acuerda:

PRIMERA.- OBJETO DEL CONTRATO
EL PRESTADOR se compromete a proporcionar servicios profesionales:
- Servicio: ${contract.title}
- Descripcion: ${contract.description || 'Servicios profesionales especializados'}
- Alcance: ${contract.scope || 'Segun especificaciones acordadas'}
- Metodologia: ${contract.methodology || 'Metodologia profesional'}

SEGUNDA.- PLAZO DE EJECUCION
Los servicios se prestaran desde ${contract.start_date ? new Date(contract.start_date).toLocaleDateString('es-ES') : '[Fecha inicio]'} hasta ${contract.end_date ? new Date(contract.end_date).toLocaleDateString('es-ES') : '[Fecha fin]'}.

TERCERA.- PRECIO Y FORMA DE PAGO
El precio total de los servicios es de ${contract.contract_value || '0'} ${contract.currency || 'EUR'}.
Forma de pago: ${contract.payment_terms || 'Segun acuerdo'}

En Madrid, a ${new Date().toLocaleDateString('es-ES')}

EL CONSULTOR:                     EL CLIENTE:
_____________________________     _____________________________
${companyName}                    ${clientName}
DNI: ${dniProvider}               DNI/CIF: ${dniClient}
    `;
}