import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5500'

export const medicoApiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

// Interfaces
export interface MedicoPatient {
  _id: string
  nombre: string
  email: string
  createdAt: string
  cuidadores: {
    _id: string
    nombre: string
    email: string
  }[]
  estadisticas?: {
    totalFotos: number
    totalGrabaciones: number
    grabacionesEstaSemana: number
    metaSemanal: number
  }
}

export interface PatientDetails extends MedicoPatient {
  estadisticas: {
    totalFotos: number
    totalGrabaciones: number
    grabacionesEstaSemana: number
    metaSemanal: number
    sesionesCompletadas: number
    ultimaGrabacion: {
      fecha: string
      duracion: number
    } | null
  }
}

export interface MedicoPhoto {
  _id: string
  etiqueta: string
  url_contenido?: string
  descripcion?: string
  pacienteId: string
  cuidadorId: {
    _id: string
    nombre: string
    email: string
  }
  createdAt: string
}

export interface MedicoRecording {
  _id: string
  photoId: string
  fotoUrl: string
  fecha: string
  duracion: number
  audioUrl?: string
  nota?: string
  descripcionTexto?: string
  transcripcion?: string
  tipoContenido?: 'audio' | 'texto' | 'ambos'
}

export interface Caregiver {
  _id: string
  nombre: string
  email: string
  pacienteAsociado?: {
    _id: string
    nombre: string
  } | null
}

export interface DoctorStats {
  totalPacientes: number
  totalFotos: number
  totalGrabaciones: number
  grabacionesEstaSemana: number
  alertasNoLeidas?: number
}

// ========== INTERFACES DE ANÁLISIS COGNITIVO ==========

export interface CognitiveMetrics {
  coherencia: number
  claridad: number
  riquezaLexica: number
  memoria: number
  emocion: number
  orientacion: number
  razonamiento: number
  atencion: number
}

export interface AnalisisCognitivo {
  _id: string
  pacienteId: string
  grabacionId: {
    _id: string
    fecha: string
    tipoContenido: string
  }
  esLineaBase: boolean
  coherencia: number
  claridad: number
  riquezaLexica: number
  memoria: number
  emocion: number
  orientacion: number
  razonamiento: number
  atencion: number
  palabrasUnicas: number
  pausas: number
  repeticiones: number
  puntuacionGlobal: number
  alertas?: string[]
  recomendaciones?: string[]
  observaciones?: string
  fechaAnalisis: string
}

export interface Desviacion {
  metrica: string
  valorBase: number
  valorActual: number
  porcentajeDesviacion: number
}

export interface AlertaCognitiva {
  _id: string
  pacienteId: {
    _id: string
    nombre: string
    email: string
  }
  analisisId: AnalisisCognitivo
  severidad: 'baja' | 'media' | 'alta' | 'critica'
  desviaciones: Desviacion[]
  mensaje: string
  recomendaciones: string[]
  leida: boolean
  leidaPor?: string
  fechaLectura?: string
  acciones: {
    medicoId: string
    tipo: string
    descripcion: string
    fecha: string
  }[]
  fechaAlerta: string
}

export interface ReporteCognitivo {
  paciente: {
    id: string
    nombre: string
    email: string
  }
  medico: {
    id: string
    nombre: string
    email: string
  }
  periodo: {
    inicio: string
    fin: string
  }
  lineaBase?: AnalisisCognitivo
  promedios: CognitiveMetrics & { puntuacionGlobal: number }
  totalAnalisis: number
  totalAlertas: number
  alertasPorSeveridad: {
    critica: number
    alta: number
    media: number
    baja: number
  }
  analisis: AnalisisCognitivo[]
  alertasRecientes: AlertaCognitiva[]
  tiempoGeneracion: number
}

// Obtener estadísticas generales del médico
export const fetchDoctorStats = async (): Promise<DoctorStats> => {
  const { data } = await medicoApiClient.get('/api/medico/estadisticas')
  return data
}

// Obtener todos los pacientes asignados
export const fetchAssignedPatients = async (): Promise<MedicoPatient[]> => {
  const { data } = await medicoApiClient.get('/api/medico/pacientes')
  return data
}

// Obtener detalles de un paciente
export const fetchPatientDetails = async (pacienteId: string): Promise<PatientDetails> => {
  const { data } = await medicoApiClient.get(`/api/medico/pacientes/${pacienteId}`)
  return data
}

// Obtener fotos de un paciente
export const fetchPatientPhotos = async (pacienteId: string): Promise<MedicoPhoto[]> => {
  const { data } = await medicoApiClient.get(`/api/medico/pacientes/${pacienteId}/fotos`)
  return data
}

// Obtener grabaciones de un paciente
export const fetchPatientRecordings = async (pacienteId: string): Promise<MedicoRecording[]> => {
  const { data } = await medicoApiClient.get(`/api/medico/pacientes/${pacienteId}/grabaciones`)
  return data
}

// Obtener todos los pacientes disponibles
export const fetchAvailablePatients = async (): Promise<MedicoPatient[]> => {
  const { data } = await medicoApiClient.get('/api/medico/pacientes/disponibles')
  return data
}

// Asignar paciente al médico
export const assignPatient = async (pacienteId: string): Promise<void> => {
  await medicoApiClient.post('/api/medico/pacientes', { pacienteId })
}

// Desasignar paciente
export const unassignPatient = async (pacienteId: string): Promise<void> => {
  await medicoApiClient.delete(`/api/medico/pacientes/${pacienteId}`)
}

// Actualizar información de un paciente
export const updatePatientInfo = async (
  pacienteId: string,
  data: { nombre: string; email: string }
): Promise<PatientDetails> => {
  const { data: updatedPatient } = await medicoApiClient.put(
    `/api/medico/pacientes/${pacienteId}`,
    data
  )
  return updatedPatient
}

// Obtener cuidadores disponibles
export const fetchAvailableCaregivers = async (): Promise<Caregiver[]> => {
  const { data } = await medicoApiClient.get('/api/medico/cuidadores')
  return data
}

// Asignar cuidador a paciente
export const assignCaregiverToPatient = async (
  pacienteId: string,
  cuidadorId: string
): Promise<void> => {
  await medicoApiClient.post('/api/medico/asignar-cuidador', {
    pacienteId,
    cuidadorId,
  })
}

// ========== FUNCIONES DE ANÁLISIS COGNITIVO ==========

// Obtener línea base cognitiva de un paciente
export const fetchLineaBase = async (pacienteId: string): Promise<AnalisisCognitivo> => {
  const { data } = await medicoApiClient.get(`/api/medico/pacientes/${pacienteId}/linea-base`)
  return data
}

// Obtener historial de análisis cognitivos
export const fetchAnalisisCognitivo = async (
  pacienteId: string,
  params?: {
    fechaInicio?: string
    fechaFin?: string
    limit?: number
  }
): Promise<{
  analisis: AnalisisCognitivo[]
  promedios: CognitiveMetrics & { puntuacionGlobal: number }
  total: number
}> => {
  const { data } = await medicoApiClient.get(`/api/medico/pacientes/${pacienteId}/analisis`, {
    params,
  })
  return data
}

// Obtener alertas cognitivas no leídas
export const fetchAlertas = async (): Promise<AlertaCognitiva[]> => {
  const { data } = await medicoApiClient.get('/api/medico/alertas')
  return data
}

// Obtener historial de alertas con filtros
export const fetchHistorialAlertas = async (params?: {
  pacienteId?: string
  severidad?: string
  leida?: boolean
  fechaInicio?: string
  fechaFin?: string
}): Promise<AlertaCognitiva[]> => {
  const { data } = await medicoApiClient.get('/api/medico/alertas/historial', { params })
  return data
}

// Marcar alerta como leída
export const marcarAlertaLeida = async (alertaId: string): Promise<AlertaCognitiva> => {
  const { data } = await medicoApiClient.post(`/api/medico/alertas/${alertaId}/leer`)
  return data
}

// Registrar acción sobre una alerta
export const registrarAccionAlerta = async (
  alertaId: string,
  accion: {
    tipo: string
    descripcion: string
  }
): Promise<AlertaCognitiva> => {
  const { data } = await medicoApiClient.post(`/api/medico/alertas/${alertaId}/accion`, accion)
  return data
}

// Actualizar umbrales de configuración
export const actualizarUmbrales = async (config: {
  umbralDesviacion?: number
  severidades?: {
    baja: { min: number; max: number }
    media: { min: number; max: number }
    alta: { min: number; max: number }
    critica: { min: number; max: number }
  }
}): Promise<void> => {
  await medicoApiClient.put('/api/medico/configuracion/umbrales', config)
}

// Generar reporte completo de un paciente
// Generar reporte cognitivo en PDF
export const generarReporte = async (
  pacienteId: string,
  params?: {
    fechaInicio?: string
    fechaFin?: string
    encriptar?: boolean
  }
): Promise<Blob> => {
  const response = await medicoApiClient.get(`/api/medico/pacientes/${pacienteId}/reporte`, {
    params,
    responseType: 'blob', // Importante: recibir como blob
  })
  return response.data
}
