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
    Grid3x3,
    List,
    Mail,
    MapPin,
    Phone,
    Plus,
    Save,
    Search,
    Sparkles,
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

export default function ClientDetails({ client, userEmail }: { client: any; userEmail: string }) {
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
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchInputRef, setSearchInputRef] = useState<HTMLInputElement | null>(null);
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

            // Construir el objeto solo con campos que sabemos que existen
            const projectData: any = {
                user_id: user.id,
                client_id: client.id,
                name: projectFormData.name,
                status: projectFormData.status
            };

            // Agregar descripción solo si existe
            if (projectFormData.description.trim()) {
                projectData.description = projectFormData.description;
            }

            // Agregar presupuesto solo si existe
            if (projectFormData.budget && parseFloat(projectFormData.budget) > 0) {
                projectData.budget = parseFloat(projectFormData.budget);
            }

            // Agregar fecha de inicio solo si existe
            if (projectFormData.start_date) {
                projectData.start_date = projectFormData.start_date;
            }

            // Agregar fecha de fin solo si existe
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

    // Atajo de teclado para búsqueda avanzada
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Ctrl/Cmd + K para focus en búsqueda
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                searchInputRef?.focus();
            }
            // Escape para limpiar búsqueda
            if (event.key === 'Escape') {
                setSearchTerm('');
                searchInputRef?.blur();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [searchInputRef]);

    // Filtrar proyectos
    const filteredProjects = projects.filter(project =>
        project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Manejar tecla Escape para cerrar modal
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowProjectModal(false);
            }
        };

        if (showProjectModal) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [showProjectModal]);

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 relative overflow-hidden">
            {/* Elementos decorativos animados de fondo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-indigo-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-indigo-500/5 via-blue-500/5 to-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
                <div className="absolute bottom-0 right-0 w-72 h-72 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <main className="flex-1 ml-64 overflow-auto relative z-10">
                {/* Header Espectacular */}
                <div className="bg-white/60 backdrop-blur-2xl border-b border-white/40 sticky top-0 z-20 shadow-xl shadow-slate-500/5">
                    <div className="p-8">
                        <div className="flex items-center gap-6">
                            <Link href="/dashboard/clients">
                                <button className="group p-4 bg-white/80 backdrop-blur-xl border-2 border-white/60 hover:border-blue-300 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-110 hover:-translate-y-1 transition-all duration-300">
                                    <ArrowLeft className="h-6 w-6 text-slate-600 group-hover:text-blue-600 transition-colors duration-300" />
                                </button>
                            </Link>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 relative">
                                    <span className="text-white font-black text-2xl">
                                        {client.name?.charAt(0).toUpperCase() || 'C'}
                                    </span>
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 via-blue-700 to-purple-700 bg-clip-text text-transparent truncate" title={client.name}>
                                        {client.name}
                                    </h1>
                                    <p className="text-slate-600 mt-2 font-semibold text-lg flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse block"></span>
                                        Información y gestión del cliente
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    <div className="grid gap-8 md:grid-cols-3">
                        {/* Información del cliente - Ultra Premium */}
                        <div className="group bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl shadow-slate-500/10 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                            {/* Hover Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="relative z-10">
                                <div className="bg-gradient-to-r from-blue-50/80 via-purple-50/80 to-indigo-50/80 backdrop-blur-xl p-6 rounded-t-3xl border-b border-white/40">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-2xl shadow-blue-500/40 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                            <FileText className="h-6 w-6 text-white" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 bg-gradient-to-r from-slate-900 via-blue-700 to-purple-700 bg-clip-text text-transparent">
                                            Información del Cliente
                                        </h3>
                                    </div>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="group/item flex items-center gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:border-blue-200 hover:scale-105 transition-all duration-300">
                                        <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl group-hover/item:from-blue-500 group-hover/item:to-blue-600 transition-all duration-300">
                                            <Mail className="h-5 w-5 text-blue-600 group-hover/item:text-white transition-colors duration-300" />
                                        </div>
                                        <span className="font-semibold text-slate-900 group-hover/item:text-blue-700 transition-colors duration-300">{client.email || 'Sin email'}</span>
                                    </div>
                                    {client.phone && (
                                        <div className="group/item flex items-center gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 hover:border-green-200 hover:scale-105 transition-all duration-300">
                                            <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 rounded-xl group-hover/item:from-green-500 group-hover/item:to-green-600 transition-all duration-300">
                                                <Phone className="h-5 w-5 text-green-600 group-hover/item:text-white transition-colors duration-300" />
                                            </div>
                                            <span className="font-semibold text-slate-900 group-hover/item:text-green-700 transition-colors duration-300">{client.phone}</span>
                                        </div>
                                    )}
                                    {client.company && (
                                        <div className="group/item flex items-center gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 hover:border-purple-200 hover:scale-105 transition-all duration-300">
                                            <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl group-hover/item:from-purple-500 group-hover/item:to-purple-600 transition-all duration-300">
                                                <Building className="h-5 w-5 text-purple-600 group-hover/item:text-white transition-colors duration-300" />
                                            </div>
                                            <span className="font-semibold text-slate-900 group-hover/item:text-purple-700 transition-colors duration-300">{client.company}</span>
                                        </div>
                                    )}
                                    {client.address && (
                                        <div className="group/item flex items-center gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 hover:border-orange-200 hover:scale-105 transition-all duration-300">
                                            <div className="p-2 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl group-hover/item:from-orange-500 group-hover/item:to-orange-600 transition-all duration-300">
                                                <MapPin className="h-5 w-5 text-orange-600 group-hover/item:text-white transition-colors duration-300" />
                                            </div>
                                            <span className="font-semibold text-slate-900 group-hover/item:text-orange-700 transition-colors duration-300">{client.address}</span>
                                        </div>
                                    )}
                                    {client.tag && (
                                        <div className="group/item flex items-center gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 hover:border-pink-200 hover:scale-105 transition-all duration-300">
                                            <div className="p-2 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl group-hover/item:from-pink-500 group-hover/item:to-pink-600 transition-all duration-300 flex-shrink-0">
                                                <Tag className="h-5 w-5 text-pink-600 group-hover/item:text-white transition-colors duration-300" />
                                            </div>
                                            <div className="max-w-[180px] px-4 py-2 bg-gradient-to-r from-blue-100 via-purple-100 to-indigo-100 text-blue-800 rounded-2xl font-black text-sm border-2 border-blue-200/60 shadow-lg group-hover/item:scale-110 group-hover/item:rotate-1 transition-all duration-300 truncate" title={client.tag}>
                                                {client.tag}
                                            </div>
                                        </div>
                                    )}
                                    <div className="group/item flex items-center gap-4 p-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/80 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 hover:border-indigo-200 hover:scale-105 transition-all duration-300">
                                        <div className="p-2 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl group-hover/item:from-indigo-500 group-hover/item:to-indigo-600 transition-all duration-300">
                                            <Calendar className="h-5 w-5 text-indigo-600 group-hover/item:text-white transition-colors duration-300" />
                                        </div>
                                        <span className="font-semibold text-slate-900 group-hover/item:text-indigo-700 transition-colors duration-300">
                                            Cliente desde {new Date(client.created_at).toLocaleDateString('es-ES')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notas */}
                        <Card className="rounded-2xl shadow-sm border-slate-100 hover:shadow-lg transition-shadow">
                            <CardHeader className="bg-gradient-to-r from-emerald-50 to-slate-50 rounded-t-2xl">
                                <CardTitle className="flex items-center gap-2 text-slate-900">
                                    <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                                        <FileText className="h-4 w-4 text-white" />
                                    </div>
                                    Notas
                                </CardTitle>
                                <CardDescription className="text-slate-600">
                                    Información importante sobre el cliente
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 p-6">
                                <div className="space-y-3">
                                    <textarea
                                        className="w-full min-h-[100px] px-4 py-3 text-sm border border-slate-200 rounded-xl bg-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-transparent transition-all"
                                        placeholder="Escribe una nota..."
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                    />
                                    <Button
                                        onClick={addNote}
                                        size="sm"
                                        className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Guardar nota
                                    </Button>
                                </div>
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {notes.map((note) => (
                                        <div key={note.id} className="p-4 bg-gradient-to-r from-emerald-50 to-slate-50 rounded-xl border border-emerald-100">
                                            <p className="text-sm text-slate-900 font-medium">{note.content}</p>
                                            <p className="text-xs text-slate-500 mt-2">
                                                {new Date(note.created_at).toLocaleDateString('es-ES')}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tareas */}
                        <Card className="rounded-2xl shadow-sm border-slate-100 hover:shadow-lg transition-shadow">
                            <CardHeader className="bg-gradient-to-r from-purple-50 to-slate-50 rounded-t-2xl">
                                <CardTitle className="flex items-center gap-2 text-slate-900">
                                    <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                                        <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    Tareas
                                </CardTitle>
                                <CardDescription className="text-slate-600">
                                    Seguimiento de pendientes
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 p-6">
                                <div className="space-y-3">
                                    <Input
                                        placeholder="Nueva tarea..."
                                        value={newTask}
                                        onChange={(e) => setNewTask(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addTask()}
                                        className="rounded-xl border-slate-200 focus:ring-purple-500 focus:border-transparent"
                                    />
                                    <Button
                                        onClick={addTask}
                                        size="sm"
                                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Añadir tarea
                                    </Button>
                                </div>
                                <div className="space-y-3 max-h-64 overflow-y-auto">
                                    {tasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-slate-50 rounded-xl border border-purple-100"
                                        >
                                            <label className="flex items-center gap-3 flex-1 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={task.is_done}
                                                    onChange={() => toggleTask(task.id, task.is_done)}
                                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                />
                                                <span className={`text-sm font-medium ${task.is_done ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                                                    {task.title}
                                                </span>
                                            </label>
                                            {task.is_done ? (
                                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <Clock className="h-4 w-4 text-amber-500" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Proyectos del Cliente */}
                        <Card className="md:col-span-3 rounded-2xl shadow-sm border-slate-100 hover:shadow-lg transition-shadow">
                            <CardHeader className="bg-gradient-to-r from-amber-50 to-slate-50 rounded-t-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                                            <Building className="h-4 w-4 text-white" />
                                        </div>
                                        <CardTitle className="text-slate-900">Proyectos</CardTitle>
                                    </div>
                                    <button
                                        onClick={() => setShowProjectModal(true)}
                                        className="group px-6 py-3 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:via-orange-700 hover:to-amber-800 text-white font-bold rounded-2xl shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-110 hover:-translate-y-1 transition-all duration-300"
                                    >
                                        <span className="flex items-center gap-2">
                                            <Plus className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500" />
                                            Nuevo Proyecto
                                            <Sparkles className="h-4 w-4 group-hover:scale-125 group-hover:rotate-45 transition-all duration-300" />
                                        </span>
                                    </button>
                                </div>
                                <CardDescription className="text-slate-600">
                                    Proyectos asociados a este cliente
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-6">
                                {/* Sección de búsqueda y filtros premium */}
                                {projects.length > 0 && (
                                    <div className="mb-6 space-y-4">
                                        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                                            {/* Botones de Vista con texto siempre visible */}
                                            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-white/80">
                                                <button
                                                    onClick={() => setViewMode('grid')}
                                                    className={`group flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-300 ${viewMode === 'grid'
                                                            ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-500/30'
                                                            : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'
                                                        }`}
                                                >
                                                    <Grid3x3 className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                                                    <span className="font-bold">Tarjetas</span>
                                                </button>
                                                <button
                                                    onClick={() => setViewMode('list')}
                                                    className={`group flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-300 ${viewMode === 'list'
                                                            ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-500/30'
                                                            : 'text-slate-600 hover:text-amber-600 hover:bg-amber-50'
                                                        }`}
                                                >
                                                    <List className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                                                    <span className="font-bold">Lista</span>
                                                </button>
                                            </div>

                                            {/* Buscador Premium MÁS ANCHO */}
                                            <div className="relative flex-1 lg:flex-none lg:min-w-[500px] group/search">
                                                {/* Fondo Decorativo con Gradientes Animados */}
                                                <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl opacity-0 group-focus-within/search:opacity-30 group-hover/search:opacity-20 blur-lg transition-all duration-700"></div>

                                                {/* Contenedor Principal MÁS GRANDE */}
                                                <div className="relative bg-white/70 backdrop-blur-2xl border-2 border-white/80 rounded-3xl shadow-2xl shadow-slate-500/10 group-focus-within/search:shadow-amber-500/25 group-focus-within/search:border-amber-300 group-focus-within/search:scale-[1.02] group-hover/search:shadow-xl transition-all duration-700">

                                                    {/* Icono de Búsqueda con Animaciones MEJORADO */}
                                                    <div className="absolute left-6 top-1/2 transform -translate-y-1/2 z-10">
                                                        <div className="relative">
                                                            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-2 group-focus-within/search:scale-125 group-focus-within/search:rotate-12 group-hover/search:scale-110 transition-all duration-700 shadow-2xl shadow-amber-500/40">
                                                                <Search className="w-full h-full text-white" />
                                                            </div>
                                                            {/* Efecto de ondas al hacer focus */}
                                                            <div className="absolute inset-0 bg-amber-500/20 rounded-2xl opacity-0 group-focus-within/search:opacity-100 group-focus-within/search:animate-ping"></div>
                                                        </div>
                                                    </div>

                                                    {/* Campo de Input Premium MÁS GRANDE */}
                                                    <input
                                                        ref={(el) => setSearchInputRef(el)}
                                                        type="text"
                                                        placeholder="🔍 Buscar proyectos por nombre, descripción... (Ctrl+K)"
                                                        value={searchTerm}
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                        className="w-full h-16 pl-16 pr-16 text-lg font-semibold text-slate-900 placeholder-slate-500 bg-transparent border-0 rounded-3xl focus:outline-none focus:ring-0 transition-all duration-500"
                                                        autoComplete="off"
                                                        spellCheck="false"
                                                    />

                                                    {/* Botón de Limpiar MEJORADO */}
                                                    {searchTerm && (
                                                        <button
                                                            onClick={() => setSearchTerm('')}
                                                            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-2xl shadow-2xl hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center group"
                                                            title="Limpiar búsqueda (ESC)"
                                                        >
                                                            <X className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-300" />
                                                        </button>
                                                    )}

                                                    {/* Atajos de teclado visibles */}
                                                    <div className="absolute right-4 bottom-1 text-xs text-slate-400 font-medium opacity-0 group-focus-within/search:opacity-100 transition-opacity duration-300">
                                                        ESC para limpiar
                                                    </div>
                                                </div>

                                                {/* Sugerencias flotantes */}
                                                {searchTerm && (
                                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-2xl shadow-slate-500/20 p-4 z-50 animate-in slide-in-from-top-2 duration-300">
                                                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Resultados: {filteredProjects.length}</div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-xl text-xs font-semibold">📂 Nombres</span>
                                                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-xl text-xs font-semibold">📝 Descripciones</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {loadingProjects ? (
                                    <div className="text-center py-12">
                                        <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                        <div className="text-sm text-slate-600 font-medium">Cargando proyectos...</div>
                                    </div>
                                ) : filteredProjects.length === 0 && searchTerm ? (
                                    <div className="text-center py-12">
                                        <Building className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Sin resultados</h3>
                                        <div className="text-sm text-slate-600 mb-6">
                                            No se encontraron proyectos que coincidan con "{searchTerm}"
                                        </div>
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors"
                                        >
                                            Limpiar búsqueda
                                        </button>
                                    </div>
                                ) : projects.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Building className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No hay proyectos</h3>
                                        <div className="text-sm text-slate-600 mb-6">
                                            No hay proyectos para este cliente
                                        </div>
                                        <Link href="/dashboard/projects">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="rounded-xl border-slate-200 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600"
                                            >
                                                Crear primer proyecto
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className={viewMode === 'grid' ? "grid gap-6 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"}>
                                        {filteredProjects.map((project) => (
                                            viewMode === 'grid' ? (
                                                <Card
                                                    key={project.id}
                                                    className="rounded-xl shadow-sm border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1"
                                                >
                                                    <CardHeader className="pb-3">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold">
                                                                {project.name?.charAt(0).toUpperCase() || 'P'}
                                                            </div>
                                                            <div className="flex-1">
                                                                <CardTitle className="text-base text-slate-900">{project.name}</CardTitle>
                                                                <CardDescription className="text-sm text-slate-600">
                                                                    {project.description || 'Sin descripción'}
                                                                </CardDescription>
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="pt-0 space-y-3">
                                                        <div className="space-y-2 text-sm">
                                                            <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                                                                <span className="text-slate-600">Estado:</span>
                                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${project.status === 'active' ? 'bg-green-100 text-green-700' :
                                                                        project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                                            project.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                    }`}>
                                                                    {project.status === 'active' ? 'Activo' :
                                                                        project.status === 'completed' ? 'Completado' :
                                                                            project.status === 'paused' ? 'Pausado' : 'Cancelado'}
                                                                </span>
                                                            </div>
                                                            {project.budget && (
                                                                <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                                                                    <span className="text-slate-600">Presupuesto:</span>
                                                                    <span className="font-semibold text-slate-900">${project.budget.toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between p-2 rounded-lg bg-slate-50">
                                                                <span className="text-slate-600">Creado:</span>
                                                                <span className="font-semibold text-slate-900">{new Date(project.created_at).toLocaleDateString('es-ES')}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2 pt-3 border-t">
                                                            <Link href={`/dashboard/projects/${project.id}`} className="flex-1">
                                                                <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                                                                    Ver Detalles
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ) : (
                                                /* Vista de Lista */
                                                <Card
                                                    key={project.id}
                                                    className="rounded-xl shadow-sm border-slate-100 hover:shadow-lg transition-all duration-300"
                                                >
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-4 flex-1">
                                                                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                                                                    {project.name?.charAt(0).toUpperCase() || 'P'}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-3 mb-1">
                                                                        <h4 className="font-bold text-slate-900 truncate">{project.name}</h4>
                                                                        <span className={`px-2 py-1 rounded-lg text-xs font-bold flex-shrink-0 ${project.status === 'active' ? 'bg-green-100 text-green-700' :
                                                                                project.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                                                    project.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                                                                        'bg-gray-100 text-gray-700'
                                                                            }`}>
                                                                            {project.status === 'active' ? 'Activo' :
                                                                                project.status === 'completed' ? 'Completado' :
                                                                                    project.status === 'paused' ? 'Pausado' : 'Cancelado'}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-600 truncate">{project.description || 'Sin descripción'}</p>
                                                                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                                                                        <span>Creado: {new Date(project.created_at).toLocaleDateString('es-ES')}</span>
                                                                        {project.budget && <span className="font-bold text-green-600">${project.budget.toLocaleString()}</span>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Link href={`/dashboard/projects/${project.id}`}>
                                                                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white">
                                                                    Ver Detalles
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            )
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Modal Espectacular de Nuevo Proyecto */}
            {showProjectModal && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-2xl z-50 flex items-start justify-center pt-8 pb-8 px-4 animate-fadeIn overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowProjectModal(false);
                        }
                    }}
                >
                    {/* Elementos decorativos flotantes */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-amber-500/15 to-orange-500/15 rounded-full animate-pulse blur-3xl"></div>
                        <div className="absolute top-20 right-20 w-24 h-24 bg-gradient-to-br from-orange-500/15 to-red-500/15 rounded-full animate-pulse blur-3xl" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-br from-yellow-500/15 to-amber-500/15 rounded-full animate-pulse blur-3xl" style={{ animationDelay: '2s' }}></div>
                        <div className="absolute bottom-10 right-10 w-28 h-28 bg-gradient-to-br from-red-500/15 to-orange-500/15 rounded-full animate-pulse blur-3xl" style={{ animationDelay: '0.5s' }}></div>
                    </div>

                    <div className="relative w-full max-w-2xl flex-shrink-0">
                        <div className="bg-white/95 backdrop-blur-3xl rounded-3xl shadow-2xl shadow-black/30 border border-white/60 relative overflow-hidden animate-slideInUp">
                            {/* Gradiente animado de fondo */}
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-yellow-500/5 opacity-80 pointer-events-none"></div>

                            {/* Border animado brillante */}
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-amber-500/30 via-orange-500/30 to-yellow-500/30 blur-sm animate-pulse pointer-events-none"></div>

                            <div className="relative z-10 p-8">
                                {/* Header Espectacular */}
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/40">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 rounded-3xl shadow-2xl shadow-amber-500/40 relative">
                                            <Building className="w-8 h-8 text-white" />
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
                                                <Sparkles className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-amber-700 to-orange-700 bg-clip-text text-transparent">
                                                Crear Nuevo Proyecto
                                            </h2>
                                            <p className="text-slate-600 font-semibold text-lg mt-1 flex items-center gap-2">
                                                <User className="w-4 h-4" />
                                                Para {client.name}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowProjectModal(false)}
                                        className="group p-4 bg-slate-100 hover:bg-red-50 rounded-2xl border-2 border-slate-200 hover:border-red-200 transition-all duration-300 hover:scale-110 hover:rotate-90 shadow-lg"
                                    >
                                        <X className="w-6 h-6 text-slate-500 group-hover:text-red-500 transition-colors duration-300" />
                                    </button>
                                </div>

                                {/* Formulario Espectacular */}
                                <form onSubmit={handleProjectSubmit} className="space-y-6">
                                    <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/70 p-6 shadow-xl">
                                        <div className="grid gap-6">
                                            <div className="group">
                                                <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-amber-600 transition-colors duration-300">
                                                    Nombre del Proyecto *
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="Ej: Desarrollo de sitio web corporativo"
                                                    value={projectFormData.name}
                                                    onChange={(e) => setProjectFormData({ ...projectFormData, name: e.target.value })}
                                                    className="w-full px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-amber-300 focus:border-amber-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all duration-300 text-slate-900 font-semibold placeholder-slate-400 shadow-lg focus:shadow-2xl focus:shadow-amber-500/10 transform focus:scale-[1.02]"
                                                    required
                                                />
                                            </div>

                                            <div className="group">
                                                <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-orange-600 transition-colors duration-300">
                                                    Descripción
                                                </label>
                                                <textarea
                                                    placeholder="Describe el proyecto y sus objetivos..."
                                                    rows={4}
                                                    value={projectFormData.description}
                                                    onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
                                                    className="w-full px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-orange-300 focus:border-orange-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-slate-900 font-semibold placeholder-slate-400 shadow-lg focus:shadow-2xl focus:shadow-orange-500/10 transform focus:scale-[1.02] resize-none"
                                                />
                                            </div>

                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div className="group">
                                                    <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-green-600 transition-colors duration-300">
                                                        Estado
                                                    </label>
                                                    <select
                                                        value={projectFormData.status}
                                                        onChange={(e) => setProjectFormData({ ...projectFormData, status: e.target.value })}
                                                        className="w-full px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-green-300 focus:border-green-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-500/20 transition-all duration-300 text-slate-900 font-semibold shadow-lg focus:shadow-2xl focus:shadow-green-500/10 transform focus:scale-[1.02]"
                                                    >
                                                        <option value="planning">Planificación</option>
                                                        <option value="in_progress">En Progreso</option>
                                                        <option value="completed">Completado</option>
                                                        <option value="on_hold">En Pausa</option>
                                                    </select>
                                                </div>

                                                <div className="group">
                                                    <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-blue-600 transition-colors duration-300">
                                                        Presupuesto (€)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        placeholder="5000"
                                                        min="0"
                                                        step="0.01"
                                                        value={projectFormData.budget}
                                                        onChange={(e) => setProjectFormData({ ...projectFormData, budget: e.target.value })}
                                                        className="w-full px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-blue-300 focus:border-blue-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 text-slate-900 font-semibold placeholder-slate-400 shadow-lg focus:shadow-2xl focus:shadow-blue-500/10 transform focus:scale-[1.02]"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div className="group">
                                                    <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors duration-300">
                                                        Fecha de inicio
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={projectFormData.start_date}
                                                        onChange={(e) => setProjectFormData({ ...projectFormData, start_date: e.target.value })}
                                                        className="w-full px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-purple-300 focus:border-purple-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all duration-300 text-slate-900 font-semibold shadow-lg focus:shadow-2xl focus:shadow-purple-500/10 transform focus:scale-[1.02]"
                                                    />
                                                </div>
                                                <div className="group">
                                                    <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-pink-600 transition-colors duration-300">
                                                        Fecha de fin
                                                    </label>
                                                    <input
                                                        type="date"
                                                        value={projectFormData.end_date}
                                                        onChange={(e) => setProjectFormData({ ...projectFormData, end_date: e.target.value })}
                                                        className="w-full px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-pink-300 focus:border-pink-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-500/20 transition-all duration-300 text-slate-900 font-semibold shadow-lg focus:shadow-2xl focus:shadow-pink-500/10 transform focus:scale-[1.02]"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botones de Acción Espectaculares */}
                                    <div className="flex gap-4 pt-6 border-t border-white/40">
                                        <button
                                            type="button"
                                            onClick={() => setShowProjectModal(false)}
                                            className="flex-1 px-8 py-4 bg-white/80 backdrop-blur-xl border-2 border-white/60 hover:border-slate-300 text-slate-700 font-black rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group text-lg"
                                        >
                                            <span className="group-hover:scale-110 transition-transform duration-300 inline-block">Cancelar</span>
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-8 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:via-orange-700 hover:to-amber-800 text-white font-black rounded-2xl shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-110 hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group text-lg"
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-3">
                                                <Save className="w-6 h-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                                                <span className="group-hover:scale-110 transition-transform duration-300">
                                                    Crear Proyecto
                                                </span>
                                                <Sparkles className="w-5 h-5 group-hover:scale-125 group-hover:rotate-45 transition-all duration-300" />
                                            </span>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}