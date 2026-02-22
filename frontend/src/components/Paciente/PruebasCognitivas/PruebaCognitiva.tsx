import { useState, useEffect, useRef } from 'react'
import { HiCheckCircle, HiXCircle, HiArrowRight } from 'react-icons/hi2'
import { LoadingSpinner } from '../../primitives/LoadingSpinner'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5500'

interface Imagen {
  url: string
  orden: number
}

interface Prueba {
  _id: string
  primeraSecuenciaImagenes: Imagen[]
  segundaSecuenciaImagenes: Imagen[]
  pregunta: string
  ordenCorrecto: number[]
  estado: 'en_progreso' | 'completada' | 'abandonada'
}

interface ResultadosPrueba {
  puntajeOrdenamiento: number
  tiempoCompletado: number
}

type Fase = 'cargando' | 'instrucciones' | 'primera_secuencia' | 'segunda_secuencia' | 'respuesta_verbal' | 'ordenamiento' | 'resultados'

interface PruebaCognitivaProps {
  onCerrar: () => void
  onCompletada?: (resultados: ResultadosPrueba) => void
}

export const PruebaCognitiva = ({ onCerrar, onCompletada }: PruebaCognitivaProps) => {
  const [fase, setFase] = useState<Fase>('cargando')
  const [prueba, setPrueba] = useState<Prueba | null>(null)
  const [imagenActual, setImagenActual] = useState(0)
  const [respuestaTexto, setRespuestaTexto] = useState('')
  const [imagenesDesordenadas, setImagenesDesordenadas] = useState<
    (Imagen & { indiceOriginal: number })[]
  >([])
  const [ordenSeleccionado, setOrdenSeleccionado] = useState<number[]>([])
  const [resultados, setResultados] = useState<ResultadosPrueba | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mostrandoSecuencia, setMostrandoSecuencia] = useState(false)
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0)
  const pruebaIniciada = useRef(false)

  // Iniciar prueba al montar componente (solo UNA VEZ, incluso en StrictMode)
  useEffect(() => {
    if (!pruebaIniciada.current) {
      pruebaIniciada.current = true
      iniciarPrueba()
    }
  }, [])

  // Cronómetro: inicia cuando la prueba está en progreso, se detiene al finalizar
  useEffect(() => {
    let intervalo: NodeJS.Timeout | null = null

    if (prueba && fase !== 'cargando' && fase !== 'resultados') {
      intervalo = setInterval(() => {
        setTiempoTranscurrido(prev => prev + 1)
      }, 1000)
    }

    return () => {
      if (intervalo) clearInterval(intervalo)
    }
  }, [prueba, fase])

  const iniciarPrueba = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pruebas/iniciar`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Error al iniciar prueba')

      const data = await response.json()
      setPrueba(data.prueba)
      setFase('instrucciones')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setFase('instrucciones')
    }
  }

  const mostrarPrimeraSecuencia = () => {
    setFase('primera_secuencia')
    setMostrandoSecuencia(true)
    setImagenActual(0)
  }

  const avanzarImagen = () => {
    if (!prueba) return

    if (fase === 'primera_secuencia') {
      if (imagenActual < prueba.primeraSecuenciaImagenes.length - 1) {
        setImagenActual(imagenActual + 1)
      } else {
        finalizarPrimeraSecuencia()
      }
    } else if (fase === 'segunda_secuencia') {
      if (imagenActual < prueba.segundaSecuenciaImagenes.length - 1) {
        setImagenActual(imagenActual + 1)
      } else {
        finalizarSegundaSecuencia()
      }
    }
  }

  const finalizarPrimeraSecuencia = async () => {
    if (!prueba) return

    try {
      await fetch(`${API_BASE_URL}/api/pruebas/${prueba._id}/primera-secuencia`, {
        method: 'POST',
        credentials: 'include'
      })

      setMostrandoSecuencia(false)
      setImagenActual(0)
      setFase('segunda_secuencia')
      setMostrandoSecuencia(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar secuencia')
    }
  }

  const enviarRespuestaVerbal = async () => {
    if (!prueba) return
    if (!respuestaTexto.trim()) {
      setError('Debes proporcionar una respuesta')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/pruebas/${prueba._id}/respuesta-verbal`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ respuestaTexto })
      })

      if (!response.ok) throw new Error('Error al enviar respuesta')

      prepararOrdenamiento()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar respuesta')
    }
  }

  const finalizarSegundaSecuencia = async () => {
    if (!prueba) return

    try {
      await fetch(`${API_BASE_URL}/api/pruebas/${prueba._id}/segunda-secuencia`, {
        method: 'POST',
        credentials: 'include'
      })

      setMostrandoSecuencia(false)
      setFase('respuesta_verbal')
      setRespuestaTexto('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar secuencia')
    }
  }

  const prepararOrdenamiento = () => {
    if (!prueba) return

    // Combinar todas las imágenes
    const todasLasImagenes = [
      ...prueba.primeraSecuenciaImagenes.map((img, idx) => ({ ...img, indiceOriginal: idx })),
      ...prueba.segundaSecuenciaImagenes.map((img, idx) => ({
        ...img,
        indiceOriginal: idx + prueba.primeraSecuenciaImagenes.length
      }))
    ]

    // Desordenar array
    const desordenadas = [...todasLasImagenes].sort(() => Math.random() - 0.5)
    setImagenesDesordenadas(desordenadas)
    setOrdenSeleccionado([])
    setFase('ordenamiento')
  }

  const seleccionarImagen = (indiceOriginal: number) => {
    if (ordenSeleccionado.includes(indiceOriginal)) {
      // Deseleccionar
      setOrdenSeleccionado(ordenSeleccionado.filter(i => i !== indiceOriginal))
    } else {
      // Seleccionar
      setOrdenSeleccionado([...ordenSeleccionado, indiceOriginal])
    }
  }

  const finalizarPruebaCompleta = async () => {
    if (!prueba) return
    if (ordenSeleccionado.length !== imagenesDesordenadas.length) {
      setError('Debes ordenar todas las imágenes')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/pruebas/${prueba._id}/finalizar`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ordenPaciente: ordenSeleccionado })
      })

      if (!response.ok) throw new Error('Error al finalizar prueba')

      const data = await response.json()

      // Usar el tiempo del cronómetro local para que coincida con lo que vio el usuario
      const resultadosAjustados = {
        ...data.resultados,
        tiempoCompletado: tiempoTranscurrido
      }

      setResultados(resultadosAjustados)
      setFase('resultados')

      if (onCompletada) {
        onCompletada(resultadosAjustados)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al finalizar prueba')
    }
  }

  const abandonarPrueba = async () => {
    if (!prueba) {
      onCerrar()
      return
    }

    if (window.confirm('¿Estás seguro de que quieres abandonar la prueba?')) {
      try {
        await fetch(`${API_BASE_URL}/api/pruebas/${prueba._id}/abandonar`, {
          method: 'POST',
          credentials: 'include'
        })
      } catch (err) {
        console.error('Error al abandonar prueba:', err)
      }
      onCerrar()
    }
  }

  // Calcular número global de imagen (1-5 continuamente)
  const obtenerNumeroImagenGlobal = () => {
    if (fase === 'primera_secuencia') {
      return imagenActual + 1
    } else if (fase === 'segunda_secuencia' && prueba) {
      return prueba.primeraSecuenciaImagenes.length + imagenActual + 1
    }
    return 1
  }

  // Formatear tiempo transcurrido
  const formatearTiempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60)
    const segs = segundos % 60
    if (minutos > 0) {
      return `${minutos}m ${segs}s`
    }
    return `${segs}s`
  }

  if (fase === 'cargando') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="glass-panel p-8">
          <LoadingSpinner />
          <p className="text-white mt-4">Preparando tu prueba...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-panel max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <HiCheckCircle className="text-3xl text-[#3B9CFF]" />
            <div>
              <h2 className="text-2xl font-semibold text-white">Prueba Cognitiva</h2>
              {prueba && (
                <p className="text-sm text-white/70 mt-1">⏱️ Tiempo: <span className="font-semibold text-white">{formatearTiempo(tiempoTranscurrido)}</span></p>
              )}
            </div>
          </div>
          <button
            onClick={abandonarPrueba}
            className="glass-button px-4 py-2 text-white hover:bg-red-500/20"
          >
            Salir
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4 text-white flex items-center gap-2">
            <HiXCircle className="text-2xl" />
            {error}
          </div>
        )}

        {/* Contenido según fase */}
        {fase === 'instrucciones' && (
          <div className="space-y-6">
            <div className="glass-card p-8">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">📋 Instrucciones de la Prueba</h3>
              <ol className="space-y-4 text-white/80">
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-[#3B9CFF] text-white rounded-full flex items-center justify-center font-bold">1</span>
                  <span>Verás <strong>5 imágenes</strong> seguidas. <strong>Memoriza</strong> cada una y el orden exacto en que aparecen.</span>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-[#3B9CFF] text-white rounded-full flex items-center justify-center font-bold">2</span>
                  <span>A continuación, responderás una <strong>pregunta personal</strong> sobre ti.</span>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-[#3B9CFF] text-white rounded-full flex items-center justify-center font-bold">3</span>
                  <span>Finalmente, <strong>ordena todas las 5 imágenes</strong> en el orden exacto en que las viste.</span>
                </li>
              </ol>
            </div>

            <div className="glass-card p-6 border-l-4 border-[#3B9CFF]">
              <p className="text-center text-white">⏱️ <strong>Sin límite de tiempo</strong>. Tómate todo el tiempo que necesites.</p>
            </div>

            <button
              onClick={mostrarPrimeraSecuencia}
              className="w-full bg-[#3B9CFF] hover:bg-[#2B8CEF] text-white font-semibold py-3 px-6 rounded-full transition flex items-center justify-center gap-2"
            >
              Comenzar Prueba
              <HiArrowRight />
            </button>
          </div>
        )}

        {(fase === 'primera_secuencia' || fase === 'segunda_secuencia') && mostrandoSecuencia && prueba && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-white/70 mb-2">Memoriza las imágenes</p>
              <p className="text-white text-3xl font-bold">
                {obtenerNumeroImagenGlobal()}/5
              </p>
            </div>

            <div className="glass-card p-4 flex items-center justify-center min-h-[400px]">
              <img
                src={
                  fase === 'primera_secuencia'
                    ? prueba.primeraSecuenciaImagenes[imagenActual].url
                    : prueba.segundaSecuenciaImagenes[imagenActual].url
                }
                alt={`Imagen ${imagenActual + 1}`}
                className="max-w-full max-h-[500px] rounded-lg object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/1a2332/64748b?text=Imagen+no+disponible'
                }}
              />
            </div>

            <button
              onClick={avanzarImagen}
              className="w-full bg-[#3B9CFF] hover:bg-[#2B8CEF] text-white font-semibold py-3 px-6 rounded-full transition flex items-center justify-center gap-2"
            >
              {(fase === 'primera_secuencia' && imagenActual < prueba.primeraSecuenciaImagenes.length - 1) ||
              (fase === 'segunda_secuencia' && imagenActual < prueba.segundaSecuenciaImagenes.length - 1)
                ? 'Siguiente Imagen'
                : 'Continuar'}
              <HiArrowRight />
            </button>
          </div>
        )}

        {fase === 'respuesta_verbal' && prueba && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-xl font-semibold text-white mb-4">💬 Pregunta</h3>
              <p className="text-white/90 text-lg">{prueba.pregunta}</p>
            </div>

            <div className="space-y-4">
              <textarea
                value={respuestaTexto}
                onChange={(e) => setRespuestaTexto(e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                className="w-full glass-card p-4 text-white placeholder-white/50 rounded-lg min-h-[120px] resize-none"
              />
            </div>

            <button
              onClick={enviarRespuestaVerbal}
              disabled={!respuestaTexto.trim()}
              className="w-full bg-[#3B9CFF] hover:bg-[#2B8CEF] text-white font-semibold py-3 px-6 rounded-full transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
              <HiArrowRight />
            </button>
          </div>
        )}

        {fase === 'ordenamiento' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-xl font-semibold text-white mb-2">🔢 Ordenamiento</h3>
              <p className="text-white/80">
                Haz clic en las imágenes en el orden exacto en que las viste.
              </p>
              <p className="text-white/60 text-sm mt-2">
                Seleccionadas: {ordenSeleccionado.length} / {imagenesDesordenadas.length}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {imagenesDesordenadas.map((imagen, idx) => {
                const posicionSeleccionada = ordenSeleccionado.indexOf(imagen.indiceOriginal)
                const estaSeleccionada = posicionSeleccionada !== -1

                return (
                  <div
                    key={idx}
                    onClick={() => seleccionarImagen(imagen.indiceOriginal)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden transition-all ${
                      estaSeleccionada
                        ? 'ring-4 ring-[#3B9CFF] scale-95'
                        : 'hover:ring-2 hover:ring-white/50 hover:scale-105'
                    }`}
                  >
                    <img
                      src={imagen.url}
                      alt={`Imagen ${idx + 1}`}
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/300x200/1a2332/64748b?text=Imagen'
                      }}
                    />
                    {estaSeleccionada && (
                      <div className="absolute inset-0 bg-[#3B9CFF]/40 flex items-center justify-center">
                        <div className="bg-white text-[#3B9CFF] font-bold text-2xl rounded-full w-12 h-12 flex items-center justify-center">
                          {posicionSeleccionada + 1}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <button
              onClick={finalizarPruebaCompleta}
              disabled={ordenSeleccionado.length !== imagenesDesordenadas.length}
              className="w-full bg-[#3B9CFF] hover:bg-[#2B8CEF] text-white font-semibold py-3 px-6 rounded-full transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finalizar Prueba
              <HiCheckCircle />
            </button>
          </div>
        )}

        {fase === 'resultados' && resultados && prueba && (
          <div className="space-y-6">
            <div className="text-center glass-card p-8">
              {resultados.puntajeOrdenamiento === 100 ? (
                <>
                  <HiCheckCircle className="text-6xl text-green-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-white mb-2">¡Excelente trabajo!</h3>
                  <p className="text-white/70">Ordenaste todas las imágenes perfectamente.</p>
                </>
              ) : (
                <>
                  <HiCheckCircle className="text-6xl text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-2xl font-semibold text-white mb-2">¡Prueba Completada!</h3>
                  <p className="text-white/70">Aquí están tus resultados:</p>
                </>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="glass-card p-6 text-center">
                <p className="text-white/70 text-sm mb-2">Ordenamiento</p>
                <p className="text-4xl font-bold text-[#3B9CFF]">{resultados.puntajeOrdenamiento}%</p>
              </div>

              <div className="glass-card p-6 text-center">
                <p className="text-white/70 text-sm mb-2">Tiempo</p>
                <p className="text-4xl font-bold text-white">
                  {resultados.tiempoCompletado >= 60
                    ? `${Math.floor(resultados.tiempoCompletado / 60)}m ${resultados.tiempoCompletado % 60}s`
                    : `${resultados.tiempoCompletado}s`
                  }
                </p>
              </div>
            </div>

            {resultados.puntajeOrdenamiento < 100 && (
              <div className="glass-card p-6">
                <h4 className="text-lg font-semibold text-white mb-4">📸 Orden Correcto:</h4>
                <div className="grid grid-cols-5 gap-3">
                  {prueba.ordenCorrecto.map((indiceOriginal, posicion) => {
                    const imagen = indiceOriginal < prueba.primeraSecuenciaImagenes.length
                      ? prueba.primeraSecuenciaImagenes[indiceOriginal]
                      : prueba.segundaSecuenciaImagenes[indiceOriginal - prueba.primeraSecuenciaImagenes.length]

                    return (
                      <div key={posicion} className="relative">
                        <img
                          src={imagen.url}
                          alt={`Imagen ${posicion + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://placehold.co/150x100/1a2332/64748b?text=Img'
                          }}
                        />
                        <div className="absolute -top-2 -right-2 bg-[#3B9CFF] text-white font-bold text-sm rounded-full w-6 h-6 flex items-center justify-center">
                          {posicion + 1}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <button
              onClick={onCerrar}
              className="w-full bg-[#3B9CFF] hover:bg-[#2B8CEF] text-white font-semibold py-3 px-6 rounded-full transition"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
