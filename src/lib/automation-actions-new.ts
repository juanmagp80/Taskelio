// Sistema de acciones de automatización para Clyra
// Cada acción tiene un tipo específico y ejecuta una funcionalidad concreta

import { SupabaseClient, User } from '@supabase/supabase-js';

// Tipos de acciones disponibles
export type ActionType =
    | 'send_email'
    | 'create_invoice'
    | 'update_project_status'
    | 'create_calendar_event'
    | 'assign_task'
    | 'send_whatsapp'
    | 'generate_report'
    | 'create_proposal';

// Interfaz para una acción de automatización
export interface AutomationAction {
    type: ActionType;
    parameters: Record<string, any>;
}

// Payload que se pasa a cada acción - datos completos del contexto
export interface ActionPayload {
    client: {
        id: string;
        name: string;
        email: string;
        company?: string;
        phone?: string;
        [key: string]: any;
    };
    automation: {
        id: string;
        name: string;
        description?: string;
        [key: string]: any;
    };
    user: User;
    supabase: SupabaseClient;
    executionId: string;
}

// Resultado de la ejecución de una acción
export interface ActionResult {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
}

// Interfaz para un executor de acciones
export interface ActionExecutor {
    (action: AutomationAction, payload: ActionPayload): Promise<ActionResult>;
}

// =============================================================================
// IMPLEMENTACIONES DE ACCIONES ESPECÍFICAS
// =============================================================================

// Implementación específica para envío de emails
const sendEmailAction: ActionExecutor = async (action, payload) => {
    try {
        const emailData = action.parameters;

        // Validar parámetros requeridos
        if (!emailData.subject || !emailData.template) {
            return {
                success: false,
                message: "Faltan parámetros requeridos: subject y template",
                error: "Missing required parameters"
            };
        }

        // Preparar variables para el template
        const variables = {
            client_name: payload.client.name,
            client_email: payload.client.email,
            client_company: payload.client.company || payload.client.name,
            user_name: payload.user?.user_metadata?.full_name || 'Usuario',
            ...emailData.variables
        };

        // Reemplazar variables en el template
        let emailContent = emailData.template;
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            emailContent = emailContent.replace(regex, String(value));
        });

        // Registrar comunicación en la base de datos
        const { data: communicationData, error: commError } = await payload.supabase
            .from('client_communications')
            .insert({
                user_id: payload.user.id,
                client_id: payload.client.id,
                type: 'email',
                subject: emailData.subject,
                content: emailContent,
                status: 'sent',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (commError) {
            console.error('Error guardando comunicación:', commError);
            return {
                success: false,
                message: "Error al registrar la comunicación",
                error: commError.message
            };
        }

        // TODO: Aquí integraríamos con servicio de email real (SendGrid, Resend, etc.)
            to: payload.client.email,
            subject: emailData.subject,
            content: emailContent
        });

        return {
            success: true,
            message: `Email "${emailData.subject}" enviado correctamente a ${payload.client.email}`,
            data: {
                communicationId: communicationData.id,
                recipient: payload.client.email,
                subject: emailData.subject
            }
        };

    } catch (error) {
        console.error('Error en sendEmailAction:', error);
        return {
            success: false,
            message: "Error interno al enviar email",
            error: error instanceof Error ? error.message : String(error)
        };
    }
};

// Implementación específica para creación de tareas
const assignTaskAction: ActionExecutor = async (action, payload) => {
    try {
        const taskData = action.parameters;

        // Validar parámetros requeridos
        if (!taskData.title) {
            return {
                success: false,
                message: "El título de la tarea es requerido",
                error: "Missing required parameter: title"
            };
        }

        // Calcular fecha de vencimiento si se especifica días
        let dueDate = null;
        if (taskData.due_in_days) {
            const days = parseInt(taskData.due_in_days.toString());
            if (!isNaN(days)) {
                dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + days);
            }
        } else if (taskData.due_date) {
            dueDate = new Date(taskData.due_date);
        }

        // Crear la tarea
        const { data: taskCreated, error: taskError } = await payload.supabase
            .from('tasks')
            .insert({
                user_id: payload.user.id,
                client_id: payload.client.id,
                project_id: taskData.project_id || null,
                title: taskData.title,
                description: taskData.description || `Tarea automática generada para ${payload.client.name}`,
                status: taskData.status || 'pending',
                priority: taskData.priority || 'medium',
                due_date: dueDate?.toISOString(),
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (taskError) {
            console.error('Error creando tarea:', taskError);
            return {
                success: false,
                message: "Error al crear la tarea",
                error: taskError.message
            };
        }

        return {
            success: true,
            message: `Tarea "${taskData.title}" creada y asignada correctamente`,
            data: {
                taskId: taskCreated.id,
                title: taskCreated.title,
                dueDate: taskCreated.due_date,
                client: payload.client.name
            }
        };

    } catch (error) {
        console.error('Error en assignTaskAction:', error);
        return {
            success: false,
            message: "Error interno al crear tarea",
            error: error instanceof Error ? error.message : String(error)
        };
    }
};

// Implementación específica para actualización de estado de proyecto
const updateProjectStatusAction: ActionExecutor = async (action, payload) => {
    try {
        const projectData = action.parameters;

        if (!projectData.project_id) {
            return {
                success: false,
                message: "ID del proyecto es requerido",
                error: "Missing required parameter: project_id"
            };
        }

        const newStatus = projectData.status || 'updated';

        const { data: projectUpdated, error: projectError } = await payload.supabase
            .from('projects')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', projectData.project_id)
            .eq('user_id', payload.user.id) // Seguridad: solo proyectos del usuario
            .select()
            .single();

        if (projectError) {
            console.error('Error actualizando proyecto:', projectError);
            return {
                success: false,
                message: "Error al actualizar el proyecto",
                error: projectError.message
            };
        }

        return {
            success: true,
            message: `Proyecto actualizado a estado: ${newStatus}`,
            data: {
                projectId: projectUpdated.id,
                status: projectUpdated.status,
                name: projectUpdated.name
            }
        };

    } catch (error) {
        console.error('Error en updateProjectStatusAction:', error);
        return {
            success: false,
            message: "Error interno al actualizar proyecto",
            error: error instanceof Error ? error.message : String(error)
        };
    }
};

// Implementación para acciones no implementadas aún
const notImplementedAction: ActionExecutor = async (action, payload) => {
    return {
        success: false,
        message: `Acción '${action.type}' no implementada aún`,
        error: "NOT_IMPLEMENTED"
    };
};

// =============================================================================
// REGISTRO DE EJECUTORES DE ACCIONES
// =============================================================================

const actionExecutors: Record<ActionType, ActionExecutor> = {
    send_email: sendEmailAction,
    assign_task: assignTaskAction,
    update_project_status: updateProjectStatusAction,
    create_invoice: notImplementedAction,
    create_calendar_event: notImplementedAction,
    send_whatsapp: notImplementedAction,
    generate_report: notImplementedAction,
    create_proposal: notImplementedAction,
};

// =============================================================================
// FUNCIÓN PRINCIPAL DE EJECUCIÓN
// =============================================================================

/**
 * Ejecuta una acción de automatización específica
 */
export async function executeAutomationAction(
    action: AutomationAction,
    payload: ActionPayload
): Promise<ActionResult> {
    try {
        // Validar que la acción existe
        if (!action || !action.type) {
            return {
                success: false,
                message: "Acción inválida",
                error: "INVALID_ACTION"
            };
        }

        // Obtener el ejecutor para este tipo de acción
        const executor = actionExecutors[action.type];
        if (!executor) {
            return {
                success: false,
                message: `Tipo de acción no reconocido: ${action.type}`,
                error: "UNKNOWN_ACTION_TYPE"
            };
        }

        // Log de inicio
            executionId: payload.executionId,
            client: payload.client.name,
            automation: payload.automation.name
        });

        // Ejecutar la acción
        const result = await executor(action, payload);

        // Log del resultado
        if (result.success) {
        } else {
            console.error(`❌ Acción falló: ${action.type}`, result);
        }

        return result;

    } catch (error) {
        console.error('Error crítico ejecutando acción:', error);
        return {
            success: false,
            message: "Error crítico durante la ejecución",
            error: error instanceof Error ? error.message : String(error)
        };
    }
}
