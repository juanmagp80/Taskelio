'use client';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import TrialBanner from '@/components/TrialBanner';
import CustomDatePicker from '@/components/ui/DatePicker';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { useTrialStatus } from '@/src/lib/useTrialStatus';
import { showToast } from '@/utils/toast';
import {
    AlertTriangle,
    Briefcase,
    Calendar,
    CheckCircle,
    Clock,
    DollarSign,
    Edit,
    Eye,
    FileText,
    Filter,
    Grid3x3,
    List,
    Pause,
    Plus,
    Search,
    Trash2,
    TrendingUp,
    User,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
    // Relación con cliente
    client?: {
        name: string;
        company?: string;
    };
};

// Interface para props
interface ProjectsPageClientProps {
    userEmail: string;
}

// Componente principal
export default function ProjectsPageClient({ userEmail }: ProjectsPageClientProps) {
    // Hook de trial status
    const { trialInfo, loading: trialLoading, hasReachedLimit, canUseFeatures } = useTrialStatus(userEmail);

    // Estados
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchInputRef, setSearchInputRef] = useState<HTMLInputElement | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [clients, setClients] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        client_id: '',
        budget: '',
        start_date: '',
        end_date: '',
        status: 'active'
    });
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createSupabaseClient();
    const router = useRouter();

    const fetchClients = async () => {
        try {
            if (!supabase) {
                console.error('Supabase client not available');
                return;
            }

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

    const fetchProjects = async () => {
        try {
            if (!supabase) {
                console.error('Supabase client not available');
                return;
            }

            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data: projectsData, error } = await supabase
                .from('projects')
                .select(`
                    *,
                    client:clients!inner(name, company)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching projects:', error);
                return;
            }

            setProjects(projectsData || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Función para manejar la creación de nuevo proyecto
    const handleNewProjectClick = () => {
        if (!canUseFeatures) {
            showToast.warning('Tu periodo de prueba ha expirado. Actualiza tu plan para continuar creando proyectos.');
            return;
        }

        if (hasReachedLimit('projects')) {
            showToast.error(`Has alcanzado el límite de ${(trialInfo && trialInfo.limits && typeof trialInfo.limits.maxProjects === 'number') ? trialInfo.limits.maxProjects : 5} proyectos en el plan de prueba. Actualiza tu plan para crear más proyectos.`);
            return;
        }

        setShowForm(true);
    };

    const createProject = async () => {
        try {
            if (!supabase || !formData.name || !formData.client_id) return;

            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data, error } = await supabase
                .from('projects')
                .insert([{
                    name: formData.name,
                    description: formData.description,
                    client_id: formData.client_id,
                    user_id: user.id,
                    status: formData.status,
                    budget: formData.budget ? parseFloat(formData.budget) : null,
                    start_date: formData.start_date || null,
                    end_date: formData.end_date || null
                }])
                .select(`
                    *,
                    client:clients!inner(name, company)
                `);

            if (error) {
                console.error('Error creating project:', error);
                return;
            }

            if (data && data[0]) {
                setProjects(prev => [data[0], ...prev]);
                setFormData({
                    name: '',
                    description: '',
                    client_id: '',
                    budget: '',
                    start_date: '',
                    end_date: '',
                    status: 'active'
                });
                setShowForm(false);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const updateProject = async () => {
        try {
            if (!supabase || !editingProject || !formData.name) return;

            const { data, error } = await supabase
                .from('projects')
                .update({
                    name: formData.name,
                    description: formData.description,
                    client_id: formData.client_id,
                    status: formData.status,
                    budget: formData.budget ? parseFloat(formData.budget) : null,
                    start_date: formData.start_date || null,
                    end_date: formData.end_date || null
                })
                .eq('id', editingProject.id)
                .select(`
                    *,
                    client:clients!inner(name, company)
                `);

            if (error) {
                console.error('Error updating project:', error);
                return;
            }

            if (data && data[0]) {
                setProjects(prev => prev.map(p => p.id === editingProject.id ? data[0] : p));
                setEditingProject(null);
                setShowEditForm(false);
                setFormData({
                    name: '',
                    description: '',
                    client_id: '',
                    budget: '',
                    start_date: '',
                    end_date: '',
                    status: 'active'
                });
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const deleteProject = async (id: string) => {
        try {
            if (!supabase) return;

            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting project:', error);
                return;
            }

            setProjects(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error('Error:', error);
        }
    };

    const handleLogout = async () => {
        try {
            if (!supabase) return;
            await supabase.auth.signOut();
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    useEffect(() => {
        fetchProjects();
        fetchClients();
    }, []);

    // Atajos de teclado
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
    const filteredProjects = projects.filter(project => {
        const matchesSearch = project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 border-green-200';
            case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <Clock className="w-4 h-4" />;
            case 'completed': return <CheckCircle className="w-4 h-4" />;
            case 'paused': return <Pause className="w-4 h-4" />;
            case 'cancelled': return <X className="w-4 h-4" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const stats = {
        total: projects.length,
        active: projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
        paused: projects.filter(p => p.status === 'paused').length,
        totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
        activeBudget: projects.filter(p => p.status === 'active').reduce((sum, p) => sum + (p.budget || 0), 0)
    };

    // Render
    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50/80 via-blue-50/40 to-indigo-50/60 dark:from-slate-900 dark:to-slate-800 relative">
            {/* Elementos decorativos animados de fondo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500/3 via-purple-500/3 to-indigo-500/3 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-br from-purple-500/3 via-pink-500/3 to-indigo-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-br from-indigo-500/3 via-blue-500/3 to-purple-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
                <div className="absolute bottom-0 right-0 w-72 h-72 bg-gradient-to-br from-pink-500/3 via-purple-500/3 to-blue-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            {/* Sidebar */}
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            {/* Main Content */}
            <div className="flex flex-col flex-1 ml-64 relative z-10">
                <div className="relative z-50 bg-white dark:bg-slate-900 shadow-md">
                    <Header userEmail={userEmail} onLogout={handleLogout} />
                </div>
                <div className="flex-1 overflow-auto">
                {/* Header Ultra Premium */}
                <div className="bg-white/60 backdrop-blur-2xl border-b border-white/40 z-10 shadow-xl shadow-slate-500/5">
                    <div className="p-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30 relative">
                                    <Briefcase className="w-8 h-8 text-white" />
                                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                                </div>
                                <div>
                                    <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 via-blue-700 to-purple-700 dark:from-slate-100 dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                                        Gestión de Proyectos
                                    </h1>
                                    <p className={"mt-2 font-semibold text-lg flex items-center gap-2 text-slate-500 dark:text-slate-500"}>
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse block"></span>
                                        Controla el progreso de todos tus proyectos
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2 bg-white/70 backdrop-blur-xl rounded-2xl px-6 py-3 shadow-lg border border-white/60">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span className="text-sm font-bold text-slate-700">Panel en Vivo</span>
                                </div>
                                <button
                                    onClick={handleNewProjectClick}
                                    disabled={!canUseFeatures || hasReachedLimit('projects')}
                                    className={`group px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-black rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-110 hover:-translate-y-1 transition-all duration-300 ${(!canUseFeatures || hasReachedLimit('projects'))
                                            ? 'opacity-50 cursor-not-allowed !bg-gray-400 hover:!bg-gray-400 !shadow-gray-400/30 hover:!shadow-gray-400/30 hover:!scale-100 hover:!translate-y-0'
                                            : ''
                                        }`}
                                >
                                    <span className="flex items-center gap-3">
                                        {(!canUseFeatures || hasReachedLimit('projects')) ? (
                                            <AlertTriangle className="w-5 h-5" />
                                        ) : (
                                            <Plus className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                                        )}
                                        Nuevo Proyecto
                                        <TrendingUp className="w-4 h-4 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300" />
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trial Banner */}
                <div className="px-8">
                    <TrialBanner />
                </div>

                <div className="p-8 space-y-8">
                    {/* Stats Ultra Premium con Animaciones */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Total Proyectos */}
                        <div className="group bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl shadow-slate-500/10 hover:shadow-2xl hover:scale-[1.05] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                            {/* Hover Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative z-10 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-2xl shadow-blue-500/40 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <Briefcase className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-4xl font-black bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                                            {stats.total}
                                        </p>
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse ml-auto"></div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Total Proyectos</p>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Gestión completa</p>
                                </div>
                            </div>
                        </div>

                        {/* Proyectos Activos */}
                        <div className="group bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl shadow-slate-500/10 hover:shadow-2xl hover:scale-[1.05] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative z-10 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-2xl shadow-green-500/40 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <Clock className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-4xl font-black bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                                            {stats.active}
                                        </p>
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-auto"></div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Activos</p>
                                    <p className="text-xs text-slate-500 font-medium mt-1">En progreso</p>
                                </div>
                            </div>
                        </div>

                        {/* Proyectos Completados */}
                        <div className="group bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl shadow-slate-500/10 hover:shadow-2xl hover:scale-[1.05] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative z-10 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl shadow-2xl shadow-emerald-500/40 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <CheckCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-4xl font-black bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                                            {stats.completed}
                                        </p>
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse ml-auto"></div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Completados</p>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Finalizados</p>
                                </div>
                            </div>
                        </div>

                        {/* Presupuesto Total */}
                        <div className="group bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl shadow-slate-500/10 hover:shadow-2xl hover:scale-[1.05] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <div className="relative z-10 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-4 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-2xl shadow-indigo-500/40 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                        <DollarSign className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-indigo-700 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                                            {formatCurrency(stats.totalBudget)}
                                        </p>
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse ml-auto"></div>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">Presupuesto Total</p>
                                    <p className="text-xs text-slate-500 font-medium mt-1">Valor de cartera</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Búsqueda y Filtros Ultra Premium */}
                    <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl shadow-slate-500/10 p-8">
                        <div className="flex flex-col space-y-6">
                            {/* Header con título y estadísticas */}
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div>
                                    <h2 className="text-3xl font-black bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-2">
                                        🎯 Directorio de Proyectos ({filteredProjects.length})
                                    </h2>
                                    <p className="text-slate-600 font-semibold flex items-center gap-2">
                                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse block"></span>
                                        Gestiona todos tus proyectos activos y completados
                                    </p>
                                </div>

                                {/* Botones de Vista */}
                                <div className="flex items-center gap-2 bg-white/60 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-white/80">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`group flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-300 ${viewMode === 'grid'
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                                                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                                            }`}
                                    >
                                        <Grid3x3 className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                                        Tarjetas
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`group flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all duration-300 ${viewMode === 'list'
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                                                : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                                            }`}
                                    >
                                        <List className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                                        Lista
                                    </button>
                                </div>
                            </div>

                            {/* Barra de Búsqueda Ultra Premium - Más Grande */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
                                {/* Cuadro de Búsqueda Premium Ultra Avanzado - MÁS GRANDE */}
                                <div className="lg:col-span-2 relative group/search">
                                    {/* Fondo Decorativo con Gradientes Animados */}
                                    <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl opacity-0 group-focus-within/search:opacity-30 group-hover/search:opacity-20 blur-lg transition-all duration-700"></div>

                                    {/* Contenedor Principal MÁS GRANDE */}
                                    <div className={"relative p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm"}>

                                        {/* Icono de Búsqueda con Animaciones MEJORADO */}
                                        <div className="absolute left-6 top-1/2 transform -translate-y-1/2 z-10">
                                            <div className="relative">
                                                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-2 group-focus-within/search:scale-125 group-focus-within/search:rotate-12 group-hover/search:scale-110 transition-all duration-700 shadow-2xl shadow-indigo-500/40">
                                                    <Search className="w-full h-full text-white" />
                                                </div>
                                                {/* Efecto de ondas al hacer focus */}
                                                <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl opacity-0 group-focus-within/search:opacity-100 group-focus-within/search:animate-ping"></div>
                                            </div>
                                        </div>

                                        {/* Campo de Input Premium MÁS GRANDE */}
                                        <input
                                            ref={(el) => setSearchInputRef(el)}
                                            type="text"
                                            placeholder="🔍 Buscar proyectos, clientes o descripciones... (Ctrl+K)"
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

                                    {/* Sugerencias flotantes mejoradas */}
                                    {searchTerm && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-2xl shadow-slate-500/20 p-4 z-50 animate-in slide-in-from-top-2 duration-300">
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Buscando en:</div>
                                            <div className="flex flex-wrap gap-2">
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold">📂 Nombres</span>
                                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-xl text-xs font-semibold">📝 Descripciones</span>
                                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-xl text-xs font-semibold">👥 Clientes</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Filtro de Estado Premium MEJORADO */}
                                <div className="relative group/filter">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl opacity-0 group-hover/filter:opacity-20 blur-sm transition-all duration-500"></div>
                                    <div className={"relative p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm"}>
                                        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                                            <Filter className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <select
                                            value={filterStatus}
                                            onChange={(e) => setFilterStatus(e.target.value)}
                                            className="w-full h-16 pl-12 pr-8 text-base font-semibold text-slate-900 bg-transparent border-0 rounded-2xl focus:outline-none focus:ring-0 transition-all duration-300 appearance-none cursor-pointer"
                                        >
                                            <option value="all">🔥 Todos los Estados</option>
                                            <option value="active">⚡ Activos</option>
                                            <option value="completed">✅ Completados</option>
                                            <option value="paused">⏸️ Pausados</option>
                                            <option value="cancelled">❌ Cancelados</option>
                                        </select>
                                        {/* Flecha personalizada */}
                                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                            <div className="w-3 h-3 bg-indigo-500 rotate-45 transform origin-center"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Botón Nuevo Proyecto Premium */}
                            <div className="flex justify-center">
                                <button
                                    onClick={handleNewProjectClick}
                                    disabled={!canUseFeatures || hasReachedLimit('projects')}
                                    className={`group px-10 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-black rounded-3xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-110 hover:-translate-y-2 transition-all duration-500 flex items-center gap-4 text-lg relative overflow-hidden ${(!canUseFeatures || hasReachedLimit('projects'))
                                            ? 'opacity-50 cursor-not-allowed !bg-gray-400 hover:!bg-gray-400 !shadow-gray-400/30 hover:!shadow-gray-400/30 hover:!scale-100 hover:!translate-y-0'
                                            : ''
                                        }`}
                                >
                                    {/* Efecto de brillo en hover */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                                    <div className="relative z-10 flex items-center gap-4">
                                        <div className={`p-2 bg-white/20 rounded-2xl group-hover:scale-125 group-hover:rotate-180 transition-all duration-500 ${(!canUseFeatures || hasReachedLimit('projects')) ? 'bg-gray-300/50' : ''
                                            }`}>
                                            {(!canUseFeatures || hasReachedLimit('projects')) ? (
                                                <AlertTriangle className="w-6 h-6" />
                                            ) : (
                                                <Plus className="w-6 h-6" />
                                            )}
                                        </div>
                                        <span>{
                                            (!canUseFeatures || hasReachedLimit('projects'))
                                                ? 'Límite Alcanzado'
                                                : 'Crear Nuevo Proyecto'
                                        }</span>
                                        <TrendingUp className="w-5 h-5 group-hover:rotate-45 group-hover:scale-125 transition-all duration-500" />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Modal Espectacular de Nuevo Proyecto */}
                    {showForm && (
                        <div
                            className="fixed inset-0 bg-black/70 backdrop-blur-2xl z-50 flex items-center justify-center p-4 animate-fadeIn"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                    setShowForm(false);
                                }
                            }}
                        >
                            {/* Elementos decorativos flotantes */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-blue-500/15 to-indigo-500/15 rounded-full animate-pulse blur-3xl"></div>
                                <div className="absolute top-40 right-32 w-24 h-24 bg-gradient-to-br from-purple-500/15 to-pink-500/15 rounded-full animate-pulse blur-3xl" style={{ animationDelay: '1s' }}></div>
                                <div className="absolute bottom-32 left-40 w-28 h-28 bg-gradient-to-br from-indigo-500/15 to-blue-500/15 rounded-full animate-pulse blur-3xl" style={{ animationDelay: '2s' }}></div>
                            </div>

                            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                                <div className="bg-white/90 backdrop-blur-3xl rounded-3xl border-2 border-white/80 shadow-2xl shadow-slate-500/20 relative overflow-hidden">
                                    {/* Gradiente decorativo superior */}
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>

                                    {/* Header del Modal */}
                                    <div className="relative bg-gradient-to-r from-blue-50/80 via-purple-50/80 to-indigo-50/80 backdrop-blur-xl p-8 border-b border-white/40">
                                        <button
                                            onClick={() => setShowForm(false)}
                                            className="absolute top-6 right-6 p-3 bg-white/80 backdrop-blur-xl border border-white/60 hover:border-red-300 rounded-2xl shadow-lg hover:shadow-xl hover:scale-110 hover:rotate-90 transition-all duration-300 group"
                                        >
                                            <X className="w-5 h-5 text-slate-600 group-hover:text-red-600 transition-colors duration-300" />
                                        </button>

                                        <div className="flex items-center gap-6">
                                            <div className="p-4 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl shadow-2xl shadow-blue-500/40">
                                                <Briefcase className="w-8 h-8 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-blue-700 to-purple-700 dark:from-slate-100 dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
                                                    Crear Nuevo Proyecto
                                                </h3>
                                                <p className={"mt-2 flex items-center gap-2 text-slate-500 dark:text-slate-500"}>
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                    Completa la información del proyecto
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Formulario Premium */}
                                    <div className="p-8 space-y-8">
                                        <div className="grid gap-8 md:grid-cols-2">
                                            {/* Nombre del Proyecto */}
                                            <div className="group md:col-span-2">
                                                <label className="text-sm font-black text-slate-700 mb-3 block uppercase tracking-wider">
                                                    🎯 Nombre del Proyecto *
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: Desarrollo Web Corporativo, App Móvil..."
                                                        value={formData.name}
                                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                        className="w-full px-6 py-4 text-lg font-semibold bg-white/70 backdrop-blur-xl border-2 border-white/80 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:scale-[1.02] transition-all duration-300 placeholder-slate-400 shadow-lg"
                                                    />
                                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                                </div>
                                            </div>

                                            {/* Cliente */}
                                            <div className="group">
                                                <label className="text-sm font-black text-slate-700 mb-3 block uppercase tracking-wider">
                                                    👤 Cliente Asignado *
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={formData.client_id}
                                                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                                        className="w-full px-6 py-4 text-lg font-semibold bg-white/70 backdrop-blur-xl border-2 border-white/80 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:scale-[1.02] transition-all duration-300 shadow-lg appearance-none"
                                                    >
                                                        <option value="">Seleccionar cliente...</option>
                                                        {clients.map((client) => (
                                                            <option key={client.id} value={client.id}>
                                                                {client.name} {client.company && `(${client.company})`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 to-indigo-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                                </div>
                                            </div>

                                            {/* Estado */}
                                            <div className="group">
                                                <label className="text-sm font-black text-slate-700 mb-3 block uppercase tracking-wider">
                                                    ⚡ Estado del Proyecto
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={formData.status}
                                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                        className="w-full px-6 py-4 text-lg font-semibold bg-white/70 backdrop-blur-xl border-2 border-white/80 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:scale-[1.02] transition-all duration-300 shadow-lg appearance-none"
                                                    >
                                                        <option value="active">🚀 Activo</option>
                                                        <option value="paused">⏸️ Pausado</option>
                                                        <option value="completed">✅ Completado</option>
                                                        <option value="cancelled">❌ Cancelado</option>
                                                    </select>
                                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                                </div>
                                            </div>

                                            {/* Descripción */}
                                            <div className="group md:col-span-2">
                                                <label className="text-sm font-black text-slate-700 mb-3 block uppercase tracking-wider">
                                                    📝 Descripción del Proyecto
                                                </label>
                                                <div className="relative">
                                                    <textarea
                                                        placeholder="Describe los objetivos, alcance y detalles importantes del proyecto..."
                                                        value={formData.description}
                                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                        rows={4}
                                                        className="w-full px-6 py-4 text-base font-medium bg-white/70 backdrop-blur-xl border-2 border-white/80 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:scale-[1.02] transition-all duration-300 placeholder-slate-400 shadow-lg resize-none"
                                                    />
                                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                                </div>
                                            </div>

                                            {/* Presupuesto */}
                                            <div className="group">
                                                <label className="text-sm font-black text-slate-700 mb-3 block uppercase tracking-wider">
                                                    💰 Presupuesto (€)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        placeholder="15000.00"
                                                        value={formData.budget}
                                                        onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                                        className="w-full px-6 py-4 text-lg font-bold bg-white/70 backdrop-blur-xl border-2 border-white/80 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:scale-[1.02] transition-all duration-300 placeholder-slate-400 shadow-lg"
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-yellow-500/5 to-orange-500/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                                </div>
                                            </div>

                                            {/* Fechas */}
                                            <div className="group">
                                                <label className="text-sm font-black text-slate-700 mb-3 block uppercase tracking-wider">
                                                    📅 Fechas del Proyecto
                                                </label>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-500 mb-2 block">Fecha de Inicio</label>
                                                        <CustomDatePicker
                                                            selected={formData.start_date ? new Date(formData.start_date) : null}
                                                            onChange={(date) => setFormData({ 
                                                                ...formData, 
                                                                start_date: date ? date.toISOString().split('T')[0] : '' 
                                                            })}
                                                            placeholderText="Seleccionar fecha de inicio"
                                                            className="px-4 py-3 text-base font-semibold bg-white/70 backdrop-blur-xl border-2 border-white/80 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-md"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-semibold text-slate-500 mb-2 block">Fecha de Fin</label>
                                                        <CustomDatePicker
                                                            selected={formData.end_date ? new Date(formData.end_date) : null}
                                                            onChange={(date) => setFormData({ 
                                                                ...formData, 
                                                                end_date: date ? date.toISOString().split('T')[0] : '' 
                                                            })}
                                                            placeholderText="Seleccionar fecha de fin"
                                                            minDate={formData.start_date ? new Date(formData.start_date) : undefined}
                                                            className="px-4 py-3 text-base font-semibold bg-white/70 backdrop-blur-xl border-2 border-white/80 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-md"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Botones de Acción Premium */}
                                        <div className="flex gap-4 pt-8 border-t-2 border-white/40">
                                            <button
                                                onClick={createProject}
                                                disabled={!formData.name || !formData.client_id}
                                                className="group flex-1 px-8 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-black rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 disabled:shadow-slate-500/20 hover:scale-105 hover:-translate-y-1 disabled:scale-100 disabled:translate-y-0 transition-all duration-300 flex items-center justify-center gap-3 text-lg disabled:cursor-not-allowed"
                                            >
                                                <Briefcase className="w-6 h-6 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300" />
                                                Crear Proyecto
                                                <TrendingUp className="w-5 h-5 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-300" />
                                            </button>
                                            <button
                                                onClick={() => setShowForm(false)}
                                                className={"px-8 py-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm"}
                                            >
                                                <X className="w-5 h-5" />
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lista Ultra Premium de Proyectos */}
                    <div className="bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-2xl shadow-slate-500/10">
                        <div className="p-8">
                            <h2 className="text-2xl font-black bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-8 flex items-center gap-3">
                                <Briefcase className="w-6 h-6 text-indigo-600" />
                                Directorio de Proyectos
                            </h2>

                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 space-y-6">
                                    <div className="relative">
                                        <div className="w-20 h-20 border-4 border-slate-200 rounded-full"></div>
                                        <div className="absolute top-0 left-0 w-20 h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
                                    </div>
                                    <div className="space-y-3 text-center">
                                        <h3 className="text-2xl font-black text-slate-900">Cargando proyectos</h3>
                                        <p className="text-base text-slate-600 font-semibold">Obteniendo información...</p>
                                    </div>
                                </div>
                            ) : filteredProjects.length === 0 ? (
                                <div className="text-center py-20 relative">
                                    {/* Elementos decorativos flotantes */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-64 h-64 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-slate-500/20 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                            <Briefcase className="w-12 h-12 text-slate-500 relative z-10 group-hover:text-white group-hover:scale-110 transition-all duration-300" />
                                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                                                <span className="text-white text-xs font-bold">0</span>
                                            </div>
                                        </div>

                                        <h3 className="text-3xl font-black bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 bg-clip-text text-transparent mb-4">
                                            {searchTerm ? '🔍 Sin resultados para tu búsqueda' : '📋 Aún no tienes proyectos'}
                                        </h3>

                                        <p className="text-slate-600 max-w-2xl mx-auto font-semibold text-lg mb-8">
                                            {searchTerm
                                                ? `No encontramos proyectos que coincidan con "${searchTerm}". Prueba con otros términos.`
                                                : 'Comienza creando tu primer proyecto para organizar y gestionar tu trabajo de forma profesional'
                                            }
                                        </p>

                                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                            {searchTerm ? (
                                                <>
                                                    <button
                                                        onClick={() => setSearchTerm('')}
                                                        className="group px-8 py-4 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3"
                                                    >
                                                        <X className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                                                        Limpiar búsqueda
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (!canUseFeatures) {
                                                                showToast.warning('Tu periodo de prueba ha expirado. Actualiza tu plan para continuar creando proyectos.');
                                                                return;
                                                            }

                                                            if (hasReachedLimit('projects')) {
                                                                showToast.error(`Has alcanzado el límite de ${(trialInfo && trialInfo.limits && typeof trialInfo.limits.maxProjects === 'number') ? trialInfo.limits.maxProjects : 5} proyectos en el plan de prueba. Actualiza tu plan para crear más proyectos.`);
                                                                return;
                                                            }

                                                            setShowForm(true);
                                                            setSearchTerm('');
                                                        }}
                                                        disabled={!canUseFeatures || hasReachedLimit('projects')}
                                                        className={`group px-8 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 ${(!canUseFeatures || hasReachedLimit('projects'))
                                                                ? 'opacity-50 cursor-not-allowed !bg-gray-400 hover:!bg-gray-400 !shadow-gray-400/30 hover:!shadow-gray-400/30 hover:!scale-100 hover:!translate-y-0'
                                                                : ''
                                                            }`}
                                                    >
                                                        {(!canUseFeatures || hasReachedLimit('projects')) ? (
                                                            <AlertTriangle className="w-5 h-5" />
                                                        ) : (
                                                            <Plus className="w-5 h-5 group-hover:scale-125 transition-transform duration-300" />
                                                        )}
                                                        {(!canUseFeatures || hasReachedLimit('projects'))
                                                            ? 'Límite Alcanzado'
                                                            : 'Crear proyecto nuevo'}
                                                        <TrendingUp className="w-4 h-4 group-hover:rotate-45 transition-transform duration-300" />
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={handleNewProjectClick}
                                                    disabled={!canUseFeatures || hasReachedLimit('projects')}
                                                    className={`group px-10 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-black rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-110 hover:-translate-y-2 transition-all duration-300 flex items-center justify-center gap-4 text-xl ${(!canUseFeatures || hasReachedLimit('projects'))
                                                            ? 'opacity-50 cursor-not-allowed !bg-gray-400 hover:!bg-gray-400 !shadow-gray-400/30 hover:!shadow-gray-400/30 hover:!scale-100 hover:!translate-y-0'
                                                            : ''
                                                        }`}
                                                >
                                                    {(!canUseFeatures || hasReachedLimit('projects')) ? (
                                                        <AlertTriangle className="w-6 h-6" />
                                                    ) : (
                                                        <Plus className="w-6 h-6 group-hover:scale-125 transition-transform duration-300" />
                                                    )}
                                                    {(!canUseFeatures || hasReachedLimit('projects'))
                                                        ? 'Límite Alcanzado'
                                                        : 'Crear tu primer proyecto'}
                                                    <TrendingUp className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    {viewMode === 'grid' ? (
                                        /* Vista de Tarjetas (Grid) */
                                        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                                            {filteredProjects.map((project, index) => {
                                                // Generar color del avatar basado en el nombre
                                                const getAvatarColor = (name: string) => {
                                                    const colors = [
                                                        'from-red-500 to-red-600',
                                                        'from-blue-500 to-blue-600',
                                                        'from-green-500 to-green-600',
                                                        'from-purple-500 to-purple-600',
                                                        'from-pink-500 to-pink-600',
                                                        'from-indigo-500 to-indigo-600',
                                                        'from-yellow-500 to-yellow-600',
                                                        'from-teal-500 to-teal-600'
                                                    ];
                                                    const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                                                    return colors[hash % colors.length];
                                                };

                                                const avatarColor = getAvatarColor(project.name || 'Proyecto');

                                                return (
                                                    <div
                                                        key={project.id}
                                                        className="group bg-white/40 backdrop-blur-2xl rounded-3xl border border-white/60 shadow-xl shadow-slate-500/5 p-6 hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-1 transition-all duration-500 relative overflow-hidden"
                                                        style={{
                                                            animationDelay: `${index * 100}ms`
                                                        }}
                                                    >
                                                        {/* Hover Gradient Overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                                        {/* Animated Border */}
                                                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-500"></div>

                                                        <div className="relative z-10">
                                                            <div className="flex items-start justify-between mb-4">
                                                                <div className="flex items-center space-x-4">
                                                                    <div className={`relative w-16 h-16 bg-gradient-to-br ${avatarColor} rounded-2xl flex items-center justify-center shadow-2xl shadow-black/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                                                                        <span className="text-white font-black text-xl">
                                                                            {project.name?.charAt(0).toUpperCase() || 'P'}
                                                                        </span>
                                                                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <h3 className="font-black text-slate-900 text-lg group-hover:text-indigo-900 transition-colors duration-300 max-w-[160px] truncate" title={project.name}>
                                                                                {project.name || 'Sin nombre'}
                                                                            </h3>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-sm text-slate-600 group-hover:text-slate-700">
                                                                            <div className="p-1 bg-slate-100 rounded-lg group-hover:bg-indigo-100 transition-colors duration-300">
                                                                                <User className="w-3 h-3 group-hover:text-indigo-600" />
                                                                            </div>
                                                                            <span className="font-semibold max-w-[140px] truncate" title={project.client?.name}>
                                                                                {project.client?.name || 'Sin cliente'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-3 py-1 rounded-2xl text-xs font-bold border-2 shadow-lg group-hover:scale-110 group-hover:rotate-1 transition-all duration-300 flex items-center gap-1 ${getStatusColor(project.status)}`}>
                                                                        {getStatusIcon(project.status)}
                                                                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="space-y-3 mb-6">
                                                                {project.description && (
                                                                    <div className="group/item flex items-start gap-3 text-sm text-slate-600 p-3 rounded-xl hover:bg-white/50 transition-all duration-300">
                                                                        <div className="p-2 bg-slate-100 rounded-xl group-hover/item:bg-purple-100 group-hover/item:scale-110 transition-all duration-300 flex-shrink-0">
                                                                            <FileText className="w-4 h-4 group-hover/item:text-purple-600" />
                                                                        </div>
                                                                        <p className="font-semibold group-hover/item:text-purple-700 line-clamp-2" title={project.description}>
                                                                            {project.description}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {project.budget && (
                                                                    <div className="group/item flex items-center gap-3 text-sm text-slate-600 p-3 rounded-xl hover:bg-white/50 transition-all duration-300">
                                                                        <div className="p-2 bg-slate-100 rounded-xl group-hover/item:bg-green-100 group-hover/item:scale-110 transition-all duration-300">
                                                                            <DollarSign className="w-4 h-4 group-hover/item:text-green-600" />
                                                                        </div>
                                                                        <span className="font-black text-lg group-hover/item:text-green-700">{formatCurrency(project.budget)}</span>
                                                                    </div>
                                                                )}

                                                                <div className="flex items-center gap-3 text-sm text-slate-500 p-3 rounded-xl">
                                                                    <div className="p-2 bg-slate-100 rounded-xl">
                                                                        <Calendar className="w-4 h-4" />
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <span className="font-semibold block">Creado: {formatDate(project.created_at)}</span>
                                                                        {project.start_date && (
                                                                            <span className="text-xs block">Inicio: {formatDate(project.start_date)}</span>
                                                                        )}
                                                                        {project.end_date && (
                                                                            <span className="text-xs block">Fin: {formatDate(project.end_date)}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex gap-2 pt-4 border-t border-white/50">
                                                                <Link href={`/dashboard/projects/${project.id}`} className="flex-1">
                                                                    <button className="w-full px-4 py-3 text-sm bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl text-slate-700 font-bold hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200 hover:text-blue-700 hover:scale-105 transition-all duration-300 group/btn">
                                                                        <span className="group-hover/btn:scale-110 transition-transform duration-300 flex items-center justify-center gap-2">
                                                                            <Eye className="w-4 h-4" />
                                                                            Ver Detalles
                                                                        </span>
                                                                    </button>
                                                                </Link>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingProject(project);
                                                                        setFormData({
                                                                            name: project.name,
                                                                            description: project.description || '',
                                                                            client_id: project.client_id,
                                                                            budget: project.budget?.toString() || '',
                                                                            start_date: project.start_date || '',
                                                                            end_date: project.end_date || '',
                                                                            status: project.status
                                                                        });
                                                                        setShowEditForm(true);
                                                                    }}
                                                                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-110 hover:rotate-1 transition-all duration-300"
                                                                    title="Editar proyecto"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        const confirmed = await showToast.confirm('¿Estás seguro de que quieres eliminar este proyecto?');
                                                                        if (confirmed) {
                                                                            deleteProject(project.id);
                                                                        }
                                                                    }}
                                                                    className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-110 hover:rotate-1 transition-all duration-300"
                                                                    title="Eliminar proyecto"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* Vista de Lista */
                                        <div className="space-y-4">
                                            {filteredProjects.map((project, index) => {
                                                const getAvatarColor = (name: string) => {
                                                    const colors = [
                                                        'from-red-500 to-red-600',
                                                        'from-blue-500 to-blue-600',
                                                        'from-green-500 to-green-600',
                                                        'from-purple-500 to-purple-600',
                                                        'from-pink-500 to-pink-600',
                                                        'from-indigo-500 to-indigo-600',
                                                        'from-yellow-500 to-yellow-600',
                                                        'from-teal-500 to-teal-600'
                                                    ];
                                                    const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
                                                    return colors[hash % colors.length];
                                                };

                                                const avatarColor = getAvatarColor(project.name || 'Proyecto');

                                                return (
                                                    <div
                                                        key={project.id}
                                                        className="group bg-white/50 backdrop-blur-2xl rounded-2xl border border-white/60 shadow-xl shadow-slate-500/5 p-6 hover:shadow-2xl hover:scale-[1.01] hover:-translate-y-1 transition-all duration-500 relative overflow-hidden"
                                                        style={{
                                                            animationDelay: `${index * 50}ms`
                                                        }}
                                                    >
                                                        {/* Hover Gradient Overlay */}
                                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 via-purple-500/3 to-indigo-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                                        <div className="relative z-10 flex items-center justify-between">
                                                            <div className="flex items-center space-x-6 flex-1">
                                                                {/* Avatar del Proyecto */}
                                                                <div className={`relative w-14 h-14 bg-gradient-to-br ${avatarColor} rounded-2xl flex items-center justify-center shadow-2xl shadow-black/15 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                                                                    <span className="text-white font-black text-lg">
                                                                        {project.name?.charAt(0).toUpperCase() || 'P'}
                                                                    </span>
                                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
                                                                </div>

                                                                {/* Información Principal */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-3 mb-2">
                                                                        <h3 className="font-black text-xl text-slate-900 group-hover:text-indigo-900 transition-colors duration-300 truncate" title={project.name}>
                                                                            {project.name || 'Sin nombre'}
                                                                        </h3>
                                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 shadow-lg flex items-center gap-1 ${getStatusColor(project.status)}`}>
                                                                            {getStatusIcon(project.status)}
                                                                            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-6 text-sm text-slate-600">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="p-1 bg-slate-100 rounded-lg">
                                                                                <User className="w-4 h-4" />
                                                                            </div>
                                                                            <span className="font-semibold" title={project.client?.name}>
                                                                                {project.client?.name || 'Sin cliente'}
                                                                            </span>
                                                                        </div>

                                                                        {project.budget && (
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="p-1 bg-green-100 rounded-lg">
                                                                                    <DollarSign className="w-4 h-4 text-green-600" />
                                                                                </div>
                                                                                <span className="font-bold text-green-700">{formatCurrency(project.budget)}</span>
                                                                            </div>
                                                                        )}

                                                                        <div className="flex items-center gap-2">
                                                                            <div className="p-1 bg-slate-100 rounded-lg">
                                                                                <Calendar className="w-4 h-4" />
                                                                            </div>
                                                                            <span className="font-semibold">{formatDate(project.created_at)}</span>
                                                                        </div>
                                                                    </div>

                                                                    {project.description && (
                                                                        <p className="mt-2 text-sm text-slate-600 font-medium line-clamp-1" title={project.description}>
                                                                            {project.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Acciones */}
                                                            <div className="flex items-center gap-3">
                                                                <Link href={`/dashboard/projects/${project.id}`}>
                                                                    <button className="px-6 py-3 text-sm bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl text-slate-700 font-bold hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200 hover:text-blue-700 hover:scale-105 transition-all duration-300 flex items-center gap-2">
                                                                        <Eye className="w-4 h-4" />
                                                                        Ver Detalles
                                                                    </button>
                                                                </Link>
                                                                <button
                                                                    onClick={() => {
                                                                        setEditingProject(project);
                                                                        setFormData({
                                                                            name: project.name,
                                                                            description: project.description || '',
                                                                            client_id: project.client_id,
                                                                            budget: project.budget?.toString() || '',
                                                                            start_date: project.start_date || '',
                                                                            end_date: project.end_date || '',
                                                                            status: project.status
                                                                        });
                                                                        setShowEditForm(true);
                                                                    }}
                                                                    className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-110 transition-all duration-300"
                                                                    title="Editar proyecto"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        const confirmed = await showToast.confirm('¿Estás seguro de que quieres eliminar este proyecto?');
                                                                        if (confirmed) {
                                                                            deleteProject(project.id);
                                                                        }
                                                                    }}
                                                                    className="px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl shadow-2xl shadow-red-500/30 hover:shadow-red-500/50 hover:scale-110 transition-all duration-300"
                                                                    title="Eliminar proyecto"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            </div>

            {/* Modal Espectacular de Nuevo Proyecto con estilos de Cliente */}
            {showForm && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-2xl z-50 flex items-start justify-center pt-8 pb-8 px-4 animate-fadeIn overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowForm(false);
                        }
                    }}
                >
                    {/* Elementos decorativos flotantes */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-br from-purple-500/15 to-indigo-500/15 rounded-full animate-pulse blur-3xl"></div>
                        <div className="absolute top-20 right-20 w-24 h-24 bg-gradient-to-br from-pink-500/15 to-purple-500/15 rounded-full animate-pulse blur-3xl" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute bottom-20 left-20 w-40 h-40 bg-gradient-to-br from-indigo-500/15 to-blue-500/15 rounded-full animate-pulse blur-3xl" style={{ animationDelay: '2s' }}></div>
                        <div className="absolute bottom-10 right-10 w-28 h-28 bg-gradient-to-br from-pink-500/15 to-purple-500/15 rounded-full animate-pulse blur-3xl" style={{ animationDelay: '0.5s' }}></div>
                    </div>

                    <div className="relative w-full max-w-4xl flex-shrink-0">
                        <div className="bg-white/95 backdrop-blur-3xl rounded-3xl shadow-2xl shadow-black/30 border border-white/60 relative overflow-hidden animate-slideInUp">
                            {/* Gradiente animado de fondo */}
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-indigo-500/5 opacity-80 pointer-events-none"></div>

                            {/* Border animado brillante */}
                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-indigo-500/30 blur-sm animate-pulse pointer-events-none"></div>

                            <div className="relative z-10 p-8">
                                {/* Header Espectacular */}
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/40">
                                    <div className="flex items-center gap-4">
                                        <div className="p-4 bg-gradient-to-br from-purple-600 via-pink-600 to-indigo-600 rounded-3xl shadow-2xl shadow-purple-500/40 relative">
                                            <Briefcase className="w-8 h-8 text-white" />
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center">
                                                <Plus className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-purple-700 to-indigo-700 bg-clip-text text-transparent">
                                                Crear Nuevo Proyecto
                                            </h2>
                                            <p className="text-slate-600 font-semibold text-lg mt-1">
                                                Completa todos los datos del proyecto
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowForm(false)}
                                        className="group p-4 bg-slate-100 hover:bg-red-50 rounded-2xl border-2 border-slate-200 hover:border-red-200 transition-all duration-300 hover:scale-110 hover:rotate-90 shadow-lg"
                                    >
                                        <X className="w-6 h-6 text-slate-500 group-hover:text-red-500 transition-colors duration-300" />
                                    </button>
                                </div>

                                {/* Formulario Espectacular */}
                                <div className="space-y-8">
                                    {/* Sección de Información General */}
                                    <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/70 p-6 shadow-xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                                                <Briefcase className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900">Información General</h3>
                                        </div>

                                        <div className="grid gap-6 md:grid-cols-2">
                                            <div className="group md:col-span-2">
                                                <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-purple-600 transition-colors duration-300">
                                                    Nombre del Proyecto *
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: Rediseño Web Corporate, App Mobile Premium..."
                                                        value={formData.name}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                                        className="w-full px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-purple-300 focus:border-purple-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/20 transition-all duration-300 text-slate-900 font-semibold placeholder-slate-400 shadow-lg focus:shadow-2xl focus:shadow-purple-500/10 transform focus:scale-[1.02]"
                                                        required
                                                    />
                                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-indigo-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                                </div>
                                            </div>

                                            <div className="group">
                                                <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-indigo-600 transition-colors duration-300">
                                                    Cliente *
                                                </label>
                                                <select
                                                    value={formData.client_id}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                                                    className="w-full px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-indigo-300 focus:border-indigo-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all duration-300 text-slate-900 font-semibold shadow-lg focus:shadow-2xl focus:shadow-indigo-500/10 transform focus:scale-[1.02]"
                                                    required
                                                >
                                                    <option value="">👤 Selecciona un cliente</option>
                                                    {clients.map(client => (
                                                        <option key={client.id} value={client.id}>
                                                            {client.name} {client.company && `- ${client.company}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="group">
                                                <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-pink-600 transition-colors duration-300">
                                                    Estado del Proyecto
                                                </label>
                                                <select
                                                    value={formData.status}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                                                    className="w-full px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-pink-300 focus:border-pink-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-pink-500/20 transition-all duration-300 text-slate-900 font-semibold shadow-lg focus:shadow-2xl focus:shadow-pink-500/10 transform focus:scale-[1.02]"
                                                >
                                                    <option value="active">🟢 Activo</option>
                                                    <option value="paused">⏸️ Pausado</option>
                                                    <option value="completed">✅ Completado</option>
                                                    <option value="cancelled">❌ Cancelado</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="mt-6">
                                            <div className="group">
                                                <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-blue-600 transition-colors duration-300">
                                                    Descripción del Proyecto
                                                </label>
                                                <textarea
                                                    placeholder="Describe los objetivos, alcance y características especiales del proyecto..."
                                                    value={formData.description}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                                    rows={4}
                                                    className="w-full px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-blue-300 focus:border-blue-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all duration-300 text-slate-900 font-semibold placeholder-slate-400 shadow-lg focus:shadow-2xl focus:shadow-blue-500/10 transform focus:scale-[1.02] resize-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sección de Presupuesto y Fechas */}
                                    <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/70 p-6 shadow-xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-xl">
                                                <DollarSign className="w-5 h-5 text-white" />
                                            </div>
                                            <h3 className="text-xl font-black text-slate-900">Presupuesto y Fechas</h3>
                                        </div>

                                        <div className="grid gap-6 md:grid-cols-3">
                                            <div className="group">
                                                <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-green-600 transition-colors duration-300">
                                                    Presupuesto (€)
                                                </label>
                                                <input
                                                    type="number"
                                                    placeholder="5000.00"
                                                    value={formData.budget}
                                                    onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                                                    className="w-full px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-green-300 focus:border-green-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-green-500/20 transition-all duration-300 text-slate-900 font-semibold placeholder-slate-400 shadow-lg focus:shadow-2xl focus:shadow-green-500/10 transform focus:scale-[1.02]"
                                                    step="0.01"
                                                    min="0"
                                                />
                                            </div>

                                            <div className="group">
                                                <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-orange-600 transition-colors duration-300">
                                                    Fecha de Inicio
                                                </label>
                                                <CustomDatePicker
                                                    selected={formData.start_date ? new Date(formData.start_date) : null}
                                                    onChange={(date) => setFormData(prev => ({ 
                                                        ...prev, 
                                                        start_date: date ? date.toISOString().split('T')[0] : '' 
                                                    }))}
                                                    placeholderText="Seleccionar fecha de inicio"
                                                    className="px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-orange-300 focus:border-orange-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/20 transition-all duration-300 text-slate-900 font-semibold shadow-lg focus:shadow-2xl focus:shadow-orange-500/10 transform focus:scale-[1.02]"
                                                />
                                            </div>

                                            <div className="group">
                                                <label className="block text-sm font-black text-slate-700 mb-3 group-focus-within:text-red-600 transition-colors duration-300">
                                                    Fecha de Entrega
                                                </label>
                                                <CustomDatePicker
                                                    selected={formData.end_date ? new Date(formData.end_date) : null}
                                                    onChange={(date) => setFormData(prev => ({ 
                                                        ...prev, 
                                                        end_date: date ? date.toISOString().split('T')[0] : '' 
                                                    }))}
                                                    placeholderText="Seleccionar fecha de entrega"
                                                    minDate={formData.start_date ? new Date(formData.start_date) : undefined}
                                                    className="px-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-slate-200 hover:border-red-300 focus:border-red-500 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all duration-300 text-slate-900 font-semibold placeholder-slate-400 shadow-lg focus:shadow-2xl focus:shadow-red-500/10 transform focus:scale-[1.02]"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Botones de Acción Espectaculares */}
                                    <div className="flex gap-4 pt-8 border-t border-white/40">
                                        <button
                                            type="button"
                                            onClick={() => setShowForm(false)}
                                            className="flex-1 px-8 py-4 bg-white/80 backdrop-blur-xl border-2 border-white/60 hover:border-slate-300 text-slate-700 font-black rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group text-lg"
                                        >
                                            <span className="group-hover:scale-110 transition-transform duration-300 inline-block">Cancelar</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={createProject}
                                            disabled={!formData.name.trim() || !formData.client_id}
                                            className="flex-1 px-8 py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-700 hover:via-pink-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-black rounded-2xl shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-110 hover:-translate-y-1 disabled:hover:scale-100 disabled:hover:translate-y-0 transition-all duration-500 relative overflow-hidden group text-lg"
                                        >
                                            <span className="relative z-10 flex items-center justify-center gap-3">
                                                <Briefcase className="w-6 h-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                                                <span className="group-hover:scale-110 transition-transform duration-300">
                                                    Crear Proyecto
                                                </span>
                                                <Plus className="w-5 h-5 group-hover:scale-125 group-hover:rotate-45 transition-all duration-300" />
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
