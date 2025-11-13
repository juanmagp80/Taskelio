'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import TrialBanner from '@/components/TrialBanner';
import { Button } from '@/components/ui/Button';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { useTrialStatus } from '@/src/lib/useTrialStatus';
import {
    Calendar,
    DollarSign,
    FileText,
    Plus,
    Search,
    User
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Contract {
    id: string;
    title: string;
    client_name: string;
    contract_value: number;
    currency: string;
    status: 'draft' | 'sent' | 'signed' | 'active' | 'completed' | 'terminated';
    start_date: string;
    end_date: string;
    created_at: string;
    client_id: string;
}

interface ContractsPageClientProps {
    userEmail: string;
}

export default function ContractsPageClient({ userEmail }: ContractsPageClientProps) {
    const router = useRouter();
    const { canUseFeatures } = useTrialStatus();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [tablesNotExist, setTablesNotExist] = useState(false);

    useEffect(() => {
        loadContracts();
    }, []);

    const loadContracts = async () => {
        try {
            const supabase = createSupabaseClient();

            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    id,
                    title,
                    contract_value,
                    currency,
                    status,
                    start_date,
                    end_date,
                    created_at,
                    client_id,
                    clients!inner(name)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading contracts:', error);

                // Mostrar error más específico si las tablas no existen
                if (error && typeof error === 'object' && 'message' in error) {
                    const errorMessage = (error as any).message;
                    if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
                        setTablesNotExist(true);
                    }
                }
                return;
            }

            const contractsWithClientName = data?.map((contract: any) => ({
                ...contract,
                client_name: contract.clients?.name || 'Cliente no encontrado'
            })) || [];

            setContracts(contractsWithClientName);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredContracts = contracts.filter(contract => {
        const matchesSearch = contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contract.client_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

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
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
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

    const handleLogout = async () => {
        const supabase = createSupabaseClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex-1 flex flex-col ml-56">
                <TrialBanner userEmail={userEmail} />
                <Header userEmail={userEmail} onLogout={handleLogout} />
                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
                    <div className="h-full px-6 py-8">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                        Contratos
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                                        Gestiona tus contratos profesionales
                                    </p>
                                </div>
                                <Button
                                    onClick={() => router.push('/dashboard/contracts/create')}
                                    className="flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nuevo Contrato
                                </Button>
                            </div>

                            {/* Mensaje de migración necesaria */}
                            {tablesNotExist && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-8">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <FileText className="h-6 w-6 text-amber-600" />
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <h3 className="text-lg font-semibold text-amber-800 mb-2">
                                                🚨 Migración requerida
                                            </h3>
                                            <p className="text-amber-700 mb-4">
                                                Las tablas de contratos no existen en tu base de datos. Necesitas ejecutar la migración SQL para activar esta funcionalidad.
                                            </p>
                                            <div className="bg-white rounded-lg p-4 border border-amber-200">
                                                <h4 className="font-semibold text-amber-800 mb-2">📋 Pasos a seguir:</h4>
                                                <ol className="list-decimal list-inside text-amber-700 space-y-1 text-sm">
                                                    <li>Ve a tu dashboard de Supabase</li>
                                                    <li>Entra en "SQL Editor"</li>
                                                    <li>Copia el contenido del archivo <code className="bg-amber-100 px-1 rounded">contracts_migration.sql</code></li>
                                                    <li>Pégalo y ejecuta con "RUN"</li>
                                                    <li>Recarga esta página</li>
                                                </ol>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stats Cards - Solo mostrar si las tablas existen */}
                            {!tablesNotExist && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                    Total Contratos
                                                </p>
                                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                    {contracts.length}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                                <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                    Activos
                                                </p>
                                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                    {contracts.filter(c => c.status === 'active').length}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                                <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                    Firmados
                                                </p>
                                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                    {contracts.filter(c => c.status === 'signed').length}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                                                <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                    Valor Total
                                                </p>
                                                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                    {formatCurrency(
                                                        contracts.reduce((sum, c) => sum + (c.contract_value || 0), 0),
                                                        'EUR'
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Filters */}
                            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                            <input
                                                type="text"
                                                placeholder="Buscar contratos..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div className="sm:w-48">
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        >
                                            <option value="all">Todos los estados</option>
                                            <option value="draft">Borrador</option>
                                            <option value="sent">Enviado</option>
                                            <option value="signed">Firmado</option>
                                            <option value="active">Activo</option>
                                            <option value="completed">Completado</option>
                                            <option value="terminated">Terminado</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Contracts List */}
                        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
                            {loading ? (
                                <div className="p-8 text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                    <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando contratos...</p>
                                </div>
                            ) : filteredContracts.length === 0 ? (
                                <div className="p-8 text-center">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                        {contracts.length === 0 ? 'No tienes contratos aún' : 'No se encontraron contratos'}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                                        {contracts.length === 0
                                            ? 'Crea tu primer contrato para empezar a gestionar tus proyectos de forma profesional.'
                                            : 'Intenta ajustar los filtros de búsqueda.'
                                        }
                                    </p>
                                    {contracts.length === 0 && (
                                        <Button
                                            onClick={() => router.push('/dashboard/contracts/create')}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Crear Primer Contrato
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="overflow-x-auto overflow-y-visible">
                                    <table className="w-full">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Contrato
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Cliente
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Valor
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Estado
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Fechas
                                                </th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {filteredContracts.map((contract) => (
                                                <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 relative">
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                {contract.title}
                                                            </div>
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                Creado: {new Date(contract.created_at).toLocaleDateString('es-ES')}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-900 dark:text-white">
                                                            {contract.client_name}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {formatCurrency(contract.contract_value, contract.currency)}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {getStatusBadge(contract.status)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            <div>Inicio: {new Date(contract.start_date).toLocaleDateString('es-ES')}</div>
                                                            <div>Fin: {new Date(contract.end_date).toLocaleDateString('es-ES')}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right relative z-[99999]">
                                                        <div className="flex items-center justify-end gap-2 relative z-[99999]">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
                                                            >
                                                                Ver
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
