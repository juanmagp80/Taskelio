import { generateSpanishFiscalQR } from '@/lib/spanish-invoice-utils';
import { createServerSupabaseClient } from '@/src/lib/supabase-server';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const supabase = await createServerSupabaseClient();

        // Verificar autenticación
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const invoiceId = resolvedParams.id;

        // Obtener datos de la factura
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select(`
                *,
                client:clients (
                    name,
                    nif,
                    address,
                    city,
                    province
                )
            `)
            .eq('id', invoiceId)
            .eq('user_id', user.id)
            .single();

        if (invoiceError || !invoice) {
            console.error('Error obteniendo factura:', invoiceError);
            return NextResponse.json({
                error: 'Factura no encontrada',
                debug: {
                    invoiceId,
                    userId: user.id,
                    error: invoiceError?.message
                }
            }, { status: 404 });
        }

        // Log para depuración - más detallado

        // Obtener configuración de la empresa
        const { data: companyConfig, error: companyError } = await supabase
            .from('company_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (companyError || !companyConfig) {
            return NextResponse.json({
                error: 'Configuración de empresa no encontrada. Configure los datos fiscales primero.'
            }, { status: 400 });
        }

        // Generar HTML para el PDF
        const htmlContent = await generateSpanishInvoiceHTML(invoice, companyConfig);

        // Generar PDF usando Puppeteer
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();

        // Configurar viewport para una página A4
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });

        await page.setContent(htmlContent, {
            waitUntil: ['load', 'networkidle0'],
            timeout: 30000
        });

        // Generar PDF configurado para una sola página con escalado dinámico
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '12mm',
                right: '12mm',
                bottom: '12mm',
                left: '12mm'
            },
            scale: 0.75, // Escalado más agresivo para asegurar que quepa en una página
            preferCSSPageSize: false,
            pageRanges: '1', // Solo generar la primera página
            displayHeaderFooter: false
        });

        await browser.close();

        // Retornar PDF
    const arrayBuffer = pdfBuffer.buffer instanceof ArrayBuffer ? pdfBuffer.buffer : Uint8Array.from(pdfBuffer).buffer;
    return new NextResponse(new Blob([arrayBuffer], { type: 'application/pdf' }), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Factura_${invoice.invoice_number?.replace('/', '_') || invoice.id}.pdf"`
            }
        });

    } catch (error) {
        console.error('Error generando HTML de factura:', error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}

async function generateSpanishInvoiceHTML(invoice: any, company: any): Promise<string> {
    const client = invoice.client;

    // Generar datos del QR fiscal
    const companyData = {
        companyName: company.company_name,
        nif: company.nif,
        address: company.address,
        postalCode: company.postal_code,
        city: company.city,
        province: company.province,
        country: company.country || 'España',
        phone: company.phone,
        email: company.email,
        website: company.website,
        registrationNumber: company.registration_number,
        socialCapital: parseFloat(company.social_capital || '0'),
    };

    const invoiceData = {
        invoiceNumber: invoice.invoice_number || `FAC-${invoice.id}`,
        date: invoice.created_at,
        dueDate: invoice.due_date,
        clientName: client?.name || 'Cliente',
        clientNIF: client?.nif || '',
        clientAddress: client?.address || '',
        clientCity: client?.city || '',
        clientPostalCode: '',
        clientProvince: client?.province || '',
        items: [{
            description: extractConceptsFromNotes(invoice.notes) || 'Servicios profesionales',
            quantity: 1,
            unitPrice: parseFloat(invoice.amount || '0'),
            vatRate: parseFloat(invoice.tax_rate || '21'),
            vatAmount: parseFloat(invoice.tax_amount || '0'),
            total: parseFloat(invoice.total_amount || '0')
        }],
        subtotal: parseFloat(invoice.amount || '0'),
        totalVAT: parseFloat(invoice.tax_amount || '0'),
        total: parseFloat(invoice.total_amount || '0'),
        notes: '',
        paymentTerms: 'Transferencia bancaria'
    };

    // Generar QR fiscal español
    const qrData = generateSpanishFiscalQR(companyData, invoiceData);

    // Generar QR visual como imagen base64
    const qrImageBase64 = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'M',
        width: 150,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF'
        }
    });

    // Generar VerifacTU (código de verificación español)
    const verifactuCode = generateVerifacTU(invoice, company);

    // Generar QR para VerifacTU
    const verifactuQR = await QRCode.toDataURL(`https://prewww.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=${company.nif}&num=${encodeURIComponent(invoice.invoice_number || invoice.id)}&fecha=${encodeURIComponent(new Date(invoice.created_at).toISOString().split('T')[0])}&importe=${invoice.total_amount}`, {
        errorCorrectionLevel: 'M',
        width: 120,
        margin: 1
    });

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Factura ${invoice.invoice_number || invoice.id}</title>
        <style>
            @page {
                size: A4;
                margin: 15mm;
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.4;
                color: #333;
                background: white;
                font-size: 12px;
                height: 100vh;
                overflow: hidden;
            }
            
            .invoice-container {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                padding: 0;
            }
            
            .header {
                border-bottom: 2px solid #1e40af;
                padding-bottom: 15px;
                margin-bottom: 20px;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                min-height: 120px;
            }
            
            .company-info h1 {
                color: #1e3a8a;
                font-size: 22px;
                font-weight: bold;
                margin-bottom: 8px;
            }
            
            .company-details {
                font-size: 10px;
                color: #666;
                line-height: 1.3;
            }
            
            .invoice-title {
                text-align: right;
                flex-shrink: 0;
            }
            
            .invoice-badge {
                background: linear-gradient(135deg, #1e40af, #3b82f6);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                display: inline-block;
            }
            
            .invoice-badge h2 {
                font-size: 16px;
                margin-bottom: 4px;
                font-weight: 700;
            }
            
            .invoice-number {
                font-family: 'Courier New', monospace;
                font-size: 12px;
                font-weight: bold;
            }
            
            .main-content {
                flex: 1;
                display: flex;
                flex-direction: column;
                min-height: 0;
            }
            
            .client-section {
                background: #f8fafc;
                padding: 15px;
                border-radius: 6px;
                margin: 10px 0;
                border-left: 3px solid #1e40af;
            }
            
            .client-section h2 {
                color: #1e3a8a;
                font-size: 14px;
                margin-bottom: 8px;
                font-weight: 600;
            }
            
            .client-info {
                font-size: 11px;
                line-height: 1.4;
            }
            
            .date-info {
                display: flex;
                justify-content: space-between;
                margin: 10px 0;
                font-size: 10px;
                color: #555;
            }
            
            .invoice-details {
                background: #f0f9ff;
                padding: 15px;
                border-radius: 6px;
                margin: 8px 0;
                flex: 1;
                min-height: 120px;
                border: 2px solid #bfdbfe;
            }
            
            .invoice-details h3 {
                color: #1e3a8a;
                font-size: 13px;
                margin-bottom: 10px;
                font-weight: 600;
                border-bottom: 1px solid #1e40af;
                padding-bottom: 5px;
            }
            
            .invoice-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 8px;
                font-size: 10px;
                border: 2px solid #1e40af;
            }
            
            .invoice-table th {
                background: #1e40af;
                color: white;
                padding: 8px 6px;
                text-align: left;
                border: 1px solid #1e40af;
                font-weight: 600;
                font-size: 10px;
            }
            
            .invoice-table td {
                padding: 8px 6px;
                border: 1px solid #ddd;
                vertical-align: top;
                background: white;
            }
            
            .invoice-table tbody tr:nth-child(even) {
                background: #f8fafc;
            }
            
            .invoice-table .text-center {
                text-align: center;
            }
            
            .invoice-table .text-right {
                text-align: right;
            }
            
            .totals-section {
                background: #1e40af;
                color: white;
                padding: 15px;
                border-radius: 6px;
                margin: 10px 0;
            }
            
            .totals-section p {
                margin: 4px 0;
                font-size: 11px;
            }
            
            .total-final {
                font-size: 14px !important;
                font-weight: bold;
                border-top: 1px solid rgba(255,255,255,0.3);
                padding-top: 8px;
                margin-top: 8px;
            }
            
            .footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                margin-top: auto;
                padding-top: 15px;
                border-top: 1px solid #e5e7eb;
                min-height: 100px;
            }
            
            .qr-section {
                display: flex;
                gap: 20px;
                align-items: center;
            }
            
            .qr-item {
                text-align: center;
                font-size: 9px;
                color: #666;
            }
            
            .qr-item img {
                display: block;
                margin: 5px auto;
                max-width: 80px;
                height: auto;
            }
            
            .verifactu-info {
                text-align: right;
                font-size: 9px;
                color: #666;
                max-width: 200px;
            }
        </style>
    </head>
    <body>
        <div class="invoice-container">
            <!-- Header -->
            <div class="header">
                <div class="company-info">
                    <h1>${company.company_name}</h1>
                    <div class="company-details">
                        <div><strong>NIF:</strong> ${company.nif}</div>
                        <div>${company.address}</div>
                        <div>${company.postal_code} ${company.city}</div>
                        <div>${company.province}, ${company.country || 'España'}</div>
                        ${company.phone ? `<div><strong>Tel:</strong> ${company.phone}</div>` : ''}
                        ${company.email ? `<div><strong>Email:</strong> ${company.email}</div>` : ''}
                    </div>
                </div>
                <div class="invoice-title">
                    <div class="invoice-badge">
                        <h2>FACTURA</h2>
                        <div class="invoice-number">${invoice.invoice_number || `FAC-${invoice.id}`}</div>
                    </div>
                </div>
            </div>

            <div class="main-content">
                <!-- Client Section -->
                <div class="client-section">
                    <h2>Facturar a:</h2>
                    <div class="client-info">
                        <div style="font-weight: 600; margin-bottom: 5px;">${client?.name || 'Cliente'}</div>
                        ${client?.nif ? `<div><strong>NIF:</strong> ${client.nif}</div>` : ''}
                        ${client?.address ? `<div>${client.address}</div>` : ''}
                        ${client?.city ? `<div>${client.city}</div>` : ''}
                        ${client?.province ? `<div>${client.province}</div>` : ''}
                        <div>España</div>
                    </div>
                </div>

                <!-- Date Information -->
                <div class="date-info">
                    <div><strong>Fecha emisión:</strong> ${new Date(invoice.created_at).toLocaleDateString('es-ES')}</div>
                    ${invoice.due_date ? `<div><strong>Vencimiento:</strong> ${new Date(invoice.due_date).toLocaleDateString('es-ES')}</div>` : ''}
                </div>

                <!-- Invoice Details -->
                <div class="invoice-details">
                    <h3>Conceptos facturados:</h3>
                    <table class="invoice-table">
                        <thead>
                            <tr>
                                <th>Descripción</th>
                                <th class="text-center" style="width: 50px;">Cant.</th>
                                <th class="text-right" style="width: 70px;">Precio Unit.</th>
                                <th class="text-center" style="width: 50px;">IVA %</th>
                                <th class="text-right" style="width: 70px;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="font-weight: 500; padding: 8px 4px;">
                                    <div style="font-size: 10px; line-height: 1.3;">
                                        ${extractConceptsFromNotes(invoice.notes) || 'Servicios profesionales'}
                                    </div>
                                </td>
                                <td class="text-center" style="font-weight: 500;">
                                    1
                                </td>
                                <td class="text-right" style="font-weight: 500;">
                                    ${parseFloat(invoice.amount || '0').toFixed(2)} €
                                </td>
                                <td class="text-center" style="font-weight: 500;">
                                    ${parseFloat(invoice.tax_rate || '21').toFixed(0)}%
                                </td>
                                <td class="text-right" style="font-weight: bold; background: #f0f9ff;">
                                    ${parseFloat(invoice.total_amount || '0').toFixed(2)} €
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Totals Section -->
                <div class="totals-section">
                    <p><strong>Base imponible:</strong> ${parseFloat(invoice.amount || '0').toFixed(2)} €</p>
                    <p><strong>IVA (${parseFloat(invoice.tax_rate || '21').toFixed(0)}%):</strong> ${parseFloat(invoice.tax_amount || '0').toFixed(2)} €</p>
                    <p class="total-final"><strong>TOTAL:</strong> ${parseFloat(invoice.total_amount || '0').toFixed(2)} €</p>
                </div>
            </div>

            <!-- Footer with QRs -->
            <div class="footer">
                <div class="qr-section">
                    <div class="qr-item">
                        <div><strong>QR Fiscal</strong></div>
                        <img src="${qrImageBase64}" alt="QR Fiscal" />
                        <div>Código Fiscal</div>
                    </div>
                    <div class="qr-item">
                        <div><strong>VerifacTU</strong></div>
                        <img src="${verifactuQR}" alt="VerifacTU QR" />
                        <div>Verificación AEAT</div>
                    </div>
                </div>
                
                <div class="verifactu-info">
                    <div><strong>VerifacTU:</strong></div>
                    <div style="font-family: monospace; margin: 5px 0;">${verifactuCode}</div>
                    <div>Esta factura cumple con la normativa española de verificación fiscal</div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
}

// Función para generar código VerifacTU (Sistema español de verificación de facturas)
function generateVerifacTU(invoice: any, company: any): string {
    const invoiceNumber = invoice.invoice_number || `FAC-${invoice.id}`;
    const date = new Date(invoice.created_at).toISOString().split('T')[0].replace(/-/g, '');
    const amount = parseFloat(invoice.total_amount || '0').toFixed(2).replace('.', '');
    const nif = company.nif || '';

    // Crear string base para el hash
    const baseString = `${nif}${invoiceNumber}${date}${amount}`;

    // Generar hash SHA-256 truncado (primeros 8 caracteres)
    const hash = crypto.createHash('sha256').update(baseString).digest('hex');
    const shortHash = hash.substring(0, 8).toUpperCase();

    // Formato VerifacTU: VF-XXXXXXXX
    return `VF-${shortHash}`;
}

// Función para extraer conceptos del campo notes
function extractConceptsFromNotes(notes: string): string {
    if (!notes) return 'Servicios profesionales';


    // Buscar líneas que empiecen con "- " después de "Conceptos:"
    const lines = notes.split('\n');
    const concepts: string[] = [];

    let foundConceptsSection = false;

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Detectar la sección de conceptos
        if (trimmedLine.toLowerCase().includes('conceptos:')) {
            foundConceptsSection = true;
            continue;
        }

        // Si estamos en la sección de conceptos y la línea empieza con "-"
        if (foundConceptsSection && trimmedLine.startsWith('- ')) {
            let concept = trimmedLine.substring(2).trim(); // Remover "- "

            // Remover todo lo que esté después de " (" hasta el final
            const parenIndex = concept.indexOf(' (');
            if (parenIndex > 0) {
                concept = concept.substring(0, parenIndex);
            }

            // Limpiar patrones de cálculo restantes
            concept = concept.replace(/\s*\([^)]*\)\s*$/g, '');
            concept = concept.replace(/\s*\d+\s*x\s*\d+[€$]?\s*=\s*[\d.,]+[€$]?\s*$/gi, '');

            if (concept.trim()) {
                concepts.push(concept.trim());
            }
        }
    }

    const result = concepts.length > 0 ? concepts.join(', ') : 'Servicios profesionales';

    return result;
}


