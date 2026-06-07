import { createClient } from '@/lib/supabase/server'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: agenda } = await supabase.from('director_agenda').select('*').order('start_time', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Agenda Directiva</h1>
        <p className="text-slate-400 mt-2">Próximos compromisos, reuniones y mentorías.</p>
      </div>
      
      <div className="space-y-4">
        {agenda?.map((item: any) => {
          const startDate = new Date(item.start_time);
          const endDate = new Date(item.end_time);
          const isPast = endDate < new Date();
          
          return (
            <div key={item.id} className={`p-5 rounded-xl border flex gap-4 ${isPast ? 'bg-slate-900/50 border-slate-800/50 opacity-70' : 'bg-slate-900 border-slate-700'}`}>
              <div className="flex flex-col items-center justify-center min-w-[80px] bg-slate-950/50 rounded-lg p-2 border border-slate-800">
                <span className="text-xs text-slate-500 font-medium uppercase">{startDate.toLocaleDateString('es-ES', { month: 'short' })}</span>
                <span className="text-2xl font-bold text-slate-200">{startDate.getDate()}</span>
              </div>
              <div className="flex-1">
                <h3 className={`text-lg font-bold ${isPast ? 'text-slate-400 line-through' : 'text-slate-200'}`}>{item.title}</h3>
                <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs font-medium text-blue-400 bg-blue-900/20 px-2 py-1 rounded">
                    {startDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${item.is_completed ? 'bg-emerald-900/20 text-emerald-400' : 'bg-amber-900/20 text-amber-400'}`}>
                    {item.is_completed ? 'Completado' : 'Pendiente'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
        
        {(!agenda || agenda.length === 0) && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center border-dashed">
            <p className="text-slate-500">No hay compromisos agendados.</p>
          </div>
        )}
      </div>
    </div>
  )
}
