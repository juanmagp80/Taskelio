'use client';

import Sidebar from '@/components/Sidebar';
import TrialBanner from '@/components/TrialBanner';
import { Button } from '@/components/ui/Button';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { useTrialStatus } from '@/src/lib/useTrialStatus';
import '@/styles/datepicker.css';
import { showToast } from '@/utils/toast';
import { es } from 'date-fns/locale';
import { ArrowLeft, Calendar, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface ContractTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    template_content: string;
    variables: string[];
}

interface Client {
    id: string;
    name: string;
    email: string;
    company?: string;
    phone?: string;
    address?: string;
    nif?: string;
    city?: string;
    province?: string;
}

interface Company {
    id: string;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    tax_id?: string;
    user_id: string;
}

interface Profile {
    id: string;
    name?: string;
    email?: string;
    city?: string;
    address?: string;
    dni?: string;
    phone?: string;
}

interface CompanySettings {
    id: string;
    company_id: string;
    default_currency?: string;
    default_payment_terms?: string;
    logo_url?: string;
    nif?: string; // Añadido para permitir el acceso a companySettings.nif
    address?: string;
    email?: string;
    city?: string;
    phone?: string;
}

interface CreateContractClientProps {
    userEmail: string;
}

export default function CreateContractClient({ userEmail }: CreateContractClientProps) {
    const router = useRouter();
    const { canUseFeatures } = useTrialStatus(userEmail);
    const [step, setStep] = useState(1); // 1: Template, 2: Client, 3: Details
    const [templates, setTemplates] = useState<ContractTemplate[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [freelancerCompany, setFreelancerCompany] = useState<Company | null>(null);
    const [freelancerProfile, setFreelancerProfile] = useState<Profile | null>(null);
    const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        contract_value: '',
        currency: 'EUR',
        start_date: '',
        end_date: '',
        payment_terms: '',
        project_details: {} as Record<string, string>
    });

    // Separate state for DatePicker objects
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    // Datos editables del freelancer para el contrato
    const [freelancerData, setFreelancerData] = useState({
        name: '',
        dni: '',
        address: '',
        email: '',
        phone: '',
        city: ''
    });

    // Function to generate professional contract format
    const generateProfessionalContract = (content: string, contractData: any, profileData: any, clientData: any) => {
        const contractNumber = `CONT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
        const currentDate = new Date().toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                            CONTRATO DE SERVICIOS PROFESIONALES
                                    DOCUMENTO OFICIAL
                              Número de Contrato: ${contractNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 LUGAR Y FECHA: ${profileData?.city || '[Ciudad]'}, ${currentDate}

══════════════════════════════════════════════════════════════════════════════

                                    PARTES CONTRATANTES

══════════════════════════════════════════════════════════════════════════════

🔹 EL CONSULTOR/PRESTADOR DE SERVICIOS:
   Nombre: ${profileData?.name || '[Nombre del Consultor]'}
   DNI/NIF: ${profileData?.dni || '[DNI del Consultor]'}
   Dirección: ${profileData?.address || '[Dirección del Consultor]'}
   Email: ${profileData?.email || '[Email del Consultor]'}

🔹 EL CLIENTE/CONTRATANTE:
   Nombre/Razón Social: ${clientData.name}
   ${clientData.company ? `Empresa: ${clientData.company}` : ''}
   ${clientData.nif ? `NIF/CIF: ${clientData.nif}` : ''}
   Dirección: ${clientData.address || '[Dirección del Cliente]'}
   ${clientData.city ? `Ciudad: ${clientData.city}` : ''}
   ${clientData.province ? `Provincia: ${clientData.province}` : ''}
   Email: ${clientData.email}
   ${clientData.phone ? `Teléfono: ${clientData.phone}` : ''}

══════════════════════════════════════════════════════════════════════════════

                                 DETALLES DEL CONTRATO

══════════════════════════════════════════════════════════════════════════════

📋 TÍTULO DEL PROYECTO: ${contractData.title}

💰 VALOR DEL CONTRATO: ${contractData.contract_value} ${contractData.currency}

📅 PERÍODO DE VIGENCIA:
   • Fecha de Inicio: ${contractData.start_date}
   • Fecha de Finalización: ${contractData.end_date}

💳 CONDICIONES DE PAGO: ${contractData.payment_terms}

══════════════════════════════════════════════════════════════════════════════

                              CONTENIDO DEL CONTRATO

══════════════════════════════════════════════════════════════════════════════

${content}

══════════════════════════════════════════════════════════════════════════════

                                      FIRMAS

══════════════════════════════════════════════════════════════════════════════

EL CONSULTOR:                                    EL CLIENTE:


_____________________________                   _____________________________
${profileData?.name || '[Nombre del Consultor]'}                      ${clientData.name}
DNI: ${profileData?.dni || '[DNI]'}                              ${clientData.nif ? `NIF: ${clientData.nif}` : 'DNI/CIF: [Documento del Cliente]'}


Fecha: _______________                          Fecha: _______________


══════════════════════════════════════════════════════════════════════════════

                               INFORMACIÓN ADICIONAL

══════════════════════════════════════════════════════════════════════════════

📌 Este contrato ha sido generado mediante el sistema Taskelio
📌 Número de referencia: ${contractNumber}
📌 Fecha de generación: ${currentDate}
📌 Jurisdicción aplicable: ${profileData?.city || '[Ciudad]'}, España

──────────────────────────────────────────────────────────────────────────────

                    © ${new Date().getFullYear()} - Documento Oficial Taskelio
                              Todos los derechos reservados

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;
    };

    useEffect(() => {
        loadTemplates();
        loadClients();
        loadFreelancerData();
    }, []);

    // Calcular automáticamente el total para consultoría
    useEffect(() => {
        if (selectedTemplate?.category === 'consulting') {
            const hours = parseFloat(formData.project_details.estimated_hours || '0');
            const rate = parseFloat(formData.project_details.hourly_rate || '0');
            const total = hours * rate;

            if (hours > 0 && rate > 0) {
                updateProjectDetail('total_estimate', total.toString());
                // También actualizar el valor del contrato principal
                setFormData(prev => ({ ...prev, contract_value: total.toString() }));
            }
        }
    }, [formData.project_details.estimated_hours, formData.project_details.hourly_rate, selectedTemplate?.category]);

    // Calcular automáticamente el total mensual para marketing
    useEffect(() => {
        if (selectedTemplate?.category === 'marketing') {
            const professionalFee = parseFloat(formData.project_details.professional_fee || '0');
            const adBudget = parseFloat(formData.project_details.ad_budget || '0');
            const monthlyTotal = professionalFee + adBudget;

            if (professionalFee > 0) {
                updateProjectDetail('monthly_total', monthlyTotal.toString());
                // Para marketing, el valor del contrato es el total mensual
                setFormData(prev => ({ ...prev, contract_value: monthlyTotal.toString() }));
            }
        }
    }, [formData.project_details.professional_fee, formData.project_details.ad_budget, selectedTemplate?.category]);

    // Calcular automáticamente el total para redacción de contenidos
    useEffect(() => {
        if (selectedTemplate?.category === 'content') {
            const pricePerWord = parseFloat(formData.project_details.price_per_word || '0');
            const pricePerPiece = parseFloat(formData.project_details.price_per_piece || '0');
            const averageLength = parseFloat(formData.project_details.average_length || '0');
            const contentQuantity = parseFloat(formData.project_details.content_quantity || '0');

            let total = 0;

            // Si hay precio por palabra y palabras promedio, calcular así
            if (pricePerWord > 0 && averageLength > 0 && contentQuantity > 0) {
                total = pricePerWord * averageLength * contentQuantity;
            }
            // Si no, usar precio por pieza
            else if (pricePerPiece > 0 && contentQuantity > 0) {
                total = pricePerPiece * contentQuantity;
            }

            if (total > 0) {
                updateProjectDetail('total_project', total.toString());
                setFormData(prev => ({ ...prev, contract_value: total.toString() }));
            }
        }
    }, [
        formData.project_details.price_per_word,
        formData.project_details.price_per_piece,
        formData.project_details.average_length,
        formData.project_details.content_quantity,
        selectedTemplate?.category
    ]);

    // Función auxiliar para updateProjectDetail (necesaria para los useEffect)
    const updateProjectDetail = (key: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            project_details: {
                ...prev.project_details,
                [key]: value
            }
        }));
    };

    // Función para validar si el formulario está completo
    const isFormValid = () => {
        // Validaciones básicas
        const basicValid = formData.title &&
            formData.description &&
            formData.contract_value &&
            formData.start_date &&
            formData.end_date &&
            formData.payment_terms &&
            selectedTemplate &&
            selectedClient;

        if (!basicValid) return false;

        // Validaciones específicas por tipo de contrato
        switch (selectedTemplate?.category) {
            case 'consulting':
                return formData.project_details.specialization &&
                    formData.project_details.work_modality &&
                    formData.project_details.project_scope &&
                    formData.project_details.expected_outcomes &&
                    formData.project_details.estimated_hours &&
                    formData.project_details.weekly_hours &&
                    formData.project_details.hourly_rate;

            case 'web_development':
                return formData.project_details.technologies &&
                    formData.project_details.project_duration &&
                    formData.project_details.main_features;

            case 'marketing':
                return formData.project_details.social_networks &&
                    formData.project_details.main_objective &&
                    formData.project_details.kpis &&
                    formData.project_details.content_strategy;

            case 'design':
                return formData.project_details.design_type &&
                    formData.project_details.initial_proposals &&
                    formData.project_details.revisions_included;

            case 'content':
                return formData.project_details.content_type &&
                    formData.project_details.content_quantity &&
                    formData.project_details.average_length &&
                    formData.project_details.delivery_frequency &&
                    formData.project_details.review_deadline &&
                    formData.project_details.seo_optimization &&
                    (formData.project_details.price_per_word || formData.project_details.price_per_piece);

            default:
                return true;
        }
    };

    const loadTemplates = async () => {
        try {
            const supabase = createSupabaseClient();
            const { data, error } = await supabase
                .from('contract_templates')
                .select('*')
                .eq('is_active', true)
                .order('category', { ascending: true });

            if (error) throw error;
            setTemplates(data || []);
        } catch (error) {
            console.error('Error loading templates:', error);

            // Mostrar error más específico si las tablas no existen
            if (error && typeof error === 'object' && 'message' in error) {
                const errorMessage = (error as any).message;
                if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
                    showToast.error('Error: Las tablas de contratos no existen. Ejecuta la migración SQL en Supabase.');
                } else {
                    showToast.error(`Error al cargar templates: ${errorMessage}`);
                }
            } else {
                showToast.error('Error al cargar los templates. Verifica que las tablas existan en Supabase.');
            }
        }
    };

    const loadClients = async () => {
        try {
            const supabase = createSupabaseClient();
            const { data, error } = await supabase
                .from('clients')
                .select('id, name, email, company, phone, address, nif, city, province')
                .order('name', { ascending: true });

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Error loading clients:', error);
            showToast.error('Error al cargar los clientes');
        }
    };

    // Funciones auxiliares para mostrar fuentes de datos
    const getDataSourceBadge = (field: string) => {
        const sources = {
            name: freelancerCompany?.name ? '🏢' : freelancerProfile?.name ? '👤' : '📧',
            dni: companySettings?.nif ? '📊' : freelancerCompany?.tax_id ? '🏢' : freelancerProfile?.dni ? '👤' : '',
            address: companySettings?.address ? '📊' : freelancerCompany?.address ? '🏢' : freelancerProfile?.address ? '👤' : '',
            email: freelancerCompany?.email ? '🏢' : companySettings?.email ? '📊' : '📧',
            phone: freelancerCompany?.phone ? '🏢' : companySettings?.phone ? '📊' : freelancerProfile?.phone ? '👤' : '',
            city: companySettings?.city ? '📊' : freelancerProfile?.city ? '👤' : ''
        };

        const titles = {
            name: freelancerCompany?.name ? 'Empresa' : freelancerProfile?.name ? 'Perfil' : 'Email',
            dni: companySettings?.nif ? 'Config. empresa' : freelancerCompany?.tax_id ? 'Empresa' : freelancerProfile?.dni ? 'Perfil' : '',
            address: companySettings?.address ? 'Config. empresa' : freelancerCompany?.address ? 'Empresa' : freelancerProfile?.address ? 'Perfil' : '',
            email: freelancerCompany?.email ? 'Empresa' : companySettings?.email ? 'Config. empresa' : 'Usuario',
            phone: freelancerCompany?.phone ? 'Empresa' : companySettings?.phone ? 'Config. empresa' : freelancerProfile?.phone ? 'Perfil' : '',
            city: companySettings?.city ? 'Config. empresa' : freelancerProfile?.city ? 'Perfil' : ''
        };

        const icon = sources[field as keyof typeof sources];
        const title = titles[field as keyof typeof titles];

        if (icon && title) {
            return (
                <span
                    className="inline-block ml-1 text-xs bg-gray-200 dark:bg-gray-600 px-1 rounded"
                    title={`Dato desde: ${title}`}
                >
                    {icon}
                </span>
            );
        }
        return null;
    };

    const getDataSourceInfo = (...args: any[]) => {
        // Esta función estaba referenciada pero no implementada, la quitamos del JSX
        return null;
    };

    const loadFreelancerData = async () => {
        try {
            const supabase = createSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Cargar datos de la empresa/freelancer
                const { data: companyData, error: companyError } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (companyError && companyError.code !== 'PGRST116') {
                    console.error('Error loading company data:', companyError);
                } else if (companyData) {
                    setFreelancerCompany(companyData);
                }

                // Cargar datos del perfil
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profileError && profileError.code !== 'PGRST116') {
                    console.error('Error loading profile data:', profileError);
                } else if (profileData) {
                    setFreelancerProfile(profileData);
                }

                // Cargar configuración de la empresa (usa user_id directamente)
                const { data: settingsData, error: settingsError } = await supabase
                    .from('company_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();

                if (settingsError && settingsError.code !== 'PGRST116') {
                    console.error('Error loading company settings:', settingsError);
                } else if (settingsData) {
                    setCompanySettings(settingsData);
                }

                // Combinar todos los datos disponibles con jerarquía inteligente
                setFreelancerData({
                    // Nombre: company_settings > companies > profiles > email
                    name: settingsData?.company_name || companyData?.name || profileData?.name || user.email?.split('@')[0] || '',

                    // DNI/NIF: company_settings > companies > profiles
                    dni: settingsData?.nif || companyData?.tax_id || profileData?.dni || '',

                    // Dirección completa: company_settings > companies > profiles
                    address: settingsData?.address || companyData?.address || profileData?.address || '',

                    // Email: companies > company_settings > user
                    email: companyData?.email || settingsData?.email || user.email || '',

                    // Teléfono: companies > company_settings > profiles
                    phone: companyData?.phone || settingsData?.phone || profileData?.phone || '',

                    // Ciudad: company_settings > profiles > extraer de address
                    city: settingsData?.city || profileData?.city || settingsData?.address?.split(',').pop()?.trim() || companyData?.address?.split(',').pop()?.trim() || ''
                });
            }
        } catch (error) {
            console.error('Error loading freelancer data:', error);
        }
    };

    const getCategoryIcon = (category: string) => {
        const icons = {
            web_development: '💻',
            design: '🎨',
            marketing: '📢',
            consulting: '💼',
            content: '✍️',
            general: '📄'
        };
        return icons[category as keyof typeof icons] || '📄';
    };

    const getCategoryName = (category: string) => {
        const names = {
            web_development: 'Desarrollo Web',
            design: 'Diseño Gráfico',
            marketing: 'Marketing Digital',
            consulting: 'Consultoría',
            content: 'Redacción de Contenidos',
            general: 'General'
        };
        return names[category as keyof typeof names] || 'General';
    };

    const handleTemplateSelect = (template: ContractTemplate) => {
        setSelectedTemplate(template);
        setFormData({
            ...formData,
            title: `Contrato - ${template.name}`,
            description: template.description || ''
        });
    };

    const handleNext = () => {
        if (step === 1 && !selectedTemplate) {
            showToast.error('Selecciona un template de contrato');
            return;
        }
        if (step === 2 && !selectedClient) {
            showToast.error('Selecciona un cliente');
            return;
        }
        setStep(step + 1);
    };

    const handleBack = () => {
        setStep(step - 1);
    };

    const handleCreateContract = async () => {
        if (!selectedTemplate || !selectedClient) return;

        try {
            setLoading(true);
            const supabase = createSupabaseClient();

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                throw new Error('Usuario no autenticado');
            }

            // Obtener datos del perfil del usuario
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            // Generate contract content with replaced variables
            let contractContent = selectedTemplate.template_content;

            // Replace common variables with real data
            const replacements = {
                freelancer_name: freelancerData.name || 'Nombre del Freelancer',
                freelancer_dni: freelancerData.dni || '[DNI del Freelancer]',
                freelancer_address: freelancerData.address || '[Dirección del Freelancer]',
                freelancer_email: freelancerData.email || '[Email del Freelancer]',
                freelancer_phone: freelancerData.phone || '[Teléfono del Freelancer]',
                client_name: selectedClient.name,
                client_document_type: selectedClient.nif ? 'NIF' : 'DNI',
                client_document: selectedClient.nif || '[Documento del cliente]',
                client_address: selectedClient.address || '[Dirección del cliente]',
                client_email: selectedClient.email || '[Email del cliente]',
                client_phone: selectedClient.phone || '[Teléfono del cliente]',
                client_company: selectedClient.company || '',
                client_city: selectedClient.city || '[Ciudad del cliente]',
                client_province: selectedClient.province || '[Provincia del cliente]',
                project_name: formData.title,
                project_description: formData.description,
                technologies: formData.project_details.technologies || '[Tecnologías]',
                main_features: formData.project_details.main_features || '[Funcionalidades principales]',
                project_duration: formData.project_details.project_duration || '[Duración del proyecto]',
                additional_deliverables: formData.project_details.additional_deliverables || '[Entregables adicionales]',
                design_type: formData.project_details.design_type || '[Tipo de diseño]',
                initial_proposals: formData.project_details.initial_proposals || '3',
                revisions_included: formData.project_details.revisions_included || '2',
                first_delivery_date: formData.project_details.first_delivery_date || '[Fecha primera entrega]',
                file_formats: formData.project_details.file_formats || 'PDF, PNG, JPG, AI',
                revision_cost: formData.project_details.revision_cost || '50',
                social_networks: formData.project_details.social_networks || '[Redes sociales]',
                content_strategy: formData.project_details.content_strategy || '[Estrategia de contenido]',
                advertising_campaigns: formData.project_details.advertising_campaigns || '[Campañas publicitarias]',
                reporting_frequency: formData.project_details.reporting_frequency || 'Mensual',
                main_objective: formData.project_details.main_objective || '[Objetivo principal]',
                kpis: formData.project_details.kpis || '[KPIs a medir]',
                reach_goal: formData.project_details.reach_goal || '[Meta de alcance]',
                engagement_goal: formData.project_details.engagement_goal || '[Meta de engagement]',
                contract_duration: formData.project_details.contract_duration || '6',
                notice_period: formData.project_details.notice_period || '30',
                professional_fee: formData.project_details.professional_fee || formData.contract_value,
                ad_budget: formData.project_details.ad_budget || '500',
                monthly_total: formData.project_details.monthly_total || formData.contract_value,
                meeting_frequency: formData.project_details.meeting_frequency || 'Semanal',
                communication_channel: formData.project_details.communication_channel || 'Email y WhatsApp',
                specialization: formData.project_details.specialization || '[Especialización]',
                project_scope: formData.project_details.project_scope || formData.description,
                expected_outcomes: formData.project_details.expected_outcomes || '[Resultados esperados]',
                work_modality: formData.project_details.work_modality || 'Remoto',
                estimated_hours: formData.project_details.estimated_hours || '[Horas estimadas]',
                weekly_hours: formData.project_details.weekly_hours || '20',
                hourly_rate: formData.project_details.hourly_rate || '50',
                total_estimate: formData.project_details.total_estimate || formData.contract_value,
                billing_frequency: formData.project_details.billing_frequency || 'Mensual',
                content_type: formData.project_details.content_type || '[Tipo de contenido]',
                content_quantity: formData.project_details.content_quantity || '[Cantidad]',
                average_length: formData.project_details.average_length || '500',
                tone_style: formData.project_details.tone_style || 'Profesional',
                max_revisions: formData.project_details.max_revisions || '2',
                delivery_frequency: formData.project_details.delivery_frequency || 'Semanal',
                review_deadline: formData.project_details.review_deadline || '3',
                price_per_word: formData.project_details.price_per_word || '0.05',
                price_per_piece: formData.project_details.price_per_piece || '100',
                seo_optimization: formData.project_details.seo_optimization || 'Sí',
                target_keywords: formData.project_details.target_keywords || '[Palabras clave]',
                keyword_density: formData.project_details.keyword_density || '2',
                contract_value: formData.contract_value,
                currency: formData.currency,
                start_date: new Date(formData.start_date).toLocaleDateString('es-ES'),
                end_date: new Date(formData.end_date).toLocaleDateString('es-ES'),
                payment_terms: formData.payment_terms,
                contract_date: new Date().toLocaleDateString('es-ES'),
                city: freelancerData.city || '[Tu Ciudad]',
                jurisdiction: freelancerData.city || '[Tu Jurisdicción]'
            };

            // Replace variables in template
            Object.entries(replacements).forEach(([key, value]) => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                contractContent = contractContent.replace(regex, String(value) || `[${key}]`);
            });

            // Apply professional format to the contract
            const contractData = {
                title: formData.title,
                contract_value: formData.contract_value,
                currency: formData.currency,
                start_date: new Date(formData.start_date).toLocaleDateString('es-ES'),
                end_date: new Date(formData.end_date).toLocaleDateString('es-ES'),
                payment_terms: formData.payment_terms
            };

            contractContent = generateProfessionalContract(contractContent, contractData, freelancerData, selectedClient);

            // Validar datos antes de insertar
            if (!formData.title.trim()) {
                throw new Error('El título del contrato es obligatorio');
            }

            if (!contractContent.trim()) {
                throw new Error('El contenido del contrato no puede estar vacío');
            }

                user_id: user.id,
                client_id: selectedClient.id,
                template_id: selectedTemplate.id,
                title: formData.title,
                description: formData.description,
                contract_value: parseFloat(formData.contract_value) || 0,
                currency: formData.currency,
                start_date: formData.start_date,
                end_date: formData.end_date,
                payment_terms: formData.payment_terms
            });

            const { data, error } = await supabase
                .from('contracts')
                .insert({
                    user_id: user.id,
                    client_id: selectedClient.id,
                    template_id: selectedTemplate.id,
                    title: formData.title,
                    description: formData.description,
                    contract_content: contractContent,
                    contract_value: parseFloat(formData.contract_value) || 0,
                    currency: formData.currency,
                    start_date: formData.start_date,
                    end_date: formData.end_date,
                    payment_terms: formData.payment_terms,
                    project_details: formData.project_details
                })
                .select()
                .single();

            if (error) throw error;

            showToast.success('Contrato creado exitosamente');
            router.push(`/dashboard/contracts/${data.id}`);
        } catch (error) {
            console.error('Error creating contract:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));

            // Mostrar error más específico
            if (error && typeof error === 'object' && 'message' in error) {
                const errorMessage = (error as any).message;
                console.error('Error message:', errorMessage);

                if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
                    showToast.error('Error: Las tablas de contratos no existen. Ejecuta la migración SQL en Supabase.');
                } else if (errorMessage.includes('violates foreign key constraint')) {
                    showToast.error('Error: Cliente no válido. Verifica que el cliente exista.');
                } else if (errorMessage.includes('null value in column')) {
                    showToast.error('Error: Faltan campos obligatorios en el formulario.');
                } else {
                    showToast.error(`Error al crear el contrato: ${errorMessage}`);
                }
            } else {
                showToast.error('Error desconocido al crear el contrato. Revisa la consola para más detalles.');
            }
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    1
                </div>
                <div className={`w-12 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    2
                </div>
                <div className={`w-12 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                    3
                </div>
            </div>
        </div>
    );

    const renderStep1 = () => (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                Selecciona un Template de Contrato
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <div
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`cursor-pointer p-6 rounded-lg border-2 transition-all hover:shadow-lg ${selectedTemplate?.id === template.id
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="text-center mb-4">
                            <div className="text-4xl mb-2">{getCategoryIcon(template.category)}</div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                {template.name}
                            </h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {template.description}
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                            Categoría: {getCategoryName(template.category)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                Selecciona el Cliente
            </h2>
            {clients.length === 0 ? (
                <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No tienes clientes registrados
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Necesitas al menos un cliente para crear un contrato.
                    </p>
                    <Button onClick={() => router.push('/dashboard/clients/create')}>
                        Crear Cliente
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map((client) => (
                        <div
                            key={client.id}
                            onClick={() => setSelectedClient(client)}
                            className={`cursor-pointer p-4 rounded-lg border-2 transition-all hover:shadow-md ${selectedClient?.id === client.id
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                {client.name}
                            </h3>
                            {client.company && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {client.company}
                                </p>
                            )}
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                                {client.email}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderStep3 = () => {
        if (!showPreview) {
            return renderFormStep3();
        }
        return renderContractPreview();
    };

    const renderFormStep3 = () => (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                Detalles del Contrato
            </h2>
            <div className="max-w-2xl mx-auto space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Título del Contrato
                    </label>
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Ej: Desarrollo de sitio web corporativo"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Descripción del Proyecto
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Describe el proyecto en detalle..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Valor del Contrato
                        </label>
                        <input
                            type="number"
                            value={formData.contract_value}
                            onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Moneda
                        </label>
                        <select
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="EUR">EUR (€)</option>
                            <option value="USD">USD ($)</option>
                            <option value="GBP">GBP (£)</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="inline w-4 h-4 mr-2" />
                            Fecha de Inicio
                        </label>
                        <DatePicker
                            selected={startDate}
                            onChange={(date: Date | null) => {
                                setStartDate(date);
                                setFormData({
                                    ...formData,
                                    start_date: date ? date.toISOString().split('T')[0] : ''
                                });
                            }}
                            locale={es}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Selecciona fecha de inicio"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                            wrapperClassName="w-full"
                            calendarClassName="bonsai-datepicker-calendar"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="inline w-4 h-4 mr-2" />
                            Fecha de Finalización
                        </label>
                        <DatePicker
                            selected={endDate}
                            onChange={(date: Date | null) => {
                                setEndDate(date);
                                setFormData({
                                    ...formData,
                                    end_date: date ? date.toISOString().split('T')[0] : ''
                                });
                            }}
                            locale={es}
                            dateFormat="dd/MM/yyyy"
                            placeholderText="Selecciona fecha de finalización"
                            minDate={startDate || undefined}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
                            wrapperClassName="w-full"
                            calendarClassName="bonsai-datepicker-calendar"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Términos de Pago
                    </label>
                    <textarea
                        value={formData.payment_terms}
                        onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Ej: 50% al inicio, 50% al finalizar el proyecto"
                    />
                </div>

                {/* Campos específicos por tipo de contrato */}
                {renderTemplateSpecificFields()}

                <div className="flex gap-4 pt-6">
                    <Button
                        variant="outline"
                        onClick={() => setShowPreview(true)}
                        disabled={!isFormValid()}
                        className={`flex-1 ${!isFormValid() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isFormValid() ? 'Ver Previsualización' : 'Completar formulario para previsualizar'}
                    </Button>
                </div>

                {/* Indicador de campos faltantes */}
                {!isFormValid() && (
                    <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                    Completar formulario para continuar
                                </h3>
                                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                                    <p>Para poder previsualizar el contrato, completa todos los campos obligatorios (*) incluidos los específicos del tipo de contrato seleccionado.</p>
                                    {selectedTemplate?.category && (
                                        <p className="mt-1 font-medium">
                                            Tipo seleccionado: <span className="capitalize">{getCategoryName(selectedTemplate.category)}</span>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderContractPreview = () => {
        // Generar el contenido del contrato para previsualización
        let contractContent = selectedTemplate?.template_content || '';

        // Reemplazar variables con datos actuales (básicos + específicos del proyecto)
        const replacements = {
            // Datos del freelancer
            freelancer_name: freelancerData.name || '[Nombre del Freelancer]',
            freelancer_dni: freelancerData.dni || '[DNI del Freelancer]',
            freelancer_address: freelancerData.address || '[Dirección del Freelancer]',
            freelancer_email: freelancerData.email || '[Email del Freelancer]',
            freelancer_phone: freelancerData.phone || '[Teléfono del Freelancer]',

            // Datos del cliente
            client_name: selectedClient?.name || '[Nombre del Cliente]',
            client_document_type: selectedClient?.nif ? 'NIF' : 'DNI',
            client_document: selectedClient?.nif || '[Documento del cliente]',
            client_address: selectedClient?.address || '[Dirección del cliente]',
            client_email: selectedClient?.email || '[Email del cliente]',
            client_phone: selectedClient?.phone || '[Teléfono del cliente]',
            client_company: selectedClient?.company || '',
            client_city: selectedClient?.city || '[Ciudad del cliente]',
            client_province: selectedClient?.province || '[Provincia del cliente]',

            // Datos básicos del contrato
            project_name: formData.title || '[Título del Proyecto]',
            project_description: formData.description || '[Descripción del Proyecto]',
            contract_value: formData.contract_value || '[Valor del Contrato]',
            currency: formData.currency || 'EUR',
            start_date: startDate ? startDate.toLocaleDateString('es-ES') : '[Fecha de inicio]',
            end_date: endDate ? endDate.toLocaleDateString('es-ES') : '[Fecha de finalización]',
            payment_terms: formData.payment_terms || '[Términos de Pago]',
            contract_date: new Date().toLocaleDateString('es-ES'),
            city: freelancerData.city || '[Tu Ciudad]',
            jurisdiction: freelancerData.city || '[Tu Jurisdicción]',

            // Datos específicos del proyecto (se rellenan automáticamente desde formData.project_details)
            ...Object.keys(formData.project_details).reduce((acc, key) => {
                acc[key] = formData.project_details[key] || `[${key}]`;
                return acc;
            }, {} as Record<string, string>)
        };

        // Reemplazar variables en el template
        Object.entries(replacements).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            contractContent = contractContent.replace(regex, String(value) || `[${key}]`);
        });

        return (
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
                    Previsualización del Contrato
                </h2>

                {/* Panel editable de datos del freelancer */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            📝 Datos del Freelancer (Editables)
                        </h3>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                            <div className="bg-white dark:bg-gray-800 rounded px-2 py-1 shadow-sm">
                                Datos cargados automáticamente desde tu perfil
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nombre Completo {getDataSourceBadge('name')}
                            </label>
                            <input
                                type="text"
                                value={freelancerData.name}
                                onChange={(e) => setFreelancerData({ ...freelancerData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                placeholder="Tu nombre completo o empresa"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                DNI/NIF {getDataSourceBadge('dni')}
                            </label>
                            <input
                                type="text"
                                value={freelancerData.dni}
                                onChange={(e) => setFreelancerData({ ...freelancerData, dni: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                placeholder="12345678A"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Dirección Completa {getDataSourceBadge('address')}
                            </label>
                            <input
                                type="text"
                                value={freelancerData.address}
                                onChange={(e) => setFreelancerData({ ...freelancerData, address: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                placeholder="Calle, número, código postal, ciudad"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email Profesional {getDataSourceBadge('email')}
                            </label>
                            <input
                                type="email"
                                value={freelancerData.email}
                                onChange={(e) => setFreelancerData({ ...freelancerData, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                placeholder="tu@empresa.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Teléfono {getDataSourceBadge('phone')}
                            </label>
                            <input
                                type="tel"
                                value={freelancerData.phone}
                                onChange={(e) => setFreelancerData({ ...freelancerData, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                placeholder="+34 600 000 000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Ciudad {getDataSourceBadge('city')}
                            </label>
                            <input
                                type="text"
                                value={freelancerData.city}
                                onChange={(e) => setFreelancerData({ ...freelancerData, city: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                placeholder="Madrid"
                            />
                        </div>
                    </div>
                </div>

                {/* Previsualización del contrato */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6 border">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-4 max-h-96 overflow-y-auto">
                        <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
                            {contractContent}
                        </pre>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={() => setShowPreview(false)}
                        className="flex-1"
                    >
                        ← Editar Datos
                    </Button>
                    <Button
                        onClick={handleCreateContract}
                        disabled={loading}
                        className="flex-1"
                    >
                        {loading ? 'Creando...' : 'Crear Contrato'}
                    </Button>
                </div>
            </div>
        );
    };

    const renderTemplateSpecificFields = () => {
        if (!selectedTemplate) return null;

        const updateProjectDetail = (key: string, value: string) => {
            setFormData({
                ...formData,
                project_details: {
                    ...formData.project_details,
                    [key]: value
                }
            });
        };

        switch (selectedTemplate.category) {
            case 'web_development':
                return (
                    <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Detalles del Desarrollo Web
                        </h3>

                        {/* Primera fila - Tecnologías y Duración */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tecnologías a utilizar *
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_details.technologies || ''}
                                    onChange={(e) => updateProjectDetail('technologies', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Ej: React, Node.js, MongoDB, Tailwind CSS..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Duración estimada (días) *
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.project_duration || ''}
                                    onChange={(e) => updateProjectDetail('project_duration', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="30"
                                    min="1"
                                    required
                                />
                            </div>
                        </div>

                        {/* Segunda fila - Funcionalidades principales */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Funcionalidades principales *
                            </label>
                            <textarea
                                value={formData.project_details.main_features || ''}
                                onChange={(e) => updateProjectDetail('main_features', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ej: Sistema de autenticación, panel de administración, carrito de compras, integración con pagos..."
                                rows={3}
                                required
                            />
                        </div>

                        {/* Tercera fila - Entregables adicionales */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Entregables adicionales
                            </label>
                            <textarea
                                value={formData.project_details.additional_deliverables || ''}
                                onChange={(e) => updateProjectDetail('additional_deliverables', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ej: Capacitación del equipo, documentación adicional, hosting por 1 año..."
                                rows={2}
                            />
                        </div>

                        {/* Nota informativa */}
                        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                            <p className="text-sm text-green-700 dark:text-green-300">
                                <strong>📦 Incluido por defecto:</strong> Código fuente completo, documentación técnica y manual de usuario.
                                Especifica arriba cualquier entregable adicional acordado con el cliente.
                            </p>
                        </div>
                    </div>
                );

            case 'design':
                return (
                    <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Detalles del Diseño
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tipo de diseño
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_details.design_type || ''}
                                    onChange={(e) => updateProjectDetail('design_type', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Logo, Branding, Web..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Propuestas iniciales
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.initial_proposals || ''}
                                    onChange={(e) => updateProjectDetail('initial_proposals', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="3"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Revisiones incluidas
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.revisions_included || ''}
                                    onChange={(e) => updateProjectDetail('revisions_included', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="2"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Formatos de archivo
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_details.file_formats || ''}
                                    onChange={(e) => updateProjectDetail('file_formats', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="AI, PDF, PNG, JPG"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Costo por revisión adicional (€)
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.revision_cost || ''}
                                    onChange={(e) => updateProjectDetail('revision_cost', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="50"
                                />
                            </div>
                        </div>

                        {/* Sección de fechas de entrega */}
                        <div className="border-t pt-6 mt-6">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                                Cronograma de Entrega
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Fecha de entrega de primeras propuestas
                                    </label>
                                    <DatePicker
                                        selected={formData.project_details.first_delivery_date ? new Date(formData.project_details.first_delivery_date) : null}
                                        onChange={(date) => updateProjectDetail('first_delivery_date', date ? date.toISOString().split('T')[0] : '')}
                                        locale={es}
                                        dateFormat="dd/MM/yyyy"
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholderText="Seleccionar fecha de primeras propuestas"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'marketing':
                return (
                    <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Detalles del Marketing Digital
                        </h3>

                        {/* Primera fila - Redes sociales y Objetivo principal */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Redes sociales a gestionar *
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_details.social_networks || ''}
                                    onChange={(e) => updateProjectDetail('social_networks', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Ej: Instagram, Facebook, LinkedIn, TikTok..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Objetivo principal *
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_details.main_objective || ''}
                                    onChange={(e) => updateProjectDetail('main_objective', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Ej: Aumentar ventas, mejorar visibilidad..."
                                    required
                                />
                            </div>
                        </div>

                        {/* Segunda fila - KPIs y Metas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    KPIs a medir *
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_details.kpis || ''}
                                    onChange={(e) => updateProjectDetail('kpis', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Ej: CTR, conversiones, engagement rate..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Duración inicial (meses)
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.contract_duration || ''}
                                    onChange={(e) => updateProjectDetail('contract_duration', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="3"
                                    min="1"
                                />
                            </div>
                        </div>

                        {/* Tercera fila - Metas específicas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Meta de alcance
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_details.reach_goal || ''}
                                    onChange={(e) => updateProjectDetail('reach_goal', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Ej: 10,000 personas/mes"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Meta de engagement
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_details.engagement_goal || ''}
                                    onChange={(e) => updateProjectDetail('engagement_goal', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Ej: 5% engagement rate"
                                />
                            </div>
                        </div>

                        {/* Estrategia de contenido */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Estrategia de contenido *
                            </label>
                            <textarea
                                value={formData.project_details.content_strategy || ''}
                                onChange={(e) => updateProjectDetail('content_strategy', e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Describe la estrategia de contenido, tipos de posts, frecuencia de publicación..."
                                required
                            />
                        </div>

                        {/* Campañas publicitarias */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Campañas publicitarias
                            </label>
                            <textarea
                                value={formData.project_details.advertising_campaigns || ''}
                                onChange={(e) => updateProjectDetail('advertising_campaigns', e.target.value)}
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ej: Campañas de Facebook Ads, Google Ads, Instagram Stories..."
                            />
                        </div>

                        {/* Tarifas mensuales */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Honorarios profesionales (€/mes)
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.professional_fee || ''}
                                    onChange={(e) => updateProjectDetail('professional_fee', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="800"
                                    min="1"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Presupuesto publicitario (€/mes)
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.ad_budget || ''}
                                    onChange={(e) => updateProjectDetail('ad_budget', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="500"
                                    min="0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Total mensual (€)
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.monthly_total || ''}
                                    onChange={(e) => updateProjectDetail('monthly_total', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Se calculará automáticamente"
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* Comunicación y reportes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Frecuencia de reuniones
                                </label>
                                <select
                                    value={formData.project_details.meeting_frequency || ''}
                                    onChange={(e) => updateProjectDetail('meeting_frequency', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Semanal">Semanal</option>
                                    <option value="Quincenal">Quincenal</option>
                                    <option value="Mensual">Mensual</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Canal de comunicación
                                </label>
                                <select
                                    value={formData.project_details.communication_channel || ''}
                                    onChange={(e) => updateProjectDetail('communication_channel', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Email">Email</option>
                                    <option value="WhatsApp">WhatsApp</option>
                                    <option value="Slack">Slack</option>
                                    <option value="Videollamada">Videollamada</option>
                                </select>
                            </div>
                        </div>

                        {/* Términos adicionales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Frecuencia de reportes
                                </label>
                                <select
                                    value={formData.project_details.reporting_frequency || ''}
                                    onChange={(e) => updateProjectDetail('reporting_frequency', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Semanal">Semanal</option>
                                    <option value="Quincenal">Quincenal</option>
                                    <option value="Mensual">Mensual</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Preaviso para cancelación (días)
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.notice_period || ''}
                                    onChange={(e) => updateProjectDetail('notice_period', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="30"
                                />
                            </div>
                        </div>

                        {/* Nota informativa */}
                        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
                            <p className="text-sm text-purple-700 dark:text-purple-300">
                                <strong>📊 Incluido:</strong> Informes mensuales detallados y análisis de rendimiento.
                                El presupuesto publicitario es gestionado por el cliente pero optimizado por el consultor.
                            </p>
                        </div>
                    </div>
                );

            case 'consulting':
                return (
                    <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Detalles de la Consultoría
                        </h3>

                        {/* Primera fila - Especialización y Modalidad */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Área de especialización *
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_details.specialization || ''}
                                    onChange={(e) => updateProjectDetail('specialization', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Ej: Estrategia empresarial, Transformación digital, IT..."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Modalidad de trabajo *
                                </label>
                                <select
                                    value={formData.project_details.work_modality || ''}
                                    onChange={(e) => updateProjectDetail('work_modality', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                >
                                    <option value="">Seleccionar modalidad...</option>
                                    <option value="Presencial">Presencial</option>
                                    <option value="Remoto">Remoto</option>
                                    <option value="Híbrido">Híbrido</option>
                                </select>
                            </div>
                        </div>

                        {/* Segunda fila - Alcance y Objetivos */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Alcance del proyecto *
                            </label>
                            <textarea
                                value={formData.project_details.project_scope || ''}
                                onChange={(e) => updateProjectDetail('project_scope', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Describe el alcance específico del proyecto de consultoría..."
                                rows={3}
                                required
                            />
                        </div>

                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Objetivos esperados *
                            </label>
                            <textarea
                                value={formData.project_details.expected_outcomes || ''}
                                onChange={(e) => updateProjectDetail('expected_outcomes', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="¿Qué resultados espera obtener el cliente con esta consultoría?"
                                rows={3}
                                required
                            />
                        </div>

                        {/* Tercera fila - Horas y Dedicación */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Horas estimadas *
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.estimated_hours || ''}
                                    onChange={(e) => updateProjectDetail('estimated_hours', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="40"
                                    min="1"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Horas semanales *
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.weekly_hours || ''}
                                    onChange={(e) => updateProjectDetail('weekly_hours', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="8"
                                    min="1"
                                    max="40"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tarifa por hora (€) *
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.hourly_rate || ''}
                                    onChange={(e) => updateProjectDetail('hourly_rate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="75"
                                    min="1"
                                    required
                                />
                            </div>
                        </div>

                        {/* Cuarta fila - Facturación y Entregables */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Frecuencia de facturación
                                </label>
                                <select
                                    value={formData.project_details.billing_frequency || ''}
                                    onChange={(e) => updateProjectDetail('billing_frequency', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Semanal">Semanal</option>
                                    <option value="Quincenal">Quincenal</option>
                                    <option value="Mensual">Mensual</option>
                                    <option value="Al finalizar">Al finalizar proyecto</option>
                                    <option value="Por hitos">Por hitos completados</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Importe total estimado (€)
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.total_estimate || ''}
                                    onChange={(e) => updateProjectDetail('total_estimate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Se calculará automáticamente"
                                    readOnly
                                />
                            </div>
                        </div>

                        {/* Entregables adicionales */}
                        <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Entregables adicionales
                            </label>
                            <textarea
                                value={formData.project_details.additional_deliverables || ''}
                                onChange={(e) => updateProjectDetail('additional_deliverables', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Ej: Presentación ejecutiva, manual de procesos, capacitación al equipo..."
                                rows={2}
                            />
                        </div>

                        {/* Nota informativa */}
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>💡 Nota:</strong> El importe total se calculará automáticamente multiplicando las horas estimadas por la tarifa por hora.
                                Los entregables estándar incluyen: informe inicial de diagnóstico, plan de acción detallado, implementación de soluciones e informe final con recomendaciones.
                            </p>
                        </div>
                    </div>
                );

            case 'content':
                return (
                    <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Detalles de Redacción
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tipo de contenido
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_details.content_type || ''}
                                    onChange={(e) => updateProjectDetail('content_type', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Blog posts, web copy..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Cantidad de piezas
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.content_quantity || ''}
                                    onChange={(e) => updateProjectDetail('content_quantity', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="10"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Palabras promedio
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.average_length || ''}
                                    onChange={(e) => updateProjectDetail('average_length', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="500"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tono y estilo
                                </label>
                                <input
                                    type="text"
                                    value={formData.project_details.tone_style || ''}
                                    onChange={(e) => updateProjectDetail('tone_style', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Profesional, cercano..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Revisiones máximas
                                </label>
                                <input
                                    type="number"
                                    value={formData.project_details.max_revisions || ''}
                                    onChange={(e) => updateProjectDetail('max_revisions', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="2"
                                />
                            </div>
                        </div>

                        {/* Sección de Plazos */}
                        <div className="border-t pt-6 mt-6">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                                Plazos de Entrega
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Frecuencia de entrega
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.project_details.delivery_frequency || ''}
                                        onChange={(e) => updateProjectDetail('delivery_frequency', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="Semanal, quincenal, mensual..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Plazo para revisiones (días hábiles)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.project_details.review_deadline || ''}
                                        onChange={(e) => updateProjectDetail('review_deadline', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="3"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sección de Tarificación */}
                        <div className="border-t pt-6 mt-6">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                                Tarificación
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Precio por palabra (EUR)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.project_details.price_per_word || ''}
                                        onChange={(e) => updateProjectDetail('price_per_word', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="0.05"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Precio por pieza (EUR)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.project_details.price_per_piece || ''}
                                        onChange={(e) => updateProjectDetail('price_per_piece', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="50.00"
                                    />
                                </div>
                            </div>
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Total del proyecto (EUR)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.project_details.total_project || ''}
                                    onChange={(e) => updateProjectDetail('total_project', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    placeholder="Calculado automáticamente"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Se calcula automáticamente basado en precio por palabra/pieza y cantidad
                                </p>
                            </div>
                        </div>

                        {/* Sección de SEO y Palabras Clave */}
                        <div className="border-t pt-6 mt-6">
                            <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                                SEO y Palabras Clave
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Optimización SEO
                                    </label>
                                    <select
                                        value={formData.project_details.seo_optimization || ''}
                                        onChange={(e) => updateProjectDetail('seo_optimization', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Sí">Sí</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Palabras clave objetivo
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.project_details.target_keywords || ''}
                                        onChange={(e) => updateProjectDetail('target_keywords', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="marketing digital, SEO, contenido..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Densidad de palabra clave (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="10"
                                        value={formData.project_details.keyword_density || ''}
                                        onChange={(e) => updateProjectDetail('keyword_density', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        placeholder="1.5"
                                    />
                                </div>
                            </div>
                            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-4 border-blue-500">
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    <strong>💡 Tip SEO:</strong> La densidad de palabra clave recomendada está entre 1-3%. Palabras clave muy específicas mejoran el posicionamiento del contenido.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const handleLogout = async () => {
        const supabase = createSupabaseClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar userEmail={userEmail} onLogout={handleLogout} />

            <div className="flex-1 flex flex-col overflow-hidden ml-56">
                <TrialBanner userEmail={userEmail} />

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-900">
                    <div className="h-full px-6 py-8">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center mb-6">
                                <Button
                                    variant="ghost"
                                    onClick={() => router.push('/dashboard/contracts')}
                                    className="mr-4"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Volver
                                </Button>
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                                        Crear Nuevo Contrato
                                    </h1>
                                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                                        Genera un contrato profesional en pocos pasos
                                    </p>
                                </div>
                            </div>

                            {renderStepIndicator()}
                        </div>

                        {/* Content */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
                            {step === 1 && renderStep1()}
                            {step === 2 && renderStep2()}
                            {step === 3 && renderStep3()}

                            {/* Navigation Buttons */}
                            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <div>
                                    {step > 1 && (
                                        <Button
                                            variant="outline"
                                            onClick={handleBack}
                                        >
                                            Anterior
                                        </Button>
                                    )}
                                </div>
                                <div>
                                    {step < 3 ? (
                                        <Button
                                            onClick={handleNext}
                                        >
                                            Siguiente
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={handleCreateContract}
                                            disabled={loading}
                                        >
                                            {loading ? 'Creando...' : 'Crear Contrato'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
