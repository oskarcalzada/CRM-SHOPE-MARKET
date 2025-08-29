export interface Factura {
  paqueteria: string;
  numeroComprobante: string;
  cliente: string;
  rfc: string;
  credito: number;
  fechaCreacion: string;
  fechaVencimiento: string;
  total: number;
  pago1: number;
  fechaPago1: string;
  pago2: number;
  fechaPago2: string;
  pago3: number;
  fechaPago3: string;
  nc: number;
  porCobrar: number;
  estatus: 'Pendiente' | 'Pagada';
  comentarios: string;
  cfdi?: string; // Archivo CFDI
  soporte?: string; // Archivo de soporte
}

export interface Cliente {
  id_cliente?: string;
  cliente: string;
  rfc: string;
  credito: number;
  contacto: string;
  direccion: string;
  mail: string;
  tel: string;
  // Nuevos campos para documentación
  documentos?: {
    constanciaFiscal?: string;
    actaConstitutiva?: string;
    identificacion?: string;
    comprobanteDomicilio?: string;
  };
  contactoCobro1?: {
    nombre: string;
    correo: string;
  };
  contactoCobro2?: {
    nombre: string;
    correo: string;
  };
  porcentajeCompletado?: number;
}

export interface Comprobante {
  id?: string;
  id_asociado: string;
  status: string;
  monto: number;
  tipo: string;
  fecha: string;
  link?: string;
  factura?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Propuesta {
  id_cliente: string;
  cliente: string;
  anio: string;
  pdf: string;
  xlsx: string;
  comentarios?: string;
}

export interface Prospecto {
  nombre: string;
  apellido: string;
  monto: number;
  compania: string;
  responsable: string;
  estado: 'nuevo' | 'info' | 'asignado' | 'progreso' | 'final';
  // Nuevos campos
  tipoPersona?: 'fisica' | 'moral';
  rfc?: string;
  razonSocial?: string;
  giro?: string;
  valorLead?: number;
  tipoProspeccion?: string;
  ejecutivo?: string;
  comentarios?: string;
  fechaRegistro?: string;
}

export interface NotaCredito {
  id: string;
  idCliente: string;
  cliente: string;
  razonSocial: string;
  fecha: string;
  motivo: string;
  facturaAplicada: string;
  monto: number;
  detalles: string[]; // Array de URLs de archivos adjuntos
  cfdi?: string; // Archivo CFDI de la NC
  estatus: 'Pendiente' | 'Aplicada';
  fechaCreacion: string;
}

export interface PagoFactura {
  facturaId: string;
  numeroFactura: string;
  monto: number;
  fecha: string;
  comprobante?: string; // Archivo del comprobante
}

export interface FilterOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  cliente?: string;
  estatus?: string;
  mes?: number;
  anio?: number;
  showPagosDetalle?: boolean;
}
