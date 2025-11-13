import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Brain, MessageSquare, RefreshCw, Lightbulb, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';
import { showToast } from '@/utils/toast';

interface ConversationAnalyzerProps {
  clientId: string;
  clientName: string;
  onSuggestMessage?: (message: string) => void;
}

interface Analysis {
  estado?: string;
  puntos_fuertes?: string[];
  areas_mejora?: string[];
  recomendaciones?: string[];
  mensaje_propuesto?: string;
  raw?: string;
}

export default function ConversationAnalyzer({ clientId, clientName, onSuggestMessage }: ConversationAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [suggestedMessage, setSuggestedMessage] = useState<string>('');

  const analyzeConversation = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/optimize-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, action: 'analyze' })
      });

      const data = await response.json();
      
      if (data.error) {
        showToast.error(`Error: ${data.error}`);
        return;
      }

      setAnalysis(data.analysis);
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      showToast.error('Error al analizar la conversación');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const suggestResponse = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/ai/optimize-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, action: 'suggest_response' })
      });

      const data = await response.json();
      
      if (data.error) {
        showToast.error(`Error: ${data.error}`);
        return;
      }

      setSuggestedMessage(data.suggested_message);
      if (onSuggestMessage) {
        onSuggestMessage(data.suggested_message);
      }
    } catch (error) {
      console.error('Error suggesting response:', error);
      showToast.error('Error al sugerir respuesta');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Botones de acción */}
      <div className="flex gap-3">
        <Button 
          onClick={analyzeConversation}
          disabled={isAnalyzing}
          className="flex items-center gap-2"
          variant="outline"
        >
          {isAnalyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          Analizar Conversación
        </Button>
        
        <Button 
          onClick={suggestResponse}
          disabled={isAnalyzing}
          className="flex items-center gap-2"
          variant="outline"
        >
          {isAnalyzing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
          Sugerir Respuesta
        </Button>
      </div>

      {/* Análisis completo */}
      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Análisis de Conversación con {clientName}
            </CardTitle>
            <CardDescription>
              Insights y recomendaciones basadas en IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {analysis.raw ? (
              // Si OpenAI no devolvió JSON válido, mostrar texto raw
              <div className="whitespace-pre-wrap text-sm text-gray-700">
                {analysis.raw}
              </div>
            ) : (
              <>
                {/* Estado de la conversación */}
                {analysis.estado && (
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Estado de la Conversación</h4>
                      <p className="text-blue-700 text-sm mt-1">{analysis.estado}</p>
                    </div>
                  </div>
                )}

                {/* Puntos fuertes */}
                {analysis.puntos_fuertes && analysis.puntos_fuertes.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900">Puntos Fuertes</h4>
                      <ul className="text-green-700 text-sm mt-1 space-y-1">
                        {analysis.puntos_fuertes.map((punto, idx) => (
                          <li key={idx}>• {punto}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Áreas de mejora */}
                {analysis.areas_mejora && analysis.areas_mejora.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-orange-900">Áreas de Mejora</h4>
                      <ul className="text-orange-700 text-sm mt-1 space-y-1">
                        {analysis.areas_mejora.map((area, idx) => (
                          <li key={idx}>• {area}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Recomendaciones */}
                {analysis.recomendaciones && analysis.recomendaciones.length > 0 && (
                  <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                    <Lightbulb className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-purple-900">Recomendaciones</h4>
                      <ul className="text-purple-700 text-sm mt-1 space-y-1">
                        {analysis.recomendaciones.map((rec, idx) => (
                          <li key={idx}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Mensaje propuesto */}
                {analysis.mensaje_propuesto && (
                  <div className="flex items-start gap-3 p-4 bg-indigo-50 rounded-lg">
                    <MessageSquare className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-indigo-900">Mensaje Recomendado</h4>
                      <div className="text-indigo-700 text-sm mt-1 p-3 bg-white rounded border">
                        {analysis.mensaje_propuesto}
                      </div>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => onSuggestMessage?.(analysis.mensaje_propuesto || '')}
                      >
                        Usar este mensaje
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mensaje sugerido */}
      {suggestedMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              Respuesta Sugerida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-gray-700 whitespace-pre-wrap">{suggestedMessage}</p>
            </div>
            <Button 
              className="mt-3"
              onClick={() => onSuggestMessage?.(suggestedMessage)}
            >
              Usar esta respuesta
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
