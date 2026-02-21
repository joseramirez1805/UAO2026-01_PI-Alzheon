import { HiChevronRight, HiHandRaised, HiPhoto, HiChartBar, HiSparkles, HiTrash, HiChevronDown } from 'react-icons/hi2'
import { useState } from 'react'
import { PatientStats, PruebaCognitivaResult } from '../../../services/cuidadorApi'

interface CuidadorDashboardProps {
  userName: string
  patientName: string
  stats: PatientStats
  pruebas?: PruebaCognitivaResult[]
  pruebasLoading?: boolean
  onNavigate: (path: string) => void
  onDeletePrueba?: (pruebaId: string) => Promise<void>
}

const quickActions = [
  { label: 'Gestionar Fotos', action: '/cuidador/fotos', icon: HiPhoto },
  { label: 'Ver Progreso', action: '/cuidador/progreso', icon: HiChartBar },
]

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  })
}

export const CuidadorDashboard = ({
  userName,
  patientName,
  stats,
  pruebas = [],
  pruebasLoading = false,
  onNavigate,
  onDeletePrueba,
}: CuidadorDashboardProps) => {
  const [expandedPruebas, setExpandedPruebas] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  
  const weeklyGoal = 4
  const progress = Math.min(100, Math.round((stats.grabacionesEstaSemana / weeklyGoal) * 100))

  // Análisis de pruebas cognitivas
  const pruebasCompletadas = pruebas.filter(p => p.estado === 'completada')
  const promedioPuntaje = pruebasCompletadas.length > 0
    ? Math.round(pruebasCompletadas.reduce((sum, p) => sum + p.puntajeOrdenamiento, 0) / pruebasCompletadas.length)
    : 0
  const ultimaPrueba = pruebasCompletadas[0]

  const analizarDesempenio = (puntaje: number) => {
    if (puntaje === 100) return { texto: 'Excelente', color: 'text-green-400' }
    if (puntaje >= 80) return { texto: 'Muy bien', color: 'text-blue-400' }
    if (puntaje >= 60) return { texto: 'Bueno', color: 'text-yellow-400' }
    return { texto: 'Necesita práctica', color: 'text-orange-400' }
  }

  return (
    <section className="w-full px-4 pb-16 sm:px-6">
      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="glass-panel p-6">
          <p className="patient-section-title mb-2">Bienvenida</p>
          <h2 className="text-3xl lg:text-4xl font-semibold text-white leading-snug flex items-center gap-3">
            Hola, {userName}
            <span className="inline-flex items-center justify-center rounded-full bg-white/15 p-2 text-[#3B9CFF]">
              <HiHandRaised className="text-2xl" />
            </span>
          </h2>
          <p className="text-white/70 mt-3 text-lg max-w-2xl">
            Tu dedicación marca la diferencia. Aquí puedes gestionar los recuerdos de {patientName} y 
            seguir su progreso en el proceso de recordación.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="glass-card p-5 flex flex-col gap-3">
              <p className="text-sm uppercase tracking-[0.3em] text-white/70">Gestión de contenido</p>
              <h3 className="text-2xl font-semibold text-white">Agregar nuevas fotos</h3>
              <p className="text-white/70 text-sm">
                Sube fotografías significativas para ayudar a {patientName} a ejercitar su memoria.
              </p>
              <button
                onClick={() => onNavigate('/cuidador/fotos')}
                className="mt-auto glass-button rounded-full px-5 py-3 text-left text-sm font-semibold text-white flex items-center justify-between"
              >
                Gestionar fotos
                <HiChevronRight />
              </button>
            </div>

            <div className="glass-card p-5 flex flex-col gap-5">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/70">Actividad semanal</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-4xl font-semibold text-white">{stats.grabacionesEstaSemana}</span>
                  <span className="text-white/70 text-sm">de {weeklyGoal} sesiones</span>
                </div>
              </div>
              <div className="h-3 rounded-full bg-white/20 overflow-hidden">
                <div className="h-full bg-[#3B9CFF]" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-sm text-white/70">
                {stats.grabacionesEstaSemana >= weeklyGoal 
                  ? `¡Excelente! ${patientName} ha cumplido el objetivo semanal` 
                  : `${patientName} está en un gran ritmo`}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="glass-card p-5 flex flex-col gap-3">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">Resumen general</p>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/80">Total de fotos</span>
                <span className="text-2xl font-semibold text-white">{stats.totalFotos}</span>
              </div>
              <div className="h-px bg-white/10"></div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Total de grabaciones</span>
                <span className="text-2xl font-semibold text-white">{stats.totalGrabaciones}</span>
              </div>
              <div className="h-px bg-white/10"></div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">Esta semana</span>
                <span className="text-2xl font-semibold text-white">{stats.grabacionesEstaSemana}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-5 flex flex-col gap-3">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">Última actividad</p>
            {stats.ultimaGrabacion ? (
              <>
                <h3 className="text-xl font-semibold text-white">
                  {formatDate(stats.ultimaGrabacion.fecha)}
                </h3>
                <p className="text-white/70 text-sm">
                  Grabación de {Math.floor(stats.ultimaGrabacion.duracion / 60)} minutos
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-white">Sin grabaciones aún</h3>
                <p className="text-white/70 text-sm">
                  {patientName} aún no ha grabado ninguna descripción
                </p>
              </>
            )}

            <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white">
              <HiSparkles className="shrink-0 text-[#E8C39E]" />
              <span>
                Cada foto es una oportunidad para fortalecer la memoria. Sigue agregando contenido significativo.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 glass-panel p-6">
        <p className="patient-section-title mb-4">Accesos rápidos</p>
        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.action)}
              className="glass-card flex items-center gap-3 px-4 py-5 text-white text-lg font-semibold justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <action.icon className="text-2xl text-[#3B9CFF]" />
                </span>
                {action.label}
              </div>
              <HiChevronRight className="text-white/60" />
            </button>
          ))}
        </div>
      </div>

      {/* Sección de Pruebas Cognitivas */}
      <div className="mt-8 glass-panel p-6">
        <p className="patient-section-title mb-4">📊 Pruebas Cognitivas</p>
        
        {pruebasLoading ? (
          <div className="text-center py-8">
            <p className="text-white/70">Cargando pruebas cognitivas...</p>
          </div>
        ) : pruebasCompletadas.length > 0 ? (
          <div className="space-y-4">
            {/* Resumen General */}
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <div className="glass-card p-4">
                <p className="text-white/70 text-sm mb-2">Pruebas Completadas</p>
                <p className="text-3xl font-bold text-[#3B9CFF]">{pruebasCompletadas.length}</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-white/70 text-sm mb-2">Promedio de Acierto</p>
                <p className="text-3xl font-bold text-white">{promedioPuntaje}%</p>
              </div>
              <div className="glass-card p-4">
                <p className="text-white/70 text-sm mb-2">Rendimiento</p>
                <p className={`text-2xl font-bold ${analizarDesempenio(promedioPuntaje).color}`}>
                  {analizarDesempenio(promedioPuntaje).texto}
                </p>
              </div>
            </div>

            {/* Última Prueba */}
            {ultimaPrueba && (
              <div className="glass-card p-5 border-l-4 border-[#3B9CFF]">
                <h4 className="text-lg font-semibold text-white mb-3">Última Prueba</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-white/70 text-sm mb-1">Fecha</p>
                    <p className="text-white font-medium">{formatDate(ultimaPrueba.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-1">Puntaje</p>
                    <p className="text-2xl font-bold text-[#3B9CFF]">{ultimaPrueba.puntajeOrdenamiento}%</p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-1">Tiempo</p>
                    <p className="text-white font-medium">
                      {ultimaPrueba.tiempoCompletado >= 60
                        ? `${Math.floor(ultimaPrueba.tiempoCompletado / 60)}m ${ultimaPrueba.tiempoCompletado % 60}s`
                        : `${ultimaPrueba.tiempoCompletado}s`
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-white/70 text-sm mb-1">Análisis</p>
                    <p className={`font-medium ${analizarDesempenio(ultimaPrueba.puntajeOrdenamiento).color}`}>
                      {analizarDesempenio(ultimaPrueba.puntajeOrdenamiento).texto}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Historial de Pruebas */}
            <div className="mt-6">
              <button
                onClick={() => setExpandedPruebas(!expandedPruebas)}
                className="w-full glass-card p-4 flex items-center justify-between text-white font-semibold hover:bg-white/10 transition"
              >
                <span>📋 Historial de Pruebas ({pruebasCompletadas.length})</span>
                <HiChevronDown className={`transition-transform ${expandedPruebas ? 'rotate-180' : ''}`} />
              </button>

              {expandedPruebas && (
                <div className="mt-3 space-y-2">
                  {pruebasCompletadas.map((prueba) => (
                    <div key={prueba._id} className="glass-card p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <span className="text-white font-semibold">{formatDate(prueba.createdAt)}</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              prueba.puntajeOrdenamiento === 100
                                ? 'bg-green-400/20 text-green-300'
                                : prueba.puntajeOrdenamiento >= 80
                                ? 'bg-blue-400/20 text-blue-300'
                                : prueba.puntajeOrdenamiento >= 60
                                ? 'bg-yellow-400/20 text-yellow-300'
                                : 'bg-orange-400/20 text-orange-300'
                            }`}>
                              {prueba.puntajeOrdenamiento}%
                            </span>
                          </div>
                          <div className="grid gap-2 md:grid-cols-2 text-sm text-white/70">
                            <p>⏱️ Tiempo: {
                              prueba.tiempoCompletado >= 60
                                ? `${Math.floor(prueba.tiempoCompletado / 60)}m ${prueba.tiempoCompletado % 60}s`
                                : `${prueba.tiempoCompletado}s`
                            }</p>
                            <p>❓ Pregunta: {prueba.pregunta}</p>
                            {prueba.respuestaTexto && (
                              <p className="md:col-span-2">💬 Respuesta: <span className="text-white/80">{prueba.respuestaTexto.substring(0, 50)}...</span></p>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm('¿Estás seguro de que quieres eliminar este reporte?')) {
                              setDeletingId(prueba._id)
                              onDeletePrueba?.(prueba._id).finally(() => setDeletingId(null))
                            }
                          }}
                          disabled={deletingId === prueba._id}
                          className="ml-4 p-2 text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded-lg transition disabled:opacity-50"
                          title="Eliminar prueba"
                        >
                          <HiTrash className="text-xl" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-card p-6 text-center">
            <p className="text-white/70 mb-2">Aún no hay pruebas cognitivas completadas</p>
            <p className="text-white/50 text-sm">{patientName} puede comenzar con las pruebas cognitivas interactivas</p>
          </div>
        )}
      </div>
    </section>
  )
}
