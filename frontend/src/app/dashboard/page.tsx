import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { count: totalParticipants } = await supabase.from('participants').select('*', { count: 'exact', head: true })
  const { count: totalEvents } = await supabase.from('events').select('*', { count: 'exact', head: true })
  const { count: totalEntrepreneurships } = await supabase.from('entrepreneurships').select('*', { count: 'exact', head: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Resumen Ejecutivo</h1>
        <p className="text-slate-400 mt-2">Visión general del estado actual de la institución.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-400">Total Participantes</h3>
          <p className="text-3xl font-bold text-slate-100 mt-2">{totalParticipants || 0}</p>
          <p className="text-xs text-blue-400 mt-1">Registrados históricamente</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-400">Total Eventos</h3>
          <p className="text-3xl font-bold text-slate-100 mt-2">{totalEvents || 0}</p>
          <p className="text-xs text-blue-400 mt-1">Gestionados en plataforma</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-slate-400">Emprendimientos</h3>
          <p className="text-3xl font-bold text-slate-100 mt-2">{totalEntrepreneurships || 0}</p>
          <p className="text-xs text-emerald-400 mt-1">Incubación activa</p>
        </div>
      </div>
    </div>
  )
}
