'use client';

import Sidebar from '@/components/Sidebar';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { toast } from 'sonner';
import {
    AlertTriangle,
    Calendar,
    Copy,
    DollarSign,
    Edit,
    Eye,
    FileText,
    Plus,
    Search,
    Star,
    Target,
    TrendingUp,
    Trash2,
    Users,
    X,
    Grid3x3,
    List,
    Play
} from 'lucide-react';
import TrialBanner from '../../../components/TrialBanner';
import { useTrialStatus } from '../../../src/lib/useTrialStatus';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Tipo Template
type Template = {
    id: string;
    name: string;
    category: string;
    description: string;
    template_data: any;
    is_public: boolean;
    usage_count: number;
    created_at: string;
    user_id?: string;
};

// Interface para props
interface TemplatesPageBonsaiProps {
    userEmail: string;
}

// Componente principal
export default function TemplatesPageBonsai({ userEmail }: TemplatesPageBonsaiProps) {
    // Hook de trial status
    const { trialInfo, loading: trialLoading, hasReachedLimit, canUseFeatures } = useTrialStatus(userEmail);
    
    // Estados
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showForm, setShowForm] = useState(false);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Estados para usar template
    const [showUseModal, setShowUseModal] = useState(false);
    const [templateToUse, setTemplateToUse] = useState<Template | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [editablePhases, setEditablePhases] = useState<any[]>([]);
    const [projectData, setProjectData] = useState({
        name: '',
        description: '',
        budget: '',
        start_date: '',
        end_date: ''
    });
    
    // Estado para el formulario de nuevo template
    const [newTemplate, setNewTemplate] = useState({
        name: '',
        description: '',
        category: 'web_development',
        phases: [{ name: 'Fase inicial', duration: '1 semana', tasks: ['Tarea ejemplo'] }],
        deliverables: ['Entregable ejemplo'],
        pricing: {
            base_price: '',
            hourly_rate: '',
            fixed_price: true
        }
    });
    
    const supabase = createSupabaseClient();
    const router = useRouter();

    // Función para manejar logout
    const handleLogout = async () => {
        try {
            if (!supabase) return;
            await supabase.auth.signOut();
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    // Función para manejar la creación de nueva plantilla
    const handleNewTemplateClick = () => {
        if (!canUseFeatures) {
            toast.error('Tu periodo de prueba ha expirado. Actualiza tu plan para continuar creando plantillas.');
            return;
        }
        setShowForm(true);
    };

    // Función para obtener templates
    const fetchTemplates = async () => {
        try {
            if (!supabase) {
                console.error('Supabase client not available');
                return;
            }
            
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data: templatesData, error } = await supabase
                .from('project_templates')
                .select('*')
                .or(`user_id.eq.${user.id},is_public.eq.true`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching templates:', error);
                return;
            }

            setTemplates(templatesData || []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Función para crear template
    const createTemplate = async () => {
        try {
            if (!supabase || !newTemplate.name) return;
            
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            // Construir el template_data
            const templateData = {
                phases: newTemplate.phases.filter(phase => phase.name.trim() !== ''),
                deliverables: newTemplate.deliverables.filter(d => d.trim() !== ''),
                pricing: {
                    base_price: newTemplate.pricing.base_price ? parseFloat(newTemplate.pricing.base_price) : 0,
                    hourly_rate: newTemplate.pricing.hourly_rate ? parseFloat(newTemplate.pricing.hourly_rate) : 0,
                    fixed_price: newTemplate.pricing.fixed_price
                }
            };

            const { data, error } = await supabase
                .from('project_templates')
                .insert([{
                    name: newTemplate.name,
                    category: newTemplate.category,
                    description: newTemplate.description,
                    template_data: templateData,
                    user_id: user.id,
                    is_public: false, // Siempre privados por defecto
                    usage_count: 0
                }])
                .select();

            if (error) {
                console.error('Error creating template:', error);
                return;
            }

            if (data && data[0]) {
                setTemplates(prev => [data[0], ...prev]);
                setNewTemplate({
                    name: '',
                    description: '',
                    category: 'web_development',
                    phases: [{ name: 'Fase inicial', duration: '1 semana', tasks: ['Tarea ejemplo'] }],
                    deliverables: ['Entregable ejemplo'],
                    pricing: {
                        base_price: '',
                        hourly_rate: '',
                        fixed_price: true
                    }
                });
                setShowForm(false);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Función para duplicar template
    const duplicateTemplate = async (template: Template) => {
        try {
            if (!supabase) return;
            
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data, error } = await supabase
                .from('project_templates')
                .insert([{
                    name: `${template.name} (Copia)`,
                    category: template.category,
                    description: template.description,
                    template_data: template.template_data,
                    user_id: user.id,
                    is_public: false,
                    usage_count: 0
                }])
                .select();

            if (error) {
                console.error('Error duplicating template:', error);
                return;
            }

            if (data && data[0]) {
                setTemplates(prev => [data[0], ...prev]);
                // Incrementar contador de uso del template original si es público
                if (template.is_public && template.user_id !== user.id) {
                    await supabase
                        .from('project_templates')
                        .update({ usage_count: template.usage_count + 1 })
                        .eq('id', template.id);
                }
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Función para usar template (nueva)
    const applyTemplate = async (template: Template) => {
        try {
            if (!supabase) return;
            
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            // Obtener clientes del usuario
            const { data: clientsData, error: clientsError } = await supabase
                .from('clients')
                .select('id, name, email')
                .eq('user_id', user.id)
                .order('name');

            if (clientsError) {
                console.error('Error fetching clients:', clientsError);
                toast.error('Error al obtener los clientes');
                return;
            }

            setClients(clientsData || []);
            setTemplateToUse(template);
            setEditablePhases(template.template_data?.phases || []);
            setProjectData({
                name: template.name,
                description: template.description || '',
                budget: template.template_data?.pricing?.base_price?.toString() || '',
                start_date: '',
                end_date: ''
            });
            setShowUseModal(true);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Función wrapper para manejar useTemplate en onClick
    const handleUseTemplate = (template: Template) => {
        applyTemplate(template);
    };

    // Función para crear proyecto desde template
    const createProjectFromTemplate = async () => {
        try {
            if (!supabase || !templateToUse || !selectedClient || !projectData.name.trim()) {
                toast.error('Por favor, completa todos los campos requeridos');
                return;
            }
            
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            // Crear el proyecto con los datos del template modificados
            const projectDataToInsert: any = {
                user_id: user.id,
                client_id: selectedClient,
                name: projectData.name,
                description: projectData.description,
                status: 'planning',
                template_data: {
                    phases: editablePhases,
                    deliverables: templateToUse.template_data?.deliverables || [],
                    pricing: {
                        base_price: projectData.budget ? parseFloat(projectData.budget) : 0,
                        hourly_rate: templateToUse.template_data?.pricing?.hourly_rate || 0,
                        fixed_price: templateToUse.template_data?.pricing?.fixed_price || true
                    }
                }
            };

            if (projectData.budget && parseFloat(projectData.budget) > 0) {
                projectDataToInsert.budget = parseFloat(projectData.budget);
            }

            if (projectData.start_date) {
                projectDataToInsert.start_date = projectData.start_date;
            }

            if (projectData.end_date) {
                projectDataToInsert.end_date = projectData.end_date;
            }

            const { data, error } = await supabase
                .from('projects')
                .insert([projectDataToInsert])
                .select();

            if (error) {
                console.error('Error creating project:', error);
                toast.error('Error al crear el proyecto: ' + error.message);
                return;
            }

            if (data && data[0]) {
                // Incrementar contador de uso del template
                await supabase
                    .from('project_templates')
                    .update({ usage_count: templateToUse.usage_count + 1 })
                    .eq('id', templateToUse.id);

                // Cerrar modal y resetear estados
                setShowUseModal(false);
                setTemplateToUse(null);
                setSelectedClient('');
                setEditablePhases([]);
                setProjectData({
                    name: '',
                    description: '',
                    budget: '',
                    start_date: '',
                    end_date: ''
                });

                toast.success('¡Proyecto creado exitosamente!');
                
                // Redirigir al proyecto creado después de un pequeño delay
                setTimeout(() => {
                    router.push(`/dashboard/projects/${data[0].id}`);
                }, 1000);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error inesperado al crear el proyecto');
        }
    };

    // Funciones para gestionar fases editables en el modal de usar template
    const updateEditablePhase = (index: number, field: string, value: string) => {
        setEditablePhases(prev => 
            prev.map((phase, i) => 
                i === index ? { ...phase, [field]: value } : phase
            )
        );
    };

    const addEditablePhase = () => {
        setEditablePhases(prev => [
            ...prev,
            { name: '', duration: '', description: '', estimated_cost: '' }
        ]);
    };

    const removeEditablePhase = (index: number) => {
        setEditablePhases(prev => prev.filter((_, i) => i !== index));
    };

    // Funciones para gestionar fases del formulario de nuevo template
    const addPhase = () => {
        setNewTemplate(prev => ({
            ...prev,
            phases: [...prev.phases, { name: '', duration: '', tasks: [''] }]
        }));
    };

    const removePhase = (index: number) => {
        setNewTemplate(prev => ({
            ...prev,
            phases: prev.phases.filter((_, i) => i !== index)
        }));
    };

    const updatePhase = (index: number, field: string, value: string) => {
        setNewTemplate(prev => ({
            ...prev,
            phases: prev.phases.map((phase, i) => 
                i === index ? { ...phase, [field]: value } : phase
            )
        }));
    };

    // Funciones para gestionar entregables
    const addDeliverable = () => {
        setNewTemplate(prev => ({
            ...prev,
            deliverables: [...prev.deliverables, '']
        }));
    };

    const removeDeliverable = (index: number) => {
        setNewTemplate(prev => ({
            ...prev,
            deliverables: prev.deliverables.filter((_, i) => i !== index)
        }));
    };

    const updateDeliverable = (index: number, value: string) => {
        setNewTemplate(prev => ({
            ...prev,
            deliverables: prev.deliverables.map((d, i) => i === index ? value : d)
        }));
    };

    // Cargar templates al montar
    useEffect(() => {
        fetchTemplates();
    }, []);

    // Filtrar templates
    const filteredTemplates = templates.filter(template => {
        const matchesSearch = template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.category?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    // Funciones de utilidad
    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'web_development': return 'bg-blue-100 text-blue-800';
            case 'design': return 'bg-purple-100 text-purple-800';
            case 'consulting': return 'bg-green-100 text-green-800';
            case 'marketing': return 'bg-pink-100 text-pink-800';
            case 'content': return 'bg-orange-100 text-orange-800';
            case 'photography': return 'bg-yellow-100 text-yellow-800';
            case 'video': return 'bg-red-100 text-red-800';
            case 'automation': return 'bg-indigo-100 text-indigo-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'web_development': return <FileText className="w-4 h-4" />;
            case 'design': return <Target className="w-4 h-4" />;
            case 'consulting': return <Users className="w-4 h-4" />;
            case 'marketing': return <TrendingUp className="w-4 h-4" />;
            case 'content': return <Edit className="w-4 h-4" />;
            case 'photography': return <Eye className="w-4 h-4" />;
            case 'video': return <Play className="w-4 h-4" />;
            case 'automation': return <Target className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
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

    // Estadísticas
    const stats = {
        total: templates.length,
        public: templates.filter(t => t.is_public).length,
        private: templates.filter(t => !t.is_public).length,
        categories: [...new Set(templates.map(t => t.category))].length
    };

    // Render
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
                                <h1 className="text-2xl font-semibold text-gray-900">Templates de Proyecto</h1>
                                <p className="mt-1 text-sm text-gray-600">
                                    Acelera tu trabajo con plantillas profesionales
                                </p>
                            </div>
                            <button
                                onClick={handleNewTemplateClick}
                                disabled={!canUseFeatures}
                                className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                                    !canUseFeatures 
                                        ? 'opacity-50 cursor-not-allowed !bg-gray-400 hover:!bg-gray-400' 
                                        : ''
                                }`}
                            >
                                {!canUseFeatures ? (
                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                {!canUseFeatures ? 'Trial Expirado' : 'Nuevo Template'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <FileText className="h-6 w-6 text-blue-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Total Templates</p>
                                    <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-green-100 rounded-lg">
                                    <Users className="h-6 w-6 text-green-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Públicos</p>
                                    <p className="text-2xl font-semibold text-gray-900">{stats.public}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <Eye className="h-6 w-6 text-purple-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Privados</p>
                                    <p className="text-2xl font-semibold text-gray-900">{stats.private}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center">
                                <div className="p-2 bg-yellow-100 rounded-lg">
                                    <Target className="h-6 w-6 text-yellow-600" />
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Categorías</p>
                                    <p className="text-2xl font-semibold text-gray-900">{stats.categories}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Controles de búsqueda y filtros */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex flex-col sm:flex-row gap-4 flex-1">
                                <div className="relative flex-1">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Buscar templates..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                
                                <select
                                    value={filterCategory}
                                    onChange={(e) => setFilterCategory(e.target.value)}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="all">Todas las Categorías</option>
                                    <option value="web_development">Desarrollo Web</option>
                                    <option value="design">Diseño</option>
                                    <option value="marketing">Marketing</option>
                                    <option value="consulting">Consultoría</option>
                                    <option value="content">Contenido</option>
                                    <option value="photography">Fotografía</option>
                                    <option value="video">Video</option>
                                    <option value="automation">Automatización</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-2 rounded-lg ${
                                        viewMode === 'grid'
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <Grid3x3 className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-lg ${
                                        viewMode === 'list'
                                            ? 'bg-blue-100 text-blue-600'
                                            : 'text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <List className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lista de templates */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-6">
                                Templates Disponibles ({filteredTemplates.length})
                            </h2>
                            
                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <div className="w-8 h-8 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                                        <p className="text-sm text-gray-600">Cargando templates...</p>
                                    </div>
                                </div>
                            ) : filteredTemplates.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                                        {searchTerm ? 'No se encontraron templates' : 'No hay templates disponibles'}
                                    </h3>
                                    <p className="text-gray-600 mb-4">
                                        {searchTerm 
                                            ? `No hay templates que coincidan con "${searchTerm}"`
                                            : 'Comienza creando tu primer template para acelerar futuros proyectos'
                                        }
                                    </p>
                                    {!searchTerm && (
                                        <button
                                            onClick={handleNewTemplateClick}
                                            disabled={!canUseFeatures}
                                            className={`inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 ${
                                                !canUseFeatures 
                                                    ? 'opacity-50 cursor-not-allowed !bg-gray-400 hover:!bg-gray-400' 
                                                    : ''
                                            }`}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Crear primer template
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    {viewMode === 'grid' ? (
                                        /* Vista de Tarjetas */
                                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                            {filteredTemplates.map((template) => {
                                                const phases = template.template_data?.phases?.length || 0;
                                                const basePrice = template.template_data?.pricing?.base_price || 0;

                                                return (
                                                    <div
                                                        key={template.id}
                                                        className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                                                    >
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="p-2 bg-gray-100 rounded-lg">
                                                                    {getCategoryIcon(template.category)}
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-medium text-gray-900 truncate" title={template.name}>
                                                                        {template.name || 'Sin nombre'}
                                                                    </h3>
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                                                                        {template.category.replace('_', ' ').charAt(0).toUpperCase() + template.category.replace('_', ' ').slice(1)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {template.is_public && (
                                                                <Star className="h-4 w-4 text-yellow-400" />
                                                            )}
                                                        </div>

                                                        {template.description && (
                                                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                                                {template.description}
                                                            </p>
                                                        )}
                                                        
                                                        <div className="space-y-2 mb-4">
                                                            {phases > 0 && (
                                                                <div className="flex items-center text-sm text-gray-600">
                                                                    <Target className="h-4 w-4 mr-2" />
                                                                    {phases} fases
                                                                </div>
                                                            )}
                                                            
                                                            {basePrice > 0 && (
                                                                <div className="flex items-center text-sm text-gray-600">
                                                                    <DollarSign className="h-4 w-4 mr-2" />
                                                                    {formatCurrency(basePrice)}
                                                                </div>
                                                            )}
                                                            
                                                            <div className="flex items-center text-sm text-gray-500">
                                                                <Calendar className="h-4 w-4 mr-2" />
                                                                {formatDate(template.created_at)}
                                                            </div>

                                                            {template.usage_count > 0 && (
                                                                <div className="flex items-center text-sm text-gray-500">
                                                                    <Users className="h-4 w-4 mr-2" />
                                                                    {template.usage_count} usos
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleUseTemplate(template)}
                                                                className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                                                            >
                                                                <Play className="w-4 h-4 mr-2" />
                                                                Usar
                                                            </button>
                                                            <button
                                                                onClick={() => duplicateTemplate(template)}
                                                                className="px-3 py-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                                                                title="Duplicar template"
                                                            >
                                                                <Copy className="w-4 h-4" />
                                                            </button>
                                                            <button className="px-3 py-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                                                                <Eye className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        /* Vista de Lista */
                                        <div className="space-y-4">
                                            {filteredTemplates.map((template) => {
                                                const phases = template.template_data?.phases?.length || 0;
                                                const basePrice = template.template_data?.pricing?.base_price || 0;

                                                return (
                                                    <div
                                                        key={template.id}
                                                        className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                                                                <div className="p-2 bg-gray-100 rounded-lg">
                                                                    {getCategoryIcon(template.category)}
                                                                </div>
                                                                
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <h3 className="font-medium text-gray-900 truncate" title={template.name}>
                                                                            {template.name || 'Sin nombre'}
                                                                        </h3>
                                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                                                                            {template.category.replace('_', ' ').charAt(0).toUpperCase() + template.category.replace('_', ' ').slice(1)}
                                                                        </span>
                                                                        {template.is_public && (
                                                                            <Star className="h-4 w-4 text-yellow-400" />
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <div className="flex items-center gap-6 text-sm text-gray-600">
                                                                        {phases > 0 && (
                                                                            <div className="flex items-center">
                                                                                <Target className="h-4 w-4 mr-1" />
                                                                                {phases} fases
                                                                            </div>
                                                                        )}
                                                                        
                                                                        {basePrice > 0 && (
                                                                            <div className="flex items-center">
                                                                                <DollarSign className="h-4 w-4 mr-1" />
                                                                                {formatCurrency(basePrice)}
                                                                            </div>
                                                                        )}
                                                                        
                                                                        <div className="flex items-center">
                                                                            <Calendar className="h-4 w-4 mr-1" />
                                                                            {formatDate(template.created_at)}
                                                                        </div>

                                                                        {template.usage_count > 0 && (
                                                                            <div className="flex items-center">
                                                                                <Users className="h-4 w-4 mr-1" />
                                                                                {template.usage_count} usos
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {template.description && (
                                                                        <p className="text-sm text-gray-500 mt-1 line-clamp-1" title={template.description}>
                                                                            {template.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2 ml-4">
                                                                <button
                                                                    onClick={() => handleUseTemplate(template)}
                                                                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                                                                >
                                                                    <Play className="w-4 h-4 mr-2" />
                                                                    Usar
                                                                </button>
                                                                <button
                                                                    onClick={() => duplicateTemplate(template)}
                                                                    className="px-3 py-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                                                                    title="Duplicar template"
                                                                >
                                                                    <Copy className="w-4 h-4" />
                                                                </button>
                                                                <button className="px-3 py-2 text-gray-400 hover:text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                                                                    <Eye className="w-4 h-4" />
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

            {/* Modal de Nuevo Template */}
            {showForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Crear Nuevo Template
                                </h3>
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre del Template *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Landing Page Premium, App Móvil Completa..."
                                        value={newTemplate.name}
                                        onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Categoría *
                                    </label>
                                    <select
                                        value={newTemplate.category}
                                        onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="web_development">Desarrollo Web</option>
                                        <option value="design">Diseño</option>
                                        <option value="marketing">Marketing</option>
                                        <option value="consulting">Consultoría</option>
                                        <option value="content">Contenido</option>
                                        <option value="photography">Fotografía</option>
                                        <option value="video">Video</option>
                                        <option value="automation">Automatización</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Descripción del Template
                                    </label>
                                    <textarea
                                        placeholder="Describe qué incluye este template, sus características y cuándo usarlo..."
                                        value={newTemplate.description}
                                        onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Precio Base (€)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="2500.00"
                                        value={newTemplate.pricing.base_price}
                                        onChange={(e) => setNewTemplate(prev => ({
                                            ...prev,
                                            pricing: { ...prev.pricing, base_price: e.target.value }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tarifa por Hora (€)
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="75.00"
                                        value={newTemplate.pricing.hourly_rate}
                                        onChange={(e) => setNewTemplate(prev => ({
                                            ...prev,
                                            pricing: { ...prev.pricing, hourly_rate: e.target.value }
                                        }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Sección de Fases del Proyecto */}
                            <div className="border-t border-gray-200 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-md font-medium text-gray-900">Fases del Proyecto</h4>
                                    <button
                                        type="button"
                                        onClick={addPhase}
                                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Agregar Fase
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    {newTemplate.phases.map((phase, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h5 className="text-sm font-medium text-gray-700">Fase {index + 1}</h5>
                                                {newTemplate.phases.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removePhase(index)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Nombre de la fase
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: Diseño y planificación"
                                                        value={phase.name}
                                                        onChange={(e) => updatePhase(index, 'name', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Duración estimada
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: 1 semana, 5 días"
                                                        value={phase.duration}
                                                        onChange={(e) => updatePhase(index, 'duration', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sección de Entregables */}
                            <div className="border-t border-gray-200 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-md font-medium text-gray-900">Entregables</h4>
                                    <button
                                        type="button"
                                        onClick={addDeliverable}
                                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Agregar Entregable
                                    </button>
                                </div>
                                
                                <div className="space-y-3">
                                    {newTemplate.deliverables.map((deliverable, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                            <input
                                                type="text"
                                                placeholder="Ej: Diseño completo en Figma, Código fuente, Manual de usuario..."
                                                value={deliverable}
                                                onChange={(e) => updateDeliverable(index, e.target.value)}
                                                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                            />
                                            {newTemplate.deliverables.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeDeliverable(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={createTemplate}
                                    disabled={!newTemplate.name.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Crear Template
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Usar Template */}
            {showUseModal && templateToUse && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-medium text-gray-900">
                                        Usar Template: {templateToUse.name}
                                    </h3>
                                    <p className="text-sm text-gray-600">
                                        Personaliza el template y asígnalo a un cliente
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowUseModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Información básica del proyecto */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Cliente *
                                    </label>
                                    <select
                                        value={selectedClient}
                                        onChange={(e) => setSelectedClient(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    >
                                        <option value="">Seleccionar cliente...</option>
                                        {clients.map((client) => (
                                            <option key={client.id} value={client.id}>
                                                {client.name} ({client.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nombre del Proyecto *
                                    </label>
                                    <input
                                        type="text"
                                        value={projectData.name}
                                        onChange={(e) => setProjectData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Descripción del Proyecto
                                    </label>
                                    <textarea
                                        value={projectData.description}
                                        onChange={(e) => setProjectData(prev => ({ ...prev, description: e.target.value }))}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Presupuesto (€)
                                    </label>
                                    <input
                                        type="number"
                                        value={projectData.budget}
                                        onChange={(e) => setProjectData(prev => ({ ...prev, budget: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Fecha de inicio
                                    </label>
                                    <input
                                        type="date"
                                        value={projectData.start_date}
                                        onChange={(e) => setProjectData(prev => ({ ...prev, start_date: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Fecha de fin estimada
                                    </label>
                                    <input
                                        type="date"
                                        value={projectData.end_date}
                                        onChange={(e) => setProjectData(prev => ({ ...prev, end_date: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Fases editables */}
                            <div className="border-t border-gray-200 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-md font-medium text-gray-900">Fases del Proyecto</h4>
                                    <button
                                        type="button"
                                        onClick={addEditablePhase}
                                        className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Agregar Fase
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    {editablePhases.map((phase, index) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h5 className="text-sm font-medium text-gray-700">Fase {index + 1}</h5>
                                                <button
                                                    type="button"
                                                    onClick={() => removeEditablePhase(index)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Nombre de la fase
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: Diseño y planificación"
                                                        value={phase.name || ''}
                                                        onChange={(e) => updateEditablePhase(index, 'name', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Duración estimada
                                                    </label>
                                                    <input
                                                        type="text"
                                                        placeholder="Ej: 1 semana, 5 días"
                                                        value={phase.duration || ''}
                                                        onChange={(e) => updateEditablePhase(index, 'duration', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                                        Costo estimado (€)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        placeholder="500"
                                                        value={phase.estimated_cost || ''}
                                                        onChange={(e) => updateEditablePhase(index, 'estimated_cost', e.target.value)}
                                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Descripción de la fase
                                                </label>
                                                <textarea
                                                    placeholder="Descripción detallada de lo que incluye esta fase..."
                                                    value={phase.description || ''}
                                                    onChange={(e) => updateEditablePhase(index, 'description', e.target.value)}
                                                    rows={2}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Entregables (solo lectura) */}
                            {templateToUse.template_data?.deliverables && templateToUse.template_data.deliverables.length > 0 && (
                                <div className="border-t border-gray-200 pt-6">
                                    <h4 className="text-md font-medium text-gray-900 mb-4">Entregables Incluidos</h4>
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <ul className="space-y-2">
                                            {templateToUse.template_data.deliverables.map((deliverable: string, index: number) => (
                                                <li key={index} className="flex items-start">
                                                    <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                                    <span className="text-sm text-gray-700">{deliverable}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowUseModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={createProjectFromTemplate}
                                    disabled={!selectedClient || !projectData.name.trim()}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Crear Proyecto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
