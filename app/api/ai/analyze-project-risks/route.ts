import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createSupabaseServerClient } from '@/src/lib/supabase-server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();

    if (!projectId) {
      return NextResponse.json({ error: 'ID de proyecto es requerido' }, { status: 400 });
    }

    // Crear cliente Supabase
    const supabase = await createSupabaseServerClient();

    // Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    // Obtener el proyecto específico con información del cliente
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    // Obtener tareas relacionadas con el proyecto
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Preparar el contexto para OpenAI
    const projectContext = `
    PROYECTO A ANALIZAR PARA DETECCIÓN DE RIESGOS:
    
    Nombre del Proyecto: ${project.name}
    Descripción: ${project.description || 'Sin descripción específica'}
    Cliente: ${project.client?.name || 'Cliente no especificado'}
    Estado: ${project.status}
    Tipo: ${project.type || 'No especificado'}
    Presupuesto: ${project.budget || 'No especificado'} ${project.currency || ''}
    
    Fechas:
    - Fecha de inicio: ${project.start_date || 'No definida'}
    - Fecha de fin estimada: ${project.end_date || 'No definida'}
    - Fecha de creación: ${project.created_at}
    
    Información adicional:
    - Tecnologías: ${project.technologies || 'No especificadas'}
    - Prioridad: ${project.priority || 'Normal'}
    - Progreso estimado: ${project.progress || 0}%
    
    Tareas del proyecto (${tasks?.length || 0} tareas):
    ${tasks?.map((task: any) => `
    - ${task.title} (${task.status}) - Prioridad: ${task.priority || 'Normal'}
      Descripción: ${task.description || 'Sin descripción'}
      Vencimiento: ${task.due_date || 'Sin fecha límite'}
    `).join('') || 'No hay tareas registradas'}
    
    Notas del proyecto: ${project.notes || 'Sin notas adicionales'}
    `;


    // Llamada a OpenAI para análisis de riesgos
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un consultor experto en gestión de proyectos y análisis de riesgos. Analiza el proyecto y detecta riesgos potenciales, proporcionando planes de mitigación específicos.

          Responde ÚNICAMENTE con un JSON válido sin explicaciones adicionales:

          {
            "overall_risk_score": number (1-10, donde 10 es máximo riesgo),
            "risk_level": "low" | "medium" | "high" | "critical",
            "identified_risks": [
              {
                "category": "timeline" | "budget" | "scope" | "technical" | "client" | "team" | "external",
                "risk": "descripción del riesgo",
                "impact": "low" | "medium" | "high",
                "probability": "low" | "medium" | "high",
                "severity_score": number (1-10)
              }
            ],
            "critical_issues": [
              "problema crítico 1",
              "problema crítico 2"
            ],
            "mitigation_plan": [
              {
                "risk": "riesgo específico",
                "actions": ["acción 1", "acción 2"],
                "timeline": "cuándo implementar",
                "responsible": "quién debe hacerlo"
              }
            ],
            "early_warning_signs": [
              "señal de alerta 1",
              "señal de alerta 2"
            ],
            "recommendations": [
              "recomendación específica 1",
              "recomendación específica 2"
            ],
            "success_probability": number (0-1),
            "next_actions": [
              "acción inmediata 1",
              "acción inmediata 2"
            ]
          }

          CRÍTICO: Responde SOLO con el JSON, sin texto adicional.`
        },
        {
          role: "user",
          content: projectContext
        }
      ],
      max_tokens: 2000,
      temperature: 0.2,
    });

    const response = completion.choices[0]?.message?.content || '{}';

    let analysis;
    let parseError = false;

    try {
      // Limpiar la respuesta de posibles caracteres extra
      const cleanResponse = response.trim().replace(/```json/g, '').replace(/```/g, '');
      analysis = JSON.parse(cleanResponse);
      
      // Validar que tiene las propiedades necesarias
      if (!analysis.overall_risk_score || !analysis.identified_risks || !analysis.mitigation_plan) {
        throw new Error('Estructura JSON incompleta');
      }
      
    } catch (error) {
      console.error('❌ Error parseando JSON de OpenAI:', error);
      console.error('📄 Respuesta original:', response);
      parseError = true;
      
      // Fallback analysis mejorado para riesgos
      analysis = {
        overall_risk_score: 6.0,
        risk_level: "medium",
        identified_risks: [
          {
            category: "timeline",
            risk: "Posibles retrasos en entrega",
            impact: "medium",
            probability: "medium",
            severity_score: 6
          },
          {
            category: "scope",
            risk: "Cambios en los requisitos del proyecto",
            impact: "medium",
            probability: "high",
            severity_score: 7
          }
        ],
        critical_issues: [
          "Revisar definición de alcance del proyecto",
          "Establecer comunicación regular con cliente"
        ],
        mitigation_plan: [
          {
            risk: "Retrasos en timeline",
            actions: ["Revisar hitos del proyecto", "Establecer checkpoints semanales"],
            timeline: "Inmediatamente",
            responsible: "Project Manager"
          }
        ],
        early_warning_signs: [
          "Cliente no responde en 48 horas",
          "Tareas acumulando retrasos",
          "Cambios frecuentes en requisitos"
        ],
        recommendations: [
          "Implementar reuniones de seguimiento semanales",
          "Crear documentación clara de requisitos",
          "Establecer buffer de tiempo del 20%"
        ],
        success_probability: 0.75,
        next_actions: [
          "Revisar timeline del proyecto",
          "Contactar al cliente para confirmar requisitos",
          "Implementar sistema de seguimiento"
        ],
        parseError: true,
        rawResponse: response.substring(0, 300) + '...'
      };
    }

    // Respuesta final
    const result = {
      project: {
        id: project.id,
        name: project.name,
        client: project.client?.name || 'Cliente no especificado',
        status: project.status,
        budget: project.budget,
        currency: project.currency,
        progress: project.progress || 0,
        start_date: project.start_date,
        end_date: project.end_date,
        created: project.created_at,
        tasks_count: tasks?.length || 0
      },
      analysis,
      parseError,
      originalResponse: parseError ? response : undefined
    };

    // Guardar insight en la base de datos
    try {
      await supabase.from('ai_insights').insert({
        user_id: user.id,
        insight_type: 'risk_detection',
        title: `Análisis de riesgos: ${project.name}`,
        description: `Detección de riesgos para "${project.name}" - Nivel: ${analysis.risk_level} (${analysis.overall_risk_score}/10)`,
        data_points: {
          project_id: project.id,
          overall_risk_score: analysis.overall_risk_score,
          risk_level: analysis.risk_level,
          critical_issues_count: analysis.critical_issues?.length || 0,
          identified_risks_count: analysis.identified_risks?.length || 0,
          parse_error: parseError
        },
        confidence_score: analysis.success_probability,
        recommendations: analysis.recommendations || [],
        created_at: new Date().toISOString()
      });
    } catch (insightError) {
      console.error('⚠️ Error guardando insight:', insightError);
      // No fallar la respuesta por esto
    }


    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error en análisis de riesgos:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
