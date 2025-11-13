'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import {
    Plus,
    Search,
    Play,
    Settings,
    Zap,
    Calendar,
    Clock,
    Users,
    FileText,
    Mail,
    Phone,
    MessageSquare,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    X,
    ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { executeAutomationAction } from '@/src/lib/automation-actions';

interface Automation {
    id: string;
    name: string;
    description: string;
    trigger_type: string;
    actions: any[];
    is_active: boolean;
    last_executed: string | null;
    execution_count: number;
    created_at: string;
    user_id: string;
}

interface AutomationsPageClientProps {
    userEmail: string;
}

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
                {children}
            </div>
        </div>
    );
};

export default function AutomationsPageClient({ userEmail }: AutomationsPageClientProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [modalAutomation, setModalAutomation] = useState<Automation | null>(null);
    const [entityOptions, setEntityOptions] = useState<any[]>([]);
    const [selectedEntity, setSelectedEntity] = useState<string>('');
    const [entityLoading, setEntityLoading] = useState(false);
    const [executionLogs, setExecutionLogs] = useState<string[]>([]);
    const [executing, setExecuting] = useState(false);
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredAutomations, setFilteredAutomations] = useState<Automation[]>([]);

    const router = useRouter();
    const supabase = createSupabaseClient();

    const handleLogout = async () => {
        try {
            if (!supabase) return;
            await supabase.auth.signOut();
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const loadAutomations = async () => {
        try {
            setLoading(true);
            
            if (!supabase) return;

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('freelancer_automations')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading automations:', error);
                return;
            }

            setAutomations(data || []);
            setFilteredAutomations(data || []);
            
        } catch (error) {
            console.error('Error loading automations:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterAutomations = () => {
        let filtered = automations;

        if (searchQuery) {
            filtered = filtered.filter(automation =>
                automation.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                automation.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                automation.trigger_type.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredAutomations(filtered);
    };

    const handleExecuteAutomation = async (automation: Automation) => {
        
        if (!supabase) {
            alert('Error: Cliente Supabase no disponible');
            return;
        }
        
        const { data: userData } = await supabase.auth.getUser();
        const user_id = userData?.user?.id || '';
        
        if (!user_id) {
            alert('Error: Usuario no autenticado');
            return;
        }

        // Abrir modal y resetear estado
        setModalAutomation(automation);
        setModalOpen(true);
        setEntityOptions([]);
        setSelectedEntity('');
        setExecutionLogs([]);
        setEntityLoading(true);
        setExecuting(false);

        // Cargar clientes con información adicional
        
        try {
            const { data: clientsData, error: clientsError } = await supabase
                .from('clients')
                .select('id, name, email, company, phone, created_at')
                .eq('user_id', user_id)
                .order('name');

            if (clientsError) {
                console.error('❌ Error cargando clientes:', clientsError);
                setExecutionLogs(['❌ Error cargando clientes: ' + clientsError.message]);
            } else {
                // Obtener información adicional para cada cliente
                const clientsWithInfo = await Promise.all(
                    (clientsData || []).map(async (client: any) => {
                        const { count: projectCount } = await supabase
                            .from('projects')
                            .select('*', { count: 'exact', head: true })
                            .eq('client_id', client.id)
                            .eq('user_id', user_id);

                        const { count: invoiceCount } = await supabase
                            .from('invoices')
                            .select('*', { count: 'exact', head: true })
                            .eq('client_id', client.id)
                            .eq('user_id', user_id);

                        return {
                            ...client,
                            projectCount: projectCount || 0,
                            invoiceCount: invoiceCount || 0,
                            displayInfo: [
                                client.company || '',
                                client.email || '',
                                `${projectCount || 0} proyectos`,
                                `${invoiceCount || 0} facturas`
                            ].filter(Boolean).join(' • ')
                        };
                    })
                );

                setEntityOptions(clientsWithInfo);
                setExecutionLogs([
                    '🔍 Cargando clientes disponibles...',
                    `✅ ${clientsWithInfo.length} clientes encontrados`,
                    `📋 Automatización: ${automation.name}`,
                    '👤 Selecciona un cliente para aplicar la automatización'
                ]);
            }
        } catch (error) {
            console.error('❌ Error:', error);
            setExecutionLogs(['❌ Error: ' + error]);
        }

        setEntityLoading(false);
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalAutomation || !selectedEntity || !supabase) return;

        // Mostrar el alert ANTES de cualquier lógica asíncrona
        const selected = entityOptions.find(opt => String(opt.id) === selectedEntity);
        if (selected && selected.email) {
            alert(`Se va a enviar el correo al cliente:\n${selected.name}\nEmail: ${selected.email}`);
        } else if (selected) {
            alert('No se ha seleccionado email de cliente.');
        }

        setExecuting(true);
        setExecutionLogs(prev => [...prev, '', '🚀 Iniciando ejecución de automatización...']);

        try {
            const { data: userData } = await supabase.auth.getUser();
            const userEmail = userData?.user?.email || '';

            if (!selected) {
                setExecutionLogs(prev => [...prev, '❌ No se encontró la entidad seleccionada']);
                return;
            }

            setExecutionLogs(prev => [...prev, `📊 Entidad seleccionada: ${selected.name || selected.invoice_number || selected.title}`]);

            const payload: any = { userEmail };

            // Preparar payload según el tipo de automatización
            switch (modalAutomation.trigger_type) {
                case 'client_onboarding':
                case 'client_communication':
                case 'client_feedback':
                case 'sales_followup':
                    payload.clientId = selected.id;
                    payload.clientName = selected.name;
                    payload.clientEmail = selected.email;
                    payload.clientCompany = selected.company;
                    break;
                
                case 'invoice_followup':
                    payload.invoiceId = selected.id;
                    payload.invoiceNumber = selected.invoice_number;
                    payload.amount = selected.amount;
                    payload.dueDate = selected.due_date;
                    payload.clientId = selected.client_id;
                    break;
                
                case 'project_milestone':
                case 'project_delivery':
                case 'time_tracking':
                case 'budget_exceeded':
                case 'task_assigned':
                    payload.projectId = selected.id;
                    payload.projectName = selected.name;
                    payload.clientId = selected.client_id;
                    payload.budget = selected.budget;
                    break;
                
                case 'meeting_reminder':
                    payload.eventId = selected.id;
                    payload.eventTitle = selected.title;
                    payload.eventDate = selected.date;
                    payload.clientId = selected.client_id;
                    break;
                
                default:
                    // Para otros tipos, usar como cliente
                    payload.clientId = selected.id;
                    payload.clientName = selected.name;
                    payload.clientEmail = selected.email;
                    break;
            }

            setExecutionLogs(prev => [...prev, '⚙️ Ejecutando acciones de automatización...']);

            // Ejecutar cada acción de la automatización
            for (const [index, action] of modalAutomation.actions.entries()) {
                setExecutionLogs(prev => [...prev, `🔄 Ejecutando acción ${index + 1}/${modalAutomation.actions.length}: ${action.name}`]);
                
                try {
                    await executeAutomationAction(action, payload);
                    setExecutionLogs(prev => [...prev, `✅ Acción completada: ${action.name}`]);
                } catch (actionError) {
                    console.error('Error en acción:', actionError);
                    setExecutionLogs(prev => [...prev, `❌ Error en acción ${action.name}: ${actionError}`]);
                }
            }

            // Actualizar contador de ejecución
            const { error: updateError } = await supabase
                .from('freelancer_automations')
                .update({ 
                    execution_count: modalAutomation.execution_count + 1,
                    last_executed: new Date().toISOString()
                })
                .eq('id', modalAutomation.id);

            if (updateError) {
                console.error('Error updating execution count:', updateError);
            }

            setExecutionLogs(prev => [...prev, '', '🎉 ¡Automatización ejecutada correctamente!']);
            
            // Actualizar la lista local de automatizaciones
            setAutomations(prev => prev.map(auto => 
                auto.id === modalAutomation.id 
                    ? { 
                        ...auto, 
                        execution_count: auto.execution_count + 1,
                        last_executed: new Date().toISOString() 
                    }
                    : auto
            ));
            
        } catch (error) {
            console.error('❌ Error ejecutando automatización:', error);
            setExecutionLogs(prev => [...prev, `❌ Error: ${error}`]);
        } finally {
            setExecuting(false);
        }
    };

    const toggleAutomation = async (automationId: string, isActive: boolean) => {
        try {
            if (!supabase) return;

            const { error } = await supabase
                .from('freelancer_automations')
                .update({ is_active: !isActive })
                .eq('id', automationId);

            if (error) {
                console.error('Error toggling automation:', error);
                return;
            }

            // Actualizar estado local
            setAutomations(prev => prev.map(auto => 
                auto.id === automationId 
                    ? { ...auto, is_active: !isActive }
                    : auto
            ));
            
        } catch (error) {
            console.error('Error toggling automation:', error);
        }
    };

    useEffect(() => {
        loadAutomations();
    }, []);

    useEffect(() => {
        filterAutomations();
    }, [searchQuery, automations]);

    const getAutomationIcon = (triggerType: string) => {
        const iconMap: { [key: string]: any } = {
            'client_onboarding': Users,
            'client_communication': MessageSquare,
            'client_feedback': TrendingUp,
            'sales_followup': Phone,
            'invoice_followup': FileText,
            'project_milestone': CheckCircle,
            'project_delivery': Calendar,
            'time_tracking': Clock,
            'budget_exceeded': AlertCircle,
            'task_assigned': Settings,
            'meeting_reminder': Calendar
        };
        
        return iconMap[triggerType] || Zap;
    };

    const getAutomationColor = (triggerType: string) => {
        const colorMap: { [key: string]: string } = {
            'client_onboarding': 'text-blue-600',
            'client_communication': 'text-green-600',
            'client_feedback': 'text-purple-600',
            'sales_followup': 'text-orange-600',
            'invoice_followup': 'text-red-600',
            'project_milestone': 'text-emerald-600',
            'project_delivery': 'text-indigo-600',
            'time_tracking': 'text-amber-600',
            'budget_exceeded': 'text-pink-600',
            'task_assigned': 'text-cyan-600',
            'meeting_reminder': 'text-violet-600'
        };
        
        return colorMap[triggerType] || 'text-slate-600';
    };

    if (loading) {
        return (
            <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                <div className="flex-1 ml-56 overflow-hidden">
                    <div className="h-full overflow-y-auto">
                        <div className="flex items-center justify-center h-96">
                            <div className="text-center">
                                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-slate-600">Cargando automatizaciones...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex-1 ml-56 overflow-hidden">
                <div className="h-full overflow-y-auto">
                    <div className="min-h-screen bg-gradient-to-br from-slate-50/80 via-blue-50/90 to-indigo-100/80 backdrop-blur-3xl">
                        <div className="container mx-auto px-6 py-8">
                            {/* Header */}
                            <div className="mb-8">
                                <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl shadow-indigo-500/10 p-8">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                        <div>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                                                    <Zap className="w-6 h-6 text-white" />
                                                </div>
                                                <div>
                                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                                                        Automatizaciones
                                                    </h1>
                                                    <p className="text-slate-600 font-medium">
                                                        Automatiza tareas repetitivas y optimiza tu flujo de trabajo
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-3">
                                            <Button
                                                onClick={() => router.push('/dashboard/automations/create')}
                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105 transform transition-all duration-200"
                                            >
                                                <Plus className="w-5 h-5 mr-2" />
                                                Crear Automatización
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="mb-8">
                                <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/60 shadow-xl p-6">
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 max-w-md">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                                <Input
                                                    type="text"
                                                    placeholder="Buscar automatizaciones..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-10 bg-white/80 border-slate-200/60 focus:border-blue-400 focus:ring-blue-400/20"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Automatizaciones Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredAutomations.map((automation) => {
                                    const IconComponent = getAutomationIcon(automation.trigger_type);
                                    const iconColor = getAutomationColor(automation.trigger_type);
                                    
                                    return (
                                        <Card
                                            key={automation.id}
                                            className="group bg-white/60 backdrop-blur-xl border border-white/60 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
                                        >
                                            <CardHeader>
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3 flex-1">
                                                        <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                            <IconComponent className={`w-6 h-6 ${iconColor}`} />
                                                        </div>
                                                        <div>
                                                            <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                                                                {automation.name}
                                                            </CardTitle>
                                                            <p className="text-sm text-slate-600 capitalize">
                                                                {automation.trigger_type.replace('_', ' ')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-3 h-3 rounded-full ${
                                                            automation.is_active 
                                                                ? 'bg-green-500 shadow-lg shadow-green-500/50' 
                                                                : 'bg-slate-300'
                                                        }`}></div>
                                                        <button
                                                            onClick={() => toggleAutomation(automation.id, automation.is_active)}
                                                            className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
                                                        >
                                                            {automation.is_active ? 'Activa' : 'Inactiva'}
                                                        </button>
                                                    </div>
                                                </div>

                                                <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                                                    {automation.description}
                                                </p>

                                                <div className="space-y-3 mb-6">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-600">Acciones:</span>
                                                        <span className="font-semibold text-slate-900">
                                                            {automation.actions?.length || 0}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-600">Ejecuciones:</span>
                                                        <span className="font-semibold text-slate-900">
                                                            {automation.execution_count || 0}
                                                        </span>
                                                    </div>
                                                    {automation.last_executed && (
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="text-slate-600">Última ejecución:</span>
                                                            <span className="font-semibold text-slate-900">
                                                                {new Date(automation.last_executed).toLocaleDateString('es-ES')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardHeader>

                                            <CardContent className="pt-0">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        onClick={() => handleExecuteAutomation(automation)}
                                                        disabled={!automation.is_active}
                                                        className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                                                        size="sm"
                                                    >
                                                        <Play className="w-4 h-4 mr-2" />
                                                        Ejecutar
                                                    </Button>
                                                    
                                                    <Button
                                                        onClick={() => router.push(`/dashboard/automations/${automation.id}/edit`)}
                                                        variant="outline"
                                                        size="sm"
                                                        className="border-slate-200 hover:bg-slate-50"
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Empty State */}
                            {filteredAutomations.length === 0 && (
                                <div className="text-center py-16">
                                    <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6">
                                        <Zap className="w-12 h-12 text-slate-400" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                                        No se encontraron automatizaciones
                                    </h3>
                                    <p className="text-slate-600 mb-6 max-w-md mx-auto">
                                        {searchQuery 
                                            ? 'Intenta ajustar los filtros de búsqueda'
                                            : 'Comienza creando tu primera automatización para optimizar tu flujo de trabajo'
                                        }
                                    </p>
                                    <Button
                                        onClick={() => router.push('/dashboard/automations/create')}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                                    >
                                        <Plus className="w-5 h-5 mr-2" />
                                        Crear Primera Automatización
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal para ejecutar automatización */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
                <div className="sticky top-0 bg-white/95 backdrop-blur-xl border-b border-slate-200/60 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">
                                Ejecutar Automatización
                            </h3>
                            <p className="text-slate-600 mt-1">
                                {modalAutomation?.name}
                            </p>
                        </div>
                        <button
                            onClick={() => setModalOpen(false)}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    <form onSubmit={handleModalSubmit}>
                        <div className="space-y-6">
                            {/* Selección de cliente */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    <Users className="h-4 w-4 inline mr-2" />
                                    Selecciona un cliente para aplicar la automatización
                                </label>
                                
                                {entityLoading ? (
                                    <div className="text-center py-8">
                                        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                        <p className="text-slate-600 text-sm">Cargando clientes...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {entityOptions.length > 0 ? (
                                            entityOptions.map((entity) => (
                                                <div
                                                    key={entity.id}
                                                    className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                                                        selectedEntity === String(entity.id)
                                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                                    onClick={() => setSelectedEntity(String(entity.id))}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="selectedEntity"
                                                        value={entity.id}
                                                        checked={selectedEntity === String(entity.id)}
                                                        onChange={(e) => setSelectedEntity(e.target.value)}
                                                        className="sr-only"
                                                    />
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <h4 className="font-semibold text-slate-900">
                                                                {entity.name}
                                                            </h4>
                                                            {entity.displayInfo && (
                                                                <p className="text-sm text-slate-600 mt-1">
                                                                    {entity.displayInfo}
                                                                </p>
                                                            )}
                                                        </div>
                                                        {selectedEntity === String(entity.id) && (
                                                            <CheckCircle className="h-5 w-5 text-blue-600" />
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8">
                                                <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                                <p className="text-slate-500">
                                                    No se encontraron clientes disponibles
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Logs de ejecución */}
                            {executionLogs.length > 0 && (
                                <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm">
                                    <h4 className="text-slate-300 font-semibold mb-3 flex items-center">
                                        <Settings className="h-4 w-4 mr-2" />
                                        Estado de Ejecución
                                    </h4>
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                        {executionLogs.map((log, index) => (
                                            <div
                                                key={index}
                                                className={`text-slate-300 ${
                                                    log.includes('❌') ? 'text-red-400' :
                                                    log.includes('✅') ? 'text-green-400' :
                                                    log.includes('🚀') ? 'text-blue-400' :
                                                    log.includes('🔍') ? 'text-yellow-400' :
                                                    'text-slate-300'
                                                }`}
                                            >
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Botones */}
                            <div className="flex justify-end space-x-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-6 py-3 text-slate-600 hover:text-slate-800 font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!selectedEntity || entityLoading || executing}
                                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {executing ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                            Ejecutando...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="h-4 w-4 mr-2" />
                                            Ejecutar Automatización
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}
