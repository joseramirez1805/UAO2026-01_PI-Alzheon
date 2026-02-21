import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5500'

export const cuidadorApiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

export interface CuidadorPhoto {
  _id: string
  etiqueta: string
  url_contenido: string
  descripcion?: string
  pacienteId: string
  cuidadorId: {
    _id: string
    nombre: string
  }
  createdAt: string
}

export interface CuidadorRecording {
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

export interface AnalisisCognitivo {
  _id: string
  coherencia: number
  claridad: number
  riquezaLexica: number
  memoria: number
  emocion: number
  orientacion: number
  razonamiento: number
  atencion: number
  puntuacionGlobal: number
  observaciones: string
  alertas: string[]
  createdAt: string
}

export interface PruebaCognitivaResult {
  _id: string
  pacienteId: string
  primeraSecuenciaImagenes: { url: string; orden: number }[]
  segundaSecuenciaImagenes: { url: string; orden: number }[]
  pregunta: string
  respuestaTexto?: string
  puntajeOrdenamiento: number
  tiempoCompletado: number
  estado: 'en_progreso' | 'completada' | 'abandonada'
  createdAt: string
}

export interface GrabacionConAnalisis {
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
  analisisCognitivo?: AnalisisCognitivo
}

export interface PatientInfo {
  _id: string
  nombre: string
  email: string
}

export interface PatientStats {
  totalFotos: number
  totalGrabaciones: number
  grabacionesEstaSemana: number
  ultimaGrabacion: {
    fecha: string
    duracion: number
  } | null
}

export interface CreatePhotoPayload {
  etiqueta: string
  url_contenido?: string  // Opcional si se sube archivo
  descripcion?: string
  imageFile?: File  // Nuevo: archivo de imagen
}

export interface UpdatePhotoPayload {
  etiqueta?: string
  descripcion?: string
}

// Obtener paciente asociado
export const fetchAssociatedPatient = async (): Promise<PatientInfo> => {
  const { data } = await cuidadorApiClient.get('/api/cuidador/paciente')
  return data
}

// Obtener fotos del paciente
export const fetchPatientPhotos = async (): Promise<CuidadorPhoto[]> => {
  const { data } = await cuidadorApiClient.get('/api/cuidador/fotos')
  return data
}

// Crear nueva foto (con imagen o URL)
export const createPatientPhoto = async (payload: CreatePhotoPayload): Promise<CuidadorPhoto> => {
  // Si hay un archivo de imagen, usar FormData
  if (payload.imageFile) {
    const formData = new FormData()
    formData.append('image', payload.imageFile)
    formData.append('etiqueta', payload.etiqueta)
    if (payload.descripcion) {
      formData.append('descripcion', payload.descripcion)
    }

    const { data } = await cuidadorApiClient.post('/api/cuidador/fotos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  }

  // Si es una URL externa
  const { data } = await cuidadorApiClient.post('/api/cuidador/fotos', {
    etiqueta: payload.etiqueta,
    url_contenido: payload.url_contenido,
    descripcion: payload.descripcion
  })
  return data
}

// Actualizar foto
export const updatePatientPhoto = async (photoId: string, payload: UpdatePhotoPayload): Promise<CuidadorPhoto> => {
  const { data } = await cuidadorApiClient.put(`/api/cuidador/fotos/${photoId}`, payload)
  return data
}

// Eliminar foto
export const deletePatientPhoto = async (photoId: string): Promise<void> => {
  await cuidadorApiClient.delete(`/api/cuidador/fotos/${photoId}`)
}

// Obtener grabaciones del paciente
export const fetchPatientRecordings = async (): Promise<CuidadorRecording[]> => {
  const { data } = await cuidadorApiClient.get('/api/cuidador/grabaciones')
  return data
}

// Obtener grabaciones con análisis cognitivo (para línea de tiempo)
export const fetchGrabaciones = async (): Promise<GrabacionConAnalisis[]> => {
  const { data } = await cuidadorApiClient.get('/api/cuidador/grabaciones-con-analisis')
  return data
}

// Obtener estadísticas
export const fetchPatientStats = async (): Promise<PatientStats> => {
  const { data } = await cuidadorApiClient.get('/api/cuidador/estadisticas')
  return data
}

// Obtener pruebas cognitivas del paciente
export const fetchPatientCognitivePruebas = async (): Promise<PruebaCognitivaResult[]> => {
  const { data } = await cuidadorApiClient.get('/api/cuidador/pruebas-cognitivas')
  return data
}

// Eliminar una prueba cognitiva del paciente
export const deletePatientCognitivePrueba = async (pruebaId: string): Promise<void> => {
  await cuidadorApiClient.delete(`/api/cuidador/pruebas-cognitivas/${pruebaId}`)
}

// Auto-asignar cuidador a paciente (para desarrollo/testing)
export const assignCuidadorToPatient = async (pacienteId: string, cuidadorId: string): Promise<void> => {
  await cuidadorApiClient.post(`/api/usuarios/${pacienteId}/cuidadores/${cuidadorId}`)
}
