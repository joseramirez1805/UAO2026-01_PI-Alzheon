import axios from 'axios'

export interface PatientPhoto {
  _id: string
  etiqueta: string
  url_contenido?: string
  descripcion?: string
}

export interface PatientRecording {
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

export type ReminderFrequency = 'diario' | 'cada_2_dias' | 'semanal'

export interface ReminderSettings {
  enabled: boolean
  hour: string
  frequency: ReminderFrequency
  motivationalMessage: string
  nextSession?: string
}

export interface PatientProfile {
  nombre: string
  email: string
  telefono?: string
}

export interface UploadRecordingPayload {
  photoId: string
  audioBlob?: Blob
  duration?: number
  note?: string
  descripcionTexto?: string
}

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5500'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

export const fetchPatientPhotos = async (): Promise<PatientPhoto[]> => {
  const { data } = await apiClient.get('/api/paciente/fotos')
  return data
}

export const uploadPatientRecording = async (payload: UploadRecordingPayload): Promise<void> => {
  const formData = new FormData()
  formData.append('photoId', payload.photoId)
  
  if (payload.audioBlob) {
    formData.append('audio', payload.audioBlob)
    if (payload.duration) {
      formData.append('duration', payload.duration.toString())
    }
  }
  
  if (payload.descripcionTexto) {
    formData.append('descripcionTexto', payload.descripcionTexto)
  }
  
  if (payload.note) {
    formData.append('note', payload.note)
  }

  await apiClient.post('/api/paciente/grabar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}

export const fetchPatientRecordings = async (): Promise<PatientRecording[]> => {
  const { data } = await apiClient.get('/api/paciente/grabaciones')
  return data
}

export const fetchReminderSettings = async (): Promise<ReminderSettings> => {
  const { data } = await apiClient.get('/api/paciente/configuracion')
  return data
}

export const updateReminderSettings = async (settings: ReminderSettings): Promise<ReminderSettings> => {
  const { data } = await apiClient.put('/api/paciente/configuracion', settings)
  return data
}

export const updatePatientProfile = async (profile: PatientProfile): Promise<PatientProfile> => {
  const { data } = await apiClient.put('/api/paciente/perfil', profile)
  return data
}

export const updatePatientPassword = async (payload: { currentPassword: string, newPassword: string }) => {
  const { data } = await apiClient.put('/api/paciente/perfil/password', payload)
  return data
}
