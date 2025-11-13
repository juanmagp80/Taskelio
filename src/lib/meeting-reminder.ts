// Sistema de monitoreo de reuniones
// Este archivo implementa la detección automática de reuniones próximas (1 hora antes)

import { createServerSupabaseClient } from '@/src/lib/supabase-server';
import { executeAutomationAction } from '@/src/lib/automation-actions';
import { createClient } from '@supabase/supabase-js';

// Función para crear cliente Supabase con service role key para bypass RLS
function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface MeetingReminderData {
  meeting_id: string;
  meeting_title: string;
  meeting_date: string;
  meeting_time: string;
  meeting_location?: string;
  client_id: string;
  client_name: string;
  client_email: string;
  user_id: string;
  project_name?: string;
}

export async function checkUpcomingMeetings(): Promise<void> {
  try {
    
    // Usar service role key para bypass RLS
    const supabase = createServiceSupabaseClient();
    
    // Calcular ventana de tiempo: expandida para incluir reuniones hasta 3 horas
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    
    
    // 1. Buscar reuniones en calendar_events (donde type = 'meeting')
    const { data: meetings, error: meetingsError } = await supabase
      .from('calendar_events')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        location,
        meeting_url,
        client_id,
        user_id,
        status,
        project_id,
        type,
        clients (
          id,
          name,
          email
        ),
        projects (
          id,
          name
        )
      `)
      .eq('type', 'meeting')
      .eq('status', 'scheduled')
      .gte('start_time', oneHourFromNow.toISOString())
      .lte('start_time', threeHoursFromNow.toISOString());
    
    if (meetingsError) {
      console.error('❌ Error obteniendo reuniones:', meetingsError);
      return;
    }
    
    
    // Debug: mostrar todas las reuniones encontradas
    if (meetings && meetings.length > 0) {
      meetings.forEach((meeting, index) => {
        const client = Array.isArray(meeting.clients) ? meeting.clients[0] : meeting.clients;
      });
    }
    
    // 2. Filtrar reuniones que requieren recordatorio
    const meetingReminders: MeetingReminderData[] = [];
    
    for (const meeting of meetings || []) {
      // start_time ya es un timestamp completo
      const meetingDateTime = new Date(meeting.start_time);
      const timeDiffMs = meetingDateTime.getTime() - now.getTime();
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
      
      // Si la reunión es entre 1 y 3 horas desde ahora (expandido para incluir más reuniones)
      if (timeDiffHours >= 1 && timeDiffHours <= 3) {
        
        const client = Array.isArray(meeting.clients) ? meeting.clients[0] : meeting.clients;
        const project = Array.isArray(meeting.projects) ? meeting.projects[0] : meeting.projects;
        
        meetingReminders.push({
          meeting_id: meeting.id,
          meeting_title: meeting.title,
          meeting_date: meetingDateTime.toLocaleDateString('es-ES'),
          meeting_time: meetingDateTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          meeting_location: meeting.location || meeting.meeting_url || 'Por determinar',
          client_id: meeting.client_id,
          client_name: client?.name || 'Cliente',
          client_email: client?.email || '',
          user_id: meeting.user_id,
          project_name: project?.name || 'Reunión general'
        });
      }
    }
    
    // 3. Ejecutar automatización para cada recordatorio
    if (meetingReminders.length > 0) {
      
      // Obtener la automatización de recordatorio de reunión (usar la más reciente)
      const { data: automation, error: autoError } = await supabase
        .from('automations')
        .select('*')
        .eq('trigger_type', 'meeting_reminder')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (autoError || !automation) {
        console.error('❌ No se encontró automatización de recordatorio de reunión activa');
        await createMeetingReminderAutomation(supabase);
        return;
      }
      
      for (const reminder of meetingReminders) {
        // Verificar si ya se envió recordatorio para esta reunión
        const { data: recentReminder } = await supabase
          .from('automation_executions')
          .select('id')
          .eq('automation_id', automation.id)
          .eq('metadata->meeting_id', reminder.meeting_id)
          .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Últimas 2 horas
          .single();
        
        if (recentReminder) {
          continue;
        }
        
        // Obtener información del usuario responsable
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', reminder.user_id)
          .single();
        
        const userInfo = {
          id: reminder.user_id,
          email: userProfile?.email || '',
          user_metadata: {
            full_name: userProfile?.full_name || userProfile?.email?.split('@')[0] || 'Usuario'
          },
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString()
        } as any;
        
        // Preparar payload para la automatización
        const payload = {
          client: {
            id: reminder.client_id,
            name: reminder.client_name,
            email: reminder.client_email
          },
          automation: automation,
          user: userInfo,
          supabase: supabase,
          executionId: `meeting-${reminder.meeting_id}-${Date.now()}`,
          // Variables específicas de la reunión
          meeting_title: reminder.meeting_title,
          meeting_date: reminder.meeting_date,
          meeting_time: reminder.meeting_time,
          meeting_location: reminder.meeting_location,
          project_name: reminder.project_name
        };
        
        try {
          // Ejecutar la automatización
          const result = await executeAutomationAction(
            JSON.parse(automation.actions)[0], 
            payload
          );
          
          if (result.success) {
            
            // Registrar la ejecución
            await supabase
              .from('automation_executions')
              .insert({
                automation_id: automation.id,
                user_id: reminder.user_id,
                client_id: reminder.client_id,
                execution_id: payload.executionId,
                status: 'success',
                metadata: {
                  meeting_id: reminder.meeting_id,
                  meeting_title: reminder.meeting_title,
                  meeting_date: reminder.meeting_date,
                  meeting_time: reminder.meeting_time,
                  trigger_type: 'meeting_reminder'
                },
                executed_at: new Date().toISOString()
              });
            
            // Actualizar contador de ejecuciones
            await supabase
              .from('automations')
              .update({ 
                execution_count: (automation.execution_count || 0) + 1,
                last_executed: new Date().toISOString()
              })
              .eq('id', automation.id);
              
          } else {
            console.error(`❌ Error enviando recordatorio para ${reminder.meeting_title}:`, result.message);
          }
          
        } catch (execError) {
          console.error(`❌ Error ejecutando automatización para ${reminder.meeting_title}:`, execError);
        }
      }
      
    } else {
    }
    
  } catch (error) {
    console.error('❌ Error en monitoreo de reuniones:', error);
  }
}

// Función para crear automatización de recordatorio si no existe
async function createMeetingReminderAutomation(supabase: any): Promise<void> {
  
  const meetingReminderTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recordatorio de Reunión</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f4; padding: 20px 0;">
        <tr>
            <td align="center">
                
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; max-width: 600px;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 25px 40px; text-align: center;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">📅 Recordatorio de Reunión</h1>
                            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                                Su reunión está programada en 1 hora
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Información del responsable -->
                    <tr>
                        <td style="padding: 20px 40px; background-color: #e3f2fd; border-bottom: 1px solid #bbdefb;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td>
                                        <p style="margin: 0; font-size: 14px; color: #1565c0;">
                                            <strong>Organizador:</strong> {{user_name}}<br>
                                            <strong>Email:</strong> {{user_email}}<br>
                                            <strong>Empresa:</strong> {{user_company}}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Contenido principal -->
                    <tr>
                        <td style="padding: 30px 40px;">
                            
                            <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.6;">
                                Estimado/a <strong>{{client_name}}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 25px 0; font-size: 15px; color: #555555; line-height: 1.7;">
                                Le recordamos que tiene una reunión programada con nosotros en aproximadamente <strong>1 hora</strong>.
                            </p>
                            
                            <!-- Detalles de la reunión -->
                            <div style="background-color: #f8f9fa; padding: 25px; border-radius: 6px; border-left: 4px solid #007bff; margin: 25px 0;">
                                <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #007bff; font-weight: 600;">
                                    📋 Detalles de la Reunión
                                </h3>
                                <table width="100%" cellpadding="8" cellspacing="0" border="0" style="font-size: 14px;">
                                    <tr>
                                        <td style="color: #333; font-weight: 600;">Asunto:</td>
                                        <td style="color: #555;">{{meeting_title}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #333; font-weight: 600;">Fecha:</td>
                                        <td style="color: #555;">{{meeting_date}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #333; font-weight: 600;">Hora:</td>
                                        <td style="color: #555; font-weight: 600;">{{meeting_time}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #333; font-weight: 600;">Ubicación:</td>
                                        <td style="color: #555;">{{meeting_location}}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #333; font-weight: 600;">Proyecto:</td>
                                        <td style="color: #555;">{{project_name}}</td>
                                    </tr>
                                </table>
                            </div>
                            
                            <p style="margin: 0 0 25px 0; font-size: 15px; color: #555555; line-height: 1.7;">
                                <strong>Importante:</strong> Si necesita reprogramar o cancelar la reunión, por favor contáctenos lo antes posible.
                            </p>
                            
                            <!-- Call to action -->
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <table cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="background-color: #28a745; border-radius: 6px; padding: 14px 28px;">
                                                    <a href="mailto:{{user_email}}?subject=Confirmación reunión - {{meeting_title}}&body=Estimado/a {{user_name}},%0A%0AConfirmo mi asistencia a la reunión:%0A- Fecha: {{meeting_date}}%0A- Hora: {{meeting_time}}%0A- Asunto: {{meeting_title}}%0A%0ASaludos,%0A{{client_name}}" 
                                                       style="color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; display: block;">
                                                        ✅ Confirmar Asistencia
                                                    </a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0; font-size: 15px; color: #555555; line-height: 1.6;">
                                Esperamos verle pronto. Si tiene alguna pregunta, no dude en contactarnos.
                            </p>
                            
                        </td>
                    </tr>
                    
                    <!-- Información de contacto -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 25px 40px; border-top: 1px solid #e8e8e8;">
                            <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #333333; font-weight: 600;">
                                📞 Información de Contacto
                            </h3>
                            <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
                                <strong>{{user_name}}</strong><br>
                                {{user_company}}<br>
                                Email: <a href="mailto:{{user_email}}" style="color: #007bff; text-decoration: none;">{{user_email}}</a>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #ffffff; padding: 20px 40px 30px 40px; text-align: center; border-top: 1px solid #e8e8e8;">
                            <p style="margin: 0; font-size: 12px; color: #999999; line-height: 1.4;">
                                Recordatorio automático del sistema de gestión de {{user_company}}<br>
                                Para consultas, contáctenos en {{user_email}}
                            </p>
                        </td>
                    </tr>
                    
                </table>
                
            </td>
        </tr>
    </table>
    
</body>
</html>`;

  const { error } = await supabase
    .from('automations')
    .insert({
      name: 'Recordatorio de Reunión',
      description: 'Envía recordatorios automáticos a clientes 1 hora antes de las reuniones programadas',
      trigger_type: 'meeting_reminder',
      trigger_conditions: JSON.stringify({
        minutes_before: 60,
        meeting_status: 'scheduled'
      }),
      actions: JSON.stringify([{
        type: 'send_email',
        name: 'Enviar recordatorio de reunión',
        parameters: {
          subject: '📅 Recordatorio: Reunión {{meeting_title}} - {{user_company}}',
          template: meetingReminderTemplate
        }
      }]),
      is_active: true,
      user_id: 'e7ed7c8d-229a-42d1-8a44-37bcc64c440c'
    });
    
  if (error) {
    console.error('❌ Error creando automatización:', error);
  } else {
  }
}

// Función para crear reuniones de ejemplo si no existen
async function createSampleCalendarMeeting(supabase: any): Promise<void> {
  
  // Obtener un cliente existente
  const { data: existingClient } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', 'e7ed7c8d-229a-42d1-8a44-37bcc64c440c')
    .limit(1);
  
  if (existingClient && existingClient.length > 0) {
    const client = existingClient[0];
    
    // Crear reunión de ejemplo para 1.5 horas desde ahora
    const futureDate = new Date(Date.now() + 1.5 * 60 * 60 * 1000);
    const endDate = new Date(futureDate.getTime() + 60 * 60 * 1000); // 1 hora de duración
    
    const { data: newMeeting, error: meetingError } = await supabase
      .from('calendar_events')
      .insert({
        title: 'Reunión de Seguimiento - Test Automatización',
        description: 'Reunión de prueba para el sistema de recordatorios automáticos',
        start_time: futureDate.toISOString(),
        end_time: endDate.toISOString(),
        type: 'meeting',
        location: 'Oficina principal / Video llamada',
        client_id: client.id,
        user_id: 'e7ed7c8d-229a-42d1-8a44-37bcc64c440c',
        status: 'scheduled'
      })
      .select()
      .single();
    
    if (meetingError) {
      console.error('❌ Error creando reunión de prueba:', meetingError);
    } else {
    }
  } else {
  }
}

// Función principal para ejecutar manualmente o por cron job
export async function runMeetingReminderMonitoring(): Promise<{ success: boolean; message: string; remindersSent: number }> {
  try {
    await checkUpcomingMeetings();
    return {
      success: true,
      message: 'Monitoreo de recordatorios de reunión completado',
      remindersSent: 0 // Se podría mejorar para devolver el número real
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido',
      remindersSent: 0
    };
  }
}
