'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import CustomDatePicker from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { calendarAI, type AIInsight, type CalendarEvent, type DashboardMetrics, type EventType, type SmartSuggestion } from '@/src/lib/calendar-ai-local';
import { createSupabaseClient } from '@/src/lib/supabase';
import { showToast } from '@/utils/toast';
import {
    AlertTriangle,
    ArrowRight,
    BarChart3,
    Brain,
    Briefcase,
    Calculator,
    Calendar as CalendarIcon,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    Clock,
    DollarSign,
    Eye,
    Lightbulb,
    MapPin,
    Play,
    Plus,
    Sparkles,
    Square,
    Star,
    Target,
    Timer,
    TrendingUp,
    Users,
    Video,
    Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import TrialBanner from '../../../components/TrialBanner';
import { useTrialStatus } from '../../../src/lib/useTrialStatus';

// Tipos TypeScript para el calendario
type ViewType = 'day' | 'week' | 'month';

// Extender CalendarEvent para incluir relaciones
interface ExtendedCalendarEvent extends CalendarEvent {
    clients?: {
        name: string;
        company?: string;
    };
    projects?: {
        name: string;
        description?: string;
    };
}

interface CalendarPageClientProps {
    userEmail: string;
}

export default function CalendarPageClient({ userEmail }: CalendarPageClientProps) {
    const supabase = createSupabaseClient();
    const router = useRouter();

    // Hook de trial status
    const { trialInfo, loading: trialLoading, hasReachedLimit, canUseFeatures } = useTrialStatus(userEmail);

    // States básicos
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState<ViewType>('week');
    const [events, setEvents] = useState<ExtendedCalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<ExtendedCalendarEvent | null>(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [activeTracking, setActiveTracking] = useState<string | null>(null);

    // Estados de IA
    const [aiInsights, setAIInsights] = useState<AIInsight[]>([]);
    const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null);
    const [smartSuggestions, setSmartSuggestions] = useState<SmartSuggestion[]>([]);
    const [showAIPanel, setShowAIPanel] = useState(true);
    const [lastInsightsUpdate, setLastInsightsUpdate] = useState<Date | null>(null);
    const [aiLoading, setAILoading] = useState(false);

    // Estados CRM
    const [clients, setClients] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<any[]>([]);

    // Estados para nuevo evento
    const [showNewEventForm, setShowNewEventForm] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        type: 'work' as EventType,
        is_billable: true,
        hourly_rate: 50,
        location: '',
        meeting_url: '',
        client_id: '',
        project_id: ''
    });

    // Estados para evento seleccionado (ver/editar)
    const [showEventDetails, setShowEventDetails] = useState(false);
    const [editingEvent, setEditingEvent] = useState<ExtendedCalendarEvent | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);

    const [userId, setUserId] = useState<string>('');

    const handleLogout = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Función para manejar nuevo evento
    const handleNewEventClick = () => {
        if (!canUseFeatures) {
            showToast.warning('Tu periodo de prueba ha expirado. Actualiza tu plan para continuar creando eventos.');
            return;
        }

        setShowNewEventForm(true);
    };

    // ==================== FUNCIONES DE DATOS INICIALES ====================
    const createSampleData = async () => {
        if (!supabase) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Crear un cliente de ejemplo
            const { data: clientData, error: clientError } = await supabase
                .from('clients')
                .insert([{
                    name: 'Cliente Demo',
                    company: 'Empresa Demo S.L.',
                    email: 'demo@cliente.com',
                    phone: '+34 600 000 000',
                    user_id: user.id
                }])
                .select()
                .single();

            if (clientError) {
                console.error('Error creating sample client:', clientError);
                return;
            }

            // Crear un proyecto de ejemplo
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .insert([{
                    name: 'Proyecto Demo',
                    description: 'Un proyecto de ejemplo para empezar',
                    client_id: clientData.id,
                    status: 'active',
                    budget: 5000,
                    user_id: user.id
                }])
                .select()
                .single();

            if (projectError) {
                console.error('Error creating sample project:', projectError);
                return;
            }

            // Crear eventos de ejemplo
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            const sampleEvents = [
                {
                    title: '🎯 Reunión de planificación',
                    description: 'Revisión de objetivos y planificación semanal',
                    start_time: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString(), // 10:00 AM hoy
                    end_time: new Date(today.getTime() + 11 * 60 * 60 * 1000).toISOString(), // 11:00 AM hoy
                    type: 'meeting',
                    is_billable: true,
                    hourly_rate: 75,
                    status: 'scheduled',
                    client_id: clientData.id,
                    project_id: projectData.id,
                    user_id: user.id
                },
                {
                    title: '💻 Desarrollo web',
                    description: 'Trabajo en la nueva funcionalidad del dashboard',
                    start_time: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(), // 2:00 PM hoy
                    end_time: new Date(today.getTime() + 16 * 60 * 60 * 1000).toISOString(), // 4:00 PM hoy
                    type: 'work',
                    is_billable: true,
                    hourly_rate: 65,
                    status: 'scheduled',
                    client_id: clientData.id,
                    project_id: projectData.id,
                    user_id: user.id
                },
                {
                    title: '☕ Descanso productivo',
                    description: 'Pausa para recargar energías',
                    start_time: new Date(today.getTime() + 16 * 60 * 60 * 1000).toISOString(), // 4:00 PM hoy
                    end_time: new Date(today.getTime() + 16.5 * 60 * 60 * 1000).toISOString(), // 4:30 PM hoy
                    type: 'break',
                    is_billable: false,
                    hourly_rate: 0,
                    status: 'scheduled',
                    user_id: user.id
                }
            ];

            const { error: eventsError } = await supabase
                .from('calendar_events')
                .insert(sampleEvents);

            if (eventsError) {
                console.error('Error creating sample events:', eventsError);
            } else {
                await fetchEvents();
                await loadClientsAndProjects();
                await loadAIData();
            }
        } catch (error) {
            console.error('Error creating sample data:', error);
        }
    };

    // Función para verificar si es primera vez del usuario
    const checkAndCreateInitialData = async () => {
        if (!supabase) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Verificar si ya tiene eventos
            const { data: existingEvents, error } = await supabase
                .from('calendar_events')
                .select('id')
                .eq('user_id', user.id)
                .limit(1);

            if (error && error.code !== 'PGRST116') {
                console.error('Error checking existing events:', error);
                return;
            }

            // Si no tiene eventos y las tablas existen, crear datos de ejemplo
            if (!existingEvents || existingEvents.length === 0) {
                const shouldCreateSample = await showToast.confirm(
                    '¡Bienvenido a Taskelio! 🎉\n\n' +
                    'Parece que es tu primera vez usando el calendario.\n' +
                    '¿Te gustaría que creemos algunos datos de ejemplo para empezar?\n\n' +
                    '✨ Incluye: cliente demo, proyecto y eventos de muestra'
                );

                if (shouldCreateSample) {
                    await createSampleData();
                }
            }
        } catch (error) {
            console.error('Error checking initial data:', error);
        }
    };

    // ==================== FUNCIONES CRM ====================
    const loadClientsAndProjects = async () => {
        try {
            if (!supabase) {
                console.warn('Supabase no configurado, no se pueden cargar clientes y proyectos');
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('Usuario no autenticado');
                return;
            }

            // Cargar clientes
            const { data: clientsData, error: clientsError } = await supabase
                .from('clients')
                .select('id, name, company, email, phone')
                .eq('user_id', user.id)
                .order('name');

            if (clientsError) {
                console.error('Error loading clients:', clientsError);
                if (clientsError.code === 'PGRST116') {
                    console.warn('Tabla clients no existe. Creando datos demo...');
                }
            } else if (clientsData) {
                setClients(clientsData);
            }

            // Cargar proyectos
            const { data: projectsData, error: projectsError } = await supabase
                .from('projects')
                .select('id, name, client_id, status, budget')
                .eq('user_id', user.id)
                .order('name');

            if (projectsError) {
                console.error('Error loading projects:', projectsError);
                if (projectsError.code === 'PGRST116') {
                    console.warn('Tabla projects no existe. Creando datos demo...');
                }
            } else if (projectsData) {
                setProjects(projectsData);
            }
        } catch (error) {
            console.error('Error loading CRM data:', error);
        }
    };

    // Filtrar proyectos por cliente seleccionado
    useEffect(() => {
        if (newEvent.client_id) {
            const clientProjects = projects.filter((p: any) => p.client_id === newEvent.client_id);
            setFilteredProjects(clientProjects);
        } else {
            setFilteredProjects([]);
        }
    }, [newEvent.client_id, projects]);

    // ==================== EFECTOS Y INICIALIZACIÓN ====================
    useEffect(() => {
        initializeCalendar();
        loadClientsAndProjects();
    }, []);

    useEffect(() => {
        if (userId) {
            loadAIData();
        }
    }, [userId]);

    // Recargar IA cuando cambien los eventos o la fecha
    useEffect(() => {
        if (events.length > 0) {
            loadAIData();
        }
    }, [events, currentDate]);

    const initializeCalendar = async () => {
        try {
            if (!supabase) {
                console.warn('⚠️ Supabase no configurado. El calendario funcionará en modo limitado.');
                setLoading(false);
                return;
            }

            const { data: { user }, error } = await supabase.auth.getUser();
            if (error) {
                console.error('Error getting user:', error);
                setLoading(false);
                return;
            }

            if (user) {
                setUserId(user.id);
                // Cargar datos en paralelo
                await Promise.all([
                    fetchEvents(),
                    loadClientsAndProjects()
                ]);

                // Verificar si necesitamos crear datos iniciales
                await checkAndCreateInitialData();

                // Cargar IA después de tener los eventos
                await loadAIData();
            } else {
                console.warn('Usuario no autenticado');
            }
        } catch (error) {
            console.error('Error initializing calendar:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadAIData = async () => {
        if (!events || events.length === 0) return;

        setAILoading(true);
        try {
            // Usar métodos locales de IA que no requieren APIs externas
            const metrics = calendarAI.calculateLocalDashboardMetrics(events, currentDate);
            const suggestions = calendarAI.generateLocalSmartSuggestions(events, currentDate);
            const productivityScore = calendarAI.analyzeLocalProductivity(events);

            // Crear insights basados en análisis local
            const insights: AIInsight[] = [
                {
                    id: 'productivity-' + Date.now(),
                    insight_type: 'productivity',
                    type: 'productivity',
                    title: '📊 Análisis de Productividad',
                    description: `Score general: ${productivityScore.overall_score}%. Has completado ${productivityScore.completed_events} de ${productivityScore.total_events} eventos.`,
                    confidence_score: 85,
                    impact_score: 80,
                    actionability_score: 75,
                    recommendations: ['Mantén el ritmo actual', 'Considera optimizar horarios menos productivos'],
                    suggested_actions: [],
                    status: 'new',
                    category: 'productivity',
                    created_at: new Date().toISOString()
                },
                {
                    id: 'revenue-' + Date.now(),
                    insight_type: 'revenue',
                    type: 'revenue',
                    title: '💰 Seguimiento de Ingresos',
                    description: `Ingresos total: €${productivityScore.total_revenue}. Horas facturables: ${productivityScore.billable_hours}h.`,
                    confidence_score: 90,
                    impact_score: 95,
                    actionability_score: 85,
                    recommendations: ['Optimizar tarifas por hora', 'Aumentar horas facturables'],
                    suggested_actions: [],
                    status: 'new',
                    category: 'revenue',
                    created_at: new Date().toISOString()
                }
            ];

            // Agregar insight de patrones si hay datos suficientes
            const patterns = calendarAI.analyzeLocalProductivityPatterns(events);
            if (patterns.length > 0) {
                const bestPattern = patterns[0];
                insights.push({
                    id: 'pattern-' + Date.now(),
                    insight_type: 'optimization',
                    type: 'optimization',
                    title: '🎯 Patrón Óptimo Detectado',
                    description: `Tu mejor rendimiento es entre ${bestPattern.timeRange.startHour}:00 y ${bestPattern.timeRange.endHour}:00 (${bestPattern.productivityScore}% productividad).`,
                    confidence_score: bestPattern.confidence,
                    impact_score: 90,
                    actionability_score: 95,
                    recommendations: [`Programa tareas importantes entre ${bestPattern.timeRange.startHour}:00 y ${bestPattern.timeRange.endHour}:00`],
                    suggested_actions: [],
                    status: 'new',
                    category: 'optimization',
                    created_at: new Date().toISOString()
                });
            }

            setDashboardMetrics(metrics);
            setSmartSuggestions(suggestions);
            setAIInsights(insights);
        } catch (error) {
            console.error('Error loading local AI data:', error);
            // Fallback con datos mock para desarrollo
            setDashboardMetrics({
                events_today: events.filter(e => new Date(e.start_time).toDateString() === new Date().toDateString()).length,
                completed_today: 0,
                revenue_today: 0,
                billable_hours_today: 0,
                events_this_week: events.length,
                avg_productivity_week: 75,
                pending_insights: 3,
                active_automations: 2,
                revenue_forecast_week: 1200
            });
            setSmartSuggestions([
                {
                    type: 'optimal_time',
                    title: '🎯 IA Local Activa',
                    description: 'Sistema de IA funcionando sin APIs externas. Analizando tus patrones...',
                    confidence: 95,
                    reasoning: 'Análisis local de productividad activado'
                }
            ]);
        } finally {
            setAILoading(false);
        }
    };

    // ==================== FUNCIONES DE EVENTOS ====================
    const fetchEvents = async () => {
        setLoading(true);
        try {
            if (!supabase) {
                console.warn('Supabase no está configurado, usando datos demo');
                setLoading(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                console.warn('Usuario no autenticado');
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('calendar_events')
                .select(`
                    *,
                    clients(name, company),
                    projects(name, description)
                `)
                .eq('user_id', user.id)
                .order('start_time', { ascending: true });

            if (error) {
                console.error('Error fetching events:', error);
                // En caso de error, no dejamos la tabla vacía
                if (error.code === 'PGRST116') { // Table doesn't exist
                    console.warn('Tabla calendar_events no existe. Se necesita ejecutar la migración de base de datos.');
                }
            } else if (data) {
                const eventsData = data as ExtendedCalendarEvent[];
                setEvents(eventsData);

                // Buscar si hay algún evento en progreso y actualizar activeTracking
                const eventInProgress = eventsData.find(event => event.status === 'in_progress');
                if (eventInProgress) {
                    setActiveTracking(eventInProgress.id);
                } else {
                    setActiveTracking(null);
                }
            }
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    // Crear nuevo evento
    const createEvent = async () => {
        if (!newEvent.title.trim() || !newEvent.start_time || !newEvent.end_time) {
            showToast.warning('Por favor, completa todos los campos obligatorios');
            return;
        }

        if (!supabase) {
            showToast.error('Error: Base de datos no configurada');
            return;
        }

        // Validar que la fecha de fin sea después de la de inicio
        const startDate = new Date(newEvent.start_time);
        const endDate = new Date(newEvent.end_time);
        if (endDate <= startDate) {
            showToast.error('La fecha de fin debe ser posterior a la fecha de inicio');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showToast.error('Error: Usuario no autenticado');
                return;
            }

            // Preparar datos del evento
            const eventData = {
                ...newEvent,
                user_id: user.id,
                status: 'scheduled',
                // Asegurar que client_id y project_id sean null si están vacíos
                client_id: newEvent.client_id || null,
                project_id: newEvent.project_id || null,
                // Asegurar valores por defecto
                is_billable: newEvent.is_billable ?? true,
                hourly_rate: newEvent.hourly_rate || 50
            };

            const { error } = await supabase.from('calendar_events').insert([eventData]);

            if (error) {
                console.error('Error creating event:', error);
                showToast.error(`Error al crear el evento: ${error.message}`);
            } else {
                // Limpiar formulario
                setNewEvent({
                    title: '',
                    description: '',
                    start_time: '',
                    end_time: '',
                    type: 'work',
                    is_billable: true,
                    hourly_rate: 50,
                    location: '',
                    meeting_url: '',
                    client_id: '',
                    project_id: ''
                });
                setShowNewEventForm(false);
                await fetchEvents(); // Recargar eventos
                await loadAIData(); // Recargar datos de IA
                showToast.success('Evento creado exitosamente');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            showToast.error('Error inesperado al crear el evento');
        }
    };

    // Abrir modal de detalles del evento
    const openEventDetails = (event: ExtendedCalendarEvent) => {
        setEditingEvent(event);
        setIsEditMode(false);
        setShowEventDetails(true);
    };

    // Cambiar a modo edición
    const startEditMode = () => {
        setIsEditMode(true);
    };

    // Actualizar evento
    const updateEvent = async () => {
        if (!editingEvent || !supabase) return;

        try {
            const { error } = await supabase
                .from('calendar_events')
                .update({
                    title: editingEvent.title,
                    description: editingEvent.description,
                    start_time: editingEvent.start_time,
                    end_time: editingEvent.end_time,
                    type: editingEvent.type,
                    is_billable: editingEvent.is_billable,
                    hourly_rate: editingEvent.hourly_rate,
                    location: editingEvent.location,
                    meeting_url: editingEvent.meeting_url,
                    client_id: editingEvent.client_id,
                    project_id: editingEvent.project_id
                })
                .eq('id', editingEvent.id);

            if (error) {
                console.error('Error updating event:', error);
                showToast.error('Error al actualizar el evento');
            } else {
                setShowEventDetails(false);
                setEditingEvent(null);
                setIsEditMode(false);
                fetchEvents();
                loadAIData();
                showToast.success('Evento actualizado correctamente');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error al actualizar el evento');
        }
    };

    // Eliminar evento
    const deleteEvent = async () => {
        if (!editingEvent || !supabase) return;

        const confirmed = await showToast.confirm('¿Estás seguro de que quieres eliminar este evento?');
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('calendar_events')
                .delete()
                .eq('id', editingEvent.id);

            if (error) {
                console.error('Error deleting event:', error);
                showToast.error('Error al eliminar el evento');
            } else {
                setShowEventDetails(false);
                setEditingEvent(null);
                setIsEditMode(false);
                fetchEvents();
                loadAIData();
                showToast.success('Evento eliminado correctamente');
            }
        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error al eliminar el evento');
        }
    };

    // Completar evento
    const completeEvent = async (eventId: string) => {
        if (!supabase) return;

        try {
            const { error } = await supabase
                .from('calendar_events')
                .update({ status: 'completed' })
                .eq('id', eventId);

            if (error) {
                console.error('Error completing event:', error);
            } else {
                fetchEvents();
                loadAIData();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Auto-programar con IA local
    const autoScheduleEvent = async () => {
        if (!newEvent.title.trim()) {
            showToast.warning('Por favor, ingresa un título para el evento');
            return;
        }

        try {
            setAILoading(true);

            // Analizar patrones de productividad
            const patterns = calendarAI.analyzeLocalProductivityPatterns(events);
            const suggestions = calendarAI.generateLocalSmartSuggestions(events, new Date());

            if (patterns.length > 0) {
                const bestPattern = patterns[0];
                const now = new Date();

                // Encontrar el próximo slot disponible en la franja óptima
                let suggestedDate = new Date(now);
                if (now.getHours() >= bestPattern.timeRange.endHour) {
                    // Si ya pasó la hora óptima hoy, programar para mañana
                    suggestedDate.setDate(suggestedDate.getDate() + 1);
                }

                suggestedDate.setHours(bestPattern.timeRange.startHour, 0, 0, 0);

                // Calcular duración según tipo de evento
                let duration = 60; // Default 1 hora
                if (newEvent.type === 'focus') duration = 120; // 2 horas para focus
                else if (newEvent.type === 'meeting') duration = 60; // 1 hora para reuniones
                else if (newEvent.type === 'break') duration = 15; // 15 min para breaks
                else if (newEvent.type === 'client_call') duration = 45; // 45 min para calls

                const suggestedEnd = new Date(suggestedDate.getTime() + duration * 60 * 1000);

                // Verificar si el slot está libre
                const conflictingEvents = events.filter(e => {
                    const eventStart = new Date(e.start_time);
                    const eventEnd = new Date(e.end_time);
                    return (
                        (suggestedDate >= eventStart && suggestedDate < eventEnd) ||
                        (suggestedEnd > eventStart && suggestedEnd <= eventEnd) ||
                        (suggestedDate <= eventStart && suggestedEnd >= eventEnd)
                    );
                });

                if (conflictingEvents.length > 0) {
                    // Buscar siguiente slot disponible
                    const nextSlot = new Date(suggestedDate.getTime() + 30 * 60 * 1000); // +30 min
                    while (nextSlot.getHours() < bestPattern.timeRange.endHour) {
                        const nextEnd = new Date(nextSlot.getTime() + duration * 60 * 1000);
                        const hasConflict = events.some(e => {
                            const eventStart = new Date(e.start_time);
                            const eventEnd = new Date(e.end_time);
                            return (
                                (nextSlot >= eventStart && nextSlot < eventEnd) ||
                                (nextEnd > eventStart && nextEnd <= eventEnd) ||
                                (nextSlot <= eventStart && nextEnd >= eventEnd)
                            );
                        });

                        if (!hasConflict) {
                            suggestedDate = nextSlot;
                            break;
                        }
                        nextSlot.setTime(nextSlot.getTime() + 30 * 60 * 1000);
                    }
                }

                // Actualizar el formulario con la sugerencia
                setNewEvent({
                    ...newEvent,
                    start_time: suggestedDate.toISOString().slice(0, 16),
                    end_time: suggestedEnd.toISOString().slice(0, 16)
                });

                // Mostrar feedback al usuario
                showToast.error(`IA recomienda: ${suggestedDate.toLocaleDateString()} a las ${suggestedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (${bestPattern.productivityScore}% productividad en esta franja)`);
            } else {
                // Fallback si no hay patrones
                const now = new Date();
                const tomorrow10AM = new Date(now);
                tomorrow10AM.setDate(tomorrow10AM.getDate() + 1);
                tomorrow10AM.setHours(10, 0, 0, 0);
                const tomorrow11AM = new Date(tomorrow10AM.getTime() + 60 * 60 * 1000);

                setNewEvent({
                    ...newEvent,
                    start_time: tomorrow10AM.toISOString().slice(0, 16),
                    end_time: tomorrow11AM.toISOString().slice(0, 16)
                });

                showToast.error('IA sugiere: Mañana a las 10:00 AM (horario típicamente productivo)');
            }

        } catch (error) {
            console.error('Error en auto-programación:', error);
            showToast.error('Error al usar IA. Intenta programar manualmente.');
        } finally {
            setAILoading(false);
        }
    };

    // ==================== FUNCIONES DE IA ====================
    const generateAIInsights = async () => {
        if (!userId) return;

        setAILoading(true);
        try {
            // Generar insights locales automáticamente
            await loadAIData(); // Recargar datos locales
            setLastInsightsUpdate(new Date()); // Registrar última actualización
        } catch (error) {
            console.error('Error generating AI insights:', error);
        } finally {
            setAILoading(false);
        }
    };

    const suggestOptimalTime = async () => {
        if (!userId || !newEvent.title) return;

        try {
            // Usar la IA local para sugerir horario óptimo
            const patterns = calendarAI.analyzeLocalProductivityPatterns(events);
            if (patterns.length > 0) {
                const bestPattern = patterns[0];
                const now = new Date();
                const suggestedStart = new Date(now);
                suggestedStart.setHours(bestPattern.timeRange.startHour, 0, 0, 0);

                const duration = 60; // 1 hora por defecto
                const suggestedEnd = new Date(suggestedStart.getTime() + duration * 60 * 1000);

                setNewEvent({
                    ...newEvent,
                    start_time: suggestedStart.toISOString().slice(0, 16),
                    end_time: suggestedEnd.toISOString().slice(0, 16)
                });

                showToast.error(`Horario sugerido: ${suggestedStart.toLocaleTimeString()} (${bestPattern.productivityScore}% productividad)`);
            } else {
                showToast.error('No hay suficientes datos para sugerir un horario óptimo');
            }
        } catch (error) {
            console.error('Error suggesting optimal time:', error);
        }
    };

    const dismissInsight = async (insightId: string) => {
        try {
            // Marcar insight como descartado localmente
            setAIInsights(insights => insights.filter(i => i.id !== insightId));
        } catch (error) {
            console.error('Error dismissing insight:', error);
        }
    };

    const markInsightAsViewed = async (insightId: string) => {
        try {
            // Marcar insight como visto localmente
            setAIInsights(insights =>
                insights.map(i => i.id === insightId ? { ...i, status: 'viewed' } : i)
            );
        } catch (error) {
            console.error('Error marking insight as viewed:', error);
        }
    };

    // Iniciar/pausar time tracking
    const toggleTimeTracking = async (eventId: string) => {
        if (activeTracking === eventId) {
            // Pausar tracking
            setActiveTracking(null);
            // Marcar evento como completed al parar el tracking
            try {
                if (!supabase) return;

                await supabase
                    .from('calendar_events')
                    .update({ status: 'completed' })
                    .eq('id', eventId);
                fetchEvents();
            } catch (error) {
                console.error('Error updating event status when stopping:', error);
            }
        } else {
            // Antes de iniciar, parar cualquier otro evento que esté en progreso
            if (activeTracking) {
                try {
                    if (!supabase) return;

                    await supabase
                        .from('calendar_events')
                        .update({ status: 'completed' })
                        .eq('id', activeTracking);
                } catch (error) {
                    console.error('Error stopping previous event:', error);
                }
            }

            // Iniciar tracking del nuevo evento
            setActiveTracking(eventId);
            // Marcar evento como in_progress
            try {
                if (!supabase) return;

                await supabase
                    .from('calendar_events')
                    .update({ status: 'in_progress' })
                    .eq('id', eventId);
                fetchEvents();
            } catch (error) {
                console.error('Error updating event status when starting:', error);
            }
        }
    };

    // Iniciar time tracking específico
    const startTimeTracking = async (eventId: string) => {
        setActiveTracking(eventId);
        try {
            if (!supabase) return;

            await supabase
                .from('calendar_events')
                .update({ status: 'in_progress' })
                .eq('id', eventId);
            fetchEvents();
        } catch (error) {
            console.error('Error starting time tracking:', error);
        }
    };

    // Parar time tracking específico
    const stopTimeTracking = async (eventId: string) => {
        setActiveTracking(null);
        try {
            if (!supabase) return;

            await supabase
                .from('calendar_events')
                .update({ status: 'completed' })
                .eq('id', eventId);
            fetchEvents();
        } catch (error) {
            console.error('Error stopping time tracking:', error);
        }
    };

    // ==================== FUNCIONES HELPER ====================

    // Exportar eventos a CSV
    const exportEventsToCSV = () => {
        if (events.length === 0) {
            showToast.error('No hay eventos para exportar');
            return;
        }

        const csvHeaders = [
            'Título',
            'Descripción',
            'Fecha inicio',
            'Fecha fin',
            'Tipo',
            'Cliente',
            'Proyecto',
            'Facturable',
            'Tarifa/hora',
            'Estado',
            'Ubicación'
        ];

        const csvRows = events.map(event => [
            event.title,
            event.description || '',
            new Date(event.start_time).toLocaleString('es-ES'),
            new Date(event.end_time).toLocaleString('es-ES'),
            event.type,
            event.clients?.name || '',
            event.projects?.name || '',
            event.is_billable ? 'Sí' : 'No',
            event.hourly_rate ? `€${event.hourly_rate}` : '',
            event.status,
            event.location || ''
        ]);

        const csvContent = [csvHeaders, ...csvRows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `eventos_calendar_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calcular estadísticas del calendario
    const getCalendarStats = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayEvents = events.filter((e: ExtendedCalendarEvent) => {
            const eventDate = new Date(e.start_time);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate.getTime() === today.getTime();
        });

        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekEvents = events.filter((e: ExtendedCalendarEvent) => {
            const eventDate = new Date(e.start_time);
            return eventDate >= weekStart && eventDate <= weekEnd;
        });

        const billableEvents = events.filter((e: ExtendedCalendarEvent) => e.is_billable);
        const totalRevenue = billableEvents.reduce((sum: number, event: ExtendedCalendarEvent) => {
            const duration = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60 * 60);
            return sum + (duration * (event.hourly_rate || 0));
        }, 0);

        return {
            totalEvents: events.length,
            todayEvents: todayEvents.length,
            weekEvents: weekEvents.length,
            completedEvents: events.filter((e: ExtendedCalendarEvent) => e.status === 'completed').length,
            billableEvents: billableEvents.length,
            totalRevenue,
            activeTracking: activeTracking ? events.find((e: ExtendedCalendarEvent) => e.id === activeTracking) : null
        };
    };

    const formatDateForView = (date: Date) => {
        const options: Intl.DateTimeFormatOptions =
            currentView === 'month'
                ? { year: 'numeric', month: 'long' }
                : currentView === 'week'
                    ? { month: 'long', day: 'numeric', year: 'numeric' }
                    : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

        return date.toLocaleDateString('es-ES', options);
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);

        if (currentView === 'day') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (currentView === 'week') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        }

        setCurrentDate(newDate);
    };

    const getEventColor = (type: EventType): string => {
        const colors: Partial<Record<EventType, string>> = {
            meeting: 'bg-blue-500',
            work: 'bg-emerald-500',
            break: 'bg-amber-500',
            admin: 'bg-gray-500',
            focus: 'bg-purple-500',
            client_call: 'bg-indigo-500',
            project_review: 'bg-cyan-500',
            invoice_prep: 'bg-green-500',
            proposal_work: 'bg-rose-500'
        };
        return colors[type] || 'bg-gray-500';
    };

    // Obtener icono del evento según tipo
    const getEventIcon = (type: EventType) => {
        const icons: Partial<Record<EventType, any>> = {
            meeting: Users,
            work: Briefcase,
            break: Clock,
            admin: Target,
            focus: Zap,
            client_call: Users,
            project_review: CheckCircle,
            invoice_prep: DollarSign,
            proposal_work: Star
        };
        return icons[type] || Briefcase;
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    // Generar horas del día para la vista
    const generateTimeSlots = () => {
        const slots = [];
        for (let hour = 6; hour <= 22; hour++) {
            slots.push({
                time: `${hour.toString().padStart(2, '0')}:00`,
                hour: hour
            });
        }
        return slots;
    };

    // Filtrar eventos por fecha actual y vista
    const getEventsForCurrentView = () => {
        const startOfDay = new Date(currentDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);

        if (currentView === 'week') {
            const startOfWeek = new Date(startOfDay);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
            startOfWeek.setDate(diff);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23, 59, 59, 999);

            return events.filter((event: ExtendedCalendarEvent) => {
                const eventDate = new Date(event.start_time);
                return eventDate >= startOfWeek && eventDate <= endOfWeek;
            });
        }

        return events.filter((event: ExtendedCalendarEvent) => {
            const eventDate = new Date(event.start_time);
            return eventDate >= startOfDay && eventDate <= endOfDay;
        });
    };

    return (
        <div className={"min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800"}>
            {/* Premium Silicon Valley Background */}
            <div className="fixed inset-0 z-0">
                <div className={"bg-white dark:bg-slate-900"} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(99,102,241,0.08),transparent_50%)] dark:bg-[radial-gradient(circle_at_25%_25%,rgba(99,102,241,0.04),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(139,92,246,0.06),transparent_50%)] dark:bg-[radial-gradient(circle_at_75%_75%,rgba(139,92,246,0.03),transparent_50%)]" />
                <div className="absolute inset-0 bg-grid-slate-900/[0.02] dark:bg-grid-slate-100/[0.02] bg-[size:32px_32px]" />
            </div>

            <div className="relative z-10 flex h-screen">
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />

                <div className="flex flex-col flex-1 ml-56">
                    <Header userEmail={userEmail} onLogout={handleLogout} />
                    <div className="flex-1 overflow-auto">
                        <div className="p-4">
                            {/* Trial Banner */}
                            <div className="mb-4">
                                <TrialBanner userEmail={userEmail} />
                            </div>

                            {/* Header del Calendario */}
                            <div className={"p-4 shadow-xl mb-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm"}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                            <CalendarIcon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h1 className="text-2xl font-black bg-gradient-to-r from-slate-900 via-indigo-900 to-violet-900 dark:from-slate-100 dark:via-indigo-200 dark:to-violet-200 bg-clip-text text-transparent">
                                                Calendario Inteligente
                                            </h1>
                                            <p className={"text-sm text-slate-500 dark:text-slate-500"}>Gestiona tu tiempo como un pro</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Exportar eventos */}
                                        <Button
                                            onClick={exportEventsToCSV}
                                            variant="outline"
                                            className="border-emerald-200 hover:bg-emerald-50 text-emerald-700 h-9 px-3"
                                            disabled={events.length === 0}
                                            title="Exportar eventos a CSV"
                                        >
                                            <Calculator className="w-4 h-4 mr-2" />
                                            Exportar
                                        </Button>

                                        {/* Panel de IA Toggle */}
                                        <Button
                                            onClick={() => setShowAIPanel(!showAIPanel)}
                                            variant="outline"
                                            className="border-slate-200 hover:bg-indigo-50 text-slate-700 h-9 px-3"
                                        >
                                            <Brain className="w-4 h-4 mr-2" />
                                            {showAIPanel ? 'Ocultar IA' : 'Mostrar IA'}
                                        </Button>

                                        {/* Generar Insights */}
                                        <Button
                                            onClick={generateAIInsights}
                                            disabled={aiLoading}
                                            variant="outline"
                                            className="border-purple-200 hover:bg-purple-50 text-purple-700 h-9 px-3"
                                            title={lastInsightsUpdate ? `Última actualización: ${lastInsightsUpdate.toLocaleTimeString()}` : 'Generar insights actualizados'}
                                        >
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            {aiLoading ? 'Actualizando...' : 'Actualizar Insights'}
                                        </Button>

                                        <Button
                                            onClick={handleNewEventClick}
                                            disabled={trialLoading || !canUseFeatures}
                                            className={`bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white border-0 h-9 px-4 text-sm font-semibold rounded-lg shadow-lg shadow-indigo-500/25 ${trialLoading
                                                    ? 'opacity-75 cursor-wait'
                                                    : !canUseFeatures
                                                        ? 'opacity-50 cursor-not-allowed !bg-gray-400 hover:!bg-gray-400 !shadow-gray-400/25'
                                                        : ''
                                                }`}
                                        >
                                            {trialLoading ? (
                                                <>
                                                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                    Cargando...
                                                </>
                                            ) : !canUseFeatures ? (
                                                <>
                                                    <AlertTriangle className="w-4 h-4 mr-2" />
                                                    Trial Expirado
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Nuevo Evento
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {/* Controles de Navegación */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigateDate('prev')}
                                            className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>

                                        <h2 className="text-lg font-bold text-slate-900 min-w-[200px]">
                                            {formatDateForView(currentDate)}
                                        </h2>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => navigateDate('next')}
                                            className="h-8 w-8 p-0 hover:bg-slate-100 rounded-lg"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCurrentDate(new Date())}
                                            className="h-8 px-3 text-xs font-semibold hover:bg-slate-100 rounded-lg"
                                        >
                                            Hoy
                                        </Button>
                                    </div>

                                    {/* View Switcher */}
                                    <div className="flex bg-slate-100 rounded-lg p-1">
                                        {(['day', 'week', 'month'] as ViewType[]).map((view) => (
                                            <Button
                                                key={view}
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setCurrentView(view)}
                                                className={`h-7 px-3 text-xs font-semibold rounded-md transition-all duration-200 ${currentView === view
                                                        ? 'bg-white text-indigo-600 shadow-sm'
                                                        : 'text-slate-600 hover:text-slate-900'
                                                    }`}
                                            >
                                                {view === 'day' ? 'Día' : view === 'week' ? 'Semana' : 'Mes'}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Vista del Calendario */}
                            {currentView === 'week' && (
                                <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/60 rounded-xl shadow-xl shadow-slate-900/5 overflow-hidden">
                                    {/* Header de la semana */}
                                    <div className="grid grid-cols-8 border-b border-slate-200">
                                        <div className="p-3 bg-slate-50 text-xs font-semibold text-slate-600">
                                            Hora
                                        </div>
                                        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, index) => (
                                            <div key={day} className="p-3 bg-slate-50 text-center">
                                                <div className="text-xs font-semibold text-slate-600">{day}</div>
                                                <div className="text-sm font-bold text-slate-900 mt-1">
                                                    {new Date(currentDate.getFullYear(), currentDate.getMonth(),
                                                        currentDate.getDate() - currentDate.getDay() + 1 + index).getDate()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Time slots */}
                                    <div className="max-h-96 overflow-y-auto">
                                        {generateTimeSlots().map((slot) => (
                                            <div key={slot.time} className="grid grid-cols-8 border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                <div className="p-2 text-xs text-slate-500 font-medium border-r border-slate-200">
                                                    {slot.time}
                                                </div>
                                                {[0, 1, 2, 3, 4, 5, 6].map((dayOffset) => (
                                                    <div key={dayOffset} className="p-2 min-h-[50px] border-r border-slate-100 relative">
                                                        {/* Aquí irían los eventos para cada día */}
                                                        {getEventsForCurrentView()
                                                            .filter(event => {
                                                                const eventDate = new Date(event.start_time);
                                                                const slotDate = new Date(currentDate.getFullYear(), currentDate.getMonth(),
                                                                    currentDate.getDate() - currentDate.getDay() + 1 + dayOffset);
                                                                return eventDate.toDateString() === slotDate.toDateString() &&
                                                                    eventDate.getHours() === slot.hour;
                                                            })
                                                            .map(event => {
                                                                const EventIcon = getEventIcon(event.type);
                                                                return (
                                                                    <div
                                                                        key={event.id}
                                                                        className={`${getEventColor(event.type)} text-white text-xs p-1 rounded mb-1 cursor-pointer hover:opacity-80 transition-opacity`}
                                                                        onClick={() => setSelectedEvent(event)}
                                                                    >
                                                                        <div className="flex items-center gap-1">
                                                                            <EventIcon className="w-3 h-3" />
                                                                            <span className="truncate font-medium">{event.title}</span>
                                                                            {event.status === 'in_progress' && (
                                                                                <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse ml-auto"></div>
                                                                            )}
                                                                            {event.status === 'completed' && (
                                                                                <CheckCircle className="w-3 h-3 ml-auto" />
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quick Stats - Datos Reales */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                                {(() => {
                                    const stats = getCalendarStats();
                                    const todayHours = getEventsForCurrentView().reduce((sum, event) => {
                                        const duration = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60 * 60);
                                        return sum + duration;
                                    }, 0);

                                    const todayRevenue = getEventsForCurrentView()
                                        .filter(e => e.is_billable)
                                        .reduce((sum, event) => {
                                            const duration = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60 * 60);
                                            return sum + (duration * (event.hourly_rate || 0));
                                        }, 0);

                                    const todayMeetings = getEventsForCurrentView().filter(e =>
                                        e.type === 'meeting' || e.type === 'client_call'
                                    ).length;

                                    const completionRate = stats.totalEvents > 0
                                        ? Math.round((stats.completedEvents / stats.totalEvents) * 100)
                                        : 0;

                                    return (
                                        <>
                                            <Card className="bg-white/95 backdrop-blur-2xl border-slate-200/60 shadow-lg">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                                            <Clock className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-2xl font-black text-emerald-700">
                                                                {todayHours.toFixed(1)}h
                                                            </p>
                                                            <p className="text-xs text-slate-600 font-medium">Hoy planificadas</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-white/95 backdrop-blur-2xl border-slate-200/60 shadow-lg">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                                                            <DollarSign className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-2xl font-black text-blue-700">
                                                                €{todayRevenue.toFixed(0)}
                                                            </p>
                                                            <p className="text-xs text-slate-600 font-medium">Ingresos hoy</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-white/95 backdrop-blur-2xl border-slate-200/60 shadow-lg">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                                                            <Users className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-2xl font-black text-purple-700">{todayMeetings}</p>
                                                            <p className="text-xs text-slate-600 font-medium">Reuniones</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>

                                            <Card className="bg-white/95 backdrop-blur-2xl border-slate-200/60 shadow-lg">
                                                <CardContent className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                                                            <Timer className="w-4 h-4 text-white" />
                                                        </div>
                                                        <div>
                                                            <p className="text-2xl font-black text-amber-700">{completionRate}%</p>
                                                            <p className="text-xs text-slate-600 font-medium">Completado</p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Lista de Eventos de Hoy */}
                            <Card className="bg-white/95 backdrop-blur-2xl border-slate-200/60 shadow-xl shadow-slate-900/5 mt-4">
                                <CardHeader className="p-4 border-b border-slate-100">
                                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Target className="w-5 h-5 text-indigo-600" />
                                        Eventos de Hoy
                                    </CardTitle>
                                    <CardDescription className="text-sm text-slate-600">
                                        Gestiona tu agenda y tiempo de manera inteligente
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-4">
                                    {loading ? (
                                        <div className="flex justify-center py-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></div>
                                                <span className="text-slate-700 font-medium">Cargando eventos...</span>
                                            </div>
                                        </div>
                                    ) : getEventsForCurrentView().length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                                <CalendarIcon className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <p className="text-slate-500 font-medium">No hay eventos programados</p>
                                            <p className="text-slate-400 text-sm">Crea tu primer evento para comenzar</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {getEventsForCurrentView().map((event) => {
                                                const EventIcon = getEventIcon(event.type);
                                                const startTime = new Date(event.start_time);
                                                const endTime = new Date(event.end_time);

                                                return (
                                                    <div
                                                        key={event.id}
                                                        className="flex items-center gap-4 p-4 rounded-xl border border-slate-200/60 bg-white/80 hover:bg-white hover:shadow-lg hover:shadow-slate-900/5 transition-all duration-200 group backdrop-blur-sm cursor-pointer"
                                                        onClick={() => setSelectedEvent(event)}
                                                    >
                                                        <div className={`w-12 h-12 ${getEventColor(event.type)} rounded-xl flex items-center justify-center shadow-lg`}>
                                                            <EventIcon className="w-6 h-6 text-white" />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="font-bold text-slate-900 truncate text-lg">{event.title}</h3>
                                                                {false && ( // Placeholder for AI suggested events
                                                                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                                        <Sparkles className="w-3 h-3" />
                                                                        IA
                                                                    </span>
                                                                )}
                                                                {event.is_billable && (
                                                                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                                                                        €{event.hourly_rate}/h
                                                                    </span>
                                                                )}
                                                                {event.status === 'in_progress' && (
                                                                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                                        En progreso
                                                                    </span>
                                                                )}
                                                                {event.status === 'completed' && (
                                                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                                                        <CheckCircle className="w-3 h-3" />
                                                                        Completado
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Información de CRM */}
                                                            <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                                                                <span className="font-semibold text-slate-900">
                                                                    {startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} -
                                                                    {endTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>

                                                                {/* Cliente asociado */}
                                                                {event.clients && (
                                                                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-lg text-xs font-medium">
                                                                        <Users className="w-3 h-3" />
                                                                        {event.clients.name} {event.clients.company && `(${event.clients.company})`}
                                                                    </span>
                                                                )}

                                                                {/* Proyecto asociado */}
                                                                {event.projects && (
                                                                    <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg text-xs font-medium">
                                                                        <Briefcase className="w-3 h-3" />
                                                                        {event.projects.name}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex items-center gap-4 text-sm text-slate-600">
                                                                {event.location && (
                                                                    <span className="flex items-center gap-1">
                                                                        <MapPin className="w-3 h-3" />
                                                                        {event.location}
                                                                    </span>
                                                                )}
                                                                {event.meeting_url && (
                                                                    <span className="flex items-center gap-1">
                                                                        <Video className="w-3 h-3" />
                                                                        Online
                                                                    </span>
                                                                )}
                                                                {event.is_billable && event.hourly_rate && (
                                                                    <span className="flex items-center gap-1 text-green-600 font-medium">
                                                                        <DollarSign className="w-3 h-3" />
                                                                        €{event.hourly_rate}/h
                                                                    </span>
                                                                )}
                                                                {event.productivity_score && (
                                                                    <span className="flex items-center gap-1 text-purple-600 font-medium">
                                                                        <BarChart3 className="w-3 h-3" />
                                                                        {event.productivity_score}/10
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {/* Time Tracking */}
                                                            {event.status === 'completed' ? (
                                                                <div className="h-9 w-9 p-0 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                                                                    <CheckCircle className="w-4 h-4" />
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    title={activeTracking === event.id ? 'Parar time tracking' : 'Iniciar time tracking'}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation(); // Evitar que se active el click del div padre
                                                                        toggleTimeTracking(event.id);
                                                                    }}
                                                                    className={`h-9 w-9 p-0 rounded-lg transition-all duration-200 ${activeTracking === event.id
                                                                            ? 'bg-red-100 text-red-600 hover:bg-red-200 shadow-lg shadow-red-100'
                                                                            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                                                                        }`}
                                                                >
                                                                    {activeTracking === event.id ? (
                                                                        <Square className="w-4 h-4" />
                                                                    ) : (
                                                                        <Play className="w-4 h-4" />
                                                                    )}
                                                                </Button>
                                                            )}

                                                            {/* Ver detalles */}
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // Evitar que se active el click del div padre
                                                                    setSelectedEvent(event);
                                                                }}
                                                                className="h-9 w-9 p-0 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Panel de IA Dashboard */}
                            {showAIPanel && (
                                <div className="grid lg:grid-cols-3 gap-4 mb-6">
                                    {/* Métricas de Productividad */}
                                    <Card className="bg-gradient-to-br from-white/95 to-indigo-50/30 backdrop-blur-2xl border border-indigo-200/60 shadow-xl shadow-indigo-500/10">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center gap-2">
                                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                                <CardTitle className="text-lg font-bold text-slate-900">Productividad Hoy</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            {dashboardMetrics && (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">Eventos completados</span>
                                                        <span className="font-bold text-indigo-600">{dashboardMetrics.completed_today}/{dashboardMetrics.events_today}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">Horas facturables</span>
                                                        <span className="font-bold text-emerald-600">{dashboardMetrics.billable_hours_today}h</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm text-slate-600">Ingresos hoy</span>
                                                        <span className="font-bold text-green-600">€{dashboardMetrics.revenue_today}</span>
                                                    </div>
                                                    <div className="w-full bg-slate-200 rounded-full h-2 mt-3">
                                                        <div
                                                            className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${Math.min(100, (dashboardMetrics.completed_today / Math.max(dashboardMetrics.events_today, 1)) * 100)}%`
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Insights de IA */}
                                    <Card className="bg-gradient-to-br from-white/95 to-purple-50/30 backdrop-blur-2xl border border-purple-200/60 shadow-xl shadow-purple-500/10">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Brain className="w-5 h-5 text-purple-600" />
                                                    <CardTitle className="text-lg font-bold text-slate-900">Insights IA</CardTitle>
                                                </div>
                                                {lastInsightsUpdate && (
                                                    <span className="text-xs text-slate-500">
                                                        Actualizado: {lastInsightsUpdate.toLocaleTimeString()}
                                                    </span>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3 max-h-32 overflow-y-auto">
                                                {aiInsights.length > 0 ? (
                                                    aiInsights.slice(0, 3).map((insight) => (
                                                        <div key={insight.id} className="border-l-4 border-purple-500 pl-3 py-2">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <h4 className="text-sm font-semibold text-slate-900">{insight.title}</h4>
                                                                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{insight.description}</p>
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                                                                            {Math.round(insight.confidence_score * 100)}% confianza
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => markInsightAsViewed(insight.id)}
                                                                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                                                                >
                                                                    <Eye className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-4">
                                                        <Lightbulb className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                        <p className="text-sm text-slate-500">No hay insights nuevos</p>
                                                        <Button
                                                            onClick={generateAIInsights}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="mt-2 text-purple-600 hover:text-purple-700"
                                                        >
                                                            Generar insights
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Sugerencias Inteligentes */}
                                    <Card className="bg-gradient-to-br from-white/95 to-emerald-50/30 backdrop-blur-2xl border border-emerald-200/60 shadow-xl shadow-emerald-500/10">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center gap-2">
                                                <Lightbulb className="w-5 h-5 text-emerald-600" />
                                                <CardTitle className="text-lg font-bold text-slate-900">Sugerencias</CardTitle>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3 max-h-32 overflow-y-auto">
                                                {smartSuggestions.length > 0 ? (
                                                    smartSuggestions.slice(0, 2).map((suggestion, index) => (
                                                        <div key={index} className="border-l-4 border-emerald-500 pl-3 py-2">
                                                            <h4 className="text-sm font-semibold text-slate-900">{suggestion.title}</h4>
                                                            <p className="text-xs text-slate-600 mt-1">{suggestion.description}</p>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                                                    {Math.round(suggestion.confidence * 100)}% confianza
                                                                </span>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 px-2 text-xs text-emerald-600 hover:text-emerald-700"
                                                                >
                                                                    Aplicar
                                                                    <ArrowRight className="w-3 h-3 ml-1" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-4">
                                                        <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                                        <p className="text-sm text-slate-500">No hay sugerencias</p>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal para nuevo evento - CRM & IA Integrado */}
            {showNewEventForm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Crear Evento Inteligente</h3>
                                    <p className="text-sm text-slate-600">Integrado con CRM y recomendaciones de IA</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => setShowNewEventForm(false)}
                                className="h-8 w-8 p-0"
                            >
                                ✕
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Formulario Principal */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Información Básica */}
                                <Card className="border-slate-200">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4" />
                                            Información del Evento
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 mb-2 block">Título del Evento</label>
                                            <Input
                                                value={newEvent.title}
                                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                                placeholder="ej. Reunión con cliente, Desarrollo de feature..."
                                                className="w-full"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 mb-2 block">Descripción</label>
                                            <textarea
                                                value={newEvent.description}
                                                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                                placeholder="Detalles del evento, agenda, objetivos..."
                                                className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-20"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Fecha y Hora de Inicio</label>
                                                <CustomDatePicker
                                                    selected={newEvent.start_time ? new Date(newEvent.start_time) : null}
                                                    onChange={(date) => {
                                                        if (date) {
                                                            // Formatear la fecha para mantener la hora local seleccionada
                                                            const year = date.getFullYear();
                                                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                                            const day = date.getDate().toString().padStart(2, '0');
                                                            const hours = date.getHours().toString().padStart(2, '0');
                                                            const minutes = date.getMinutes().toString().padStart(2, '0');
                                                            const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

                                                            setNewEvent({
                                                                ...newEvent,
                                                                start_time: localDateTime
                                                            });
                                                        } else {
                                                            setNewEvent({
                                                                ...newEvent,
                                                                start_time: ''
                                                            });
                                                        }
                                                    }}
                                                    showTimeSelect
                                                    dateFormat="dd/MM/yyyy HH:mm"
                                                    timeFormat="HH:mm"
                                                    placeholderText="Seleccionar fecha y hora de inicio"
                                                    className="w-full"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Fecha y Hora de Fin</label>
                                                <CustomDatePicker
                                                    selected={newEvent.end_time ? new Date(newEvent.end_time) : null}
                                                    onChange={(date) => {
                                                        if (date) {
                                                            // Formatear la fecha para mantener la hora local seleccionada
                                                            const year = date.getFullYear();
                                                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                                            const day = date.getDate().toString().padStart(2, '0');
                                                            const hours = date.getHours().toString().padStart(2, '0');
                                                            const minutes = date.getMinutes().toString().padStart(2, '0');
                                                            const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

                                                            setNewEvent({
                                                                ...newEvent,
                                                                end_time: localDateTime
                                                            });
                                                        } else {
                                                            setNewEvent({
                                                                ...newEvent,
                                                                end_time: ''
                                                            });
                                                        }
                                                    }}
                                                    showTimeSelect
                                                    dateFormat="dd/MM/yyyy HH:mm"
                                                    timeFormat="HH:mm"
                                                    placeholderText="Seleccionar fecha y hora de fin"
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Tipo de Evento</label>
                                                <select
                                                    value={newEvent.type}
                                                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as EventType })}
                                                    className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                                                >
                                                    <option value="work">💼 Trabajo</option>
                                                    <option value="meeting">🤝 Reunión</option>
                                                    <option value="client_call">📞 Llamada con Cliente</option>
                                                    <option value="project_review">📋 Revisión de Proyecto</option>
                                                    <option value="invoice_prep">💰 Preparación de Factura</option>
                                                    <option value="proposal_work">📄 Trabajo en Propuesta</option>
                                                    <option value="focus">🎯 Tiempo de Focus</option>
                                                    <option value="admin">⚙️ Administrativo</option>
                                                    <option value="break">☕ Descanso</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Ubicación</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                    <Input
                                                        value={newEvent.location}
                                                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                                        placeholder="Oficina, Casa, Remoto..."
                                                        className="pl-10"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 mb-2 block">URL de Reunión (Opcional)</label>
                                            <div className="relative">
                                                <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    value={newEvent.meeting_url}
                                                    onChange={(e) => setNewEvent({ ...newEvent, meeting_url: e.target.value })}
                                                    placeholder="https://meet.google.com/..."
                                                    className="pl-10"
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Integración CRM */}
                                <Card className="border-blue-200 bg-blue-50/30">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-blue-600" />
                                            Integración CRM
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Cliente</label>
                                                <select
                                                    value={newEvent.client_id}
                                                    onChange={(e) => setNewEvent({ ...newEvent, client_id: e.target.value, project_id: '' })}
                                                    className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                                                >
                                                    <option value="">Seleccionar cliente...</option>
                                                    {clients.map((client) => (
                                                        <option key={client.id} value={client.id}>
                                                            {client.company ? `🏢 ${client.company}` : `👤 ${client.name}`}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-sm font-semibold text-slate-700 mb-2 block">Proyecto</label>
                                                <select
                                                    value={newEvent.project_id}
                                                    onChange={(e) => setNewEvent({ ...newEvent, project_id: e.target.value })}
                                                    className="w-full p-3 border border-slate-200 rounded-lg text-sm"
                                                    disabled={!newEvent.client_id}
                                                >
                                                    <option value="">Seleccionar proyecto...</option>
                                                    {filteredProjects.map((project) => (
                                                        <option key={project.id} value={project.id}>
                                                            📁 {project.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {newEvent.client_id && (
                                            <div className="p-3 bg-blue-100 rounded-lg border border-blue-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Users className="w-4 h-4 text-blue-600" />
                                                    <span className="text-sm font-semibold text-blue-800">Información del Cliente</span>
                                                </div>
                                                {(() => {
                                                    const selectedClient = clients.find(c => c.id === newEvent.client_id);
                                                    const clientProjects = projects.filter(p => p.client_id === newEvent.client_id);
                                                    const totalBudget = clientProjects.reduce((sum, p) => sum + (p.budget || 0), 0);

                                                    return selectedClient ? (
                                                        <div className="text-xs text-blue-700 space-y-1">
                                                            <div>� {selectedClient.name}</div>
                                                            {selectedClient.email && <div>📧 {selectedClient.email}</div>}
                                                            {selectedClient.phone && <div>� {selectedClient.phone}</div>}
                                                            <div>� {clientProjects.length} proyecto(s)</div>
                                                            <div>💰 Presupuesto total: €{totalBudget.toLocaleString()}</div>
                                                        </div>
                                                    ) : null;
                                                })()}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Configuración de Facturación */}
                                {newEvent.type !== 'break' && (
                                    <Card className="border-emerald-200 bg-emerald-50/30">
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-emerald-600" />
                                                Configuración de Facturación
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center gap-4">
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={newEvent.is_billable}
                                                        onChange={(e) => setNewEvent({ ...newEvent, is_billable: e.target.checked })}
                                                        className="rounded w-4 h-4"
                                                    />
                                                    <span className="text-sm font-medium text-slate-700">Tiempo Facturable</span>
                                                </label>
                                                {newEvent.is_billable && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-slate-600">Tarifa:</span>
                                                        <Input
                                                            type="number"
                                                            value={newEvent.hourly_rate}
                                                            onChange={(e) => setNewEvent({ ...newEvent, hourly_rate: Number(e.target.value) })}
                                                            className="w-16"
                                                        />
                                                        <span className="text-sm text-slate-600">€/hora</span>
                                                    </div>
                                                )}
                                            </div>

                                            {newEvent.is_billable && newEvent.start_time && newEvent.end_time && (
                                                <div className="p-3 bg-emerald-100 rounded-lg border border-emerald-200">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Calculator className="w-4 h-4 text-emerald-600" />
                                                        <span className="text-sm font-semibold text-emerald-800">Estimación de Ingresos</span>
                                                    </div>
                                                    <div className="text-xs text-emerald-700 space-y-1">
                                                        <div>⏱️ Duración: {
                                                            Math.round((new Date(newEvent.end_time).getTime() - new Date(newEvent.start_time).getTime()) / (1000 * 60))
                                                        } minutos</div>
                                                        <div>💰 Ingresos estimados: €{
                                                            ((new Date(newEvent.end_time).getTime() - new Date(newEvent.start_time).getTime()) / (1000 * 60 * 60) * newEvent.hourly_rate).toFixed(2)
                                                        }</div>
                                                        <div>📊 Ingresos mensuales proyectados: €{
                                                            (((new Date(newEvent.end_time).getTime() - new Date(newEvent.start_time).getTime()) / (1000 * 60 * 60) * newEvent.hourly_rate) * 20).toFixed(0)
                                                        }</div>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>

                            {/* Panel de IA y Sugerencias */}
                            <div className="space-y-4">
                                {/* Sugerencias de IA */}
                                <Card className="border-violet-200 bg-violet-50/30">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Brain className="w-4 h-4 text-violet-600" />
                                            Sugerencias de IA
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="space-y-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-start text-left p-3 h-auto border border-violet-200 hover:bg-violet-100 overflow-hidden"
                                                onClick={() => {
                                                    const now = new Date();
                                                    const optimal = new Date(now);
                                                    optimal.setHours(10, 0, 0, 0); // 10 AM
                                                    const end = new Date(optimal.getTime() + 2 * 60 * 60 * 1000); // +2h
                                                    setNewEvent({
                                                        ...newEvent,
                                                        start_time: optimal.toISOString().slice(0, 16),
                                                        end_time: end.toISOString().slice(0, 16)
                                                    });
                                                }}
                                            >
                                                <div className="space-y-1 w-full min-w-0">
                                                    <div className="font-medium text-violet-800 truncate">🎯 Hora Óptima</div>
                                                    <div className="text-xs text-violet-600 truncate">10:00 AM - Mejor momento</div>
                                                    <div className="text-xs text-violet-500 truncate">Confianza: 92%</div>
                                                </div>
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-start text-left p-3 h-auto border border-amber-200 hover:bg-amber-100 overflow-hidden"
                                                onClick={() => {
                                                    setNewEvent({
                                                        ...newEvent,
                                                        title: 'Revisión de Proyecto - TechCorp',
                                                        client_id: 'client-1',
                                                        project_id: 'proj-1',
                                                        type: 'project_review',
                                                        is_billable: true,
                                                        hourly_rate: 75
                                                    });
                                                }}
                                            >
                                                <div className="space-y-1 w-full min-w-0">
                                                    <div className="font-medium text-amber-800 truncate">📋 Auto-completar</div>
                                                    <div className="text-xs text-amber-600 truncate">Basado en patrones anteriores</div>
                                                    <div className="text-xs text-amber-500 truncate">Confianza: 88%</div>
                                                </div>
                                            </Button>

                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-start text-left p-3 h-auto border border-blue-200 hover:bg-blue-100 overflow-hidden"
                                                onClick={() => {
                                                    const now = new Date();
                                                    const breakTime = new Date(now.getTime() + 90 * 60 * 1000); // +1.5h
                                                    const breakEnd = new Date(breakTime.getTime() + 15 * 60 * 1000); // +15min
                                                    setNewEvent({
                                                        ...newEvent,
                                                        title: 'Descanso Recomendado',
                                                        type: 'break',
                                                        start_time: breakTime.toISOString().slice(0, 16),
                                                        end_time: breakEnd.toISOString().slice(0, 16),
                                                        is_billable: false
                                                    });
                                                }}
                                            >
                                                <div className="space-y-1 w-full min-w-0">
                                                    <div className="font-medium text-blue-800 truncate">☕ Break Sugerido</div>
                                                    <div className="text-xs text-blue-600 truncate">Basado en tu patrón de trabajo</div>
                                                    <div className="text-xs text-blue-500 truncate">En 90 minutos</div>
                                                </div>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Quick Actions */}
                                <Card className="border-slate-200">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Zap className="w-4 h-4 text-amber-500" />
                                            Acciones Rápidas
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    const now = new Date();
                                                    const endTime = new Date(now.getTime() + 60 * 60 * 1000);
                                                    setNewEvent({
                                                        ...newEvent,
                                                        title: 'Focus Time',
                                                        type: 'focus',
                                                        start_time: now.toISOString().slice(0, 16),
                                                        end_time: endTime.toISOString().slice(0, 16),
                                                        is_billable: true
                                                    });
                                                }}
                                                className="text-xs h-8 border border-indigo-200 hover:bg-indigo-50"
                                            >
                                                🎯 Focus
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    const now = new Date();
                                                    const endTime = new Date(now.getTime() + 30 * 60 * 1000);
                                                    setNewEvent({
                                                        ...newEvent,
                                                        title: 'Reunión Rápida',
                                                        type: 'meeting',
                                                        start_time: now.toISOString().slice(0, 16),
                                                        end_time: endTime.toISOString().slice(0, 16),
                                                        is_billable: false
                                                    });
                                                }}
                                                className="text-xs h-8 border border-blue-200 hover:bg-blue-50"
                                            >
                                                🤝 Meeting
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setNewEvent({
                                                        ...newEvent,
                                                        type: 'client_call',
                                                        is_billable: true,
                                                        hourly_rate: 85
                                                    });
                                                }}
                                                className="text-xs h-8 border border-emerald-200 hover:bg-emerald-50"
                                            >
                                                📞 Call
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setNewEvent({
                                                        ...newEvent,
                                                        type: 'invoice_prep',
                                                        is_billable: false,
                                                        title: 'Preparar Facturas'
                                                    });
                                                }}
                                                className="text-xs h-8 border border-amber-200 hover:bg-amber-50"
                                            >
                                                💰 Invoice
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Insights y Analytics */}
                                <Card className="border-slate-200">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <BarChart3 className="w-4 h-4 text-emerald-500" />
                                            Insights del Día
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {dashboardMetrics ? (
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Eventos hoy:</span>
                                                    <span className="font-semibold">{dashboardMetrics.completed_today}/{dashboardMetrics.events_today}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Tiempo facturable:</span>
                                                    <span className="font-semibold text-emerald-600">{dashboardMetrics.billable_hours_today}h</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Ingresos estimados:</span>
                                                    <span className="font-semibold text-green-600">€{dashboardMetrics.revenue_today}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Productividad:</span>
                                                    <span className="font-semibold text-indigo-600">{Math.round((dashboardMetrics.completed_today / Math.max(dashboardMetrics.events_today, 1)) * 100)}%</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-2 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Eventos hoy:</span>
                                                    <span className="font-semibold animate-pulse bg-slate-200 rounded px-2">---</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Tiempo facturable:</span>
                                                    <span className="font-semibold text-emerald-600 animate-pulse bg-slate-200 rounded px-2">---</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Ingresos estimados:</span>
                                                    <span className="font-semibold text-green-600 animate-pulse bg-slate-200 rounded px-2">---</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-600">Productividad:</span>
                                                    <span className="font-semibold text-indigo-600 animate-pulse bg-slate-200 rounded px-2">---</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="w-full bg-slate-200 rounded-full h-2">
                                            {dashboardMetrics ? (
                                                <div
                                                    className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.min(100, (dashboardMetrics.completed_today / Math.max(dashboardMetrics.events_today, 1)) * 100)}%`
                                                    }}
                                                />
                                            ) : (
                                                <div className="bg-gradient-to-r from-slate-300 to-slate-400 h-2 rounded-full w-1/4 animate-pulse" />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
                            <Button
                                variant="ghost"
                                onClick={() => setShowNewEventForm(false)}
                                className="flex-1"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={autoScheduleEvent}
                                variant="outline"
                                className="flex-1 border-violet-200 text-violet-700 hover:bg-violet-50"
                                disabled={aiLoading}
                            >
                                <Brain className="w-4 h-4 mr-2" />
                                {aiLoading ? 'Analizando...' : 'Auto-Programar'}
                            </Button>
                            <Button
                                onClick={createEvent}
                                className="flex-1 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Crear Evento
                            </Button>
                        </div>

                        {/* Analytics Section - Silicon Valley Style */}
                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Productivity Analytics */}
                            <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/60 rounded-xl p-4 shadow-lg shadow-slate-900/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                        <Target className="w-3 h-3 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900">Productividad Hoy</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Eventos completados:</span>
                                        <span className="font-semibold">
                                            {getEventsForCurrentView().filter((e: CalendarEvent) => e.status === 'completed').length}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Tiempo activo:</span>
                                        <span className="font-semibold">
                                            {activeTracking ? '🟢 Trabajando' : '⏸️ Pausado'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Facturación hoy:</span>
                                        <span className="font-semibold text-emerald-600">
                                            ${getEventsForCurrentView()
                                                .filter((e: CalendarEvent) => e.is_billable && e.status === 'completed')
                                                .reduce((sum: number, e: CalendarEvent) => {
                                                    const duration = (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / (1000 * 60 * 60);
                                                    return sum + (duration * (e.hourly_rate || 0));
                                                }, 0)
                                                .toFixed(0)
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/60 rounded-xl p-4 shadow-lg shadow-slate-900/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                                        <Zap className="w-3 h-3 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900">Acciones Rápidas</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            const now = new Date();
                                            const endTime = new Date(now.getTime() + 60 * 60 * 1000); // +1 hora
                                            setNewEvent({
                                                ...newEvent,
                                                title: 'Trabajo Enfocado',
                                                type: 'focus',
                                                start_time: now.toISOString().slice(0, 16),
                                                end_time: endTime.toISOString().slice(0, 16),
                                                is_billable: true
                                            });
                                            setShowNewEventForm(true);
                                        }}
                                        className="text-xs h-8 border border-indigo-200 hover:bg-indigo-50"
                                    >
                                        🎯 Focus
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            const now = new Date();
                                            const endTime = new Date(now.getTime() + 30 * 60 * 1000); // +30 min
                                            setNewEvent({
                                                ...newEvent,
                                                title: 'Reunión',
                                                type: 'meeting',
                                                start_time: now.toISOString().slice(0, 16),
                                                end_time: endTime.toISOString().slice(0, 16),
                                                is_billable: false
                                            });
                                            setShowNewEventForm(true);
                                        }}
                                        className="text-xs h-8 border border-blue-200 hover:bg-blue-50"
                                    >
                                        🤝 Reunión
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                            const now = new Date();
                                            const endTime = new Date(now.getTime() + 15 * 60 * 1000); // +15 min
                                            setNewEvent({
                                                ...newEvent,
                                                title: 'Descanso',
                                                type: 'break',
                                                start_time: now.toISOString().slice(0, 16),
                                                end_time: endTime.toISOString().slice(0, 16),
                                                is_billable: false
                                            });
                                            setShowNewEventForm(true);
                                        }}
                                        className="text-xs h-8 border border-amber-200 hover:bg-amber-50"
                                    >
                                        ☕ Break
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setCurrentDate(new Date())}
                                        className="text-xs h-8 border border-emerald-200 hover:bg-emerald-50"
                                    >
                                        📅 Hoy
                                    </Button>
                                </div>
                            </div>

                            {/* Smart Insights */}
                            <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/60 rounded-xl p-4 shadow-lg shadow-slate-900/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center">
                                        <Timer className="w-3 h-3 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900">Insights</h3>
                                </div>
                                <div className="space-y-2 text-sm">
                                    <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                                        <p className="text-indigo-800 font-medium">
                                            💡 Tu mejor hora es entre 10-12 AM
                                        </p>
                                    </div>
                                    <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                        <p className="text-emerald-800 font-medium">
                                            📈 +25% productividad esta semana
                                        </p>
                                    </div>
                                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                                        <p className="text-amber-800 font-medium">
                                            ⏰ Próximo break sugerido en 45min
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Detalles del Evento */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Header del Modal */}
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    {(() => {
                                        const EventIcon = getEventIcon(selectedEvent.type);
                                        return <EventIcon className="w-6 h-6 text-slate-600" />;
                                    })()}
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{selectedEvent.title}</h2>
                                        <p className="text-sm text-slate-600 capitalize">{selectedEvent.type}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setEditingEvent(selectedEvent);
                                            setIsEditMode(true);
                                            setShowEventDetails(true);
                                            setSelectedEvent(null);
                                        }}
                                        className="text-blue-600 hover:bg-blue-50"
                                    >
                                        ✏️ Editar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={async () => {
                                            const confirmed = await showToast.confirm('¿Estás seguro de que quieres eliminar este evento?');
                                            if (confirmed) {
                                                // Configurar el evento a eliminar temporalmente
                                                setEditingEvent(selectedEvent);
                                                deleteEvent();
                                                setSelectedEvent(null);
                                            }
                                        }}
                                        className="text-red-600 hover:bg-red-50"
                                    >
                                        🗑️ Eliminar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedEvent(null)}
                                        className="text-slate-600 hover:bg-slate-50"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </div>

                            {/* Contenido del Evento */}
                            <div className="space-y-4">
                                {/* Información Básica */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-500" />
                                            <span className="text-sm font-medium text-slate-700">Horario</span>
                                        </div>
                                        <div className="text-sm text-slate-600 pl-6">
                                            <div>📅 {new Date(selectedEvent.start_time).toLocaleDateString('es-ES', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}</div>
                                            <div>🕐 {new Date(selectedEvent.start_time).toLocaleTimeString('es-ES', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })} - {new Date(selectedEvent.end_time).toLocaleTimeString('es-ES', {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}</div>
                                            <div>⏱️ Duración: {Math.round((new Date(selectedEvent.end_time).getTime() - new Date(selectedEvent.start_time).getTime()) / (1000 * 60))} minutos</div>
                                        </div>
                                    </div>

                                    {selectedEvent.is_billable && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="w-4 h-4 text-emerald-500" />
                                                <span className="text-sm font-medium text-slate-700">Facturación</span>
                                            </div>
                                            <div className="text-sm text-slate-600 pl-6">
                                                <div>💰 Tarifa: €{selectedEvent.hourly_rate}/hora</div>
                                                <div>💵 Ingresos: €{
                                                    ((new Date(selectedEvent.end_time).getTime() - new Date(selectedEvent.start_time).getTime()) / (1000 * 60 * 60) * (selectedEvent.hourly_rate || 0)).toFixed(2)
                                                }</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Descripción */}
                                {selectedEvent.description && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Eye className="w-4 h-4 text-slate-500" />
                                            <span className="text-sm font-medium text-slate-700">Descripción</span>
                                        </div>
                                        <div className="text-sm text-slate-600 pl-6 p-3 bg-slate-50 rounded-lg">
                                            {selectedEvent.description}
                                        </div>
                                    </div>
                                )}

                                {/* Cliente y Proyecto */}
                                {(selectedEvent.clients || selectedEvent.projects) && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="w-4 h-4 text-slate-500" />
                                            <span className="text-sm font-medium text-slate-700">Información CRM</span>
                                        </div>
                                        <div className="text-sm text-slate-600 pl-6 space-y-2">
                                            {selectedEvent.clients && (
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3 h-3" />
                                                    <span>Cliente: {selectedEvent.clients.name}</span>
                                                    {selectedEvent.clients.company && (
                                                        <span className="text-slate-500">({selectedEvent.clients.company})</span>
                                                    )}
                                                </div>
                                            )}
                                            {selectedEvent.projects && (
                                                <div className="flex items-center gap-2">
                                                    <Target className="w-3 h-3" />
                                                    <span>Proyecto: {selectedEvent.projects.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Ubicación */}
                                {(selectedEvent.location || selectedEvent.meeting_url) && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-slate-500" />
                                            <span className="text-sm font-medium text-slate-700">Ubicación</span>
                                        </div>
                                        <div className="text-sm text-slate-600 pl-6 space-y-2">
                                            {selectedEvent.location && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin className="w-3 h-3" />
                                                    <span>{selectedEvent.location}</span>
                                                </div>
                                            )}
                                            {selectedEvent.meeting_url && (
                                                <div className="flex items-center gap-2">
                                                    <Video className="w-3 h-3" />
                                                    <a
                                                        href={selectedEvent.meeting_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline"
                                                    >
                                                        Unirse a reunión
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Acciones de Time Tracking */}
                                <div className="border-t pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Timer className="w-4 h-4 text-slate-500" />
                                        <span className="text-sm font-medium text-slate-700">Time Tracking</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedEvent.status === 'in_progress' ? (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => stopTimeTracking(selectedEvent.id)}
                                                className="bg-red-50 text-red-600 hover:bg-red-100"
                                            >
                                                <Square className="w-3 h-3 mr-1" />
                                                Parar
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => startTimeTracking(selectedEvent.id)}
                                                className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                            >
                                                <Play className="w-3 h-3 mr-1" />
                                                Iniciar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edición del Evento */}
            {showEventDetails && editingEvent && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Header del Modal de Edición */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-900">
                                    {isEditMode ? 'Editar Evento' : 'Detalles del Evento'}
                                </h2>
                                <div className="flex items-center gap-2">
                                    {!isEditMode ? (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={startEditMode}
                                            className="text-blue-600 hover:bg-blue-50"
                                        >
                                            ✏️ Editar
                                        </Button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={updateEvent}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                💾 Guardar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setIsEditMode(false)}
                                                className="text-slate-600 hover:bg-slate-50"
                                            >
                                                ❌ Cancelar
                                            </Button>
                                        </div>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowEventDetails(false);
                                            setEditingEvent(null);
                                            setIsEditMode(false);
                                        }}
                                        className="text-slate-600 hover:bg-slate-50"
                                    >
                                        ✕
                                    </Button>
                                </div>
                            </div>

                            {/* Formulario de Edición */}
                            {isEditMode ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                                        <Input
                                            value={editingEvent.title}
                                            onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                                            placeholder="Título del evento"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                                        <textarea
                                            value={editingEvent.description || ''}
                                            onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                                            placeholder="Descripción del evento"
                                            className="w-full p-2 border border-slate-300 rounded-lg resize-none"
                                            rows={3}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Inicio</label>
                                            <CustomDatePicker
                                                selected={editingEvent.start_time ? new Date(editingEvent.start_time) : null}
                                                onChange={(date) => {
                                                    if (date) {
                                                        // Formatear la fecha para mantener la hora local seleccionada
                                                        const year = date.getFullYear();
                                                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                                        const day = date.getDate().toString().padStart(2, '0');
                                                        const hours = date.getHours().toString().padStart(2, '0');
                                                        const minutes = date.getMinutes().toString().padStart(2, '0');
                                                        const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

                                                        setEditingEvent({
                                                            ...editingEvent,
                                                            start_time: localDateTime
                                                        });
                                                    } else {
                                                        setEditingEvent({
                                                            ...editingEvent,
                                                            start_time: ''
                                                        });
                                                    }
                                                }}
                                                showTimeSelect
                                                dateFormat="dd/MM/yyyy HH:mm"
                                                timeFormat="HH:mm"
                                                placeholderText="Seleccionar fecha y hora de inicio"
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Fin</label>
                                            <CustomDatePicker
                                                selected={editingEvent.end_time ? new Date(editingEvent.end_time) : null}
                                                onChange={(date) => {
                                                    if (date) {
                                                        // Formatear la fecha para mantener la hora local seleccionada
                                                        const year = date.getFullYear();
                                                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                                                        const day = date.getDate().toString().padStart(2, '0');
                                                        const hours = date.getHours().toString().padStart(2, '0');
                                                        const minutes = date.getMinutes().toString().padStart(2, '0');
                                                        const localDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

                                                        setEditingEvent({
                                                            ...editingEvent,
                                                            end_time: localDateTime
                                                        });
                                                    } else {
                                                        setEditingEvent({
                                                            ...editingEvent,
                                                            end_time: ''
                                                        });
                                                    }
                                                }}
                                                showTimeSelect
                                                dateFormat="dd/MM/yyyy HH:mm"
                                                timeFormat="HH:mm"
                                                placeholderText="Seleccionar fecha y hora de fin"
                                                className="w-full"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                                        <select
                                            value={editingEvent.type}
                                            onChange={(e) => setEditingEvent({ ...editingEvent, type: e.target.value as EventType })}
                                            className="w-full p-2 border border-slate-300 rounded-lg"
                                        >
                                            <option value="work">💼 Trabajo</option>
                                            <option value="meeting">🤝 Reunión</option>
                                            <option value="break">☕ Descanso</option>
                                            <option value="personal">👤 Personal</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={editingEvent.is_billable || false}
                                                onChange={(e) => setEditingEvent({ ...editingEvent, is_billable: e.target.checked })}
                                                className="rounded border-slate-300"
                                            />
                                            <span className="text-sm text-slate-700">Facturable</span>
                                        </label>
                                        {editingEvent.is_billable && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-slate-600">Tarifa:</span>
                                                <Input
                                                    type="number"
                                                    value={editingEvent.hourly_rate || 0}
                                                    onChange={(e) => setEditingEvent({ ...editingEvent, hourly_rate: Number(e.target.value) })}
                                                    className="w-20"
                                                />
                                                <span className="text-sm text-slate-600">€/hora</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Ubicación</label>
                                            <Input
                                                value={editingEvent.location || ''}
                                                onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                                                placeholder="Ubicación física"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">URL de reunión</label>
                                            <Input
                                                value={editingEvent.meeting_url || ''}
                                                onChange={(e) => setEditingEvent({ ...editingEvent, meeting_url: e.target.value })}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                                            <select
                                                value={editingEvent.client_id || ''}
                                                onChange={(e) => {
                                                    setEditingEvent({ ...editingEvent, client_id: e.target.value || undefined });
                                                    // Filter projects when client changes
                                                    if (e.target.value) {
                                                        const clientProjects = projects.filter(p => p.client_id === e.target.value);
                                                        setFilteredProjects(clientProjects);
                                                    } else {
                                                        setFilteredProjects(projects);
                                                    }
                                                }}
                                                className="w-full p-2 border border-slate-300 rounded-lg"
                                            >
                                                <option value="">Sin cliente</option>
                                                {clients.map(client => (
                                                    <option key={client.id} value={client.id}>
                                                        {client.name} {client.company && `(${client.company})`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto</label>
                                            <select
                                                value={editingEvent.project_id || ''}
                                                onChange={(e) => setEditingEvent({ ...editingEvent, project_id: e.target.value || undefined })}
                                                className="w-full p-2 border border-slate-300 rounded-lg"
                                            >
                                                <option value="">Sin proyecto</option>
                                                {filteredProjects.map(project => (
                                                    <option key={project.id} value={project.id}>
                                                        {project.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Vista de solo lectura - similar al primer modal pero con más detalles */
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-slate-500" />
                                                <span className="text-sm font-medium text-slate-700">Horario</span>
                                            </div>
                                            <div className="text-sm text-slate-600 pl-6">
                                                <div>📅 {new Date(editingEvent.start_time).toLocaleDateString('es-ES', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}</div>
                                                <div>🕐 {new Date(editingEvent.start_time).toLocaleTimeString('es-ES', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })} - {new Date(editingEvent.end_time).toLocaleTimeString('es-ES', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t">
                                        <Button
                                            variant="ghost"
                                            onClick={deleteEvent}
                                            className="text-red-600 hover:bg-red-50"
                                        >
                                            🗑️ Eliminar Evento
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
