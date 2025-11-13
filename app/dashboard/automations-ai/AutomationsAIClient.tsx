'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { showToast } from '@/utils/toast';
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

interface AutomationsAIClientProps {
  userEmail: string;
}

export default function AutomationsAIClient({ userEmail }: AutomationsAIClientProps) {
  // Función de logout para Sidebar
  const onLogout = async () => {
    // Aquí puedes agregar la lógica real de logout, por ejemplo limpiar sesión, llamar a API, redirigir, etc.
    showToast.info('Sesión cerrada');
  };
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
      id: 'optimize_development_new',
      title: '📈 Analizador de Productividad Avanzado',
      description: 'IA analiza tu productividad, tiempo trabajado y rendimiento de los últimos 90 días con datos reales',
      icon: TrendingUp,
      category: 'Productividad',
      cost: '~€0.0025',
      status: 'active',
      color: 'bg-orange-500/10 border-orange-500/20 text-orange-300'
    },
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
    },
    {
      id: 'optimize_development',
      title: 'Optimización de Desarrollo',
      description: 'Analiza tu productividad, tiempo trabajado y rendimiento de los últimos 90 días',
      icon: TrendingUp,
      category: 'Productividad',
      cost: '~€0.0025',
      status: 'active',
      color: 'bg-orange-500/10 border-orange-500/20 text-orange-300'
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
      showToast.warning('El nombre del cliente es requerido');
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
        showToast.error(error.error || 'Error al generar email');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast.error('Error al generar email');
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeProject = async () => {
    if (!projectForm.projectName || !projectForm.description || !projectForm.currentStatus) {
      showToast.warning('Nombre del proyecto, descripción y estado actual son requeridos');
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
        showToast.error(error.error || 'Error al analizar proyecto');
      }
    } catch (error) {
      console.error('Error:', error);
      showToast.error('Error al analizar proyecto');
    } finally {
      setIsGenerating(false);
    }
  };

  const optimizeDevelopment = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/optimize-development');
      if (!response.ok) {
        throw new Error('Error al obtener análisis de desarrollo');
      }
      
      const data = await response.json();
      
      // Mostrar logs de debug en consola de forma muy visible
      
      if (data.success && data.analysis) {
        // Formatear el resultado para mostrar de manera más visual
        const analysis = data.analysis;
        const formattedResult = `🧠 Resultados del Análisis de IA
Análisis completo de productividad de los últimos 90 días

📈 Resumen de Rendimiento
Período: last 90_días

${analysis.productivity_score}/10
Productividad
${analysis.billable_percentage}%
Facturable
€${analysis.hourly_rate}
Por Hora
${analysis.total_hours}h
Trabajadas

🚫 Bottlenecks Detectados
${analysis.bottlenecks?.map((b: { issue: string; description: string; severity: string }) => `${b.issue}
${b.description}

💡 ${b.severity === 'high' ? 'CRÍTICO' : b.severity === 'medium' ? 'IMPORTANTE' : 'MENOR'}: Requiere atención ${b.severity === 'high' ? 'inmediata' : 'próximamente'}.`).join('\n\n') || 'No se detectaron problemas críticos.'}

🚀 Oportunidades

${analysis.opportunities?.map((o: { area: string; impact: string; description: string }) => `${o.area}
${o.impact.charAt(0).toUpperCase() + o.impact.slice(1)}
${o.description}

🛠️ Impacto esperado: ${o.impact === 'high' ? 'Alto' : o.impact === 'medium' ? 'Medio' : 'Bajo'}.`).join('\n\n') || 'Análisis de oportunidades no disponible.'}

💡 Recomendaciones Accionables
${analysis.recommendations?.map((r: { action: string; description?: string; timeline: string; effort: string }) => `${r.action}
${r.description || 'Implementar para mejorar el rendimiento general.'}

⏱️ ${r.timeline === 'immediate' ? 'Inmediato' : r.timeline === 'short_term' ? 'Corto plazo' : 'Largo plazo'}
${r.effort.charAt(0).toUpperCase() + r.effort.slice(1)}
`).join('\n') || 'No hay recomendaciones específicas disponibles.'}

🔮 Predicciones Futuras
${analysis.predictions?.projected_productivity || 'N/A'}/10
Productividad Proyectada
€${analysis.predictions?.projected_revenue || 0}
Revenue Proyectado
${analysis.predictions?.focus_areas?.length || 0}
Áreas de Enfoque

🎯 Áreas clave para el próximo período:
  ${analysis.predictions?.focus_areas?.map((area: string) => `• ${area.charAt(0).toUpperCase() + area.slice(1)}`).join('\n') || '• Seguimiento de tiempo\n• Aumento de horas facturables\n• Mejora de la comunicación con clientes'}

📊 Datos Analizados:
• ${data.raw_data?.events || 0} eventos de calendario
• ${data.raw_data?.tasks || 0} tareas completadas
• ${data.raw_data?.invoices || 0} facturas procesadas
• ${data.raw_data?.messages || 0} mensajes con clientes`;

        setResult(formattedResult);
        fetchUsageStats(); // Actualizar estadísticas
      } else {
        setResult(`Error en el análisis: ${data.error || 'Datos insuficientes'}\n\nDatos encontrados:\n${JSON.stringify(data.raw_data, null, 2)}`);
      }
    } catch (error) {
      console.error('Error:', error);
      showToast.error('Error al optimizar desarrollo');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen bg-black">
      <Sidebar userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex flex-col flex-1 ml-56">
        <Header userEmail={userEmail} onLogout={onLogout} />
        <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-3 text-white">
                <Brain className="w-6 h-6 lg:w-8 lg:h-8 text-blue-400" />
                Automatizaciones IA
              </h1>
              <p className="text-gray-400 mt-2 text-sm lg:text-base">
                Inteligencia artificial que trabaja para ti 24/7
              </p>
            </div>
            
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setShowUsageStats(!showUsageStats)}
                className="border-gray-700 hover:bg-gray-800 text-sm"
              >
                <Euro className="w-4 h-4 mr-2" />
                Uso y Costos
              </Button>
            </div>
          </div>

          {/* Usage Stats Panel */}
          {showUsageStats && usageStats && (
            <Card className="mb-6 lg:mb-8 bg-gray-900/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400 text-lg">
                  <TrendingUp className="w-5 h-5" />
                  Estadísticas de Uso - Mes Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xl lg:text-2xl font-bold text-green-400">
                      €{usageStats.currentMonth.total_cost_usd.toFixed(4)}
                    </p>
                    <p className="text-xs lg:text-sm text-gray-400">Gastado este mes</p>
                  </div>
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xl lg:text-2xl font-bold text-blue-400">
                      {usageStats.currentMonth.total_requests}
                    </p>
                    <p className="text-xs lg:text-sm text-gray-400">Automatizaciones</p>
                  </div>
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xl lg:text-2xl font-bold text-purple-400">
                      €{usageStats.currentMonth.projected_monthly_cost.toFixed(3)}
                    </p>
                    <p className="text-xs lg:text-sm text-gray-400">Proyección mensual</p>
                  </div>
                  <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-xl lg:text-2xl font-bold text-cyan-400">
                      €{(usageStats.currentMonth.total_requests > 0 ? usageStats.currentMonth.total_cost_usd / usageStats.currentMonth.total_requests : 0).toFixed(4)}
                    </p>
                    <p className="text-xs lg:text-sm text-gray-400">Costo promedio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid xl:grid-cols-5 gap-6 lg:gap-8">
            {/* Lista de Automatizaciones */}
            <div className="xl:col-span-3">
              <h2 className="text-lg lg:text-xl font-semibold mb-4 flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Automatizaciones Disponibles
              </h2>
              
              <div className="grid gap-3 lg:gap-4">
                {automations.map((automation) => (
                  <Card 
                    key={automation.id}
                    className={`cursor-pointer transition-all duration-200 ai-automations-card ${
                      selectedAutomation === automation.id 
                        ? 'border-blue-500 bg-blue-500/5' 
                        : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => automation.status === 'active' ? setSelectedAutomation(automation.id) : null}
                  >
                    <CardHeader className="pb-2 lg:pb-3 ai-automations-card-header">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`p-2 rounded-lg ${automation.color} flex-shrink-0 mt-0.5`}>
                            <automation.icon className="w-4 h-4 lg:w-5 lg:h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm lg:text-base text-white line-clamp-2 leading-tight">{automation.title}</CardTitle>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-300 whitespace-nowrap">
                                {automation.category}
                              </span>
                              <span className="text-xs text-green-400 whitespace-nowrap">
                                {automation.cost}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0 sm:self-start">
                          {automation.status === 'coming_soon' ? (
                            <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded border border-yellow-500/30 whitespace-nowrap">
                              Próximamente
                            </span>
                          ) : (
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded border border-green-500/30 whitespace-nowrap">
                              Activo
                            </span>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-gray-300 text-xs lg:text-sm line-clamp-2 leading-relaxed">
                        {automation.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Panel de Configuración */}
            <div className="xl:col-span-2">
              {selectedAutomation === 'email_generation' && (
                <Card className="bg-gray-900/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-blue-400 text-lg">Generar Email</CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                      La IA creará un email profesional basado en tus datos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">Tipo de Email</label>
                      <select 
                        className="w-full p-2.5 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
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
                      <label className="block text-sm font-medium mb-2 text-gray-300">Cliente *</label>
                      <input 
                        type="text"
                        className="w-full p-2.5 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                        value={emailForm.clientName}
                        onChange={(e) => setEmailForm({...emailForm, clientName: e.target.value})}
                        placeholder="Nombre del cliente"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">Proyecto</label>
                      <input 
                        type="text"
                        className="w-full p-2.5 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                        value={emailForm.projectName}
                        onChange={(e) => setEmailForm({...emailForm, projectName: e.target.value})}
                        placeholder="Nombre del proyecto"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">Contexto</label>
                      <textarea 
                        className="w-full p-2.5 bg-gray-800 border border-gray-600 rounded h-20 text-white text-sm resize-none focus:border-blue-500 focus:outline-none"
                        value={emailForm.context}
                        onChange={(e) => setEmailForm({...emailForm, context: e.target.value})}
                        placeholder="Información adicional..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">Tono</label>
                      <select 
                        className="w-full p-2.5 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
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
                      className="w-full bg-blue-600 hover:bg-blue-700 h-10"
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
                    <CardTitle className="text-green-400 text-lg">Analizar Proyecto</CardTitle>
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

              {/* Analizador de Productividad Avanzado - NUEVO */}
              {selectedAutomation === 'optimize_development_new' && (
                <Card className="mt-6 bg-gray-900/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-400" />
                      📈 Analizador de Productividad Avanzado
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      IA analiza tu productividad real de los últimos 90 días usando todos tus datos de la base de datos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                      <h4 className="text-orange-300 font-medium mb-2">🔍 Análisis que incluye:</h4>
                      <ul className="text-gray-400 text-sm space-y-1">
                        <li>• ⏰ Horas trabajadas y tiempo facturable</li>
                        <li>• 📅 Eventos de calendario con seguimiento de tiempo</li>
                        <li>• ✅ Tareas completadas por categoría</li>
                        <li>• 💰 Facturas emitidas y estado de pagos</li>
                        <li>• 📋 Presupuestos aprobados y conversión</li>
                        <li>• 💬 Comunicación con clientes</li>
                        <li>• 📊 Métricas de productividad y eficiencia</li>
                      </ul>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <p className="text-blue-300 text-sm">
                        ✨ Este análisis usa OpenAI GPT-4o-mini para generar insights personalizados basados en tus datos reales.
                      </p>
                    </div>

                    <Button 
                      onClick={optimizeDevelopment}
                      disabled={isGenerating}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      {isGenerating ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Analizando productividad...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4 mr-2" />
                          🧠 Analizar Productividad con IA
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Optimización de Desarrollo - ORIGINAL */}
              {selectedAutomation === 'optimize_development' && (
                <Card className="mt-6 bg-gray-900/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-orange-400" />
                      Optimización de Desarrollo
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Analiza tu productividad, tiempo trabajado y rendimiento de los últimos 90 días usando datos reales de tu base de datos.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                      <h4 className="text-orange-300 font-medium mb-2">📊 Datos que se analizarán:</h4>
                      <ul className="text-gray-400 text-sm space-y-1">
                        <li>• Eventos de calendario y tiempo trabajado</li>
                        <li>• Tareas completadas y tiempo invertido</li>
                        <li>• Facturas emitidas y estado de pagos</li>
                        <li>• Presupuestos aprobados</li>
                        <li>• Interacciones con clientes</li>
                        <li>• Productividad y eficiencia</li>
                      </ul>
                    </div>

                    <Button 
                      onClick={optimizeDevelopment}
                      disabled={isGenerating}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      {isGenerating ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Analizando datos...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Optimizar Desarrollo
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Resultado */}
              {result && (
                <Card className="mt-4 lg:mt-6 bg-gray-900/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
                      <CheckCircle className="w-5 h-5" />
                      Resultado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-800 p-3 lg:p-4 rounded border max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-xs lg:text-sm text-gray-300 leading-relaxed">
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
    </div>
  );
}
