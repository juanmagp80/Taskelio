import OpenAI from 'openai';

// Verificar si estamos en el servidor (Node.js)
const isServer = typeof window === 'undefined';

// Solo inicializar OpenAI en el servidor
let openai: OpenAI | null = null;

if (isServer) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('⚠️ OPENAI_API_KEY is not set in environment variables');
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
}

// Función helper para verificar si OpenAI está disponible
function ensureOpenAI(): OpenAI {
  if (!isServer) {
    throw new Error('OpenAI can only be used on the server side');
  }
  if (!openai) {
    throw new Error('OpenAI client is not initialized - check OPENAI_API_KEY');
  }
  return openai;
}

// Tipos para las automatizaciones
export interface EmailGenerationRequest {
  type: 'follow_up' | 'meeting_reminder' | 'project_update' | 'invoice_reminder' | 'welcome' | 'feedback_request';
  clientName: string;
  projectName?: string;
  context?: string;
  dueDate?: string;
  invoiceAmount?: number;
  tone?: 'professional' | 'friendly' | 'urgent';
}

export interface ProjectAnalysisRequest {
  projectName: string;
  description: string;
  currentStatus: string;
  deadlineDate: string;
  tasksCompleted?: number;
  totalTasks?: number;
}

// 🆕 NUEVAS INTERFACES PARA AUTOMATIZACIONES REALES
export interface SentimentAnalysisRequest {
  text: string;
  clientName: string;
  context?: string;
}

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
  keywords: string[];
  summary: string;
  actionRequired: boolean;
  suggestedResponse?: string;
}

export interface ProposalGenerationRequest {
  clientName: string;
  clientBrief: string;
  projectType: 'web_development' | 'design' | 'marketing' | 'consulting' | 'content';
  budget?: number;
  timeline?: string;
  requirements?: string[];
  userExpertise?: string;
}

export interface ProposalGenerationResult {
  title: string;
  executive_summary: string;
  scope_of_work: string[];
  timeline: string;
  budget_breakdown: { item: string; cost: number; description: string }[];
  total_budget: number;
  terms_and_conditions: string[];
  next_steps: string[];
}

export interface TaskPrioritizationRequest {
  tasks: {
    id: string;
    title: string;
    description?: string;
    deadline?: string;
    client?: string;
    estimatedHours?: number;
  }[];
  workload?: number;
  priorities?: string[];
}

export interface PricingOptimizationRequest {
  projectType: string;
  projectScope: string;
  clientBudget?: number;
  timeline: string;
  complexity: 'low' | 'medium' | 'high';
  userExperience: 'junior' | 'mid' | 'senior' | 'expert';
  marketData?: {
    averageRate?: number;
    competitorPrices?: number[];
  };
}

// Función principal para generar emails
export async function generateEmail(request: EmailGenerationRequest): Promise<string> {
  const openaiClient = ensureOpenAI();
  
  const prompts = {
    follow_up: `Genera un email de seguimiento profesional para el cliente ${request.clientName}${request.projectName ? ` sobre el proyecto "${request.projectName}"` : ''}. 
    ${request.context ? `Contexto: ${request.context}` : ''}
    Tono: ${request.tone || 'professional'}. 
    Debe ser cordial, específico y motivar una respuesta. Máximo 150 palabras.`,

    meeting_reminder: `Genera un email recordatorio de reunión para ${request.clientName}${request.projectName ? ` sobre "${request.projectName}"` : ''}. 
    ${request.dueDate ? `Fecha: ${request.dueDate}` : ''}
    ${request.context ? `Detalles: ${request.context}` : ''}
    Debe ser amigable, incluir la fecha/hora y pedir confirmación. Máximo 100 palabras.`,

    project_update: `Genera un email de actualización de proyecto para ${request.clientName} sobre "${request.projectName}". 
    ${request.context ? `Estado actual: ${request.context}` : ''}
    Debe incluir progreso, próximos pasos y ser transparente. Tono ${request.tone || 'professional'}. Máximo 200 palabras.`,

    invoice_reminder: `Genera un email recordatorio de factura para ${request.clientName}. 
    ${request.invoiceAmount ? `Importe: €${request.invoiceAmount}` : ''}
    ${request.dueDate ? `Vencimiento: ${request.dueDate}` : ''}
    Debe ser respetuoso pero firme, incluir detalles de pago. Máximo 120 palabras.`,

    welcome: `Genera un email de bienvenida para el nuevo cliente ${request.clientName}. 
    ${request.context ? `Proyecto: ${request.context}` : ''}
    Debe ser cálido, explicar próximos pasos y establecer expectativas. Máximo 180 palabras.`,

    feedback_request: `Genera un email solicitando feedback para ${request.clientName}${request.projectName ? ` sobre "${request.projectName}"` : ''}. 
    Debe ser amigable, específico sobre qué feedback necesitas y fácil de responder. Máximo 130 palabras.`
  };

  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini", // Modelo más económico
      messages: [
        {
          role: "system",
          content: "Eres un asistente especializado en escribir emails profesionales para freelancers. Tus emails son claros, concisos y efectivos. Siempre incluyes un asunto sugerido al final entre []. Escribes en español de España."
        },
        {
          role: "user",
          content: prompts[request.type]
        }
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'Error generando email';
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error('Error al generar email con IA');
  }
}

// Función para analizar proyectos
export async function analyzeProject(request: ProjectAnalysisRequest): Promise<{
  status: 'on_track' | 'at_risk' | 'delayed';
  recommendations: string[];
  summary: string;
}> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un analista de proyectos experto. Analizas el estado de proyectos freelance y das recomendaciones específicas y accionables."
        },
        {
          role: "user",
          content: `Analiza este proyecto:
          Nombre: ${request.projectName}
          Descripción: ${request.description}
          Estado actual: ${request.currentStatus}
          Fecha límite: ${request.deadlineDate}
          ${request.tasksCompleted && request.totalTasks ? `Progreso: ${request.tasksCompleted}/${request.totalTasks} tareas` : ''}
          
          Proporciona:
          1. Estado: on_track, at_risk, o delayed
          2. 2-3 recomendaciones específicas
          3. Resumen en 50 palabras
          
          Formato JSON: {"status": "...", "recommendations": ["...", "..."], "summary": "..."}`
        }
      ],
      max_tokens: 400,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(response);
  } catch (error) {
    console.error('Error analyzing project:', error);
    return {
      status: 'at_risk',
      recommendations: ['Error en el análisis, revisar manualmente'],
      summary: 'No se pudo analizar el proyecto'
    };
  }
}

// 🆕 ANÁLISIS DE SENTIMIENTO REAL
export async function analyzeSentiment(request: SentimentAnalysisRequest): Promise<SentimentAnalysisResult> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un experto en análisis de sentimiento para comunicaciones de clientes freelance. 
          Analiza el tono, emociones y urgencia. Responde SOLO en JSON válido con esta estructura exacta:
          {
            "sentiment": "positive|negative|neutral",
            "confidence": 0.0-1.0,
            "urgency": "low|medium|high", 
            "keywords": ["palabra1", "palabra2"],
            "summary": "resumen en 30 palabras",
            "actionRequired": true/false,
            "suggestedResponse": "sugerencia si actionRequired es true"
          }`
        },
        {
          role: "user",
          content: `Analiza esta comunicación del cliente ${request.clientName}:
          
          Texto: "${request.text}"
          ${request.context ? `Contexto: ${request.context}` : ''}`
        }
      ],
      max_tokens: 300,
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(response);
    
    // Validar estructura
    return {
      sentiment: result.sentiment || 'neutral',
      confidence: result.confidence || 0.5,
      urgency: result.urgency || 'low',
      keywords: result.keywords || [],
      summary: result.summary || 'Análisis no disponible',
      actionRequired: result.actionRequired || false,
      suggestedResponse: result.suggestedResponse
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      urgency: 'low',
      keywords: ['error'],
      summary: 'Error en el análisis de sentimiento',
      actionRequired: false
    };
  }
}

// 🆕 GENERADOR AUTOMÁTICO DE PROPUESTAS
export async function generateProposal(request: ProposalGenerationRequest): Promise<ProposalGenerationResult> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un experto en crear propuestas comerciales para freelancers. 
          Creas propuestas detalladas, profesionales y persuasivas.
          Responde SOLO en JSON válido con esta estructura exacta:
          {
            "title": "título del proyecto",
            "executive_summary": "resumen ejecutivo",
            "scope_of_work": ["tarea1", "tarea2", "tarea3"],
            "timeline": "cronograma estimado",
            "budget_breakdown": [{"item": "concepto", "cost": 0, "description": "desc"}],
            "total_budget": 0,
            "terms_and_conditions": ["termino1", "termino2"],
            "next_steps": ["paso1", "paso2"]
          }`
        },
        {
          role: "user",
          content: `Crea una propuesta profesional:
          
          Cliente: ${request.clientName}
          Tipo: ${request.projectType}
          Brief: ${request.clientBrief}
          ${request.budget ? `Presupuesto orientativo: €${request.budget}` : ''}
          ${request.timeline ? `Timeline: ${request.timeline}` : ''}
          ${request.requirements ? `Requisitos: ${request.requirements.join(', ')}` : ''}
          ${request.userExpertise ? `Mi expertise: ${request.userExpertise}` : ''}`
        }
      ],
      max_tokens: 800,
      temperature: 0.4,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(response);
    
    return {
      title: result.title || `Propuesta para ${request.clientName}`,
      executive_summary: result.executive_summary || 'Propuesta profesional personalizada',
      scope_of_work: result.scope_of_work || ['Desarrollo del proyecto según briefing'],
      timeline: result.timeline || 'A definir según alcance',
      budget_breakdown: result.budget_breakdown || [{ item: 'Desarrollo', cost: request.budget || 1000, description: 'Trabajo principal' }],
      total_budget: result.total_budget || request.budget || 1000,
      terms_and_conditions: result.terms_and_conditions || ['Pago 50% inicio, 50% entrega', 'Revisiones incluidas: 2'],
      next_steps: result.next_steps || ['Revisar propuesta', 'Reunión de kickoff', 'Inicio del proyecto']
    };
  } catch (error) {
    console.error('Error generating proposal:', error);
    throw new Error('Error al generar propuesta con IA');
  }
}

// 🆕 OPTIMIZADOR INTELIGENTE DE PRECIOS
export async function optimizePricing(request: PricingOptimizationRequest): Promise<{
  recommended_price: number;
  price_range: { min: number; max: number };
  reasoning: string[];
  confidence: number;
  market_position: 'competitive' | 'premium' | 'budget';
}> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un consultor experto en pricing para freelancers. 
          Analizas proyectos y recomiendas precios optimizados basados en valor, mercado y experiencia.
          Responde SOLO en JSON válido:
          {
            "recommended_price": 0,
            "price_range": {"min": 0, "max": 0},
            "reasoning": ["razón1", "razón2"],
            "confidence": 0.0-1.0,
            "market_position": "competitive|premium|budget"
          }`
        },
        {
          role: "user",
          content: `Optimiza el precio para este proyecto:
          
          Tipo: ${request.projectType}
          Alcance: ${request.projectScope}
          Complejidad: ${request.complexity}
          Timeline: ${request.timeline}
          Mi experiencia: ${request.userExperience}
          ${request.clientBudget ? `Presupuesto cliente: €${request.clientBudget}` : ''}
          ${request.marketData?.averageRate ? `Tarifa promedio mercado: €${request.marketData.averageRate}` : ''}`
        }
      ],
      max_tokens: 400,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(response);
    
    return {
      recommended_price: result.recommended_price || 1000,
      price_range: result.price_range || { min: 800, max: 1200 },
      reasoning: result.reasoning || ['Precio basado en complejidad y experiencia'],
      confidence: result.confidence || 0.7,
      market_position: result.market_position || 'competitive'
    };
  } catch (error) {
    console.error('Error optimizing pricing:', error);
    throw new Error('Error al optimizar precios con IA');
  }
}

// 🆕 PRIORIZACIÓN INTELIGENTE DE TAREAS
export async function prioritizeTasks(request: TaskPrioritizationRequest): Promise<{
  prioritized_tasks: Array<{
    id: string;
    title: string;
    priority_score: number;
    priority_level: 'high' | 'medium' | 'low';
    reasoning: string;
    suggested_order: number;
  }>;
  workload_analysis: {
    total_estimated_hours: number;
    critical_path: string[];
    bottlenecks: string[];
  };
}> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un experto en gestión de proyectos para freelancers.
          Analizas tareas y las priorizas considerando deadlines, impacto y dependencias.
          Responde SOLO en JSON válido.`
        },
        {
          role: "user",
          content: `Prioriza estas tareas:
          
          Tareas: ${JSON.stringify(request.tasks)}
          ${request.workload ? `Carga de trabajo semanal: ${request.workload}h` : ''}
          ${request.priorities ? `Prioridades especiales: ${request.priorities.join(', ')}` : ''}
          
          Devuelve JSON con:
          - prioritized_tasks: array con id, title, priority_score (0-100), priority_level, reasoning, suggested_order
          - workload_analysis: total_estimated_hours, critical_path, bottlenecks`
        }
      ],
      max_tokens: 600,
      temperature: 0.2,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(response);
  } catch (error) {
    console.error('Error prioritizing tasks:', error);
    throw new Error('Error al priorizar tareas con IA');
  }
}

// Función para generar contenido de automatizaciones
export async function generateAutomationContent(
  type: string, 
  context: Record<string, any>
): Promise<string> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un asistente de automatizaciones para freelancers. Generas contenido útil y profesional."
        },
        {
          role: "user",
          content: `Genera contenido para automatización tipo "${type}" con contexto: ${JSON.stringify(context)}`
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || 'Contenido generado';
  } catch (error) {
    console.error('Error generating automation content:', error);
    throw new Error('Error al generar contenido');
  }
}

// =====================================================
// 🆕 NUEVAS FUNCIONES PARA AUTOMATIZACIONES IA REALES
// =====================================================

// Función para análisis de feedback (sentimiento)
export async function analyzeFeedback(text: string): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  emotions: string[];
  urgency: 'low' | 'medium' | 'high';
  recommendations: string[];
  suggested_actions: any[];
}> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un experto en análisis de sentimiento para comunicaciones de clientes freelance. 
          Analiza el texto y proporciona insights accionables.
          Responde SOLO en JSON válido con esta estructura:
          {
            "sentiment": "positive|negative|neutral",
            "confidence": 0.95,
            "emotions": ["frustrated", "urgent", "satisfied"],
            "urgency": "low|medium|high",
            "recommendations": ["acción1", "acción2"],
            "suggested_actions": [{"action": "llamar cliente", "priority": "high", "estimated_impact": "high"}]
          }`
        },
        {
          role: "user",
          content: `Analiza este feedback de cliente:
          
          "${text}"
          
          Identifica sentimiento, emociones, urgencia y sugiere acciones específicas.`
        }
      ],
      max_tokens: 400,
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(response);
    
    return {
      sentiment: result.sentiment || 'neutral',
      confidence: result.confidence || 0.7,
      emotions: result.emotions || [],
      urgency: result.urgency || 'low',
      recommendations: result.recommendations || [],
      suggested_actions: result.suggested_actions || []
    };
  } catch (error) {
    console.error('Error analyzing feedback:', error);
    return {
      sentiment: 'neutral',
      confidence: 0.5,
      emotions: ['unknown'],
      urgency: 'low',
      recommendations: ['Error en análisis - revisar manualmente'],
      suggested_actions: []
    };
  }
}

// Función para optimización de comunicación
export async function optimizeCommunication(
  originalMessage: string, 
  context: string, 
  clientData?: any
): Promise<{
  optimizedMessage: string;
  improvements: string[];
  toneAnalysis: string;
  confidence: number;
  suggestions: string[];
}> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un experto en comunicación profesional para freelancers.
          Optimizas mensajes para mejorar claridad, profesionalismo y efectividad.
          Responde SOLO en JSON válido:
          {
            "optimizedMessage": "mensaje mejorado",
            "improvements": ["mejora1", "mejora2"],
            "toneAnalysis": "análisis del tono",
            "confidence": 0.9,
            "suggestions": ["sugerencia1", "sugerencia2"]
          }`
        },
        {
          role: "user",
          content: `Optimiza este mensaje:
          
          Mensaje original: "${originalMessage}"
          Contexto: ${context}
          ${clientData ? `Cliente: ${clientData.name} (${clientData.company || 'No company'})` : ''}
          
          Mejora claridad, profesionalismo y efectividad manteniendo el mensaje personal.`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(response);
    
    return {
      optimizedMessage: result.optimizedMessage || originalMessage,
      improvements: result.improvements || [],
      toneAnalysis: result.toneAnalysis || 'Análisis no disponible',
      confidence: result.confidence || 0.7,
      suggestions: result.suggestions || []
    };
  } catch (error) {
    console.error('Error optimizing communication:', error);
    throw new Error('Error al optimizar comunicación');
  }
}

// Función para análisis de propuestas
export async function analyzeProposal(
  proposalText: string, 
  clientData?: any, 
  projectType?: string
): Promise<{
  score: number;
  strengths: string[];
  weaknesses: string[];
  missingElements: string[];
  pricingFeedback: string;
  recommendations: string[];
  confidence: number;
}> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un consultor experto en propuestas comerciales para freelancers.
          Evalúas propuestas y das feedback específico y accionable.
          Responde SOLO en JSON válido:
          {
            "score": 85,
            "strengths": ["fortaleza1", "fortaleza2"],
            "weaknesses": ["debilidad1", "debilidad2"],
            "missingElements": ["elemento1", "elemento2"],
            "pricingFeedback": "análisis de precios",
            "recommendations": ["recomendación1", "recomendación2"],
            "confidence": 0.9
          }`
        },
        {
          role: "user",
          content: `Analiza esta propuesta comercial:
          
          Propuesta: "${proposalText}"
          ${projectType ? `Tipo: ${projectType}` : ''}
          ${clientData ? `Cliente: ${clientData.name}` : ''}
          
          Evalúa estructura, claridad, valor propuesto, pricing y competitividad. Da score 0-100.`
        }
      ],
      max_tokens: 600,
      temperature: 0.2,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(response);
    
    return {
      score: result.score || 70,
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      missingElements: result.missingElements || [],
      pricingFeedback: result.pricingFeedback || 'Sin análisis de pricing',
      recommendations: result.recommendations || [],
      confidence: result.confidence || 0.7
    };
  } catch (error) {
    console.error('Error analyzing proposal:', error);
    throw new Error('Error al analizar propuesta');
  }
}

// Función para generación de contenido
export async function generateContent(
  contentType: string,
  topic: string, 
  targetAudience: string, 
  tone: string,
  clientData?: any
): Promise<{
  content: string;
  suggestions: string[];
  seoKeywords: string[];
  confidence: number;
  improvementTips: string[];
}> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un creador de contenido profesional especializado en freelancing.
          Generas contenido de alta calidad adaptado a audiencias específicas.
          Responde SOLO en JSON válido:
          {
            "content": "contenido generado",
            "suggestions": ["sugerencia1", "sugerencia2"],
            "seoKeywords": ["keyword1", "keyword2"],
            "confidence": 0.9,
            "improvementTips": ["tip1", "tip2"]
          }`
        },
        {
          role: "user",
          content: `Genera ${contentType} sobre "${topic}":
          
          Audiencia: ${targetAudience}
          Tono: ${tone}
          ${clientData ? `Cliente específico: ${clientData.name}` : ''}
          
          Crea contenido engaging, profesional y accionable. Incluye keywords SEO relevantes.`
        }
      ],
      max_tokens: 700,
      temperature: 0.6,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(response);
    
    return {
      content: result.content || 'Contenido generado',
      suggestions: result.suggestions || [],
      seoKeywords: result.seoKeywords || [],
      confidence: result.confidence || 0.7,
      improvementTips: result.improvementTips || []
    };
  } catch (error) {
    console.error('Error generating content:', error);
    throw new Error('Error al generar contenido');
  }
}

// Función para detección de riesgos en proyectos
export async function detectProjectRisks(projectData: any): Promise<{
  risks: any[];
  overallRiskLevel: 'low' | 'medium' | 'high';
  mitigationStrategies: string[];
  timelineAnalysis: string;
  budgetAnalysis: string;
  recommendations: string[];
  confidence: number;
}> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un analista de riesgos especializado en proyectos freelance.
          Identificas riesgos potenciales y sugieres mitigaciones.
          Responde SOLO en JSON válido:
          {
            "risks": [{"type": "scope_creep", "severity": "high", "probability": 0.7, "description": "desc", "mitigation": "plan"}],
            "overallRiskLevel": "medium",
            "mitigationStrategies": ["estrategia1", "estrategia2"],
            "timelineAnalysis": "análisis del timeline",
            "budgetAnalysis": "análisis del presupuesto",
            "recommendations": ["recomendación1", "recomendación2"],
            "confidence": 0.85
          }`
        },
        {
          role: "user",
          content: `Analiza riesgos de este proyecto:
          
          Proyecto: ${JSON.stringify(projectData, null, 2)}
          
          Identifica riesgos de scope, timeline, presupuesto, cliente, técnicos y operacionales.`
        }
      ],
      max_tokens: 800,
      temperature: 0.2,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(response);
    
    return {
      risks: result.risks || [],
      overallRiskLevel: result.overallRiskLevel || 'medium',
      mitigationStrategies: result.mitigationStrategies || [],
      timelineAnalysis: result.timelineAnalysis || 'Sin análisis disponible',
      budgetAnalysis: result.budgetAnalysis || 'Sin análisis disponible',
      recommendations: result.recommendations || [],
      confidence: result.confidence || 0.7
    };
  } catch (error) {
    console.error('Error detecting project risks:', error);
    throw new Error('Error al detectar riesgos del proyecto');
  }
}

// Función para análisis de rendimiento
export async function analyzePerformance(performanceData: any, period: string): Promise<{
  overallScore: number;
  metrics: any;
  trends: string[];
  bottlenecks: string[];
  recommendations: string[];
  confidence: number;
}> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un analista de rendimiento para freelancers.
          Analizas datos de productividad y sugieres mejoras.
          Responde SOLO en JSON válido:
          {
            "overallScore": 75,
            "metrics": {"productivity": 80, "efficiency": 70, "client_satisfaction": 85},
            "trends": ["tendencia1", "tendencia2"],
            "bottlenecks": ["cuello1", "cuello2"],
            "recommendations": ["rec1", "rec2"],
            "confidence": 0.8
          }`
        },
        {
          role: "user",
          content: `Analiza el rendimiento de ${period}:
          
          Datos: ${JSON.stringify(performanceData, null, 2)}
          
          Evalúa productividad, eficiencia, calidad y satisfacción del cliente. Score 0-100.`
        }
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(response);
    
    return {
      overallScore: result.overallScore || 70,
      metrics: result.metrics || {},
      trends: result.trends || [],
      bottlenecks: result.bottlenecks || [],
      recommendations: result.recommendations || [],
      confidence: result.confidence || 0.7
    };
  } catch (error) {
    console.error('Error analyzing performance:', error);
    throw new Error('Error al analizar rendimiento');
  }
}

// Función para análisis de precios
export async function analyzePricing(
  projectType: string,
  scope: string, 
  clientData?: any,
  currentPrice?: number,
  historicalData?: any[]
): Promise<{
  suggestedPrice: number;
  marketAnalysis: string;
  confidenceFactors: string[];
  pricingStrategy: string;
  recommendations: string[];
  confidence: number;
}> {
  const openaiClient = ensureOpenAI();
  
  try {
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un consultor de pricing especializado en servicios freelance.
          Analizas proyectos y sugieres precios óptimos basados en valor y mercado.
          Responde SOLO en JSON válido:
          {
            "suggestedPrice": 2500,
            "marketAnalysis": "análisis del mercado",
            "confidenceFactors": ["factor1", "factor2"],
            "pricingStrategy": "estrategia recomendada",
            "recommendations": ["rec1", "rec2"],
            "confidence": 0.85
          }`
        },
        {
          role: "user",
          content: `Optimiza el precio para:
          
          Tipo: ${projectType}
          Alcance: ${scope}
          ${currentPrice ? `Precio actual: €${currentPrice}` : ''}
          ${clientData ? `Cliente: ${clientData.name}` : ''}
          ${historicalData ? `Datos históricos: ${JSON.stringify(historicalData.slice(0, 5))}` : ''}
          
          Sugiere precio óptimo considerando valor, mercado y posicionamiento.`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(response);
    
    return {
      suggestedPrice: result.suggestedPrice || currentPrice || 1000,
      marketAnalysis: result.marketAnalysis || 'Análisis no disponible',
      confidenceFactors: result.confidenceFactors || [],
      pricingStrategy: result.pricingStrategy || 'Estrategia competitiva',
      recommendations: result.recommendations || [],
      confidence: result.confidence || 0.7
    };
  } catch (error) {
    console.error('Error analyzing pricing:', error);
    throw new Error('Error al analizar precios');
  }
}

// ========================================
// 🔄 WORKFLOWS AUTOMÁTICOS CON IA
// ========================================

// Generar email inteligente para cualquier evento
export async function generateSmartEmail(trigger: string, data: any) {
  const client = ensureOpenAI();
  
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un asistente experto en comunicación empresarial. Genera emails profesionales y personalizados basados en eventos específicos del negocio.

          EVENTOS SOPORTADOS:
          - contract_signed: Contrato firmado
          - payment_received: Pago recibido
          - project_completed: Proyecto completado
          - meeting_scheduled: Reunión programada
          - deadline_approaching: Fecha límite próxima
          - invoice_sent: Factura enviada
          - client_onboarding: Bienvenida cliente nuevo

          ESTRUCTURA DEL EMAIL:
          {
            "subject": "Asunto profesional y claro",
            "body": "Cuerpo del email en HTML",
            "tone": "professional|friendly|urgent",
            "next_steps": ["acción1", "acción2"],
            "schedule_followup": "2024-12-01"
          }`
        },
        {
          role: "user",
          content: `Genera un email para el evento: ${trigger}
          
          Datos del contexto:
          ${JSON.stringify(data, null, 2)}
          
          El email debe ser personalizado, profesional y incluir acciones claras.`
        }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating smart email:', error);
    throw new Error('Error al generar email inteligente');
  }
}

// Generar formulario dinámico basado en contexto
export async function generateDynamicForm(purpose: string, context: any) {
  const client = ensureOpenAI();
  
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un diseñador de formularios inteligentes. Crea formularios adaptativos basados en el propósito y contexto específico.

          PROPÓSITOS SOPORTADOS:
          - client_intake: Captación de cliente nuevo
          - project_brief: Brief de proyecto
          - feedback_collection: Recolección de feedback
          - change_request: Solicitud de cambios
          - meeting_preparation: Preparación de reunión

          ESTRUCTURA DEL FORMULARIO:
          {
            "title": "Título del formulario",
            "description": "Descripción del propósito",
            "fields": [
              {
                "name": "field_name",
                "label": "Etiqueta visible",
                "type": "text|email|textarea|select|radio|checkbox|date",
                "required": true,
                "options": ["opción1", "opción2"],
                "placeholder": "Texto de ayuda",
                "validation": "regex o regla"
              }
            ],
            "estimated_time": "5 minutos",
            "next_action": "Qué sucede después"
          }`
        },
        {
          role: "user",
          content: `Crea un formulario para: ${purpose}
          
          Contexto:
          ${JSON.stringify(context, null, 2)}
          
          El formulario debe ser específico y relevante para este contexto.`
        }
      ],
      max_tokens: 1000,
      temperature: 0.6,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating dynamic form:', error);
    throw new Error('Error al generar formulario dinámico');
  }
}

// Programar reunión inteligente con agenda personalizada
export async function scheduleSmartMeeting(purpose: string, participants: any[], context: any) {
  const client = ensureOpenAI();
  
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un asistente experto en programación de reuniones. Crea agendas personalizadas y sugerencias de horarios basadas en el propósito y contexto.

          PROPÓSITOS DE REUNIÓN:
          - project_kickoff: Inicio de proyecto
          - client_check_in: Seguimiento con cliente
          - project_review: Revisión de proyecto
          - problem_solving: Resolución de problemas
          - contract_discussion: Discusión de contrato
          - feedback_session: Sesión de feedback

          ESTRUCTURA DE LA REUNIÓN:
          {
            "meeting_title": "Título profesional",
            "duration_minutes": 60,
            "agenda": [
              {
                "item": "Punto de agenda",
                "duration": 15,
                "objective": "Objetivo específico"
              }
            ],
            "pre_meeting_tasks": ["tarea1", "tarea2"],
            "materials_needed": ["material1", "material2"],
            "suggested_times": ["mañana temprano", "después del almuerzo"],
            "invitation_message": "Mensaje de invitación personalizado",
            "follow_up_actions": ["acción1", "acción2"]
          }`
        },
        {
          role: "user",
          content: `Programa una reunión para: ${purpose}
          
          Participantes:
          ${JSON.stringify(participants, null, 2)}
          
          Contexto:
          ${JSON.stringify(context, null, 2)}
          
          Crea una agenda específica y relevante para este contexto.`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(response);
  } catch (error) {
    console.error('Error scheduling smart meeting:', error);
    throw new Error('Error al programar reunión inteligente');
  }
}

// Generar enlace de calendario personalizado con contexto
export async function generateCalendarLink(event_type: string, duration: number, context: any) {
  const client = ensureOpenAI();
  
  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un asistente de programación de citas. Genera configuraciones personalizadas para enlaces de calendario basadas en el tipo de evento y contexto.

          TIPOS DE EVENTOS:
          - consultation: Consulta inicial
          - project_meeting: Reunión de proyecto
          - review_session: Sesión de revisión
          - discovery_call: Llamada de descubrimiento
          - feedback_meeting: Reunión de feedback

          ESTRUCTURA DEL CALENDARIO:
          {
            "event_title": "Título del evento",
            "description": "Descripción personalizada",
            "duration_minutes": 60,
            "buffer_time": 15,
            "location": "Zoom/Oficina/etc",
            "preparation_notes": "Notas de preparación",
            "questions_to_ask": ["pregunta1", "pregunta2"],
            "meeting_objectives": ["objetivo1", "objetivo2"],
            "required_materials": ["material1", "material2"]
          }`
        },
        {
          role: "user",
          content: `Configura un enlace de calendario para: ${event_type}
          
          Duración: ${duration} minutos
          
          Contexto:
          ${JSON.stringify(context, null, 2)}
          
          Personaliza la configuración para este tipo específico de reunión.`
        }
      ],
      max_tokens: 800,
      temperature: 0.6,
    });

    const response = completion.choices[0]?.message?.content || '{}';
    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating calendar link:', error);
    throw new Error('Error al generar enlace de calendario');
  }
}
