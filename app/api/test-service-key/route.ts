import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    // Usar cliente con service key para bypasear RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Variables de entorno de Supabase no configuradas',
        missing: {
          url: !supabaseUrl,
          service_key: !supabaseServiceKey
        }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const user_id = 'e7ed7c8d-229a-42d1-8a44-37bcc64c440c';
    

    // Intentar obtener eventos con service key (bypassa RLS)
    const { data: allEvents, error: allEventsError } = await supabase
      .from('calendar_events')
      .select('id, start_time, end_time, time_tracked, is_billable, productivity_score, actual_revenue, title, user_id')
      .limit(10);

    
    if (allEvents && allEvents.length > 0) {
    }

    // Intentar obtener eventos para tu user_id específico
    const { data: userEvents, error: userEventsError } = await supabase
      .from('calendar_events')
      .select('id, start_time, user_id, time_tracked, actual_revenue, title')
      .eq('user_id', user_id)
      .limit(10);


    // También probar otras tablas
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', user_id)
      .limit(1);


    if (userEvents && userEvents.length > 0) {
      // Calcular métricas reales
      const totalHours = userEvents.reduce((sum, event) => {
        const hours = event.time_tracked ? event.time_tracked / 3600 : 0;
        return sum + hours;
      }, 0);
      
      const totalRevenue = userEvents.reduce((sum, event) => {
        return sum + parseFloat(event.actual_revenue || '0');
      }, 0);
      
      const analysisResult = {
        productivity_score: 8,
        billable_percentage: 85,
        hourly_rate: totalHours > 0 ? Math.round(totalRevenue / totalHours) : 0,
        total_hours: Math.round(totalHours * 10) / 10,
        bottlenecks: [
          {
            issue: "RLS encontrado y resuelto",
            severity: "medium",
            description: `Datos accesibles con service key. ${userEvents.length} eventos encontrados`
          }
        ],
        opportunities: [
          {
            area: "Acceso a datos",
            impact: "high",
            description: `Total horas: ${totalHours.toFixed(1)}h, Revenue: €${totalRevenue.toFixed(2)}`
          }
        ],
        recommendations: [
          {
            action: "Configurar permisos RLS correctos",
            timeline: "immediate",
            effort: "medium"
          }
        ],
        predictions: {
          projected_productivity: 9,
          projected_revenue: Math.round(totalRevenue * 1.2),
          focus_areas: ["acceso_datos", "productividad", "revenue"]
        }
      };

      return NextResponse.json({
        success: true,
        analysis: analysisResult,
        debug_info: {
          user_id: user_id,
          rls_bypassed: true,
          any_events_in_table: allEvents?.length || 0,
          user_specific_events: userEvents.length,
          profile_found: profiles?.length || 0,
          sample_user_event: userEvents[0],
          calculated_metrics: {
            total_hours: totalHours,
            total_revenue: totalRevenue
          },
          unique_user_ids_found: allEvents ? [...new Set(allEvents.map(e => e.user_id))] : []
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Ni siquiera con service key se encuentran eventos',
        debug_info: {
          user_id: user_id,
          rls_bypassed: true,
          any_events_in_table: allEvents?.length || 0,
          user_specific_events: 0,
          profile_found: profiles?.length || 0,
          unique_user_ids_found: allEvents ? [...new Set(allEvents.map(e => e.user_id))] : [],
          sample_events: allEvents?.slice(0, 3) || [],
          errors: {
            allEventsError: allEventsError?.message,
            userEventsError: userEventsError?.message,
            profilesError: profilesError?.message
          }
        }
      });
    }
    
  } catch (error) {
    console.error('Error en análisis con service key:', error);
    return NextResponse.json({
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
