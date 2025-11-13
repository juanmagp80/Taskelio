'use client';

import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import TrialBanner from '@/components/TrialBanner';
import { Button } from '@/components/ui/Button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSupabaseErrorHandler } from '@/src/hooks/useSupabaseErrorHandler';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { useTrialStatus } from '@/src/lib/useTrialStatus';
import { checkAuthenticationState, debugSupabaseCookies } from '@/src/utils/auth-debug';
import { cleanSupabaseCookies, hasCorruptedSupabaseCookies } from '@/src/utils/cookie-cleanup';
import { showToast } from '@/utils/toast';
import {
    Calculator,
    Check,
    Copy,
    DollarSign,
    Edit3,
    Eye,
    FileDown,
    Filter,
    MoreHorizontal,
    Plus,
    Search,
    Send,
    Trash2,
    TrendingUp,
    X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Componente del dropdown menu
const BudgetDropdownMenu = ({
    budget,
    onEdit,
    onDuplicate,
    onSend,
    onApprove,
    onReject,
    onDelete,
    onDownloadPDF,
    router
}: {
    budget: Budget;
    onEdit: (id: string) => void;
    onDuplicate: (budget: Budget) => void;
    onSend: (id: string) => void;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
    onDelete: (id: string) => void;
    onDownloadPDF: (id: string) => void;
    router: any;
}) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/budgets/${budget.id}`)}
                    className="flex items-center"
                >
                    <Eye className="w-4 h-4 mr-2" />
                    Ver detalles
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => onEdit(budget.id)}
                    className="flex items-center"
                >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => onDuplicate(budget)}
                    className="flex items-center"
                >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicar
                </DropdownMenuItem>
                {budget.status === 'draft' && (
                    <DropdownMenuItem
                        onClick={() => onSend(budget.id)}
                        className="flex items-center"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Enviar
                    </DropdownMenuItem>
                )}
                {budget.status === 'sent' && (
                    <>
                        <DropdownMenuItem
                            onClick={() => onApprove(budget.id)}
                            className="flex items-center text-green-600 focus:text-green-600 hover:text-green-700"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Aprobar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onReject(budget.id)}
                            className="flex items-center text-red-600 focus:text-red-600 hover:text-red-700"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Rechazar
                        </DropdownMenuItem>
                    </>
                )}
                {budget.status === 'sent' && (
                    <>
                        <DropdownMenuItem
                            onClick={() => onApprove(budget.id)}
                            className="flex items-center text-green-600 focus:text-green-600 hover:text-green-700"
                        >
                            <Check className="w-4 h-4 mr-2" />
                            Aprobar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onReject(budget.id)}
                            className="flex items-center text-red-600 focus:text-red-600 hover:text-red-700"
                        >
                            <X className="w-4 h-4 mr-2" />
                            Rechazar
                        </DropdownMenuItem>
                    </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => onDownloadPDF(budget.id)}
                    className="flex items-center"
                >
                    <FileDown className="w-4 h-4 mr-2" />
                    Descargar PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={() => onDelete(budget.id)}
                    className="flex items-center text-destructive focus:text-destructive hover:text-destructive"
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

interface Budget {
    id: string;
    client_id: string;
    client_name: string;
    title: string;
    description: string;
    status: 'draft' | 'sent' | 'approved' | 'rejected';
    budget_reference?: string;
    total_amount: number;
    created_at: string;
    expires_at: string;
    approved_at?: string;
}

interface BudgetsPageClientProps {
    userEmail: string;
}

// Helper function para validar errores de Supabase
const isSupabaseError = (error: any): boolean => {
    if (!error || typeof error !== 'object') return false;

    // Si es null o undefined, no es error
    if (error === null || error === undefined) return false;

    // Si es un objeto vacío, no es error
    const keys = Object.keys(error);
    if (keys.length === 0) return false;

    // Solo considerar error si tiene propiedades específicas de error de Supabase
    return !!(error.message || error.code || error.details || error.hint || error.status);
};

export function BudgetsPageClient({ userEmail }: BudgetsPageClientProps) {
    const router = useRouter();
    const { handleSupabaseOperation } = useSupabaseErrorHandler();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    // Estados para el modal de eliminación
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        budgetId: string | null;
        budgetTitle: string;
        isDeleting: boolean;
    }>({
        isOpen: false,
        budgetId: null,
        budgetTitle: '',
        isDeleting: false
    });

    // Estados para métricas
    const [metrics, setMetrics] = useState<{
        totalBudgets: number;
        approvedBudgets: number;
        totalValue: number;
        conversionRate: number;
    }>({
        totalBudgets: 0,
        approvedBudgets: 0,
        totalValue: 0,
        conversionRate: 0
    });

    const { canUseFeatures } = useTrialStatus(userEmail);

    useEffect(() => {
        // Verificar y limpiar cookies corruptas antes de cargar datos
        if (hasCorruptedSupabaseCookies()) {
            console.warn('🍪 Detected corrupted Supabase cookies, cleaning...');
            cleanSupabaseCookies();
            return;
        }

        // Debug de cookies y estado de autenticación
        debugSupabaseCookies();
        checkAuthenticationState();

        loadBudgets();
    }, [userEmail]);

    const loadBudgets = async () => {
        try {
            setLoading(true);
            const supabase = createSupabaseClient();

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: budgetsData, error } = await supabase
                .from('budgets')
                .select(`
                    *,
                    clients!inner(name)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error loading budgets:', error);
                return;
            }

            const transformedBudgets = (budgetsData || []).map((budget: any) => ({
                ...budget,
                client_name: budget.clients.name
            }));

            setBudgets(transformedBudgets);

            // Calcular métricas
            const totalBudgets = transformedBudgets.length;
            const approvedBudgets = transformedBudgets.filter((b: any) => b.status === 'approved');
            const approvedCount = approvedBudgets.length;
            const totalValue = approvedBudgets.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0);
            const conversionRate = totalBudgets > 0 ? (approvedCount / totalBudgets) * 100 : 0;

            setMetrics({
                totalBudgets,
                approvedBudgets: approvedCount,
                totalValue,
                conversionRate
            });

        } catch (error) {
            console.error('Error loading budgets:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'sent': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'approved': return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'draft': return 'Borrador';
            case 'sent': return '📧 Enviado';
            case 'approved': return '✅ Aprobado';
            case 'rejected': return '❌ Rechazado';
            default: return status;
        }
    };

    const handleEdit = (budgetId: string) => {
        router.push(`/dashboard/budgets/${budgetId}/edit`);
    };

    const handleDuplicate = async (budget: Budget) => {
        try {
            const supabase = createSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                showToast.error('Usuario no autenticado');
                return;
            }

            const { data: originalBudget, error: fetchError } = await supabase
                .from('budgets')
                .select(`
                    *,
                    budget_items(*)
                `)
                .eq('id', budget.id)
                .eq('user_id', user.id)
                .single();

            if (fetchError) {
                console.error('Error loading budget to duplicate:', fetchError);
                showToast.error('Error al cargar el presupuesto');
                return;
            }

            const { data: newBudget, error: budgetError } = await supabase
                .from('budgets')
                .insert({
                    user_id: user.id,
                    client_id: originalBudget.client_id,
                    title: `${originalBudget.title} (Copia)`,
                    description: originalBudget.description,
                    status: 'draft',
                    tax_rate: originalBudget.tax_rate,
                    notes: originalBudget.notes,
                    terms_conditions: originalBudget.terms_conditions
                })
                .select()
                .single();

            if (isSupabaseError(budgetError)) {
                console.error('Error duplicating budget:', budgetError);
                showToast.error('Error al duplicar el presupuesto');
                return;
            }

            if (originalBudget.budget_items && originalBudget.budget_items.length > 0) {
                const itemsToInsert = originalBudget.budget_items.map((item: any) => ({
                    budget_id: newBudget.id,
                    title: item.title,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    type: item.type,
                    sort_order: item.sort_order
                }));

                const { error: itemsError } = await supabase
                    .from('budget_items')
                    .insert(itemsToInsert);

                if (itemsError) {
                    console.error('Error duplicating budget items:', itemsError);
                    showToast.error('Error al duplicar los items del presupuesto');
                    return;
                }
            }

            showToast.success('Presupuesto duplicado correctamente');
            await loadBudgets();

        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error al duplicar el presupuesto');
        }
    };

    const handleDelete = (budgetId: string) => {
        const budget = budgets.find(b => b.id === budgetId);
        if (budget) {
            setDeleteModal({
                isOpen: true,
                budgetId,
                budgetTitle: budget.title,
                isDeleting: false
            });
        }
    };

    const confirmDelete = async () => {
        if (!deleteModal.budgetId) return;

        try {
            setDeleteModal(prev => ({ ...prev, isDeleting: true }));

            const supabase = createSupabaseClient();
            const { error } = await supabase
                .from('budgets')
                .delete()
                .eq('id', deleteModal.budgetId);

            if (error) {
                console.error('Error deleting budget:', error);
                showToast.error('Error al eliminar el presupuesto');
                return;
            }

            setBudgets(budgets.filter(b => b.id !== deleteModal.budgetId));
            showToast.success('Presupuesto eliminado correctamente');

            setDeleteModal({
                isOpen: false,
                budgetId: null,
                budgetTitle: '',
                isDeleting: false
            });
        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error al eliminar el presupuesto');
        } finally {
            setDeleteModal(prev => ({ ...prev, isDeleting: false }));
        }
    };

    const closeDeleteModal = () => {
        if (deleteModal.isDeleting) return;
        setDeleteModal({
            isOpen: false,
            budgetId: null,
            budgetTitle: '',
            isDeleting: false
        });
    };

    const handleApprove = async (budgetId: string) => {
        try {
            const supabase = createSupabaseClient();

            const { error } = await supabase
                .from('budgets')
                .update({
                    status: 'approved',
                    approved_at: new Date().toISOString()
                })
                .eq('id', budgetId);

            if (error) {
                console.error('Error approving budget:', error);
                showToast.error('Error al aprobar el presupuesto');
                return;
            }

            setBudgets(budgets.map(budget =>
                budget.id === budgetId
                    ? { ...budget, status: 'approved' as const }
                    : budget
            ));

            showToast.success('✅ Presupuesto aprobado correctamente');
            await loadBudgets();

        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error al aprobar el presupuesto');
        }
    };

    const handleReject = async (budgetId: string) => {
        try {
            const supabase = createSupabaseClient();

            const { error } = await supabase
                .from('budgets')
                .update({
                    status: 'rejected',
                    updated_at: new Date().toISOString()
                })
                .eq('id', budgetId);

            if (error) {
                console.error('Error rejecting budget:', error);
                showToast.error('Error al rechazar el presupuesto');
                return;
            }

            setBudgets(budgets.map(budget =>
                budget.id === budgetId
                    ? { ...budget, status: 'rejected' as const }
                    : budget
            ));

            showToast.success('❌ Presupuesto rechazado correctamente');
            await loadBudgets();

        } catch (error) {
            console.error('Error:', error);
            showToast.error('Error al rechazar el presupuesto');
        }
    };

    const handleDownloadPDF = async (budgetId: string) => {
        try {
            showToast.info('Generando PDF...');

            const supabase = createSupabaseClient();

            // Obtener el presupuesto con sus items y datos del cliente
            const { data: budgetData, error: budgetError } = await supabase
                .from('budgets')
                .select(`
                    *,
                    budget_items(*),
                    clients(
                        name,
                        email,
                        phone,
                        company
                    )
                `)
                .eq('id', budgetId)
                .single();

            if (budgetError || !budgetData) {
                console.error('Error fetching budget:', budgetError);
                showToast.error('Error al obtener los datos del presupuesto');
                return;
            }

            // Tipar el budget correctamente
            const budget = budgetData as Budget & {
                budget_items: any[];
                clients: {
                    name: string;
                    email: string;
                    phone?: string;
                    company?: string;
                };
                tax_rate?: number;
                notes?: string;
                terms_conditions?: string;
            };

            if (!budget) {
                showToast.error('Error al obtener los datos del presupuesto');
                return;
            }

            // Importar dinámicamente pdfkit-browserify
            const PDFDocument = (await import('pdfkit-browserify')).default;
            const blobStream = (await import('blob-stream')).default;

            // Obtener información del usuario/freelancer
            const { data: { user } } = await supabase.auth.getUser();
            let freelancerInfo = null;
            let budgetNumber = 'PREP-001';

            if (user) {
                // Obtener información del freelancer
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('full_name, company, phone, website, email')
                    .eq('id', user.id)
                    .single();
                freelancerInfo = profileData;

                // Usar el budget_reference existente o generar uno temporal si no existe
                budgetNumber = budget.budget_reference || `PREP-${budget.id.slice(0, 8)}`;
            }

            // Crear el documento PDF
            const doc = new PDFDocument({
                size: 'A4',
                margin: 40,
                bufferPages: true
            });

            // Crear un stream para el PDF
            const stream = doc.pipe(blobStream());

            // Colores y configuración mejorados
            const primaryColor = '#1e40af'; // Azul más profesional
            const secondaryColor = '#f1f5f9';
            const accentColor = '#0ea5e9';
            const grayColor = '#64748b';
            const lightGrayColor = '#f8fafc';
            const darkColor = '#0f172a';
            const textColor = '#334155';

            // Configuración de página
            const pageWidth = 595;
            const pageHeight = 842;
            const marginLeft = 40;
            const marginRight = 40;
            const contentWidth = pageWidth - marginLeft - marginRight;

            // === ENCABEZADO PROFESIONAL ===
            // Fondo degradado del encabezado
            doc.rect(0, 0, pageWidth, 100)
                .fillAndStroke(primaryColor, primaryColor);

            // Título principal
            doc.fillColor('white')
                .fontSize(32)
                .font('Helvetica-Bold')
                .text('PRESUPUESTO', marginLeft, 25);

            // Mapeo de estados a español
            const statusTranslations: { [key: string]: string } = {
                'draft': 'BORRADOR',
                'sent': 'ENVIADO',
                'approved': 'APROBADO',
                'rejected': 'RECHAZADO',
                'pending': 'PENDIENTE',
                'accepted': 'ACEPTADO',
                'declined': 'RECHAZADO'
            };

            // Información del documento en el encabezado
            doc.fontSize(12)
                .font('Helvetica')
                .text(`Nº ${budgetNumber}`, pageWidth - 200, 30)
                .text(`Fecha: ${new Date(budget.created_at).toLocaleDateString('es-ES')}`, pageWidth - 200, 50)
                .text(`Estado: ${statusTranslations[budget.status] || budget.status.toUpperCase()}`, pageWidth - 200, 70);

            // === SECCIÓN DE INFORMACIÓN DE CONTACTO MEJORADA ===
            let yPosition = 120;

            // Cajas de información con fondo
            // Caja del freelancer (izquierda)
            doc.rect(marginLeft, yPosition, (contentWidth / 2) - 10, 120)
                .fillAndStroke(lightGrayColor, '#e2e8f0');

            // Caja del cliente (derecha)  
            doc.rect(marginLeft + (contentWidth / 2) + 10, yPosition, (contentWidth / 2) - 10, 120)
                .fillAndStroke(lightGrayColor, '#e2e8f0');

            // === INFORMACIÓN DEL FREELANCER ===
            let freelancerY = yPosition + 15;
            doc.fillColor(primaryColor)
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('EMISOR', marginLeft + 10, freelancerY);

            freelancerY += 20;
            doc.fillColor(darkColor)
                .fontSize(11)
                .font('Helvetica');

            if (freelancerInfo) {
                // Nombre de la empresa o freelancer (solo uno)
                const displayName = freelancerInfo.company || freelancerInfo.full_name || 'Freelancer';
                doc.font('Helvetica-Bold')
                    .text(displayName, marginLeft + 10, freelancerY);
                freelancerY += 15;

                // Email
                if (user?.email) {
                    doc.font('Helvetica')
                        .fillColor(textColor)
                        .text(`Email: ${user.email}`, marginLeft + 10, freelancerY);
                    freelancerY += 12;
                }

                // Teléfono
                if (freelancerInfo.phone) {
                    doc.text(`Tel: ${freelancerInfo.phone}`, marginLeft + 10, freelancerY);
                    freelancerY += 12;
                }

                // Sitio web
                if (freelancerInfo.website) {
                    doc.text(`Web: ${freelancerInfo.website}`, marginLeft + 10, freelancerY);
                }
            } else {
                doc.font('Helvetica-Bold')
                    .text('Freelancer Profesional', marginLeft + 10, freelancerY);
                freelancerY += 15;
                if (user?.email) {
                    doc.font('Helvetica')
                        .fillColor(textColor)
                        .text(`Email: ${user.email}`, marginLeft + 10, freelancerY);
                }
            }

            // === INFORMACIÓN DEL CLIENTE ===
            let clientY = yPosition + 15;
            const clientX = marginLeft + (contentWidth / 2) + 20;

            doc.fillColor(primaryColor)
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('CLIENTE', clientX, clientY);

            clientY += 20;
            doc.fillColor(darkColor)
                .fontSize(11)
                .font('Helvetica-Bold')
                .text(budget.clients.name, clientX, clientY);

            clientY += 15;
            doc.font('Helvetica')
                .fillColor(textColor);

            if (budget.clients.email) {
                doc.text(`Email: ${budget.clients.email}`, clientX, clientY);
                clientY += 12;
            }

            if (budget.clients.phone) {
                doc.text(`Tel: ${budget.clients.phone}`, clientX, clientY);
                clientY += 12;
            }

            if (budget.clients.company) {
                doc.text(`Empresa: ${budget.clients.company}`, clientX, clientY, { width: (contentWidth / 2) - 30 });
            }

            // === ESPACIADO Y LÍNEA SEPARADORA ===
            yPosition = 260; // Posición fija después de las cajas de información

            doc.moveTo(marginLeft, yPosition)
                .lineTo(pageWidth - marginRight, yPosition)
                .strokeColor('#cbd5e1')
                .lineWidth(2)
                .stroke();

            // === TÍTULO Y DESCRIPCIÓN DEL PRESUPUESTO ===
            yPosition += 25;

            if (budget.title) {
                doc.fillColor(primaryColor)
                    .fontSize(18)
                    .font('Helvetica-Bold')
                    .text(budget.title, marginLeft, yPosition);
                yPosition += 30;
            }

            if (budget.description) {
                doc.fillColor(textColor)
                    .fontSize(11)
                    .font('Helvetica')
                    .text(budget.description, marginLeft, yPosition, { width: contentWidth });
                yPosition += 35;
            }

            // === TABLA DE ITEMS PROFESIONAL ===
            yPosition += 15;

            // Encabezado de tabla mejorado
            const tableHeaderY = yPosition;
            doc.rect(marginLeft, tableHeaderY, contentWidth, 30)
                .fillAndStroke(primaryColor, primaryColor);

            doc.fillColor('white')
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('DESCRIPCIÓN', marginLeft + 15, tableHeaderY + 10)
                .text('CANT.', marginLeft + 320, tableHeaderY + 10)
                .text('PRECIO', marginLeft + 380, tableHeaderY + 10)
                .text('TOTAL', marginLeft + 450, tableHeaderY + 10);

            yPosition += 35;

            // Items del presupuesto con mejor espaciado
            let subtotal = 0;
            let rowHeight = 0;

            budget.budget_items.forEach((item: any, index: number) => {
                const itemTotal = item.quantity * item.unit_price;
                subtotal += itemTotal;

                // Calcular altura necesaria para la fila
                const titleLines = Math.ceil(doc.widthOfString(item.title) / 300);
                const descLines = item.description ? Math.ceil(doc.widthOfString(item.description) / 300) : 0;
                rowHeight = Math.max(25, (titleLines * 12) + (descLines * 10) + 15);

                // Verificar si necesitamos una nueva página
                if (yPosition + rowHeight > pageHeight - 150) {
                    doc.addPage();
                    yPosition = 50;
                }

                // Fila alternada con mejor contraste
                if (index % 2 === 0) {
                    doc.rect(marginLeft, yPosition - 5, contentWidth, rowHeight)
                        .fillAndStroke(lightGrayColor, lightGrayColor);
                }

                // Contenido de la fila
                doc.fillColor(darkColor)
                    .fontSize(11)
                    .font('Helvetica-Bold')
                    .text(item.title, marginLeft + 15, yPosition, { width: 300 });

                let currentY = yPosition;
                if (item.description) {
                    currentY += 15;
                    doc.fillColor(textColor)
                        .fontSize(9)
                        .font('Helvetica')
                        .text(item.description, marginLeft + 15, currentY, { width: 300 });
                }

                // Cantidad, precio y total alineados
                doc.fillColor(darkColor)
                    .fontSize(11)
                    .font('Helvetica')
                    .text(item.quantity.toString(), marginLeft + 330, yPosition)
                    .text(`€${item.unit_price.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, marginLeft + 385, yPosition)
                    .font('Helvetica-Bold')
                    .text(`€${itemTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, marginLeft + 455, yPosition);

                yPosition += rowHeight + 5;
            });

            // === SECCIÓN DE TOTALES MEJORADA ===
            yPosition += 25;

            // Verificar si necesitamos nueva página para los totales
            if (yPosition > pageHeight - 200) {
                doc.addPage();
                yPosition = 50;
            }

            // Área de totales con fondo
            const totalsBoxY = yPosition;
            const totalsBoxWidth = 250;
            const totalsBoxX = pageWidth - marginRight - totalsBoxWidth;

            doc.rect(totalsBoxX, totalsBoxY, totalsBoxWidth, 100)
                .fillAndStroke(secondaryColor, '#cbd5e1');

            yPosition += 15;

            const tax = (subtotal * (budget.tax_rate || 21)) / 100;
            const total = subtotal + tax;

            // Subtotal
            doc.fillColor(textColor)
                .fontSize(12)
                .font('Helvetica')
                .text('Subtotal:', totalsBoxX + 15, yPosition)
                .text(`€${subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, totalsBoxX + 150, yPosition, { align: 'right' });

            yPosition += 20;

            // IVA
            doc.text(`IVA (${budget.tax_rate || 21}%):`, totalsBoxX + 15, yPosition)
                .text(`€${tax.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, totalsBoxX + 150, yPosition, { align: 'right' });

            yPosition += 25;

            // Total principal destacado
            doc.rect(totalsBoxX + 10, yPosition - 8, totalsBoxWidth - 20, 30)
                .fillAndStroke(primaryColor, primaryColor);

            doc.fillColor('white')
                .fontSize(16)
                .font('Helvetica-Bold')
                .text('TOTAL:', totalsBoxX + 20, yPosition)
                .text(`€${total.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`, totalsBoxX + 150, yPosition);

            yPosition = totalsBoxY + 120;

            // === NOTAS Y CONDICIONES MEJORADAS ===
            yPosition += 30;

            if (budget.notes || budget.terms_conditions) {
                // Verificar si necesitamos nueva página
                if (yPosition > pageHeight - 150) {
                    doc.addPage();
                    yPosition = 50;
                }
            }

            if (budget.notes) {
                // Caja para las notas
                doc.rect(marginLeft, yPosition, contentWidth, 15)
                    .fillAndStroke(accentColor, accentColor);

                doc.fillColor('white')
                    .fontSize(12)
                    .font('Helvetica-Bold')
                    .text('NOTAS ADICIONALES', marginLeft + 15, yPosition + 4);

                yPosition += 25;
                doc.fontSize(11)
                    .font('Helvetica')
                    .fillColor(textColor)
                    .text(budget.notes, marginLeft, yPosition, {
                        width: contentWidth,
                        lineGap: 3
                    });
                yPosition += 35;
            }

            if (budget.terms_conditions) {
                // Caja para términos y condiciones
                doc.rect(marginLeft, yPosition, contentWidth, 15)
                    .fillAndStroke('#dc2626', '#dc2626');

                doc.fillColor('white')
                    .fontSize(12)
                    .font('Helvetica-Bold')
                    .text('TÉRMINOS Y CONDICIONES', marginLeft + 15, yPosition + 4);

                yPosition += 25;
                doc.fontSize(10)
                    .font('Helvetica')
                    .fillColor(textColor)
                    .text(budget.terms_conditions, marginLeft, yPosition, {
                        width: contentWidth,
                        lineGap: 2
                    });
                yPosition += 35;
            }

            // === PIE DE PÁGINA PROFESIONAL ===
            const footerY = pageHeight - 100;

            // Asegurar que estamos en la última página para el pie
            if (yPosition > footerY - 50) {
                doc.addPage();
                yPosition = 50;
            }

            // Línea separadora del pie más elegante
            doc.moveTo(marginLeft, footerY)
                .lineTo(pageWidth - marginRight, footerY)
                .strokeColor('#cbd5e1')
                .lineWidth(2)
                .stroke();

            // Información del pie en dos columnas
            const footerTextY = footerY + 20;

            // Columna izquierda - Información de validez
            doc.fontSize(10)
                .fillColor(textColor)
                .font('Helvetica')
                .text('• Este presupuesto es válido por 30 días desde la fecha de emisión.', marginLeft, footerTextY)
                .text(`• Generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`, marginLeft, footerTextY + 15);

            // Columna derecha - Estado del presupuesto
            const statusColors: { [key: string]: string } = {
                'draft': '#64748b',
                'sent': '#0ea5e9',
                'approved': '#10b981',
                'rejected': '#ef4444'
            };

            const statusLabels: { [key: string]: string } = {
                'draft': 'BORRADOR',
                'sent': 'ENVIADO',
                'approved': 'APROBADO',
                'rejected': 'RECHAZADO',
                'pending': 'PENDIENTE',
                'accepted': 'ACEPTADO',
                'declined': 'RECHAZADO'
            };

            const statusColor = statusColors[budget.status] || '#64748b';
            const statusLabel = statusLabels[budget.status] || budget.status.toUpperCase();

            // Badge del estado más elegante
            const statusBadgeX = pageWidth - marginRight - 120;
            doc.rect(statusBadgeX, footerTextY - 5, 110, 25)
                .fillAndStroke(statusColor, statusColor);

            doc.fillColor('white')
                .fontSize(10)
                .font('Helvetica-Bold')
                .text(statusLabel, statusBadgeX + 10, footerTextY + 3);

            // Finalizar el documento
            doc.end();

            // Cuando el stream termine, crear el blob y descargar
            stream.on('finish', () => {
                const blob = stream.toBlob('application/pdf');
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `presupuesto-${budgetId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast.success('PDF generado correctamente');
            });

        } catch (error) {
            console.error('Error downloading PDF:', error);
            showToast.error('Error al generar el PDF');
        }
    };

    const handleSend = async (budgetId: string) => {
        try {

            const response = await fetch('/api/budgets/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ budgetId }),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error('Error response from API:', result);
                showToast.error(result.error || 'Error al enviar el presupuesto');
                return;
            }

            setBudgets(budgets.map(budget =>
                budget.id === budgetId
                    ? { ...budget, status: 'sent' as const, sent_at: new Date().toISOString() }
                    : budget
            ));

            showToast.success('✅ Presupuesto enviado por email correctamente');

        } catch (error) {
            console.error('Error sending budget email:', error);
            showToast.error('Error al enviar el presupuesto por email');
        }
    };

    const handleLogout = async () => {
        const supabase = createSupabaseClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Filtrar presupuestos
    const filteredBudgets = budgets.filter(budget => {
        const matchesSearch = budget.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            budget.client_name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || budget.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex-1 flex flex-col overflow-hidden ml-56">
                <Header userEmail={userEmail} onLogout={handleLogout} />

                <div className="flex-1 overflow-auto">
                    <TrialBanner userEmail={userEmail} />
                    <div className="w-full">
                        {/* Header */}
                        <div className="bg-white border-b border-gray-200 px-6 py-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-2xl font-semibold text-gray-900">Presupuestos</h1>
                                    <p className="mt-1 text-sm text-gray-600">
                                        Gestiona y crea presupuestos para tus clientes
                                    </p>
                                </div>
                                <Button
                                    onClick={() => router.push('/dashboard/budgets/create')}
                                    disabled={!canUseFeatures}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Nuevo Presupuesto
                                </Button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Métricas */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Presupuestos</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.totalBudgets}</p>
                                        </div>
                                        <Calculator className="w-8 h-8 text-blue-600" />
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aprobados</p>
                                            <p className="text-2xl font-bold text-green-600">{metrics.approvedBudgets}</p>
                                        </div>
                                        <TrendingUp className="w-8 h-8 text-green-600" />
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Valor Total</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">€{metrics.totalValue.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                                        </div>
                                        <DollarSign className="w-8 h-8 text-yellow-600" />
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tasa Conversión</p>
                                            <p className="text-2xl font-bold text-blue-600">{metrics.conversionRate.toFixed(2)}%</p>
                                        </div>
                                        <TrendingUp className="w-8 h-8 text-blue-600" />
                                    </div>
                                </div>
                            </div>

                            {/* Filtros */}
                            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Buscar presupuestos..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-gray-400" />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                    >
                                        <option value="all">Todos los estados</option>
                                        <option value="draft">Borrador</option>
                                        <option value="sent">Enviado</option>
                                        <option value="approved">Aprobado</option>
                                        <option value="rejected">Rechazado</option>
                                    </select>
                                </div>
                            </div>

                            {/* Lista de presupuestos */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                {loading ? (
                                    <div className="p-8 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando presupuestos...</p>
                                    </div>
                                ) : filteredBudgets.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                            No hay presupuestos
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                                            Comienza creando tu primer presupuesto para un cliente.
                                        </p>
                                        <Button
                                            onClick={() => router.push('/dashboard/budgets/create')}
                                            disabled={!canUseFeatures}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Crear Presupuesto
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto overflow-y-visible">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Presupuesto
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Cliente
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Estado
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Valor
                                                    </th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Fecha
                                                    </th>
                                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                        Acciones
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {filteredBudgets.map((budget) => (
                                                    <tr key={budget.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 relative">
                                                        <td className="px-6 py-4">
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                    {budget.budget_reference || `Presupuesto #${budget.id.slice(0, 8)}`} - {budget.title}
                                                                </div>
                                                                <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                                                    {budget.description}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-gray-900 dark:text-white">
                                                                {budget.client_name}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(budget.status)}`}>
                                                                {getStatusText(budget.status)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                                €{budget.total_amount.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                                {new Date(budget.created_at).toLocaleDateString('es-ES')}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right relative z-[99999]">
                                                            <div className="flex items-center justify-end gap-2 relative">
                                                                <BudgetDropdownMenu
                                                                    budget={budget}
                                                                    onEdit={handleEdit}
                                                                    onDuplicate={handleDuplicate}
                                                                    onSend={handleSend}
                                                                    onApprove={handleApprove}
                                                                    onReject={handleReject}
                                                                    onDelete={handleDelete}
                                                                    onDownloadPDF={handleDownloadPDF}
                                                                    router={router}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Modal de confirmación de eliminación */}
                    <DeleteConfirmationModal
                        isOpen={deleteModal.isOpen}
                        onClose={closeDeleteModal}
                        onConfirm={confirmDelete}
                        budgetTitle={deleteModal.budgetTitle}
                        isDeleting={deleteModal.isDeleting}
                    />
                </div>
            </div>
        </div>
    );
}
