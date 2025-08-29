import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, AlertCircle, XCircle, FileSpreadsheet, Upload, X } from 'lucide-react';

interface ValidationError {
  fila: number;
  campo: string;
  valor: any;
  error: string;
  severidad: 'error' | 'warning';
}

interface ValidationResult {
  totalLineas: number;
  lineasCorrectas: number;
  lineasConErrores: number;
  lineasConAdvertencias: number;
  errores: ValidationError[];
  datosCorrectos: any[];
  datosConErrores: any[];
}

interface BulkUploadPreviewProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (datosCorrectos: any[]) => void;
  validationResult: ValidationResult | null;
  titulo: string;
  descripcion?: string;
  loading?: boolean;
}

export function BulkUploadPreview({
  open,
  onClose,
  onConfirm,
  validationResult,
  titulo,
  descripcion,
  loading = false
}: BulkUploadPreviewProps) {
  const [showErrorDetails, setShowErrorDetails] = React.useState(false);
  
  if (!validationResult) return null;

  const hasErrors = validationResult.lineasConErrores > 0;
  const hasWarnings = validationResult.lineasConAdvertencias > 0;
  const canProcess = validationResult.lineasCorrectas > 0;

  const errorsOnly = validationResult.errores.filter(e => e.severidad === 'error');
  const warningsOnly = validationResult.errores.filter(e => e.severidad === 'warning');

  const handleConfirm = () => {
    if (canProcess) {
      onConfirm(validationResult.datosCorrectos);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            Vista Previa de Carga Masiva: {titulo}
          </DialogTitle>
          {descripcion && (
            <p className="text-sm text-gray-600">{descripcion}</p>
          )}
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Resumen General */}
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-800">📊 Resumen del Análisis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-blue-200 text-center">
                  <div className="text-2xl font-bold text-blue-600">{validationResult.totalLineas}</div>
                  <div className="text-sm text-blue-800">Total de líneas</div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border border-green-200 text-center">
                  <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-green-600">{validationResult.lineasCorrectas}</div>
                  <div className="text-sm text-green-800">Líneas correctas</div>
                </div>
                
                {hasErrors && (
                  <div className="bg-white p-4 rounded-lg border border-red-200 text-center">
                    <XCircle className="w-6 h-6 text-red-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-red-600">{validationResult.lineasConErrores}</div>
                    <div className="text-sm text-red-800">Con errores</div>
                  </div>
                )}
                
                {hasWarnings && (
                  <div className="bg-white p-4 rounded-lg border border-yellow-200 text-center">
                    <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-yellow-600">{validationResult.lineasConAdvertencias}</div>
                    <div className="text-sm text-yellow-800">Con advertencias</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Mensaje de Decisión */}
          {hasErrors ? (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <XCircle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-800 mb-2">
                      Se encontraron {errorsOnly.length} errores en {validationResult.lineasConErrores} líneas
                    </h3>
                    <p className="text-red-700 text-sm mb-3">
                      Puedes procesar las <strong>{validationResult.lineasCorrectas} líneas correctas</strong> ahora 
                      y corregir el archivo para subir las restantes después.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowErrorDetails(!showErrorDetails)}
                      >
                        {showErrorDetails ? 'Ocultar' : 'Ver'} Detalles de Errores
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : hasWarnings ? (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-yellow-800 mb-2">
                      Se encontraron {warningsOnly.length} advertencias
                    </h3>
                    <p className="text-yellow-700 text-sm mb-3">
                      Las advertencias no impiden el procesamiento. Se procesarán <strong>todas las {validationResult.totalLineas} líneas</strong>.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowErrorDetails(!showErrorDetails)}
                    >
                      {showErrorDetails ? 'Ocultar' : 'Ver'} Advertencias
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-green-800 mb-2">
                      ¡Perfecto! Todas las líneas están correctas
                    </h3>
                    <p className="text-green-700 text-sm">
                      Se procesarán las <strong>{validationResult.totalLineas} líneas</strong> sin problemas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Detalles de Errores y Advertencias */}
          {showErrorDetails && (hasErrors || hasWarnings) && (
            <Card className="border-gray-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Detalles de {hasErrors ? 'Errores' : 'Advertencias'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Línea</TableHead>
                        <TableHead>Campo</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Problema</TableHead>
                        <TableHead>Tipo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.errores.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{error.fila}</TableCell>
                          <TableCell>{error.campo}</TableCell>
                          <TableCell className="max-w-32 truncate" title={String(error.valor)}>
                            {String(error.valor) || '(vacío)'}
                          </TableCell>
                          <TableCell className="text-sm">{error.error}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              error.severidad === 'error' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {error.severidad === 'error' ? 'Error' : 'Advertencia'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vista previa de datos correctos */}
          {validationResult.datosCorrectos.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Vista Previa de Datos Correctos ({validationResult.datosCorrectos.length} registros)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-gray-600 mb-3">
                  Mostrando primeros 5 registros que se procesarán:
                </div>
                <div className="max-h-40 overflow-auto bg-white rounded border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {validationResult.datosCorrectos.length > 0 && 
                          Object.keys(validationResult.datosCorrectos[0]).slice(0, 6).map(key => (
                            <TableHead key={key} className="text-xs">{key}</TableHead>
                          ))
                        }
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validationResult.datosCorrectos.slice(0, 5).map((dato, index) => (
                        <TableRow key={index}>
                          {Object.values(dato).slice(0, 6).map((value: any, valueIndex) => (
                            <TableCell key={valueIndex} className="text-xs max-w-24 truncate" title={String(value)}>
                              {String(value)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {validationResult.datosCorrectos.length > 5 && (
                  <div className="text-xs text-gray-500 mt-2">
                    ... y {validationResult.datosCorrectos.length - 5} registros más
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          
          {canProcess && (
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="btn-shope-primary flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              {loading ? 'Procesando...' : 
                hasErrors 
                  ? `Procesar ${validationResult.lineasCorrectas} Líneas Correctas`
                  : `Procesar Todas las ${validationResult.totalLineas} Líneas`
              }
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
