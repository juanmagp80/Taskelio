import { NextRequest, NextResponse } from 'next/server';
import { runMeetingReminderMonitoring } from '@/src/lib/meeting-reminder';

// Sistema automático de monitoreo de reuniones
let monitoringInterval: NodeJS.Timeout | null = null;
let isMonitoringActive = false;

export async function POST(request: NextRequest) {
  try {
    
    if (isMonitoringActive) {
      return NextResponse.json({
        success: false,
        message: 'El monitoreo automático ya está activo',
        status: 'running',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }
    
    // Ejecutar inmediatamente una vez
    await runMeetingReminderMonitoring();
    
    // Configurar ejecución automática cada hora
    monitoringInterval = setInterval(async () => {
      try {
        await runMeetingReminderMonitoring();
      } catch (error) {
        console.error('❌ Error en monitoreo automático:', error);
      }
    }, 60 * 60 * 1000); // Cada hora (60 minutos * 60 segundos * 1000 ms)
    
    isMonitoringActive = true;
    
    
    return NextResponse.json({
      success: true,
      message: 'Monitoreo automático de reuniones iniciado',
      schedule: 'Cada hora',
      status: 'running',
      timestamp: new Date().toISOString(),
      service: 'Auto Meeting Reminder Monitoring'
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ API auto-meeting-reminder: Error crítico:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString(),
      service: 'Auto Meeting Reminder Monitoring'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
    
    isMonitoringActive = false;
    
    
    return NextResponse.json({
      success: true,
      message: 'Monitoreo automático de reuniones detenido',
      status: 'stopped',
      timestamp: new Date().toISOString(),
      service: 'Auto Meeting Reminder Monitoring'
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ API auto-meeting-reminder: Error al detener:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString(),
      service: 'Auto Meeting Reminder Monitoring'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    
    return NextResponse.json({
      success: true,
      message: 'Estado del monitoreo automático de reuniones',
      status: isMonitoringActive ? 'running' : 'stopped',
      schedule: isMonitoringActive ? 'Cada hora' : 'Inactivo',
      timestamp: new Date().toISOString(),
      service: 'Auto Meeting Reminder Monitoring',
      description: 'Envía recordatorios automáticos 1-3 horas antes de las reuniones',
      commands: {
        start: 'POST /api/auto-meeting-reminder',
        stop: 'DELETE /api/auto-meeting-reminder',
        status: 'GET /api/auto-meeting-reminder'
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ API auto-meeting-reminder: Error en verificación:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString(),
      service: 'Auto Meeting Reminder Monitoring'
    }, { status: 500 });
  }
}
