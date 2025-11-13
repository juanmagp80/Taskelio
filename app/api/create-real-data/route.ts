import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Variables de entorno no configuradas' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const user_id = 'e7ed7c8d-229a-42d1-8a44-37bcc64c440c';
    

    // Obtener o crear un cliente
    const { data: clients } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', user_id)
      .limit(1);
    
    let client_id;
    if (!clients || clients.length === 0) {
      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          user_id,
          name: 'TechCorp Solutions',
          email: 'ceo@techcorp.es',
          company: 'TechCorp Solutions SL'
        })
        .select('id')
        .single();
      client_id = newClient?.id;
    } else {
      client_id = clients[0].id;
    }

    // Obtener o crear un proyecto
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user_id)
      .limit(1);
    
    let project_id;
    if (!projects || projects.length === 0) {
      const { data: newProject } = await supabase
        .from('projects')
        .insert({
          user_id,
          client_id,
          name: 'App Fintech Productiva',
          description: 'Aplicación fintech con análisis de productividad',
          status: 'active',
          budget: 75000.00
        })
        .select('id')
        .single();
      project_id = newProject?.id;
    } else {
      project_id = projects[0].id;
    }


    // Crear eventos con datos REALES de tiempo y revenue
    const eventsToCreate = [];
    const now = new Date();
    
    for (let i = 1; i <= 20; i++) {
      const eventDate = new Date(now.getTime() - (i * 3 * 24 * 60 * 60 * 1000)); // Cada 3 días hacia atrás
      const startTime = new Date(eventDate.setHours(9, 0, 0, 0));
      const endTime = new Date(eventDate.setHours(16, 30, 0, 0)); // 7.5 horas
      
      eventsToCreate.push({
        user_id,
        client_id,
        project_id,
        title: `Desarrollo Productivo Día ${i}`,
        description: 'Sesión intensiva de desarrollo con tracking completo',
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        type: 'development',
        is_billable: true,
        time_tracked: 27000, // 7.5 horas en segundos
        hourly_rate: 85.00,
        actual_revenue: 637.50, // 7.5 * 85
        productivity_score: 8 + (i % 3), // Entre 8-10
        efficiency_rating: 9 + (i % 2), // Entre 9-10
        status: 'completed'
      });
    }

    // Insertar eventos
    const { data: insertedEvents, error: eventsError } = await supabase
      .from('calendar_events')
      .insert(eventsToCreate)
      .select('id, time_tracked, actual_revenue');


    // Crear algunas tareas
    const tasksToCreate = [
      {
        project_id,
        user_id,
        title: 'Arquitectura Backend Avanzada',
        description: 'Diseño de microservicios escalables',
        status: 'completed',
        priority: 'high',
        total_time_seconds: 28800, // 8 horas
        category: 'architecture',
        completed_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        project_id,
        user_id,
        title: 'Frontend con React Avanzado',
        description: 'Componentes reutilizables y state management',
        status: 'completed',
        priority: 'high',
        total_time_seconds: 32400, // 9 horas
        category: 'frontend',
        completed_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    const { data: insertedTasks } = await supabase
      .from('tasks')
      .insert(tasksToCreate)
      .select('id');


    // Crear facturas
    const { data: insertedInvoices } = await supabase
      .from('invoices')
      .insert([
        {
          user_id,
          client_id,
          project_id,
          invoice_number: 'PROD-001',
          title: 'Desarrollo Productivo - Fase 1',
          description: 'Facturación por desarrollo con tracking completo',
          amount: 12750.00,
          total_amount: 12750.00,
          status: 'paid',
          issue_date: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          due_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paid_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        }
      ])
      .select('id');


    // Verificar datos creados
    const { data: finalEvents } = await supabase
      .from('calendar_events')
      .select('time_tracked, actual_revenue')
      .eq('user_id', user_id)
      .not('time_tracked', 'is', null)
      .not('actual_revenue', 'is', null);

    const totalHours = finalEvents?.reduce((sum, e) => sum + (e.time_tracked / 3600), 0) || 0;
    const totalRevenue = finalEvents?.reduce((sum, e) => sum + parseFloat(e.actual_revenue || '0'), 0) || 0;

    return NextResponse.json({
      success: true,
      message: 'Datos creados exitosamente',
      created: {
        events: insertedEvents?.length || 0,
        tasks: insertedTasks?.length || 0,
        invoices: insertedInvoices?.length || 0
      },
      metrics: {
        total_hours: totalHours,
        total_revenue: totalRevenue,
        hourly_rate: totalHours > 0 ? totalRevenue / totalHours : 0
      },
      next_step: 'Ahora puedes usar el analizador de productividad'
    });
    
  } catch (error) {
    console.error('Error creando datos:', error);
    return NextResponse.json({
      error: 'Error creando datos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
