import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createSupabaseServerClient } from '@/src/lib/supabase-server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { proposalId } = await req.json();

    if (!proposalId) {
      return NextResponse.json({ error: 'ID de propuesta es requerido' }, { status: 400 });
    }

    // Crear cliente Supabase
    const supabase = await createSupabaseServerClient();

    // Obtener usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 });
    }

    // Obtener la propuesta específica
    const { data: proposal, error: proposalError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .eq('user_id', user.id)
      .single();

    if (proposalError || !proposal) {
      return NextResponse.json({ error: 'Propuesta no encontrada' }, { status: 404 });
    }

    // Preparar el contexto para OpenAI
    const proposalContext = `
    PROPUESTA A ANALIZAR:
    
    Título: ${proposal.title}
    Cliente: ${proposal.prospect_name || 'No especificado'}
    Email: ${proposal.prospect_email || 'No especificado'}
    Descripción: ${proposal.description || 'Sin descripción'}
    
    Estado actual: ${proposal.status}
    Valor total: ${proposal.total_amount} ${proposal.currency}
    Fecha de creación: ${proposal.created_at}
    Válida hasta: ${proposal.valid_until || 'No especificado'}
    
    Servicios: ${JSON.stringify(proposal.services, null, 2)}
    Precios: ${JSON.stringify(proposal.pricing, null, 2)}
    Términos: ${JSON.stringify(proposal.terms, null, 2)}
    Timeline: ${JSON.stringify(proposal.timeline, null, 2)}
    
    Notas: ${proposal.notes || 'Sin notas adicionales'}
    `;


    // Llamada a OpenAI para análisis
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Eres un consultor experto en análisis de propuestas comerciales. Analiza la propuesta y responde ÚNICAMENTE con un JSON válido sin explicaciones adicionales.

          Estructura JSON requerida:
          {
            "overall_score": number (1-10),
            "competitiveness": "high" | "medium" | "low",
            "success_probability": number (0-1),
            "strengths": ["punto fuerte 1", "punto fuerte 2"],
            "weaknesses": ["debilidad 1", "debilidad 2"],
            "pricing_analysis": {
              "assessment": "competitive" | "expensive" | "cheap",
              "market_position": "premium" | "standard" | "budget",
              "recommendation": "texto explicativo"
            },
            "risk_factors": ["riesgo 1", "riesgo 2"],
            "improvement_suggestions": ["mejora 1", "mejora 2", "mejora 3"],
            "next_actions": ["acción 1", "acción 2"],
            "conversion_tips": ["tip 1", "tip 2"]
          }

          CRÍTICO: Responde SOLO con el JSON, sin texto adicional antes o después.`
        },
        {
          role: "user",
          content: `Analiza esta propuesta comercial:

TÍTULO: ${proposal.title}
CLIENTE: ${proposal.prospect_name || 'No especificado'}
VALOR: ${proposal.total_amount} ${proposal.currency}
ESTADO: ${proposal.status}

DESCRIPCIÓN: ${proposal.description || 'Sin descripción'}

SERVICIOS: ${Array.isArray(proposal.services) ? proposal.services.map((s: any) => s.name || s).join(', ') : 'No especificados'}

PRICING: ${proposal.pricing ? JSON.stringify(proposal.pricing) : 'No especificado'}

TÉRMINOS: ${proposal.terms ? JSON.stringify(proposal.terms) : 'No especificados'}

TIMELINE: ${proposal.timeline ? JSON.stringify(proposal.timeline) : 'No especificado'}

NOTAS: ${proposal.notes || 'Sin notas'}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
    });

    const response = completion.choices[0]?.message?.content || '{}';

    let analysis;
    let parseError = false;

    try {
      // Limpiar la respuesta de posibles caracteres extra
      const cleanResponse = response.trim().replace(/```json/g, '').replace(/```/g, '');
      analysis = JSON.parse(cleanResponse);
      
      // Validar que tiene las propiedades necesarias
      if (!analysis.overall_score || !analysis.strengths || !analysis.weaknesses) {
        throw new Error('Estructura JSON incompleta');
      }
      
    } catch (error) {
      console.error('❌ Error parseando JSON de OpenAI:', error);
      console.error('📄 Respuesta original:', response);
      parseError = true;
      
      // Intentar extraer información de la respuesta de texto
      const extractInfo = (text: string) => {
        // Buscar puntuación
        const scoreMatch = text.match(/(?:score|puntuación|rating).*?(\d+(?:\.\d+)?)/i);
        const score = scoreMatch ? parseFloat(scoreMatch[1]) : 7.0;
        
        // Buscar probabilidad
        const probMatch = text.match(/(?:probabilidad|probability|success).*?(\d+)%/i);
        const probability = probMatch ? parseInt(probMatch[1]) / 100 : 0.7;
        
        return { score, probability };
      };
      
      const extracted = extractInfo(response);
      
      // Fallback analysis mejorado
      analysis = {
        overall_score: extracted.score,
        competitiveness: "medium",
        success_probability: extracted.probability,
        strengths: [
          "Propuesta con estructura básica",
          "Información de contacto incluida",
          "Precio definido"
        ],
        weaknesses: [
          "Análisis automático requiere ajustes",
          "Respuesta de IA necesita optimización"
        ],
        pricing_analysis: {
          assessment: "competitive",
          market_position: "standard",
          recommendation: "Precio en rango estándar del mercado"
        },
        risk_factors: [
          "Revisar detalles de la propuesta manualmente"
        ],
        improvement_suggestions: [
          "Añadir más detalles específicos del proyecto",
          "Incluir ejemplos de trabajos anteriores",
          "Especificar mejor los entregables"
        ],
        next_actions: [
          "Contactar al cliente para aclarar requisitos",
          "Preparar presentación de la propuesta"
        ],
        conversion_tips: [
          "Hacer seguimiento personalizado",
          "Ofrecer consulta gratuita",
          "Destacar experiencia relevante"
        ],
        parseError: true,
        rawResponse: response.substring(0, 300) + '...'
      };
    }

    // Respuesta final
    const result = {
      proposal: {
        id: proposal.id,
        title: proposal.title,
        client: proposal.prospect_name || 'Cliente no especificado',
        status: proposal.status,
        value: proposal.total_amount,
        currency: proposal.currency,
        created: proposal.created_at
      },
      analysis,
      parseError,
      originalResponse: parseError ? response : undefined
    };

    // Guardar insight en la base de datos
    try {
      await supabase.from('ai_insights').insert({
        user_id: user.id,
        insight_type: 'proposal_analysis',
        title: `Análisis de propuesta: ${proposal.title}`,
        description: `Análisis completo de la propuesta "${proposal.title}" con puntuación ${analysis.overall_score}/10`,
        data_points: {
          proposal_id: proposal.id,
          overall_score: analysis.overall_score,
          competitiveness: analysis.competitiveness,
          success_probability: analysis.success_probability,
          parse_error: parseError
        },
        confidence_score: analysis.success_probability,
        recommendations: analysis.improvement_suggestions || [],
        created_at: new Date().toISOString()
      });
    } catch (insightError) {
      console.error('⚠️ Error guardando insight:', insightError);
      // No fallar la respuesta por esto
    }


    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error en análisis de propuesta:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
