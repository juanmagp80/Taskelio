'use client'
import Header from '@/components/Header';
import { createSupabaseClient } from '@/src/lib/supabase';
import { showToast } from '@/utils/toast';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Clock,
    DollarSign,
    Download,
    Edit,
    Eye,
    FileText,
    Mail,
    Plus,
    Search,
    Send
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import SideBar from '../../../components/Sidebar';
import { useTrialStatus } from '../../../src/lib/useTrialStatus';

interface ClientsPageClientProps {
    userEmail: string;
}

interface Invoice {
    id: string;
    invoice_number?: string;
    client_name?: string;
    client_email?: string;
    amount: number;
    total_amount: number;
    status: 'draft' | 'sent' | 'paid' | 'overdue';
    due_date: string;
    created_at: string;
    description?: string;
    client?: {
        id: string;
        name: string;
        email: string;
        company?: string;
        nif?: string;
    };
}

export default function InvoicesPageClient({ userEmail }: ClientsPageClientProps) {
    // Hook de trial status
    const { trialInfo, loading: trialLoading, hasReachedLimit, canUseFeatures } = useTrialStatus(userEmail);

    // Estados
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sendingEmail, setSendingEmail] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createSupabaseClient();

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            if (!supabase) return;

            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    client:clients(
                        id,
                        name,
                        email,
                        company,
                        nif
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching invoices:', error);
                return;
            }

            setInvoices(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Función para manejar la creación de nueva factura
    const handleNewInvoiceClick = () => {
        if (!canUseFeatures) {
            showToast.warning('Tu periodo de prueba ha expirado. Actualiza tu plan para continuar creando facturas.');
            return;
        }

        router.push('/dashboard/invoices/new');
    };

    const updateInvoiceStatus = async (id: string, status: string) => {
        try {
            if (!supabase) return;

            const { error } = await supabase
                .from('invoices')
                .update({ status })
                .eq('id', id);

            if (error) {
                console.error('Error updating invoice:', error);
                return;
            }

            setInvoices(prevInvoices =>
                prevInvoices.map(invoice =>
                    invoice.id === id ? { ...invoice, status: status as any } : invoice
                )
            );
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleLogout = async () => {
        try {
            if (!supabase) return;
            await supabase.auth.signOut();
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const sendInvoiceEmail = async (invoiceId: string, clientEmail?: string) => {
        if (!clientEmail) {
            toast.error('Este cliente no tiene email configurado');
            return;
        }

        // Mostrar toast de confirmación
        toast('¿Enviar esta factura por email al cliente?', {
            description: `Se enviará a: ${clientEmail}`,
            action: {
                label: 'Enviar',
                onClick: async () => {
                    setSendingEmail(invoiceId);
                    try {
                        toast.loading('Enviando factura por email...', { id: 'sending-invoice' });

                        const response = await fetch('/api/invoices/send-email', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                invoiceId: invoiceId
                            }),
                        });

                        const result = await response.json();

                        if (!response.ok) {
                            throw new Error(result.error || 'Error al enviar el email');
                        }

                        toast.success('✅ Factura enviada por email correctamente', {
                            id: 'sending-invoice',
                            description: `Enviada a ${clientEmail}`
                        });

                        // Actualizar el estado local de la factura
                        setInvoices(prevInvoices =>
                            prevInvoices.map(invoice =>
                                invoice.id === invoiceId ? { ...invoice, status: 'sent' } : invoice
                            )
                        );

                    } catch (error) {
                        console.error('Error sending invoice email:', error);
                        toast.error('Error al enviar la factura por email', { id: 'sending-invoice' });
                    } finally {
                        setSendingEmail(null);
                    }
                }
            },
            cancel: {
                label: 'Cancelar',
                onClick: () => toast.dismiss()
            }
        });
    };

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch = (invoice.client?.name?.toLowerCase() || invoice.client_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (invoice.invoice_number?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800 border-green-200';
            case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'paid': return <CheckCircle className="w-4 h-4" />;
            case 'sent': return <Send className="w-4 h-4" />;
            case 'draft': return <FileText className="w-4 h-4" />;
            case 'overdue': return <AlertCircle className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const stats = {
        total: invoices.length,
        paid: invoices.filter(i => i.status === 'paid').length,
        pending: invoices.filter(i => i.status === 'sent').length,
        draft: invoices.filter(i => i.status === 'draft').length,
        overdue: invoices.filter(i => i.status === 'overdue').length,
        totalAmount: invoices.reduce((sum, i) => sum + i.total_amount, 0),
        paidAmount: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0)
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="flex items-center justify-center min-h-screen">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600 font-medium">Cargando facturas...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <SideBar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header userEmail={userEmail} onLogout={handleLogout} />

                <div className="flex-1 overflow-auto">
                    <div className="max-w-7xl mx-auto">
                        {/* Header Bonsai Style */}
                        <div className="bg-white border-b border-gray-200 px-6 py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900">Facturas</h1>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Gestiona tus {filteredInvoices.length} facturas
                                    </p>
                                </div>
                                <button
                                    onClick={handleNewInvoiceClick}
                                    disabled={trialLoading || !canUseFeatures}
                                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${trialLoading
                                        ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-wait'
                                        : !canUseFeatures
                                            ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700'
                                        }`}
                                >
                                    {trialLoading ? (
                                        <>
                                            <div className="w-4 h-4 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                            Cargando...
                                        </>
                                    ) : !canUseFeatures ? (
                                        <>
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            Trial Expirado
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            Nueva Factura
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Stats Cards Bonsai Style */}
                        <div className="px-6 py-6 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <FileText className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-600">Total</p>
                                            <p className="text-lg font-semibold text-gray-900">{stats.total}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <CheckCircle className="h-6 w-6 text-green-600" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-600">Pagadas</p>
                                            <p className="text-lg font-semibold text-green-600">{stats.paid}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <Clock className="h-6 w-6 text-amber-600" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-600">Pendientes</p>
                                            <p className="text-lg font-semibold text-amber-600">{stats.pending}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <Edit className="h-6 w-6 text-gray-600" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-600">Borradores</p>
                                            <p className="text-lg font-semibold text-gray-600">{stats.draft}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <DollarSign className="h-6 w-6 text-emerald-600" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm font-medium text-gray-600">Ingresos</p>
                                            <p className="text-lg font-semibold text-emerald-600">{formatCurrency(stats.paidAmount)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search and Filters Bonsai Style */}
                        <div className="bg-white border-b border-gray-200 px-6 py-4">
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Buscar facturas..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 w-full px-4 py-2 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-gray-400"
                                    />
                                </div>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                    <option value="all">Todas</option>
                                    <option value="paid">Pagadas</option>
                                    <option value="sent">Enviadas</option>
                                    <option value="draft">Borradores</option>
                                    <option value="overdue">Vencidas</option>
                                </select>
                            </div>
                        </div>

                        {/* Invoices List Bonsai Style */}
                        <div className="bg-white">
                            <div className="px-6 py-6">
                                {filteredInvoices.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 text-lg">No se encontraron facturas</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {filteredInvoices.map((invoice) => (
                                            <div
                                                key={invoice.id}
                                                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                                            >
                                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <h3 className="font-medium text-gray-900">
                                                                {invoice.invoice_number || 'Sin número'}
                                                            </h3>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invoice.status)} flex items-center gap-1`}>
                                                                {getStatusIcon(invoice.status)}
                                                                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-600 text-sm mb-1">
                                                            <strong>Cliente:</strong> {invoice.client?.name || invoice.client_name || 'Sin cliente'}
                                                        </p>
                                                        <p className="text-gray-500 text-sm mb-2">
                                                            <strong>Email:</strong> {invoice.client?.email || invoice.client_email || 'Sin email'}
                                                        </p>
                                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                                            <span>Creada: {formatDate(invoice.created_at)}</span>
                                                            <span>Vence: {formatDate(invoice.due_date)}</span>
                                                            <span className="font-medium text-gray-700">
                                                                {formatCurrency(invoice.total_amount)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(invoice.client?.email || invoice.client_email) && (
                                                            <button
                                                                onClick={() => sendInvoiceEmail(invoice.id, invoice.client?.email || invoice.client_email)}
                                                                disabled={sendingEmail === invoice.id}
                                                                className="inline-flex items-center px-3 py-1 text-sm font-medium text-indigo-700 bg-indigo-100 border border-indigo-200 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Enviar factura por email"
                                                            >
                                                                {sendingEmail === invoice.id ? (
                                                                    <>
                                                                        <div className="w-4 h-4 mr-1 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin" />
                                                                        <span className="hidden sm:inline">Enviando...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Mail className="w-4 h-4 mr-1" />
                                                                        <span className="hidden sm:inline">Email</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}

                                                        {invoice.status !== 'paid' && (
                                                            <button
                                                                onClick={() => updateInvoiceStatus(invoice.id, 'paid')}
                                                                className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-700 bg-green-100 border border-green-200 rounded-lg hover:bg-green-200 transition-colors"
                                                            >
                                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                                Marcar Pagada
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    window.open(`/api/invoices/${invoice.id}/spanish-pdf`, '_blank');
                                                                } catch (error) {
                                                                    console.error('Error descargando PDF:', error);
                                                                }
                                                            }}
                                                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-red-700 bg-red-100 border border-red-200 rounded-lg hover:bg-red-200 transition-colors"
                                                            title="Descargar factura en PDF"
                                                        >
                                                            <Download className="w-4 h-4 mr-1" />
                                                            <span className="hidden sm:inline">PDF</span>
                                                        </button>

                                                        <button
                                                            onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                                                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-200 rounded-lg hover:bg-blue-200 transition-colors"
                                                        >
                                                            <Eye className="w-4 h-4 mr-1" />
                                                            <span className="hidden sm:inline">Ver</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
