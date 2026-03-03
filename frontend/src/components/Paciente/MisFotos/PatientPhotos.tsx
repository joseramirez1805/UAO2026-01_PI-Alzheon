import { useMemo, useState } from 'react'
import { HiArrowLeft, HiArrowRight, HiMicrophone, HiMiniCheckBadge, HiPencil } from 'react-icons/hi2'
import { toast } from 'sonner'
import { PatientPhoto } from '../../../services/api'
import { useAudioRecorder } from '../../../hooks/useAudioRecorder'

interface PatientPhotosProps {
  photos: PatientPhoto[]
  onUploadRecording: (input: { 
    photoId: string, 
    audio?: Blob, 
    duration?: number,
    descripcionTexto?: string 
  }) => Promise<void>
  loading?: boolean
}

type RecordingMode = 'audio' | 'texto'

const formatTimer = (seconds: number) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0')
  const secs = (seconds % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

export const PatientPhotos = ({ photos, onUploadRecording, loading }: PatientPhotosProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [recordingMode, setRecordingMode] = useState<RecordingMode>('audio')
  const [textoDescripcion, setTextoDescripcion] = useState('')

  const {
    audioBlob,
    audioURL,
    elapsedTime,
    isRecording,
    startRecording,
    stopRecording,
    reset,
  } = useAudioRecorder({
    onError: (msg) => toast.error(msg),
  })

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null
  const closeModal = () => {
    setSelectedIndex(null)
    reset()
    setStatusMessage(null)
    setTextoDescripcion('')
    setRecordingMode('audio')
  }

  const photoGrid = useMemo(() => {
    if (!photos.length && !loading) {
      return (
        <div className="glass-card p-10 text-center text-white">
          <p className="text-xl font-semibold mb-2">Aún no tienes fotografías cargadas</p>
          <span className="text-white/70">Tus cuidadores podrán agregarlas muy pronto.</span>
        </div>
      )
    }

    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {photos.map((photo, index) => (
          <button
            key={photo._id}
            onClick={() => {
              setSelectedIndex(index)
              reset()
              setStatusMessage(null)
              setTextoDescripcion('')
              setRecordingMode('audio')
            }}
            className="glass-card overflow-hidden text-left group focus:outline-none"
          >
            <div className="relative h-52 w-full overflow-hidden">
              <img
                src={photo.url_contenido || ''}
                alt={photo.etiqueta}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1220]/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <p className="text-white text-lg font-semibold">{photo.etiqueta}</p>
                <span className="text-white/70 text-sm">Pulsa para describir</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    )
  }, [loading, photos, reset])

  const handleSaveRecording = async () => {
    if (!selectedPhoto) {
      toast.error('No hay foto seleccionada')
      return
    }

    // Validar que haya al menos audio o texto
    if (!audioBlob && !textoDescripcion.trim()) {
      toast.error('Debes grabar un audio o escribir una descripción')
      return
    }

    try {
      setIsSaving(true)
      await onUploadRecording({
        photoId: selectedPhoto._id,
        audio: audioBlob || undefined,
        duration: audioBlob ? elapsedTime : undefined,
        descripcionTexto: textoDescripcion.trim() || undefined,
      })
      setStatusMessage('Descripción guardada exitosamente')
      toast.success('Descripción guardada exitosamente')
    } catch (error) {
      toast.error('No pudimos guardar tu descripción, intenta nuevamente')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="w-full px-4 pb-16 sm:px-6">
      <div className="flex items-center justify-between mb-6 text-white">
        <div>
          <p className="patient-section-title">Mis Fotos</p>
          <h2 className="text-3xl font-semibold">Explora tus recuerdos</h2>
        </div>
        {photos.length > 0 && (
          <span className="glass-button rounded-full px-4 py-2 text-sm text-white/80">
            {photos.length} fotografías
          </span>
        )}
      </div>

      {loading ? (
        <div className="glass-panel p-10 text-center text-white">
          Cargando tus fotografías...
        </div>
      ) : (
        photoGrid
      )}

      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
          <div className="absolute inset-0 bg-[#050914]/80" onClick={closeModal} />

          <div className="relative glass-panel w-full max-w-4xl p-6 lg:p-10 text-white my-auto max-h-[90vh] overflow-y-auto patient-scroll">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 glass-button rounded-full px-4 py-2 text-sm font-semibold"
            >
              Cerrar
            </button>
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  setSelectedIndex((prev) => {
                    if (prev === null) return prev
                    const newIndex = prev - 1 < 0 ? photos.length - 1 : prev - 1
                    reset()
                    setStatusMessage(null)
                    setTextoDescripcion('')
                    setRecordingMode('audio')
                    return newIndex
                  })
                }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full glass-button"
              >
                <HiArrowLeft className="text-2xl" />
              </button>

              <div className="text-center">
                <p className="text-white/70 uppercase tracking-[0.5em] text-xs">Foto {selectedIndex! + 1} de {photos.length}</p>
                <h3 className="text-2xl font-semibold mt-2">{selectedPhoto.etiqueta}</h3>
              </div>

              <button
                onClick={() => {
                  setSelectedIndex((prev) => {
                    if (prev === null) return prev
                    const newIndex = (prev + 1) % photos.length
                    reset()
                    setStatusMessage(null)
                    setTextoDescripcion('')
                    setRecordingMode('audio')
                    return newIndex
                  })
                }}
                className="inline-flex h-12 w-12 items-center justify-center rounded-full glass-button"
              >
                <HiArrowRight className="text-2xl" />
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr,1fr]">
              <div className="overflow-hidden rounded-3xl border border-white/20">
                <img src={selectedPhoto.url_contenido} alt={selectedPhoto.etiqueta} className="w-full object-cover max-h-[420px]" />
              </div>

              <div className="glass-card p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm uppercase tracking-[0.4em] text-white/70">
                    {recordingMode === 'audio' ? 'Graba tu descripción' : 'Escribe tu descripción'}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setRecordingMode('audio')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        recordingMode === 'audio' 
                          ? 'bg-[#3B9CFF] text-white' 
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <HiMicrophone className="inline mr-1" />
                      Audio
                    </button>
                    <button
                      onClick={() => setRecordingMode('texto')}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        recordingMode === 'texto' 
                          ? 'bg-[#3B9CFF] text-white' 
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                      }`}
                    >
                      <HiPencil className="inline mr-1" />
                      Texto
                    </button>
                  </div>
                </div>

                {recordingMode === 'audio' ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className={`h-14 w-14 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-500 recording-pulse' : 'bg-white/15'}`}>
                        <HiMicrophone className="text-2xl" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold">{isRecording ? 'Grabando...' : 'Listo para grabar'}</p>
                        <span className="text-white/70 text-sm">Duración: {formatTimer(elapsedTime)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {!isRecording && (
                        <button
                          onClick={startRecording}
                          className="flex-1 glass-button rounded-full px-4 py-3 font-semibold"
                        >
                          Iniciar grabación
                        </button>
                      )}
                      {isRecording && (
                        <button
                          onClick={stopRecording}
                          className="flex-1 rounded-full px-4 py-3 font-semibold bg-red-500/80 hover:bg-red-500 transition-colors"
                        >
                          Detener grabación
                        </button>
                      )}
                      {audioURL && !isRecording && (
                        <div className="w-full rounded-2xl bg-white/10 px-4 py-3">
                          <p className="text-sm text-white/70 mb-2">Vista previa</p>
                          <audio
                            controls
                            src={audioURL}
                            className="w-full"
                          >
                            Tu navegador no soporta la reproducción de audio.
                          </audio>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <textarea
                      value={textoDescripcion}
                      onChange={(e) => setTextoDescripcion(e.target.value)}
                      placeholder="Escribe aquí tu descripción de esta fotografía..."
                      className="w-full min-h-[200px] rounded-2xl bg-white/10 px-4 py-3 text-white placeholder:text-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-[#3B9CFF]"
                      maxLength={1000}
                    />
                    <p className="text-xs text-white/50 text-right">
                      {textoDescripcion.length} / 1000 caracteres
                    </p>
                  </div>
                )}

                <button
                  onClick={handleSaveRecording}
                  disabled={(!audioBlob && !textoDescripcion.trim()) || isSaving}
                  className="w-full rounded-full bg-[#3B9CFF] px-4 py-3 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Guardando...' : 'Guardar descripción'}
                </button>

                {statusMessage && (
                  <div className="flex items-center gap-2 text-sm text-[#E8FFC2] bg-white/10 rounded-2xl px-4 py-2">
                    <HiMiniCheckBadge className="text-xl" />
                    {statusMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
