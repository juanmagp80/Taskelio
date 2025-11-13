import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'upcoming-meetings':
        return await getUpcomingMeetings();
      
      case 'automation-stats':
        return await getAutomationStats();
      
      case 'check-connection':
        return await checkMCPConnection();
      
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Error en MCP API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'sync-calendar':
        return await syncUserCalendar(body);
      
      case 'send-reminder':
        return await sendMeetingReminder(body);
      
      case 'start-automation':
        return await startAutomation();
      
      case 'stop-automation':
        return await stopAutomation();
      
      case 'manual-check':
        return await runManualCheck();
      
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Error en MCP API POST:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function getUpcomingMeetings() {
  try {
    const now = new Date();
    const endTime = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 horas

    const { data: meetings, error } = await supabase
      .from('calendar_events')
      .select(`
        id,
        title,
        start_time,
        end_time,
        location,
        attendees,
        google_event_id
      `)
      .gte('start_time', now.toISOString())
      .lte('start_time', endTime.toISOString())
      .order('start_time', { ascending: true })
      .limit(25);

    if (error) {
      console.error('❌ Error obteniendo reuniones:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Formatear reuniones para el cliente
    const formattedMeetings = meetings?.map(meeting => ({
      id: meeting.id,
      title: meeting.title,
      start_time: meeting.start_time,
      client: meeting.attendees?.[0] ? {
        name: meeting.attendees[0].name || 'Cliente',
        email: meeting.attendees[0].email || ''
      } : undefined,
      status: 'confirmed'
    })) || [];

    return NextResponse.json({
      success: true,
      data: { meetings: formattedMeetings }
    });
  } catch (error) {
    console.error('❌ Error en getUpcomingMeetings:', error);
    return NextResponse.json({ error: 'Error obteniendo reuniones' }, { status: 500 });
  }
}

async function getAutomationStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: reminders, error } = await supabase
      .from('meeting_reminders')
      .select('success')
      .gte('sent_at', today.toISOString())
      .lt('sent_at', tomorrow.toISOString());

    if (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats = {
      date: today.toISOString().split('T')[0],
      sent: reminders?.filter(r => r.success === true).length || 0,
      errors: reminders?.filter(r => r.success === false).length || 0,
      total: reminders?.length || 0
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error en getAutomationStats:', error);
    return NextResponse.json({ error: 'Error obteniendo estadísticas' }, { status: 500 });
  }
}

async function checkMCPConnection() {
  try {
    // Verificar conexión con MCP server
    const mcpUrl = `http://localhost:${process.env.MCP_SERVER_PORT || 3001}/health`;
    
    try {
      const response = await fetch(mcpUrl, {
        method: 'GET'
      });
      
      const connected = response.ok;
      return NextResponse.json({
        success: true,
        data: { connected }
      });
    } catch (fetchError) {
      // MCP server no disponible
      return NextResponse.json({
        success: true,
        data: { connected: false }
      });
    }
  } catch (error) {
    console.error('❌ Error verificando conexión MCP:', error);
    return NextResponse.json({
      success: true,
      data: { connected: false }
    });
  }
}

async function syncUserCalendar(body: any) {
  // TODO: Implementar sincronización real con MCP server
  
  // Por ahora, simular sincronización exitosa
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return NextResponse.json({
    success: true,
    message: 'Calendario sincronizado exitosamente (simulado)'
  });
}

async function sendMeetingReminder(body: any) {
  // TODO: Implementar envío real de recordatorio
  
  // Simular envío exitoso
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return NextResponse.json({
    success: true,
    message: 'Recordatorio enviado exitosamente (simulado)'
  });
}

async function startAutomation() {
  // TODO: Comunicarse con MCP server para iniciar automatización
  
  return NextResponse.json({
    success: true,
    message: 'Automatización iniciada (simulado)'
  });
}

async function stopAutomation() {
  // TODO: Comunicarse con MCP server para detener automatización
  
  return NextResponse.json({
    success: true,
    message: 'Automatización detenida (simulado)'
  });
}

async function runManualCheck() {
  // TODO: Ejecutar verificación manual de recordatorios
  
  return NextResponse.json({
    success: true,
    message: 'Verificación manual completada (simulado)'
  });
}
