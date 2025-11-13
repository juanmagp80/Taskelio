'use client';

import Sidebar from '@/components/Sidebar';
import TrialBanner from '@/components/TrialBanner';
import { Button } from '@/components/ui/Button';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { useTrialStatus } from '@/src/lib/useTrialStatus';
import { showToast } from '@/utils/toast';
import {
    ArrowLeft,
    Calculator,
    Edit3,
    Eye,
    Mail,
    MoreHorizontal,
    Send,
    Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface BudgetItem {
    id: string;
    title: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    type: 'hours' | 'fixed' | 'milestone';
}

interface Budget {
    id: string;
    title: string;
    description: string;
    status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
    total_amount: number;
    tax_rate: number;
    created_at: string;
    expires_at?: string;
    approved_at?: string;
    sent_at?: string;
    notes?: string;
    terms_conditions?: string;
    client: {
        id: string;
        name: string;
        email: string;
    };
    budget_items: BudgetItem[];
}

interface BudgetDetailClientProps {
    budgetId: string;
    userEmail: string;
}

export function BudgetDetailClient({ budgetId, userEmail }: BudgetDetailClientProps) {
    const router = useRouter();
    const { canUseFeatures } = useTrialStatus(userEmail);
    const [budget, setBudget] = useState<Budget | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadBudget();
    }, [budgetId]);

    const loadBudget = async () => {
        try {
            setLoading(true);
            const supabase = createSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Cargar presupuesto con cliente e items
            const { data: budgetData, error } = await supabase
                .from('budgets')
                .select(`
                    *,
                    clients!inner(id, name, email),
                    budget_items(*)
                `)
                .eq('id', budgetId)
                .eq('user_id', user.id)
                .single();

            if (error) {
                console.error('Error loading budget:', error);
                showToast.error('Error al cargar el presupuesto');
                router.push('/dashboard/budgets');
                return;
            }

            if (!budgetData) {
                showToast.error('Presupuesto no encontrado');
                router.push('/dashboard/budgets');
                return;
            }

            setBudget({
                ...budgetData,
                client: budgetData.clients
            });
        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error al cargar el presupuesto');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        const supabase = createSupabaseClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleSendBudget = async () => {
        if (!budget) return;

        try {
            
            // Llamar a la API para enviar el email
            const response = await fetch('/api/budgets/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ budgetId: budget.id }),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('Error response from API:', result);
                showToast.error(result.error || 'Error al enviar el presupuesto');
                return;
            }

            // Actualizar el estado local
            setBudget({
                ...budget,
                status: 'sent',
                sent_at: new Date().toISOString()
            });

            showToast.success('✅ Presupuesto enviado por email correctamente');
            
        } catch (error) {
            console.error('Error sending budget email:', error);
            showToast.error('Error al enviar el presupuesto por email');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'sent':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'approved':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'expired':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'draft': return 'Borrador';
            case 'sent': return 'Enviado';
            case 'approved': return 'Aprobado';
            case 'rejected': return 'Rechazado';
            case 'expired': return 'Expirado';
            default: return status;
        }
    };

    const getTypeText = (type: string) => {
        switch (type) {
            case 'hours': return 'Por horas';
            case 'fixed': return 'Precio fijo';
            case 'milestone': return 'Hito';
            default: return type;
        }
    };

    const calculateSubtotal = () => {
        return budget?.budget_items?.reduce((total, item) => total + item.total, 0) || 0;
    };

    const calculateTax = () => {
        return (calculateSubtotal() * (budget?.tax_rate || 0)) / 100;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <TrialBanner userEmail={userEmail} />
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                <div className="flex-1 ml-56">
                    <div className="w-full p-6">
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!budget) {
        return (
            <div className="min-h-screen bg-gray-50">
                <TrialBanner userEmail={userEmail} />
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                <div className="flex-1 ml-56">
                    <div className="w-full p-6">
                        <div className="text-center">
                            <h2 className="text-lg font-medium text-gray-900">Presupuesto no encontrado</h2>
                            <Button
                                onClick={() => router.push('/dashboard/budgets')}
                                className="mt-4"
                            >
                                Volver a Presupuestos
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <TrialBanner userEmail={userEmail} />
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex-1 ml-56">
                <div className="w-full">
                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 px-6 py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => router.push('/dashboard/budgets')}
                                    className="p-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900">
                                        {budget.title}
                                    </h1>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Cliente: {budget.client.name}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(budget.status)}`}>
                                    {getStatusText(budget.status)}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(`/dashboard/budgets/${budget.id}/edit`)}
                                    disabled={!canUseFeatures}
                                >
                                    <Edit3 className="w-4 h-4 mr-2" />
                                    Editar
                                </Button>
                                {budget.status === 'draft' && (
                                    <Button
                                        onClick={handleSendBudget}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                        disabled={!canUseFeatures}
                                    >
                                        <Send className="w-4 h-4 mr-2" />
                                        Enviar
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-6 space-y-6">
                        {/* Información del presupuesto */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Información del Presupuesto
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Cliente
                                    </label>
                                    <p className="text-gray-900">{budget.client.name}</p>
                                    <p className="text-sm text-gray-600">{budget.client.email}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha de creación
                                    </label>
                                    <p className="text-gray-900">
                                        {new Date(budget.created_at).toLocaleDateString('es-ES', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </p>
                                </div>
                                {budget.description && (
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Descripción
                                        </label>
                                        <p className="text-gray-900">{budget.description}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Items del presupuesto */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Items del Presupuesto
                            </h2>
                            <div className="overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Descripción
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Tipo
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Cantidad
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Precio Unit.
                                            </th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {budget.budget_items?.map((item) => (
                                            <tr key={item.id}>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {item.title}
                                                        </div>
                                                        {item.description && (
                                                            <div className="text-sm text-gray-500">
                                                                {item.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {getTypeText(item.type)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                                                    {item.quantity}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                                                    €{item.unit_price.toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                                                    €{item.total.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Resumen */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                                Resumen
                            </h2>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-medium">€{calculateSubtotal().toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">IVA ({budget.tax_rate}%):</span>
                                    <span className="font-medium">€{calculateTax().toFixed(2)}</span>
                                </div>
                                <div className="border-t pt-3">
                                    <div className="flex justify-between">
                                        <span className="text-lg font-semibold text-gray-900">Total:</span>
                                        <span className="text-lg font-bold text-gray-900">€{budget.total_amount.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
