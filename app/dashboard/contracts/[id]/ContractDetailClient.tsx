'use client';

import Sidebar from '@/components/Sidebar';
import TrialBanner from '@/components/TrialBanner';
import { Button } from '@/components/ui/Button';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { useTrialStatus } from '@/src/lib/useTrialStatus';
import { showToast } from '@/utils/toast';
import {
    ArrowLeft,
    Download,
    Edit,
    Mail,
    Share2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Contract {
    id: string;
    title: string;
    description: string;
    contract_content: string;
    contract_value: number;
    currency: string;
    status: string;
    start_date: string;
    end_date: string;
    payment_terms: string;
    created_at: string;
    sent_at?: string;
    client_id: string;
    client: {
        name: string;
        email: string;
        company?: string;
    };
}

interface ContractDetailClientProps {
    contractId: string;
    userEmail: string;
}

export default function ContractDetailClient({ contractId, userEmail }: ContractDetailClientProps) {
    const router = useRouter();
    const { canUseFeatures } = useTrialStatus(userEmail);
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadContract();
    }, [contractId]);

    const loadContract = async () => {
        try {
            const supabase = createSupabaseClient();

            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    *,
                    clients!inner(name, email, company)
                `)
                .eq('id', contractId)
                .single();

            if (error) throw error;

            setContract({
                ...data,
                client: data.clients
            });
        } catch (error) {
            console.error('Error loading contract:', error);
            showToast.error('Error al cargar el contrato');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Borrador' },
            sent: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Enviado' },
            signed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Firmado' },
            active: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Activo' },
            completed: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Completado' },
            terminated: { bg: 'bg-red-100', text: 'text-red-800', label: 'Terminado' }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const handleDownloadPDF = async () => {
        if (!contract) return;

        try {
            showToast.info('Generando PDF...');

            // Usar la nueva API unificada para generar el PDF
            const response = await fetch('/api/contracts/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ contractId: contract.id })
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            // Obtener el PDF como blob
            const blob = await response.blob();

            // Crear nombre de archivo más limpio
            const cleanTitle = contract.title
                .replace(/[^a-zA-Z0-9\s]/g, '')
                .replace(/\s+/g, '-')
                .toLowerCase();

            // Crear elemento para descargar
            const a = document.createElement('a');
            const url = window.URL.createObjectURL(blob);

            a.href = url;
            a.download = `contrato-${cleanTitle}-${contract.id.substring(0, 8)}.pdf`;
            document.body.appendChild(a);
            a.click();

            // Limpiar
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showToast.success('PDF generado correctamente');

        } catch (error) {
            console.error('Error downloading PDF:', error);
            showToast.error('Error al generar el PDF');
        }
    };

    const handleSendContract = async () => {
        if (!contract || !canUseFeatures) return;

        try {

            // Llamar a la API para enviar el email
            const response = await fetch('/api/contracts/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ contractId: contract.id }),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('Error response from API:', result);
                showToast.error(result.error || 'Error al enviar el contrato');
                return;
            }

            // Actualizar el estado local
            setContract({
                ...contract,
                status: 'sent',
                sent_at: new Date().toISOString()
            });

            showToast.success('✅ Contrato enviado por email correctamente');

        } catch (error) {
            console.error('Error sending contract email:', error);
            showToast.error('Error al enviar el contrato por email');
        }
    };

    const handleLogout = async () => {
        const supabase = createSupabaseClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                <div className="flex-1 flex items-center justify-center ml-56">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Contrato no encontrado
                        </h2>
                        <Button onClick={() => router.push('/dashboard/contracts')}>
                            Volver a Contratos
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex-1 flex flex-col overflow-hidden ml-56">
                <TrialBanner />

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    <div className="h-full px-6 py-8">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center">
                                    <Button
                                        variant="ghost"
                                        onClick={() => router.push('/dashboard/contracts')}
                                        className="mr-4"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-2" />
                                        Volver
                                    </Button>
                                    <div>
                                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                            {contract.title}
                                        </h1>
                                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                                            Contrato con {contract.client.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {getStatusBadge(contract.status)}
                                    <Button
                                        variant="outline"
                                        onClick={handleDownloadPDF}
                                        className="flex items-center gap-2"
                                    >
                                        <Download className="w-4 h-4" />
                                        Descargar PDF
                                    </Button>
                                    {contract.status === 'draft' && (
                                        <Button
                                            onClick={handleSendContract}
                                            disabled={!canUseFeatures}
                                            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                        >
                                            <Mail className="w-4 h-4" />
                                            Enviar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Contract Content */}
                            <div className="lg:col-span-2">
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                            Contenido del Contrato
                                        </h2>
                                    </div>
                                    <div className="p-8">
                                        <div
                                            className="prose prose-lg max-w-none dark:prose-invert"
                                            style={{
                                                fontFamily: '"Times New Roman", serif',
                                                fontSize: '16px',
                                                lineHeight: '1.8',
                                                color: '#1a1a1a'
                                            }}
                                        >
                                            <div dangerouslySetInnerHTML={{
                                                __html: contract.contract_content
                                                    .replace(/\n/g, '<br>')
                                                    .replace(/PRIMERA\.-/g, '<strong>PRIMERA.-</strong>')
                                                    .replace(/SEGUNDA\.-/g, '<strong>SEGUNDA.-</strong>')
                                                    .replace(/TERCERA\.-/g, '<strong>TERCERA.-</strong>')
                                                    .replace(/CUARTA\.-/g, '<strong>CUARTA.-</strong>')
                                                    .replace(/QUINTA\.-/g, '<strong>QUINTA.-</strong>')
                                                    .replace(/SEXTA\.-/g, '<strong>SEXTA.-</strong>')
                                                    .replace(/SÉPTIMA\.-/g, '<strong>SÉPTIMA.-</strong>')
                                                    .replace(/OCTAVA\.-/g, '<strong>OCTAVA.-</strong>')
                                                    .replace(/CONTRATO DE (.*?)\n/g, '<h2 style="text-align: center; font-size: 20px; margin-bottom: 30px; text-decoration: underline;">CONTRATO DE $1</h2>')
                                                    .replace(/Entre (.*?) y (.*?), se (.*?):/g, '<p style="text-align: justify; margin-bottom: 20px;">Entre <strong>$1</strong> y <strong>$2</strong>, se $3:</p>')
                                            }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Contract Details */}
                            <div className="space-y-6">
                                {/* Client Info */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                        Información del Cliente
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                Nombre
                                            </label>
                                            <p className="text-gray-900 dark:text-white">
                                                {contract.client.name}
                                            </p>
                                        </div>
                                        {contract.client.company && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                    Empresa
                                                </label>
                                                <p className="text-gray-900 dark:text-white">
                                                    {contract.client.company}
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                Email
                                            </label>
                                            <p className="text-gray-900 dark:text-white">
                                                {contract.client.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Contract Details */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                        Detalles del Contrato
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                Valor
                                            </label>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(contract.contract_value, contract.currency)}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                Fecha de Inicio
                                            </label>
                                            <p className="text-gray-900 dark:text-white">
                                                {new Date(contract.start_date).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                Fecha de Finalización
                                            </label>
                                            <p className="text-gray-900 dark:text-white">
                                                {new Date(contract.end_date).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                        {contract.payment_terms && (
                                            <div>
                                                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                    Términos de Pago
                                                </label>
                                                <p className="text-gray-900 dark:text-white whitespace-pre-line">
                                                    {contract.payment_terms}
                                                </p>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                Creado
                                            </label>
                                            <p className="text-gray-900 dark:text-white">
                                                {new Date(contract.created_at).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                        Acciones
                                    </h3>
                                    <div className="space-y-3">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                            onClick={() => router.push(`/dashboard/contracts/${contractId}/edit`)}
                                            disabled={!canUseFeatures}
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Editar Contrato
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start"
                                            onClick={() => {
                                                navigator.clipboard.writeText(window.location.href);
                                                showToast.success('Enlace copiado');
                                            }}
                                        >
                                            <Share2 className="w-4 h-4 mr-2" />
                                            Compartir Enlace
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
