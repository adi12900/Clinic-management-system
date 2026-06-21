import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useAsync } from '../../hooks'
import { api } from '../../api'
import { Card, Badge, Spinner, Button, Toast } from '../../components/ui'
import { CalendarCheck, Plus, RotateCcw } from 'lucide-react'

const FILTERS = ['all', 'scheduled', 'completed', 'cancelled']

export default function PatientAppointments() {
  const { email } = useAuth()
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState(null)

  const { data: doctors } = useAsync(() => api.getDoctors())
  const { data: appointments, loading, refetch } = useAsync(() => api.getAppointments())

  const doctorMap = useMemo(() => {
    const m = {}
    doctors?.forEach(d => { m[d.id] = d })
    return m
  }, [doctors])

  const filtered = useMemo(() => {
    if (!appointments) return []
    return filter === 'all' ? appointments : appointments.filter(a => a.status === filter)
  }, [appointments, filter])

  async function cancelAppointment(appt) {
    if (!confirm('Cancel this appointment?')) return
    try {
      await api.updateAppointment(appt.id, {
        patient_id: appt.patient_id, doctor_id: appt.doctor_id,
        appointment_date: appt.appointment_date, status: 'cancelled', notes: appt.notes || null,
      })
      setToast({ message: 'Appointment cancelled.', type: 'success' })
      refetch()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  return (
    <div className="space-y-6">
      <Toast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />

      {/* Filter bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-semibold capitalize border transition-all
                ${filter === f
                  ? 'bg-teal-500/15 text-teal-400 border-teal-500/40'
                  : 'bg-white/4 text-slate-400 border-white/8 hover:text-white hover:bg-white/7'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <Link to="/patient/book">
          <Button size="sm"><Plus size={14} /> Book New</Button>
        </Link>
      </div>

      {/* Table */}
      <Card>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-center gap-2.5 font-semibold">
            <CalendarCheck size={16} className="text-teal-400" />
            Appointment History
          </div>
          <span className="bg-teal-500/15 text-teal-400 border border-teal-500/30 rounded-full px-3 py-0.5 text-xs font-semibold">
            {filtered.length}
          </span>
        </div>

        {loading ? <Spinner /> : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <CalendarCheck size={36} className="mx-auto mb-3 opacity-20" />
            <p className="mb-4">No appointments found.</p>
            <Link to="/patient/book"><Button size="sm"><Plus size={14} /> Book Now</Button></Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['#', 'Date', 'Doctor', 'Specialization', 'Status', 'Notes', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => {
                  const doc = doctorMap[a.doctor_id]
                  const name = doc ? doc.name : `Doctor #${a.doctor_id}`
                  const init = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <tr key={a.id} className="border-t border-white/5 hover:bg-teal-500/[0.04] transition-colors">
                      <td className="px-5 py-3.5 text-slate-500 text-sm">{i + 1}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold">{a.appointment_date}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-xs font-bold text-slate-900 flex-shrink-0">{init}</div>
                          <span className="text-sm">{name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-400">{doc?.specialization || '—'}</td>
                      <td className="px-5 py-3.5"><Badge status={a.status} /></td>
                      <td className="px-5 py-3.5 text-xs italic text-slate-500">{a.notes || '—'}</td>
                      <td className="px-5 py-3.5">
                        {a.status === 'scheduled' && (
                          <button onClick={() => cancelAppointment(a)} className="text-xs px-3 py-1.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-lg font-semibold hover:bg-red-500/20 transition-colors">
                            Cancel
                          </button>
                        )}
                        {a.status === 'cancelled' && (
                          <Link to="/patient/book" className="text-xs px-3 py-1.5 bg-teal-500/10 border border-teal-500/25 text-teal-400 rounded-lg font-semibold hover:bg-teal-500/20 transition-colors inline-flex items-center gap-1">
                            <RotateCcw size={11} /> Rebook
                          </Link>
                        )}
                        {a.status === 'completed' && <span className="text-xs text-slate-500">Completed</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
