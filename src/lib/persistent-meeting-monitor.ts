// Servicio de monitoreo persistente usando la base de datos
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class PersistentMeetingMonitor {
  private static instance: PersistentMeetingMonitor;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  static getInstance(): PersistentMeetingMonitor {
    if (!PersistentMeetingMonitor.instance) {
      PersistentMeetingMonitor.instance = new PersistentMeetingMonitor();
    }
    return PersistentMeetingMonitor.instance;
  }

  async start(): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar si ya está corriendo en la base de datos
      const { data: config } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', 'meeting_monitor_active')
        .single();

      if (config && config.value === 'true') {
        return { success: false, message: 'Monitoreo ya está activo' };
      }

      // Marcar como activo en la base de datos
      await supabase
        .from('system_config')
        .upsert({
          key: 'meeting_monitor_active',
          value: 'true',
          updated_at: new Date().toISOString()
        });

      // Iniciar el interval
      this.intervalId = setInterval(async () => {
        await this.executeMonitoring();
      }, 60 * 60 * 1000); // Cada hora

      this.isRunning = true;

      return { success: true, message: 'Monitoreo automático iniciado' };

    } catch (error) {
      console.error('❌ Error iniciando monitoreo persistente:', error);
      return { success: false, message: 'Error iniciando monitoreo' };
    }
  }

  async stop(): Promise<{ success: boolean; message: string }> {
    try {
      // Marcar como inactivo en la base de datos
      await supabase
        .from('system_config')
        .upsert({
          key: 'meeting_monitor_active',
          value: 'false',
          updated_at: new Date().toISOString()
        });

      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }

      this.isRunning = false;

      return { success: true, message: 'Monitoreo automático detenido' };

    } catch (error) {
      console.error('❌ Error deteniendo monitoreo:', error);
      return { success: false, message: 'Error deteniendo monitoreo' };
    }
  }

  async getStatus(): Promise<{ isActive: boolean; lastExecution?: string }> {
    try {
      const { data: config } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', 'meeting_monitor_active')
        .single();

      const { data: lastExec } = await supabase
        .from('system_config')
        .select('*')
        .eq('key', 'meeting_monitor_last_execution')
        .single();

      return {
        isActive: config?.value === 'true',
        lastExecution: lastExec?.value
      };

    } catch (error) {
      console.error('❌ Error obteniendo estado:', error);
      return { isActive: false };
    }
  }

  private async executeMonitoring(): Promise<void> {
    try {
      
      // Importar dinámicamente para evitar problemas de dependencias circulares
      const { runMeetingReminderMonitoring } = await import('./meeting-reminder');
      await runMeetingReminderMonitoring();

      // Registrar última ejecución
      await supabase
        .from('system_config')
        .upsert({
          key: 'meeting_monitor_last_execution',
          value: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });


    } catch (error) {
      console.error('❌ Error en monitoreo automático persistente:', error);
    }
  }

  // Método para auto-iniciar al importar el módulo
  async autoStart(): Promise<void> {
    const status = await this.getStatus();
    if (status.isActive && !this.isRunning) {
      await this.start();
    }
  }
}

// Auto-iniciar al importar
const monitor = PersistentMeetingMonitor.getInstance();
monitor.autoStart();

export const persistentMeetingMonitor = monitor;
