'use client';

import Sidebar from '@/components/Sidebar';
import TrialBanner from '@/components/TrialBanner';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import {
    Clock,
    Pause,
    Play,
    Search,
    Timer,
    TrendingUp
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Tipos
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
    task?: {
        title: string;
        status: string;
    };
    project?: {
        name: string;
        client?: {
            name: string;
        };
    };
};

type ActiveTask = {
    id: string;
    title: string;
    is_running: boolean;
    total_time_seconds: number;
    last_start?: string;
    project_id?: string;
    project?: {
        id: string;
        name: string;
        client?: {
            name: string;
        };
    };
};

type Project = {
    id: string;
    name: string;
    client?: {
        name: string;
    };
};

interface TimeTrackingPageProps {
    userEmail: string;
}

export default function TimeTrackingPage({ userEmail }: TimeTrackingPageProps) {
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');

    // Estados para los selectores de proyecto y tarea
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>('');
    const [availableTasks, setAvailableTasks] = useState<ActiveTask[]>([]);
    const [selectedTaskId, setSelectedTaskId] = useState<string>('');

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

    // Función para obtener entradas de tiempo
    const fetchTimeEntries = async () => {
        try {
            if (!supabase) return;

            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const startOfDay = new Date(selectedDate);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(selectedDate);
            endOfDay.setHours(23, 59, 59, 999);

            const { data, error } = await supabase
                .from('time_entries')
                .select(`
                    *,
                    task:tasks(title, status),
                    project:projects(name, client:clients(name))
                `)
                .eq('user_id', user.id)
                .gte('start_time', startOfDay.toISOString())
                .lte('start_time', endOfDay.toISOString())
                .order('start_time', { ascending: false });

            if (error) {
                console.error('Error fetching time entries:', error);
                return;
            }

            setTimeEntries(data || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Función para obtener todas las tareas con tiempo
    const fetchAllTasks = async () => {
        try {
            if (!supabase) return;

            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    id,
                    title,
                    is_running,
                    total_time_seconds,
                    last_start,
                    project_id,
                    project:projects(id, name, client:clients(name))
                `)
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            if (error) {
                console.error('Error fetching all tasks:', error);
                return;
            }

            setActiveTasks(data || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Función para obtener todos los proyectos
    const fetchProjects = async () => {
        try {
            if (!supabase) return;

            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data, error } = await supabase
                .from('projects')
                .select(`
                    id,
                    name,
                    client:clients(name)
                `)
                .eq('user_id', user.id)
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching projects:', error);
                return;
            }

            setProjects(data || []);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Función para manejar cambio de proyecto
    const handleProjectChange = (projectId: string) => {
        setSelectedProjectId(projectId);
        setSelectedTaskId(''); // Resetear tarea seleccionada

        if (projectId) {
            // Filtrar tareas del proyecto seleccionado
            const filteredTasks = activeTasks.filter(task => task.project_id === projectId);
            setAvailableTasks(filteredTasks);
        } else {
            setAvailableTasks([]);
        }
    };

    // Función para iniciar una tarea
    const startTask = async (taskId: string) => {
        try {
            if (!supabase) return;

            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const now = new Date().toISOString();

            // Parar otras tareas primero
            await supabase
                .from('tasks')
                .update({ is_running: false })
                .eq('user_id', user.id)
                .eq('is_running', true);

            // Iniciar esta tarea
            const { error } = await supabase
                .from('tasks')
                .update({
                    is_running: true,
                    last_start: now
                })
                .eq('id', taskId);

            if (error) {
                console.error('Error starting task:', error);
                return;
            }

            fetchAllTasks();
            fetchTimeEntries();
        } catch (error) {
            console.error('❌ Error starting task:', error);
        }
    };

    // Función para parar una tarea activa
    const stopTask = async (taskId: string) => {
        try {
            if (!supabase) return;

            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            // Obtener datos frescos de la tarea directamente de la BD
            const { data: taskData, error: fetchError } = await supabase
                .from('tasks')
                .select(`
                    id,
                    title,
                    is_running,
                    total_time_seconds,
                    last_start,
                    project_id
                `)
                .eq('id', taskId)
                .single();

            if (fetchError || !taskData || !taskData.last_start) {
                return;
            }

            const now = new Date().toISOString();
            // Asegurarnos de que last_start se interprete como UTC añadiendo 'Z' si no la tiene
            const lastStartString = taskData.last_start.endsWith('Z') ? taskData.last_start : taskData.last_start + 'Z';
            const startTime = new Date(lastStartString);
            const endTime = new Date();

            const sessionDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
            const newTotalTime = (taskData.total_time_seconds || 0) + sessionDuration;

            // Actualizar la tarea
            const { error: taskError } = await supabase
                .from('tasks')
                .update({
                    is_running: false,
                    total_time_seconds: newTotalTime,
                    last_stop: now
                })
                .eq('id', taskId);

            if (taskError) {
                console.error('Error stopping task:', taskError);
                return;
            }

            // Crear entrada de tiempo

            const { error: timeError } = await supabase
                .from('time_entries')
                .insert({
                    task_id: taskId,
                    project_id: taskData.project_id || null,
                    user_id: user.id,
                    start_time: taskData.last_start,
                    end_time: now,
                    duration_seconds: sessionDuration
                });

            if (timeError) {
                console.error('Error creating time entry:', timeError);
            }

            fetchAllTasks();
            fetchTimeEntries();
        } catch (error) {
            console.error('Error stopping task:', error);
        }
    };

    // Función para formatear tiempo
    const formatTime = (seconds: number) => {
        if (!seconds) return '0m';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${secs}s`;
        }
    };

    // Componente para mostrar cronómetro en tiempo real
    const LiveSessionTimer = ({ startTime, className = "text-sm text-orange-600" }: { startTime: string; className?: string }) => {
        const [elapsed, setElapsed] = useState(0);

        useEffect(() => {
            // Corregir la zona horaria añadiendo 'Z' si no la tiene
            const startTimeString = startTime.endsWith('Z') ? startTime : startTime + 'Z';

            const calculateElapsed = () => {
                const start = new Date(startTimeString);
                const now = new Date();
                const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
                setElapsed(diff);
            };

            // Calcular inmediatamente
            calculateElapsed();

            // Actualizar cada segundo
            const interval = setInterval(calculateElapsed, 1000);

            return () => clearInterval(interval);
        }, [startTime]);

        return (
            <span className={className}>
                Sesión actual: {formatTime(elapsed)}
            </span>
        );
    };

    // Cargar proyectos al montar (solo una vez)
    useEffect(() => {
        fetchProjects();
    }, []);

    // Cargar datos al montar y cambiar fecha
    useEffect(() => {
        fetchTimeEntries();
        fetchAllTasks();
    }, [selectedDate]);

    // Filtrar entradas por búsqueda
    const filteredEntries = timeEntries.filter(entry =>
        entry.task?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.project?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.project?.client?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calcular estadísticas del día
    const dayStats = {
        totalTime: filteredEntries.reduce((total, entry) => total + entry.duration_seconds, 0),
        totalEntries: filteredEntries.length,
        activeTime: activeTasks.filter(task => task.is_running).reduce((total, task) => {
            if (task.last_start) {
                const elapsed = Math.floor((new Date().getTime() - new Date(task.last_start).getTime()) / 1000);
                return total + elapsed;
            }
            return total;
        }, 0)
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="ml-56 min-h-screen">
                <TrialBanner userEmail={userEmail} />

                {/* Header */}
                <div className="bg-white border-b border-gray-200">
                    <div className="px-6 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold text-gray-900">Control de Tiempo</h1>
                                <p className="mt-1 text-sm text-gray-600">
                                    Seguimiento y gestión del tiempo de trabajo
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Estadísticas rápidas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Clock className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Tiempo Total Hoy</p>
                                    <p className="text-2xl font-semibold text-gray-900">{formatTime(dayStats.totalTime)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Play className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Tiempo Activo</p>
                                    <p className="text-2xl font-semibold text-gray-900">{formatTime(dayStats.activeTime)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Timer className="h-6 w-6 text-purple-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Sesiones</p>
                                    <p className="text-2xl font-semibold text-gray-900">{dayStats.totalEntries}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                    <TrendingUp className="h-6 w-6 text-orange-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Tareas Activas</p>
                                    <p className="text-2xl font-semibold text-gray-900">{activeTasks.filter(task => task.is_running).length}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Control de Cronómetros con Selectores */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-6">Control de Cronómetros</h3>

                        {/* Selectores de Proyecto y Tarea */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Seleccionar Proyecto
                                </label>
                                <select
                                    value={selectedProjectId}
                                    onChange={(e) => handleProjectChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                    <option value="">-- Selecciona un proyecto --</option>
                                    {projects.map((project) => (
                                        <option key={project.id} value={project.id}>
                                            {project.name} {project.client?.name && `(${project.client.name})`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Seleccionar Tarea
                                </label>
                                <select
                                    value={selectedTaskId}
                                    onChange={(e) => setSelectedTaskId(e.target.value)}
                                    disabled={!selectedProjectId}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                    <option value="">
                                        {selectedProjectId ? '-- Selecciona una tarea --' : '-- Primero selecciona un proyecto --'}
                                    </option>
                                    {availableTasks.map((task) => (
                                        <option key={task.id} value={task.id}>
                                            {task.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Tarea seleccionada con control */}
                        {selectedTaskId && (() => {
                            const selectedTask = activeTasks.find(t => t.id === selectedTaskId);
                            if (!selectedTask) return null;

                            return (
                                <div className={`border rounded-lg p-6 mb-6 ${selectedTask.is_running ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'
                                    }`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h4 className="text-lg font-semibold text-gray-900">{selectedTask.title}</h4>
                                            <p className="text-sm text-gray-600 mt-1">
                                                {selectedTask.project?.name}
                                                {selectedTask.project?.client?.name && ` - ${selectedTask.project.client.name}`}
                                            </p>
                                            <div className="flex items-center gap-4 mt-3">
                                                <span className={`text-sm font-medium ${selectedTask.is_running ? 'text-green-700' : 'text-blue-700'
                                                    }`}>
                                                    Tiempo Total: {formatTime(selectedTask.total_time_seconds || 0)}
                                                </span>
                                                {selectedTask.is_running && selectedTask.last_start && (
                                                    <LiveSessionTimer startTime={selectedTask.last_start} className="text-sm text-orange-600 font-medium" />
                                                )}
                                                {selectedTask.is_running && (
                                                    <span className="flex items-center gap-2 text-green-600 font-medium animate-pulse">
                                                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                                                        En ejecución
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {selectedTask.is_running ? (
                                            <button
                                                onClick={() => stopTask(selectedTask.id)}
                                                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors font-medium"
                                                title="Parar cronómetro"
                                            >
                                                <Pause className="w-5 h-5" />
                                                Parar
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => startTask(selectedTask.id)}
                                                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors font-medium"
                                                title="Iniciar cronómetro"
                                            >
                                                <Play className="w-5 h-5" />
                                                Iniciar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Todas las tareas con tiempo (lista de resumen) */}
                        <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Todas las tareas con tiempo</h4>
                            <div className="space-y-2">
                                {activeTasks.filter(task => task.total_time_seconds > 0 || task.is_running).map((task) => (
                                    <div key={task.id} className={`border rounded-lg p-4 ${task.is_running ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                                        }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-medium text-gray-900">{task.title}</h4>
                                                <p className="text-sm text-gray-600">
                                                    {task.project?.name} {task.project?.client?.name && `- ${task.project.client.name}`}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className={`text-sm font-medium ${task.is_running ? 'text-green-600' : 'text-blue-600'
                                                        }`}>
                                                        Total: {formatTime(task.total_time_seconds || 0)}
                                                    </span>
                                                    {task.is_running && task.last_start && (
                                                        <LiveSessionTimer startTime={task.last_start} />
                                                    )}
                                                    {task.is_running && (
                                                        <span className="text-green-500 animate-pulse">● En ejecución</span>
                                                    )}
                                                </div>
                                            </div>
                                            {task.is_running ? (
                                                <button
                                                    onClick={() => stopTask(task.id)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                    title="Parar cronómetro"
                                                >
                                                    <Pause className="w-4 h-4" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => startTask(task.id)}
                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                                                    title="Iniciar cronómetro"
                                                >
                                                    <Play className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {activeTasks.filter(task => task.total_time_seconds > 0 || task.is_running).length === 0 && (
                                    <div className="text-center py-8">
                                        <Timer className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                        <p className="text-sm text-gray-600">No hay tareas con tiempo registrado</p>
                                        <p className="text-xs text-gray-500 mt-1">Selecciona un proyecto y tarea para iniciar el cronómetro</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Controles y filtros */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex flex-col sm:flex-row gap-4 flex-1">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Fecha
                                    </label>
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Buscar
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Buscar por tarea, proyecto o cliente..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lista de entradas de tiempo */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-6">
                                Registro de Tiempo - {new Date(selectedDate).toLocaleDateString('es-ES', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </h3>

                            {loading ? (
                                <div className="text-center py-12">
                                    <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-sm text-gray-600">Cargando registros...</p>
                                </div>
                            ) : filteredEntries.length === 0 ? (
                                <div className="text-center py-12">
                                    <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">No hay registros</h4>
                                    <p className="text-sm text-gray-600">
                                        {searchTerm
                                            ? `No se encontraron registros que coincidan con "${searchTerm}"`
                                            : 'No hay registros de tiempo para esta fecha'
                                        }
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredEntries.map((entry) => (
                                        <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h4 className="font-medium text-gray-900">{entry.task?.title}</h4>
                                                        <span className="text-sm text-blue-600 font-medium">
                                                            {formatTime(entry.duration_seconds)}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 mb-2">
                                                        {entry.project?.name} {entry.project?.client?.name && `- ${entry.project.client.name}`}
                                                    </p>
                                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                                        <span>
                                                            {new Date(entry.start_time).toLocaleTimeString('es-ES', {
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                            {entry.end_time && (
                                                                ` - ${new Date(entry.end_time).toLocaleTimeString('es-ES', {
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}`
                                                            )}
                                                        </span>
                                                        {entry.description && <span>• {entry.description}</span>}
                                                    </div>
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
    );
}
