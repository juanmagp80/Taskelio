'use client';

import Sidebar from '@/components/Sidebar';
import TrialBanner from '@/components/TrialBanner';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import {
    ArrowLeft,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    Edit,
    Mail,
    Phone,
    Plus,
    Save,
    Trash2,
    User,
    X,
    AlertCircle,
    Target,
    Play,
    Pause,
    Timer
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { showToast } from '@/utils/toast';

// Tipo Task
type Task = {
    id: string;
    project_id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority?: 'low' | 'medium' | 'high';
    due_date?: string;
    created_at: string;
    phase_order?: number;
    // Campos de tiempo
    is_running?: boolean;
    total_time_seconds?: number;
    started_at?: string;
    last_start?: string;
    last_stop?: string;
};

// Tipo TimeEntry
type TimeEntry = {
    id: string;
    task_id: string;
    project_id: string;
    user_id: string;
    start_time: string;
    end_time?: string;
    duration_seconds: number;
    description?: string;
    created_at: string;
};



// Tipo Project
type Project = {
    id: string;
    name: string;
    description?: string;
    client_id: string;
    user_id: string;
    status: 'active' | 'completed' | 'paused' | 'cancelled';
    budget?: number;
    start_date?: string;
    end_date?: string;
    created_at: string;
    updated_at?: string;
    template_data?: {
        phases?: Array<{
            name: string;
            duration?: string;
            description?: string;
            estimated_cost?: number;
        }>;
        deliverables?: string[];
        pricing?: {
            base_price?: number;
            hourly_rate?: number;
            fixed_price?: boolean;
        };
    };
    // Relación con cliente
    client?: {
        id: string;
        name: string;
        company?: string;
        email?: string;
        phone?: string;
    };
    // Relación con tareas
    tasks?: Task[];
};

interface ProjectDetailsBonsaiProps {
    projectId: string;
    userEmail: string;
}

export default function ProjectDetailsBonsai({ projectId, userEmail }: ProjectDetailsBonsaiProps) {
    // Estados
    const [project, setProject] = useState<Project | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUserEmail, setCurrentUserEmail] = useState(userEmail);
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [liveTimers, setLiveTimers] = useState<{[taskId: string]: number}>({});
    const [taskFormData, setTaskFormData] = useState({
        title: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        due_date: ''
    });
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        client_id: '',
        budget: '',
        start_date: '',
        end_date: '',
        status: 'active'
    });

    const supabase = createSupabaseClient();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            if (supabase) {
                await supabase.auth.signOut();
            }
            router.push('/login');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    // Función para obtener el proyecto
    const fetchProject = async () => {
        try {
            setLoading(true);

            if (!supabase) {
                console.error('Supabase client not available');
                return;
            }

            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data: projectData, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    client:clients(id, name, company, email, phone)
                `)
                .eq('id', projectId)
                .eq('user_id', user.id)
                .single();

            if (error) {
                console.error('Error fetching project:', error);
                setProject(null);
                return;
            }

            setProject(projectData);
            
            // Actualizar formData con datos del proyecto
            setFormData({
                name: projectData.name || '',
                description: projectData.description || '',
                client_id: projectData.client_id || '',
                budget: projectData.budget?.toString() || '',
                start_date: projectData.start_date || '',
                end_date: projectData.end_date || '',
                status: projectData.status || 'active'
            });

        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Función para obtener clientes
    const fetchClients = async () => {
        try {
            if (!supabase) return;

            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data: clientsData, error } = await supabase
                .from('clients')
                .select('id, name, company')
                .eq('user_id', user.id)
                .order('name');

            if (error) {
                console.error('Error fetching clients:', error);
                return;
            }

            setClients(clientsData || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Función para obtener tareas
    const fetchTasks = async () => {
        try {
            if (!supabase) return;

            const { data: tasksData, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching tasks:', error);
                return;
            }

                id: task.id,
                title: task.title,
                is_running: task.is_running,
                total_time_seconds: task.total_time_seconds,
                last_start: task.last_start,
                totalTimeFormatted: formatTime(task.total_time_seconds || 0)
            })));

            setTasks(tasksData || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Cargar datos al montar
    useEffect(() => {
        fetchProject();
        fetchClients();
        fetchTasks();
    }, [projectId]);

    const handleSave = async () => {
        try {
            if (!supabase || !project) return;

            const updateData = {
                name: formData.name,
                description: formData.description || null,
                client_id: formData.client_id || null,
                status: formData.status,
                budget: formData.budget ? parseFloat(formData.budget) : null,
                start_date: formData.start_date || null,
                end_date: formData.end_date || null,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('projects')
                .update(updateData)
                .eq('id', project.id);

            if (error) {
                console.error('Error updating project:', error);
                showToast.error('Error al actualizar el proyecto');
                return;
            }

            setIsEditing(false);
            fetchProject();
        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error al actualizar el proyecto');
        }
    };

    // Función para generar tareas desde las fases del template
    const generateTasksFromPhases = async () => {
        if (!project?.template_data?.phases || !supabase) {
            showToast.error('No hay fases del template para generar tareas');
            return;
        }

        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const tasksToCreate = project.template_data.phases.map((phase, index) => ({
                project_id: projectId,
                user_id: user.id,
                title: phase.name,
                description: phase.description || `Fase ${index + 1}: ${phase.name}${phase.duration ? ` (Duración estimada: ${phase.duration})` : ''}`,
                status: 'pending',
                priority: 'medium',
                phase_order: index + 1
            }));

            const { error } = await supabase
                .from('tasks')
                .insert(tasksToCreate);

            if (error) {
                console.error('Error generating tasks:', error);
                showToast.error('Error al generar tareas desde las fases');
                return;
            }

            showToast.error(`Se generaron ${tasksToCreate.length} tareas basadas en las fases del template`);
            fetchTasks();
        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error al generar tareas');
        }
    };

    // Función para iniciar/parar el tiempo de una tarea (SIMPLIFICADA)
    const toggleTaskTimer = async (taskId: string, isCurrentlyRunning: boolean) => {
        try {
            if (!supabase) return;

            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const now = new Date().toISOString();
            
            
            // Buscar la tarea actual para ver su estado
            const currentTask = tasks.find(t => t.id === taskId);
            
            if (isCurrentlyRunning) {
                // PARAR: Calcular tiempo transcurrido y sumarlo al total
                
                if (currentTask?.last_start) {
                    // Calcular tiempo transcurrido en esta sesión
                    let startTime;
                    if (currentTask.last_start.endsWith('Z')) {
                        startTime = new Date(currentTask.last_start).getTime();
                    } else {
                        startTime = new Date(currentTask.last_start + 'Z').getTime();
                    }
                    
                    const nowMs = Date.now();
                    const sessionMs = nowMs - startTime;
                    const sessionSeconds = Math.floor(sessionMs / 1000);
                    const newTotalSeconds = (currentTask.total_time_seconds || 0) + sessionSeconds;
                    
                    
                    // Actualizar en base de datos
                    const { error } = await supabase
                        .from('tasks')
                        .update({
                            is_running: false,
                            last_stop: now,
                            total_time_seconds: newTotalSeconds
                        })
                        .eq('id', taskId);

                    if (error) {
                        console.error('❌ Error parando:', error);
                        return;
                    }

                } else {
                    
                    const { error } = await supabase
                        .from('tasks')
                        .update({
                            is_running: false,
                            last_stop: now
                        })
                        .eq('id', taskId);

                    if (error) {
                        console.error('❌ Error parando:', error);
                        return;
                    }

                }

            } else {
                // INICIAR: Solo cambiar el estado a running
                
                // Parar otras tareas primero
                const stopResult = await supabase
                    .from('tasks')
                    .update({ is_running: false })
                    .eq('project_id', projectId)
                    .eq('is_running', true);
                

                // Iniciar esta tarea
                const { data: updateData, error } = await supabase
                    .from('tasks')
                    .update({
                        is_running: true,
                        last_start: now,
                        started_at: now // Solo la primera vez
                    })
                    .eq('id', taskId);


                if (error) {
                    console.error('❌ Error iniciando:', error);
                    return;
                }

            }

            // Recargar tareas
            await fetchTasks();

        } catch (error) {
            console.error('❌ Error en toggleTaskTimer:', error);
        }
    };

    // Función para formatear tiempo
    const formatTime = (seconds: number) => {
        
        if (!seconds) {
            return '0m';
        }
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;


        if (hours > 0) {
            const result = `${hours}h ${minutes}m`;
            return result;
        } else if (minutes > 0) {
            const result = `${minutes}m`;
            return result;
        } else {
            const result = `${secs}s`;
            return result;
        }
    };

    // useEffect para actualizar cronómetros en tiempo real (SIMPLIFICADO)
    useEffect(() => {
        
        const interval = setInterval(() => {
            const newLiveTimers: {[taskId: string]: number} = {};
            const now = Date.now();
            
            tasks.forEach(task => {
                let displayTime = task.total_time_seconds || 0;
                
                if (task.is_running && task.last_start) {
                    // TAREA CORRIENDO: mostrar tiempo acumulado + tiempo de sesión actual
                    let startTime;
                    if (task.last_start.endsWith('Z')) {
                        startTime = new Date(task.last_start).getTime();
                    } else {
                        startTime = new Date(task.last_start + 'Z').getTime();
                    }
                    
                    const elapsedMs = now - startTime;
                    
                    const elapsedSeconds = Math.floor(elapsedMs / 1000);
                    
                    displayTime = (task.total_time_seconds || 0) + elapsedSeconds;
                    
                    // Log solo las tareas que están corriendo
                } else {
                    // TAREA PARADA: mostrar solo el tiempo acumulado
                    displayTime = task.total_time_seconds || 0;
                }
                
                newLiveTimers[task.id] = displayTime;
            });
            
            setLiveTimers(newLiveTimers);
        }, 1000);

        return () => clearInterval(interval);
    }, [tasks]);

    // useEffect para cargar datos al montar el componente
    useEffect(() => {
        fetchProject();
        fetchTasks();
        fetchClients();
    }, [projectId]);

    // Función para crear tarea
    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            if (!supabase) return;

            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const taskData = {
                project_id: projectId,
                user_id: user.id,
                title: taskFormData.title,
                description: taskFormData.description || null,
                status: taskFormData.status,
                priority: taskFormData.priority,
                due_date: taskFormData.due_date || null
            };

            const { error } = await supabase
                .from('tasks')
                .insert([taskData]);

            if (error) {
                console.error('Error creating task:', error);
                showToast.error('Error al crear la tarea');
                return;
            }

            // Reset form
            setTaskFormData({
                title: '',
                description: '',
                status: 'pending',
                priority: 'medium',
                due_date: ''
            });
            setShowTaskForm(false);
            fetchTasks();
        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error al crear la tarea');
        }
    };

    // Función para actualizar estado de tarea
    const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
        try {
            if (!supabase) return;

            const { error } = await supabase
                .from('tasks')
                .update({ status: newStatus })
                .eq('id', taskId);

            if (error) {
                console.error('Error updating task:', error);
                return;
            }

            fetchTasks();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Función para eliminar tarea
    const handleDeleteTask = async (taskId: string) => {
        if (!await showToast.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
            return;
        }

        try {
            if (!supabase) return;

            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (error) {
                console.error('Error deleting task:', error);
                return;
            }

            fetchTasks();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Calcular progreso del proyecto
    const calculateProgress = () => {
        if (tasks.length === 0) return 0;
        
        const completedTasks = tasks.filter(task => task.status === 'completed').length;
        return Math.round((completedTasks / tasks.length) * 100);
    };

    // Obtener color del estado
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'completed': return 'bg-blue-100 text-blue-800';
            case 'paused': return 'bg-yellow-100 text-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Obtener texto del estado
    const getStatusText = (status: string) => {
        switch (status) {
            case 'active': return 'Activo';
            case 'completed': return 'Completado';
            case 'paused': return 'Pausado';
            case 'cancelled': return 'Cancelado';
            default: return status;
        }
    };

    // Obtener color de prioridad
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Obtener texto de prioridad
    const getPriorityText = (priority: string) => {
        switch (priority) {
            case 'high': return 'Alta';
            case 'medium': return 'Media';
            case 'low': return 'Baja';
            default: return priority;
        }
    };

    // Obtener color del estado de tarea
    const getTaskStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Obtener texto del estado de tarea
    const getTaskStatusText = (status: string) => {
        switch (status) {
            case 'completed': return 'Completada';
            case 'in_progress': return 'En Progreso';
            case 'pending': return 'Pendiente';
            default: return status;
        }
    };

    // Cargar datos al montar
    useEffect(() => {
        fetchProject();
        fetchClients();
        fetchTasks();
    }, [projectId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Sidebar userEmail={currentUserEmail} onLogout={handleLogout} />
                <div className="ml-56 min-h-screen">
                    <TrialBanner userEmail={userEmail} />
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-sm text-gray-600">Cargando proyecto...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Sidebar userEmail={currentUserEmail} onLogout={handleLogout} />
                <div className="ml-56 min-h-screen">
                    <TrialBanner userEmail={userEmail} />
                    <div className="flex items-center justify-center h-64">
                        <div className="text-center">
                            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                Proyecto no encontrado
                            </h2>
                            <p className="text-gray-600 mb-4">
                                El proyecto que buscas no existe o no tienes permisos para verlo.
                            </p>
                            <button 
                                onClick={() => router.push('/dashboard/projects')}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Volver a Proyectos
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar userEmail={currentUserEmail} onLogout={handleLogout} />

            <div className="ml-56 min-h-screen">
                <TrialBanner userEmail={userEmail} />

                {/* Header */}
                <div className="bg-white border-b border-gray-200">
                    <div className="px-6 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => router.push('/dashboard/projects')}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900">
                                        {project.name}
                                    </h1>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Detalles y gestión del proyecto
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                    {getStatusText(project.status)}
                                </span>
                                {!isEditing ? (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Editar
                                    </button>
                                ) : (
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            Guardar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resumen de Tiempo */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <div className="px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-100">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <Timer className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Tiempo Total</p>
                                        <p className="text-lg font-semibold text-blue-600">
                                            {formatTime(Object.values(liveTimers).reduce((total, time) => total + time, 0))}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                        <Play className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Tareas Activas</p>
                                        <p className="text-lg font-semibold text-green-600">
                                            {tasks.filter(task => task.is_running).length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Completadas</p>
                                        <p className="text-lg font-semibold text-purple-600">
                                            {tasks.filter(task => task.status === 'completed').length}/{tasks.length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-white rounded-lg p-4 shadow-sm border border-orange-100">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900">Valor Estimado</p>
                                        <p className="text-lg font-semibold text-orange-600">
                                            {project.budget ? `€${project.budget.toLocaleString()}` : '---'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Información del Proyecto */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Detalles principales */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Información del Proyecto</h3>
                                
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nombre *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Descripción
                                            </label>
                                            <textarea
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                rows={4}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Cliente
                                                </label>
                                                <select
                                                    value={formData.client_id}
                                                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="">Sin cliente asignado</option>
                                                    {clients.map((client) => (
                                                        <option key={client.id} value={client.id}>
                                                            {client.name} {client.company && `(${client.company})`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Estado
                                                </label>
                                                <select
                                                    value={formData.status}
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="active">Activo</option>
                                                    <option value="paused">Pausado</option>
                                                    <option value="completed">Completado</option>
                                                    <option value="cancelled">Cancelado</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Presupuesto (€)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.budget}
                                                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Progreso
                                                </label>
                                                <div className="pt-2">
                                                    <div className="flex items-center">
                                                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                                                            <div 
                                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                                style={{ width: `${calculateProgress()}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-700">
                                                            {calculateProgress()}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Fecha de Inicio
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.start_date}
                                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Fecha de Fin
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.end_date}
                                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {project.description && (
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Descripción</h4>
                                                <p className="text-gray-900">{project.description}</p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {project.client && (
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Cliente</h4>
                                                    <div className="flex items-center">
                                                        <User className="h-4 w-4 text-gray-400 mr-2" />
                                                        <span className="text-gray-900">{project.client.name}</span>
                                                        {project.client.company && (
                                                            <span className="text-gray-500 ml-1">({project.client.company})</span>
                                                        )}
                                                    </div>
                                                    {project.client.email && (
                                                        <div className="flex items-center mt-1">
                                                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                                                            <span className="text-gray-600">{project.client.email}</span>
                                                        </div>
                                                    )}
                                                    {project.client.phone && (
                                                        <div className="flex items-center mt-1">
                                                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                                                            <span className="text-gray-600">{project.client.phone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div>
                                                <h4 className="text-sm font-medium text-gray-700 mb-2">Progreso</h4>
                                                <div className="flex items-center">
                                                    <div className="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                                                        <div 
                                                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                            style={{ width: `${calculateProgress()}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {calculateProgress()}%
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {tasks.filter(t => t.status === 'completed').length} de {tasks.length} tareas completadas
                                                </p>
                                            </div>

                                            {project.budget && (
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Presupuesto</h4>
                                                    <div className="flex items-center">
                                                        <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                                                        <span className="text-gray-900">€{project.budget.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {(project.start_date || project.end_date) && (
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-700 mb-2">Fechas</h4>
                                                    {project.start_date && (
                                                        <div className="flex items-center">
                                                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                                                            <span className="text-gray-900">
                                                                Inicio: {new Date(project.start_date).toLocaleDateString('es-ES')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {project.end_date && (
                                                        <div className="flex items-center mt-1">
                                                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                                                            <span className="text-gray-900">
                                                                Fin: {new Date(project.end_date).toLocaleDateString('es-ES')}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Fases del Template */}
                            {project.template_data?.phases && project.template_data.phases.length > 0 && (
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-medium text-gray-900">Fases del Proyecto</h3>
                                        <button
                                            onClick={generateTasksFromPhases}
                                            className="inline-flex items-center px-3 py-1 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
                                        >
                                            <Target className="w-4 h-4 mr-1" />
                                            Generar Tareas desde Fases
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {project.template_data.phases.map((phase, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                                                {index + 1}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-medium text-gray-900">{phase.name}</h4>
                                                                {phase.duration && (
                                                                    <p className="text-sm text-gray-600">Duración: {phase.duration}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {phase.description && (
                                                            <p className="text-sm text-gray-700 mb-3 ml-11">{phase.description}</p>
                                                        )}
                                                        
                                                        {phase.estimated_cost && (
                                                            <div className="flex items-center ml-11">
                                                                <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                                                                <span className="text-sm text-gray-600">
                                                                    Costo estimado: €{phase.estimated_cost.toLocaleString()}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    {/* Verificar si ya hay tareas para esta fase */}
                                                    <div className="ml-4">
                                                        {tasks.some(task => task.title === phase.name) ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                Tarea creada
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                Sin tarea
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Entregables del template */}
                                    {project.template_data.deliverables && project.template_data.deliverables.length > 0 && (
                                        <div className="mt-6 pt-6 border-t border-gray-200">
                                            <h4 className="text-md font-medium text-gray-900 mb-3">Entregables Incluidos</h4>
                                            <div className="bg-blue-50 rounded-lg p-4">
                                                <ul className="space-y-2">
                                                    {project.template_data.deliverables.map((deliverable, index) => (
                                                        <li key={index} className="flex items-start">
                                                            <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                                            <span className="text-sm text-gray-700">{deliverable}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tareas */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-medium text-gray-900">Tareas del Proyecto</h3>
                                    <button
                                        onClick={() => setShowTaskForm(true)}
                                        className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Nueva Tarea
                                    </button>
                                </div>

                                {tasks.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Target className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-600">No hay tareas en este proyecto</p>
                                        <button
                                            onClick={() => setShowTaskForm(true)}
                                            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                                        >
                                            Crear primera tarea
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Agrupar tareas por fase si tienen phase_order */}
                                        {(() => {
                                            const tasksWithPhase = tasks.filter(task => task.phase_order);
                                            const tasksWithoutPhase = tasks.filter(task => !task.phase_order);
                                            const groupedTasks = tasksWithPhase.reduce((acc, task) => {
                                                const phase = task.phase_order!;
                                                if (!acc[phase]) acc[phase] = [];
                                                acc[phase].push(task);
                                                return acc;
                                            }, {} as Record<number, Task[]>);

                                            return (
                                                <>
                                                    {/* Tareas agrupadas por fase */}
                                                    {Object.entries(groupedTasks)
                                                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                                        .map(([phaseOrder, phaseTasks]) => {
                                                            const phaseNumber = parseInt(phaseOrder);
                                                            const phaseName = project.template_data?.phases?.[phaseNumber - 1]?.name || `Fase ${phaseNumber}`;
                                                            
                                                            return (
                                                                <div key={phaseOrder} className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                                                                    <div className="flex items-center gap-3 mb-3">
                                                                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                                            {phaseNumber}
                                                                        </div>
                                                                        <h4 className="font-medium text-blue-900">{phaseName}</h4>
                                                                        <span className="text-xs text-blue-700">
                                                                            {phaseTasks.filter(t => t.status === 'completed').length}/{phaseTasks.length} completadas
                                                                        </span>
                                                                    </div>
                                                                    
                                                                    <div className="space-y-2 ml-9">
                                                                        {phaseTasks.map((task) => (
                                                                            <div key={task.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                                                                                <div className="flex items-start justify-between">
                                                                                    <div className="flex-1">
                                                                                        <div className="flex items-center gap-2 mb-1">
                                                                                            <h5 className="text-sm font-medium text-gray-900">{task.title}</h5>
                                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority || 'medium')}`}>
                                                                                                {getPriorityText(task.priority || 'medium')}
                                                                                            </span>
                                                                                        </div>
                                                                                        {task.description && (
                                                                                            <p className="text-xs text-gray-600 mb-1">{task.description}</p>
                                                                                        )}
                                                                                        <div className="flex items-center justify-between">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        const nextStatus = task.status === 'pending' ? 'in_progress' : 
                                                                                                                          task.status === 'in_progress' ? 'completed' : 'pending';
                                                                                                        handleUpdateTaskStatus(task.id, nextStatus);
                                                                                                    }}
                                                                                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-80 ${getTaskStatusColor(task.status)}`}
                                                                                                    title="Clic para cambiar estado"
                                                                                                >
                                                                                                    {getTaskStatusText(task.status)}
                                                                                                </button>
                                                                                                {task.due_date && (
                                                                                                    <span className="text-xs text-gray-500">
                                                                                                        Vence: {new Date(task.due_date).toLocaleDateString('es-ES')}
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                            
                                                                                            {/* Controles de tiempo */}
                                                                                            <div className="flex items-center gap-2">
                                                                                                {/* Mostrar cronómetro siempre */}
                                                                                                <span className="text-xs text-blue-600 flex items-center gap-1">
                                                                                                    <Timer className="w-3 h-3" />
                                                                                                    <span className={task.is_running ? 'font-semibold text-green-600' : ''}>
                                                                                                        {formatTime(liveTimers[task.id] || 0)}
                                                                                                    </span>
                                                                                                    {task.is_running && (
                                                                                                        <span className="text-green-600 animate-pulse ml-1">●</span>
                                                                                                    )}
                                                                                                </span>
                                                                                                <button
                                                                                                    onClick={() => toggleTaskTimer(task.id, task.is_running || false)}
                                                                                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white transition-colors ${
                                                                                                        task.is_running 
                                                                                                            ? 'bg-red-500 hover:bg-red-600' 
                                                                                                            : 'bg-green-500 hover:bg-green-600'
                                                                                                    }`}
                                                                                                    title={task.is_running ? 'Parar cronómetro' : 'Iniciar cronómetro'}
                                                                                                >
                                                                                                    {task.is_running ? (
                                                                                                        <Pause className="w-3 h-3" />
                                                                                                    ) : (
                                                                                                        <Play className="w-3 h-3" />
                                                                                                    )}
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 ml-4">
                                                                                        <button
                                                                                            onClick={() => handleDeleteTask(task.id)}
                                                                                            className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                                                                                            title="Eliminar tarea"
                                                                                        >
                                                                                            <Trash2 className="w-3 h-3" />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}

                                                    {/* Tareas sin fase asignada */}
                                                    {tasksWithoutPhase.length > 0 && (
                                                        <div className="border border-gray-200 rounded-lg p-4">
                                                            <h4 className="font-medium text-gray-900 mb-3">Tareas Adicionales</h4>
                                                            <div className="space-y-3">
                                                                {tasksWithoutPhase.map((task) => (
                                                                    <div key={task.id} className="border border-gray-200 rounded-lg p-3">
                                                                        <div className="flex items-start justify-between">
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-2 mb-2">
                                                                                    <h4 className="font-medium text-gray-900">{task.title}</h4>
                                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority || 'medium')}`}>
                                                                                        {getPriorityText(task.priority || 'medium')}
                                                                                    </span>
                                                                                </div>
                                                                                {task.description && (
                                                                                    <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                                                                                )}
                                                                                <div className="flex items-center justify-between">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const nextStatus = task.status === 'pending' ? 'in_progress' : 
                                                                                                                  task.status === 'in_progress' ? 'completed' : 'pending';
                                                                                                handleUpdateTaskStatus(task.id, nextStatus);
                                                                                            }}
                                                                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border transition-colors hover:opacity-80 ${getTaskStatusColor(task.status)}`}
                                                                                            title="Clic para cambiar estado"
                                                                                        >
                                                                                            {getTaskStatusText(task.status)}
                                                                                        </button>
                                                                                        {task.due_date && (
                                                                                            <span className="text-xs text-gray-500">
                                                                                                Vence: {new Date(task.due_date).toLocaleDateString('es-ES')}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                    
                                                                                    {/* Controles de tiempo */}
                                                                                    <div className="flex items-center gap-2">
                                                                                        {/* Mostrar cronómetro siempre */}
                                                                                        <span className="text-xs text-blue-600 flex items-center gap-1">
                                                                                            <Timer className="w-3 h-3" />
                                                                                            <span className={task.is_running ? 'font-semibold text-green-600' : ''}>
                                                                                                {formatTime(liveTimers[task.id] || 0)}
                                                                                            </span>
                                                                                            {task.is_running && (
                                                                                                <span className="text-green-600 animate-pulse ml-1">●</span>
                                                                                            )}
                                                                                        </span>
                                                                                        <button
                                                                                            onClick={() => toggleTaskTimer(task.id, task.is_running || false)}
                                                                                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white transition-colors ${
                                                                                                task.is_running 
                                                                                                    ? 'bg-red-500 hover:bg-red-600' 
                                                                                                    : 'bg-green-500 hover:bg-green-600'
                                                                                            }`}
                                                                                            title={task.is_running ? 'Parar cronómetro' : 'Iniciar cronómetro'}
                                                                                        >
                                                                                            {task.is_running ? (
                                                                                                <Pause className="w-3 h-3" />
                                                                                            ) : (
                                                                                                <Play className="w-3 h-3" />
                                                                                            )}
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2 ml-4">
                                                                                <button
                                                                                    onClick={() => handleDeleteTask(task.id)}
                                                                                    className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                                                                                    title="Eliminar tarea"
                                                                                >
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar derecha */}
                        <div className="space-y-6">
                            {/* Estadísticas rápidas */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Estadísticas</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Total tareas</span>
                                        <span className="font-medium text-gray-900">{tasks.length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Completadas</span>
                                        <span className="font-medium text-green-600">
                                            {tasks.filter(t => t.status === 'completed').length}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">En progreso</span>
                                        <span className="font-medium text-blue-600">
                                            {tasks.filter(t => t.status === 'in_progress').length}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Pendientes</span>
                                        <span className="font-medium text-yellow-600">
                                            {tasks.filter(t => t.status === 'pending').length}
                                        </span>
                                    </div>
                                    
                                    {/* Estadísticas de tiempo */}
                                    <div className="pt-3 border-t border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Tiempo total</span>
                                            <span className="font-medium text-blue-600">
                                                {formatTime(Object.values(liveTimers).reduce((total, time) => total + time, 0))}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Tareas activas</span>
                                            <span className="font-medium text-green-600">
                                                {tasks.filter(t => t.is_running).length}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Información adicional del proyecto */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Información Adicional</h3>
                                
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Fecha de creación</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            {project.created_at ? new Date(project.created_at).toLocaleDateString('es-ES') : 'No disponible'}
                                        </span>
                                    </div>
                                    
                                    {project.updated_at && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Última actualización</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {new Date(project.updated_at).toLocaleDateString('es-ES')}
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Tareas totales</span>
                                        <span className="text-sm font-medium text-gray-900">{tasks.length}</span>
                                    </div>
                                    
                                    {project.budget && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Presupuesto</span>
                                            <span className="text-sm font-medium text-green-600">€{project.budget.toLocaleString()}</span>
                                        </div>
                                    )}
                                    
                                    <div className="pt-2 border-t border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Estado del proyecto</span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                                                {getStatusText(project.status)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Nueva Tarea */}
            {showTaskForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Nueva Tarea
                                </h3>
                                <button
                                    onClick={() => setShowTaskForm(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleCreateTask} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Título *
                                </label>
                                <input
                                    type="text"
                                    value={taskFormData.title}
                                    onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Descripción
                                </label>
                                <textarea
                                    value={taskFormData.description}
                                    onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Estado
                                    </label>
                                    <select
                                        value={taskFormData.status}
                                        onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="pending">Pendiente</option>
                                        <option value="in_progress">En Progreso</option>
                                        <option value="completed">Completada</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Prioridad
                                    </label>
                                    <select
                                        value={taskFormData.priority}
                                        onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="low">Baja</option>
                                        <option value="medium">Media</option>
                                        <option value="high">Alta</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Fecha de Vencimiento
                                </label>
                                <input
                                    type="date"
                                    value={taskFormData.due_date}
                                    onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowTaskForm(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                                >
                                    Crear Tarea
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                            )}
        </div>
    );
}