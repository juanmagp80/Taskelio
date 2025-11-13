'use client';

import { Button } from '@/components/ui/Button';
import { createSupabaseClient } from '@/src/lib/supabase-client';
import { showToast } from '@/utils/toast';
import { Calendar, DollarSign, FileText, Mail, Plus, User, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface NewProposalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userEmail: string;
}

interface ServiceItem {
    id: string;
    name: string;
    description: string;
}

interface PricingPackage {
    name: string;
    price: number;
    description: string;
    features: string[];
}

interface Client {
    id: string;
    name: string;
    email: string | null;
    company: string | null;
}

export default function NewProposalModal({ isOpen, onClose, onSuccess, userEmail }: NewProposalModalProps) {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [clients, setClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [showNewClientForm, setShowNewClientForm] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    
    // Datos básicos de la propuesta
    const [proposalData, setProposalData] = useState({
        // Información del cliente
        prospect_name: '',
        prospect_email: '',
        
        // Información de la propuesta
        title: '',
        description: '',
        
        // Servicios
        services: [] as ServiceItem[],
        
        // Precios
        pricing: {
            packages: [] as PricingPackage[]
        },
        
        // Términos
        terms: {
            payment_terms: '50% al inicio, 50% al entregar',
            delivery_time: '',
            revisions: '3 rondas de revisiones incluidas',
            warranty: '',
            additional_work: 'Trabajos adicionales se cotizarán por separado'
        },
        
        // Timeline
        timeline: {
            phases: [] as Array<{
                name: string;
                duration: string;
                deliverable: string;
            }>
        },
        
        // Otros
        total_amount: 0,
        currency: 'EUR',
        valid_until: '',
        notes: ''
    });
    
    // Estados para servicios y fases
    const [newService, setNewService] = useState({ name: '', description: '' });
    const [newPhase, setNewPhase] = useState({ name: '', duration: '', deliverable: '' });
    const [currentPackage, setCurrentPackage] = useState({
        name: '',
        price: 0,
        description: '',
        features: ['']
    });

    // Cargar clientes al abrir el modal
    useEffect(() => {
        if (isOpen) {
            fetchClients();
        }
    }, [isOpen]);

    const fetchClients = async () => {
        setLoadingClients(true);
        try {
            const supabase = createSupabaseClient();
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Usuario no autenticado');
            }

            const { data, error } = await supabase
                .from('clients')
                .select('id, name, email, company')
                .eq('user_id', user.id)
                .order('name', { ascending: true });

            if (error) throw error;

            setClients(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
            showToast.error('Error cargando clientes');
        } finally {
            setLoadingClients(false);
        }
    };

    const handleClientSelect = (clientId: string) => {
        setSelectedClientId(clientId);
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setProposalData(prev => ({
                ...prev,
                prospect_name: client.company || client.name,
                prospect_email: client.email || ''
            }));
        }
    };

    const resetForm = () => {
        setProposalData({
            prospect_name: '',
            prospect_email: '',
            title: '',
            description: '',
            services: [],
            pricing: { packages: [] },
            terms: {
                payment_terms: '50% al inicio, 50% al entregar',
                delivery_time: '',
                revisions: '3 rondas de revisiones incluidas',
                warranty: '',
                additional_work: 'Trabajos adicionales se cotizarán por separado'
            },
            timeline: { phases: [] },
            total_amount: 0,
            currency: 'EUR',
            valid_until: '',
            notes: ''
        });
        setStep(1);
        setSelectedClientId('');
        setShowNewClientForm(false);
        setNewService({ name: '', description: '' });
        setNewPhase({ name: '', duration: '', deliverable: '' });
        setCurrentPackage({ name: '', price: 0, description: '', features: [''] });
    };

    const addService = () => {
        if (newService.name.trim()) {
            setProposalData(prev => ({
                ...prev,
                services: [...prev.services, {
                    id: Date.now().toString(),
                    name: newService.name,
                    description: newService.description
                }]
            }));
            setNewService({ name: '', description: '' });
        }
    };

    const removeService = (id: string) => {
        setProposalData(prev => ({
            ...prev,
            services: prev.services.filter(s => s.id !== id)
        }));
    };

    const addPhase = () => {
        if (newPhase.name.trim()) {
            setProposalData(prev => ({
                ...prev,
                timeline: {
                    phases: [...prev.timeline.phases, { ...newPhase }]
                }
            }));
            setNewPhase({ name: '', duration: '', deliverable: '' });
        }
    };

    const removePhase = (index: number) => {
        setProposalData(prev => ({
            ...prev,
            timeline: {
                phases: prev.timeline.phases.filter((_, i) => i !== index)
            }
        }));
    };

    const addPackage = () => {
        if (currentPackage.name.trim() && currentPackage.price > 0) {
            const cleanFeatures = currentPackage.features.filter(f => f.trim());
            if (cleanFeatures.length > 0) {
                setProposalData(prev => ({
                    ...prev,
                    pricing: {
                        packages: [...prev.pricing.packages, {
                            ...currentPackage,
                            features: cleanFeatures
                        }]
                    }
                }));
                setCurrentPackage({ name: '', price: 0, description: '', features: [''] });
            }
        }
    };

    const updateFeature = (index: number, value: string) => {
        setCurrentPackage(prev => ({
            ...prev,
            features: prev.features.map((f, i) => i === index ? value : f)
        }));
    };

    const addFeature = () => {
        setCurrentPackage(prev => ({
            ...prev,
            features: [...prev.features, '']
        }));
    };

    const removeFeature = (index: number) => {
        setCurrentPackage(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };

    const calculateTotalAmount = () => {
        const total = proposalData.pricing.packages.reduce((sum, pkg) => sum + pkg.price, 0);
        setProposalData(prev => ({ ...prev, total_amount: total }));
    };

    React.useEffect(() => {
        calculateTotalAmount();
    }, [proposalData.pricing.packages]);

    const handleSubmit = async () => {
        if (!proposalData.title.trim() || !proposalData.prospect_name.trim()) {
            showToast.error('Por favor completa al menos el título y el nombre del cliente');
            return;
        }

        setLoading(true);
        
        try {
            const supabase = createSupabaseClient();
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Usuario no autenticado');
            }

            // Si es un nuevo cliente (showNewClientForm = true), crearlo primero
            let clientId = selectedClientId;
            
            if (showNewClientForm && proposalData.prospect_name.trim()) {
                
                const { data: newClient, error: clientError } = await supabase
                    .from('clients')
                    .insert([{
                        user_id: user.id,
                        name: proposalData.prospect_name,
                        company: proposalData.prospect_name,
                        email: proposalData.prospect_email || null,
                        status: 'active',
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (clientError) {
                    console.error('Error creating client:', clientError);
                    throw new Error('Error creando el cliente');
                }
                
                clientId = newClient.id;
            }

            // Preparar fecha de validez si no se especificó
            const validUntil = proposalData.valid_until || 
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            const { data, error } = await supabase
                .from('proposals')
                .insert([{
                    user_id: user.id,
                    client_id: clientId || null,
                    prospect_name: proposalData.prospect_name,
                    prospect_email: proposalData.prospect_email || null,
                    title: proposalData.title,
                    description: proposalData.description,
                    services: proposalData.services,
                    pricing: proposalData.pricing,
                    terms: proposalData.terms,
                    timeline: proposalData.timeline,
                    status: 'draft',
                    total_amount: proposalData.total_amount,
                    currency: proposalData.currency,
                    valid_until: validUntil,
                    notes: proposalData.notes || null,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) {
                console.error('Error creating proposal:', error);
                throw new Error('Error creando la propuesta');
            }

            showToast.success(showNewClientForm 
                ? '✅ Cliente y propuesta creados exitosamente' 
                : '✅ Propuesta creada exitosamente'
            );
            resetForm();
            onSuccess();
            onClose();

        } catch (error) {
            console.error('Error submitting proposal:', error);
            showToast.error(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (step === 1 && (!proposalData.title.trim() || !proposalData.prospect_name.trim())) {
            showToast.warning('Por favor completa el título y el nombre del cliente');
            return;
        }
        setStep(prev => Math.min(prev + 1, 4));
    };

    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                Nueva Propuesta Comercial
                            </h3>
                            <p className="text-sm text-gray-500">
                                Paso {step} de 4 - {
                                    step === 1 ? 'Información básica' :
                                    step === 2 ? 'Servicios y precios' :
                                    step === 3 ? 'Términos y timeline' :
                                    'Revisión final'
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="px-6 py-4 border-b">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(step / 4) * 100}%` }}
                        ></div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Paso 1: Información Básica */}
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Selector de Cliente */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <User className="inline h-4 w-4 mr-1" />
                                    Seleccionar Cliente *
                                </label>
                                
                                {!showNewClientForm ? (
                                    <div className="space-y-3">
                                        <select
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            value={selectedClientId}
                                            onChange={(e) => handleClientSelect(e.target.value)}
                                            disabled={loadingClients}
                                        >
                                            <option value="">
                                                {loadingClients ? 'Cargando clientes...' : 'Selecciona un cliente existente'}
                                            </option>
                                            {clients.map((client) => (
                                                <option key={client.id} value={client.id}>
                                                    {client.company || client.name} {client.email && `(${client.email})`}
                                                </option>
                                            ))}
                                        </select>
                                        
                                        <button
                                            type="button"
                                            onClick={() => setShowNewClientForm(true)}
                                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Crear nuevo cliente
                                        </button>
                                    </div>
                                ) : (
                                    <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h5 className="font-medium text-gray-900">Nuevo Cliente</h5>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowNewClientForm(false);
                                                    setProposalData(prev => ({ ...prev, prospect_name: '', prospect_email: '' }));
                                                }}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Nombre / Empresa *
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="ej: TechCorp Solutions"
                                                    value={proposalData.prospect_name}
                                                    onChange={(e) => setProposalData(prev => ({ ...prev, prospect_name: e.target.value }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    <Mail className="inline h-4 w-4 mr-1" />
                                                    Email
                                                </label>
                                                <input
                                                    type="email"
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="ej: contacto@techcorp.com"
                                                    value={proposalData.prospect_email}
                                                    onChange={(e) => setProposalData(prev => ({ ...prev, prospect_email: e.target.value }))}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <p className="text-sm text-blue-700">
                                                💡 Este cliente se creará automáticamente al guardar la propuesta
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    <FileText className="inline h-4 w-4 mr-1" />
                                    Título de la Propuesta *
                                </label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="ej: Desarrollo de Plataforma E-commerce"
                                    value={proposalData.title}
                                    onChange={(e) => setProposalData(prev => ({ ...prev, title: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Descripción del Proyecto
                                </label>
                                <textarea
                                    rows={4}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Describe brevemente el proyecto..."
                                    value={proposalData.description}
                                    onChange={(e) => setProposalData(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <DollarSign className="inline h-4 w-4 mr-1" />
                                        Moneda
                                    </label>
                                    <select
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        value={proposalData.currency}
                                        onChange={(e) => setProposalData(prev => ({ ...prev, currency: e.target.value }))}
                                    >
                                        <option value="EUR">EUR (€)</option>
                                        <option value="USD">USD ($)</option>
                                        <option value="GBP">GBP (£)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <Calendar className="inline h-4 w-4 mr-1" />
                                        Válida Hasta
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        value={proposalData.valid_until}
                                        onChange={(e) => setProposalData(prev => ({ ...prev, valid_until: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Paso 2: Servicios y Precios */}
                    {step === 2 && (
                        <div className="space-y-8">
                            {/* Servicios */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">Servicios Incluidos</h4>
                                
                                {/* Lista de servicios */}
                                {proposalData.services.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {proposalData.services.map((service) => (
                                            <div key={service.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div>
                                                    <span className="font-medium text-gray-900">{service.name}</span>
                                                    {service.description && (
                                                        <p className="text-sm text-gray-600">{service.description}</p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => removeService(service.id)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Agregar servicio */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        type="text"
                                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Nombre del servicio"
                                        value={newService.name}
                                        onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                    <input
                                        type="text"
                                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Descripción (opcional)"
                                        value={newService.description}
                                        onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                                    />
                                    <Button
                                        onClick={addService}
                                        variant="outline"
                                        disabled={!newService.name.trim()}
                                    >
                                        Agregar Servicio
                                    </Button>
                                </div>
                            </div>

                            {/* Paquetes de Precios */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">Paquetes de Precios</h4>
                                
                                {/* Lista de paquetes */}
                                {proposalData.pricing.packages.length > 0 && (
                                    <div className="space-y-4 mb-6">
                                        {proposalData.pricing.packages.map((pkg, index) => (
                                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h5 className="font-medium text-gray-900">{pkg.name}</h5>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg font-bold text-blue-600">
                                                            {pkg.price} {proposalData.currency}
                                                        </span>
                                                        <button
                                                            onClick={() => setProposalData(prev => ({
                                                                ...prev,
                                                                pricing: {
                                                                    packages: prev.pricing.packages.filter((_, i) => i !== index)
                                                                }
                                                            }))}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                {pkg.description && (
                                                    <p className="text-sm text-gray-600 mb-2">{pkg.description}</p>
                                                )}
                                                <ul className="text-sm text-gray-700">
                                                    {pkg.features.map((feature, fi) => (
                                                        <li key={fi}>• {feature}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Agregar paquete */}
                                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                                    <h5 className="font-medium text-gray-900">Nuevo Paquete</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <input
                                            type="text"
                                            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Nombre del paquete"
                                            value={currentPackage.name}
                                            onChange={(e) => setCurrentPackage(prev => ({ ...prev, name: e.target.value }))}
                                        />
                                        <input
                                            type="number"
                                            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Precio"
                                            value={currentPackage.price || ''}
                                            onChange={(e) => setCurrentPackage(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                                        />
                                        <input
                                            type="text"
                                            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="Descripción"
                                            value={currentPackage.description}
                                            onChange={(e) => setCurrentPackage(prev => ({ ...prev, description: e.target.value }))}
                                        />
                                    </div>
                                    
                                    {/* Características */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Características incluidas:
                                        </label>
                                        {currentPackage.features.map((feature, index) => (
                                            <div key={index} className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    placeholder="Característica"
                                                    value={feature}
                                                    onChange={(e) => updateFeature(index, e.target.value)}
                                                />
                                                {currentPackage.features.length > 1 && (
                                                    <button
                                                        onClick={() => removeFeature(index)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        <Button
                                            onClick={addFeature}
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                        >
                                            + Agregar Característica
                                        </Button>
                                    </div>
                                    
                                    <Button
                                        onClick={addPackage}
                                        variant="outline"
                                        disabled={!currentPackage.name.trim() || currentPackage.price <= 0}
                                    >
                                        Agregar Paquete
                                    </Button>
                                </div>

                                {/* Total */}
                                {proposalData.pricing.packages.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-blue-900">Total de la Propuesta:</span>
                                            <span className="text-xl font-bold text-blue-600">
                                                {proposalData.total_amount} {proposalData.currency}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Paso 3: Términos y Timeline */}
                    {step === 3 && (
                        <div className="space-y-8">
                            {/* Términos */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">Términos y Condiciones</h4>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Términos de Pago
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            value={proposalData.terms.payment_terms}
                                            onChange={(e) => setProposalData(prev => ({
                                                ...prev,
                                                terms: { ...prev.terms, payment_terms: e.target.value }
                                            }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tiempo de Entrega
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="ej: 4-6 semanas"
                                            value={proposalData.terms.delivery_time}
                                            onChange={(e) => setProposalData(prev => ({
                                                ...prev,
                                                terms: { ...prev.terms, delivery_time: e.target.value }
                                            }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Revisiones Incluidas
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            value={proposalData.terms.revisions}
                                            onChange={(e) => setProposalData(prev => ({
                                                ...prev,
                                                terms: { ...prev.terms, revisions: e.target.value }
                                            }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Garantía/Soporte
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            placeholder="ej: 3 meses de soporte post-entrega"
                                            value={proposalData.terms.warranty}
                                            onChange={(e) => setProposalData(prev => ({
                                                ...prev,
                                                terms: { ...prev.terms, warranty: e.target.value }
                                            }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Timeline */}
                            <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-4">Timeline del Proyecto</h4>
                                
                                {/* Lista de fases */}
                                {proposalData.timeline.phases.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {proposalData.timeline.phases.map((phase, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-medium text-gray-900">{phase.name}</span>
                                                        <span className="text-sm text-gray-600">({phase.duration})</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600">{phase.deliverable}</p>
                                                </div>
                                                <button
                                                    onClick={() => removePhase(index)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Agregar fase */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <input
                                        type="text"
                                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Nombre de la fase"
                                        value={newPhase.name}
                                        onChange={(e) => setNewPhase(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                    <input
                                        type="text"
                                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Duración"
                                        value={newPhase.duration}
                                        onChange={(e) => setNewPhase(prev => ({ ...prev, duration: e.target.value }))}
                                    />
                                    <input
                                        type="text"
                                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Entregable"
                                        value={newPhase.deliverable}
                                        onChange={(e) => setNewPhase(prev => ({ ...prev, deliverable: e.target.value }))}
                                    />
                                    <Button
                                        onClick={addPhase}
                                        variant="outline"
                                        disabled={!newPhase.name.trim()}
                                    >
                                        Agregar Fase
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Paso 4: Revisión Final */}
                    {step === 4 && (
                        <div className="space-y-6">
                            <h4 className="text-lg font-semibold text-gray-900">Revisión Final</h4>
                            
                            {/* Resumen */}
                            <div className="bg-gray-50 rounded-lg p-6">
                                <h5 className="font-medium text-gray-900 mb-4">Resumen de la Propuesta</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p><strong>Cliente:</strong> {proposalData.prospect_name}</p>
                                        <p><strong>Título:</strong> {proposalData.title}</p>
                                        <p><strong>Total:</strong> {proposalData.total_amount} {proposalData.currency}</p>
                                        <p><strong>Servicios:</strong> {proposalData.services.length}</p>
                                    </div>
                                    <div>
                                        <p><strong>Paquetes:</strong> {proposalData.pricing.packages.length}</p>
                                        <p><strong>Fases:</strong> {proposalData.timeline.phases.length}</p>
                                        <p><strong>Tiempo entrega:</strong> {proposalData.terms.delivery_time || 'No especificado'}</p>
                                        <p><strong>Válida hasta:</strong> {proposalData.valid_until || 'No especificado'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Notas adicionales */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notas Adicionales (Opcional)
                                </label>
                                <textarea
                                    rows={4}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Cualquier información adicional que quieras incluir..."
                                    value={proposalData.notes}
                                    onChange={(e) => setProposalData(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>

                            {/* Advertencia de borrador */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                    <div>
                                        <p className="text-sm font-medium text-blue-900">
                                            La propuesta se creará como borrador
                                        </p>
                                        <p className="text-sm text-blue-700">
                                            Podrás editarla y enviarla desde la sección de propuestas. También podrás analizarla con IA para mejorarla.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center gap-3 p-6 border-t bg-gray-50">
                    <div className="text-sm text-gray-600">
                        {step === 1 && "Información básica del cliente y proyecto"}
                        {step === 2 && "Define servicios y estructura de precios"}
                        {step === 3 && "Establece términos y timeline"}
                        {step === 4 && "Revisa y crea la propuesta"}
                    </div>
                    <div className="flex gap-3">
                        {step > 1 && (
                            <Button
                                variant="outline"
                                onClick={prevStep}
                                disabled={loading}
                            >
                                Anterior
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        {step < 4 ? (
                            <Button
                                onClick={nextStep}
                                disabled={loading}
                            >
                                Siguiente
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={loading || !proposalData.title.trim() || !proposalData.prospect_name.trim()}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Creando...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Crear Propuesta
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
