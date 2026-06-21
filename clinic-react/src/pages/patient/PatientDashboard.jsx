import { Users, CalendarCheck, Clock, CheckCircle, Calendar } from 'lucide-react'
import { useAuth, useAsync } from '../../hooks'
import { api } from '../../api'
import { StatCard, Card, Badge, Spinner, Table } from '../../components/ui'

export default function PatientDashboard() {
  const { email } = useAuth()
  const { data: stats, loading: statsLoading } = useAsync(() => api.dashboard())
  const { data: appointments, loading: apptLoading } = useAsync(() => api.getAppointments())

  const columns = [
    { key: 'num', label: '#', render: (_, i) => i + 1 },
    { key: 'patient_id', label: 'Patient ID', render: r => `#P${r.patient_id}` },
    { key: 'doctor_id', label: 'Doctor ID', render: r => `#D${r.doctor_id}` },
    { key: 'appointment_date', label: 'Date' },
    { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
    { key: 'notes', label: 'Notes', render: r => <span className="italic text-slate-500 text-xs">{r.notes || '—'}</span> },
  ]

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-500 via-teal-700 to-[#0A0F1E] rounded-2xl p-10 flex items-center justify-between overflow-hidden relative shadow-xl shadow-teal-500/20">
        <div>
          <h2 className="text-3xl font-extrabold mb-2">Welcome back! 👋</h2>
          <p className="text-teal-100/70 text-base">Here's a summary of your clinic activity.</p>
        </div>
        <div className="hidden md:flex relative w-28 h-28 flex-shrink-0">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-3 rounded-full border border-white/5" />
          <div className="absolute inset-0 flex items-center justify-center text-white/20 text-6xl">+</div>
        </div>
      </div>

      {/* Stats */}
      {statsLoading ? <Spinner /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total Doctors" value={stats?.total_doctors} color="violet" />
          <StatCard icon={Users} label="Total Patients" value={stats?.total_patients} color="teal" />
          <StatCard icon={Clock} label="Scheduled" value={stats?.scheduled} color="amber" />
          <StatCard icon={CheckCircle} label="Completed" value={stats?.completed} color="teal" />
        </div>
      )}

      {/* Appointments table */}
      <Card>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5 font-semibold">
            <Calendar size={16} className="text-teal-400" />
            All Appointments
          </div>
          <span className="bg-teal-500/15 text-teal-400 border border-teal-500/30 rounded-full px-3 py-0.5 text-xs font-semibold">
            {appointments?.length ?? 0}
          </span>
        </div>
        {apptLoading ? <Spinner /> : (
          <Table
            columns={columns}
            data={appointments ?? []}
            emptyText="No appointments found."
          />
        )}
      </Card>
    </div>
  )
}
