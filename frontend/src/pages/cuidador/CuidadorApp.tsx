import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { CuidadorNavbar } from '../../components/Cuidador/Navbar/CuidadorNavbar'
import { CuidadorDashboard } from '../../components/Cuidador/Dashboard/CuidadorDashboard'
import { CuidadorPhotos } from '../../components/Cuidador/GestionFotos/CuidadorPhotos'
import { CuidadorProgress } from '../../components/Cuidador/Progreso/CuidadorProgress'
import { LineaTiempoEvolucion } from '../../components/Cuidador/LineaTiempo/LineaTiempoEvolucion'
import {
  CuidadorPhoto,
  CuidadorRecording,
  PatientInfo,
  PatientStats,
  PruebaCognitivaResult,
  fetchAssociatedPatient,
  fetchPatientPhotos,
  fetchPatientRecordings,
  fetchPatientStats,
  fetchPatientCognitivePruebas,
  deletePatientCognitivePrueba,
  createPatientPhoto,
  updatePatientPhoto,
  deletePatientPhoto,
  assignCuidadorToPatient,
} from '../../services/cuidadorApi'
import { useAuth } from '../../hooks/useAuth'
import { Navbar } from '../../components/generics/Navbar'
import { Footer } from '../../components/generics/Footer'

export const CuidadorApp = () => {
  const { status, user } = useAuth()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<PatientInfo | null>(null)
  const [hasPatient, setHasPatient] = useState<boolean | null>(null) // null = cargando, true = tiene, false = no tiene
  const [isAssigning, setIsAssigning] = useState(false) // Estado para botón de auto asignación
  const [photos, setPhotos] = useState<CuidadorPhoto[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [recordings, setRecordings] = useState<CuidadorRecording[]>([])
  const [recordingsLoading, setRecordingsLoading] = useState(true)
  const [stats, setStats] = useState<PatientStats>({
    totalFotos: 0,
    totalGrabaciones: 0,
    grabacionesEstaSemana: 0,
    ultimaGrabacion: null,
  })
  const [pruebas, setPruebas] = useState<PruebaCognitivaResult[]>([])
  const [pruebasLoading, setPruebasLoading] = useState(true)

  useEffect(() => {
    const loadPatientData = async () => {
      try {
        const patientData = await fetchAssociatedPatient()
        setPatient(patientData)
        setHasPatient(true)
      } catch (error: any) {
        if (error.response?.status === 404) {
          // No tiene paciente asociado - estado esperado
          setHasPatient(false)
        } else {
          // Error real del servidor
          toast.error('Error al cargar la información del paciente')
          setHasPatient(false)
        }
      }
    }

    const loadPhotos = async () => {
      try {
        const data = await fetchPatientPhotos()
        setPhotos(data)
      } catch (error) {
        toast.error('Error al cargar las fotos')
        setPhotos([])
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

    const loadStats = async () => {
      try {
        const data = await fetchPatientStats()
        setStats(data)
      } catch (error) {
        console.error('Error al cargar estadísticas:', error)
      }
    }

    const loadPruebas = async () => {
      try {
        const data = await fetchPatientCognitivePruebas()
        setPruebas(data)
      } catch (error) {
        console.error('Error al cargar pruebas cognitivas:', error)
        setPruebas([])
      } finally {
        setPruebasLoading(false)
      }
    }

    if (status === 'authenticated' && user.rol?.toLowerCase() === 'cuidador/familiar') {
      loadPatientData()
      loadPhotos()
      loadRecordings()
      loadStats()
      loadPruebas()
    }
  }, [status, user.rol])

  const handleCreatePhoto = async (data: { etiqueta: string; url_contenido?: string; descripcion?: string; imageFile?: File }) => {
    const newPhoto = await createPatientPhoto(data)
    setPhotos((prev) => [newPhoto, ...prev])
    setStats((prev) => ({ ...prev, totalFotos: prev.totalFotos + 1 }))
  }

  const handleUpdatePhoto = async (photoId: string, data: { etiqueta?: string; descripcion?: string }) => {
    const updatedPhoto = await updatePatientPhoto(photoId, data)
    setPhotos((prev) => prev.map((photo) => (photo._id === photoId ? updatedPhoto : photo)))
  }

  const handleDeletePhoto = async (photoId: string) => {
    await deletePatientPhoto(photoId)
    setPhotos((prev) => prev.filter((photo) => photo._id !== photoId))
    setStats((prev) => ({ ...prev, totalFotos: Math.max(0, prev.totalFotos - 1) }))
  }

  const handleDeletePrueba = async (pruebaId: string) => {
    await deletePatientCognitivePrueba(pruebaId)
    setPruebas((prev) => prev.filter((prueba) => prueba._id !== pruebaId))
    toast.success('Prueba eliminada exitosamente')
  }

  const handleAutoAssign = async () => {
    const TEST_PATIENT_ID = '690e44b121ba0748c3181ab2'
    
    if (!user.id) {
      toast.error('No se pudo obtener tu ID de usuario')
      return
    }

    setIsAssigning(true)
    try {
      await assignCuidadorToPatient(TEST_PATIENT_ID, user.id)
      toast.success('¡Asignación exitosa! Recargando...')
      
      // Esperar un momento y recargar la página
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error: any) {
      console.error('Error al auto-asignar:', error)
      toast.error(error.response?.data?.error || 'Error al realizar la asignación')
    } finally {
      setIsAssigning(false)
    }
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
          <p className="text-lg font-semibold tracking-wide">Preparando tu panel...</p>
        </div>
      </div>
    )
  }

  if (!user.rol || user.rol.toLowerCase() !== 'cuidador/familiar') {
    return <Navigate to="/" replace />
  }

  // Estado de carga inicial
  if (hasPatient === null) {
    return (
      <div className="min-h-screen patient-gradient-bg flex items-center justify-center text-white">
        <div className="glass-panel px-10 py-6 text-center">
          <p className="text-lg font-semibold tracking-wide">Cargando información del paciente...</p>
        </div>
      </div>
    )
  }

  // Estado: Sin paciente asociado
  if (hasPatient === false || !patient) {
    return (
      <div className="flex min-h-screen flex-col patient-gradient-bg">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-2xl space-y-6 rounded-2xl glass-panel p-8 text-center md:p-12">
            <div className="mx-auto h-20 w-20 rounded-full bg-white/20 p-5 backdrop-blur-sm">
              <svg className="h-full w-full text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-white">Sin Paciente Asignado</h2>
              <p className="text-lg text-white/90">
                Aún no tienes un paciente asociado a tu cuenta.
              </p>
            </div>

            <div className="space-y-4 rounded-xl bg-white/10 p-6 text-left backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white">¿Qué necesitas hacer?</h3>
              <ol className="space-y-3 text-white/90">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">1</span>
                  <span>Contacta al administrador del sistema o médico encargado</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">2</span>
                  <span>Solicita que te asignen a un paciente</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">3</span>
                  <span>Una vez asignado, recarga esta página para acceder al panel</span>
                </li>
              </ol>
            </div>

            {/* Botón de auto asignación para pruebas */}
            <div className="space-y-3 rounded-xl border-2 border-white/30 bg-gradient-to-r from-purple-500/20 to-blue-500/20 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🧪</span>
                <h3 className="text-lg font-semibold text-white">Modo de Prueba</h3>
              </div>
              <p className="text-sm text-white/90">
                Asígnate automáticamente al paciente de prueba "Juan" para comenzar a usar el panel inmediatamente.
              </p>
              <button
                onClick={handleAutoAssign}
                disabled={isAssigning}
                className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-purple-700 hover:to-blue-700 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isAssigning ? '⏳ Asignando...' : '✨ Autoasígnate a Juan - Tu paciente de Prueba'}
              </button>
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg bg-white/20 px-6 py-3 font-medium text-white backdrop-blur-sm transition-all hover:bg-white/30 hover:scale-105"
              >
                🔄 Recargar Página
              </button>
              <button
                onClick={() => navigate('/login')}
                className="rounded-lg bg-white/10 px-6 py-3 font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20 hover:scale-105"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col patient-gradient-bg">
      <Navbar />

      <main className="flex-1 pb-12">
        <CuidadorNavbar 
          userName={user.nombre ?? 'Cuidador'} 
          userEmail={user.email}
          patientName={patient.nombre}
        />

        <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6">
          <Routes>
            <Route
              path="dashboard"
              element={
                <CuidadorDashboard
                  userName={user.nombre ?? 'Cuidador'}
                  patientName={patient.nombre}
                  stats={stats}
                  pruebas={pruebas}
                  pruebasLoading={pruebasLoading}
                  onNavigate={(path) => navigate(path)}
                  onDeletePrueba={handleDeletePrueba}
                />
              }
            />
            <Route
              path="fotos"
              element={
                <CuidadorPhotos
                  photos={photos}
                  patientName={patient.nombre}
                  onCreatePhoto={handleCreatePhoto}
                  onUpdatePhoto={handleUpdatePhoto}
                  onDeletePhoto={handleDeletePhoto}
                  loading={photosLoading}
                />
              }
            />
            <Route
              path="progreso"
              element={
                <CuidadorProgress
                  recordings={recordings}
                  patientName={patient.nombre}
                  loading={recordingsLoading}
                />
              }
            />
            <Route
              path="linea-tiempo"
              element={<LineaTiempoEvolucion />}
            />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </main>

      <Footer />
    </div>
  )
}
