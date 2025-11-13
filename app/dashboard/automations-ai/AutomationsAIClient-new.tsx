'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Sidebar from '@/components/Sidebar';
import { 
  Brain, 
  Mail, 
  BarChart3, 
  Calendar, 
  DollarSign, 
  Users, 
  MessageSquare,
  Sparkles,
  TrendingUp,
  Zap,
  Clock,
  Euro,
  Send,
  CheckCircle
} from 'lucide-react';

interface UsageStats {
  currentMonth: {
    total_cost_usd: number;
    total_requests: number;
    email_cost: number;
    project_cost: number;
    meeting_cost: number;
    invoice_cost: number;
    onboarding_cost: number;
    feedback_cost: number;
    projected_monthly_cost: number;
  };
  monthlyHistory: any[];
  recentUsage: any[];
}

export default function AutomationsAIClient() {
  const [selectedAutomation, setSelectedAutomation] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<string>('');
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [showUsageStats, setShowUsageStats] = useState(false);

  // Estados para formularios
  const [emailForm, setEmailForm] = useState({
    type: 'follow_up',
    clientName: '',
    projectName: '',
    context: '',
    tone: 'professional'
  });

  const [projectForm, setProjectForm] = useState({
    projectName: '',
    description: '',
    currentStatus: '',
    deadlineDate: '',
    tasksCompleted: '',
    totalTasks: ''
  });

  const automations = [
    {
      id: 'email_generation',
      title: 'Generación Inteligente de Emails',
      description: 'IA crea emails profesionales de seguimiento, actualizaciones y recordatorios',
      icon: Mail,
      category: 'Comunicación',
      cost: '~€0.001',
      status: 'active',
      color: 'bg-blue-500/10 border-blue-500/20 text-blue-300'
    },
    {
      id: 'project_analysis',
      title: 'Análisis de Proyectos',
      description: 'Evalúa el estado de proyectos, identifica riesgos y sugiere mejoras',
      icon: BarChart3,
      category: 'Gestión',
      cost: '~€0.0015',
      status: 'active',
      color: 'bg-green-500/10 border-green-500/20 text-green-300'
    },
    {
      id: 'meeting_reminder',
      title: 'Recordatorios Inteligentes',
      description: 'Genera recordatorios contextuales y prepara agendas de reuniones',
      icon: Calendar,
      category: 'Productividad',
      cost: '~€0.0008',
      status: 'coming_soon',
      color: 'bg-purple-500/10 border-purple-500/20 text-purple-300'
    },
    {
      id: 'invoice_followup',
      title: 'Seguimiento de Facturas',
      description: 'Automatiza recordatorios de pago y gestiona la cobranza',
      icon: DollarSign,
      category: 'Facturación',
      cost: '~€0.0012',
      status: 'coming_soon',
      color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300'
    },
    {
      id: 'client_onboarding',
      title: 'Onboarding de Clientes',
      description: 'Crea secuencias de bienvenida y guías personalizadas',
      icon: Users,
      category: 'Clientes',
      cost: '~€0.002',
      status: 'coming_soon',
      color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'
    },
    {
      id: 'feedback_analysis',
      title: 'Análisis de Feedback',
      description: 'Analiza comentarios de clientes y extrae insights accionables',
      icon: MessageSquare,
      category: 'Mejora',
      cost: '~€0.0018',
      status: 'coming_soon',
      color: 'bg-rose-500/10 border-rose-500/20 text-rose-300'
    }
  ];

  useEffect(() => {
    fetchUsageStats();
  }, []);

  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/ai/usage-stats');
      if (response.ok) {
        const data = await response.json();
        setUsageStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error);
    }
  };

  const generateEmail = async () => {
    if (!emailForm.clientName) {
      alert('El nombre del cliente es requerido');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailForm)
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data.email);
        fetchUsageStats(); // Actualizar estadísticas
      } else {
        const error = await response.json();
        alert(error.error || 'Error al generar email');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar email');
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeProject = async () => {
    if (!projectForm.projectName || !projectForm.description || !projectForm.currentStatus) {
      alert('Nombre del proyecto, descripción y estado actual son requeridos');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/analyze-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...projectForm,
          tasksCompleted: projectForm.tasksCompleted ? parseInt(projectForm.tasksCompleted) : undefined,
          totalTasks: projectForm.totalTasks ? parseInt(projectForm.totalTasks) : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(JSON.stringify(data.analysis, null, 2));
        fetchUsageStats(); // Actualizar estadísticas
      } else {
        const error = await response.json();
        alert(error.error || 'Error al analizar proyecto');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al analizar proyecto');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black">
      
      <div className="flex-1 pl-64">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3 text-white">
                <Brain className="w-8 h-8 text-blue-400" />
                Automatizaciones IA
              </h1>
              <p className="text-gray-400 mt-2">
                Inteligencia artificial que trabaja para ti 24/7
              </p>
            </div>
            
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setShowUsageStats(!showUsageStats)}
                className="border-gray-700 hover:bg-gray-800"
              >
                <Euro className="w-4 h-4 mr-2" />
                Uso y Costos
              </Button>
            </div>
          </div>

          {/* Usage Stats Panel */}
          {showUsageStats && usageStats && (
            <Card className="mb-8 bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <TrendingUp className="w-5 h-5" />
                  Estadísticas de Uso - Mes Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">
                      €{usageStats.currentMonth.total_cost_usd.toFixed(4)}
                    </p>
                    <p className="text-sm text-gray-400">Gastado este mes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-400">
                      {usageStats.currentMonth.total_requests}
                    </p>
                    <p className="text-sm text-gray-400">Automatizaciones</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-400">
                      €{usageStats.currentMonth.projected_monthly_cost.toFixed(3)}
                    </p>
                    <p className="text-sm text-gray-400">Proyección mensual</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan-400">
                      €{(usageStats.currentMonth.total_requests > 0 ? usageStats.currentMonth.total_cost_usd / usageStats.currentMonth.total_requests : 0).toFixed(4)}
                    </p>
                    <p className="text-sm text-gray-400">Costo promedio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Lista de Automatizaciones */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Automatizaciones Disponibles
              </h2>
              
              <div className="grid gap-4">
                {automations.map((automation) => (
                  <Card 
                    key={automation.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      selectedAutomation === automation.id 
                        ? 'border-blue-500 bg-blue-500/5' 
                        : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => automation.status === 'active' ? setSelectedAutomation(automation.id) : null}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${automation.color}`}>
                            <automation.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-white">{automation.title}</CardTitle>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                                {automation.category}
                              </span>
                              <span className="text-xs text-green-400">
                                {automation.cost}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {automation.status === 'coming_soon' ? (
                          <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded border border-yellow-500/30">
                            Próximamente
                          </span>
                        ) : (
                          <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded border border-green-500/30">
                            Activo
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-gray-300">
                        {automation.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Panel de Configuración */}
            <div>
              {selectedAutomation === 'email_generation' && (
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-blue-400">Generar Email</CardTitle>
                    <CardDescription className="text-gray-400">
                      La IA creará un email profesional basado en tus datos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Tipo de Email</label>
                      <select 
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        value={emailForm.type}
                        onChange={(e) => setEmailForm({...emailForm, type: e.target.value})}
                      >
                        <option value="follow_up">Seguimiento</option>
                        <option value="project_update">Actualización</option>
                        <option value="meeting_reminder">Recordatorio</option>
                        <option value="invoice_reminder">Factura</option>
                        <option value="welcome">Bienvenida</option>
                        <option value="feedback_request">Solicitar Feedback</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Cliente *</label>
                      <input 
                        type="text"
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        value={emailForm.clientName}
                        onChange={(e) => setEmailForm({...emailForm, clientName: e.target.value})}
                        placeholder="Nombre del cliente"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Proyecto</label>
                      <input 
                        type="text"
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        value={emailForm.projectName}
                        onChange={(e) => setEmailForm({...emailForm, projectName: e.target.value})}
                        placeholder="Nombre del proyecto"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Contexto</label>
                      <textarea 
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded h-20 text-white"
                        value={emailForm.context}
                        onChange={(e) => setEmailForm({...emailForm, context: e.target.value})}
                        placeholder="Información adicional..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Tono</label>
                      <select 
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        value={emailForm.tone}
                        onChange={(e) => setEmailForm({...emailForm, tone: e.target.value})}
                      >
                        <option value="professional">Profesional</option>
                        <option value="friendly">Amigable</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>

                    <Button 
                      onClick={generateEmail}
                      disabled={isGenerating}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {isGenerating ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Generando...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Generar Email
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {selectedAutomation === 'project_analysis' && (
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-green-400">Analizar Proyecto</CardTitle>
                    <CardDescription className="text-gray-400">
                      La IA evaluará el estado y proporcionará recomendaciones
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Nombre del Proyecto *</label>
                      <input 
                        type="text"
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        value={projectForm.projectName}
                        onChange={(e) => setProjectForm({...projectForm, projectName: e.target.value})}
                        placeholder="Nombre del proyecto"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Descripción *</label>
                      <textarea 
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded h-20 text-white"
                        value={projectForm.description}
                        onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                        placeholder="Descripción del proyecto"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Estado Actual *</label>
                      <textarea 
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded h-16 text-white"
                        value={projectForm.currentStatus}
                        onChange={(e) => setProjectForm({...projectForm, currentStatus: e.target.value})}
                        placeholder="Estado actual del proyecto"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-300">Fecha Límite</label>
                      <input 
                        type="date"
                        className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                        value={projectForm.deadlineDate}
                        onChange={(e) => setProjectForm({...projectForm, deadlineDate: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Tareas Completadas</label>
                        <input 
                          type="number"
                          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                          value={projectForm.tasksCompleted}
                          onChange={(e) => setProjectForm({...projectForm, tasksCompleted: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-300">Total Tareas</label>
                        <input 
                          type="number"
                          className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
                          value={projectForm.totalTasks}
                          onChange={(e) => setProjectForm({...projectForm, totalTasks: e.target.value})}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={analyzeProject}
                      disabled={isGenerating}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {isGenerating ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Analizando...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Analizar Proyecto
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Resultado */}
              {result && (
                <Card className="mt-6 bg-gray-900/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-green-400 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Resultado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-800 p-4 rounded border">
                      <pre className="whitespace-pre-wrap text-sm text-gray-300">
                        {result}
                      </pre>
                    </div>
                    <Button
                      onClick={() => navigator.clipboard.writeText(result)}
                      className="mt-3 bg-gray-700 hover:bg-gray-600"
                      size="sm"
                    >
                      Copiar Resultado
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
