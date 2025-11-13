'use client';

import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { showToast } from '@/utils/toast';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    Download,
    Edit,
    FileText,
    Mail,
    MapPin,
    Phone,
    Send,
    User
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Actualizar la interfaz Client para quitar address:

interface Invoice {
    id: string;
    invoice_number: string;
    title: string;
    description?: string;
    amount: number;
    tax_rate: number;
    tax_amount: number;
    total_amount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    issue_date: string;
    due_date: string;
    paid_date?: string;
    notes?: string;
    created_at: string;
    client?: {
        id: string;
        name: string;
        company?: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    project?: {
        id: string;
        name: string;
        description?: string;
    };
}
interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface InvoiceDetailsProps {
    invoiceId: string;
    userEmail: string;
}

export default function InvoiceDetails({ invoiceId, userEmail }: InvoiceDetailsProps) {
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [items, setItems] = useState<InvoiceItem[]>([]);
    const [loading, setLoading] = useState(true);

    const supabase = createSupabaseClient();
    const router = useRouter();

    useEffect(() => {
        fetchInvoiceDetails();
    }, [invoiceId]);

    // En la función fetchInvoiceDetails, cambiar la consulta:

    const fetchInvoiceDetails = async () => {
        if (!supabase) {
            console.error('Supabase client not initialized');
            setLoading(false);
            return;
        }

        try {
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) return;

            // Obtener factura con cliente y proyecto (SIN el campo address)
            const { data: invoiceData, error: invoiceError } = await supabase!
                .from('invoices')
                .select(`
                *,
                client:clients(id, name, company, email, phone),
                project:projects(id, name, description)
            `)
                .eq('id', invoiceId)
                .eq('user_id', user.id)
                .single();

            if (invoiceError) {
                console.error('Error fetching invoice:', invoiceError);
                router.push('/dashboard/invoices');
                return;
            }

            setInvoice(invoiceData);

            // Obtener items de la factura
            const { data: itemsData, error: itemsError } = await supabase!
                .from('invoice_items')
                .select('*')
                .eq('invoice_id', invoiceId)
                .order('created_at');

            if (itemsError) {
                console.error('Error fetching invoice items:', itemsError);
            } else {
                setItems(itemsData || []);
            }
        } catch (error) {
            console.error('Error:', error);
            router.push('/dashboard/invoices');
        } finally {
            setLoading(false);
        }
    };

    const updateInvoiceStatus = async (newStatus: string) => {
        if (!supabase) {
            console.error('Supabase client not initialized');
            return;
        }

        try {
            const updateData: any = { status: newStatus };

            if (newStatus === 'paid') {
                updateData.paid_date = new Date().toISOString();
            }

            const { error } = await supabase!
                .from('invoices')
                .update(updateData)
                .eq('id', invoiceId);

            if (error) throw error;

            fetchInvoiceDetails(); // Recargar datos
            showToast.success('Estado actualizado correctamente');
        } catch (error) {
            console.error('Error updating invoice status:', error);
            showToast.error('Error al actualizar el estado de la factura');
        }
    };

    const getStatusDisplay = (status: string) => {
        const displays = {
            draft: { icon: Edit, color: 'text-slate-600', bg: 'bg-slate-100', label: 'Borrador' },
            sent: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Enviada' },
            paid: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Pagada' },
            overdue: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', label: 'Vencida' },
            cancelled: { icon: AlertCircle, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Cancelada' }
        };
        return displays[status as keyof typeof displays] || displays.draft;
    };

    const handleLogout = async () => {
        if (!supabase) {
            console.error('Supabase client not initialized');
            router.push('/login');
            return;
        }

        await supabase!.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                <main className="flex-1 ml-64 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-600 font-medium">Cargando factura...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                <main className="flex-1 ml-64 flex items-center justify-center">
                    <div className="text-center">
                        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Factura no encontrada</h3>
                        <p className="text-slate-600 mb-6">La factura que buscas no existe o no tienes permisos para verla.</p>
                        <Button
                            onClick={() => router.push('/dashboard/invoices')}
                            variant="outline"
                            className="rounded-xl"
                        >
                            Volver a Facturas
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    const statusDisplay = getStatusDisplay(invoice.status);
    const StatusIcon = statusDisplay.icon;

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <main className="flex-1 ml-64 overflow-auto">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/dashboard/invoices')}
                                    className="rounded-lg border-slate-200 hover:bg-slate-50"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Volver
                                </Button>
                                <div>
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                        {invoice.invoice_number}
                                    </h1>
                                    <p className="text-slate-600 mt-1 font-medium flex items-center gap-2">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusDisplay.bg} ${statusDisplay.color}`}>
                                            <StatusIcon className="h-3 w-3" />
                                            {statusDisplay.label}
                                        </span>
                                        <span>•</span>
                                        <span>{invoice.title}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {invoice.status !== 'paid' && (
                                    <Button
                                        onClick={() => updateInvoiceStatus('paid')}
                                        variant="outline"
                                        className="rounded-lg border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                                    >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Marcar como Pagada
                                    </Button>
                                )}
                                <Button
                                    onClick={() => router.push(`/dashboard/invoices/${invoice.id}/edit`)}
                                    variant="outline"
                                    className="rounded-lg border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                </Button>
                                <Button
                                    onClick={() => {
                                        window.open(`/api/invoices/${invoice.id}/spanish-pdf`, '_blank');
                                    }}
                                    className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800"
                                >
                                    <Download className="h-4 w-4 mr-2" />
                                    Descargar PDF
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    <div className="grid gap-8 lg:grid-cols-3">
                        {/* Contenido principal */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Información del cliente */}
                            <Card className="rounded-2xl shadow-sm border-slate-100">
                                <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-t-2xl">
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                                            <User className="h-4 w-4 text-white" />
                                        </div>
                                        Información del Cliente
                                    </CardTitle>
                                </CardHeader>

                                <CardContent className="p-6">
                                    {invoice.client ? (
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <h3 className="font-semibold text-slate-900 mb-2">{invoice.client.name}</h3>
                                                {invoice.client.company && (
                                                    <p className="text-slate-600 mb-2">{invoice.client.company}</p>
                                                )}
                                                {invoice.client.email && (
                                                    <p className="text-slate-600 flex items-center gap-2 mb-1">
                                                        <Mail className="h-4 w-4" />
                                                        {invoice.client.email}
                                                    </p>
                                                )}
                                                {invoice.client.phone && (
                                                    <p className="text-slate-600 flex items-center gap-2 mb-1">
                                                        <Phone className="h-4 w-4" />
                                                        {invoice.client.phone}
                                                    </p>
                                                )}
                                                {invoice.client.address && (
                                                    <p className="text-slate-600 flex items-center gap-2 mb-1">
                                                        <MapPin className="h-4 w-4" />
                                                        {invoice.client.address}
                                                    </p>
                                                )}
                                            </div>
                                            {invoice.project && (
                                                <div>
                                                    <h4 className="font-semibold text-slate-900 mb-2">Proyecto Asociado</h4>
                                                    <p className="text-slate-700 font-medium">{invoice.project.name}</p>
                                                    {invoice.project.description && (
                                                        <p className="text-slate-600 text-sm mt-1">{invoice.project.description}</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500">Cliente no encontrado</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Descripción de la factura */}
                            {invoice.description && (
                                <Card className="rounded-2xl shadow-sm border-slate-100">
                                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-slate-50 rounded-t-2xl">
                                        <CardTitle className="flex items-center gap-2 text-slate-900">
                                            <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                                                <FileText className="h-4 w-4 text-white" />
                                            </div>
                                            Descripción
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <p className="text-slate-700 leading-relaxed">{invoice.description}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Items de la factura */}
                            <Card className="rounded-2xl shadow-sm border-slate-100">
                                <CardHeader className="bg-gradient-to-r from-purple-50 to-slate-50 rounded-t-2xl">
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                                            <DollarSign className="h-4 w-4 text-white" />
                                        </div>
                                        Detalles de Facturación
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700">Descripción</th>
                                                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Cantidad</th>
                                                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Precio Unit.</th>
                                                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200">
                                                {items.map((item) => (
                                                    <tr key={item.id}>
                                                        <td className="px-6 py-4 text-slate-900">{item.description}</td>
                                                        <td className="px-6 py-4 text-right text-slate-700">{item.quantity}</td>
                                                        <td className="px-6 py-4 text-right text-slate-700">€{item.unit_price.toFixed(2)}</td>
                                                        <td className="px-6 py-4 text-right font-semibold text-slate-900">€{item.total.toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Totales */}
                                    <div className="p-6 bg-slate-50 border-t border-slate-200">
                                        <div className="space-y-2 max-w-sm ml-auto">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-600">Subtotal:</span>
                                                <span className="font-semibold text-slate-900">€{invoice.amount.toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-600">Impuestos ({invoice.tax_rate}%):</span>
                                                <span className="font-semibold text-slate-900">€{invoice.tax_amount.toFixed(2)}</span>
                                            </div>
                                            <div className="border-t border-slate-300 pt-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-lg font-bold text-slate-900">Total:</span>
                                                    <span className="text-2xl font-bold text-emerald-600">€{invoice.total_amount.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Notas */}
                            {invoice.notes && (
                                <Card className="rounded-2xl shadow-sm border-slate-100">
                                    <CardHeader className="bg-gradient-to-r from-amber-50 to-slate-50 rounded-t-2xl">
                                        <CardTitle className="flex items-center gap-2 text-slate-900">
                                            <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                                                <FileText className="h-4 w-4 text-white" />
                                            </div>
                                            Notas Adicionales
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{invoice.notes}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Sidebar con información adicional */}
                        <div className="space-y-6">
                            {/* Fechas importantes */}
                            <Card className="rounded-2xl shadow-sm border-slate-100 sticky top-24">
                                <CardHeader className="bg-gradient-to-r from-slate-50 to-white rounded-t-2xl">
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg">
                                            <Calendar className="h-4 w-4 text-white" />
                                        </div>
                                        Fechas Importantes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700">Fecha de Emisión</label>
                                            <p className="text-slate-900 mt-1">
                                                {new Date(invoice.issue_date).toLocaleDateString('es-ES', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700">Fecha de Vencimiento</label>
                                            <p className="text-slate-900 mt-1">
                                                {new Date(invoice.due_date).toLocaleDateString('es-ES', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        {invoice.paid_date && (
                                            <div>
                                                <label className="text-sm font-semibold text-emerald-600">Fecha de Pago</label>
                                                <p className="text-emerald-700 mt-1 font-medium">
                                                    {new Date(invoice.paid_date).toLocaleDateString('es-ES', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700">Creada el</label>
                                            <p className="text-slate-600 mt-1 text-sm">
                                                {new Date(invoice.created_at).toLocaleDateString('es-ES', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Acciones rápidas */}
                            <Card className="rounded-2xl shadow-sm border-slate-100">
                                <CardHeader className="bg-gradient-to-r from-indigo-50 to-white rounded-t-2xl">
                                    <CardTitle className="text-slate-900">Acciones Rápidas</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-3">
                                        {invoice.status === 'draft' && (
                                            <Button
                                                onClick={() => updateInvoiceStatus('sent')}
                                                variant="outline"
                                                className="w-full rounded-lg border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                            >
                                                <Send className="h-4 w-4 mr-2" />
                                                Marcar como Enviada
                                            </Button>
                                        )}
                                        {invoice.status !== 'paid' && (
                                            <Button
                                                onClick={() => updateInvoiceStatus('paid')}
                                                variant="outline"
                                                className="w-full rounded-lg border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                                            >
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Marcar como Pagada
                                            </Button>
                                        )}
                                        {invoice.status !== 'cancelled' && (
                                            <Button
                                                onClick={() => updateInvoiceStatus('cancelled')}
                                                variant="outline"
                                                className="w-full rounded-lg border-red-200 hover:bg-red-50 hover:text-red-600"
                                            >
                                                <AlertCircle className="h-4 w-4 mr-2" />
                                                Cancelar Factura
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}