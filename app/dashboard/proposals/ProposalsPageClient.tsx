'use client';

import Header from '@/components/Header';
import NewProposalModal from '@/components/proposals/NewProposalModal';
import Sidebar from '@/components/Sidebar';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { showToast } from '@/utils/toast';
import {
    AlertTriangle,
    CheckCircle,
    Copy,
    DollarSign,
    Edit3,
    Eye,
    FileText,
    Plus,
    Presentation,
    Search,
    Send,
    TrendingUp,
    XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TrialBanner from '../../../components/TrialBanner';
import { useTrialStatus } from '../../../src/lib/useTrialStatus';

interface Proposal {
    id: string;
    client_id: string | null;
    prospect_name: string | null;
    prospect_email: string | null;
    title: string;
    description: string;
    services: any;
    pricing: any;
    terms: any;
    timeline: any;
    status: string;
    valid_until: string | null;
    sent_at: string | null;
    viewed_at: string | null;
    responded_at: string | null;
    total_amount: number;
    currency: string;
    template_used: string | null;
    notes: string | null;
    created_at: string;
}

interface ProposalsPageClientProps {
    userEmail: string;
}

export default function ProposalsPageClientBonsai({ userEmail }: ProposalsPageClientProps) {
    // Hook de trial status
    const { trialInfo, loading: trialLoading, hasReachedLimit, canUseFeatures } = useTrialStatus(userEmail);

    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [stats, setStats] = useState({
        total: 0,
        sent: 0,
        accepted: 0,
        pending: 0,
        total_value: 0,
        won_value: 0,
        conversion_rate: 0,
        avg_response_time: 0
    });

    // Estado para el modal de nueva propuesta
    const [showNewProposalModal, setShowNewProposalModal] = useState(false);

    const router = useRouter();
    const supabase = createSupabaseClient();

    const statusFilters = [
        { id: 'all', name: 'Todas', icon: FileText, color: 'text-gray-600' },
        { id: 'draft', name: 'Borradores', icon: Edit3, color: 'text-blue-600' },
        { id: 'sent', name: 'Enviadas', icon: Send, color: 'text-orange-600' },
        { id: 'viewed', name: 'Vistas', icon: Eye, color: 'text-purple-600' },
        { id: 'accepted', name: 'Aceptadas', icon: CheckCircle, color: 'text-green-600' },
        { id: 'rejected', name: 'Rechazadas', icon: XCircle, color: 'text-red-600' }
    ];

    const handleLogout = async () => {
        try {
            if (!supabase) return;
            await supabase.auth.signOut();
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleNewProposalClick = () => {
        if (!canUseFeatures) {
            showToast.warning('Tu periodo de prueba ha expirado. Actualiza tu plan para continuar creando propuestas.');
            return;
        }

        setShowNewProposalModal(true);
    };

    const handleNewProposalSuccess = () => {
        loadProposals(); // Recargar la lista de propuestas
        showToast.success('✅ Propuesta creada exitosamente. Ahora puedes analizarla con IA.');
    };

    const createSampleProposals = () => {
        showToast.error('Funcionalidad de datos demo - proximamente');
    };

    const handleViewProposal = (proposalId: string) => {
        router.push(`/dashboard/proposals/${proposalId}`);
    };

    const handleCopyProposal = async (proposal: Proposal) => {
        if (!canUseFeatures) {
            showToast.warning('Tu periodo de prueba ha expirado. Actualiza tu plan para continuar.');
            return;
        }

        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error('Usuario no autenticado');
            }

            const { data, error } = await supabase
                .from('proposals')
                .insert([{
                    user_id: user.id,
                    client_id: proposal.client_id,
                    prospect_name: proposal.prospect_name ? `${proposal.prospect_name} (Copia)` : null,
                    prospect_email: proposal.prospect_email,
                    title: `${proposal.title} (Copia)`,
                    description: proposal.description,
                    services: proposal.services,
                    pricing: proposal.pricing,
                    terms: proposal.terms,
                    timeline: proposal.timeline,
                    status: 'draft',
                    total_amount: proposal.total_amount,
                    currency: proposal.currency,
                    notes: proposal.notes,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            showToast.success('✅ Propuesta duplicada exitosamente');
            loadProposals();
        } catch (error) {
            console.error('Error copying proposal:', error);
            showToast.error('❌ Error al duplicar la propuesta');
        }
    };

    const handleEditProposal = (proposalId: string) => {
        router.push(`/dashboard/proposals/${proposalId}/edit`);
    };

    const handleSendProposal = async (proposalId: string) => {
        if (!canUseFeatures) {
            showToast.warning('Tu periodo de prueba ha expirado. Actualiza tu plan para continuar.');
            return;
        }

        try {
            const { error } = await supabase
                .from('proposals')
                .update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', proposalId);

            if (error) throw error;

            showToast.success('✅ Propuesta marcada como enviada');
            loadProposals();
        } catch (error) {
            console.error('Error sending proposal:', error);
            showToast.error('❌ Error al enviar la propuesta');
        }
    };

    const loadProposals = async () => {
        try {
            setLoading(true);

            if (!supabase) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Cargar propuestas del usuario
            const { data, error } = await supabase
                .from('proposals')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading proposals:', error);
                return;
            }

            setProposals(data || []);
            setFilteredProposals(data || []);

            // Calcular estadísticas
            const total = data?.length || 0;
            const sent = data?.filter((p: Proposal) => ['sent', 'viewed', 'accepted', 'rejected'].includes(p.status)).length || 0;
            const accepted = data?.filter((p: Proposal) => p.status === 'accepted').length || 0;
            const pending = data?.filter((p: Proposal) => ['sent', 'viewed'].includes(p.status)).length || 0;
            const total_value = data?.reduce((sum: number, p: Proposal) => sum + (p.total_amount || 0), 0) || 0;
            const won_value = data?.filter((p: Proposal) => p.status === 'accepted').reduce((sum: number, p: Proposal) => sum + (p.total_amount || 0), 0) || 0;
            const conversion_rate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;
            const avg_response_time = Math.round(Math.random() * 48 + 24); // 24-72 horas

            setStats({
                total,
                sent,
                accepted,
                pending,
                total_value,
                won_value,
                conversion_rate,
                avg_response_time
            });

        } catch (error) {
            console.error('Error loading proposals:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterProposals = () => {
        let filtered = proposals;

        if (searchQuery) {
            filtered = filtered.filter(proposal =>
                proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                proposal.prospect_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                proposal.prospect_email?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (selectedStatus !== 'all') {
            filtered = filtered.filter(proposal => proposal.status === selectedStatus);
        }

        setFilteredProposals(filtered);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-blue-100 text-blue-800';
            case 'sent': return 'bg-orange-100 text-orange-800';
            case 'viewed': return 'bg-purple-100 text-purple-800';
            case 'accepted': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES');
    };

    useEffect(() => {
        loadProposals();
    }, []);

    useEffect(() => {
        filterProposals();
    }, [searchQuery, selectedStatus, proposals]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                <div className="flex-1 ml-56">
                    <div className="max-w-7xl mx-auto px-6 py-12">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600">Cargando propuestas...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex flex-col flex-1 ml-56">
                <TrialBanner userEmail={userEmail} />
                <Header userEmail={userEmail} onLogout={handleLogout} />
                <div className="flex-1 overflow-auto">
                    <div className="max-w-7xl mx-auto">
                        {/* Header Bonsai Style */}
                        <div className="bg-white border-b border-gray-200 px-6 py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900">Propuestas</h1>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Gestiona tus {proposals.length} propuestas comerciales
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={createSampleProposals}
                                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Demo Data
                                    </button>
                                    <button
                                        onClick={handleNewProposalClick}
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
                                                Nueva Propuesta
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Stats Section */}
                        <div className="bg-white border-b border-gray-200 px-6 py-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <FileText className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Total</p>
                                            <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <CheckCircle className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Aceptadas</p>
                                            <p className="text-2xl font-semibold text-gray-900">{stats.accepted}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <DollarSign className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Valor Total</p>
                                            <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.total_value)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <TrendingUp className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600">Conversión</p>
                                            <p className="text-2xl font-semibold text-gray-900">{stats.conversion_rate}%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search and Filters */}
                        <div className="bg-white border-b border-gray-200 px-6 py-4">
                            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                                {/* Search */}
                                <div className="flex-1 max-w-lg">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Buscar propuestas por título, cliente..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Status Filters */}
                                <div className="flex items-center gap-2 overflow-x-auto">
                                    {statusFilters.map((filter) => {
                                        const IconComponent = filter.icon;
                                        const isActive = selectedStatus === filter.id;

                                        return (
                                            <button
                                                key={filter.id}
                                                onClick={() => setSelectedStatus(filter.id)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${isActive
                                                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                                    }`}
                                            >
                                                <IconComponent className="w-4 h-4" />
                                                {filter.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Proposals Content */}
                        <div className="bg-white px-6 py-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
                                        <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                </div>
                            ) : filteredProposals.length === 0 ? (
                                <div className="text-center py-12">
                                    <Presentation className="mx-auto h-12 w-12 text-gray-400" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                                        {searchQuery ? 'No se encontraron propuestas' : 'No hay propuestas'}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {searchQuery
                                            ? `No hay propuestas que coincidan con "${searchQuery}"`
                                            : 'Comienza creando tu primera propuesta comercial.'
                                        }
                                    </p>
                                    {!searchQuery && (
                                        <div className="mt-6">
                                            <button
                                                onClick={handleNewProposalClick}
                                                disabled={trialLoading || !canUseFeatures}
                                                className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${trialLoading
                                                    ? 'bg-gray-400 cursor-wait'
                                                    : !canUseFeatures
                                                        ? 'bg-gray-400 cursor-not-allowed'
                                                        : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                                    }`}
                                            >
                                                {trialLoading ? (
                                                    <>
                                                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        Cargando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus className="w-4 h-4 mr-2" />
                                                        Nueva Propuesta
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Lista de Propuestas */
                                <div className="space-y-4">
                                    {filteredProposals.map((proposal) => (
                                        <div key={proposal.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4 flex-1">
                                                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <Presentation className="w-6 h-6 text-blue-600" />
                                                    </div>

                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="text-lg font-medium text-gray-900">{proposal.title}</h3>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}>
                                                                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                                            <span>Cliente: {proposal.prospect_name || 'Sin asignar'}</span>
                                                            <span>Valor: {formatCurrency(proposal.total_amount)}</span>
                                                            <span>Creado: {formatDate(proposal.created_at)}</span>
                                                        </div>

                                                        {proposal.description && (
                                                            <p className="text-sm text-gray-600 line-clamp-1">{proposal.description}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleViewProposal(proposal.id)}
                                                        className="text-gray-400 hover:text-blue-600 transition-colors"
                                                        title="Ver propuesta"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleCopyProposal(proposal)}
                                                        className="text-gray-400 hover:text-green-600 transition-colors"
                                                        title="Duplicar propuesta"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        onClick={() => handleEditProposal(proposal.id)}
                                                        className="text-gray-400 hover:text-orange-600 transition-colors"
                                                        title="Editar propuesta"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </button>

                                                    {proposal.status === 'draft' && (
                                                        <button
                                                            onClick={() => handleSendProposal(proposal.id)}
                                                            className="text-sm px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors flex items-center gap-1"
                                                            title="Marcar como enviada"
                                                        >
                                                            <Send className="w-4 h-4" />
                                                            Enviar
                                                        </button>
                                                    )}
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

            {/* Modal de Nueva Propuesta */}
            <NewProposalModal
                isOpen={showNewProposalModal}
                onClose={() => setShowNewProposalModal(false)}
                onSuccess={handleNewProposalSuccess}
                userEmail={userEmail}
            />
        </div>
    );
}
