import Link from 'next/link'
import { logout } from '@/app/login/actions'
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  BarChart3, 
  ClipboardList, 
  FileText, 
  Rocket, 
  LogOut 
} from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar Institutional (Dark Mode) */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Área de Innovación</h2>
          <p className="text-xs text-slate-400 mt-1">Panel Ejecutivo Institucional</p>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-blue-900/30 hover:text-blue-400 transition-colors">
            <LayoutDashboard className="h-4 w-4" /> Resumen Ejecutivo
          </Link>
          <Link href="/dashboard/participants" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-blue-900/30 hover:text-blue-400 transition-colors">
            <Users className="h-4 w-4" /> Participantes
          </Link>
          <Link href="/dashboard/events" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-blue-900/30 hover:text-blue-400 transition-colors">
            <Calendar className="h-4 w-4" /> Gestión de Eventos
          </Link>
          <Link href="/dashboard/statistics" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-blue-900/30 hover:text-blue-400 transition-colors">
            <BarChart3 className="h-4 w-4" /> Estadísticos
          </Link>
          <Link href="/dashboard/agenda" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-blue-900/30 hover:text-blue-400 transition-colors">
            <ClipboardList className="h-4 w-4" /> Agenda Directiva
          </Link>
          <Link href="/dashboard/reports" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-blue-900/30 hover:text-blue-400 transition-colors">
            <FileText className="h-4 w-4" /> Informes (IA)
          </Link>
          <Link href="/dashboard/entrepreneurships" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-blue-900/30 hover:text-blue-400 transition-colors">
            <Rocket className="h-4 w-4" /> Emprendimientos
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors">
              <LogOut className="h-4 w-4" /> Cerrar Sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 text-slate-100 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
