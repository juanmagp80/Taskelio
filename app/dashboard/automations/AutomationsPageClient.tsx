'use client';

import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { executeAutomationAction, type ActionPayload } from '@/src/lib/automation-actions';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import {
    AlertCircle,
    AlertTriangle,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    MessageSquare,
    Phone,
    Play,
    Plus,
    Search,
    Settings,
    TrendingUp,
    Users,
    X,
    Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TrialBanner from '../../../components/TrialBanner';
import { useTrialStatus } from '../../../src/lib/useTrialStatus';

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
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200">
                {children}
            </div>
        </div>
    );
};

export default function AutomationsPageClient({ userEmail }: AutomationsPageClientProps) {
    // Hook de trial status
    const { trialInfo, loading: trialLoading, hasReachedLimit, canUseFeatures } = useTrialStatus(userEmail);
    
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
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createSupabaseClient();

    // Verificar si Supabase está disponible
    useEffect(() => {
        if (!supabase) {
            setConnectionError('No se pudo conectar con la base de datos. Verifica la configuración.');
            setLoading(false);
            return;
        }
        setConnectionError(null);
    }, [supabase]);

    const handleLogout = async () => {
        try {
            if (!supabase) return;
            await supabase.auth.signOut();
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const handleAutomationClick = async (automation: Automation) => {

        // ✅ Automatizaciones disponibles para todos los usuarios
        if (!supabase) {
            console.error('❌ Cliente Supabase no disponible');
            alert('Error: Cliente Supabase no disponible');
            return;
        }


        // Verificar configuración de Supabase
        const isConfigured = typeof supabase.from === 'function' && 
                           typeof supabase.auth?.getUser === 'function';
        
        if (!isConfigured) {
            console.error('❌ Supabase no está configurado correctamente');
            setModalAutomation(automation);
            setModalOpen(true);
            setEntityOptions([]);
            setSelectedEntity('');
            setExecutionLogs([
                '❌ Error de configuración de Supabase',
                '🔧 Verifica las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY',
                '📋 La funcionalidad de automatizaciones requiere conexión a la base de datos'
            ]);
            setEntityLoading(false);
            setExecuting(false);
            return;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        const user_id = userData?.user?.id || '';

        if (!user_id) {
            console.error('❌ Usuario no autenticado - user_id:', user_id);
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

        // Cargar reuniones próximas si es meeting_reminder
        if (automation.trigger_type === 'meeting_reminder') {
            
            try {
                const now = new Date();
                const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 días hacia adelante
                
                const { data: meetingsData, error: meetingsError } = await supabase
                    .from('calendar_events')
                    .select(`
                        id, title, description, start_time, end_time, location, 
                        meeting_url, meeting_platform, client_id, project_id,
                        clients!inner(id, name, email, company)
                    `)
                    .eq('user_id', user_id)
                    .eq('type', 'meeting')
                    .gte('start_time', now.toISOString())
                    .lte('start_time', futureDate.toISOString())
                    .in('status', ['scheduled', 'confirmed'])
                    .order('start_time', { ascending: true });

                if (meetingsError) {
                    console.error('❌ Error cargando reuniones:', meetingsError);
                    setExecutionLogs([
                        '❌ Error cargando reuniones: ' + meetingsError.message,
                        `🔍 User ID: ${user_id}`,
                        '🔧 Verifica que tengas reuniones programadas'
                    ]);
                    setEntityOptions([]);
                } else if (!meetingsData || meetingsData.length === 0) {
                    setExecutionLogs([
                        '🗓️ Buscando reuniones próximas...',
                        '⚠️ No se encontraron reuniones programadas para los próximos 30 días',
                        '📋 Ve a tu Calendario Inteligente para crear reuniones',
                        '🔧 Solo se muestran reuniones con clientes asignados'
                    ]);
                    setEntityOptions([]);
                } else {
                    
                    // Procesar reuniones con información del cliente
                    const meetingsWithInfo = meetingsData.map((meeting: any) => {
                        const startDate = new Date(meeting.start_time);
                        const endDate = new Date(meeting.end_time);
                        
                        return {
                            ...meeting,
                            displayInfo: [
                                `📅 ${meeting.title || meeting.summary || 'Reunión sin título'}`,
                                `👤 ${meeting.clients?.company || meeting.clients?.name || 'Sin cliente'}`,
                                `🕐 ${startDate.toLocaleDateString('es-ES')} ${startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
                                `📍 ${meeting.location || 'Sin ubicación'}`,
                                `⏱️ ${Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))} min`
                            ].filter(Boolean).join(' • '),
                            client_name: meeting.clients?.name || 'Cliente no especificado',
                            client_email: meeting.clients?.email || '',
                            client_company: meeting.clients?.company || '',
                            meeting_date: startDate.toLocaleDateString('es-ES'),
                            meeting_time: startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                            meeting_end_time: endDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                        };
                    });

                    setEntityOptions(meetingsWithInfo);
                    setExecutionLogs([
                        '🗓️ Cargando reuniones próximas...',
                        `✅ ${meetingsWithInfo.length} reuniones encontradas`,
                        `📋 Automatización: ${automation.name}`,
                        '🎯 Selecciona una reunión para enviar recordatorio'
                    ]);
                }
            } catch (error) {
                console.error('❌ Error buscando reuniones:', error);
                setExecutionLogs([
                    '❌ Error buscando reuniones: ' + (error instanceof Error ? error.message : String(error)),
                    `🔍 User ID: ${user_id}`,
                    '🔧 Verifica la conexión a la base de datos'
                ]);
                setEntityOptions([]);
            }
        } else if (automation.trigger_type === 'client_inactive') {
            // Para automatización de cliente inactivo, detectar automáticamente
            
            try {
                // Importar el detector de clientes inactivos
                const { ClientActivityDetector } = await import('@/src/lib/client-activity-detector');
                
                // Configurar el detector (30 días por defecto)
                const detector = new ClientActivityDetector(supabase, {
                    daysThreshold: 30,
                    checkCommunications: true,
                    checkProjectWork: true
                });

                const inactiveClients = await detector.detectInactiveClients(user_id);

                if (inactiveClients.length === 0) {
                    setExecutionLogs([
                        '🔍 Detectando clientes inactivos...',
                        '✅ ¡Excelente! Todos tus clientes están activos',
                        '📊 No se encontraron clientes sin actividad en los últimos 30 días',
                        '💡 Los criterios incluyen comunicaciones y trabajo en proyectos'
                    ]);
                    setEntityOptions([]);
                } else {
                    // Formatear los clientes inactivos como opciones
                    const inactiveOptions = inactiveClients.map(client => {
                        let reasonText = '';
                        switch (client.inactivityReason) {
                            case 'no_communication':
                                reasonText = 'Sin comunicación';
                                break;
                            case 'no_project_work':
                                reasonText = 'Sin trabajo en proyectos';
                                break;
                            case 'both':
                                reasonText = 'Sin comunicación ni trabajo';
                                break;
                        }
                        
                        return {
                            id: client.id,
                            name: client.name,
                            email: client.email,
                            company: client.company,
                            displayText: `${client.name} - ${reasonText} (${client.daysSinceLastActivity} días)`,
                            inactivityInfo: {
                                daysSinceLastActivity: client.daysSinceLastActivity,
                                reason: client.inactivityReason,
                                lastCommunication: client.lastCommunication,
                                lastProjectActivity: client.lastProjectActivity
                            }
                        };
                    });

                    setEntityOptions(inactiveOptions);
                    setExecutionLogs([
                        '🔍 Detectando clientes inactivos...',
                        `🎯 Encontrados ${inactiveClients.length} cliente(s) inactivo(s)`,
                        '📊 Criterios: sin comunicación O sin trabajo en proyectos por 30+ días',
                        '💡 Selecciona un cliente para enviar email de seguimiento'
                    ]);
                }
            } catch (error) {
                console.error('❌ Error detectando clientes inactivos:', error);
                setExecutionLogs([
                    '❌ Error detectando clientes inactivos: ' + (error as Error).message,
                    '🔧 Verifica la configuración de la base de datos',
                    '📝 Asegúrate de que existan las tablas: clients, client_communications, projects, tasks'
                ]);
                setEntityOptions([]);
            }
        } else if (automation.trigger_type === 'project_delayed') {
            // Para automatización de proyecto con retraso, NO mostrar lista - ejecutar directamente
            
            setExecutionLogs([
                '⚙️ Configurando alertas automáticas de proyectos...',
                '🎯 Esta automatización funcionará diariamente de forma automática',
                '📊 Detectará proyectos vencidos y enviará alertas sin intervención manual',
                '✅ Al ejecutar, se activará el sistema de monitoreo automático'
            ]);
            
            // No mostrar entidades para seleccionar - ejecutar directamente
            setEntityOptions([]);
        } else {
            // Para otras automatizaciones, cargar clientes como antes
            
            try {
                const clientsQuery = supabase
                    .from('clients')
                    .select('id, name, email, company, phone, created_at')
                    .eq('user_id', user_id)
                    .order('name');
                    
                const { data: clientsData, error: clientsError } = await clientsQuery;

                if (clientsError) {
                    console.error('❌ Error cargando clientes:', clientsError);
                    setExecutionLogs([
                        '❌ Error cargando clientes: ' + clientsError.message,
                        `🔍 User ID: ${user_id}`,
                        `🔧 Error code: ${clientsError.code || 'N/A'}`,
                        '🔧 Verifica la configuración de Supabase y permisos RLS'
                    ]);
                    setEntityOptions([]);
                } else if (!clientsData || clientsData.length === 0) {
                    setExecutionLogs([
                        '🔍 Cargando clientes disponibles...',
                        `⚠️ No se encontraron clientes para el usuario: ${user_id}`,
                        '📋 Verifica que tengas clientes creados en tu cuenta',
                        '👤 Ve a la sección de Clientes para crear uno'
                    ]);
                    setEntityOptions([]);
                } else {
                    
                    // Obtener información adicional para cada cliente
                    const clientsWithInfo = await Promise.all(
                        clientsData.map(async (client: any) => {
                            try {
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
                            } catch (err) {
                                console.error('Error obteniendo info adicional para cliente:', client.id, err);
                                return {
                                    ...client,
                                    projectCount: 0,
                                    invoiceCount: 0,
                                    displayInfo: [
                                        client.company || '',
                                        client.email || '',
                                        '0 proyectos',
                                        '0 facturas'
                                    ].filter(Boolean).join(' • ')
                                };
                            }
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
                console.error('❌ Error en catch:', error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                setExecutionLogs([
                    '❌ Error: ' + errorMessage,
                    `🔍 User ID: ${user_id}`,
                    '🔧 Verifica la conexión a la base de datos',
                    '🔧 Verifica las variables de entorno de Supabase'
                ]);
                setEntityOptions([]);
            }
        }

        setEntityLoading(false);
    };

    const loadAutomations = async () => {
        try {
            setLoading(true);

            if (!supabase) {
                setAutomations([]);
                setFilteredAutomations([]);
                return;
            }

            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError) {
                console.error('❌ Error getting user:', userError);
                return;
            }
            
            if (!user) {
                return;
            }

            const { data, error } = await supabase
                .from('automations')
                .select('*')
                // ✅ Quitar filtro de user_id para mostrar todas las automatizaciones
                .order('created_at', { ascending: false });


            if (error) {
                console.error('❌ Error loading automations:', error);
                return;
            }

            setAutomations(data || []);
            setFilteredAutomations(data || []);

        } catch (error) {
            console.error('❌ Error in loadAutomations:', error);
            // En caso de error, mostrar datos vacíos en lugar de fallar
            setAutomations([]);
            setFilteredAutomations([]);
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
            console.error('❌ Cliente Supabase no disponible');
            alert('Error: Cliente Supabase no disponible');
            return;
        }


        // Verificar configuración de Supabase
        const isConfigured = typeof supabase.from === 'function' && 
                           typeof supabase.auth?.getUser === 'function';
        
        if (!isConfigured) {
            console.error('❌ Supabase no está configurado correctamente');
            setModalAutomation(automation);
            setModalOpen(true);
            setEntityOptions([]);
            setSelectedEntity('');
            setExecutionLogs([
                '❌ Error de configuración de Supabase',
                '🔧 Verifica las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY',
                '📋 La funcionalidad de automatizaciones requiere conexión a la base de datos'
            ]);
            setEntityLoading(false);
            setExecuting(false);
            return;
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        const user_id = userData?.user?.id || '';

        if (!user_id) {
            console.error('❌ Usuario no autenticado - user_id:', user_id);
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
            
            const clientsQuery = supabase
                .from('clients')
                .select('id, name, email, company, phone, created_at')
                .eq('user_id', user_id)
                .order('name');
                
            
            const { data: clientsData, error: clientsError } = await clientsQuery;

            if (clientsError) {
                console.error('❌ Error cargando clientes:', clientsError);
                setExecutionLogs([
                    '❌ Error cargando clientes: ' + clientsError.message,
                    `🔍 User ID: ${user_id}`,
                    `🔧 Error code: ${clientsError.code || 'N/A'}`,
                    '🔧 Verifica la configuración de Supabase y permisos RLS'
                ]);
                setEntityOptions([]);
            } else if (!clientsData || clientsData.length === 0) {
                setExecutionLogs([
                    '🔍 Cargando clientes disponibles...',
                    `⚠️ No se encontraron clientes para el usuario: ${user_id}`,
                    '📋 Verifica que tengas clientes creados en tu cuenta',
                    '👤 Ve a la sección de Clientes para crear uno',
                    `🔧 Query ejecutada: SELECT * FROM clients WHERE user_id = '${user_id}'`
                ]);
                setEntityOptions([]);
            } else {
                
                // Obtener información adicional para cada cliente
                const clientsWithInfo = await Promise.all(
                    clientsData.map(async (client: any) => {
                        try {
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
                        } catch (err) {
                            console.error('Error obteniendo info adicional para cliente:', client.id, err);
                            return {
                                ...client,
                                projectCount: 0,
                                invoiceCount: 0,
                                displayInfo: [
                                    client.company || '',
                                    client.email || '',
                                    '0 proyectos',
                                    '0 facturas'
                                ].filter(Boolean).join(' • ')
                            };
                        }
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
            console.error('❌ Error en catch:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            setExecutionLogs([
                '❌ Error: ' + errorMessage,
                `🔍 User ID: ${user_id}`,
                '🔧 Verifica la conexión a la base de datos',
                '🔧 Verifica las variables de entorno de Supabase'
            ]);
            setEntityOptions([]);
        }

        setEntityLoading(false);
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Para automatizaciones automáticas no requerimos selectedEntity
        const isAutomaticAutomation = modalAutomation?.trigger_type === 'client_inactive' || modalAutomation?.trigger_type === 'project_delayed';
        
        if (!modalAutomation || !supabase) return;
        
        // Solo validar selectedEntity para automatizaciones que lo requieren
        if (!isAutomaticAutomation && !selectedEntity) return;

        // Mostrar el alert ANTES de cualquier lógica asíncrona - Solo para automatizaciones manuales
        if (!isAutomaticAutomation) {
            const selected = entityOptions.find(opt => String(opt.id) === selectedEntity);
            if (selected && selected.email) {
                alert(`Se va a enviar el correo al cliente:\n${selected.name}\nEmail: ${selected.email}`);
            } else if (selected && selected.client_email) {
                // Para reuniones, mostrar información de la reunión y cliente
                alert(`Se va a enviar recordatorio de reunión:\n${selected.title || selected.summary || 'Reunión'}\nCliente: ${selected.client_name}\nEmail: ${selected.client_email}`);
            } else if (selected && !selected.client_email && !selected.email) {
                // Solo mostrar error si no es una reunión sin email de cliente
            }
        } else {
        }

        setExecuting(true);
        setExecutionLogs(prev => [...prev, '', '🚀 Iniciando ejecución de automatización...']);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setExecutionLogs(prev => [...prev, '❌ Usuario no autenticado.']);
                setExecuting(false);
                return;
            }

            // Verificar si es automatización de proyecto con retraso
            if (modalAutomation.trigger_type === 'project_delayed') {
                
                try {
                    const today = new Date();
                    const { data: delayedProjects, error: projectsError } = await supabase
                        .from('projects')
                        .select(`
                            id, name, description, end_date, status, budget,
                            client_id, created_at,
                            clients!inner(id, name, email, company)
                        `)
                        .eq('user_id', user.id)
                        .in('status', ['active', 'in_progress', 'pending'])
                        .not('end_date', 'is', null)
                        .lt('end_date', today.toISOString().split('T')[0])
                        .order('end_date', { ascending: true });

                    if (projectsError) {
                        console.error('❌ Error detectando proyectos retrasados:', projectsError);
                        setExecutionLogs(prev => [
                            ...prev,
                            '❌ Error detectando proyectos retrasados: ' + projectsError.message
                        ]);
                        setExecuting(false);
                        return;
                    }

                    if (!delayedProjects || delayedProjects.length === 0) {
                        setExecutionLogs(prev => [
                            ...prev,
                            '✅ ¡Excelente! Todos tus proyectos están al día',
                            '📊 No se encontraron proyectos vencidos',
                            '🎯 La automatización queda activada para futuras revisiones'
                        ]);
                        setExecuting(false);
                        return;
                    }

                    setExecutionLogs(prev => [
                        ...prev,
                        `⚠️ Encontrados ${delayedProjects.length} proyecto(s) con retraso`,
                        '📧 Enviando alertas automáticas...'
                    ]);

                    // Parsear las acciones de la automatización
                    let actions = modalAutomation.actions;
                    if (typeof actions === 'string') {
                        actions = JSON.parse(actions);
                    }


                    let successCount = 0;
                    let errorCount = 0;

                    // Ejecutar acciones para cada proyecto retrasado
                    for (const project of delayedProjects) {
                        const endDate = new Date(project.end_date);
                        const daysOverdue = Math.ceil((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
                        
                        setExecutionLogs(prev => [
                            ...prev,
                            `🔄 Procesando: ${project.name} (${daysOverdue} días de retraso)`
                        ]);

                        // Crear payload específico para este proyecto
                        const projectPayload: ActionPayload & {
                            project_name?: string;
                            project_id?: string;
                            client_name?: string;
                            client_company?: string;
                            end_date?: string;
                            days_overdue?: string;
                            project_status?: string;
                            budget?: string;
                        } = {
                            client: {
                                id: project.client_id,
                                name: project.clients?.name || 'Cliente sin nombre',
                                email: project.clients?.email || '',
                                company: project.clients?.company || '',
                                phone: ''
                            },
                            automation: {
                                ...modalAutomation,
                                actions: actions
                            },
                            user: user,
                            supabase: supabase,
                            executionId: crypto.randomUUID(),
                            // Variables específicas del proyecto
                            project_name: project.name,
                            project_id: project.id,
                            client_name: project.clients?.name || 'Cliente sin nombre',
                            client_company: project.clients?.company || '',
                            end_date: endDate.toLocaleDateString('es-ES'),
                            days_overdue: daysOverdue.toString(),
                            project_status: project.status,
                            budget: project.budget?.toString() || '0'
                        };

                        // Ejecutar cada acción para este proyecto
                        for (const action of actions) {
                            
                            try {
                                const result = await executeAutomationAction(action, projectPayload);
                                
                                if (result.success) {
                                    setExecutionLogs(prev => [...prev, `✅ ${action.type} completado para ${project.name}`]);
                                    successCount++;
                                } else {
                                    setExecutionLogs(prev => [...prev, `❌ Error en ${action.type} para ${project.name}: ${result.message}`]);
                                    errorCount++;
                                }
                            } catch (actionError) {
                                console.error('❌ Error ejecutando acción:', actionError);
                                setExecutionLogs(prev => [...prev, `❌ Error ejecutando ${action.type} para ${project.name}`]);
                                errorCount++;
                            }
                        }
                    }

                    setExecutionLogs(prev => [
                        ...prev,
                        '🎉 ¡Automatización completada!',
                        `📊 Resumen: ${successCount} acciones exitosas, ${errorCount} errores`,
                        `📧 Alertas enviadas para ${delayedProjects.length} proyecto(s) retrasado(s)`
                    ]);

                    setExecuting(false);
                    return;

                } catch (error) {
                    console.error('❌ Error en automatización de proyectos retrasados:', error);
                    setExecutionLogs(prev => [
                        ...prev,
                        '❌ Error ejecutando automatización: ' + (error as Error).message
                    ]);
                    setExecuting(false);
                    return;
                }
            }

            // Lógica original para otras automatizaciones que requieren selección de entidad
            const selected = entityOptions.find(opt => String(opt.id) === selectedEntity);
            
            if (!selected) {
                setExecutionLogs(prev => [...prev, '❌ No se encontró la entidad seleccionada']);
                setExecuting(false);
                return;
            }

            setExecutionLogs(prev => [...prev, `📊 Entidad seleccionada: ${selected.name || selected.invoice_number || selected.title}`]);

            // 🔍 DEBUG: Verificar estructura de la automatización
            
            // Parsear las acciones si están como string
            let actions = modalAutomation?.actions;
            if (typeof actions === 'string') {
                try {
                    actions = JSON.parse(actions);
                } catch (parseError) {
                    console.error('❌ DEBUG: Error parseando actions:', parseError);
                    setExecutionLogs(prev => [...prev, '❌ Error: Las acciones de la automatización están mal formateadas']);
                    setExecuting(false);
                    return;
                }
            }

            // 🔍 DEBUG ADICIONAL: Verificar si las acciones están realmente vacías
            if (!actions || actions.length === 0) {
                console.error('❌ DEBUG: No hay acciones definidas para esta automatización');
                setExecutionLogs(prev => [...prev, '❌ Error: Esta automatización no tiene acciones configuradas']);
                setExecuting(false);
                return;
            } else {
            }

            const executionId = crypto.randomUUID();

            const payload: ActionPayload = {
                client: {
                    id: selected.id,
                    name: modalAutomation?.trigger_type === 'meeting_reminder' ? selected.client_name : selected.name,
                    email: modalAutomation?.trigger_type === 'meeting_reminder' ? selected.client_email : selected.email,
                    company: modalAutomation?.trigger_type === 'meeting_reminder' ? selected.client_company : selected.company,
                    phone: selected.phone || '',
                    ...selected
                },
                automation: {
                    id: modalAutomation?.id || '',
                    name: modalAutomation?.name || '',
                    description: modalAutomation?.description,
                    actions: actions
                },
                user: user,
                supabase: supabase,
                executionId: executionId,
                // Agregar datos de reunión si es meeting_reminder y se seleccionó una reunión
                ...(modalAutomation?.trigger_type === 'meeting_reminder' && {
                    meeting_title: selected.title || 'Reunión programada',
                    meeting_date: selected.meeting_date || 'Por confirmar',
                    meeting_time: selected.meeting_time || 'Por confirmar',
                    meeting_location: selected.location || selected.meeting_url || 'Por confirmar',
                    project_name: selected.project_name || 'Reunión general'
                })
            };

            setExecutionLogs(prev => [...prev, '⚙️ Ejecutando acciones de automatización...']);

            // Convertir actions a array si es un objeto único
            const actionsArray = Array.isArray(actions) ? actions : [actions];

            // Ejecutar cada acción de la automatización
            for (const action of actionsArray) {
                setExecutionLogs(prev => [...prev, `🔄 Ejecutando acción: ${action.name || action.type}`]);

                try {
                    const result = await executeAutomationAction(action, payload);
                    
                    if (result.success) {
                        setExecutionLogs(prev => [
                            ...prev,
                            `✅ Acción completada: ${action.name || action.type}`,
                            result.message ? `🟢 Detalle: ${result.message}` : ''
                        ]);
                    } else {
                        setExecutionLogs(prev => [
                            ...prev,
                            `❌ Error en acción ${action.name || action.type}:`,
                            result.message ? `🔴 Detalle: ${result.message}` : '',
                            result.error ? `🔴 Error: ${result.error}` : ''
                        ]);
                    }
                } catch (actionError) {
                    console.error('❌ ERROR CRÍTICO en acción:', actionError);
                    setExecutionLogs(prev => [...prev, `❌ Error en acción ${action.name || action.type}: ${actionError instanceof Error ? actionError.message : String(actionError)}`]);
                }
            }

            // Actualizar contador de ejecución
            if (modalAutomation?.id) {
                const { error: updateError } = await supabase
                    .from('automations')
                    .update({
                        execution_count: (modalAutomation.execution_count || 0) + 1,
                        last_executed: new Date().toISOString()
                    })
                    .eq('id', modalAutomation.id);

                if (updateError) {
                    console.error('Error updating execution count:', updateError);
                }

                // Actualizar la lista local de automatizaciones
                setAutomations(prev => prev.map(auto =>
                    auto.id === modalAutomation?.id
                        ? {
                            ...auto,
                            execution_count: (auto.execution_count || 0) + 1,
                            last_executed: new Date().toISOString()
                        }
                        : auto
                ));
            }

            setExecutionLogs(prev => [...prev, '', '🎉 ¡Automatización ejecutada correctamente!']);

        } catch (error) {
            console.error('❌ Error ejecutando automatización:', error);
            setExecutionLogs(prev => [...prev, `❌ Error: ${error instanceof Error ? error.message : String(error)}`]);
        } finally {
            setExecuting(false);
        }
    };

    const toggleAutomation = async (automationId: string, isActive: boolean) => {
        try {
            if (!supabase) return;

            const { error } = await supabase
                .from('automations')
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

    if (connectionError) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                <div className="flex-1 ml-56">
                    <div className="max-w-7xl mx-auto px-6 py-12">
                        <div className="text-center bg-white p-8 rounded-lg shadow max-w-md mx-auto">
                            <div className="text-red-500 text-6xl mb-4">⚠️</div>
                            <h2 className="text-xl font-semibold text-red-800 mb-4">Error de Conexión</h2>
                            <p className="text-red-600 mb-4">{connectionError}</p>
                            <button 
                                onClick={() => window.location.reload()} 
                                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                            >
                                Reintentar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                <div className="flex-1 ml-56">
                    <div className="max-w-7xl mx-auto px-6 py-12">
                        <div className="text-center">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-gray-600">Cargando automatizaciones...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <TrialBanner userEmail={userEmail} />
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex-1 ml-56">
                <div className="max-w-7xl mx-auto">
                    {/* Header Bonsai Style */}
                    <div className="bg-white border-b border-gray-200 px-6 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">Automatizaciones</h1>
                                <p className="mt-1 text-sm text-gray-600">
                                    Explora y usa {automations.length} automatizaciones disponibles
                                </p>
                            </div>
                            <button
                                onClick={() => router.push('/dashboard/automations/create')}
                                disabled={trialLoading}
                                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${trialLoading
                                        ? 'bg-gray-100 border-gray-300 text-gray-500 cursor-wait'
                                        : 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:border-blue-700'
                                    }`}
                            >
                                {trialLoading ? (
                                    <>
                                        <div className="w-4 h-4 mr-2 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                        Cargando...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Nueva Automatización
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="bg-white border-b border-gray-200 px-6 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <Zap className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Total</p>
                                        <p className="text-2xl font-semibold text-gray-900">{automations.length}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <Play className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Ejecuciones</p>
                                        <p className="text-2xl font-semibold text-gray-900">
                                            {automations.reduce((total, auto) => total + (auto.execution_count || 0), 0)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0">
                                        <Clock className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Creadas</p>
                                        <p className="text-2xl font-semibold text-gray-900">
                                            {automations.length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 max-w-lg">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar automatizaciones por nombre, descripción..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        >
                                            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Automations Content */}
                    <div className="bg-white px-6 py-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
                                    <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        ) : filteredAutomations.length === 0 ? (
                            <div className="text-center py-12">
                                <Zap className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">
                                    {searchQuery ? 'No se encontraron automatizaciones' : 'No hay automatizaciones'}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    {searchQuery
                                        ? `No hay automatizaciones que coincidan con "${searchQuery}"`
                                        : 'Comienza creando tu primera automatización para optimizar tu flujo de trabajo.'
                                    }
                                </p>
                                {!searchQuery && (
                                    <div className="mt-6">
                                        <button
                                            onClick={() => router.push('/dashboard/automations/create')}
                                            disabled={trialLoading}
                                            className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${trialLoading
                                                    ? 'bg-gray-400 cursor-wait'
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
                                                    Nueva Automatización
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Vista Cards */
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {filteredAutomations.map((automation) => {
                                    const IconComponent = getAutomationIcon(automation.trigger_type);
                                    const iconColor = getAutomationColor(automation.trigger_type);

                                    return (
                                        <div key={automation.id} className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                            <div className="p-6">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0">
                                                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                            <IconComponent className={`h-5 w-5 ${iconColor}`} />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4 flex-1">
                                                        <h3 className="text-lg font-medium text-gray-900 truncate">
                                                            {automation.name}
                                                        </h3>
                                                        <p className="text-sm text-gray-500 capitalize truncate">
                                                            {automation.trigger_type.replace('_', ' ')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <p className="text-sm text-gray-600 line-clamp-2">
                                                        {automation.description}
                                                    </p>
                                                </div>

                                                <div className="mt-4 space-y-2">
                                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                                        <span>Acciones:</span>
                                                        <span className="font-medium text-gray-900">
                                                            {automation.actions?.length || 0}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm text-gray-600">
                                                        <span>Ejecuciones:</span>
                                                        <span className="font-medium text-gray-900">
                                                            {automation.execution_count || 0}
                                                        </span>
                                                    </div>
                                                    {automation.last_executed && (
                                                        <div className="flex items-center justify-between text-sm text-gray-600">
                                                            <span>Última ejecución:</span>
                                                            <span className="font-medium text-gray-900">
                                                                {new Date(automation.last_executed).toLocaleDateString('es-ES')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4 flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(automation.created_at).toLocaleDateString('es-ES')}
                                                    </span>
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => handleAutomationClick(automation)}
                                                            className="text-sm px-3 py-1 rounded-md font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
                                                            title="Ejecutar automatización"
                                                        >
                                                            Ejecutar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal para ejecutar automatización */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
                <div className="border-b border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                Ejecutar Automatización
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {modalAutomation?.name}
                            </p>
                        </div>
                        <button
                            onClick={() => setModalOpen(false)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    <form onSubmit={handleModalSubmit}>
                        <div className="space-y-6">
                            {/* Descripción especial para automatizaciones automáticas */}
                            {(modalAutomation?.trigger_type === 'client_inactive' || modalAutomation?.trigger_type === 'project_delayed') && (
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <Settings className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div className="ml-3">
                                            <h4 className="text-sm font-medium text-blue-900">
                                                Automatización Inteligente
                                            </h4>
                                            <p className="text-sm text-blue-700 mt-1">
                                                {modalAutomation?.trigger_type === 'client_inactive' 
                                                    ? 'Esta automatización detectará automáticamente clientes inactivos y enviará las alertas correspondientes.'
                                                    : 'Esta automatización detectará automáticamente proyectos con retraso y te enviará alertas para mantener todo bajo control.'
                                                }
                                            </p>
                                            <p className="text-xs text-blue-600 mt-2 font-medium">
                                                ⚡ No requiere selección manual - Funcionará automáticamente
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Selección de entidad (cliente o reunión) - Solo para automatizaciones que requieren selección manual */}
                            {modalAutomation?.trigger_type !== 'client_inactive' && modalAutomation?.trigger_type !== 'project_delayed' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        {modalAutomation?.trigger_type === 'meeting_reminder' ? (
                                            <>
                                                <Calendar className="h-4 w-4 inline mr-2" />
                                                Selecciona una reunión para enviar recordatorio
                                            </>
                                        ) : (
                                            <>
                                                <Users className="h-4 w-4 inline mr-2" />
                                                Selecciona un cliente para aplicar la automatización
                                            </>
                                        )}
                                    </label>

                                    {entityLoading ? (
                                        <div className="text-center py-8">
                                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                            <p className="text-gray-600 text-sm">Cargando clientes...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {entityOptions.length > 0 ? (
                                                entityOptions.map((entity) => (
                                                    <div
                                                        key={entity.id}
                                                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${selectedEntity === String(entity.id)
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
                                                {modalAutomation?.trigger_type === 'meeting_reminder' ? (
                                                    <>
                                                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                                        <p className="text-gray-500">
                                                            No se encontraron reuniones próximas
                                                        </p>
                                                        <p className="text-gray-400 text-sm mt-1">
                                                            Ve a tu Calendario Inteligente para programar reuniones
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                                        <p className="text-gray-500">
                                                            No se encontraron clientes disponibles
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            )}

                            {/* Logs de ejecución */}
                            {executionLogs.length > 0 && (
                                <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
                                    <h4 className="text-gray-300 font-medium mb-3 flex items-center">
                                        <Settings className="h-4 w-4 mr-2" />
                                        Estado de Ejecución
                                    </h4>
                                    <div className="space-y-1 max-h-64 overflow-y-auto">
                                        {executionLogs.map((log, index) => (
                                            <div
                                                key={index}
                                                className={`text-gray-300 ${log.includes('❌') ? 'text-red-400' :
                                                        log.includes('✅') ? 'text-green-400' :
                                                            log.includes('🚀') ? 'text-blue-400' :
                                                                log.includes('🔍') ? 'text-yellow-400' :
                                                                    'text-gray-300'
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
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                                >
                                    Cerrar
                                </button>
                                <button
                                    type="submit"
                                    disabled={
                                        (modalAutomation?.trigger_type === 'client_inactive' || modalAutomation?.trigger_type === 'project_delayed') 
                                            ? (entityLoading || executing)
                                            : (!selectedEntity || entityLoading || executing)
                                    }
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
