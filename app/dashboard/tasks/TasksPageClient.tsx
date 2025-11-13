'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Button } from "@/components/ui/Button";
import CustomDatePicker from '@/components/ui/DatePicker';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { showToast } from '@/utils/toast';
import {
    Archive,
    Calendar,
    CheckCircle,
    Clock,
    Edit3,
    Filter,
    MoreVertical,
    Play,
    Plus,
    Search,
    Square,
    Tag,
    Timer,
    Trash2,
    User
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

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
    user_id?: string;
    assigned_to?: string;
    category?: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;
    // Campos de tiempo (persistencia)
    is_running?: boolean;
    total_time_seconds?: number;
    last_start?: string;
    last_stop?: string;
}

interface Project {
    id: string;
    name: string;
    status: string;
}

interface TasksPageClientProps {
    userEmail?: string;
}

export default function TasksPageClient({ userEmail }: TasksPageClientProps) {
    const [menuTaskId, setMenuTaskId] = useState<string | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
    const router = useRouter();
    const supabase = createSupabaseClient();

    // Estados básicos
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [projectFilter, setProjectFilter] = useState<string>('all');
    const [userId, setUserId] = useState<string | null>(null);
    const [currentUserEmail, setCurrentUserEmail] = useState<string>(userEmail || '');

    // Estados para modales
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [showTaskDetails, setShowTaskDetails] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Estado para nueva tarea
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        status: 'pending' as TaskStatus,
        priority: 'medium' as TaskPriority,
        due_date: '',
        project_id: '',
        category: 'general'
    });

    // Estados para categorías
    const [categories] = useState([
        { value: 'web_development', label: 'Desarrollo Web' },
        { value: 'frontend_development', label: 'Desarrollo Frontend' },
        { value: 'backend_development', label: 'Desarrollo Backend' },
        { value: 'mobile_development', label: 'Desarrollo Móvil' },
        { value: 'ui_ux_design', label: 'Diseño UI/UX' },
        { value: 'graphic_design', label: 'Diseño Gráfico' },
        { value: 'design', label: 'Diseño General' },
        { value: 'seo_sem', label: 'SEO/SEM' },
        { value: 'social_media', label: 'Redes Sociales' },
        { value: 'content_creation', label: 'Creación de Contenido' },
        { value: 'marketing', label: 'Marketing' },
        { value: 'consulting', label: 'Consultoría' },
        { value: 'research_analysis', label: 'Investigación y Análisis' },
        { value: 'client_meetings', label: 'Reuniones con Clientes' },
        { value: 'proposals_presentations', label: 'Propuestas y Presentaciones' },
        { value: 'client_communication', label: 'Comunicación con Clientes' },
        { value: 'invoicing_payments', label: 'Facturación y Pagos' },
        { value: 'business_admin', label: 'Administración del Negocio' },
        { value: 'email_management', label: 'Gestión de Emails' },
        { value: 'testing_qa', label: 'Testing y QA' },
        { value: 'learning_training', label: 'Formación y Aprendizaje' },
        { value: 'general', label: 'General' }
    ]);

    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [customCategories, setCustomCategories] = useState<Array<{ value: string, label: string }>>([]);

    // Estados del timer
    const [activeTimer, setActiveTimer] = useState<string | null>(null);
    const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Función para obtener el email del usuario
    const getCurrentUserEmail = async () => {
        if (currentUserEmail) return currentUserEmail; // Ya lo tenemos

        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                console.error('Error getting user:', error);
                return '';
            }

            if (user?.email) {
                setCurrentUserEmail(user.email);
                return user.email;
            }

            return '';
        } catch (error) {
            console.error('Error in getCurrentUserEmail:', error);
            return '';
        }
    };

    const handleLogout = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Función para limpiar sesión corrupta
    const clearCorruptedSession = async () => {
        try {

            // Limpiar cookies de Supabase
            if (typeof window !== 'undefined') {
                // Limpiar localStorage
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('sb-') || key.includes('supabase')) {
                        localStorage.removeItem(key);
                    }
                });

                // Limpiar sessionStorage
                Object.keys(sessionStorage).forEach(key => {
                    if (key.startsWith('sb-') || key.includes('supabase')) {
                        sessionStorage.removeItem(key);
                    }
                });

                // Limpiar cookies
                document.cookie.split(";").forEach((c) => {
                    const eqPos = c.indexOf("=");
                    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
                    if (name.trim().startsWith('sb-') || name.includes('supabase')) {
                        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
                    }
                });
            }

            // Intentar cerrar sesión de Supabase
            if (supabase) {
                await supabase.auth.signOut();
            }

            showToast.error('🔧 Se detectó un problema con la sesión. Serás redirigido al login para solucionarlo.');
            router.push('/login');

        } catch (error) {
            console.error('❌ Error limpiando sesión:', error);
            // Como último recurso, recargar la página
            window.location.reload();
        }
    };

    const resetNewTaskForm = () => {
        setNewTask({
            title: '',
            description: '',
            status: 'pending',
            priority: 'medium',
            due_date: '',
            project_id: '',
            category: 'general'
        });
        setShowNewCategoryInput(false);
        setNewCategoryName('');
    };

    const createCustomCategory = () => {
        if (!newCategoryName.trim()) return;

        const categoryValue = newCategoryName.toLowerCase().replace(/\s+/g, '_');
        const newCategory = {
            value: categoryValue,
            label: newCategoryName.trim()
        };

        // Verificar que no existe ya
        const allCategories = [...categories, ...customCategories];
        if (!allCategories.some(cat => cat.value === categoryValue)) {
            setCustomCategories(prev => [...prev, newCategory]);
            setNewTask({ ...newTask, category: categoryValue });
        }

        setShowNewCategoryInput(false);
        setNewCategoryName('');
    };

    const fetchTasks = async () => {
        if (!supabase) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching tasks:', error);
                setTasks([]);
            } else {
                setTasks((data || []) as Task[]);
            }
        } catch (error) {
            console.error('Error crítico:', error);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchProjects = async () => {
        if (!supabase) {
            console.error('❌ Supabase client no disponible');
            return;
        }

        try {

            // Intentar obtener el usuario de varias formas
            let uid = userId;

            if (!uid) {
                // Método 1: getUser (más confiable)
                const { data: authData, error: authError } = await supabase.auth.getUser();

                if (authError) {
                    console.error('❌ Error en getUser:', authError);
                    // Método 2: getSession como fallback
                    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

                    if (sessionError) {
                        console.error('❌ Error en getSession:', sessionError);
                        // Método 3: Forzar refresh de la sesión
                        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

                        if (refreshError) {
                            console.error('❌ Error en refreshSession:', refreshError);
                            await clearCorruptedSession();
                            return;
                        } else {
                            uid = refreshData?.session?.user?.id || null;
                        }
                    } else {
                        uid = sessionData?.session?.user?.id || null;
                    }
                } else {
                    uid = authData?.user?.id || null;
                }

                setUserId(uid);
            }

            if (!uid) {
                console.error('❌ No se pudo obtener user ID después de todos los intentos');
                showToast.warning('⚠️ No se pudo verificar tu identidad. Por favor, recarga la página o inicia sesión nuevamente.');
                setProjects([]);
                return;
            }


            const { data, error } = await supabase
                .from('projects')
                .select('id, name, status')
                .eq('user_id', uid)
                .order('name');


            if (error) {
                console.error('❌ Error fetching projects:', error);
                showToast.error('⚠️ Error al cargar proyectos: ' + error.message);
                setProjects([]);
                return;
            }

            if (!data) {
                setProjects([]);
                return;
            }


            // TEMPORAL: Mostrar TODOS los proyectos para debugging
            const activeProjects = data; // Sin filtrar por estado


            setProjects(activeProjects as Project[]);

            // Preseleccionar el proyecto "General" si existe y no hay proyecto seleccionado
            if (!newTask.project_id && activeProjects.length > 0) {
                const generalProject = activeProjects.find((p: any) => p.name === 'General');
                if (generalProject) {
                    setNewTask(prev => ({
                        ...prev,
                        project_id: generalProject.id
                    }));
                }
            }

        } catch (error) {
            console.error('❌ Error crítico en fetchProjects:', error);
            showToast.error('⚠️ Error crítico al cargar proyectos. Revisa la consola para más detalles.');
            setProjects([]);
        }
    };

    const createTask = async () => {
        if (!newTask.title.trim()) {
            showToast.warning('⚠️ El título de la tarea es obligatorio');
            return;
        }
        if (!newTask.category || newTask.category.trim() === '') {
            showToast.error('⚠️ Debes seleccionar una categoría');
            return;
        }
        if (!supabase) return;

        try {
            // Obtener el user_id actual
            let uid = userId;
            if (!uid) {
                const { data: authData, error: authError } = await supabase.auth.getUser();
                if (authError || !authData?.user?.id) {
                    showToast.warning('⚠️ Error de autenticación. Por favor, recarga la página e intenta nuevamente.');
                    return;
                }
                uid = authData.user.id;
                setUserId(uid);
            }


            // Si no hay project_id seleccionado, buscar el proyecto "General"
            let projectId = newTask.project_id;
            if (!projectId) {
                const { data: defaultProject, error: defaultError } = await supabase
                    .from('projects')
                    .select('id')
                    .eq('user_id', uid)
                    .eq('name', 'General')
                    .single();

                if (defaultError || !defaultProject) {
                    showToast.warning('⚠️ No se encontró un proyecto por defecto. Por favor, selecciona un proyecto.');
                    return;
                }
                projectId = defaultProject.id;
            }

            const taskData = {
                title: newTask.title,
                description: newTask.description || null,
                status: newTask.status,
                priority: newTask.priority,
                project_id: projectId, // Usar el project_id válido
                category: newTask.category,
                due_date: newTask.due_date || null,
                user_id: uid // ¡Añadir el user_id!
            };


            const { data, error } = await supabase
                .from('tasks')
                .insert([taskData])
                .select()
                .single();

            if (error) {
                console.error('Error creating task:', error);
                showToast.error('Error al crear la tarea: ' + error.message);
                return;
            }

            showToast.success('¡Tarea creada exitosamente! 🎉');
            setShowNewTaskModal(false);
            resetNewTaskForm();
            await fetchTasks();

        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error crítico al crear la tarea');
        }
    };

    const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
        if (!supabase) return;
        try {
            // Si la tarea está corriendo y se va a completar, primero pausar y guardar tiempo real
            const task = tasks.find(t => t.id === taskId);
            if (newStatus === 'completed' && task?.is_running) {
                await pauseTimer();
            }

            const { error } = await supabase
                .from('tasks')
                .update({
                    status: newStatus,
                    ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {})
                })
                .eq('id', taskId);

            if (error) {
                console.error('Error updating task:', error);
                showToast.error('Error al actualizar la tarea');
                return;
            }

            await fetchTasks();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const deleteTask = async (taskId: string) => {
        const confirmed = await showToast.confirm('¿Estás seguro de que quieres eliminar esta tarea?');
        if (!confirmed) return;
        if (!supabase) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', taskId);

            if (error) {
                console.error('Error deleting task:', error);
                showToast.error('Error al eliminar la tarea');
                return;
            }

            await fetchTasks();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const updateTask = async () => {
        if (!editingTask || !editingTask.id) return;
        if (!supabase) return;

        try {
            const { error } = await supabase
                .from('tasks')
                .update({
                    title: editingTask.title,
                    description: editingTask.description,
                    priority: editingTask.priority,
                    status: editingTask.status,
                    project_id: editingTask.project_id || null, // Convertir string vacío a null
                    category: editingTask.category,
                    due_date: editingTask.due_date,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingTask.id);

            if (error) {
                console.error('Error updating task:', error);
                showToast.error('Error al actualizar la tarea');
                return;
            }

            setShowEditTaskModal(false);
            setEditingTask(null);
            await fetchTasks();
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Timer functions - persistir en Supabase
    const startTimer = async (taskId: string) => {
        if (!supabase) return;
        try {
            // Si hay otro timer activo, pausarlo primero
            if (activeTimer && activeTimer !== taskId) {
                await pauseTimer();
            }

            const nowIso = new Date().toISOString();
            const { error } = await supabase
                .from('tasks')
                .update({ is_running: true, last_start: nowIso })
                .eq('id', taskId);

            if (error) {
                console.error('Error starting timer on task:', error);
                return;
            }

            // Obtener el tiempo acumulado de la tarea
            const task = tasks.find(t => t.id === taskId);
            const accumulated = task?.total_time_seconds || 0;
            // Actualizar estado local SOLO la tarea modificada
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_running: true, last_start: nowIso } : t));
            setActiveTimer(taskId);
            setTimerStartTime(new Date());
            setElapsedTime(accumulated * 1000); // milisegundos
            // Feedback visual opcional
            // toast.success('Timer iniciado');
        } catch (err) {
            console.error('startTimer error:', err);
        }
    };

    const pauseTimer = async () => {
        if (!supabase) return;
        if (!activeTimer) return;
        try {
            const taskId = activeTimer;
            const task = tasks.find(t => t.id === taskId);

            // Determinar tiempo transcurrido desde last_start
            const lastStartIso = task?.last_start || (timerStartTime ? timerStartTime.toISOString() : null);
            let elapsedSeconds = 0;
            if (lastStartIso) {
                const startMs = new Date(lastStartIso.endsWith('Z') ? lastStartIso : lastStartIso + 'Z').getTime();
                elapsedSeconds = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
            } else if (timerStartTime) {
                elapsedSeconds = Math.max(0, Math.floor((Date.now() - timerStartTime.getTime()) / 1000));
            }

            const newTotal = (task?.total_time_seconds || 0) + elapsedSeconds;
            const nowIso = new Date().toISOString();

            const { error } = await supabase
                .from('tasks')
                .update({ is_running: false, last_stop: nowIso, total_time_seconds: newTotal })
                .eq('id', taskId);

            if (error) {
                console.error('Error pausing timer on task:', error);
                return;
            }

            // Actualizar estado local SOLO la tarea modificada
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_running: false, last_stop: nowIso, total_time_seconds: newTotal } : t));
            setActiveTimer(null);
            setTimerStartTime(null);
            setElapsedTime(newTotal * 1000); // conservar el tiempo acumulado
            // Feedback visual opcional
            // toast.success('Timer pausado y guardado');
        } catch (err) {
            console.error('pauseTimer error:', err);
        }
    };

    const formatTime = (milliseconds: number) => {
        const minutes = Math.floor(milliseconds / 60000);
        const seconds = Math.floor((milliseconds % 60000) / 1000);
        return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
    };

    // Filtros
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        const matchesProject = projectFilter === 'all' || task.project_id === projectFilter;

        return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });

    // Estadísticas
    const stats = {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        inProgress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
    };

    useEffect(() => {
        fetchTasks();
        fetchProjects();
    }, []);

    // useEffect para cargar el email si no se pasó como prop
    useEffect(() => {
        if (!currentUserEmail) {
            getCurrentUserEmail();
        }
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeTimer && timerStartTime) {
            interval = setInterval(() => {
                setElapsedTime(Date.now() - timerStartTime.getTime());
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [activeTimer, timerStartTime]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium">Cargando tareas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <Sidebar
                userEmail={currentUserEmail}
                onLogout={handleLogout}
            />

            <div className="flex flex-col flex-1 ml-56">
                <Header userEmail={currentUserEmail} onLogout={handleLogout} />
                <div className="flex-1 overflow-auto p-8">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
                                    ✅ Gestión de Tareas
                                </h1>
                                <p className="text-slate-600 mt-2">Organiza y controla tus tareas de forma eficiente</p>
                            </div>
                            <Button
                                onClick={() => setShowNewTaskModal(true)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Tarea
                            </Button>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600">Total</p>
                                        <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                                    </div>
                                    <Tag className="h-8 w-8 text-slate-500" />
                                </div>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600">Pendientes</p>
                                        <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                                    </div>
                                    <Clock className="h-8 w-8 text-amber-500" />
                                </div>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600">En Progreso</p>
                                        <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                                    </div>
                                    <Timer className="h-8 w-8 text-blue-500" />
                                </div>
                            </div>
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-white/20 shadow-lg">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-slate-600">Completadas</p>
                                        <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                                    </div>
                                    <CheckCircle className="h-8 w-8 text-green-500" />
                                </div>
                            </div>
                        </div>

                        {/* Filtros y búsqueda */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                                    <input
                                        type="text"
                                        placeholder="Buscar tareas..."
                                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select
                                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">Todos los estados</option>
                                    <option value="pending">Pendientes</option>
                                    <option value="in_progress">En progreso</option>
                                    <option value="paused">Pausadas</option>
                                    <option value="completed">Completadas</option>
                                    <option value="archived">Archivadas</option>
                                </select>
                                <select
                                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                >
                                    <option value="all">Todas las prioridades</option>
                                    <option value="urgent">Urgente</option>
                                    <option value="high">Alta</option>
                                    <option value="medium">Media</option>
                                    <option value="low">Baja</option>
                                </select>
                                <select
                                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={projectFilter}
                                    onChange={(e) => setProjectFilter(e.target.value)}
                                >
                                    <option value="all">Todos los proyectos</option>
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setStatusFilter('all');
                                        setPriorityFilter('all');
                                        setProjectFilter('all');
                                    }}
                                    className="flex items-center"
                                >
                                    <Filter className="mr-2 h-4 w-4" />
                                    Limpiar
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Lista de tareas */}
                    <div className="space-y-4">
                        {filteredTasks.length === 0 ? (
                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-12 border border-white/20 shadow-lg text-center">
                                <Tag className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay tareas</h3>
                                <p className="text-slate-500 mb-6">
                                    {tasks.length === 0
                                        ? "Aún no has creado ninguna tarea. ¡Comienza creando tu primera tarea!"
                                        : "No hay tareas que coincidan con los filtros actuales."
                                    }
                                </p>
                                {tasks.length === 0 && (
                                    <Button
                                        onClick={() => setShowNewTaskModal(true)}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Crear primera tarea
                                    </Button>
                                )}
                            </div>
                        ) : (
                            filteredTasks.map((task) => (
                                <div key={task.id} className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                    task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                        task.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                                            task.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                                                                'bg-slate-100 text-slate-800'
                                                    }`}>
                                                    {task.status === 'pending' ? 'Pendiente' :
                                                        task.status === 'in_progress' ? 'En progreso' :
                                                            task.status === 'paused' ? 'Pausada' :
                                                                task.status === 'completed' ? 'Completada' :
                                                                    task.status === 'archived' ? 'Archivada' : task.status}
                                                </span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                                    task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                                        task.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {task.priority === 'urgent' ? '🔥 Urgente' :
                                                        task.priority === 'high' ? '⚠️ Alta' :
                                                            task.priority === 'medium' ? '📋 Media' :
                                                                '📝 Baja'}
                                                </span>
                                            </div>
                                            {task.description && (
                                                <p className="text-slate-600 mb-3">{task.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 text-sm text-slate-500">
                                                {task.due_date && (
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {new Date(task.due_date).toLocaleDateString()}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    {new Date(task.created_at).toLocaleDateString()}
                                                </div>
                                                {task.project_id && (
                                                    <div className="flex items-center gap-1">
                                                        <User className="h-4 w-4" />
                                                        {projects.find(p => p.id === task.project_id)?.name || 'Proyecto'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            {/* Timer */}
                                            {activeTimer === task.id ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                        {formatTime((task.total_time_seconds || 0) * 1000 + (activeTimer === task.id && timerStartTime ? Date.now() - timerStartTime.getTime() : 0))}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); pauseTimer(); }}
                                                        className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                                    >
                                                        <Square className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                        {formatTime((task.total_time_seconds || 0) * 1000)}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e: any) => { e.preventDefault(); e.stopPropagation(); startTimer(task.id); }}
                                                        className="text-green-600 border-green-300 hover:bg-green-50"
                                                        disabled={task.status === 'completed'}
                                                    >
                                                        <Play className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="relative group" style={{ overflow: 'visible' }}>
                                                <Button size="sm" variant="outline" className="text-slate-600"
                                                    onClick={e => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setMenuTaskId(task.id);
                                                        setMenuAnchor(e.currentTarget.getBoundingClientRect());
                                                    }}>
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                                {menuTaskId === task.id && menuAnchor && ReactDOM.createPortal(
                                                    <div
                                                        style={{
                                                            position: 'fixed',
                                                            top: menuAnchor.bottom + 4,
                                                            left: Math.max(16, menuAnchor.left - 200),
                                                            minWidth: 200,
                                                            background: 'white',
                                                            borderRadius: 8,
                                                            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                                            border: '1px solid #e2e8f0',
                                                            zIndex: 99999,
                                                            padding: '4px 0',
                                                        }}
                                                        onMouseLeave={() => setMenuTaskId(null)}
                                                    >
                                                        <button
                                                            onClick={() => {
                                                                setEditingTask(task);
                                                                setShowEditTaskModal(true);
                                                                setMenuTaskId(null);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <Edit3 className="h-4 w-4" />
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedTask(task);
                                                                setShowTaskDetails(true);
                                                                setMenuTaskId(null);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                            Ver detalles
                                                        </button>
                                                        {task.status !== 'completed' && (
                                                            <button
                                                                onClick={() => { updateTaskStatus(task.id, 'completed'); setMenuTaskId(null); }}
                                                                className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                                            >
                                                                <CheckCircle className="h-4 w-4" />
                                                                Marcar completada
                                                            </button>
                                                        )}
                                                        {task.status !== 'archived' && (
                                                            <button
                                                                onClick={() => { updateTaskStatus(task.id, 'archived'); setMenuTaskId(null); }}
                                                                className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                            >
                                                                <Archive className="h-4 w-4" />
                                                                Archivar
                                                            </button>
                                                        )}
                                                        <hr className="my-1" />
                                                        <button
                                                            onClick={() => { deleteTask(task.id); setMenuTaskId(null); }}
                                                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                            Eliminar
                                                        </button>
                                                    </div>,
                                                    document.body
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Nueva Tarea */}
            {showNewTaskModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Nueva Tarea</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    placeholder="Escribe el título de la tarea..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    placeholder="Describe la tarea..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newTask.priority}
                                        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as TaskPriority })}
                                    >
                                        <option value="low">Baja</option>
                                        <option value="medium">Media</option>
                                        <option value="high">Alta</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={newTask.status}
                                        onChange={(e) => setNewTask({ ...newTask, status: e.target.value as TaskStatus })}
                                    >
                                        <option value="pending">Pendiente</option>
                                        <option value="in_progress">En progreso</option>
                                        <option value="paused">Pausada</option>
                                        <option value="completed">Completada</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newTask.project_id}
                                    onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                                >
                                    <option value="">Seleccionar proyecto...</option>
                                    {projects.length === 0 ? (
                                        <option disabled>🔍 Cargando proyectos... o no hay proyectos</option>
                                    ) : (
                                        projects.map(project => (
                                            <option key={project.id} value={project.id}>
                                                {project.name} {project.status ? `(${project.status})` : '(sin estado)'}
                                            </option>
                                        ))
                                    )}
                                </select>
                                {projects.length === 0 && (
                                    <div className="text-xs text-amber-600 mt-1 p-2 bg-amber-50 rounded">
                                        <p>📝 <strong>No hay proyectos disponibles.</strong></p>
                                        <p>• Verifica la consola del navegador (F12) para logs de debugging</p>
                                        <p>• Crea proyectos desde la sección de Proyectos</p>
                                        <p>• O continúa sin proyecto asignado</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría *</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newTask.category}
                                    onChange={(e) => {
                                        if (e.target.value === 'new_category') {
                                            setShowNewCategoryInput(true);
                                        } else {
                                            setNewTask({ ...newTask, category: e.target.value });
                                        }
                                    }}
                                >
                                    <option value="" disabled>Selecciona una categoría...</option>
                                    {[...categories, ...customCategories].map(category => (
                                        <option key={category.value} value={category.value}>
                                            {category.label}
                                        </option>
                                    ))}
                                    <option value="new_category">+ Crear nueva categoría</option>
                                </select>

                                {showNewCategoryInput && (
                                    <div className="mt-2 flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Nombre de la nueva categoría"
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && createCustomCategory()}
                                        />
                                        <Button
                                            size="sm"
                                            onClick={createCustomCategory}
                                            className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                                        >
                                            Crear
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setShowNewCategoryInput(false);
                                                setNewCategoryName('');
                                            }}
                                            className="text-xs px-3 py-1"
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha límite</label>
                                <CustomDatePicker
                                    selected={newTask.due_date ? new Date(newTask.due_date) : null}
                                    onChange={(date) => setNewTask({
                                        ...newTask,
                                        due_date: date ? date.toISOString().split('T')[0] : ''
                                    })}
                                    placeholderText="Seleccionar fecha límite"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowNewTaskModal(false);
                                    resetNewTaskForm();
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={createTask}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            >
                                Crear Tarea
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Tarea */}
            {showEditTaskModal && editingTask && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">Editar Tarea</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Título *</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={editingTask.title}
                                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                                    value={editingTask.description || ''}
                                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingTask.priority}
                                        onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as TaskPriority })}
                                    >
                                        <option value="low">Baja</option>
                                        <option value="medium">Media</option>
                                        <option value="high">Alta</option>
                                        <option value="urgent">Urgente</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={editingTask.status}
                                        onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as TaskStatus })}
                                    >
                                        <option value="pending">Pendiente</option>
                                        <option value="in_progress">En progreso</option>
                                        <option value="paused">Pausada</option>
                                        <option value="completed">Completada</option>
                                        <option value="archived">Archivada</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={editingTask.project_id || ''}
                                    onChange={(e) => setEditingTask({ ...editingTask, project_id: e.target.value })}
                                >
                                    <option value="">Sin proyecto</option>
                                    {projects.map(project => (
                                        <option key={project.id} value={project.id}>
                                            {project.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                                <select
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={editingTask.category || 'general'}
                                    onChange={(e) => {
                                        if (e.target.value === 'new_category') {
                                            setShowNewCategoryInput(true);
                                        } else {
                                            setEditingTask({ ...editingTask, category: e.target.value });
                                        }
                                    }}
                                >
                                    {[...categories, ...customCategories].map(category => (
                                        <option key={category.value} value={category.value}>
                                            {category.label}
                                        </option>
                                    ))}
                                    <option value="new_category">+ Crear nueva categoría</option>
                                </select>

                                {showNewCategoryInput && (
                                    <div className="mt-2 flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Nombre de la nueva categoría"
                                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && createCustomCategory()}
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                if (newCategoryName.trim()) {
                                                    const categoryValue = newCategoryName.toLowerCase().replace(/\s+/g, '_');
                                                    const newCategory = { value: categoryValue, label: newCategoryName.trim() };
                                                    const allCategories = [...categories, ...customCategories];
                                                    if (!allCategories.some(cat => cat.value === categoryValue)) {
                                                        setCustomCategories(prev => [...prev, newCategory]);
                                                        setEditingTask({ ...editingTask, category: categoryValue });
                                                    }
                                                }
                                                setShowNewCategoryInput(false);
                                                setNewCategoryName('');
                                            }}
                                            className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1"
                                        >
                                            Crear
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setShowNewCategoryInput(false);
                                                setNewCategoryName('');
                                            }}
                                            className="text-xs px-3 py-1"
                                        >
                                            Cancelar
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha límite</label>
                                <CustomDatePicker
                                    selected={editingTask.due_date ? new Date(editingTask.due_date) : null}
                                    onChange={(date) => setEditingTask({
                                        ...editingTask,
                                        due_date: date ? date.toISOString().split('T')[0] : ''
                                    })}
                                    placeholderText="Seleccionar fecha límite"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowEditTaskModal(false);
                                    setEditingTask(null);
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={updateTask}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                            >
                                Actualizar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detalles de Tarea */}
            {showTaskDetails && selectedTask && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-xl font-bold text-slate-800">📋 {selectedTask.title}</h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTaskDetails(false)}
                            >
                                ✕
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {selectedTask.description && (
                                <div>
                                    <h4 className="font-medium text-slate-700 mb-2">Descripción</h4>
                                    <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{selectedTask.description}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium text-slate-700 mb-2">Estado</h4>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${selectedTask.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        selectedTask.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                            selectedTask.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                                selectedTask.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                                                    'bg-slate-100 text-slate-800'
                                        }`}>
                                        {selectedTask.status === 'pending' ? 'Pendiente' :
                                            selectedTask.status === 'in_progress' ? 'En progreso' :
                                                selectedTask.status === 'paused' ? 'Pausada' :
                                                    selectedTask.status === 'completed' ? 'Completada' :
                                                        selectedTask.status === 'archived' ? 'Archivada' : selectedTask.status}
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-medium text-slate-700 mb-2">Prioridad</h4>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${selectedTask.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                        selectedTask.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                            selectedTask.priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {selectedTask.priority === 'urgent' ? '🔥 Urgente' :
                                            selectedTask.priority === 'high' ? '⚠️ Alta' :
                                                selectedTask.priority === 'medium' ? '📋 Media' :
                                                    '📝 Baja'}
                                    </span>
                                </div>
                            </div>

                            {selectedTask.project_id && (
                                <div>
                                    <h4 className="font-medium text-slate-700 mb-2">Proyecto</h4>
                                    <p className="text-slate-600">{projects.find(p => p.id === selectedTask.project_id)?.name || 'Proyecto no encontrado'}</p>
                                </div>
                            )}

                            {selectedTask.due_date && (
                                <div>
                                    <h4 className="font-medium text-slate-700 mb-2">Fecha límite</h4>
                                    <p className="text-slate-600 flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {new Date(selectedTask.due_date).toLocaleDateString()}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-sm text-slate-500 border-t pt-4">
                                <div>
                                    <p>Creada el:</p>
                                    <p className="font-medium">{new Date(selectedTask.created_at).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p>Actualizada el:</p>
                                    <p className="font-medium">{new Date(selectedTask.updated_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setEditingTask(selectedTask);
                                    setShowTaskDetails(false);
                                    setShowEditTaskModal(true);
                                }}
                            >
                                <Edit3 className="mr-2 h-4 w-4" />
                                Editar
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowTaskDetails(false)}
                            >
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
