'use client';

import Sidebar from '@/components/Sidebar';
import { Button } from "@/components/ui/Button";
import { createClient } from '@supabase/supabase-js';
import {
    AlertTriangle,
    Calendar,
    Clock,
    Edit3,
    Play,
    Plus,
    Search,
    Square,
    Tag,
    Trash2,
    User
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { showToast } from '@/utils/toast';

// Configuración de usuario específico para mostrar datos
const MAIN_USER_ID = 'e7ed7c8d-229a-42d1-8a44-37bcc64c440c'; // Usuario con todos los datos

// Tipos básicos
type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'archived';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface Task {
    id: string;
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    due_date?: string;
    project_id?: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
    assigned_to?: string;
}

interface Project {
    id: string;
    name: string;
    description?: string;
    client_id?: string;
    user_id: string;
    status: string;
    budget?: number;
    start_date?: string;
    end_date?: string;
    created_at: string;
    updated_at: string;
}

const TasksPageClient: React.FC = () => {
    // Estados principales
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Cliente Supabase con permisos administrativos
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Estados de la interfaz
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
    const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

    // Estados para nueva tarea
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        status: 'pending' as TaskStatus,
        priority: 'medium' as TaskPriority,
        project_id: '',
        due_date: '',
        assigned_to: ''
    });

    // Estados del timer
    const [runningTask, setRunningTask] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState<Record<string, number>>({});
    const [startTime, setStartTime] = useState<Record<string, number>>({});

    const router = useRouter();

    // Función de logout para componente público
    const handleLogout = () => {
        router.push('/login');
    };

    // Función para obtener tareas del usuario principal
    const fetchTasks = async () => {
        setLoading(true);
        try {

            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', MAIN_USER_ID)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error fetching tasks:', error);
                setError('Error cargando tareas: ' + error.message);
                setTasks([]);
            } else {
                setTasks((data || []) as Task[]);
                setError(null);
            }
        } catch (err) {
            console.error('💥 Error crítico:', err);
            setError('Error crítico al cargar tareas');
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    // Función para obtener proyectos del usuario principal
    const fetchProjects = async () => {
        try {

            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', MAIN_USER_ID)
                .order('name', { ascending: true });

            if (error) {
                console.error('❌ Error fetching projects:', error);
                setProjects([]);
            } else {
                if (data && data.length > 0) {
                }
                setProjects((data || []) as Project[]);
            }
        } catch (err) {
            console.error('💥 Error crítico proyectos:', err);
            setProjects([]);
        }
    };

    // Efecto inicial - cargar datos
    useEffect(() => {
        fetchTasks();
        fetchProjects();
    }, []);

    // Filtrar tareas
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;

        return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });

    // Crear nueva tarea
    const createTask = async () => {
        if (!newTask.title.trim()) {
            showToast.warning('⚠️ El título de la tarea es obligatorio');
            return;
        }
        if (!newTask.project_id) {
            showToast.error('⚠️ Debes seleccionar un proyecto');
            return;
        }

        try {
            const taskData = {
                ...newTask,
                user_id: MAIN_USER_ID,
                description: newTask.description || null,
                due_date: newTask.due_date || null,
                assigned_to: newTask.assigned_to || null
            };

            const { error } = await supabase
                .from('tasks')
                .insert([taskData]);

            if (error) {
                console.error('Error creando tarea:', error);
                showToast.error('Error al crear la tarea: ' + error.message);
            } else {
                await fetchTasks();
                setShowCreateModal(false);
                setNewTask({
                    title: '',
                    description: '',
                    status: 'pending',
                    priority: 'medium',
                    project_id: '',
                    due_date: '',
                    assigned_to: ''
                });
            }
        } catch (err) {
            console.error('Error crítico:', err);
            showToast.error('Error crítico al crear la tarea');
        }
    };

    // Actualizar tarea
    const updateTask = async () => {
        if (!editingTask) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .update({
                    title: editingTask.title,
                    description: editingTask.description,
                    status: editingTask.status,
                    priority: editingTask.priority,
                    project_id: editingTask.project_id,
                    due_date: editingTask.due_date,
                    assigned_to: editingTask.assigned_to
                })
                .eq('id', editingTask.id);

            if (error) {
                console.error('Error actualizando tarea:', error);
                showToast.error('Error al actualizar la tarea: ' + error.message);
            } else {
                await fetchTasks();
                setShowEditModal(false);
                setEditingTask(null);
            }
        } catch (err) {
            console.error('Error crítico:', err);
            showToast.error('Error crítico al actualizar la tarea');
        }
    };

    // Eliminar tarea
    const deleteTask = async () => {
        if (!taskToDelete) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskToDelete.id);

            if (error) {
                console.error('Error eliminando tarea:', error);
                showToast.error('Error al eliminar la tarea: ' + error.message);
            } else {
                await fetchTasks();
                setShowDeleteModal(false);
                setTaskToDelete(null);
            }
        } catch (err) {
            console.error('Error crítico:', err);
            showToast.error('Error crítico al eliminar la tarea');
        }
    };

    // Funciones del timer
    const startTimer = (taskId: string) => {
        setRunningTask(taskId);
        setStartTime(prev => ({ ...prev, [taskId]: Date.now() }));
    };

    const stopTimer = (taskId: string) => {
        if (runningTask === taskId) {
            const elapsed = elapsedTime[taskId] || 0;
            const sessionTime = Date.now() - (startTime[taskId] || Date.now());
            setElapsedTime(prev => ({ ...prev, [taskId]: elapsed + sessionTime }));
            setRunningTask(null);
        }
    };

    const resetTimer = (taskId: string) => {
        setElapsedTime(prev => ({ ...prev, [taskId]: 0 }));
        setStartTime(prev => ({ ...prev, [taskId]: Date.now() }));
        if (runningTask === taskId) {
            setRunningTask(null);
        }
    };

    // Formatear tiempo
    const formatTime = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        return `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    };

    // Obtener tiempo actual para una tarea
    const getCurrentTime = (taskId: string) => {
        const baseTime = elapsedTime[taskId] || 0;
        if (runningTask === taskId) {
            const sessionTime = Date.now() - (startTime[taskId] || Date.now());
            return baseTime + sessionTime;
        }
        return baseTime;
    };

    // Efecto para actualizar el timer
    useEffect(() => {
        if (runningTask) {
            const interval = setInterval(() => {
                setElapsedTime(prev => ({ ...prev })); // Forzar re-render
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [runningTask]);

    // Obtener el color de prioridad
    const getPriorityColor = (priority: TaskPriority) => {
        switch (priority) {
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    // Obtener el color de estado
    const getStatusColor = (status: TaskStatus) => {
        switch (status) {
            case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'archived': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Sidebar userEmail="demo@clyra.com" onLogout={handleLogout} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-white/10 backdrop-blur-md border-b border-white/20 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-2">Gestión de Tareas</h1>
                            <p className="text-white/70">
                                Organiza y gestiona tus tareas de manera eficiente
                            </p>
                        </div>
                        <Button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Nueva Tarea
                        </Button>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                            <div className="text-white/70 text-sm">Total</div>
                            <div className="text-2xl font-bold text-white">{tasks.length}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                            <div className="text-white/70 text-sm">En Progreso</div>
                            <div className="text-2xl font-bold text-blue-400">
                                {tasks.filter(t => t.status === 'in_progress').length}
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                            <div className="text-white/70 text-sm">Completadas</div>
                            <div className="text-2xl font-bold text-green-400">
                                {tasks.filter(t => t.status === 'completed').length}
                            </div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                            <div className="text-white/70 text-sm">Proyectos</div>
                            <div className="text-2xl font-bold text-purple-400">{projects.length}</div>
                        </div>
                    </div>
                </div>

                {/* Filtros y búsqueda */}
                <div className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4">
                    <div className="flex flex-wrap gap-4">
                        {/* Búsqueda */}
                        <div className="flex-1 min-w-64 relative">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50" />
                            <input
                                type="text"
                                placeholder="Buscar tareas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Filtros */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="pending">Pendiente</option>
                            <option value="in_progress">En progreso</option>
                            <option value="paused">Pausada</option>
                            <option value="completed">Completada</option>
                            <option value="archived">Archivada</option>
                        </select>

                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
                            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="all">Todas las prioridades</option>
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>

                        <select
                            value={projectFilter}
                            onChange={(e) => setProjectFilter(e.target.value)}
                            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="all">Todos los proyectos</option>
                            {projects.map(project => (
                                <option key={project.id} value={project.id}>
                                    {project.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Contenido principal */}
                <div className="flex-1 overflow-auto p-6">
                    {loading && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-white text-xl">
                                🔄 Cargando datos públicos...
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-lg mb-6">
                            ⚠️ {error}
                        </div>
                    )}

                    {!loading && !error && tasks.length === 0 && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="text-white/50 text-6xl mb-4">📋</div>
                                <div className="text-white text-xl mb-2">No hay tareas disponibles</div>
                                <div className="text-white/70">Crea tu primera tarea para comenzar</div>
                            </div>
                        </div>
                    )}

                    {!loading && !error && tasks.length > 0 && filteredTasks.length === 0 && (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                                <div className="text-white/50 text-6xl mb-4">🔍</div>
                                <div className="text-white text-xl mb-2">No se encontraron tareas</div>
                                <div className="text-white/70">Prueba ajustando los filtros</div>
                            </div>
                        </div>
                    )}

                    {!loading && !error && filteredTasks.length > 0 && (
                        <div className="grid gap-4">
                            {filteredTasks.map((task) => {
                                const project = projects.find(p => p.id === task.project_id);
                                const isRunning = runningTask === task.id;
                                const currentTime = getCurrentTime(task.id);

                                return (
                                    <div
                                        key={task.id}
                                        className="bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-6 hover:bg-white/15 transition-all duration-200"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-xl font-semibold text-white">
                                                        {task.title}
                                                    </h3>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                                                        {task.priority}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                                                        {task.status}
                                                    </span>
                                                </div>

                                                {task.description && (
                                                    <p className="text-white/70 mb-3">{task.description}</p>
                                                )}

                                                <div className="flex items-center gap-4 text-sm text-white/60">
                                                    {project && (
                                                        <div className="flex items-center gap-1">
                                                            <Tag className="w-4 h-4" />
                                                            {project.name}
                                                        </div>
                                                    )}
                                                    {task.due_date && (
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="w-4 h-4" />
                                                            {new Date(task.due_date).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                    {task.assigned_to && (
                                                        <div className="flex items-center gap-1">
                                                            <User className="w-4 h-4" />
                                                            {task.assigned_to}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Timer */}
                                                <div className="flex items-center gap-3 mt-4">
                                                    <div className="flex items-center gap-1 text-white/70">
                                                        <Clock className="w-4 h-4" />
                                                        <span className="font-mono text-lg">
                                                            {formatTime(currentTime)}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {!isRunning ? (
                                                            <Button
                                                                onClick={() => startTimer(task.id)}
                                                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-sm"
                                                            >
                                                                <Play className="w-4 h-4" />
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                onClick={() => stopTimer(task.id)}
                                                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                                                            >
                                                                <Square className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            onClick={() => resetTimer(task.id)}
                                                            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 text-sm"
                                                        >
                                                            Reset
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Acciones */}
                                            <div className="flex gap-2 ml-4">
                                                <Button
                                                    onClick={() => {
                                                        setEditingTask(task);
                                                        setShowEditModal(true);
                                                    }}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => {
                                                        setTaskToDelete(task);
                                                        setShowDeleteModal(true);
                                                    }}
                                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modales aquí - simplificados para el ejemplo */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">Nueva Tarea</h3>

                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Título de la tarea"
                                value={newTask.title}
                                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                            />

                            <textarea
                                placeholder="Descripción (opcional)"
                                value={newTask.description}
                                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                                rows={3}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
                            />

                            <select
                                value={newTask.project_id}
                                onChange={(e) => setNewTask(prev => ({ ...prev, project_id: e.target.value }))}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Seleccionar proyecto</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>

                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    value={newTask.status}
                                    onChange={(e) => setNewTask(prev => ({ ...prev, status: e.target.value as TaskStatus }))}
                                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="pending">Pendiente</option>
                                    <option value="in_progress">En progreso</option>
                                    <option value="paused">Pausada</option>
                                    <option value="completed">Completada</option>
                                </select>

                                <select
                                    value={newTask.priority}
                                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="low">Baja</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>

                            <input
                                type="date"
                                value={newTask.due_date}
                                onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                onClick={createTask}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2"
                            >
                                Crear Tarea
                            </Button>
                            <Button
                                onClick={() => setShowCreateModal(false)}
                                className="px-6 bg-gray-600 hover:bg-gray-700 text-white py-2"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de edición - similar estructura */}
            {showEditModal && editingTask && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6 w-full max-w-md mx-4">
                        <h3 className="text-xl font-bold text-white mb-4">Editar Tarea</h3>

                        <div className="space-y-4">
                            <input
                                type="text"
                                value={editingTask.title}
                                onChange={(e) => setEditingTask(prev => prev ? { ...prev, title: e.target.value } : null)}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            />

                            <textarea
                                value={editingTask.description || ''}
                                onChange={(e) => setEditingTask(prev => prev ? { ...prev, description: e.target.value } : null)}
                                rows={3}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            />

                            <select
                                value={editingTask.project_id || ''}
                                onChange={(e) => setEditingTask(prev => prev ? { ...prev, project_id: e.target.value } : null)}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Sin proyecto</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}
                                    </option>
                                ))}
                            </select>

                            <div className="grid grid-cols-2 gap-4">
                                <select
                                    value={editingTask.status}
                                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, status: e.target.value as TaskStatus } : null)}
                                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="pending">Pendiente</option>
                                    <option value="in_progress">En progreso</option>
                                    <option value="paused">Pausada</option>
                                    <option value="completed">Completada</option>
                                    <option value="archived">Archivada</option>
                                </select>

                                <select
                                    value={editingTask.priority}
                                    onChange={(e) => setEditingTask(prev => prev ? { ...prev, priority: e.target.value as TaskPriority } : null)}
                                    className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="low">Baja</option>
                                    <option value="medium">Media</option>
                                    <option value="high">Alta</option>
                                    <option value="urgent">Urgente</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                onClick={updateTask}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2"
                            >
                                Actualizar
                            </Button>
                            <Button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingTask(null);
                                }}
                                className="px-6 bg-gray-600 hover:bg-gray-700 text-white py-2"
                            >
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de confirmación de eliminación */}
            {showDeleteModal && taskToDelete && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-6 w-full max-w-sm mx-4">
                        <div className="text-center">
                            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">¿Eliminar tarea?</h3>
                            <p className="text-white/70 mb-6">
                                Esta acción no se puede deshacer. La tarea "{taskToDelete.title}" será eliminada permanentemente.
                            </p>
                            <div className="flex gap-3">
                                <Button
                                    onClick={deleteTask}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2"
                                >
                                    Eliminar
                                </Button>
                                <Button
                                    onClick={() => {
                                        setShowDeleteModal(false);
                                        setTaskToDelete(null);
                                    }}
                                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2"
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TasksPageClient;
