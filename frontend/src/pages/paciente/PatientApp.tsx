import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { PatientNavbar } from '../../components/Paciente/Navbar/PatientNavbar'
import { PatientDashboard } from '../../components/Paciente/Dashboard/PatientDashboard'
import { PatientPhotos } from '../../components/Paciente/MisFotos/PatientPhotos'
import { PatientRecordings } from '../../components/Paciente/MisGrabaciones/PatientRecordings'
import { PatientSettings } from '../../components/Paciente/Configuracion/PatientSettings'
import { PruebaCognitiva } from '../../components/Paciente/PruebasCognitivas/PruebaCognitiva'
import {
  PatientPhoto,
  PatientProfile,
  PatientRecording,
  ReminderSettings,
  fetchPatientPhotos,
  fetchPatientRecordings,
  fetchReminderSettings,
  updatePatientPassword,
  updatePatientProfile,
  updateReminderSettings,
  uploadPatientRecording,
} from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { Navbar } from '../../components/generics/Navbar'
import { Footer } from '../../components/generics/Footer'

const mockPhotos: PatientPhoto[] = [
  {
    _id: 'mock-1',
    etiqueta: 'Vacaciones en la playa',
    url_contenido: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80',
    descripcion: 'Un atardecer cálido con tu familia en la costa.',
  },
  {
    _id: 'mock-2',
    etiqueta: 'Reunión familiar',
    url_contenido: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
    descripcion: 'Todos reunidos celebrando un cumpleaños.',
  },
  {
    _id: 'mock-3',
    etiqueta: 'Día de campo',
    url_contenido: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=900&q=80',
    descripcion: 'Un picnic relajado rodeado de montañas.',
  },
]

const defaultReminderSettings: ReminderSettings = {
  enabled: true,
  hour: '10:00',
  frequency: 'diario',
  motivationalMessage: 'Tómate unos minutos para revivir tus recuerdos favoritos.',
  nextSession: new Date().toISOString(),
}

export const PatientApp = () => {
  const { status, user } = useAuth()
  const navigate = useNavigate()

  const [photos, setPhotos] = useState<PatientPhoto[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [recordings, setRecordings] = useState<PatientRecording[]>([])
  const [recordingsLoading, setRecordingsLoading] = useState(true)
  const [reminders, setReminders] = useState<ReminderSettings>(defaultReminderSettings)
  const [profile, setProfile] = useState<PatientProfile>({
    nombre: user.nombre ?? '',
    email: user.email ?? '',
    telefono: '',
  })
  const [mostrarPrueba, setMostrarPrueba] = useState(false)

  useEffect(() => {
    setProfile((prev) => ({
      ...prev,
      nombre: user.nombre ?? prev.nombre ?? '',
      email: user.email ?? prev.email ?? '',
    }))
  }, [user.nombre, user.email])

  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const data = await fetchPatientPhotos()
        setPhotos(data)
      } catch (error) {
        setPhotos(mockPhotos)
      } finally {
        setPhotosLoading(false)
      }
    }

    const loadRecordings = async () => {
      try {
        const data = await fetchPatientRecordings()
        setRecordings(data)
      } catch (error) {
        setRecordings([])
      } finally {
        setRecordingsLoading(false)
      }
    }

    const loadReminders = async () => {
      try {
        const settings = await fetchReminderSettings()
        setReminders(settings)
      } catch (error) {
        setReminders(defaultReminderSettings)
      }
    }

    loadPhotos()
    loadRecordings()
    loadReminders()
  }, [])

  const sessionsThisWeek = useMemo(() => {
    const now = new Date()
    const firstDay = new Date(now)
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    firstDay.setDate(diff)
    firstDay.setHours(0, 0, 0, 0)
    return recordings.filter((recording) => new Date(recording.fecha) >= firstDay).length
  }, [recordings])

  const latestRecordingDate = useMemo(() => {
    if (!recordings.length) return undefined
    return new Date(recordings[0].fecha).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }, [recordings])

  const handleUploadRecording = async (payload: { 
    photoId: string, 
    audio?: Blob, 
    duration?: number,
    descripcionTexto?: string 
  }) => {
    try {
      await uploadPatientRecording({
        photoId: payload.photoId,
        audioBlob: payload.audio,
        duration: payload.duration,
        descripcionTexto: payload.descripcionTexto,
      })

      const relatedPhoto = photos.find((photo) => photo._id === payload.photoId)
      const localAudioUrl = payload.audio ? URL.createObjectURL(payload.audio) : undefined
      
      setRecordings((prev) => [
        {
          _id: `temp-${Date.now()}`,
          audioUrl: localAudioUrl,
          photoId: payload.photoId,
          fotoUrl: relatedPhoto?.url_contenido || '/background.jpg',
          fecha: new Date().toISOString(),
          duracion: payload.duration || 0,
          nota: relatedPhoto?.etiqueta,
          descripcionTexto: payload.descripcionTexto,
          tipoContenido: payload.audio && payload.descripcionTexto ? 'ambos' : payload.audio ? 'audio' : 'texto',
        },
        ...prev,
      ])
    } catch (error) {
      toast.error('No pudimos subir tu grabación, intenta nuevamente')
      throw error
    }
  }

  const handleSaveReminders = async (settings: ReminderSettings) => {
    const optimistic = { ...settings }
    setReminders(optimistic)
    try {
      const updated = await updateReminderSettings(settings)
      setReminders(updated)
    } catch (error) {
      toast.error('No se pudieron guardar los recordatorios')
      setReminders(reminders)
      throw error
    }
  }

  const handleSaveProfile = async (nextProfile: PatientProfile) => {
    try {
      const updated = await updatePatientProfile(nextProfile)
      setProfile(updated)
    } catch (error) {
      setProfile(nextProfile)
      throw error
    }
  }

  const handleChangePassword = async (payload: { currentPassword: string, newPassword: string }) => {
    await updatePatientPassword(payload)
  }

  const handleIniciarPrueba = () => {
    setMostrarPrueba(true)
  }

  const handleCerrarPrueba = () => {
    setMostrarPrueba(false)
  }

  const handlePruebaCompletada = (resultados: any) => {
    toast.success(`¡Prueba completada! Puntaje: ${resultados.puntajeOrdenamiento}%`)
  }

  useEffect(() => {
    if (status !== 'authenticated') {
      navigate('/login')
    }
  }, [navigate, status])

  if (status === 'checking') {
    return (
      <div className="min-h-screen patient-gradient-bg flex items-center justify-center text-white">
        <div className="glass-panel px-10 py-6 text-center">
          <p className="text-lg font-semibold tracking-wide">Preparando tu experiencia...</p>
        </div>
      </div>
    )
  }

  if (!user.rol || user.rol.toLowerCase() !== 'paciente') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen flex flex-col patient-gradient-bg">
      <Navbar />

      <main className="flex-1 pb-12">
        <PatientNavbar userName={user.nombre ?? 'Paciente'} userEmail={user.email} />

        <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6">
          <Routes>
            <Route
              path="dashboard"
            element={
              <PatientDashboard
                userName={user.nombre ?? 'Paciente'}
                sessionsCompleted={sessionsThisWeek}
                weeklyGoal={4}
                nextReminder={reminders}
                recentRecordingDate={latestRecordingDate}
                photoCount={photos.length}
                onNavigate={(path) => navigate(path)}
                onIniciarPrueba={handleIniciarPrueba}
              />
            }
          />
          <Route
            path="fotos"
            element={
              <PatientPhotos
                photos={photos}
                onUploadRecording={handleUploadRecording}
                loading={photosLoading}
              />
            }
          />
          <Route
            path="grabaciones"
            element={
              <PatientRecordings recordings={recordings} loading={recordingsLoading} />
            }
          />
          <Route
            path="configuracion"
            element={
              <PatientSettings
                reminders={reminders}
                profile={profile}
                onSaveReminders={handleSaveReminders}
                onSaveProfile={handleSaveProfile}
                onChangePassword={handleChangePassword}
              />
            }
          />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>

      <Footer />

      {/* Modal de Prueba Cognitiva */}
      {mostrarPrueba && (
        <PruebaCognitiva
          onCerrar={handleCerrarPrueba}
          onCompletada={handlePruebaCompletada}
        />
      )}
    </div>
  )
}
