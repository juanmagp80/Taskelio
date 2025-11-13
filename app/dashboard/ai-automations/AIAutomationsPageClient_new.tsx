'use client';

import Sidebar from '@/components/Sidebar';
import TrialBanner from '@/components/TrialBanner';
import { Button } from '@/components/ui/Button';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { useTrialStatus } from '@/src/lib/useTrialStatus';
import {
    ArrowRight,
    BarChart3,
    Bot,
    Brain,
    ChevronRight,
    DollarSign,
    Lightbulb,
    MessageSquare,
    Pause,
    Play,
    Settings,
    Star,
    TrendingUp,
    Users,
    Zap
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AIAutomation {
    id: string;
    name: string;
    description: string;
    category: 'client_management' | 'sales' | 'productivity' | 'insights';
    type: string;
    status: 'active' | 'inactive' | 'learning';
    confidence: number;
    successRate: number;
    executionCount: number;
    aiFeatures: string[];
    icon: any;
    color: string;
    isNew?: boolean;
    isPremium?: boolean;
}

interface AIAutomationsPageClientProps {
    userEmail: string;
}

export default function AIAutomationsPageClient({ userEmail }: AIAutomationsPageClientProps) {
    const router = useRouter();
    const { canUseFeatures } = useTrialStatus(userEmail);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [aiAutomations, setAIAutomations] = useState<AIAutomation[]>([]);
    const [loading, setLoading] = useState(true);

    // Funciones para ejecutar automatizaciones IA
    const handleAutomationExecution = async (automation: AIAutomation) => {

        // Dependiendo del tipo de automatización, ejecutar la función correspondiente
        switch (automation.type) {
            case 'sentiment_analysis':
                await executeSentimentAnalysis(automation);
                break;
            case 'ai_proposal_generation':
                await executeProposalGeneration(automation);
                break;
            case 'ai_pricing_optimization':
                await executePricingOptimization(automation);
                break;
            case 'ai_task_prioritization':
                await executeTaskPrioritization(automation);
                break;
            case 'ai_email_generation':
                await executeEmailGeneration(automation);
                break;
            default:
                console.warn('Automation type not implemented:', automation.type);
                alert('Esta automatización aún no está implementada.');
        }
    };

    const executeSentimentAnalysis = async (automation: AIAutomation) => {
        const text = prompt('Introduce el texto a analizar (feedback del cliente):');
        if (!text) return;

        alert('🧠 Analizando sentimiento con OpenAI...\n\nEsto es una demo. En la versión real se conectaría con OpenAI para analizar el sentimiento del texto.');

        // Actualizar contador de ejecuciones
        setAIAutomations(prev => prev.map(a =>
            a.id === automation.id
                ? { ...a, executionCount: a.executionCount + 1 }
                : a
        ));
    };

    const executeProposalGeneration = async (automation: AIAutomation) => {
        const clientName = prompt('Nombre del cliente:');
        if (!clientName) return;

        const projectBrief = prompt('Descripción del proyecto:');
        if (!projectBrief) return;

        alert('📝 Generando propuesta con OpenAI...\n\nEsto es una demo. En la versión real se generaría una propuesta completa personalizada.');

        setAIAutomations(prev => prev.map(a =>
            a.id === automation.id
                ? { ...a, executionCount: a.executionCount + 1 }
                : a
        ));
    };

    const executePricingOptimization = async (automation: AIAutomation) => {
        const projectType = prompt('Tipo de proyecto (ej: desarrollo web, diseño, consultoría):');
        if (!projectType) return;

        alert('💰 Optimizando precios con OpenAI...\n\nEsto es una demo. En la versión real se analizarían datos del mercado para sugerir precios competitivos.');

        setAIAutomations(prev => prev.map(a =>
            a.id === automation.id
                ? { ...a, executionCount: a.executionCount + 1 }
                : a
        ));
    };

    const executeTaskPrioritization = async (automation: AIAutomation) => {
        alert('⚡ Priorizando tareas con IA...\n\nEsto es una demo. En la versión real se analizarían todas tus tareas para priorizarlas automáticamente.');

        setAIAutomations(prev => prev.map(a =>
            a.id === automation.id
                ? { ...a, executionCount: a.executionCount + 1 }
                : a
        ));
    };

    const executeEmailGeneration = async (automation: AIAutomation) => {
        const clientName = prompt('Nombre del cliente:');
        if (!clientName) return;

        alert('📧 Generando email con IA...\n\nEsto es una demo. En la versión real se generaría un email personalizado profesional.');

        setAIAutomations(prev => prev.map(a =>
            a.id === automation.id
                ? { ...a, executionCount: a.executionCount + 1 }
                : a
        ));
    };

    // Automatizaciones IA predefinidas - VERSIÓN DEMO
    const predefinedAutomations: AIAutomation[] = [
        {
            id: 'ai-sentiment-analysis',
            name: 'Análisis de Sentimiento Real',
            description: 'IA analiza textos de clientes usando OpenAI y detecta sentimientos negativos para crear alertas automáticas',
            category: 'client_management',
            type: 'sentiment_analysis',
            status: 'active',
            confidence: 92,
            successRate: 89,
            executionCount: 45,
            aiFeatures: ['OpenAI GPT-4o-mini', 'Análisis de Texto Real', 'Alertas Automáticas'],
            icon: Brain,
            color: 'blue',
            isNew: true
        },
        {
            id: 'ai-proposal-generator',
            name: 'Generador Inteligente de Propuestas',
            description: 'IA genera propuestas profesionales usando datos del cliente y proyecto con OpenAI',
            category: 'productivity',
            type: 'ai_proposal_generation',
            status: 'active',
            confidence: 88,
            successRate: 91,
            executionCount: 32,
            aiFeatures: ['Generación de Texto IA', 'Personalización Automática', 'Templates Inteligentes'],
            icon: MessageSquare,
            color: 'purple',
            isNew: true
        },
        {
            id: 'ai-pricing-optimizer',
            name: 'Optimización Inteligente de Precios',
            description: 'IA analiza datos del proyecto y cliente para sugerir precios óptimos basados en patrones reales',
            category: 'sales',
            type: 'ai_pricing_optimization',
            status: 'active',
            confidence: 85,
            successRate: 87,
            executionCount: 28,
            aiFeatures: ['Análisis de Datos', 'Cálculo Inteligente', 'Recomendaciones Personalizadas'],
            icon: DollarSign,
            color: 'green',
            isNew: true
        },
        {
            id: 'ai-task-prioritizer',
            name: 'Priorización Inteligente de Tareas',
            description: 'IA analiza tus tareas y las prioriza automáticamente según urgencia, impacto y deadlines',
            category: 'productivity',
            type: 'ai_task_prioritization',
            status: 'active',
            confidence: 90,
            successRate: 93,
            executionCount: 67,
            aiFeatures: ['Análisis de Prioridades', 'Optimización de Tiempo', 'Sugerencias Inteligentes'],
            icon: TrendingUp,
            color: 'indigo',
            isNew: true
        },
        {
            id: 'ai-email-generator',
            name: 'Generador Inteligente de Emails',
            description: 'IA crea emails profesionales personalizados para cada cliente y situación específica',
            category: 'client_management',
            type: 'ai_email_generation',
            status: 'active',
            confidence: 94,
            successRate: 96,
            executionCount: 89,
            aiFeatures: ['OpenAI Integration', 'Personalización Avanzada', 'Múltiples Tipos'],
            icon: MessageSquare,
            color: 'blue'
        }
    ];

    const categories = [
        { id: 'all', name: 'Todas', icon: Bot },
        { id: 'client_management', name: 'Gestión de Clientes', icon: Users },
        { id: 'sales', name: 'Ventas', icon: DollarSign },
        { id: 'productivity', name: 'Productividad', icon: Zap },
        { id: 'insights', name: 'Insights', icon: BarChart3 }
    ];

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setAIAutomations(predefinedAutomations);
            setLoading(false);
        }, 1000);
    }, []);

    const handleLogout = async () => {
        const supabase = createSupabaseClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const filteredAutomations = selectedCategory === 'all'
        ? aiAutomations
        : aiAutomations.filter(automation => automation.category === selectedCategory);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <Play className="h-4 w-4 text-green-600" />;
            case 'inactive': return <Pause className="h-4 w-4 text-gray-400" />;
            case 'learning': return <Brain className="h-4 w-4 text-blue-600" />;
            default: return <Settings className="h-4 w-4" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'active': return 'Activa';
            case 'inactive': return 'Inactiva';
            case 'learning': return 'Aprendiendo';
            default: return 'Desconocido';
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 90) return 'text-green-600 bg-green-100';
        if (confidence >= 80) return 'text-blue-600 bg-blue-100';
        if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex-1 flex flex-col overflow-hidden ml-56">
                <TrialBanner userEmail={userEmail} />

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    <div className="container mx-auto px-4 sm:px-6 py-8">

                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                                        <Bot className="h-8 w-8 mr-3 text-blue-600" />
                                        Automatizaciones IA (Demo)
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                                        Simulación de automatizaciones IA. En la versión real se conectarían con OpenAI GPT-4o-mini
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
                                        <Lightbulb className="h-4 w-4" />
                                        <span className="text-sm font-medium">DEMO Mode</span>
                                    </div>
                                    <Button
                                        onClick={() => router.push('/dashboard/automations')}
                                        variant="outline"
                                        className="flex items-center gap-2"
                                    >
                                        <ArrowRight className="h-4 w-4" />
                                        Ver Automatizaciones Reales
                                    </Button>
                                </div>
                            </div>

                            {/* Estadísticas IA */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Bot className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">IA Activas</p>
                                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                {aiAutomations.filter(a => a.status === 'active').length}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <TrendingUp className="h-6 w-6 text-green-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tasa de Éxito</p>
                                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                {Math.round(aiAutomations.reduce((acc, a) => acc + a.successRate, 0) / aiAutomations.length || 0)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-purple-100 rounded-lg">
                                            <Brain className="h-6 w-6 text-purple-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Confianza IA</p>
                                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                {Math.round(aiAutomations.reduce((acc, a) => acc + a.confidence, 0) / aiAutomations.length || 0)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center">
                                        <div className="p-2 bg-orange-100 rounded-lg">
                                            <Zap className="h-6 w-6 text-orange-600" />
                                        </div>
                                        <div className="ml-4">
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ejecuciones</p>
                                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                                {aiAutomations.reduce((acc, a) => acc + a.executionCount, 0)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filtros por categoría */}
                        <div className="flex flex-wrap gap-2 mb-8">
                            {categories.map((category) => {
                                const Icon = category.icon;
                                const isSelected = selectedCategory === category.id;
                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => setSelectedCategory(category.id)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isSelected
                                                ? 'bg-blue-600 text-white shadow-lg'
                                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {category.name}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Lista de Automatizaciones IA */}
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="text-center">
                                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-gray-600 dark:text-gray-400">Cargando automatizaciones IA...</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {filteredAutomations.map((automation) => {
                                    const Icon = automation.icon;
                                    return (
                                        <div
                                            key={automation.id}
                                            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 cursor-pointer group"
                                            onClick={() => handleAutomationExecution(automation)}
                                        >
                                            <div className="p-6">
                                                {/* Header */}
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`p-3 bg-${automation.color}-100 rounded-lg`}>
                                                            <Icon className={`h-6 w-6 text-${automation.color}-600`} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                                    {automation.name}
                                                                </h3>
                                                                {automation.isNew && (
                                                                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                                                                        Nuevo
                                                                    </span>
                                                                )}
                                                                {automation.isPremium && (
                                                                    <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
                                                                        <Star className="h-3 w-3" />
                                                                        Premium
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                {automation.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(automation.status)}
                                                        <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                                    </div>
                                                </div>

                                                {/* Métricas */}
                                                <div className="grid grid-cols-3 gap-4 mb-4">
                                                    <div className="text-center">
                                                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(automation.confidence)}`}>
                                                            {automation.confidence}% confianza
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">IA Confidence</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                                            {automation.successRate}%
                                                        </div>
                                                        <p className="text-xs text-gray-500">Tasa de Éxito</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                                            {automation.executionCount}
                                                        </div>
                                                        <p className="text-xs text-gray-500">Ejecuciones</p>
                                                    </div>
                                                </div>

                                                {/* Características IA */}
                                                <div className="mb-4">
                                                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Capacidades IA:</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {automation.aiFeatures.map((feature, index) => (
                                                            <span
                                                                key={index}
                                                                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded"
                                                            >
                                                                {feature}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Status */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        {getStatusIcon(automation.status)}
                                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                            {getStatusText(automation.status)}
                                                        </span>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                        disabled={!canUseFeatures && automation.isPremium}
                                                    >
                                                        Ejecutar Demo
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* CTA para automatizaciones reales */}
                        <div className="mt-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-8 text-white text-center">
                            <Bot className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold mb-2">🚀 Estas son demos de automatizaciones IA</h3>
                            <p className="text-blue-100 mb-6">
                                Para ver las automatizaciones reales que funcionan con tu base de datos, ve a "Automatizaciones Tradicionales"
                            </p>
                            <div className="bg-white/20 rounded-lg p-4 mb-6">
                                <p className="text-sm text-blue-100">
                                    📋 Las automatizaciones reales están en la base de datos<br />
                                    ⚡ Se ejecutan con datos reales de tus clientes y proyectos<br />
                                    🔧 Se pueden configurar y personalizar completamente<br />
                                    📊 Tienen métricas y historial real de ejecución
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                className="bg-white text-blue-600 hover:bg-gray-100"
                                onClick={() => router.push('/dashboard/automations')}
                            >
                                Ver Automatizaciones Reales
                            </Button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
