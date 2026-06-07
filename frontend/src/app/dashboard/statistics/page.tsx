import { createClient } from '@/lib/supabase/server'
import { DemographicsChart } from '@/components/dashboard/DemographicsChart'

export default async function StatisticsPage() {
  const supabase = await createClient()
  const { data: participants } = await supabase.from('participants').select('institutional_metrics')

  // Simple aggregations on the server
  const faculties: Record<string, number> = {}
  const roles: Record<string, number> = {}

  participants?.forEach(p => {
    const metrics = p.institutional_metrics || {}
    const fac = metrics.facultad || 'No especificado'
    const role = metrics.institution_role || 'No especificado'
    
    faculties[fac] = (faculties[fac] || 0) + 1
    roles[role] = (roles[role] || 0) + 1
  })

  const facultyData = Object.entries(faculties).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)
  const rolesData = Object.entries(roles).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estadísticos Institucionales</h1>
        <p className="text-slate-400 mt-2">Gráficas demográficas y de participación en tiempo real.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-lg font-medium text-slate-200 mb-6">Distribución por Facultad</h3>
          <DemographicsChart data={facultyData} type="bar" dataKey="value" nameKey="name" />
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h3 className="text-lg font-medium text-slate-200 mb-6">Roles Institucionales</h3>
          <DemographicsChart data={rolesData} type="pie" dataKey="value" nameKey="name" />
        </div>
      </div>
    </div>
  )
}
