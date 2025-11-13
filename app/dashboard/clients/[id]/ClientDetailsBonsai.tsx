'use client';

import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { showToast } from '@/utils/toast';
import {
    ArrowLeft,
    Building,
    Calendar,
    CheckCircle,
    Clock,
    FileText,
    Grid3X3,
    List,
    Mail,
    MapPin,
    Phone,
    Plus,
    Save,
    Search,
    Tag,
    User,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Note {
    id: string;
    content: string;
    created_at: string;
}

interface Task {
    id: string;
    title: string;
    is_done: boolean;
    created_at: string;
}

export default function ClientDetailsBonsai({ client, userEmail }: { client: any; userEmail: string }) {
    const supabase = createSupabaseClient();
    const router = useRouter();
    const [projects, setProjects] = useState<any[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(true);
    const [notes, setNotes] = useState<Note[]>([]);
    const [newNote, setNewNote] = useState('');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState('');
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [projectFormData, setProjectFormData] = useState({
        name: '',
        description: '',
        status: 'planning',
        budget: '',
        start_date: '',
        end_date: ''
    });

    const handleLogout = async () => {
        if (!supabase) {
            console.error('Supabase client not available');
            router.push('/login');
            return;
        }
        await supabase.auth.signOut();
        router.push('/login');
    };

    const fetchClientProjects = async () => {
        if (!supabase) {
            console.error('Supabase client not available');
            setLoadingProjects(false);
            return;
        }
        try {
            setLoadingProjects(true);
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data: projectsData, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id)
                .eq('client_id', client.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching client projects:', error);
            } else {
                setProjects(projectsData || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoadingProjects(false);
        }
    };

    const fetchNotes = async () => {
        if (!supabase) {
            console.error('Supabase client not available');
            return;
        }
        const { data } = await supabase
            .from('notes')
            .select('*')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false });

        setNotes(data || []);
    };

    const fetchTasks = async () => {
        if (!supabase) {
            console.error('Supabase client not available');
            return;
        }
        const { data } = await supabase
            .from('tasks')
            .select('*')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false });

        setTasks(data || []);
    };

    const addNote = async () => {
        if (!newNote.trim()) return;
        
        if (!supabase) {
            console.error('Supabase client not available');
            return;
        }

        const user = (await supabase.auth.getUser()).data.user;
        await supabase.from('notes').insert({
            content: newNote,
            client_id: client.id,
            user_id: user?.id,
        });
        setNewNote('');
        fetchNotes();
    };

    const addTask = async () => {
        if (!newTask.trim()) return;
        
        if (!supabase) {
            console.error('Supabase client not available');
            return;
        }

        const user = (await supabase.auth.getUser()).data.user;
        await supabase.from('tasks').insert({
            title: newTask,
            client_id: client.id,
            user_id: user?.id,
        });
        setNewTask('');
        fetchTasks();
    };

    const toggleTask = async (taskId: string, isDone: boolean) => {
        if (!supabase) {
            console.error('Supabase client not available');
            return;
        }
        await supabase.from('tasks').update({ is_done: !isDone }).eq('id', taskId);
        fetchTasks();
    };

    const createProject = async () => {
        if (!projectFormData.name.trim() || !supabase) {
            showToast.warning('Por favor, ingresa al menos el nombre del proyecto');
            return;
        }

        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const projectData: any = {
                user_id: user.id,
                client_id: client.id,
                name: projectFormData.name,
                status: projectFormData.status
            };

            if (projectFormData.description.trim()) {
                projectData.description = projectFormData.description;
            }

            if (projectFormData.budget && parseFloat(projectFormData.budget) > 0) {
                projectData.budget = parseFloat(projectFormData.budget);
            }

            if (projectFormData.start_date) {
                projectData.start_date = projectFormData.start_date;
            }

            if (projectFormData.end_date) {
                projectData.end_date = projectFormData.end_date;
            }

            const { data, error } = await supabase
                .from('projects')
                .insert([projectData])
                .select();

            if (error) {
                console.error('Error creating project:', error);
                showToast.error('Error al crear el proyecto: ' + error.message);
                return;
            }

            if (data) {
                setProjects(prev => [data[0], ...prev]);
                setProjectFormData({
                    name: '',
                    description: '',
                    status: 'planning',
                    budget: '',
                    start_date: '',
                    end_date: ''
                });
                setShowProjectModal(false);
                showToast.success('Proyecto creado exitosamente');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error inesperado al crear el proyecto');
        }
    };

    const handleProjectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await createProject();
    };

    useEffect(() => {
        fetchNotes();
        fetchTasks();
        fetchClientProjects();
    }, []);

    const filteredProjects = projects.filter(project =>
        project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <main className="ml-56 min-h-screen">
                {/* Header estilo Bonsai */}
                <div className="bg-white border-b border-gray-200">
                    <div className="px-6 py-6">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard/clients">
                                <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                            </Link>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-semibold text-lg">
                                        {client.name?.charAt(0).toUpperCase() || 'C'}
                                    </span>
                                </div>
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900">{client.name}</h1>
                                    <p className="text-sm text-gray-600">Detalles del cliente</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Información del cliente */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="p-6 border-b border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-900">Información del Cliente</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                        <span className="text-sm text-gray-900">{client.email || 'Sin email'}</span>
                                    </div>
                                    {client.phone && (
                                        <div className="flex items-center gap-3">
                                            <Phone className="h-5 w-5 text-gray-400" />
                                            <span className="text-sm text-gray-900">{client.phone}</span>
                                        </div>
                                    )}
                                    {client.company && (
                                        <div className="flex items-center gap-3">
                                            <Building className="h-5 w-5 text-gray-400" />
                                            <span className="text-sm text-gray-900">{client.company}</span>
                                        </div>
                                    )}
                                    {client.address && (
                                        <div className="flex items-center gap-3">
                                            <MapPin className="h-5 w-5 text-gray-400" />
                                            <span className="text-sm text-gray-900">{client.address}</span>
                                        </div>
                                    )}
                                    {client.city && client.province && (
                                        <div className="flex items-center gap-3">
                                            <MapPin className="h-5 w-5 text-gray-400" />
                                            <span className="text-sm text-gray-900">{client.city}, {client.province}</span>
                                        </div>
                                    )}
                                    {client.nif && (
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-5 w-5 text-gray-400" />
                                            <span className="text-sm text-gray-900">NIF: {client.nif}</span>
                                        </div>
                                    )}
                                    {client.tag && (
                                        <div className="flex items-center gap-3">
                                            <Tag className="h-5 w-5 text-gray-400" />
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {client.tag}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                                        <Calendar className="h-5 w-5 text-gray-400" />
                                        <span className="text-sm text-gray-600">
                                            Cliente desde {new Date(client.created_at).toLocaleDateString('es-ES')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Notas */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
                                <div className="p-6 border-b border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-900">Notas</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-3">
                                        <textarea
                                            className="w-full min-h-[80px] px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                            placeholder="Añadir nota..."
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                        />
                                        <Button
                                            onClick={addNote}
                                            size="sm"
                                            className="w-full bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Guardar nota
                                        </Button>
                                    </div>
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {notes.map((note) => (
                                            <div key={note.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                <p className="text-sm text-gray-900">{note.content}</p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    {new Date(note.created_at).toLocaleDateString('es-ES')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Tareas */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
                                <div className="p-6 border-b border-gray-200">
                                    <h3 className="text-lg font-medium text-gray-900">Tareas</h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-3">
                                        <Input
                                            placeholder="Nueva tarea..."
                                            value={newTask}
                                            onChange={(e) => setNewTask(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && addTask()}
                                            className="rounded-lg border-gray-300 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <Button
                                            onClick={addTask}
                                            size="sm"
                                            className="w-full bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Añadir tarea
                                        </Button>
                                    </div>
                                    <div className="space-y-3 max-h-64 overflow-y-auto">
                                        {tasks.map((task) => (
                                            <div
                                                key={task.id}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                                            >
                                                <label className="flex items-center gap-3 flex-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={task.is_done}
                                                        onChange={() => toggleTask(task.id, task.is_done)}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className={`text-sm ${task.is_done ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                                        {task.title}
                                                    </span>
                                                </label>
                                                {task.is_done ? (
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <Clock className="h-4 w-4 text-amber-500" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Proyectos */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="p-6 border-b border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-medium text-gray-900">Proyectos</h3>
                                        <Button
                                            onClick={() => setShowProjectModal(true)}
                                            className="bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Nuevo Proyecto
                                        </Button>
                                    </div>
                                </div>
                                <div className="p-6">
                                    {/* Búsqueda y vista */}
                                    {projects.length > 0 && (
                                        <div className="mb-6 flex items-center justify-between">
                                            <div className="flex-1 max-w-md">
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Search className="h-5 w-5 text-gray-400" />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar proyectos..."
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>
                                            <div className="ml-4 flex items-center space-x-2">
                                                <button
                                                    onClick={() => setViewMode('grid')}
                                                    className={`p-2 rounded-lg ${
                                                        viewMode === 'grid'
                                                            ? 'bg-blue-100 text-blue-600'
                                                            : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                                >
                                                    <Grid3X3 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('list')}
                                                    className={`p-2 rounded-lg ${
                                                        viewMode === 'list'
                                                            ? 'bg-blue-100 text-blue-600'
                                                            : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                                >
                                                    <List className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {loadingProjects ? (
                                        <div className="text-center py-12">
                                            <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                                            <p className="text-sm text-gray-600">Cargando proyectos...</p>
                                        </div>
                                    ) : filteredProjects.length === 0 && searchTerm ? (
                                        <div className="text-center py-12">
                                            <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Sin resultados</h4>
                                            <p className="text-sm text-gray-600 mb-4">
                                                No se encontraron proyectos que coincidan con "{searchTerm}"
                                            </p>
                                            <button
                                                onClick={() => setSearchTerm('')}
                                                className="text-sm text-blue-600 hover:text-blue-700"
                                            >
                                                Limpiar búsqueda
                                            </button>
                                        </div>
                                    ) : projects.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Building className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">No hay proyectos</h4>
                                            <p className="text-sm text-gray-600 mb-4">
                                                No hay proyectos asociados a este cliente
                                            </p>
                                            <Button
                                                onClick={() => setShowProjectModal(true)}
                                                className="bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                Crear primer proyecto
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className={viewMode === 'grid' ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
                                            {filteredProjects.map((project) => (
                                                viewMode === 'grid' ? (
                                                    <div
                                                        key={project.id}
                                                        className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                                                    >
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                                                                {project.name?.charAt(0).toUpperCase() || 'P'}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-sm font-medium text-gray-900 truncate">{project.name}</h4>
                                                                <p className="text-xs text-gray-600 truncate">
                                                                    {project.description || 'Sin descripción'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-600">Estado:</span>
                                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                                                    project.status === 'active' ? 'bg-green-100 text-green-700' :
                                                                    project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                                    project.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                    {project.status === 'active' ? 'Activo' :
                                                                     project.status === 'completed' ? 'Completado' :
                                                                     project.status === 'paused' ? 'Pausado' : 'Planificación'}
                                                                </span>
                                                            </div>
                                                            {project.budget && (
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-gray-600">Presupuesto:</span>
                                                                    <span className="font-medium text-gray-900">€{project.budget.toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="mt-4 pt-3 border-t border-gray-200">
                                                            <Link href={`/dashboard/projects/${project.id}`}>
                                                                <Button size="sm" className="w-full bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                                                    Ver Detalles
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        key={project.id}
                                                        className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                                                                    {project.name?.charAt(0).toUpperCase() || 'P'}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-3 mb-1">
                                                                        <h4 className="text-sm font-medium text-gray-900 truncate">{project.name}</h4>
                                                                        <span className={`px-2 py-1 rounded-md text-xs font-medium flex-shrink-0 ${
                                                                            project.status === 'active' ? 'bg-green-100 text-green-700' :
                                                                            project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                                            project.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                                                            'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                            {project.status === 'active' ? 'Activo' :
                                                                             project.status === 'completed' ? 'Completado' :
                                                                             project.status === 'paused' ? 'Pausado' : 'Planificación'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-gray-600 truncate">{project.description || 'Sin descripción'}</p>
                                                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                                        <span>Creado: {new Date(project.created_at).toLocaleDateString('es-ES')}</span>
                                                                        {project.budget && <span className="font-medium text-green-600">€{project.budget.toLocaleString()}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Link href={`/dashboard/projects/${project.id}`}>
                                                                <Button size="sm" className="bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0">
                                                                    Ver Detalles
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal de Nuevo Proyecto - Estilo Bonsai */}
            {showProjectModal && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowProjectModal(false);
                        }
                    }}
                >
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900">Crear Nuevo Proyecto</h3>
                                <button
                                    onClick={() => setShowProjectModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="mt-1 text-sm text-gray-600">Para {client.name}</p>
                        </div>

                        <form onSubmit={handleProjectSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre del Proyecto *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Desarrollo de sitio web"
                                    value={projectFormData.name}
                                    onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Descripción
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Describe el proyecto..."
                                    value={projectFormData.description}
                                    onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Estado
                                    </label>
                                    <select
                                        value={projectFormData.status}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, status: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="planning">Planificación</option>
                                        <option value="active">Activo</option>
                                        <option value="paused">Pausado</option>
                                        <option value="completed">Completado</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Presupuesto (€)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="5000"
                                        min="0"
                                        step="0.01"
                                        value={projectFormData.budget}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, budget: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Fecha de inicio
                                    </label>
                                    <input
                                        type="date"
                                        value={projectFormData.start_date}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, start_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Fecha de fin
                                    </label>
                                    <input
                                        type="date"
                                        value={projectFormData.end_date}
                                        onChange={(e) => setProjectFormData({ ...projectFormData, end_date: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowProjectModal(false)}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Crear Proyecto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
