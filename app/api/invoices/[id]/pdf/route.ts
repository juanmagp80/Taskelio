import InvoicePDF from '@/components/InvoicePDF';
import { Document, renderToBuffer } from '@react-pdf/renderer';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import React from 'react';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) => {
                                cookieStore.set(name, value, options);
                            });
                        } catch {
                            // Ignorar errores en route handlers
                        }
                    },
                },
            }
        );

        // Verificar autenticación
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Obtener datos de la factura
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select(`
                *,
                client:clients(name, company, email, phone),
                project:projects(name, description)
            `)
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (invoiceError || !invoice) {
            console.error('Invoice error:', invoiceError);
            return new NextResponse('Invoice not found', { status: 404 });
        }

        // Obtener items de la factura
        const { data: items, error: itemsError } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', id)
            .order('created_at');

        if (itemsError) {
            console.error('Items error:', itemsError);
            return new NextResponse('Error fetching items', { status: 500 });
        }

        // ✅ OBTENER DATOS DE LA EMPRESA DEL USUARIO
        const { data: company, error: companyError } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (companyError) {
            console.warn('Could not fetch company data:', companyError);
        }

        // ✅ INFORMACIÓN DE LA EMPRESA CON FALLBACKS
        const companyInfo = {
            name: company?.name || 'Tu Empresa',
            email: company?.email || user.email || 'contacto@tuempresa.com',
            phone: company?.phone || '+34 123 456 789',
            website: company?.website || 'www.tuempresa.com',
            address: company?.address || ''
        };


        // ✅ GENERAR PDF
        const pdfBuffer = await renderToBuffer(
            React.createElement(Document, {},
                React.createElement(InvoicePDF, {
                    invoice,
                    items: items || [],
                    companyInfo
                })
            )
        );

        const uint8Array = new Uint8Array(pdfBuffer);

        return new Response(uint8Array, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="factura-${invoice.invoice_number}.pdf"`,
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return new NextResponse(`Error generating PDF: ${errorMessage}`, { status: 500 });
    }
}