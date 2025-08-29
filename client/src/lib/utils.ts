
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// FUNCIÓN UNIFICADA para normalizar fechas SIN zona horaria - solo preservar string exacto
export const normalizeDateString = (dateInput: any): string => {
  if (!dateInput) return '';
  
  // Si ya está en formato YYYY-MM-DD, retornar exactamente como está
  if (typeof dateInput === 'string') {
    const cleanDate = dateInput.trim();
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (isoPattern.test(cleanDate)) {
      return cleanDate;
    }
    
    // Si es DD/MM/YYYY, convertir a YYYY-MM-DD
    const ddmmPattern = /^(\d{1,2})[\/\-\.](\d{1\s?,2})[\/\-\.](\d{4})$/;
    const ddmmMatch = cleanDate.match(ddmmPattern);
    if (ddmmMatch) {
      const day = ddmmMatch[1].padStart(2, '0');
      const month = ddmmMatch[2].padStart(2, '0');
      const year = ddmmMatch[3];
      return `${year}-${month}-${day}`;
    }
  }
  
  // Si es número (Excel), convertir sin zona horaria
  if (typeof dateInput === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const resultDate = new Date(excelEpoch.getTime() + dateInput * 24 * 60 * 60 * 1000);
    const year = resultDate.getFullYear();
    const month = String(resultDate.getMonth() + 1).padStart(2, '0');
    const day = String(resultDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Si es un objeto Date, formatear a YYYY-MM-DD
  if (dateInput instanceof Date) {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  console.warn(`Formato de fecha no soportado, se devuelve vacío: ${dateInput}`);
  return '';
};
