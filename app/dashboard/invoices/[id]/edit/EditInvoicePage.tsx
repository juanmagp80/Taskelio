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
import { useCallback, useEffect, useState } from 'react';

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
    isNew?: boolean;
}

interface Invoice {
    id: string;
    invoice_number: string;
    title: string;
    description?: string;
    client_id: string;
    project_id?: string;
    tax_rate: number;
    issue_date: string;
    due_date: string;
    notes?: string;
    status: string;
}

interface EditInvoicePageProps {
    invoiceId: string;
    userEmail: string;
}

export default function EditInvoicePage({ invoiceId, userEmail }: EditInvoicePageProps) {
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState<InvoiceItem[]>([]);

    const [formData, setFormData] = useState({
        client_id: '',
        project_id: '',
        title: '',
        description: '',
        tax_rate: 21,
        issue_date: '',
        due_date: '',
        notes: ''
    });

    const supabase = createSupabaseClient();
    const router = useRouter();

    // Filtrar proyectos por cliente seleccionado
    useEffect(() => {
        if (formData.client_id) {
            const clientProjects = projects.filter(p => p.client_id === formData.client_id);
            setFilteredProjects(clientProjects);
        } else {
            setFilteredProjects([]);
        }
    }, [formData.client_id, projects]);

    // Cargar datos de la factura
    const fetchInvoiceData = useCallback(async () => {
        if (!supabase) return;
        
        try {
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) return;

            // Obtener factura
            const { data: invoiceData, error: invoiceError } = await supabase!
                .from('invoices')
                .select('*')
                .eq('id', invoiceId)
                .eq('user_id', user.id)
                .single();

            if (invoiceError) {
                console.error('Error fetching invoice:', invoiceError);
                router.push('/dashboard/invoices');
                return;
            }

            setInvoice(invoiceData);
            setFormData({
                client_id: invoiceData.client_id || '',
                project_id: invoiceData.project_id || '',
                title: invoiceData.title || '',
                description: invoiceData.description || '',
                tax_rate: invoiceData.tax_rate || 21,
                issue_date: invoiceData.issue_date || '',
                due_date: invoiceData.due_date || '',
                notes: invoiceData.notes || ''
            });

            // Obtener items de la factura
            const { data: itemsData, error: itemsError } = await supabase!
                .from('invoice_items')
                .select('*')
                .eq('invoice_id', invoiceId)
                .order('created_at');

            if (itemsError) {
                console.error('Error fetching invoice items:', itemsError);
            } else {
                const formattedItems = (itemsData || []).map((item: any) => ({
                    id: item.id,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total: item.total,
                    isNew: false
                }));

                if (formattedItems.length === 0) {
                    formattedItems.push({
                        id: 'new-1',
                        description: '',
                        quantity: 1,
                        unit_price: 0,
                        total: 0,
                        isNew: true
                    });
                }

                setItems(formattedItems);
            }
        } catch (error) {
            console.error('Error:', error);
            router.push('/dashboard/invoices');
        } finally {
            setLoading(false);
        }
    }, [invoiceId, supabase, router]);

    // Cargar clientes y proyectos
    const fetchClientsAndProjects = useCallback(async () => {
        if (!supabase) return;
        
        try {
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) return;

            // Obtener clientes
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
    }, [supabase]);

    useEffect(() => {
        fetchInvoiceData();
        fetchClientsAndProjects();
    }, [fetchInvoiceData, fetchClientsAndProjects]);

    // Gestión de items
    const addItem = () => {
        const newItem: InvoiceItem = {
            id: `new-${Date.now()}`,
            description: '',
            quantity: 1,
            unit_price: 0,
            total: 0,
            isNew: true
        };
        setItems([...items, newItem]);
    };

    const removeItem = (itemId: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== itemId));
        }
    };

    // Reemplazar la función updateItem:

    const updateItem = (itemId: string, field: keyof InvoiceItem, value: string | number) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                const updatedItem = { ...item };

                // Manejar diferentes tipos de campos
                if (field === 'description') {
                    updatedItem.description = String(value);
                } else if (field === 'quantity') {
                    updatedItem.quantity = Number(value) || 0;
                } else if (field === 'unit_price') {
                    updatedItem.unit_price = Number(value) || 0;
                }

                // Recalcular total cuando cambie cantidad o precio
                if (field === 'quantity' || field === 'unit_price') {
                    updatedItem.total = updatedItem.quantity * updatedItem.unit_price;
                }

                return updatedItem;
            }
            return item;
        }));
    };

    // Calcular totales
    // Reemplazar la función calculateTotals:

    const calculateTotals = () => {
        const validItems = items.filter(item =>
            item.description.trim() &&
            item.quantity > 0 &&
            item.unit_price > 0
        );

        const subtotal = validItems.reduce((sum, item) => {
            const itemTotal = Number(item.quantity) * Number(item.unit_price);
            return sum + (isNaN(itemTotal) ? 0 : itemTotal);
        }, 0);

        const taxRate = Number(formData.tax_rate) || 0;
        const taxAmount = (subtotal * taxRate) / 100;
        const total = subtotal + taxAmount;

        return {
            subtotal: subtotal.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            total: total.toFixed(2)
        };
    };

    // Guardar cambios
    // Reemplazar la función updateInvoice completa:

    const updateInvoice = async () => {
        if (!supabase) return;
        
        try {
            if (!formData.client_id || !formData.title.trim()) {
                alert('Por favor completa todos los campos obligatorios');
                return;
            }

            setSaving(true);
            const { data: { user } } = await supabase!.auth.getUser();
            if (!user) return;

            const totals = calculateTotals();

            // 1. Actualizar factura principal
            const { error: invoiceError } = await supabase!
                .from('invoices')
                .update({
                    client_id: formData.client_id,
                    project_id: formData.project_id || null,
                    title: formData.title.trim(),
                    description: formData.description.trim() || null,
                    amount: parseFloat(totals.subtotal),
                    tax_rate: formData.tax_rate,
                    tax_amount: parseFloat(totals.taxAmount),
                    total_amount: parseFloat(totals.total),
                    issue_date: formData.issue_date,
                    due_date: formData.due_date,
                    notes: formData.notes.trim() || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', invoiceId)
                .eq('user_id', user.id);

            if (invoiceError) {
                console.error('Error updating invoice:', invoiceError);
                alert('Error al actualizar la factura');
                return;
            }

            // 2. Gestionar items de manera más eficiente
            const validItems = items.filter(item =>
                item.description.trim() &&
                item.quantity > 0 &&
                item.unit_price > 0
            );

            if (validItems.length === 0) {
                alert('Debe haber al menos un item válido en la factura');
                return;
            }

            // 3. Eliminar SOLO los items existentes (no los nuevos)
            const existingItems = validItems.filter(item => !item.isNew && item.id);
            const newItems = validItems.filter(item => item.isNew || !item.id);

            // Primero eliminar items existentes que ya no están
            const { error: deleteError } = await supabase
                .from('invoice_items')
                .delete()
                .eq('invoice_id', invoiceId);

            if (deleteError) {
                console.error('Error deleting old items:', deleteError);
                alert('Error al actualizar los items de la factura');
                return;
            }

            // 4. Insertar TODOS los items válidos (tanto existentes como nuevos)
            const invoiceItems = validItems.map(item => ({
                invoice_id: invoiceId,
                description: item.description.trim(),
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                total: Number(item.total),
                created_at: new Date().toISOString()
            }));

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(invoiceItems);

            if (itemsError) {
                console.error('Error inserting invoice items:', itemsError);
                alert('Error al guardar los items de la factura');
                return;
            }

            // 5. Redirigir a la vista de la factura
            router.push(`/dashboard/invoices/${invoiceId}`);

        } catch (error) {
            console.error('Error updating invoice:', error);
            alert('Error inesperado al actualizar la factura');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        if (!supabase) return;
        await supabase!.auth.signOut();
        router.push('/login');
    };

    const totals = calculateTotals();

    if (loading) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                <main className="flex-1 ml-64 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-600 font-medium">Cargando factura...</p>
                    </div>
                </main>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <Sidebar userEmail={userEmail} onLogout={handleLogout} />
                <main className="flex-1 ml-64 flex items-center justify-center">
                    <div className="text-center">
                        <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Factura no encontrada</h3>
                        <p className="text-slate-600 mb-6">La factura que buscas no existe o no tienes permisos para editarla.</p>
                        <Button
                            onClick={() => router.push('/dashboard/invoices')}
                            variant="outline"
                            className="rounded-xl"
                        >
                            Volver a Facturas
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

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
                                    onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}
                                    className="rounded-lg border-slate-200 hover:bg-slate-50"
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Volver
                                </Button>
                                <div>
                                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                                        Editar {invoice.invoice_number}
                                    </h1>
                                    <p className="text-slate-600 mt-1 font-medium">
                                        Modifica los detalles de tu factura
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={() => router.push(`/dashboard/invoices/${invoiceId}`)}
                                    variant="outline"
                                    className="rounded-lg border-slate-200 hover:bg-slate-50"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={updateInvoice}
                                    disabled={saving}
                                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800"
                                >
                                    {saving ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    <div className="grid gap-8 lg:grid-cols-3">
                        {/* Formulario principal */}
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
                                                        project_id: ''
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
                                        {items.map((item) => (
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
                            {/* Información de la factura */}
                            <Card className="rounded-2xl shadow-sm border-slate-100 sticky top-24">
                                <CardHeader className="bg-gradient-to-r from-slate-50 to-white rounded-t-2xl">
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <div className="p-2 bg-gradient-to-br from-slate-500 to-slate-600 rounded-lg">
                                            <FileText className="h-4 w-4 text-white" />
                                        </div>
                                        Información
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700">Número de Factura</label>
                                            <p className="text-slate-900 mt-1 font-mono text-lg">{invoice.invoice_number}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-semibold text-slate-700">Estado Actual</label>
                                            <p className="text-slate-900 mt-1 capitalize">{invoice.status}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Configuración de impuestos */}
                            <Card className="rounded-2xl shadow-sm border-slate-100">
                                <CardHeader className="bg-gradient-to-r from-indigo-50 to-white rounded-t-2xl">
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <div className="p-2 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg">
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