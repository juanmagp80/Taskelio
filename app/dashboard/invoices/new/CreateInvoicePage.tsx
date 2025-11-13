'use client';

import Sidebar from '@/components/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import CustomDatePicker from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { showToast } from '@/utils/toast';
import {
    ArrowLeft,
    Calculator,
    Calendar,
    DollarSign,
    FileText,
    Plus,
    Save,
    Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Actualizar la interfaz Client:

interface Client {
    id: string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    address?: string;
}

interface Project {
    id: string;
    name: string;
    client_id: string;
}

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
}

interface CreateInvoicePageProps {
    userEmail: string;
}

export default function CreateInvoicePage({ userEmail }: CreateInvoicePageProps) {
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<InvoiceItem[]>([
        { id: '1', description: '', quantity: 1, unit_price: 0, total: 0 }
    ]);

    const [formData, setFormData] = useState({
        client_id: '',
        project_id: '',
        title: '',
        description: '',
        tax_rate: 21, // IVA por defecto
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días
        notes: ''
    });

    const supabase = createSupabaseClient();
    const router = useRouter();

    // Cargar clientes y proyectos
    useEffect(() => {
        fetchClientsAndProjects();
    }, []);

    // Filtrar proyectos por cliente seleccionado
    useEffect(() => {
        if (formData.client_id) {
            const clientProjects = projects.filter(p => p.client_id === formData.client_id);
            setFilteredProjects(clientProjects);
        } else {
            setFilteredProjects([]);
        }
    }, [formData.client_id, projects]);

    // Función para obtener clientes y proyectos
    // En la función fetchClientsAndProjects, cambiar la consulta de clientes:

    const fetchClientsAndProjects = async () => {
        if (!supabase) return;

        try {
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) return;

            // Obtener clientes (SIN el campo address)
            const { data: clientsData, error: clientsError } = await supabase!
                .from('clients')
                .select('id, name, company, email')
                .eq('user_id', user.id)
                .order('name');

            if (clientsError) {
                console.error('Error fetching clients:', clientsError);
            } else {
                setClients(clientsData || []);
            }

            // Obtener proyectos
            const { data: projectsData, error: projectsError } = await supabase!
                .from('projects')
                .select('id, name, client_id')
                .eq('user_id', user.id)
                .order('name');

            if (projectsError) {
                console.error('Error fetching projects:', projectsError);
            } else {
                setProjects(projectsData || []);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };
    // Función para añadir nuevo item
    const addItem = () => {
        const newItem: InvoiceItem = {
            id: Date.now().toString(),
            description: '',
            quantity: 1,
            unit_price: 0,
            total: 0
        };
        setItems([...items, newItem]);
    };

    // Función para eliminar item
    const removeItem = (itemId: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== itemId));
        }
    };

    // Función para actualizar item
    const updateItem = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                const updatedItem = { ...item, [field]: value };

                // Recalcular total del item
                if (field === 'quantity' || field === 'unit_price') {
                    updatedItem.total = Number(updatedItem.quantity) * Number(updatedItem.unit_price);
                }

                return updatedItem;
            }
            return item;
        }));
    };

    // Calcular totales
    const calculateTotals = () => {
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const taxAmount = (subtotal * formData.tax_rate) / 100;
        const total = subtotal + taxAmount;

        return {
            subtotal: subtotal.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            total: total.toFixed(2)
        };
    };

    // Función para crear factura
    const createInvoice = async () => {
        if (!supabase) return;

        try {
            if (!formData.client_id || !formData.title.trim() || items.some(item => !item.description.trim())) {
                showToast.warning('Por favor completa todos los campos obligatorios');
                return;
            }

            setLoading(true);
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) return;

            const totals = calculateTotals();
            const invoiceNumber = `INV-${Date.now()}`;

            // Crear factura
            const { data: invoiceData, error: invoiceError } = await supabase!
                .from('invoices')
                .insert([{
                    user_id: user.id,
                    client_id: formData.client_id,
                    project_id: formData.project_id || null,
                    invoice_number: invoiceNumber,
                    title: formData.title.trim(),
                    description: formData.description.trim() || null,
                    amount: parseFloat(totals.subtotal),
                    tax_rate: formData.tax_rate,
                    tax_amount: parseFloat(totals.taxAmount),
                    total_amount: parseFloat(totals.total),
                    status: 'draft',
                    issue_date: formData.issue_date,
                    due_date: formData.due_date,
                    notes: formData.notes.trim() || null
                }])
                .select()
                .single();

            if (invoiceError) {
                console.error('Error creating invoice:', invoiceError);
                showToast.error('Error al crear la factura');
                return;
            }

            // Crear items de la factura
            const invoiceItems = items
                .filter(item => item.description.trim() && item.quantity > 0 && item.unit_price > 0)
                .map(item => ({
                    invoice_id: invoiceData.id,
                    description: item.description.trim(),
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total: item.total
                }));

            if (invoiceItems.length > 0) {
                const { error: itemsError } = await supabase
                    .from('invoice_items')
                    .insert(invoiceItems);

                if (itemsError) {
                    console.error('Error creating invoice items:', itemsError);
                    // No fallar completamente, la factura ya se creó
                }
            }

            // Redirigir a la factura creada
            showToast.success('Factura creada exitosamente');
            router.push(`/dashboard/invoices/${invoiceData.id}`);
        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error al crear la factura');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!supabase) return;

        await supabase!.auth.signOut();
        router.push('/login');
    };

    const totals = calculateTotals();

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <main className="flex-1 ml-64 overflow-auto">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-10">
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/dashboard/invoices')}
                                    className="rounded-lg border-slate-200 hover:bg-slate-50"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Volver
                                </Button>
                                <div>
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                        Nueva Factura
                                    </h1>
                                    <p className="text-slate-600 mt-1 font-medium">Crea una nueva factura</p>
                                </div>
                            </div>
                            <Button
                                onClick={createInvoice}
                                disabled={loading}
                                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800"
                            >
                                {loading ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                {loading ? 'Creando...' : 'Crear Factura'}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    <div className="grid gap-8 lg:grid-cols-3">
                        {/* Información principal */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Información básica */}
                            <Card className="rounded-2xl shadow-sm border-slate-100">
                                <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-t-2xl">
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                                            <FileText className="h-4 w-4 text-white" />
                                        </div>
                                        Información de la Factura
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 mb-2 block">
                                                Cliente *
                                            </label>
                                            <select
                                                value={formData.client_id}
                                                onChange={(e) => {
                                                    setFormData({
                                                        ...formData,
                                                        client_id: e.target.value,
                                                        project_id: '' // Reset project when client changes
                                                    });
                                                }}
                                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            >
                                                <option value="">Seleccionar cliente</option>
                                                {clients.map((client) => (
                                                    <option key={client.id} value={client.id}>
                                                        {client.name} {client.company ? `- ${client.company}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 mb-2 block">
                                                Proyecto (Opcional)
                                            </label>
                                            <select
                                                value={formData.project_id}
                                                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                disabled={!formData.client_id}
                                            >
                                                <option value="">Sin proyecto</option>
                                                {filteredProjects.map((project) => (
                                                    <option key={project.id} value={project.id}>
                                                        {project.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-sm font-semibold text-slate-700 mb-2 block">
                                                Título de la Factura *
                                            </label>
                                            <Input
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="Ej: Desarrollo web - Enero 2024"
                                                className="rounded-xl border-slate-200"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-sm font-semibold text-slate-700 mb-2 block">
                                                Descripción (Opcional)
                                            </label>
                                            <textarea
                                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                rows={3}
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Descripción adicional de la factura..."
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Fechas */}
                            <Card className="rounded-2xl shadow-sm border-slate-100">
                                <CardHeader className="bg-gradient-to-r from-emerald-50 to-slate-50 rounded-t-2xl">
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                                            <Calendar className="h-4 w-4 text-white" />
                                        </div>
                                        Fechas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 mb-2 block">
                                                Fecha de Emisión
                                            </label>
                                            <CustomDatePicker
                                                selected={formData.issue_date ? new Date(formData.issue_date) : null}
                                                onChange={(date) => setFormData({
                                                    ...formData,
                                                    issue_date: date ? date.toISOString().split('T')[0] : ''
                                                })}
                                                placeholderText="Seleccionar fecha de emisión"
                                                className="rounded-xl border-slate-200"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700 mb-2 block">
                                                Fecha de Vencimiento
                                            </label>
                                            <CustomDatePicker
                                                selected={formData.due_date ? new Date(formData.due_date) : null}
                                                onChange={(date) => setFormData({
                                                    ...formData,
                                                    due_date: date ? date.toISOString().split('T')[0] : ''
                                                })}
                                                placeholderText="Seleccionar fecha de vencimiento"
                                                minDate={formData.issue_date ? new Date(formData.issue_date) : new Date()}
                                                className="rounded-xl border-slate-200"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Items de la factura */}
                            <Card className="rounded-2xl shadow-sm border-slate-100">
                                <CardHeader className="bg-gradient-to-r from-purple-50 to-slate-50 rounded-t-2xl">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2 text-slate-900">
                                            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                                                <DollarSign className="h-4 w-4 text-white" />
                                            </div>
                                            Items de la Factura
                                        </CardTitle>
                                        <Button
                                            onClick={addItem}
                                            variant="outline"
                                            size="sm"
                                            className="rounded-lg border-purple-200 hover:bg-purple-50 hover:text-purple-600"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Añadir Item
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        {items.map((item, index) => (
                                            <div key={item.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                                                <div className="grid gap-4 md:grid-cols-12">
                                                    <div className="md:col-span-5">
                                                        <label className="text-sm font-semibold text-slate-700 mb-2 block">
                                                            Descripción *
                                                        </label>
                                                        <Input
                                                            value={item.description}
                                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                            placeholder="Descripción del servicio/producto"
                                                            className="rounded-lg border-slate-200"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-sm font-semibold text-slate-700 mb-2 block">
                                                            Cantidad
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                                            className="rounded-lg border-slate-200"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-sm font-semibold text-slate-700 mb-2 block">
                                                            Precio Unitario
                                                        </label>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.unit_price}
                                                            onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                                            className="rounded-lg border-slate-200"
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="text-sm font-semibold text-slate-700 mb-2 block">
                                                            Total
                                                        </label>
                                                        <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-900 font-semibold">
                                                            €{item.total.toFixed(2)}
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-1 flex items-end">
                                                        <Button
                                                            onClick={() => removeItem(item.id)}
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={items.length === 1}
                                                            className="rounded-lg border-red-200 hover:bg-red-50 hover:text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Notas */}
                            <Card className="rounded-2xl shadow-sm border-slate-100">
                                <CardHeader className="bg-gradient-to-r from-amber-50 to-slate-50 rounded-t-2xl">
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg">
                                            <FileText className="h-4 w-4 text-white" />
                                        </div>
                                        Notas Adicionales
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <textarea
                                        className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        rows={4}
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Términos y condiciones, notas de pago, etc..."
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Resumen lateral */}
                        <div className="space-y-6">
                            {/* Configuración de impuestos */}
                            <Card className="rounded-2xl shadow-sm border-slate-100 sticky top-24">
                                <CardHeader className="bg-gradient-to-r from-slate-50 to-white rounded-t-2xl">
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg">
                                            <Calculator className="h-4 w-4 text-white" />
                                        </div>
                                        Configuración
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div>
                                        <label className="text-sm font-semibold text-slate-700 mb-2 block">
                                            Tasa de Impuesto (%)
                                        </label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={formData.tax_rate}
                                            onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                                            className="rounded-xl border-slate-200"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Resumen de totales */}
                            <Card className="rounded-2xl shadow-sm border-slate-100">
                                <CardHeader className="bg-gradient-to-r from-emerald-50 to-white rounded-t-2xl">
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                                            <DollarSign className="h-4 w-4 text-white" />
                                        </div>
                                        Resumen
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-slate-600 font-medium">Subtotal:</span>
                                            <span className="text-slate-900 font-semibold">€{totals.subtotal}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-slate-600 font-medium">
                                                Impuestos ({formData.tax_rate}%):
                                            </span>
                                            <span className="text-slate-900 font-semibold">€{totals.taxAmount}</span>
                                        </div>
                                        <div className="border-t border-slate-200 pt-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-lg font-bold text-slate-900">Total:</span>
                                                <span className="text-2xl font-bold text-emerald-600">€{totals.total}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}