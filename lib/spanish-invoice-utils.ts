// Utilidades para la normativa española de facturación - Versión simplificada

export interface SpanishCompanyData {
    // Datos obligatorios del emisor
    companyName: string;
    nif: string; // Número de Identificación Fiscal
    address: string;
    postalCode: string;
    city: string;
    province: string;
    country: string;

    // Datos adicionales requeridos
    registrationNumber?: string; // Número del Registro Mercantil
    socialCapital?: number; // Capital social
    phone?: string;
    email?: string;
    website?: string;
}

export interface SpanishInvoiceData {
    // Datos básicos de la factura
    invoiceNumber: string;
    date: string;
    dueDate?: string;

    // Datos del cliente
    clientName: string;
    clientNIF: string;
    clientEmail?: string;
    clientAddress?: string;
    clientCity?: string;
    clientPostalCode?: string;
    clientProvince?: string;

    // Conceptos/Items de la factura
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
        vatRate: number;
        vatAmount: number;
        total: number;
    }[];

    // Totales
    subtotal: number;
    totalVAT: number;
    total: number;

    // Información adicional
    notes?: string;
    paymentTerms?: string;

    // Para el código QR (compatibilidad)
    qrData?: string;
}

// Generar número de factura secuencial
export function generateInvoiceNumber(year: number, sequence: number, series: string = 'A'): string {
    const paddedSequence = sequence.toString().padStart(6, '0');
    return `${year}/${series}${paddedSequence}`;
}

// Validar NIF español
export function validateSpanishNIF(nif: string): boolean {
    if (!nif) return false;

    const nifPattern = /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i;
    if (!nifPattern.test(nif)) return false;

    const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const number = parseInt(nif.substring(0, 8));
    const letter = nif.substring(8, 9).toUpperCase();
    const calculatedLetter = letters.charAt(number % 23);

    return letter === calculatedLetter;
}

// Validar CIF español
export function validateSpanishCIF(cif: string): boolean {
    if (!cif) return false;

    const cifPattern = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/i;
    if (!cifPattern.test(cif)) return false;

    // Implementación completa de validación de CIF
    const organizationType = cif.charAt(0).toUpperCase();
    const number = cif.substring(1, 8);
    const control = cif.substring(8, 9).toUpperCase();

    let sum = 0;
    for (let i = 0; i < 7; i++) {
        const digit = parseInt(number.charAt(i));
        if (i % 2 === 0) {
            // Posiciones pares: multiplicar por 2
            const doubled = digit * 2;
            sum += doubled > 9 ? Math.floor(doubled / 10) + (doubled % 10) : doubled;
        } else {
            // Posiciones impares: sumar directamente
            sum += digit;
        }
    }

    const controlDigit = (10 - (sum % 10)) % 10;
    const controlLetter = 'JABCDEFGHI'.charAt(controlDigit);

    // Según el tipo de organización, el control puede ser número o letra
    if (['N', 'P', 'Q', 'S', 'R', 'W'].includes(organizationType)) {
        return control === controlLetter;
    } else {
        return control === controlDigit.toString() || control === controlLetter;
    }
}

// Validar campos obligatorios de factura española
export function validateSpanishInvoice(invoice: SpanishInvoiceData, company: SpanishCompanyData): string[] {
    const errors: string[] = [];

    // Validaciones del emisor
    if (!company.companyName) errors.push('Nombre de la empresa es obligatorio');
    if (!company.nif) errors.push('NIF de la empresa es obligatorio');
    if (!validateSpanishNIF(company.nif) && !validateSpanishCIF(company.nif)) {
        errors.push('NIF/CIF de la empresa no es válido');
    }
    if (!company.address) errors.push('Dirección de la empresa es obligatoria');

    // Validaciones básicas de la factura
    if (!invoice.invoiceNumber) errors.push('Número de factura es obligatorio');
    if (!invoice.date) errors.push('Fecha de emisión es obligatoria');
    if (!invoice.clientName) errors.push('Nombre del cliente es obligatorio');
    if (!invoice.clientNIF) errors.push('NIF/CIF del cliente es obligatorio');

    // Validar NIF/CIF del cliente
    if (invoice.clientNIF && !validateSpanishNIF(invoice.clientNIF) && !validateSpanishCIF(invoice.clientNIF)) {
        errors.push('NIF/CIF del cliente no es válido');
    }

    // Validaciones de importes
    if (invoice.subtotal < 0) errors.push('El subtotal no puede ser negativo');
    if (invoice.total <= 0) errors.push('El importe total debe ser mayor que 0');

    // Validar que hay al menos un concepto
    if (!invoice.items || invoice.items.length === 0) {
        errors.push('Debe haber al menos un concepto en la factura');
    }

    // Validar conceptos
    if (invoice.items) {
        invoice.items.forEach((item, index) => {
            if (!item.description || item.description.trim() === '') {
                errors.push(`El concepto ${index + 1} debe tener descripción`);
            }
            if (item.quantity <= 0) {
                errors.push(`El concepto ${index + 1} debe tener cantidad mayor que 0`);
            }
            if (item.unitPrice < 0) {
                errors.push(`El concepto ${index + 1} no puede tener precio negativo`);
            }
        });
    }

    return errors;
}

// Generar datos básicos para código QR fiscal
export function generateSpanishFiscalQR(company: SpanishCompanyData, invoice: SpanishInvoiceData): string {
    return `Factura ${invoice.invoiceNumber} - ${company.companyName} - ${invoice.total.toFixed(2)}€`;
}

// Tipos de IVA en España
export const SPANISH_VAT_RATES = {
    GENERAL: 21,
    REDUCED: 10,
    SUPER_REDUCED: 4,
    EXEMPT: 0
} as const;
