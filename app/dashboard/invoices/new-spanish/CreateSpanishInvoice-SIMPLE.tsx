'use client';


interface CreateSpanishInvoiceProps {
    userEmail: string;
}

export default function CreateSpanishInvoice({ userEmail }: CreateSpanishInvoiceProps) {

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">🇪🇸 Nueva Factura Española - DEBUG</h1>
            <p className="mb-4">Usuario: {userEmail}</p>
            <div className="bg-green-100 p-4 rounded">
                <p className="text-green-800">
                    ✅ El componente está funcionando correctamente.
                </p>
                <p className="text-green-800">
                    Si ves este mensaje, significa que la navegación funciona.
                </p>
            </div>
        </div>
    );
}
