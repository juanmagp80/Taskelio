import {
    analyzeProposal,
    generateContent,
    optimizeCommunication
} from '@/lib/openai';
import { createSupabaseAdmin } from '@/src/lib/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

interface AutomationTrigger {
    event: string;
    userId: string;
    data: any;
}

export async function POST(request: NextRequest) {
    try {
        const { event, userId, data }: AutomationTrigger = await request.json();


        const supabase = createSupabaseAdmin();

        // 1. Buscar automatizaciones activas para este evento
        const { data: automations, error: automationsError } = await supabase
            .from('ai_automations_config')
            .select('*')
            .eq('user_id', userId)
            .eq('trigger_event', event)
            .eq('is_active', true);

        if (automationsError || !automations.length) {
            return NextResponse.json({
                message: 'No automations found for this trigger',
                executed: 0
            });
        }


        const results = [];

        // 2. Ejecutar cada automatización
        for (const automation of automations) {
            const start = Date.now();
            try {

                // Verificar condiciones si existen
                if (automation.trigger_conditions && !checkConditions(data, automation.trigger_conditions)) {
                    continue;
                }

                // Generar contenido IA
                const aiResponse = await executeAIAction(automation, data);

                // Ejecutar integración externa
                const integrationResponse = await executeIntegration(
                    automation,
                    aiResponse,
                    data,
                    supabase
                );

                // Guardar log de ejecución
                await supabase
                    .from('automation_logs')
                    .insert({
                        automation_id: automation.id,
                        user_id: userId,
                        trigger_data: data,
                        ai_response: aiResponse,
                        integration_response: integrationResponse,
                        execution_status: 'success',
                        execution_time_ms: Date.now() - start
                    });

                // Actualizar contador de ejecución
                await supabase
                    .from('ai_automations_config')
                    .update({
                        execution_count: automation.execution_count + 1,
                        last_executed_at: new Date().toISOString()
                    })
                    .eq('id', automation.id);

                results.push({
                    automation: automation.name,
                    status: 'success',
                    ai_response: aiResponse,
                    integration_response: integrationResponse
                });

            } catch (error) {
                console.error(`❌ Error in automation ${automation.name}:`, error);

                // Guardar log de error
                await supabase
                    .from('automation_logs')
                    .insert({
                        automation_id: automation.id,
                        user_id: userId,
                        trigger_data: data,
                        execution_status: 'failed',
                        error_message: error instanceof Error ? error.message : 'Unknown error'
                    });

                results.push({
                    automation: automation.name,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return NextResponse.json({
            success: true,
            executed: results.length,
            results
        });

    } catch (error) {
        console.error('❌ Automation engine error:', error);
        return NextResponse.json({
            error: 'Automation engine failed'
        }, { status: 500 });
    }
}

// Funciones auxiliares

function checkConditions(data: any, conditions: any): boolean {
    // Implementar lógica de condiciones
    // Ejemplo: si el proyecto > $1000, si el cliente es VIP, etc.

    for (const [key, condition] of Object.entries(conditions)) {
        const value = getNestedValue(data, key);
        const cond = condition as any;

        if (cond.operator === 'equals' && value !== cond.value) {
            return false;
        }
        if (cond.operator === 'greater_than' && value <= cond.value) {
            return false;
        }
        if (cond.operator === 'contains' && !value?.includes(cond.value)) {
            return false;
        }
    }

    return true;
}

async function executeAIAction(automation: any, triggerData: any) {
    const { ai_action, ai_prompt_template } = automation;

    // Reemplazar variables en el template
    const prompt = replaceVariables(ai_prompt_template, triggerData);

    switch (ai_action) {
        case 'generate_proposal':
            return await generateContent('propuesta', prompt, 'cliente', 'professional');

        case 'generate_followup_email':
            return await generateContent('email', prompt, 'cliente', 'friendly');

        case 'optimize_communication':
            return await optimizeCommunication(triggerData.message, triggerData.context);

        case 'analyze_project_proposal':
            return await analyzeProposal(triggerData.proposal_text, triggerData.project_type);

        default:
            throw new Error(`Unknown AI action: ${ai_action}`);
    }
}

async function executeIntegration(automation: any, aiResponse: any, triggerData: any, supabase: any) {
    const { target_integration, integration_config, user_id } = automation;

    // Obtener credenciales de integración
    const { data: integration } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user_id)
        .eq('integration_type', target_integration)
        .eq('is_active', true)
        .single();

    if (!integration) {
        throw new Error(`Integration ${target_integration} not configured`);
    }

    switch (target_integration) {
        case 'email':
            return await sendEmail(aiResponse, integration_config, integration.api_credentials);

        case 'slack':
            return await sendSlackMessage(aiResponse, integration_config, integration.api_credentials);

        case 'activecampaign':
            return await createActiveCampaignContact(aiResponse, triggerData, integration.api_credentials);

        case 'zapier':
            return await triggerZapierWebhook(aiResponse, triggerData, integration.webhook_url);

        default:
            throw new Error(`Unknown integration: ${target_integration}`);
    }
}

// Integraciones específicas

async function sendEmail(aiResponse: any, config: any, credentials: any) {
    // Implementar con Resend/SendGrid
    const emailData = {
        to: config.recipient_email,
        subject: aiResponse.title || config.subject,
        html: aiResponse.content || aiResponse.optimizedMessage
    };

    // Llamada a API de email
    return { status: 'sent', email_id: 'mock_id' };
}

async function sendSlackMessage(aiResponse: any, config: any, credentials: any) {
    const slackMessage = {
        channel: config.channel,
        text: aiResponse.content || aiResponse.optimizedMessage,
        blocks: [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*🤖 IA Automation Result*\n${aiResponse.content}`
                }
            }
        ]
    };

    // Llamada a Slack API
    return { status: 'sent', channel: config.channel };
}

async function createActiveCampaignContact(aiResponse: any, triggerData: any, credentials: any) {
    const contactData = {
        email: triggerData.client_email,
        firstName: triggerData.client_name,
        tags: ['ai-generated', triggerData.project_type],
        customFields: {
            ai_analysis: aiResponse.content,
            project_budget: triggerData.budget
        }
    };

    // Llamada a ActiveCampaign API
    return { status: 'created', contact_id: 'mock_id' };
}

async function triggerZapierWebhook(aiResponse: any, triggerData: any, webhookUrl: string) {
    const payload = {
        ai_response: aiResponse,
        trigger_data: triggerData,
        timestamp: new Date().toISOString()
    };

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    return { status: response.ok ? 'triggered' : 'failed', webhook_url: webhookUrl };
}

// Utilidades

function replaceVariables(template: string, data: any): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
        return getNestedValue(data, path) || match;
    });
}

function getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}
