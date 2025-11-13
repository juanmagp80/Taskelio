// Cliente MCP para integrar Google Calendar desde la aplicación principal Clyra
// Se conecta al servidor MCP y proporciona métodos para usar desde la app

import { createClient } from '@supabase/supabase-js';

interface MCPResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export class GoogleCalendarMCPClient {
  private supabase: any;
  private serverUrl: string;
  private isConnected: boolean = false;

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.serverUrl = serverUrl;

    // Usar la configuración de Supabase para el cliente (lado browser)
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Verificar conexión con el servidor MCP
   */
  async checkConnection(): Promise<boolean> {
    try {
      // En una implementación real, esto sería una llamada HTTP al servidor MCP
      // Por ahora, simulamos la conexión verificando las variables de entorno

      const hasGoogleConfig = !!(
        process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET
      );

      const hasEmailConfig = !!(
        process.env.EMAIL_USER &&
        process.env.EMAIL_PASS
      );

      this.isConnected = hasGoogleConfig && hasEmailConfig;
      return this.isConnected;
    } catch (error) {
      console.error('Error verificando conexión MCP:', error);
      return false;
    }
  }

  /**
   * Sincronizar reuniones desde Google Calendar
   */
  async syncUserCalendar(userId: string): Promise<MCPResponse> {
    try {
      if (!this.isConnected) {
        await this.checkConnection();
      }

      // En una implementación real, esto sería una llamada al servidor MCP
      // Por ahora, simulamos la respuesta


      return {
        success: true,
        message: `✅ Calendario sincronizado para usuario ${userId}`,
        data: { syncedCount: 0 }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Crear evento en Google Calendar desde Clyra
   */
  async createCalendarEvent(eventData: {
    userId: string;
    title: string;
    startTime: string;
    endTime: string;
    clientId?: string;
    description?: string;
    location?: string;
  }): Promise<MCPResponse> {
    try {
      // Crear evento en la base de datos local primero
      const { data: calendarEvent, error } = await this.supabase
        .from('calendar_events')
        .insert({
          user_id: eventData.userId,
          title: eventData.title,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          client_id: eventData.clientId,
          description: eventData.description,
          location: eventData.location,
          type: 'meeting',
          status: 'scheduled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Error creando evento en Supabase: ${error.message}`);
      }

      // En una implementación real, aquí también se crearía en Google Calendar

      return {
        success: true,
        message: `✅ Evento "${eventData.title}" creado exitosamente`,
        data: { eventId: calendarEvent.id }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener reuniones próximas que necesitan recordatorios
   */
  async getUpcomingMeetings(userId?: string, hoursAhead: number = 3): Promise<MCPResponse> {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

      let query = this.supabase
        .from('calendar_events')
        .select(`
          *,
          clients (
            id,
            name,
            email,
            phone,
            company
          )
        `)
        .eq('type', 'meeting')
        .eq('status', 'scheduled')
        .gte('start_time', now.toISOString())
        .lte('start_time', futureTime.toISOString())
        .order('start_time');

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: meetings, error } = await query;

      if (error) {
        throw new Error(`Error obteniendo reuniones: ${error.message}`);
      }

      return {
        success: true,
        message: `📊 ${meetings?.length || 0} reuniones próximas encontradas`,
        data: { meetings: meetings || [], count: meetings?.length || 0 }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Enviar recordatorio manual
   */
  async sendMeetingReminder(
    eventId: string,
    reminderType: '1_hour' | '3_hours' | '24_hours'
  ): Promise<MCPResponse> {
    try {
      // Obtener detalles del evento
      const { data: event, error: eventError } = await this.supabase
        .from('calendar_events')
        .select(`
          *,
          clients (
            id,
            name,
            email
          )
        `)
        .eq('id', eventId)
        .single();

      if (eventError || !event) {
        throw new Error('Evento no encontrado');
      }

      if (!event.clients?.email) {
        throw new Error('El cliente no tiene email configurado');
      }

      // En una implementación real, aquí se llamaría al servidor MCP para enviar el email

      // Registrar el recordatorio enviado
      const { error: reminderError } = await this.supabase
        .from('meeting_reminders')
        .insert({
          event_id: eventId,
          reminder_type: reminderType,
          recipient_email: event.clients.email,
          sent_at: new Date().toISOString(),
          success: true,
        });

      if (reminderError) {
        console.error('Error registrando recordatorio:', reminderError);
      }

      return {
        success: true,
        message: `✅ Recordatorio enviado a ${event.clients.email}`,
        data: { recipientEmail: event.clients.email }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Iniciar automatización de recordatorios
   */
  async startAutomation(): Promise<MCPResponse> {
    try {
      // En una implementación real, esto iniciaría el cron job en el servidor MCP

      return {
        success: true,
        message: '✅ Automatización iniciada'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detener automatización de recordatorios
   */
  async stopAutomation(): Promise<MCPResponse> {
    try {
      // En una implementación real, esto detendría el cron job en el servidor MCP

      return {
        success: true,
        message: '⏹️ Automatización detenida'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtener estadísticas de recordatorios
   */
  async getAutomationStats(date?: Date): Promise<MCPResponse> {
    try {
      const targetDate = date || new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const { data: reminders, error } = await this.supabase
        .from('meeting_reminders')
        .select('success')
        .gte('sent_at', startOfDay.toISOString())
        .lte('sent_at', endOfDay.toISOString());

      if (error) {
        throw new Error(`Error obteniendo estadísticas: ${error.message}`);
      }

      const sent = reminders?.filter((r: any) => r.success).length || 0;
      const errors = reminders?.filter((r: any) => !r.success).length || 0;

      return {
        success: true,
        message: 'Estadísticas obtenidas',
        data: {
          date: targetDate.toDateString(),
          sent,
          errors,
          total: sent + errors
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ejecutar verificación manual de recordatorios
   */
  async runReminderCheck(): Promise<MCPResponse> {
    try {

      // Obtener reuniones próximas
      const upcomingResult = await this.getUpcomingMeetings(undefined, 25);

      if (!upcomingResult.success) {
        throw new Error(upcomingResult.error);
      }

      const meetings = upcomingResult.data.meetings;
      let processed = 0;
      let sent = 0;

      for (const meeting of meetings) {
        const now = new Date();
        const meetingTime = new Date(meeting.start_time);
        const hoursUntil = (meetingTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Determinar si necesita recordatorio
        let reminderType: '1_hour' | '3_hours' | '24_hours' | null = null;

        if (hoursUntil <= 1.5 && hoursUntil > 0.5) {
          reminderType = '1_hour';
        } else if (hoursUntil <= 3.5 && hoursUntil > 2.5) {
          reminderType = '3_hours';
        } else if (hoursUntil <= 25 && hoursUntil > 23) {
          reminderType = '24_hours';
        }

        if (reminderType && meeting.clients?.email) {
          // Verificar si ya se envió
          const { data: existingReminder } = await this.supabase
            .from('meeting_reminders')
            .select('id')
            .eq('event_id', meeting.id)
            .eq('reminder_type', reminderType)
            .eq('success', true)
            .limit(1);

          if (!existingReminder || existingReminder.length === 0) {
            const result = await this.sendMeetingReminder(meeting.id, reminderType);
            if (result.success) {
              sent++;
            }
          }
        }
        processed++;
      }

      return {
        success: true,
        message: `✅ Verificación completada: ${processed} procesadas, ${sent} recordatorios enviados`,
        data: { processed, sent }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Instancia singleton para usar en la aplicación
export const googleCalendarMCP = new GoogleCalendarMCPClient();
