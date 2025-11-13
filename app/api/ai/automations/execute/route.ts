import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/src/lib/supabase-admin';
import { 
    analyzeFeedback, 
    optimizeCommunication, 
    analyzeProposal, 
    generateContent, 
    detectProjectRisks, 
    analyzePerformance, 
    analyzePricing,
    generateSmartEmail,
    generateDynamicForm,
    scheduleSmartMeeting,
    generateCalendarLink
} from '@/lib/openai';

// Tipos para la request
interface AutomationRequest {
    type: string;
    data: any;
    userId: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: AutomationRequest = await request.json();
        const { type, data, userId: userEmail } = body;


        const supabase = createSupabaseAdmin();
        
        // Obtener el ID del usuario desde el email usando la tabla profiles
        
        let userId: string | null = null;
        
        // Intentar buscar primero en profiles
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, email')
            .eq('email', userEmail)
            .single();

        if (profile?.id) {
            userId = profile.id;
        } else {
            // Si no se encuentra en profiles, buscar en auth.users como fallback
            
            const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
            
            if (authError) {
                console.error('❌ Error listing auth users:', authError);
                return NextResponse.json({ 
                    error: 'Error de autenticación del servidor' 
                }, { status: 500 });
            }
            
            const authUser = authData.users.find(u => u.email === userEmail);
            
            if (authUser) {
                userId = authUser.id;
                
                // Crear perfil si no existe
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: userId,
                        email: userEmail,
                        full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuario',
                        updated_at: new Date().toISOString()
                    });
                
                if (!insertError) {
                }
            } else {
                console.error('❌ User not found in profiles or auth.users:', userEmail);
                return NextResponse.json({ 
                    error: 'Usuario no encontrado. Verifica que estés autenticado correctamente.' 
                }, { status: 404 });
            }
        }
        
        // Validar que tenemos un userId antes de continuar
        if (!userId) {
            console.error('❌ No userId obtained');
            return NextResponse.json({ 
                error: 'Error obteniendo ID de usuario' 
            }, { status: 500 });
        }
        
        let result: any = null;


        switch (type) {
            case 'sentiment_analysis':
                result = await executeSentimentAnalysis(data, userId, supabase);
                break;
            
            case 'communication_optimization':
                result = await executeCommunicationOptimization(data, userId, supabase);
                break;
            
            case 'proposal_analysis':
                result = await executeProposalAnalysis(data, userId, supabase);
                break;
            
            case 'content_generation':
                result = await executeContentGeneration(data, userId, supabase);
                break;
            
            case 'risk_detection':
                result = await executeRiskDetection(data, userId, supabase);
                break;
            
            case 'performance_analysis':
                result = await executePerformanceAnalysis(data, userId, supabase);
                break;
            
            case 'pricing_optimization':
                result = await executePricingOptimization(data, userId, supabase);
                break;
            
            // 🔄 NUEVOS WORKFLOWS AUTOMÁTICOS
            case 'smart_email':
                result = await executeSmartEmail(data, userId, supabase);
                break;
            
            case 'dynamic_form':
                result = await executeDynamicForm(data, userId, supabase);
                break;
            
            case 'smart_meeting':
                result = await executeSmartMeeting(data, userId, supabase);
                break;
            
            case 'calendar_link':
                result = await executeCalendarLink(data, userId, supabase);
                break;
            
            default:
                return NextResponse.json({ 
                    error: 'Tipo de automatización no soportado' 
                }, { status: 400 });
        }

        return NextResponse.json({ 
            success: true, 
            data: result 
        });

    } catch (error) {
        console.error('❌ Error in automation endpoint:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Error interno del servidor'
        }, { status: 500 });
    }
}

// Funciones de automatización

async function executeSentimentAnalysis(data: any, userId: string, supabase: any) {
    try {
        const { text, clientId, source = 'manual' } = data;
        
        // Analizar sentimiento con OpenAI
        const analysis = await analyzeFeedback(text);
        
        // Buscar información del cliente si existe
        let clientData = null;
        if (clientId) {
            const { data: client } = await supabase
                .from('clients')
                .select('name, email, company')
                .eq('id', clientId)
                .eq('user_id', userId)
                .single();
            clientData = client;
        }
        
        // Preparar datos para inserción
        const insertData = {
            user_id: userId,
            insight_type: 'sentiment_analysis',
            category: 'client_feedback',
            title: `Análisis de Sentimiento - ${clientData?.name || 'Cliente'}`,
            description: `Análisis automático de feedback: ${analysis.sentiment.toUpperCase()}`,
            data_points: {
                original_text: text,
                sentiment: analysis.sentiment,
                confidence: analysis.confidence,
                emotions: analysis.emotions,
                urgency: analysis.urgency,
                client_data: clientData,
                source
            },
            confidence_score: analysis.confidence,
            impact_score: analysis.sentiment === 'negative' ? 9 : analysis.sentiment === 'positive' ? 7 : 5,
            actionability_score: analysis.urgency === 'high' ? 10 : analysis.urgency === 'medium' ? 7 : 4,
            recommendations: analysis.recommendations,
            suggested_actions: analysis.suggested_actions
        };
        
        
        const { data: savedAnalysis, error } = await supabase
            .from('ai_insights')
            .insert(insertData)
            .select()
            .single();

        if (error) {
            console.error('❌ Error saving sentiment analysis:', error);
            throw new Error('Error guardando análisis de sentimiento: ' + error.message);
        }
        

        // Si es negativo y urgente, crear tarea automática
        if (analysis.sentiment === 'negative' && analysis.urgency === 'high') {
            await supabase
                .from('tasks')
                .insert({
                    user_id: userId,
                    client_id: clientId,
                    title: `🚨 URGENTE: Atender feedback negativo de ${clientData?.name || 'cliente'}`,
                    description: `Análisis IA detectó feedback muy negativo que requiere atención inmediata.\n\nTexto original: "${text}"\n\nRecomendaciones IA: ${analysis.recommendations.join(', ')}`,
                    priority: 'high',
                    status: 'pending',
                    due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                    category: 'client_management'
                });
        }

        return {
            success: true,
            analysis,
            saved_id: savedAnalysis.id,
            message: `Análisis de sentimiento completado: ${analysis.sentiment.toUpperCase()} (${Math.round(analysis.confidence * 100)}% confianza)`
        };
        
    } catch (error) {
        console.error('❌ Error in executeSentimentAnalysis:', error);
        throw error;
    }
}

async function executeCommunicationOptimization(data: any, userId: string, supabase: any) {
    const { originalMessage, context, clientId } = data;
    
    // Optimizar comunicación con OpenAI
    const optimization = await optimizeCommunication(originalMessage, context);
    
    // Buscar información del cliente si existe
    let clientData = null;
    if (clientId) {
        const { data: client } = await supabase
            .from('clients')
            .select('name, email, company')
            .eq('id', clientId)
            .eq('user_id', userId)
            .single();
        clientData = client;
    }
    
    // Guardar resultado en base de datos
    const { data: savedOptimization, error } = await supabase
        .from('ai_insights')
        .insert({
            user_id: userId,
            insight_type: 'communication_optimization',
            category: 'communication',
            title: `Optimización de Comunicación - ${clientData?.name || 'Cliente'}`,
            description: `Mensaje optimizado para mejorar claridad y profesionalismo`,
            data_points: {
                original_message: originalMessage,
                optimized_message: optimization.optimizedMessage,
                context,
                improvements: optimization.improvements,
                tone_analysis: optimization.toneAnalysis,
                client_data: clientData
            },
            confidence_score: optimization.confidence,
            impact_score: 8,
            actionability_score: 9,
            recommendations: optimization.suggestions,
            suggested_actions: [{
                action: 'use_optimized_message',
                description: 'Usar el mensaje optimizado para mejorar la comunicación',
                priority: 'high'
            }]
        })
        .select()
        .single();

    if (error) {
        console.error('Error saving communication optimization:', error);
        throw new Error('Error guardando optimización de comunicación');
    }

    return {
        optimization,
        saved_insight_id: savedOptimization.id
    };
}

// Implementar las demás funciones de manera similar...
async function executeProposalAnalysis(data: any, userId: string, supabase: any) {
    const { proposalText, clientId, projectType } = data;
    const analysis = await analyzeProposal(proposalText, projectType);
    
    const { data: savedAnalysis, error } = await supabase
        .from('ai_insights')
        .insert({
            user_id: userId,
            insight_type: 'proposal_analysis',
            category: 'sales',
            title: `Análisis de Propuesta - ${projectType}`,
            description: `Análisis detallado de propuesta comercial`,
            data_points: analysis,
            confidence_score: analysis.confidence,
            impact_score: 8,
            actionability_score: 8,
            recommendations: analysis.recommendations
        })
        .select()
        .single();

    if (error) throw new Error('Error guardando análisis de propuesta');
    return { analysis, saved_insight_id: savedAnalysis.id };
}

async function executeContentGeneration(data: any, userId: string, supabase: any) {
    const { contentType, topic, targetAudience, tone } = data;
    const content = await generateContent(contentType, topic, targetAudience, tone);
    
    const { data: savedContent, error } = await supabase
        .from('ai_insights')
        .insert({
            user_id: userId,
            insight_type: 'content_generation',
            category: 'productivity',
            title: `Contenido Generado - ${contentType}`,
            description: `Contenido automático sobre: ${topic}`,
            data_points: content,
            confidence_score: content.confidence,
            impact_score: 7,
            actionability_score: 9
        })
        .select()
        .single();

    if (error) throw new Error('Error guardando contenido generado');
    return { content, saved_insight_id: savedContent.id };
}

async function executeRiskDetection(data: any, userId: string, supabase: any) {
    const { projectId } = data;
    const risks = await detectProjectRisks(projectId);
    
    const { data: savedRisks, error } = await supabase
        .from('ai_insights')
        .insert({
            user_id: userId,
            insight_type: 'risk_detection',
            category: 'project_management',
            title: `Detección de Riesgos - Proyecto`,
            description: `Análisis de riesgos del proyecto`,
            data_points: risks,
            confidence_score: risks.confidence,
            impact_score: 9,
            actionability_score: 8,
            recommendations: risks.recommendations
        })
        .select()
        .single();

    if (error) throw new Error('Error guardando detección de riesgos');
    return { risks, saved_insight_id: savedRisks.id };
}

async function executePerformanceAnalysis(data: any, userId: string, supabase: any) {
    const { period } = data;
    const performance = await analyzePerformance(userId, period);
    
    const { data: savedPerformance, error } = await supabase
        .from('ai_insights')
        .insert({
            user_id: userId,
            insight_type: 'performance_analysis',
            category: 'analytics',
            title: `Análisis de Rendimiento - ${period}`,
            description: `Análisis detallado de rendimiento`,
            data_points: performance,
            confidence_score: performance.confidence,
            impact_score: 8,
            actionability_score: 7,
            recommendations: performance.recommendations
        })
        .select()
        .single();

    if (error) throw new Error('Error guardando análisis de rendimiento');
    return { performance, saved_insight_id: savedPerformance.id };
}

async function executePricingOptimization(data: any, userId: string, supabase: any) {
    const { projectType, scope, currentPrice } = data;
    const pricing = await analyzePricing(projectType, scope, currentPrice);
    
    const { data: savedPricing, error } = await supabase
        .from('ai_insights')
        .insert({
            user_id: userId,
            insight_type: 'pricing_optimization',
            category: 'sales',
            title: `Optimización de Precios - ${projectType}`,
            description: `Análisis y optimización de precios`,
            data_points: pricing,
            confidence_score: pricing.confidence,
            impact_score: 9,
            actionability_score: 8,
            recommendations: pricing.recommendations
        })
        .select()
        .single();

    if (error) throw new Error('Error guardando optimización de precios');
    return { pricing, saved_insight_id: savedPricing.id };
}

// ========================================
// 🔄 FUNCIONES DE WORKFLOWS AUTOMÁTICOS
// ========================================

async function executeSmartEmail(data: any, userId: string, supabase: any) {
    const { trigger, context } = data;
    const email = await generateSmartEmail(trigger, context);
    
    const { data: savedEmail, error } = await supabase
        .from('ai_insights')
        .insert({
            user_id: userId,
            insight_type: 'smart_email',
            category: 'workflow',
            title: `Email Inteligente - ${trigger}`,
            description: `Email generado automáticamente: ${email.subject}`,
            data_points: email,
            confidence_score: 0.9,
            impact_score: 7,
            actionability_score: 9,
            recommendations: email.next_steps || []
        })
        .select()
        .single();

    if (error) throw new Error('Error guardando email inteligente');
    return { email, saved_insight_id: savedEmail.id };
}

async function executeDynamicForm(data: any, userId: string, supabase: any) {
    const { purpose, context } = data;
    const form = await generateDynamicForm(purpose, context);
    
    const { data: savedForm, error } = await supabase
        .from('ai_insights')
        .insert({
            user_id: userId,
            insight_type: 'dynamic_form',
            category: 'workflow',
            title: `Formulario Dinámico - ${purpose}`,
            description: `${form.title}: ${form.description}`,
            data_points: form,
            confidence_score: 0.85,
            impact_score: 6,
            actionability_score: 8,
            recommendations: [`Tiempo estimado: ${form.estimated_time}`, form.next_action]
        })
        .select()
        .single();

    if (error) throw new Error('Error guardando formulario dinámico');
    return { form, saved_insight_id: savedForm.id };
}

async function executeSmartMeeting(data: any, userId: string, supabase: any) {
    const { purpose, participants, context } = data;
    const meeting = await scheduleSmartMeeting(purpose, participants, context);
    
    const { data: savedMeeting, error } = await supabase
        .from('ai_insights')
        .insert({
            user_id: userId,
            insight_type: 'smart_meeting',
            category: 'workflow',
            title: `Reunión Inteligente - ${purpose}`,
            description: `${meeting.meeting_title} (${meeting.duration_minutes} min)`,
            data_points: meeting,
            confidence_score: 0.88,
            impact_score: 8,
            actionability_score: 9,
            recommendations: meeting.follow_up_actions || []
        })
        .select()
        .single();

    if (error) throw new Error('Error guardando reunión inteligente');
    return { meeting, saved_insight_id: savedMeeting.id };
}

async function executeCalendarLink(data: any, userId: string, supabase: any) {
    const { event_type, duration, context } = data;
    const calendar = await generateCalendarLink(event_type, duration, context);
    
    const { data: savedCalendar, error } = await supabase
        .from('ai_insights')
        .insert({
            user_id: userId,
            insight_type: 'calendar_link',
            category: 'workflow',
            title: `Enlace de Calendario - ${event_type}`,
            description: `${calendar.event_title} configurado`,
            data_points: calendar,
            confidence_score: 0.9,
            impact_score: 7,
            actionability_score: 10,
            recommendations: calendar.meeting_objectives || []
        })
        .select()
        .single();

    if (error) throw new Error('Error guardando enlace de calendario');
    return { calendar, saved_insight_id: savedCalendar.id };
}
