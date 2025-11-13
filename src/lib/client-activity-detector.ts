// Sistema de detección de clientes inactivos para Clyra
// Detecta clientes sin actividad basándose en comunicaciones y trabajo en proyectos

import { SupabaseClient } from '@supabase/supabase-js';

export interface InactiveClient {
    id: string;
    name: string;
    email: string;
    company?: string;
    lastCommunication?: string | null;
    lastProjectActivity?: string | null;
    daysSinceLastActivity: number;
    inactivityReason: 'no_communication' | 'no_project_work' | 'both';
}

export interface ActivityDetectionConfig {
    daysThreshold: number; // Días sin actividad para considerar inactivo
    checkCommunications: boolean; // Verificar comunicaciones
    checkProjectWork: boolean; // Verificar trabajo en proyectos
}

export class ClientActivityDetector {
    private supabase: SupabaseClient;
    private config: ActivityDetectionConfig;

    constructor(supabase: SupabaseClient, config?: Partial<ActivityDetectionConfig>) {
        this.supabase = supabase;
        this.config = {
            daysThreshold: 30,
            checkCommunications: true,
            checkProjectWork: true,
            ...config
        };
    }

    /**
     * Detecta clientes inactivos para un usuario específico
     */
    async detectInactiveClients(userId: string): Promise<InactiveClient[]> {
        try {

            // Fecha límite para considerar actividad
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() - this.config.daysThreshold);
            const thresholdISOString = thresholdDate.toISOString();

            // Obtener todos los clientes del usuario
            const { data: clients, error: clientsError } = await this.supabase
                .from('clients')
                .select('id, name, email, company, created_at')
                .eq('user_id', userId)
                .order('name');

            if (clientsError) {
                console.error('❌ Error obteniendo clientes:', clientsError);
                throw new Error(`Error obteniendo clientes: ${clientsError.message}`);
            }

            if (!clients || clients.length === 0) {
                return [];
            }


            const inactiveClients: InactiveClient[] = [];

            // Analizar cada cliente
            for (const client of clients) {
                const activityAnalysis = await this.analyzeClientActivity(userId, client, thresholdISOString);
                
                if (activityAnalysis.isInactive) {
                    inactiveClients.push({
                        id: client.id,
                        name: client.name,
                        email: client.email,
                        company: client.company,
                        lastCommunication: activityAnalysis.lastCommunication,
                        lastProjectActivity: activityAnalysis.lastProjectActivity,
                        daysSinceLastActivity: activityAnalysis.daysSinceLastActivity,
                        inactivityReason: activityAnalysis.inactivityReason
                    });
                }
            }

            
            return inactiveClients;

        } catch (error) {
            console.error('❌ Error en detección de clientes inactivos:', error);
            throw error;
        }
    }

    /**
     * Analiza la actividad de un cliente específico
     */
    private async analyzeClientActivity(userId: string, client: any, thresholdDate: string) {
        const result = {
            isInactive: false,
            lastCommunication: null as string | null,
            lastProjectActivity: null as string | null,
            daysSinceLastActivity: 0,
            inactivityReason: 'no_communication' as 'no_communication' | 'no_project_work' | 'both'
        };

        let hasRecentCommunication = false;
        let hasRecentProjectWork = false;
        let lastActivityDate: Date | null = null;

        // Helper function para actualizar la fecha de última actividad
        const updateLastActivityDate = (newDate: Date): void => {
            if (lastActivityDate === null || newDate > lastActivityDate) {
                lastActivityDate = newDate;
            }
        };

        // 1. Verificar comunicaciones recientes (si está habilitado)
        if (this.config.checkCommunications) {
            try {
                const { data: communications, error: commError } = await this.supabase
                    .from('client_communications')
                    .select('created_at')
                    .eq('user_id', userId)
                    .eq('client_id', client.id)
                    .gte('created_at', thresholdDate)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (!commError && communications && communications.length > 0) {
                    hasRecentCommunication = true;
                    result.lastCommunication = communications[0].created_at;
                    
                    const commDate = new Date(communications[0].created_at);
                    updateLastActivityDate(commDate);
                }

                // Si no hay comunicaciones recientes, buscar la última
                if (!hasRecentCommunication) {
                    const { data: lastComm } = await this.supabase
                        .from('client_communications')
                        .select('created_at')
                        .eq('user_id', userId)
                        .eq('client_id', client.id)
                        .order('created_at', { ascending: false })
                        .limit(1);

                    if (lastComm && lastComm.length > 0) {
                        result.lastCommunication = lastComm[0].created_at;
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Error verificando comunicaciones para ${client.name}:`, error);
            }
        }

        // 2. Verificar trabajo en proyectos reciente (si está habilitado)
        if (this.config.checkProjectWork) {
            try {
                // Buscar proyectos del cliente con actividad reciente
                const { data: projects, error: projectsError } = await this.supabase
                    .from('projects')
                    .select('id, updated_at')
                    .eq('user_id', userId)
                    .eq('client_id', client.id)
                    .gte('updated_at', thresholdDate)
                    .order('updated_at', { ascending: false })
                    .limit(1);

                if (!projectsError && projects && projects.length > 0) {
                    hasRecentProjectWork = true;
                    result.lastProjectActivity = projects[0].updated_at;
                    
                    const projectDate = new Date(projects[0].updated_at);
                    updateLastActivityDate(projectDate);
                }

                // Si no hay actividad reciente en proyectos, buscar la última
                if (!hasRecentProjectWork) {
                    const { data: lastProject } = await this.supabase
                        .from('projects')
                        .select('updated_at')
                        .eq('user_id', userId)
                        .eq('client_id', client.id)
                        .order('updated_at', { ascending: false })
                        .limit(1);

                    if (lastProject && lastProject.length > 0) {
                        result.lastProjectActivity = lastProject[0].updated_at;
                    }
                }

                // También verificar tareas del cliente
                const { data: tasks, error: tasksError } = await this.supabase
                    .from('tasks')
                    .select('updated_at')
                    .eq('user_id', userId)
                    .eq('client_id', client.id)
                    .gte('updated_at', thresholdDate)
                    .order('updated_at', { ascending: false })
                    .limit(1);

                if (!tasksError && tasks && tasks.length > 0) {
                    hasRecentProjectWork = true;
                    
                    const taskDate = new Date(tasks[0].updated_at);
                    updateLastActivityDate(taskDate);
                }
            } catch (error) {
                console.warn(`⚠️ Error verificando proyectos para ${client.name}:`, error);
            }
        }

        // 3. Determinar si el cliente está inactivo
        const noRecentCommunication = this.config.checkCommunications && !hasRecentCommunication;
        const noRecentProjectWork = this.config.checkProjectWork && !hasRecentProjectWork;

        // Cliente está inactivo si no tiene actividad en ninguna de las áreas verificadas
        if (this.config.checkCommunications && this.config.checkProjectWork) {
            result.isInactive = noRecentCommunication && noRecentProjectWork;
            
            if (noRecentCommunication && noRecentProjectWork) {
                result.inactivityReason = 'both';
            } else if (noRecentCommunication) {
                result.inactivityReason = 'no_communication';
            } else if (noRecentProjectWork) {
                result.inactivityReason = 'no_project_work';
            }
        } else if (this.config.checkCommunications) {
            result.isInactive = noRecentCommunication;
            result.inactivityReason = 'no_communication';
        } else if (this.config.checkProjectWork) {
            result.isInactive = noRecentProjectWork;
            result.inactivityReason = 'no_project_work';
        }

        // 4. Calcular días desde la última actividad
        if (lastActivityDate !== null) {
            const now = new Date();
            result.daysSinceLastActivity = Math.floor((now.getTime() - (lastActivityDate as Date).getTime()) / (1000 * 60 * 60 * 24));
        } else {
            // Si no hay actividad registrada, usar la fecha de creación del cliente
            const clientCreated = new Date(client.created_at);
            const now = new Date();
            result.daysSinceLastActivity = Math.floor((now.getTime() - clientCreated.getTime()) / (1000 * 60 * 60 * 24));
        }

        return result;
    }

    /**
     * Genera un reporte de actividad de clientes
     */
    async generateActivityReport(userId: string): Promise<{
        totalClients: number;
        activeClients: number;
        inactiveClients: number;
        inactiveClientsList: InactiveClient[];
    }> {
        try {
            const { data: allClients } = await this.supabase
                .from('clients')
                .select('id')
                .eq('user_id', userId);

            const inactiveClients = await this.detectInactiveClients(userId);

            return {
                totalClients: allClients?.length || 0,
                activeClients: (allClients?.length || 0) - inactiveClients.length,
                inactiveClients: inactiveClients.length,
                inactiveClientsList: inactiveClients
            };
        } catch (error) {
            console.error('❌ Error generando reporte de actividad:', error);
            throw error;
        }
    }

    /**
     * Verifica si un cliente específico está inactivo
     */
    async isClientInactive(userId: string, clientId: string): Promise<{
        isInactive: boolean;
        client?: InactiveClient;
    }> {
        try {
            const { data: client } = await this.supabase
                .from('clients')
                .select('id, name, email, company, created_at')
                .eq('id', clientId)
                .eq('user_id', userId)
                .single();

            if (!client) {
                return { isInactive: false };
            }

            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() - this.config.daysThreshold);

            const analysis = await this.analyzeClientActivity(userId, client, thresholdDate.toISOString());

            if (analysis.isInactive) {
                return {
                    isInactive: true,
                    client: {
                        id: client.id,
                        name: client.name,
                        email: client.email,
                        company: client.company,
                        lastCommunication: analysis.lastCommunication,
                        lastProjectActivity: analysis.lastProjectActivity,
                        daysSinceLastActivity: analysis.daysSinceLastActivity,
                        inactivityReason: analysis.inactivityReason
                    }
                };
            }

            return { isInactive: false };
        } catch (error) {
            console.error('❌ Error verificando si cliente está inactivo:', error);
            throw error;
        }
    }
}

// Función de conveniencia para uso directo
export async function detectInactiveClients(
    supabase: SupabaseClient,
    userId: string,
    config?: Partial<ActivityDetectionConfig>
): Promise<InactiveClient[]> {
    const detector = new ClientActivityDetector(supabase, config);
    return detector.detectInactiveClients(userId);
}
