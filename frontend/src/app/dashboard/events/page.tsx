import { createClient } from '@/lib/supabase/server'

export default async function EventsPage() {
  const supabase = await createClient()
  const { data: events } = await supabase.from('events').select('*').order('start_date', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Eventos</h1>
        <p className="text-slate-400 mt-2">Calendario, talleres y asistencias.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events?.map((e: any) => (
          <div key={e.id} className="rounded-xl border border-slate-800 bg-slate-900 flex flex-col overflow-hidden hover:border-slate-700 transition-colors">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900/30 text-purple-400 border border-purple-800/50">
                  {e.event_type}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  {new Date(e.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-200 leading-tight">{e.title}</h3>
              <p className="text-sm text-slate-400 mt-2 line-clamp-2">{e.description || 'Sin descripción'}</p>
            </div>
            <div className="bg-slate-950/50 px-6 py-4 border-t border-slate-800/50 flex justify-between items-center">
              <span className={`text-xs font-medium px-2 py-1 rounded-md ${e.status === 'Planificado' ? 'bg-blue-900/20 text-blue-400' : 'bg-slate-800 text-slate-300'}`}>
                {e.status}
              </span>
              <span className="text-xs text-slate-500">Capacidad: {e.capacity || 'N/A'}</span>
            </div>
          </div>
        ))}
        
        {(!events || events.length === 0) && (
          <div className="col-span-full rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center border-dashed">
            <p className="text-slate-500">No hay eventos registrados en el sistema.</p>
          </div>
        )}
      </div>
    </div>
  )
}
