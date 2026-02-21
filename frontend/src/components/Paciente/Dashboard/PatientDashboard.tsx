import { HiBeaker, HiCalendar, HiChevronRight, HiHandRaised, HiMicrophone, HiPhoto, HiSparkles } from 'react-icons/hi2'
import { ReminderSettings } from '../../../services/api'

interface PatientDashboardProps {
  userName: string
  sessionsCompleted: number
  weeklyGoal: number
  nextReminder?: ReminderSettings
  recentRecordingDate?: string
  photoCount: number
  onNavigate: (path: string) => void
  onIniciarPrueba?: () => void
}

const quickActions = [
  { label: 'Ver Fotos', action: '/paciente/fotos', icon: HiPhoto },
  { label: 'Mis Grabaciones', action: '/paciente/grabaciones', icon: HiMicrophone },
  { label: 'Configuración', action: '/paciente/configuracion', icon: HiCalendar },
]

export const PatientDashboard = ({
  userName,
  sessionsCompleted,
  weeklyGoal,
  nextReminder,
  recentRecordingDate,
  photoCount,
  onNavigate,
  onIniciarPrueba,
}: PatientDashboardProps) => {
  const progress = Math.min(100, Math.round((sessionsCompleted / weeklyGoal) * 100))

  return (
    <section className="w-full px-4 pb-16 sm:px-6">
      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="glass-panel p-6">
          <p className="patient-section-title mb-2">Bienvenida</p>
          <h2 className="text-3xl lg:text-4xl font-semibold text-white leading-snug flex items-center gap-3">
            Hola, {userName || 'Paciente'}
            <span className="inline-flex items-center justify-center rounded-full bg-white/15 p-2 text-[#3B9CFF]">
              <HiHandRaised className="text-2xl" />
            </span>
          </h2>
          <p className="text-white/70 mt-3 text-lg max-w-2xl">
            Hoy es un gran día para fortalecer tus recuerdos. Tómate tu tiempo, respira profundo y deja que cada
            fotografía te cuente una historia.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="glass-card p-5 flex flex-col gap-3">
              <p className="text-sm uppercase tracking-[0.3em] text-white/70">Sesión del día</p>
              <h3 className="text-2xl font-semibold text-white">Explora tus fotografías</h3>
              <p className="text-white/70 text-sm">Observa cada imagen y graba lo que recuerdes, sin prisa.</p>
              <button
                onClick={() => onNavigate('/paciente/fotos')}
                className="mt-auto glass-button rounded-full px-5 py-3 text-left text-sm font-semibold text-white flex items-center justify-between"
              >
                Iniciar recorrido
                <HiChevronRight />
              </button>
            </div>

            <div className="glass-card p-5 flex flex-col gap-3 bg-gradient-to-br from-[#3B9CFF]/20 to-purple-500/20">
              <p className="text-sm uppercase tracking-[0.3em] text-white/70">Ejercicio cognitivo</p>
              <h3 className="text-2xl font-semibold text-white">Prueba de memoria</h3>
              <p className="text-white/70 text-sm">Evalúa tu memoria visual y verbal con esta actividad interactiva.</p>
              <button
                onClick={onIniciarPrueba}
                className="mt-auto bg-gradient-to-r from-[#3B9CFF] to-purple-500 hover:from-[#2B8CEF] hover:to-purple-600 rounded-full px-5 py-3 text-left text-sm font-semibold text-white flex items-center justify-between transition"
              >
                <span className="flex items-center gap-2">
                  <HiBeaker />
                  Iniciar prueba
                </span>
                <HiChevronRight />
              </button>
            </div>
          </div>

          <div className="mt-6 glass-card p-5 flex flex-col gap-5">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/70">Progreso semanal</p>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-4xl font-semibold text-white">{sessionsCompleted}</span>
                <span className="text-white/70 text-sm">de {weeklyGoal} sesiones</span>
              </div>
            </div>
            <div className="h-3 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-[#3B9CFF]" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm text-white/70">
              Excelente trabajo, ¡mantén este ritmo!
            </span>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="glass-card p-5 flex flex-col gap-3">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70">Siguiente recordatorio</p>
            <h3 className="text-2xl font-semibold text-white">
              {nextReminder?.enabled ? `${nextReminder.hour} hrs` : 'Recordatorios apagados'}
            </h3>
            <p className="text-white/70 text-sm">
              {nextReminder?.enabled
                ? `Frecuencia: ${nextReminder.frequency?.replace('_', ' ')}`
                : 'Activa los recordatorios para mantener tu rutina.'}
            </p>

            {nextReminder?.motivationalMessage && (
              <div className="mt-3 flex items-start gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white">
                <HiSparkles className="shrink-0 text-[#E8C39E]" />
                <span>{nextReminder.motivationalMessage}</span>
              </div>
            )}

            <button
              onClick={() => onNavigate('/paciente/configuracion')}
              className="glass-button rounded-full px-4 py-2 mt-2 text-sm font-semibold text-white"
            >
              Ajustar recordatorios
            </button>
          </div>

          <div className="glass-card p-5">
            <p className="text-sm uppercase tracking-[0.3em] text-white/70 mb-2">Resumen rápido</p>
            <ul className="space-y-3 text-white">
              <li className="flex justify-between text-sm">
                <span>Fotos disponibles</span>
                <span className="font-semibold">{photoCount}</span>
              </li>
              <li className="flex justify-between text-sm">
                <span>Última grabación</span>
                <span className="font-semibold">{recentRecordingDate ?? 'Aún no grabas'}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 glass-panel p-6">
        <p className="patient-section-title mb-4">Accesos rápidos</p>
        <div className="grid gap-4 md:grid-cols-3">
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
    </section>
  )
}
