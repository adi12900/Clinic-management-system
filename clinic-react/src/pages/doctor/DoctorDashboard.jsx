import { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth, useAsync } from '../../hooks'
import { api } from '../../api'
import { StatCard, Card, Badge, Spinner, Toast, Table, Button, Select } from '../../components/ui'
import { CalendarCheck, Clock, CheckCircle, XCircle, Calendar, Users } from 'lucide-react'

function AppointmentsTable({ data, onRespond, onUpdate, loading }) {
  if (loading) return <Spinner />
  if (!data?.length) return <p className="py-10 text-center text-slate-500 text-sm">No appointments found.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {['#', 'Patient ID', 'Date', 'Status', 'Notes', 'Actions'].map(h => (
              <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((a, i) => (
            <tr key={a.id} className="border-t border-white/5 hover:bg-teal-500/[0.04] transition-colors">
              <td className="px-5 py-3.5 text-sm text-slate-500">{i + 1}</td>
              <td className="px-5 py-3.5"><span className="bg-white/5 border border-white/8 rounded-lg px-2.5 py-1 text-xs font-mono">#P{a.patient_id}</span></td>
              <td className="px-5 py-3.5 text-sm font-semibold">{a.appointment_date}</td>
              <td className="px-5 py-3.5"><Badge status={a.status} /></td>
              <td className="px-5 py-3.5 text-xs italic text-slate-500">{a.notes || '—'}</td>
              <td className="px-5 py-3.5">
                {a.status === 'pending' ? (
                  <div className="flex gap-2">
                    <button onClick={() => onRespond(a.id, 'accept')} className="text-xs px-3 py-1.5 bg-teal-500/10 border border-teal-500/25 text-teal-400 rounded-lg font-semibold hover:bg-teal-500/20">✓ Accept</button>
                    <button onClick={() => onRespond(a.id, 'cancel')} className="text-xs px-3 py-1.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-lg font-semibold hover:bg-red-500/20">✕ Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => onUpdate(a)} className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 rounded-lg font-semibold hover:bg-white/8">✏ Update</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DoctorDashboard() {
  const { email } = useAuth()
  const location = useLocation()
  const [toast, setToast] = useState(null)
  const [section, setSection] = useState(() => {
    const p = location.pathname
    if (p.includes('appointments')) return 'appointments'
    if (p.includes('patients')) return 'patients'
    if (p.includes('profile')) return 'profile'
    return 'dashboard'
  })

  useEffect(() => {
    const p = location.pathname
    if (p.includes('appointments')) setSection('appointments')
    else if (p.includes('patients')) setSection('patients')
    else if (p.includes('profile')) setSection('profile')
    else setSection('dashboard')
  }, [location.pathname])
  const [statusFilter, setStatusFilter] = useState('all')
  const [updateModal, setUpdateModal] = useState(null)
  const [newStatus, setNewStatus] = useState('')
  const [newNotes, setNewNotes] = useState('')

  const { data: stats, refetch: refetchStats } = useAsync(() => api.dashboard())
  const { data: allAppts, loading: apptLoading, refetch: refetchAppts } = useAsync(() => api.getAppointments())
  const { data: patients, loading: patientLoading } = useAsync(() => api.getPatients())
  const { data: doctors } = useAsync(() => api.getDoctors())

  const myDoctor = useMemo(() => {
    return doctors?.find(d => d.email?.toLowerCase() === email?.toLowerCase()) || doctors?.[0]
  }, [doctors, email])

  const today = new Date().toISOString().split('T')[0]
  const todayAppts = useMemo(() => allAppts?.filter(a => a.appointment_date === today) ?? [], [allAppts, today])
  const filteredAppts = useMemo(() => {
    if (!allAppts) return []
    return statusFilter === 'all' ? allAppts : allAppts.filter(a => a.status === statusFilter)
  }, [allAppts, statusFilter])

  async function respondAppointment(id, action) {
    try {
      await api.updateAppointmentStatus(id, action)
      setToast({ message: `Appointment ${action === 'accept' ? 'accepted' : 'cancelled'}.`, type: 'success' })
      refetchAppts(); refetchStats()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  function openUpdateModal(appt) {
    setUpdateModal(appt)
    setNewStatus(appt.status)
    setNewNotes(appt.notes || '')
  }

  async function submitUpdate() {
    try {
      await api.updateAppointment(updateModal.id, {
        patient_id: updateModal.patient_id, doctor_id: updateModal.doctor_id,
        appointment_date: updateModal.appointment_date, status: newStatus, notes: newNotes || null,
      })
      setUpdateModal(null)
      setToast({ message: 'Appointment updated.', type: 'success' })
      refetchAppts(); refetchStats()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  const navItems = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'appointments', label: 'My Appointments' },
    { key: 'patients', label: 'My Patients' },
    { key: 'profile', label: 'My Profile' },
  ]

  return (
    <div className="space-y-6">
      <Toast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />

      {/* Sub-nav tabs */}
      <div className="flex gap-2 flex-wrap border-b border-white/8 pb-4">
        {navItems.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${section === key ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Dashboard section */}
      {section === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-[#0A0F1E] rounded-2xl p-8 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-extrabold mb-1">Good day, {email?.split('@')[0]}! 👨‍⚕️</h2>
              <p className="text-white/60 text-sm">Here's your clinic activity overview.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={CalendarCheck} label="Total Appointments" value={stats?.total_appointments} color="teal" />
            <StatCard icon={Clock} label="Scheduled" value={stats?.scheduled} color="amber" />
            <StatCard icon={CheckCircle} label="Completed" value={stats?.completed} color="teal" />
            <StatCard icon={XCircle} label="Cancelled" value={stats?.cancelled} color="red" />
          </div>
          <Card>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div className="flex items-center gap-2.5 font-semibold"><Calendar size={16} className="text-teal-400" />Today's Appointments</div>
              <span className="bg-teal-500/15 text-teal-400 border border-teal-500/30 rounded-full px-3 py-0.5 text-xs font-semibold">{todayAppts.length}</span>
            </div>
            <AppointmentsTable data={todayAppts} onRespond={respondAppointment} onUpdate={openUpdateModal} loading={apptLoading} />
          </Card>
        </div>
      )}

      {/* Appointments section */}
      {section === 'appointments' && (
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-wrap gap-3">
            <div className="flex items-center gap-2.5 font-semibold"><CalendarCheck size={16} className="text-teal-400" />All Appointments</div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/8 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-teal-500/50"
              style={{ colorScheme: 'dark' }}
            >
              {['all', 'pending', 'scheduled', 'completed', 'cancelled'].map(s => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <AppointmentsTable data={filteredAppts} onRespond={respondAppointment} onUpdate={openUpdateModal} loading={apptLoading} />
        </Card>
      )}

      {/* Patients section */}
      {section === 'patients' && (
        <Card>
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/8 font-semibold">
            <Users size={16} className="text-emerald-400" />All Patients
          </div>
          {patientLoading ? <Spinner /> : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>{['#', 'Name', 'Age', 'Gender', 'Phone', 'Email'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {(patients ?? []).map((p, i) => (
                    <tr key={p.id} className="border-t border-white/5 hover:bg-teal-500/[0.04] transition-colors">
                      <td className="px-5 py-3.5 text-sm text-slate-500">{i + 1}</td>
                      <td className="px-5 py-3.5 text-sm flex items-center gap-2"><span className="text-teal-400">👤</span>{p.name}</td>
                      <td className="px-5 py-3.5 text-sm">{p.age || '—'}</td>
                      <td className="px-5 py-3.5 text-sm">{p.gender || '—'}</td>
                      <td className="px-5 py-3.5 text-sm">{p.phone || '—'}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{p.email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Profile section */}
      {section === 'profile' && myDoctor && (
        <div className="max-w-lg">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-[#0A0F1E] p-8 text-center relative overflow-hidden">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 text-4xl">👨‍⚕️</div>
              <h3 className="text-xl font-bold mb-1">{myDoctor.name}</h3>
              <p className="text-white/60 text-sm">{email}</p>
            </div>
            <div className="p-6 space-y-3">
              {[
                ['Name', myDoctor.name], ['Specialization', myDoctor.specialization],
                ['Phone', myDoctor.phone || '—'], ['Email', myDoctor.email || '—'],
                ['Available Days', myDoctor.available_days || '—'],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className="text-sm font-semibold">{val}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Update status modal */}
      {updateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setUpdateModal(null)}>
          <div className="bg-[#0D1426] border border-white/8 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <h3 className="font-bold">Update Appointment Status</h3>
              <button onClick={() => setUpdateModal(null)} className="text-slate-500 hover:text-white">✕</button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="w-full bg-white/5 border border-white/8 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-500/50" style={{ colorScheme: 'dark' }}>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes</label>
                <textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} rows={3} placeholder="Add notes..." className="w-full bg-white/5 border border-white/8 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-500/50 resize-none" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-white/8 flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => setUpdateModal(null)}>Cancel</Button>
              <Button size="sm" onClick={submitUpdate}>Update</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
