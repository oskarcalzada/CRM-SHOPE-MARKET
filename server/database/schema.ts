
export interface DatabaseSchema {
  users: {
    id: string;
    username: string;
    name: string;
    email: string | null;
    password_hash: string;
    role: 'admin' | 'manager' | 'employee' | 'readonly';
    is_active: number;
    created_at: string;
    updated_at: string;
  };

  clients: {
    id: string;
    id_cliente: string | null;
    cliente: string;
    rfc: string;
    credito: number;
    contacto: string | null;
    direccion: string | null;
    mail: string | null;
    tel: string | null;
    constancia_fiscal: string | null;
    acta_constitutiva: string | null;
    identificacion: string | null;
    comprobante_domicilio: string | null;
    contacto_cobro1_nombre: string | null;
    contacto_cobro1_correo: string | null;
    contacto_cobro2_nombre: string | null;
    contacto_cobro2_correo: string | null;
    porcentaje_completado: number;
    created_at: string;
    updated_at: string;
  };

  invoices: {
    id: string;
    paqueteria: string;
    numero_comprobante: string;
    cliente: string;
    rfc: string;
    credito: number;
    fecha_creacion: string;
    fecha_vencimiento: string;
    total: number;
    pago1: number;
    fecha_pago1: string | null;
    pago2: number;
    fecha_pago2: string | null;
    pago3: number;
    fecha_pago3: string | null;
    nc: number;
    por_cobrar: number;
    estatus: 'Pendiente' | 'Pagada';
    comentarios: string | null;
    cfdi: string | null;
    soporte: string | null;
    created_at: string;
    updated_at: string;
  };

  credit_notes: {
    id: string;
    id_cliente: string;
    cliente: string;
    razon_social: string | null;
    fecha: string;
    motivo: string;
    factura_aplicada: string | null;
    monto: number;
    detalles: string | null; // JSON string
    cfdi: string | null;
    estatus: 'Pendiente' | 'Aplicada';
    created_at: string;
    updated_at: string;
  };

  receipts: {
    id: string;
    id_asociado: string;
    status: string;
    monto: number;
    tipo: string;
    fecha: string;
    link: string | null;
    factura: string | null;
    created_at: string;
    updated_at: string;
  };

  proposals: {
    id: string;
    id_cliente: string;
    cliente: string;
    anio: string;
    pdf: string | null;
    xlsx: string | null;
    comentarios: string | null;
    created_at: string;
    updated_at: string;
  };

  prospects: {
    id: string;
    nombre: string;
    apellido: string;
    monto: number;
    compania: string | null;
    responsable: string | null;
    estado: 'nuevo' | 'info' | 'asignado' | 'progreso' | 'final';
    tipo_persona: 'fisica' | 'moral' | null;
    rfc: string | null;
    razon_social: string | null;
    giro: string | null;
    valor_lead: number | null;
    tipo_prospeccion: string | null;
    ejecutivo: string | null;
    comentarios: string | null;
    fecha_registro: string;
    created_at: string;
    updated_at: string;
  };

  guide_cancellations: {
    id: string;
    numero_guia: string;
    paqueteria: string;
    cliente: string;
    motivo: string;
    fecha_solicitud: string;
    url_guia: string | null;
    archivo_guia: string | null;
    estatus: 'Pendiente' | 'En Proceso' | 'Cancelada' | 'Rechazada';
    comentarios: string | null;
    fecha_respuesta: string | null;
    responsable: string | null;
    costo_cancelacion: number;
    reembolso: number;
    numero_referencia: string | null;
    created_at: string;
    updated_at: string;
  };

  tickets: {
    id: string;
    numero_ticket: string;
    cliente: string;
    asunto: string;
    descripcion: string;
    categoria: 'Facturacion' | 'Cobranza' | 'Cancelaciones' | 'Informacion' | 'Soporte Tecnico' | 'Quejas' | 'Sugerencias' | 'Otros';
    prioridad: 'Baja' | 'Media' | 'Alta' | 'Urgente';
    estatus: 'Abierto' | 'En Proceso' | 'Esperando Cliente' | 'Resuelto' | 'Cerrado';
    fecha_creacion: string;
    fecha_limite: string | null;
    fecha_resolucion: string | null;
    solicitante_nombre: string;
    solicitante_email: string | null;
    solicitante_telefono: string | null;
    asignado_a: string | null;
    tiempo_respuesta_horas: number;
    satisfaccion_cliente: number | null;
    comentarios_internos: string | null;
    solucion_aplicada: string | null;
    archivos_adjuntos: string | null; // JSON string
    tags: string | null; // JSON string
    numero_seguimiento: string | null;
    canal_origen: 'Email' | 'Telefono' | 'Chat' | 'Presencial' | 'Portal Web' | 'WhatsApp';
    requiere_seguimiento: number;
    created_at: string;
    updated_at: string;
  };

  sessions: {
    id: string;
    user_id: string;
    token: string;
    expires_at: string;
    created_at: string;
  };

  notifications: {
    id: string;
    user_id: string | null;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    is_read: number;
    created_at: string;
  };
}
