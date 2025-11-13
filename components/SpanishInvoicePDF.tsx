import React from 'react';
import { SpanishCompanyData, SpanishInvoiceData, generateSpanishFiscalQR } from '@/lib/spanish-invoice-utils';

interface SpanishInvoicePDFProps {
    invoice: SpanishInvoiceData;
    company: SpanishCompanyData;
    items: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        total: number;
    }>;
}

export function SpanishInvoicePDF({ invoice, company, items }: SpanishInvoicePDFProps) {
    const qrData = generateSpanishFiscalQR(company, invoice);

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg" style={{ minHeight: '297mm' }}>
            {/* Header con datos de la empresa */}
            <div className="border-b-2 border-blue-600 pb-6 mb-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-blue-900">{company.companyName}</h1>
                        <div className="text-sm text-gray-600 space-y-0.5">
                            <div><strong>NIF:</strong> {company.nif}</div>
                            <div>{company.address}</div>
                            <div>{company.postalCode} {company.city}</div>
                            <div>{company.province}, {company.country}</div>
                            {company.phone && <div><strong>Teléfono:</strong> {company.phone}</div>}
                            {company.email && <div><strong>Email:</strong> {company.email}</div>}
                            {company.website && <div><strong>Web:</strong> {company.website}</div>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg mb-4">
                            <h2 className="text-xl font-bold">FACTURA</h2>
                            <div className="text-lg font-mono">{invoice.invoiceNumber}</div>
                        </div>
                        {/* QR Code placeholder - en una implementación real usarías una librería como qrcode */}
                        <div className="w-24 h-24 bg-gray-100 border-2 border-gray-300 flex items-center justify-center text-xs text-gray-600 text-center">
                            Código QR<br/>
                            Verificación<br/>
                            Fiscal
                        </div>
                    </div>
                </div>
            </div>

            {/* Información de la factura y datos del cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Datos de la factura */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                        Datos de la Factura
                    </h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="font-medium">Número:</span>
                            <span className="font-mono">{invoice.invoiceNumber}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium">Fecha de emisión:</span>
                            <span>{new Date(invoice.date).toLocaleDateString('es-ES')}</span>
                        </div>
                        {invoice.dueDate && (
                            <div className="flex justify-between">
                                <span className="font-medium">Fecha de vencimiento:</span>
                                <span>{new Date(invoice.dueDate).toLocaleDateString('es-ES')}</span>
                            </div>
                        )}
                        {invoice.paymentTerms && (
                            <div className="flex justify-between">
                                <span className="font-medium">Forma de pago:</span>
                                <span>{invoice.paymentTerms}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Datos del cliente */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                        Facturar a
                    </h3>
                    <div className="space-y-1 text-sm">
                        <div className="font-semibold text-base">{invoice.clientName}</div>
                        {invoice.clientNIF && (
                            <div><strong>NIF:</strong> {invoice.clientNIF}</div>
                        )}
                        <div>{invoice.clientAddress}</div>
                        <div>{invoice.clientPostalCode} {invoice.clientCity}</div>
                        <div>España</div>
                    </div>
                </div>
            </div>

            {/* Descripción de la operación */}
            {invoice.notes && (
            <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-300 pb-2">
                    Descripción de la Operación
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">{invoice.notes}</p>
            </div>
            )}

            {/* Tabla de conceptos */}
            <div className="mb-8">
                <table className="w-full border-collapse border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-3 text-left font-semibold">
                                Concepto
                            </th>
                            <th className="border border-gray-300 px-4 py-3 text-center font-semibold w-20">
                                Cant.
                            </th>
                            <th className="border border-gray-300 px-4 py-3 text-right font-semibold w-24">
                                Precio €
                            </th>
                            <th className="border border-gray-300 px-4 py-3 text-right font-semibold w-24">
                                Total €
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                                <td className="border border-gray-300 px-4 py-3 text-sm">
                                    {item.description}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-center text-sm">
                                    {item.quantity}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-right text-sm font-mono">
                                    {item.unit_price.toFixed(2)}
                                </td>
                                <td className="border border-gray-300 px-4 py-3 text-right text-sm font-mono font-semibold">
                                    {item.total.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Resumen de importes */}
            <div className="flex justify-end mb-8">
                <div className="w-80">
                    <table className="w-full">
                        <tbody>
                            <tr>
                                <td className="py-2 text-right font-medium">Base imponible:</td>
                                <td className="py-2 text-right font-mono font-semibold pl-4">
                                    {invoice.subtotal.toFixed(2)} €
                                </td>
                            </tr>
                            <tr>
                                <td className="py-2 text-right font-medium">
                                    IVA:
                                </td>
                                <td className="py-2 text-right font-mono font-semibold pl-4">
                                    {invoice.totalVAT.toFixed(2)} €
                                </td>
                            </tr>
                            <tr className="border-t-2 border-gray-400">
                                <td className="py-3 text-right text-lg font-bold">TOTAL:</td>
                                <td className="py-3 text-right text-xl font-mono font-bold pl-4 bg-blue-50 px-4 rounded">
                                    {invoice.total.toFixed(2)} €
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Información legal y datos adicionales */}
            <div className="border-t border-gray-300 pt-6 space-y-4 text-xs text-gray-600">
                {company.registrationNumber && (
                    <div>
                        <strong>Registro Mercantil:</strong> {company.registrationNumber}
                    </div>
                )}
                
                {company.socialCapital && (
                    <div>
                        <strong>Capital Social:</strong> {company.socialCapital.toLocaleString('es-ES', { 
                            style: 'currency', 
                            currency: 'EUR' 
                        })}
                    </div>
                )}

                {/* Información del código QR */}
                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                    <div className="flex items-start gap-4">
                        <div className="flex-1">
                            <div className="font-medium text-blue-800 mb-2">
                                Verificación Digital - Código QR
                            </div>
                            <div className="text-blue-700 text-xs space-y-1">
                                <div>Esta factura incluye un código QR para verificación fiscal.</div>
                                <div>Escanearlo permite validar la autenticidad del documento.</div>
                                <div className="font-mono text-xs break-all mt-2 p-2 bg-white rounded border">
                                    {qrData}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Condiciones legales */}
                <div className="text-center pt-4">
                    <div className="font-medium mb-2">Condiciones Legales</div>
                    <div className="text-xs leading-relaxed max-w-3xl mx-auto">
                        Esta factura cumple con la normativa española vigente según el 
                        Real Decreto 1619/2012 de 30 de noviembre y la Ley 37/1992 del IVA. 
                        La emisión de esta factura constituye el derecho a la deducción del IVA soportado 
                        conforme a la legislación vigente.
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-200">
                Factura generada electrónicamente - {new Date().toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                })}
            </div>
        </div>
    );
}

// Hook para generar PDF (placeholder - requiere implementación con html2pdf o similar)
export function useSpanishInvoicePDF() {
    const generatePDF = async (invoice: SpanishInvoiceData, company: SpanishCompanyData, items: any[]) => {
        // En una implementación real, aquí usarías html2pdf, puppeteer, o similar
        
        // Simulación de generación de PDF
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(`/api/invoices/${invoice.invoiceNumber}/pdf`);
            }, 1000);
        });
    };

    const downloadPDF = async (invoice: SpanishInvoiceData, company: SpanishCompanyData, items: any[]) => {
        const pdfUrl = await generatePDF(invoice, company, items);
        
        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = pdfUrl as string;
        link.download = `Factura_${invoice.invoiceNumber.replace('/', '_')}.pdf`;
        link.click();
    };

    return {
        generatePDF,
        downloadPDF
    };
}
