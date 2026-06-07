import { createClient } from '@/lib/supabase/server'

export default async function ParticipantsPage() {
  const supabase = await createClient()
  const { data: participants } = await supabase.from('participants').select('*').order('created_at', { ascending: false }).limit(50)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Participantes</h1>
        <p className="text-slate-400 mt-2">Directorio y métricas de asistentes institucionales. (Mostrando últimos 50)</p>
      </div>
      
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-950/50 text-slate-400 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 font-medium">Nombre Completo</th>
              <th className="px-6 py-4 font-medium">Correo Electrónico</th>
              <th className="px-6 py-4 font-medium">Rol</th>
              <th className="px-6 py-4 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {participants?.map((p: any) => (
              <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-200">{p.first_name} {p.last_name}</td>
                <td className="px-6 py-4 text-slate-400">{p.email}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-800/50">
                    {p.institution_role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                    {p.status}
                  </span>
                </td>
              </tr>
            ))}
            {(!participants || participants.length === 0) && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                  No hay participantes registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
