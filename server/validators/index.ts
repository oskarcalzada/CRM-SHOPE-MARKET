
import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1, 'El nombre de usuario es requerido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

// User schemas
export const userSchema = z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres'),
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Email inválido').optional(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['admin', 'manager', 'employee', 'readonly']),
  is_active: z.boolean().default(true),
});

export const updateUserSchema = userSchema.extend({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
});

// Client schema
export const clientSchema = z.object({
  id_cliente: z.string().optional(),
  cliente: z.string().min(1, 'El nombre del cliente es requerido'),
  rfc: z.string().min(12, 'El RFC debe tener al menos 12 caracteres').max(13, 'El RFC debe tener máximo 13 caracteres'),
  credito: z.number().int().min(0).optional(),
  contacto: z.string().optional(),
  direccion: z.string().optional(),
  mail: z.string().email('Email inválido').optional(),
  tel: z.string().optional(),
  documentos: z.object({
    constanciaFiscal: z.string().optional(),
    actaConstitutiva: z.string().optional(),
    identificacion: z.string().optional(),
    comprobanteDomicilio: z.string().optional(),
  }).optional(),
  contactoCobro1: z.object({
    nombre: z.string().optional(),
    correo: z.string().email('Email de cobro 1 inválido').optional(),
  }).optional(),
  contactoCobro2: z.object({
    nombre: z.string().optional(),
    correo: z.string().email('Email de cobro 2 inválido').optional(),
  }).optional(),
});

// Invoice schema
export const invoiceSchema = z.object({
  paqueteria: z.string().min(1, 'Paquetería es requerida'),
  numero_comprobante: z.string().min(1, 'Número de comprobante es requerido'),
  cliente: z.string().min(1, 'Cliente es requerido'),
  rfc: z.string().min(12, 'RFC debe tener al menos 12 caracteres').max(13, 'RFC debe tener máximo 13 caracteres'),
  credito: z.number().int().min(0, 'Crédito debe ser un número positivo'),
  fecha_creacion: z.string().min(1, 'Fecha de creación es requerida'),
  fecha_vencimiento: z.string().min(1, 'Fecha de vencimiento es requerida'),
  total: z.number().min(0, 'Total debe ser un número positivo'),
  pago1: z.number().min(0).optional(),
  fecha_pago1: z.string().nullable().optional(),
  pago2: z.number().min(0).optional(),
  fecha_pago2: z.string().nullable().optional(),
  pago3: z.number().min(0).optional(),
  fecha_pago3: z.string().nullable().optional(),
  nc: z.number().min(0).optional(),
  por_cobrar: z.number().min(0).optional(),
  estatus: z.enum(['Pendiente', 'Pagada']).optional(),
  comentarios: z.string().optional(),
  cfdi: z.string().optional(),
  soporte: z.string().optional()
});

// Credit Note schema
export const creditNoteSchema = z.object({
  id_cliente: z.string().min(1, 'ID de cliente es requerido'),
  cliente: z.string().min(1, 'Nombre de cliente es requerido'),
  razon_social: z.string().optional(),
  fecha: z.string().min(1, 'Fecha es requerida'),
  motivo: z.string().min(1, 'Motivo es requerido'),
  factura_aplicada: z.string().optional(),
  monto: z.number().min(0.01, 'Monto debe ser mayor a cero'),
  detalles: z.array(z.string()).optional(),
  cfdi: z.string().optional(),
  estatus: z.enum(['Pendiente', 'Aplicada']).optional(),
});

// Receipt schema
export const receiptSchema = z.object({
  id_asociado: z.string().min(1, 'ID asociado es requerido'),
  status: z.string().min(1, 'Estado es requerido'),
  monto: z.number().min(0.01, 'Monto debe ser mayor a cero'),
  tipo: z.string().min(1, 'Tipo es requerido'),
  fecha: z.string().min(1, 'Fecha es requerida'),
  link: z.string().url('Link debe ser una URL válida').optional(),
  factura: z.string().optional(),
});

// Proposal schema
export const proposalSchema = z.object({
  id_cliente: z.string().min(1, 'ID de cliente es requerido'),
  cliente: z.string().min(1, 'Nombre de cliente es requerido'),
  anio: z.string().min(4, 'Año debe tener 4 dígitos').max(4, 'Año debe tener 4 dígitos'),
  pdf: z.string().url('URL de PDF inválida').optional(),
  xlsx: z.string().url('URL de XLSX inválida').optional(),
  comentarios: z.string().optional(),
});

// Prospect schema
export const prospectSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  apellido: z.string().min(1, 'Apellido es requerido'),
  monto: z.number().min(0, 'Monto no puede ser negativo'),
  compania: z.string().optional(),
  responsable: z.string().optional(),
  estado: z.enum(['nuevo', 'info', 'asignado', 'progreso', 'final']).optional(),
  tipo_persona: z.enum(['fisica', 'moral']).optional(),
  rfc: z.string().optional(),
  razon_social: z.string().optional(),
  giro: z.string().optional(),
  valor_lead: z.number().optional(),
  tipo_prospeccion: z.string().optional(),
  ejecutivo: z.string().optional(),
  comentarios: z.string().optional(),
  fecha_registro: z.string().min(1, 'Fecha de registro es requerida'),
});

// Guide Cancellation schema
export const guideCancellationSchema = z.object({
  numero_guia: z.string().min(1, 'Número de guía es requerido'),
  paqueteria: z.string().min(1, 'Paquetería es requerida'),
  cliente: z.string().min(1, 'Cliente es requerido'),
  motivo: z.string().min(1, 'Motivo es requerido'),
  fecha_solicitud: z.string().min(1, 'Fecha de solicitud es requerida'),
  url_guia: z.string().url('URL de guía inválida').optional(),
  archivo_guia: z.string().optional(),
  comentarios: z.string().optional(),
  costo_cancelacion: z.number().min(0).optional(),
  reembolso: z.number().min(0).optional(),
});
