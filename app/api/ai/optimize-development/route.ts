import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: Request) {
  try {
    
    // Usar service key para bypasses RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: 'Variables de entorno no configuradas'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // User ID hardcoded por ahora (deberías obtenerlo de auth)
    const user_id = 'e7ed7c8d-229a-42d1-8a44-37bcc64c440c';

  // Fechas para los últimos 90 días
  const now = new Date();
  const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);


  // Horas trabajadas y productividad
  const { data: events, error: eventsError } = await supabase
    .from('calendar_events')
    .select('id, start_time, end_time, time_tracked, is_billable, productivity_score, efficiency_rating, actual_revenue')
    .eq('user_id', user_id)
    .gte('start_time', past90.toISOString());

  if (events && events.length > 0) {
      id: events[0].id,
      start_time: events[0].start_time,
      time_tracked: events[0].time_tracked,
      actual_revenue: events[0].actual_revenue,
      is_billable: events[0].is_billable
    });
  }
  if (eventsError) console.error('❌ Error eventos:', eventsError);

  // Tareas completadas
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, completed_at, total_time_seconds, category, priority')
    .eq('user_id', user_id)
    .eq('status', 'completed')
    .gte('completed_at', past90.toISOString());

  if (tasks && tasks.length > 0) {
      id: tasks[0].id,
      title: tasks[0].title,
      total_time_seconds: tasks[0].total_time_seconds,
      category: tasks[0].category
    });
  }
  if (tasksError) console.error('❌ Error tareas:', tasksError);

  // Facturación (incluir todas las facturas recientes, no solo las pagadas)
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('id, total_amount, paid_date, status, issue_date')
    .eq('user_id', user_id)
    .gte('issue_date', past90.toISOString());

  if (invoices && invoices.length > 0) {
      id: invoices[0].id,
      total_amount: invoices[0].total_amount,
      status: invoices[0].status,
      issue_date: invoices[0].issue_date
    });
  }
  if (invoicesError) console.error('❌ Error facturas:', invoicesError);

  // Presupuestos aprobados
  const { data: budgets, error: budgetsError } = await supabase
    .from('budgets')
    .select('id, total_amount, approved_at, status')
    .eq('user_id', user_id)
    .eq('status', 'sent')
    .gte('sent_at', past90.toISOString());

  if (budgetsError) console.error('Error presupuestos:', budgetsError);

  // Mensajes con clientes (usando JOIN para filtrar por user_id)
  const { data: messages, error: messagesError } = await supabase
    .from('client_messages')
    .select(`
      id, 
      client_id, 
      message, 
      sender_type, 
      created_at,
      clients!inner(user_id)
    `)
    .eq('clients.user_id', user_id)
    .gte('created_at', past90.toISOString());

  if (messagesError) console.error('Error mensajes:', messagesError);

  // Calcular métricas básicas
  const totalHours = events?.reduce((sum, event) => {
    const hours = event.time_tracked ? event.time_tracked / 3600 : 0; // Convertir segundos a horas
    return sum + hours;
  }, 0) || 0;

  const billableHours = events?.filter(e => e.is_billable).reduce((sum, event) => {
    const hours = event.time_tracked ? event.time_tracked / 3600 : 0;
    return sum + hours;
  }, 0) || 0;

  const avgProductivity = (events && events.length > 0) ? 
    events.reduce((sum, e) => sum + (e.productivity_score || 0), 0) / events.length : 0;

  const totalRevenue = invoices?.filter(i => i.status === 'paid')
    .reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0) || 0;

  // También incluir revenue desde events
  const eventRevenue = events?.reduce((sum, event) => {
    return sum + parseFloat(event.actual_revenue || '0');
  }, 0) || 0;

  const combinedRevenue = totalRevenue + eventRevenue;

  
  if (events) {
    events.forEach((event, index) => {
      const hours = event.time_tracked ? event.time_tracked / 3600 : 0;
    });
  }

  const taskCategories = tasks?.reduce((acc, task) => {
    const category = task.category || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Usar OpenAI para análisis inteligente
  try {
    const analysisPrompt = `Eres un experto consultor en productividad y desarrollo freelance. Analiza estos datos de los últimos 90 días y proporciona insights accionables:

DATOS DE PRODUCTIVIDAD:
- Total de horas trabajadas: ${totalHours.toFixed(1)}h
- Horas facturables: ${billableHours.toFixed(1)}h (${totalHours > 0 ? ((billableHours/totalHours)*100).toFixed(1) : 0}%)
- Productividad promedio: ${avgProductivity.toFixed(1)}/10
- Ingresos totales: €${combinedRevenue.toFixed(2)}
- Tarifa promedio por hora: €${totalHours > 0 ? (combinedRevenue/totalHours).toFixed(2) : 0}

TAREAS COMPLETADAS (${tasks?.length || 0} total):
${Object.entries(taskCategories).map(([cat, count]) => `- ${cat}: ${count} tareas`).join('\n')}

EVENTOS DE TRABAJO (${events?.length || 0} sesiones):
- Promedio productividad: ${avgProductivity.toFixed(1)}/10
- Sesiones facturables: ${events?.filter(e => e.is_billable).length || 0}

FACTURACIÓN (${invoices?.length || 0} facturas):
- Facturadas: €${invoices?.reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0).toFixed(2)}
- Cobradas: €${totalRevenue.toFixed(2)}
- Pendientes: €${(invoices?.filter(i => i.status !== 'paid').reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0) || 0).toFixed(2)}

COMUNICACIÓN:
- Mensajes con clientes: ${messages?.length || 0}

Proporciona un análisis en formato JSON con esta estructura exacta:
{
  "productivity_score": number (1-10),
  "billable_percentage": number (0-100),
  "hourly_rate": number,
  "total_hours": number,
  "bottlenecks": [{"issue": "string", "severity": "high|medium|low", "description": "string"}],
  "opportunities": [{"area": "string", "impact": "high|medium|low", "description": "string"}],
  "recommendations": [{"action": "string", "timeline": "immediate|short_term|long_term", "effort": "low|medium|high"}],
  "predictions": {
    "projected_productivity": number (1-10),
    "projected_revenue": number,
    "focus_areas": ["string"]
  }
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Eres un experto consultor en productividad y desarrollo. Proporciona análisis detallados en formato JSON."
        },
        {
          role: "user",
          content: analysisPrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 3000
    });

    const analysisContent = completion.choices[0].message.content;
    if (!analysisContent) {
      throw new Error('No se recibió respuesta de OpenAI');
    }
    
    let aiAnalysis;
    try {
      aiAnalysis = JSON.parse(analysisContent);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      aiAnalysis = {
        productivity_score: Math.round(avgProductivity),
        billable_percentage: totalHours > 0 ? Math.round((billableHours/totalHours)*100) : 0,
        hourly_rate: totalHours > 0 ? Math.round(combinedRevenue/totalHours) : 0,
        total_hours: Math.round(totalHours),
        bottlenecks: [{issue: "Datos insuficientes", severity: "medium", description: "Se necesitan más datos para un análisis completo"}],
        opportunities: [{area: "Seguimiento de tiempo", impact: "high", description: "Mejorar el registro de horas trabajadas"}],
        recommendations: [{action: "Implementar tracking de tiempo", timeline: "immediate", effort: "low"}],
        predictions: {
          projected_productivity: Math.min(10, Math.round(avgProductivity) + 1),
          projected_revenue: Math.round(combinedRevenue * 1.2),
          focus_areas: ["productividad", "facturación", "comunicación"]
        }
      };
    }

    return NextResponse.json({
      success: true,
      analysis: aiAnalysis,
      debug_logs: {
        user_id: user_id,
        date_range: `${past90.toISOString()} to ${now.toISOString()}`,
        events_found: events?.length || 0,
        first_event: events?.[0] || null,
        tasks_found: tasks?.length || 0,
        first_task: tasks?.[0] || null,
        invoices_found: invoices?.length || 0,
        first_invoice: invoices?.[0] || null,
        calculated_metrics: {
          totalHours,
          billableHours,
          avgProductivity,
          combinedRevenue,
          eventRevenue,
          invoiceRevenue: totalRevenue
        }
      },
      raw_data: {
        events: events?.length || 0,
        tasks: tasks?.length || 0,
        invoices: invoices?.length || 0,
        budgets: budgets?.length || 0,
        messages: messages?.length || 0,
        metrics: {
          totalHours,
          billableHours,
          avgProductivity,
          totalRevenue: combinedRevenue,
          eventRevenue,
          invoiceRevenue: totalRevenue,
          taskCategories
        }
      }
    });

  } catch (aiError) {
    console.error('Error en análisis IA:', aiError);
    return NextResponse.json({
      error: 'Error en el análisis de IA',
      raw_data: {
        events,
        tasks,
        invoices,
        budgets,
        messages,
      }
    }, { status: 500 });
  }
  } catch (error) {
    console.error('Error general:', error);
    return NextResponse.json({
      error: 'Error en análisis de productividad',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
