import { NextRequest, NextResponse } from 'next/server';
import { runMeetingReminderMonitoring } from '@/src/lib/meeting-reminder';

export async function POST(request: NextRequest) {
  try {
    
    const result = await runMeetingReminderMonitoring();
    
    if (result.success) {
      
      return NextResponse.json({
        success: true,
        message: result.message,
        remindersSent: result.remindersSent,
        timestamp: new Date().toISOString(),
        service: 'Meeting Reminder Monitoring'
      }, { status: 200 });
      
    } else {
      console.error('❌ API meeting-reminder: Error en monitoreo:', result.message);
      
      return NextResponse.json({
        success: false,
        error: result.message,
        timestamp: new Date().toISOString(),
        service: 'Meeting Reminder Monitoring'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ API meeting-reminder: Error crítico:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString(),
      service: 'Meeting Reminder Monitoring'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    
    return NextResponse.json({
      success: true,
      message: 'Sistema de recordatorio de reuniones operativo',
      timestamp: new Date().toISOString(),
      service: 'Meeting Reminder Monitoring',
      status: 'active',
      nextCheck: 'Cada hora en minuto 0',
      description: 'Envía recordatorios automáticos 1 hora antes de las reuniones'
    }, { status: 200 });
    
  } catch (error) {
    console.error('❌ API meeting-reminder: Error en verificación:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString(),
      service: 'Meeting Reminder Monitoring'
    }, { status: 500 });
  }
}
