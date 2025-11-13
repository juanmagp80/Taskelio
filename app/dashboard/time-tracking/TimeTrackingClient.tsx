'use client';

import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { showToast } from '@/utils/toast';
import {
    Clock,
    Play,
    Plus,
    Square,
    Timer
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Tipos
type TimeEntry = {
    id: string;
    description: string;
    start_time: string;
    end_time?: string;
    duration_minutes: number;
    project_id?: string;
    client_id?: string;
    hourly_rate?: number;
    is_billable: boolean;
    created_at: string;
    project?: {
        name: string;
    };
    client?: {
        name: string;
    };
};

type Project = {
    id: string;
    name: string;
    client?: {
        name: string;
    };
};

interface TimeTrackingClientProps {
    userEmail: string;
}

export default function TimeTrackingClient({ userEmail }: TimeTrackingClientProps) {
    const supabase = createSupabaseClient();
    const router = useRouter();

    // Estados
    const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    // Estados del timer
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [currentTime, setCurrentTime] = useState(0); // segundos
    const [timerStartTime, setTimerStartTime] = useState<Date | null>(null);
    const [activeEntry, setActiveEntry] = useState<string | null>(null);

    // Estados del formulario
    const [showManualForm, setShowManualForm] = useState(false);
    const [timerFormData, setTimerFormData] = useState({
        description: '',
        project_id: '',
        hourly_rate: '',
        is_billable: true
    });

    const handleLogout = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Cargar proyectos
    const fetchProjects = async () => {
        if (!supabase) return;
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data, error } = await supabase
                .from('projects')
                .select(`
                    id,
                    name,
                    clients(name)
                `)
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('name');

            if (error) {
                console.error('Error fetching projects:', error);
            } else {
                setProjects(data || []);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Cargar entradas de tiempo
    const fetchTimeEntries = async () => {
        if (!supabase) return;
        try {
            setLoading(true);
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const { data, error } = await supabase
                .from('time_entries')
                .select(`
                    *,
                    projects(name),
                    clients(name)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) {
                console.error('Error fetching time entries:', error);
            } else {
                setTimeEntries(data || []);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    // Iniciar timer
    const startTimer = async () => {
        if (!supabase) return;
        if (!timerFormData.description.trim()) {
            showToast.warning('Por favor añade una descripción');
            return;
        }

        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) return;

            const startTime = new Date();
            const { data, error } = await supabase
                .from('time_entries')
                .insert([{
                    user_id: user.id,
                    description: timerFormData.description,
                    project_id: timerFormData.project_id || null,
                    hourly_rate: timerFormData.hourly_rate ? parseFloat(timerFormData.hourly_rate) : null,
                    is_billable: timerFormData.is_billable,
                    start_time: startTime.toISOString(),
                    duration_minutes: 0
                }])
                .select()
                .single();

            if (error) {
                console.error('Error starting timer:', error);
            } else {
                setIsTimerRunning(true);
                setTimerStartTime(startTime);
                setCurrentTime(0);
                setActiveEntry(data.id);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Detener timer
    const stopTimer = async () => {
        if (!supabase) return;
        if (!activeEntry || !timerStartTime) return;

        try {
            const endTime = new Date();
            const durationMinutes = Math.floor((endTime.getTime() - timerStartTime.getTime()) / (1000 * 60));

            const { error } = await supabase
                .from('time_entries')
                .update({
                    end_time: endTime.toISOString(),
                    duration_minutes: durationMinutes
                })
                .eq('id', activeEntry);

            if (error) {
                console.error('Error stopping timer:', error);
            } else {
                setIsTimerRunning(false);
                setTimerStartTime(null);
                setCurrentTime(0);
                setActiveEntry(null);
                setTimerFormData({
                    description: '',
                    project_id: '',
                    hourly_rate: '',
                    is_billable: true
                });
                fetchTimeEntries();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Formatear tiempo
    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Effect para el timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isTimerRunning && timerStartTime) {
            interval = setInterval(() => {
                const now = new Date();
                const elapsed = Math.floor((now.getTime() - timerStartTime.getTime()) / 1000);
                setCurrentTime(elapsed);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timerStartTime]);

    useEffect(() => {
        fetchProjects();
        fetchTimeEntries();
    }, []);

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex-1 flex flex-col overflow-hidden">
                <Header userEmail={userEmail} onLogout={handleLogout} />
                <div className="flex-1 overflow-auto">
                    <div className="p-6 space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Seguimiento de Tiempo</h1>
                                <p className="text-gray-600 mt-1">Registra y gestiona tu tiempo de trabajo</p>
                            </div>
                        </div>

                        {/* Timer Principal */}
                        <Card className="border-2 border-primary/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Timer className="h-5 w-5" />
                                    Timer Activo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Display del timer */}
                                <div className="text-center">
                                    <div className="text-6xl font-mono font-bold text-primary mb-4">
                                        {formatTime(currentTime)}
                                    </div>
                                    <div className="text-lg text-gray-600">
                                        {isTimerRunning ? 'Tiempo en ejecución' : 'Timer detenido'}
                                    </div>
                                </div>

                                {/* Formulario del timer */}
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="text-sm font-medium">Descripción</label>
                                        <Input
                                            placeholder="¿En qué estás trabajando?"
                                            value={timerFormData.description}
                                            onChange={(e) => setTimerFormData({ ...timerFormData, description: e.target.value })}
                                            disabled={isTimerRunning}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Proyecto (opcional)</label>
                                        <select
                                            className="w-full p-2 border rounded-md"
                                            value={timerFormData.project_id}
                                            onChange={(e) => setTimerFormData({ ...timerFormData, project_id: e.target.value })}
                                            disabled={isTimerRunning}
                                        >
                                            <option value="">Sin proyecto</option>
                                            {projects.map((project) => (
                                                <option key={project.id} value={project.id}>
                                                    {project.name} {project.client?.name ? `- ${project.client.name}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Tarifa por hora (€)</label>
                                        <Input
                                            type="number"
                                            placeholder="50"
                                            value={timerFormData.hourly_rate}
                                            onChange={(e) => setTimerFormData({ ...timerFormData, hourly_rate: e.target.value })}
                                            disabled={isTimerRunning}
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="billable"
                                            checked={timerFormData.is_billable}
                                            onChange={(e) => setTimerFormData({ ...timerFormData, is_billable: e.target.checked })}
                                            disabled={isTimerRunning}
                                        />
                                        <label htmlFor="billable" className="text-sm font-medium">
                                            Tiempo facturable
                                        </label>
                                    </div>
                                </div>

                                {/* Botones del timer */}
                                <div className="flex gap-2 justify-center">
                                    {!isTimerRunning ? (
                                        <Button
                                            onClick={startTimer}
                                            size="lg"
                                            className="bg-green-600 hover:bg-green-700"
                                        >
                                            <Play className="h-5 w-5 mr-2" />
                                            Iniciar Timer
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={stopTimer}
                                            size="lg"
                                            variant="destructive"
                                        >
                                            <Square className="h-5 w-5 mr-2" />
                                            Detener Timer
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Entradas de Tiempo Recientes */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            <Clock className="h-5 w-5" />
                                            Entradas Recientes
                                        </CardTitle>
                                        <CardDescription>
                                            Últimas sesiones de trabajo registradas
                                        </CardDescription>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowManualForm(true)}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Añadir Manualmente
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {loading ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-600">Cargando entradas...</div>
                                    </div>
                                ) : timeEntries.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-gray-600 mb-4">No hay entradas de tiempo aún</div>
                                        <Button onClick={startTimer}>
                                            <Play className="h-4 w-4 mr-2" />
                                            Inicia tu primer timer
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {timeEntries.map((entry) => (
                                            <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                                <div className="flex-1">
                                                    <div className="font-medium">{entry.description}</div>
                                                    <div className="text-sm text-gray-600">
                                                        {entry.project?.name || 'Sin proyecto'}
                                                        {entry.client?.name && ` • ${entry.client.name}`}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(entry.created_at).toLocaleDateString('es-ES')}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono font-bold">
                                                        {Math.floor(entry.duration_minutes / 60)}h {entry.duration_minutes % 60}m
                                                    </div>
                                                    {entry.hourly_rate && entry.is_billable && (
                                                        <div className="text-sm text-green-600">
                                                            €{((entry.duration_minutes / 60) * entry.hourly_rate).toFixed(2)}
                                                        </div>
                                                    )}
                                                    <div className="text-xs text-gray-500">
                                                        {entry.is_billable ? 'Facturable' : 'No facturable'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
