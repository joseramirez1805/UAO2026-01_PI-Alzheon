import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { HiArrowLeft, HiMicrophone, HiPhoto, HiUserPlus, HiBeaker } from 'react-icons/hi2'
import {
  PatientDetails,
  MedicoPhoto,
  MedicoRecording,
  Caregiver,
  fetchPatientDetails,
  fetchPatientPhotos,
  fetchPatientRecordings,
} from '../../../services/medicoApi'
import { AnalisisCognitivoView } from './AnalisisCognitivoView'

interface MedicoPatientDetailProps {
  caregivers: Caregiver[]
  onAssignCaregiver: (pacienteId: string, cuidadorId: string) => Promise<void>
}

export const MedicoPatientDetail = ({
  caregivers,
  onAssignCaregiver,
}: MedicoPatientDetailProps) => {
  const { pacienteId } = useParams<{ pacienteId: string }>()
  const navigate = useNavigate()

  const [patient, setPatient] = useState<PatientDetails | null>(null)
  const [photos, setPhotos] = useState<MedicoPhoto[]>([])
  const [recordings, setRecordings] = useState<MedicoRecording[]>([])
  const [loading, setLoading] = useState(true)
  const [showCaregiverModal, setShowCaregiverModal] = useState(false)
  const [selectedCaregiver, setSelectedCaregiver] = useState('')
  const [activeTab, setActiveTab] = useState<'general' | 'fotos' | 'grabaciones' | 'analisis'>('general')

  useEffect(() => {
    const loadData = async () => {
      if (!pacienteId) return

      try {
        const [patientData, photosData, recordingsData] = await Promise.all([
          fetchPatientDetails(pacienteId),
          fetchPatientPhotos(pacienteId),
          fetchPatientRecordings(pacienteId),
        ])
        setPatient(patientData)
        setPhotos(photosData)
        setRecordings(recordingsData)
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Error al cargar los datos')
        navigate('/medico/pacientes')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [pacienteId, navigate])

  const handleAssignCaregiver = async () => {
    if (pacienteId && selectedCaregiver) {
      await onAssignCaregiver(pacienteId, selectedCaregiver)
      setShowCaregiverModal(false)
      setSelectedCaregiver('')
      
      // Recargar datos del paciente
      const patientData = await fetchPatientDetails(pacienteId)
      setPatient(patientData)
    }
  }

  if (loading) {
    return (
      <div className="glass-panel p-10 text-center text-white">
        Cargando detalles del paciente...
      </div>
    )
  }

  if (!patient) {
    return null
  }

  return (
    <section className="w-full px-4 pb-16 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/medico/pacientes')}
          className="flex items-center gap-2 text-white/70 hover:text-white mb-4"
        >
          <HiArrowLeft className="text-xl" />
          Volver a pacientes
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-3xl">
              {patient.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="text-white">
              <h2 className="text-3xl font-bold">{patient.nombre}</h2>
              <p className="text-white/70">{patient.email}</p>
            </div>
          </div>

          <button
            onClick={() => setShowCaregiverModal(true)}
            className="flex items-center gap-2 glass-button rounded-full px-6 py-3 text-sm font-semibold text-white"
          >
            <HiUserPlus className="text-xl" />
            Asignar Cuidador
          </button>
        </div>
      </div>

      {/* Tabs de navegación */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'general'
              ? 'glass-button text-white'
              : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('fotos')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'fotos'
              ? 'glass-button text-white'
              : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <HiPhoto className="text-xl" />
          Fotos ({photos.length})
        </button>
        <button
          onClick={() => setActiveTab('grabaciones')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'grabaciones'
              ? 'glass-button text-white'
              : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <HiMicrophone className="text-xl" />
          Grabaciones ({recordings.length})
        </button>
        <button
          onClick={() => setActiveTab('analisis')}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'analisis'
              ? 'glass-button text-white'
              : 'bg-white/5 text-white/70 hover:bg-white/10'
          }`}
        >
          <HiBeaker className="text-xl" />
          Análisis Cognitivo
        </button>
      </div>

      {/* Contenido por tab */}
      {activeTab === 'general' && (
        <>
          {/* Estadísticas */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        <div className="glass-card p-6">
          <div className="p-3 rounded-xl bg-blue-500/20 backdrop-blur-sm w-fit mb-4">
            <HiPhoto className="text-3xl text-blue-300" />
          </div>
          <h3 className="text-3xl font-bold text-white">{patient.estadisticas.totalFotos}</h3>
          <p className="text-sm text-white/70 mt-1">Fotos subidas</p>
        </div>

        <div className="glass-card p-6">
          <div className="p-3 rounded-xl bg-purple-500/20 backdrop-blur-sm w-fit mb-4">
            <HiMicrophone className="text-3xl text-purple-300" />
          </div>
          <h3 className="text-3xl font-bold text-white">{patient.estadisticas.totalGrabaciones}</h3>
          <p className="text-sm text-white/70 mt-1">Grabaciones totales</p>
        </div>

        <div className="glass-card p-6">
          <div className="p-3 rounded-xl bg-green-500/20 backdrop-blur-sm w-fit mb-4">
            <HiMicrophone className="text-3xl text-green-300" />
          </div>
          <h3 className="text-3xl font-bold text-white">{patient.estadisticas.grabacionesEstaSemana}</h3>
          <p className="text-sm text-white/70 mt-1">Esta semana</p>
          <div className="mt-3 w-full bg-white/10 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((patient.estadisticas.grabacionesEstaSemana / patient.estadisticas.metaSemanal) * 100, 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-white/50 mt-1">
            Meta: {patient.estadisticas.metaSemanal} por semana
          </p>
        </div>

        <div className="glass-card p-6">
          <p className="text-sm text-white/70 mb-3">Última grabación</p>
          {patient.estadisticas.ultimaGrabacion ? (
            <>
              <p className="text-white text-sm">
                {new Date(patient.estadisticas.ultimaGrabacion.fecha).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-white/70 text-xs mt-1">
                Duración: {Math.floor(patient.estadisticas.ultimaGrabacion.duracion / 60)}:
                {(patient.estadisticas.ultimaGrabacion.duracion % 60).toString().padStart(2, '0')}
              </p>
            </>
          ) : (
            <p className="text-white/50 text-sm">Sin grabaciones</p>
          )}
          </div>
          </div>

          {/* Cuidadores Asignados */}
          <div className="glass-card p-6 mb-10">
        <h3 className="text-xl font-bold text-white mb-4">Cuidadores asignados</h3>
        {patient.cuidadores.length === 0 ? (
          <p className="text-white/50">Sin cuidadores asignados</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {patient.cuidadores.map((cuidador) => (
              <div
                key={cuidador._id}
                className="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm"
              >
                {cuidador.nombre} ({cuidador.email})
              </div>
            ))}
            </div>
          )}
          </div>

          {/* Fotos - Resumen */}
          <div className="glass-card p-6 mb-10">
        <h3 className="text-2xl font-bold text-white mb-6">Fotografías ({photos.length})</h3>
        {photos.length === 0 ? (
          <p className="text-white/70 text-center py-8">No hay fotografías subidas</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {photos.map((photo) => (
              <div key={photo._id} className="glass-card overflow-hidden group">
                <div className="relative h-48 w-full overflow-hidden">
                  <img
                    src={photo.url_contenido || ''}
                    alt={photo.etiqueta}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1220]/70 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-white text-sm font-semibold">{photo.etiqueta}</p>
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
          </div>

          {/* Grabaciones - Resumen */}
          <div className="glass-card p-6 mb-10">
        <h3 className="text-2xl font-bold text-white mb-6">Grabaciones ({recordings.length})</h3>
        {recordings.length === 0 ? (
          <p className="text-white/70 text-center py-8">No hay grabaciones realizadas</p>
        ) : (
          <div className="space-y-4">
            {recordings.map((recording) => (
              <div
                key={recording._id}
                className="p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={recording.fotoUrl}
                    alt="Foto"
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white font-semibold">
                        {new Date(recording.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <span className="text-white/70 text-sm">
                        {Math.floor(recording.duracion / 60)}:
                        {(recording.duracion % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                    {recording.audioUrl && (
                      <audio
                        controls
                        src={recording.audioUrl}
                        className="w-full h-8"
                        style={{ filter: 'invert(0.9)' }}
                      >
                        Tu navegador no soporta la reproducción de audio.
                      </audio>
                    )}
                    {recording.descripcionTexto && (
                      <p className="text-white/70 text-sm mt-2">{recording.descripcionTexto}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
          </div>
        </>
      )}

      {/* Fotos (Tab completo) */}
      {activeTab === 'fotos' && (
        <div className="glass-card p-6">
          <h3 className="text-2xl font-bold text-white mb-6">Fotografías ({photos.length})</h3>
          {photos.length === 0 ? (
            <p className="text-white/70 text-center py-8">No hay fotografías subidas</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => (
                <div key={photo._id} className="glass-card overflow-hidden group">
                  <div className="relative h-64 w-full overflow-hidden">
                    <img
                      src={photo.url_contenido || '' || ''}
                      alt={photo.etiqueta}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A1220]/70 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <p className="text-white font-semibold">{photo.etiqueta}</p>
                      {photo.descripcion && (
                        <p className="text-white/70 text-sm mt-1">{photo.descripcion}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grabaciones (Tab completo) */}
      {activeTab === 'grabaciones' && (
        <div className="glass-card p-6">
          <h3 className="text-2xl font-bold text-white mb-6">Grabaciones ({recordings.length})</h3>
          {recordings.length === 0 ? (
            <p className="text-white/70 text-center py-8">No hay grabaciones realizadas</p>
          ) : (
            <div className="space-y-4">
              {recordings.map((recording) => (
                <div
                  key={recording._id}
                  className="p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={recording.fotoUrl}
                      alt="Foto"
                      className="h-20 w-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-white font-semibold">
                          {new Date(recording.fecha).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                        <span className="text-white/70 text-sm">
                          {Math.floor(recording.duracion / 60)}:
                          {(recording.duracion % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      
                      {/* Tipo de contenido */}
                      <div className="flex gap-2 mb-3">
                        {recording.tipoContenido === 'audio' && (
                          <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
                            🎵 Audio
                          </span>
                        )}
                        {recording.tipoContenido === 'texto' && (
                          <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold">
                            📄 Texto
                          </span>
                        )}
                        {recording.tipoContenido === 'ambos' && (
                          <>
                            <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
                              🎵 Audio
                            </span>
                            <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold">
                              📄 Texto
                            </span>
                          </>
                        )}
                      </div>

                      {recording.audioUrl && (
                        <audio
                          controls
                          src={recording.audioUrl}
                          className="w-full h-8 mb-3"
                          style={{ filter: 'invert(0.9)' }}
                        >
                          Tu navegador no soporta la reproducción de audio.
                        </audio>
                      )}
                      
                      {recording.descripcionTexto && (
                        <div className="mb-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                          <p className="text-purple-300 text-sm font-semibold mb-1">Descripción:</p>
                          <p className="text-white/80 text-sm">{recording.descripcionTexto}</p>
                        </div>
                      )}
                      
                      {recording.transcripcion && (
                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                          <p className="text-blue-300 text-sm font-semibold mb-1">Transcripción:</p>
                          <p className="text-white/80 text-sm">{recording.transcripcion}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Análisis Cognitivo (Tab) */}
      {activeTab === 'analisis' && pacienteId && (
        <AnalisisCognitivoView
          pacienteId={pacienteId}
          pacienteNombre={patient.nombre}
        />
      )}

      {/* Modal: Asignar Cuidador */}
      {showCaregiverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="glass-panel max-w-lg w-full p-6">
            <h3 className="text-2xl font-bold text-white mb-4">Asignar Cuidador</h3>
            <p className="text-white/70 mb-6">
              Asignando cuidador a: <strong className="text-white">{patient.nombre}</strong>
            </p>

            <div className="mb-6">
              <label className="block text-white/70 text-sm mb-2">Seleccionar Cuidador</label>
              <select
                value={selectedCaregiver}
                onChange={(e) => setSelectedCaregiver(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:border-white/40"
              >
                <option value="">-- Seleccionar --</option>
                {caregivers.map((caregiver) => (
                  <option key={caregiver._id} value={caregiver._id} className="bg-[#0A1220]">
                    {caregiver.nombre} ({caregiver.email})
                    {caregiver.pacienteAsociado && ' - Ya asignado'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCaregiverModal(false)}
                className="flex-1 px-4 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignCaregiver}
                disabled={!selectedCaregiver}
                className="flex-1 px-4 py-3 rounded-lg glass-button text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Asignar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
