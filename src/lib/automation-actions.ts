// Sistema de acciones de automatización para Clyra
// Cada acción tiene un tipo específico y ejecuta una funcionalidad concreta

import { SupabaseClient, User } from '@supabase/supabase-js';
import emailService from './email-service';
import { analyzeSentiment, generateProposal, optimizePricing, prioritizeTasks, type SentimentAnalysisRequest, type ProposalGenerationRequest, type PricingOptimizationRequest, type TaskPrioritizationRequest } from '../../lib/openai';

// Tipos de acciones disponibles
export type ActionType = 
    | 'send_email'
    | 'create_invoice'
    | 'update_project_status'
    | 'create_calendar_event'
    | 'assign_task'
    | 'send_whatsapp'
    | 'generate_report'
    | 'create_proposal'
    | 'create_notification'
    | 'analyze_sentiment'        // 🆕 NUEVA
    | 'generate_ai_proposal'     // 🆕 NUEVA
    | 'optimize_pricing'         // 🆕 NUEVA
    | 'prioritize_tasks_ai';     // 🆕 NUEVA

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


        // Obtener información de la empresa y teléfono del usuario
        let userCompany = 'Mi Empresa';
        let userPhone = '';
        try {
            // 1. Buscar en company_settings
            const { data: companySettings, error: companyError } = await payload.supabase
                .from('company_settings')
                .select('company_name, phone')
                .eq('user_id', payload.user.id)
                .single();
            if (!companyError && companySettings) {
                if (companySettings.company_name) userCompany = companySettings.company_name;
                if (companySettings.phone) userPhone = companySettings.phone;
            } else {
                // 2. Fallback a profiles
                const { data: userProfile, error: profileError } = await payload.supabase
                    .from('profiles')
                    .select('company, phone')
                    .eq('id', payload.user.id)
                    .single();
                if (!profileError && userProfile) {
                    if (userProfile.company) userCompany = userProfile.company;
                    if (userProfile.phone) userPhone = userProfile.phone;
                }
            }
        } catch (error) {
            console.warn('⚠️ No se pudo obtener empresa/teléfono del usuario, usando valores por defecto');
        }
        

        // Preparar variables para el template
        const variables = {
            client_name: payload.client.name,
            client_email: payload.client.email,
            client_company: payload.client.company || payload.client.name,
            user_name: payload.user?.user_metadata?.full_name || payload.user?.email?.split('@')[0] || 'Equipo Taskelio',
            user_email: payload.user?.email || 'noreply@taskelio.app',
            user_company: userCompany,
            user_phone: userPhone,
            user_position: 'Director de Proyectos',
            // Variables de presupuesto
            project_name: (payload as any).project_name || '',
            budget_total: (payload as any).budget_total || '',
            budget_spent: (payload as any).budget_spent || '',
            budget_percentage: (payload as any).budget_percentage || '',
            budget_remaining: (payload as any).budget_remaining || '',
            // Variables de reunión
            meeting_title: (payload as any).meeting_title || '',
            meeting_date: (payload as any).meeting_date || '',
            meeting_time: (payload as any).meeting_time || '',
            meeting_location: (payload as any).meeting_location || '',
            ...emailData.variables
        };

        // Reemplazar variables en el template
        let emailContent = emailData.template;
        let emailSubject = emailData.subject;
        
        Object.entries(variables).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            emailContent = emailContent.replace(regex, String(value));
            emailSubject = emailSubject.replace(regex, String(value));
        });

        // Registrar comunicación en la base de datos (opcional)
        let communicationData = null;
        try {
            const { data: commData, error: commError } = await payload.supabase
                .from('client_communications')
                .insert({
                    user_id: payload.user.id,
                    client_id: payload.client.id,
                    type: 'email',
                    subject: emailSubject, // Usar el asunto con variables reemplazadas
                    content: emailContent,
                    status: 'sent',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (commError) {
                console.warn('⚠️ No se pudo registrar la comunicación (tabla no existe):', commError.message);
                // Continuar sin registrar la comunicación
            } else {
                communicationData = commData;
            }
        } catch (commError) {
            console.warn('⚠️ Error registrando comunicación, continuando sin registrar:', commError);
            // Continuar sin fallar
        }

        // Determinar email de destino basado en el parámetro to_user
        // Convertir a boolean correctamente (puede venir como string "true" desde JSON)
        const sendToUser = emailData.to_user === true || emailData.to_user === 'true';
        const recipientEmail = sendToUser
            ? (payload.user.email || 'noreply@taskelio.app')  // Enviar al usuario (freelancer)
            : (payload.client.email || ''); // Enviar al cliente (comportamiento por defecto)

        // Validar que tengamos un email válido
        if (!recipientEmail) {
            return {
                success: false,
                message: "No se encontró email válido para el destinatario",
                error: "Missing recipient email"
            };
        }


        // Enviar email usando el servicio real
        const emailResult = await emailService.sendEmail({
            to: recipientEmail,
            subject: emailSubject, // Usar el asunto con variables reemplazadas
            html: emailContent, // Ya viene como HTML del template
            from: `${variables.user_name} <noreply@taskelio.app>`, // Usar dominio verificado
            userId: payload.user.id
        });

        if (!emailResult.success) {
            return {
                success: false,
                message: `Error enviando email: ${emailResult.message}`,
                error: emailResult.error
            };
        }

        return {
            success: true,
            message: `Email "${emailSubject}" enviado correctamente a ${recipientEmail}`,
            data: {
                communicationId: communicationData?.id || null,
                recipient: recipientEmail,
                subject: emailSubject, // Usar el asunto con variables reemplazadas
                emailResult: emailResult.data,
                sentToUser: sendToUser
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

        // Reemplazar variables en título y descripción
        let processedTitle = taskData.title;
        let processedDescription = taskData.description || `Tarea automática generada para ${payload.client.name}`;

        // Reemplazos básicos
        const replacements = {
            '{{client_name}}': payload.client.name,
            '{{client_company}}': payload.client.company || payload.client.name,
            '{{user_name}}': payload.user?.user_metadata?.full_name || 'Usuario',
            // Variables específicas de proyecto si están disponibles
            '{{project_name}}': (payload as any).project_name || '',
            '{{project_id}}': (payload as any).project_id || '',
            '{{end_date}}': (payload as any).end_date || '',
            '{{days_overdue}}': (payload as any).days_overdue || '',
            '{{project_status}}': (payload as any).project_status || '',
            '{{budget}}': (payload as any).budget || ''
        };

        // Aplicar todos los reemplazos
        for (const [placeholder, value] of Object.entries(replacements)) {
            processedTitle = processedTitle.replace(new RegExp(placeholder, 'g'), value);
            processedDescription = processedDescription.replace(new RegExp(placeholder, 'g'), value);
        }

        // Crear la tarea
        const taskInsert = {
            user_id: payload.user.id,
            // NO incluir client_id porque no existe en la tabla tasks
            project_id: taskData.project_id || (payload as any).project_id || null,
            title: processedTitle,
            description: processedDescription,
            status: taskData.status || 'pending',
            priority: taskData.priority || 'medium',
            category: taskData.category || 'general', // Agregar categoría por defecto
            due_date: dueDate?.toISOString() || null
        };


        const { data: taskCreated, error: taskError } = await payload.supabase
            .from('tasks')
            .insert([taskInsert]) // Usar array como en el ejemplo
            .select()
            .single();

        if (taskError) {
            console.error('Error creando tarea:', taskError);
            console.error('Código de error:', taskError.code);
            console.error('Mensaje de error:', taskError.message);
            console.error('Detalles del error:', taskError.details);
            console.error('Hint del error:', taskError.hint);
            console.error('Datos que se intentaron insertar:', taskInsert);
            
            return {
                success: false,
                message: `Error al crear la tarea: ${taskError.message || taskError.code || 'Error desconocido'}`,
                error: taskError.message || JSON.stringify(taskError)
            };
        }

        return {
            success: true,
            message: `Tarea "${processedTitle}" creada y asignada correctamente`,
            data: {
                taskId: taskCreated.id,
                title: taskCreated.title,
                description: taskCreated.description,
                dueDate: taskCreated.due_date,
                client: payload.client.name,
                priority: taskCreated.priority,
                status: taskCreated.status
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

// Implementación específica para crear notificaciones internas
const createNotificationAction: ActionExecutor = async (action, payload) => {
    try {
        const notificationData = action.parameters;
        
        // Validar parámetros requeridos
        if (!notificationData.title || !notificationData.message) {
            return {
                success: false,
                message: "Faltan parámetros requeridos: title y message",
                error: "Missing required parameters"
            };
        }

        // Preparar variables para el template
        const variables = {
            client_name: payload.client.name,
            client_email: payload.client.email,
            client_company: payload.client.company || payload.client.name,
            user_name: payload.user?.user_metadata?.full_name || payload.user?.email?.split('@')[0] || 'Usuario',
            project_name: (payload as any).project_name || '',
            project_status: (payload as any).project_status || '',
            end_date: (payload as any).end_date || '',
            days_overdue: (payload as any).days_overdue || '0',
            budget: (payload as any).budget || '0',
        };

        // Reemplazar variables en el título y mensaje
        let processedTitle = notificationData.title;
        let processedMessage = notificationData.message;

        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{{${key}}}`;
            processedTitle = processedTitle.replace(new RegExp(placeholder, 'g'), String(value));
            processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), String(value));
        });

        // Crear la notificación en Supabase con estructura mínima
        const notificationInsert: any = {
            user_id: payload.user.id,
            title: processedTitle,
            message: processedMessage,
            is_read: false
        };

        // Solo agregar columnas opcionales si están disponibles
        try {
            // Intentar agregar type si existe
            if (notificationData.type) {
                notificationInsert.type = notificationData.type;
            }
        } catch (error) {
            console.warn('⚠️ Columna type no disponible');
        }

        try {
            // Intentar agregar route si existe
            if (notificationData.route) {
                notificationInsert.route = notificationData.route;
            }
        } catch (error) {
            console.warn('⚠️ Columna route no disponible');
        }

        try {
            // Intentar agregar action_data si existe
            if (notificationData.action_data || Object.keys(variables).length > 0) {
                notificationInsert.action_data = {
                    automationId: payload.automation.id,
                    clientId: payload.client.id,
                    executionId: payload.executionId,
                    ...(notificationData.action_data || {})
                };
            }
        } catch (error) {
            console.warn('⚠️ Columna action_data no disponible');
        }

        const { data, error } = await payload.supabase
            .from('user_notifications')
            .insert(notificationInsert)
            .select()
            .single();

        if (error) {
            console.error('❌ Error creando notificación:', error);
            return {
                success: false,
                message: `Error creando notificación: ${error.message}`,
                error: error.code
            };
        }

        return {
            success: true,
            message: `Notificación creada: ${processedTitle}`,
            data: {
                notificationId: data.id,
                title: processedTitle,
                message: processedMessage
            }
        };

    } catch (error) {
        console.error('❌ Error crítico en createNotificationAction:', error);
        return {
            success: false,
            message: "Error crítico creando notificación",
            error: error instanceof Error ? error.message : String(error)
        };
    }
};

// =============================================================================
// 🆕 NUEVAS ACCIONES DE IA REALES
// =============================================================================

// Análisis de sentimiento con IA
const analyzeSentimentAction: ActionExecutor = async (action, payload) => {
    try {
        const params = action.parameters;
        
        if (!params.text) {
            return {
                success: false,
                message: "Texto para análisis es requerido",
                error: "MISSING_TEXT"
            };
        }

        // Realizar análisis de sentimiento
        const sentimentRequest: SentimentAnalysisRequest = {
            text: params.text,
            clientName: payload.client.name,
            context: params.context
        };

        const result = await analyzeSentiment(sentimentRequest);

        // Guardar resultado en base de datos
        const { data: sentimentData, error: dbError } = await payload.supabase
            .from('client_communications')
            .insert({
                user_id: payload.user.id,
                client_id: payload.client.id,
                type: 'sentiment_analysis',
                content: params.text,
                sentiment_score: result.confidence,
                sentiment_label: result.sentiment,
                keywords: result.keywords,
                metadata: {
                    urgency: result.urgency,
                    summary: result.summary,
                    actionRequired: result.actionRequired,
                    suggestedResponse: result.suggestedResponse,
                    automationId: payload.automation.id
                }
            })
            .select()
            .single();

        // Si es negativo y requiere acción, crear tarea urgente
        if (result.actionRequired && result.sentiment === 'negative') {
            await payload.supabase
                .from('tasks')
                .insert({
                    user_id: payload.user.id,
                    title: `🚨 Cliente requiere atención: ${payload.client.name}`,
                    description: `Sentimiento negativo detectado (${Math.round(result.confidence * 100)}% confianza).\n\nResumen: ${result.summary}\n\nSugerencia: ${result.suggestedResponse}`,
                    priority: 'high',
                    category: 'client_management',
                    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
                    status: 'pending'
                });
        }

        return {
            success: true,
            message: `Análisis completado: ${result.sentiment} (${Math.round(result.confidence * 100)}% confianza)`,
            data: {
                sentiment: result.sentiment,
                confidence: result.confidence,
                urgency: result.urgency,
                keywords: result.keywords,
                summary: result.summary,
                actionRequired: result.actionRequired,
                suggestedResponse: result.suggestedResponse,
                recordId: sentimentData?.id
            }
        };

    } catch (error) {
        console.error('Error en analyzeSentimentAction:', error);
        return {
            success: false,
            message: "Error analizando sentimiento con IA",
            error: error instanceof Error ? error.message : String(error)
        };
    }
};

// Generación automática de propuestas con IA
const generateAIProposalAction: ActionExecutor = async (action, payload) => {
    try {
        const params = action.parameters;
        
        if (!params.clientBrief) {
            return {
                success: false,
                message: "Brief del cliente es requerido",
                error: "MISSING_BRIEF"
            };
        }

        // Generar propuesta con IA
        const proposalRequest: ProposalGenerationRequest = {
            clientName: payload.client.name,
            clientBrief: params.clientBrief,
            projectType: params.projectType || 'consulting',
            budget: params.budget,
            timeline: params.timeline,
            requirements: params.requirements || [],
            userExpertise: params.userExpertise
        };

        const result = await generateProposal(proposalRequest);

        // Guardar propuesta en base de datos
        const { data: proposalData, error: dbError } = await payload.supabase
            .from('proposals')
            .insert({
                user_id: payload.user.id,
                client_id: payload.client.id,
                title: result.title,
                description: result.executive_summary,
                total_amount: result.total_budget,
                currency: 'EUR',
                status: 'draft',
                content: JSON.stringify({
                    executive_summary: result.executive_summary,
                    scope_of_work: result.scope_of_work,
                    timeline: result.timeline,
                    budget_breakdown: result.budget_breakdown,
                    terms_and_conditions: result.terms_and_conditions,
                    next_steps: result.next_steps,
                    generated_by_ai: true,
                    automation_id: payload.automation.id
                }),
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (dbError) {
            console.warn('⚠️ No se pudo guardar propuesta en BD:', dbError.message);
        }

        return {
            success: true,
            message: `Propuesta "${result.title}" generada automáticamente`,
            data: {
                proposalId: proposalData?.id,
                title: result.title,
                budget: result.total_budget,
                scope: result.scope_of_work.length + ' elementos',
                timeline: result.timeline,
                proposal: result
            }
        };

    } catch (error) {
        console.error('Error en generateAIProposalAction:', error);
        return {
            success: false,
            message: "Error generando propuesta con IA",
            error: error instanceof Error ? error.message : String(error)
        };
    }
};

// Optimización inteligente de precios
const optimizePricingAction: ActionExecutor = async (action, payload) => {
    try {
        const params = action.parameters;
        
        if (!params.projectType || !params.projectScope) {
            return {
                success: false,
                message: "Tipo de proyecto y alcance son requeridos",
                error: "MISSING_PROJECT_DATA"
            };
        }

        // Optimizar precios con IA
        const pricingRequest: PricingOptimizationRequest = {
            projectType: params.projectType,
            projectScope: params.projectScope,
            clientBudget: params.clientBudget,
            timeline: params.timeline || '4-6 semanas',
            complexity: params.complexity || 'medium',
            userExperience: params.userExperience || 'mid',
            marketData: params.marketData
        };

        const result = await optimizePricing(pricingRequest);

        // Crear notificación con recomendación de precio
        await payload.supabase
            .from('user_notifications')
            .insert({
                user_id: payload.user.id,
                title: `💰 Precio optimizado para ${payload.client.name}`,
                message: `IA recomienda €${result.recommended_price} (${result.market_position}). Rango: €${result.price_range.min}-€${result.price_range.max}`,
                type: 'pricing_recommendation',
                is_read: false,
                action_data: {
                    clientId: payload.client.id,
                    automationId: payload.automation.id,
                    pricingData: result
                }
            });

        return {
            success: true,
            message: `Precio optimizado: €${result.recommended_price} (confianza: ${Math.round(result.confidence * 100)}%)`,
            data: {
                recommended_price: result.recommended_price,
                price_range: result.price_range,
                reasoning: result.reasoning,
                confidence: result.confidence,
                market_position: result.market_position
            }
        };

    } catch (error) {
        console.error('Error en optimizePricingAction:', error);
        return {
            success: false,
            message: "Error optimizando precios con IA",
            error: error instanceof Error ? error.message : String(error)
        };
    }
};

// Priorización inteligente de tareas
const prioritizeTasksAIAction: ActionExecutor = async (action, payload) => {
    try {
        const params = action.parameters;
        
        // Obtener tareas del usuario
        const { data: tasksData, error: tasksError } = await payload.supabase
            .from('tasks')
            .select('id, title, description, due_date, priority, status')
            .eq('user_id', payload.user.id)
            .in('status', ['pending', 'in_progress']);

        if (tasksError || !tasksData || tasksData.length === 0) {
            return {
                success: false,
                message: "No se encontraron tareas para priorizar",
                error: "NO_TASKS_FOUND"
            };
        }

        // Preparar tareas para IA
        const taskRequest: TaskPrioritizationRequest = {
            tasks: tasksData.map(task => ({
                id: task.id,
                title: task.title,
                description: task.description,
                deadline: task.due_date,
                estimatedHours: params.estimatedHours || 2
            })),
            workload: params.workload || 40,
            priorities: params.priorities || []
        };

        const result = await prioritizeTasks(taskRequest);

        // Actualizar prioridades en base de datos
        let updatedCount = 0;
        for (const task of result.prioritized_tasks) {
            // Buscar la tarea original para preservar la descripción
            const originalTask = tasksData.find(t => t.id === task.id);
            const updatedDescription = originalTask?.description ? 
                `${originalTask.description}\n\n🤖 IA: ${task.reasoning}` : 
                `🤖 IA: ${task.reasoning}`;

            const { error: updateError } = await payload.supabase
                .from('tasks')
                .update({
                    priority: task.priority_level,
                    description: updatedDescription
                })
                .eq('id', task.id)
                .eq('user_id', payload.user.id);

            if (!updateError) updatedCount++;
        }

        return {
            success: true,
            message: `${updatedCount} tareas repriorizadas con IA`,
            data: {
                prioritized_tasks: result.prioritized_tasks,
                workload_analysis: result.workload_analysis,
                updated_count: updatedCount
            }
        };

    } catch (error) {
        console.error('Error en prioritizeTasksAIAction:', error);
        return {
            success: false,
            message: "Error priorizando tareas con IA",
            error: error instanceof Error ? error.message : String(error)
        };
    }
};

// =============================================================================
// REGISTRO DE EJECUTORES DE ACCIONES
// =============================================================================

const actionExecutors: Record<ActionType, ActionExecutor> = {
    send_email: sendEmailAction,
    assign_task: assignTaskAction,
    update_project_status: updateProjectStatusAction,
    create_notification: createNotificationAction,
    create_invoice: notImplementedAction,
    create_calendar_event: notImplementedAction,
    send_whatsapp: notImplementedAction,
    generate_report: notImplementedAction,
    create_proposal: notImplementedAction,
    // 🆕 NUEVAS ACCIONES DE IA REALES
    analyze_sentiment: analyzeSentimentAction,
    generate_ai_proposal: generateAIProposalAction,
    optimize_pricing: optimizePricingAction,
    prioritize_tasks_ai: prioritizeTasksAIAction
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

        // Forzar plantilla profesional para onboarding IA
        if (action.type === 'send_email' && action.parameters?.trigger === 'client_onboarding') {
            action.parameters.subject = '¡Bienvenido/a a {{user_company}}!';
            action.parameters.template = `
<p>Estimado/a {{client_name}},</p>
<p>Nos complace darle la bienvenida a {{user_company}}. Estamos emocionados de comenzar esta colaboración y de ayudarle a alcanzar sus objetivos.</p>
<p>Para asegurarnos de que su incorporación sea lo más fluida posible, hemos preparado algunos pasos iniciales:</p>
<ol>
  <li><strong>Programar una llamada de bienvenida:</strong> Nos gustaría conocer más sobre sus necesidades y responder cualquier pregunta que pueda tener.</li>
  <li><strong>Revisar nuestra documentación:</strong> Le recomendamos que consulte nuestra documentación en línea para que pueda comprender mejor nuestros servicios y procesos.</li>
</ol>
<p>Si tiene alguna pregunta o necesita asistencia adicional, no dude en contactarse conmigo directamente a {{user_email}} o al teléfono <b>{{user_phone}}</b>.</p>
<p>¡Esperamos colaborar con usted!</p>
<p>Saludos cordiales,<br>{{user_name}}<br>{{user_position}}<br>{{user_company}}</p>
`;
        }        // Obtener el ejecutor para este tipo de acción
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
