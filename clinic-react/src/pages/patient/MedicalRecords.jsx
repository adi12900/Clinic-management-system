import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useAsync } from '../../hooks'
import { api } from '../../api'
import { StatCard, Badge, Spinner, Modal, Button } from '../../components/ui'
import { FileText, CheckCircle, Clock, XCircle, CalendarPlus } from 'lucide-react'

const GRADIENTS = [
  'from-teal-500 to-teal-700', 'from-violet-500 to-violet-700',
  'from-amber-500 to-amber-700', 'from-red-500 to-red-700',
  'from-sky-500 to-sky-700',
]

export default function MedicalRecords() {
  const { email } = useAuth()
  const [selectedRecord, setSelectedRecord] = useState(null)

  const { data: doctors } = useAsync(() => api.getDoctors())
  const { data: patients } = useAsync(() => api.getPatients())
  const { data: appointments, loading } = useAsync(() => api.getAppointments())

  const doctorMap = useMemo(() => {
    const m = {}
    doctors?.forEach(d => { m[d.id] = d })
    return m
  }, [doctors])

  const mine = useMemo(() => {
    if (!appointments) return []
    const me = patients?.find(p => p.email?.toLowerCase() === email?.toLowerCase())
    return me ? appointments.filter(a => a.patient_id === me.id) : appointments
  }, [appointments, patients, email])

  const sorted = useMemo(() => [...mine].sort((a, b) => b.appointment_date.localeCompare(a.appointment_date)), [mine])

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Total Records" value={mine.length} color="teal" />
        <StatCard icon={CheckCircle} label="Completed" value={mine.filter(a => a.status === 'completed').length} color="teal" />
        <StatCard icon={Clock} label="Upcoming" value={mine.filter(a => a.status === 'scheduled').length} color="amber" />
        <StatCard icon={XCircle} label="Cancelled" value={mine.filter(a => a.status === 'cancelled').length} color="red" />
      </div>

      {/* Records grid */}
      {loading ? <Spinner /> : sorted.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-white/[0.03] border border-white/6 rounded-2xl">
          <FileText size={40} className="mx-auto mb-3 opacity-20" />
          <p className="mb-4">No medical records found.</p>
          <Link to="/patient/book"><Button size="sm"><CalendarPlus size={14} /> Book an Appointment</Button></Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sorted.map((appt, i) => {
            const doc = doctorMap[appt.doctor_id]
            const name = doc ? doc.name : `Doctor #${appt.doctor_id}`
            const init = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div key={appt.id} className="bg-white/[0.04] border border-white/8 rounded-2xl overflow-hidden hover:-translate-y-1 hover:border-teal-500/30 transition-all">
                <div className={`bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} p-5 relative overflow-hidden`}>
                  <div className="text-xs text-white/60 mb-1">Visit Date</div>
                  <div className="text-lg font-bold">{appt.appointment_date}</div>
                  {i === 0 && <span className="absolute top-3 right-3 bg-white/20 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">Recent</span>}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-sm font-bold text-slate-900 flex-shrink-0">{init}</div>
                    <div>
                      <div className="font-semibold text-sm">{name}</div>
                      <div className="text-xs text-slate-400">{doc?.specialization || '—'}</div>
                    </div>
                  </div>
                  <div className="mb-3"><Badge status={appt.status} /></div>
                  {appt.notes && <p className="text-xs italic text-slate-500 mb-3">"{appt.notes}"</p>}
                  <button
                    onClick={() => setSelectedRecord({ appt, doc, name, init })}
                    className="w-full py-2 bg-teal-500/8 border border-teal-500/25 text-teal-400 text-sm font-semibold rounded-xl hover:bg-teal-500/15 transition-colors"
                  >
                    👁 View Details
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        title="Appointment Record"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedRecord(null)}>Close</Button>
            <Link to="/patient/book"><Button><CalendarPlus size={14} /> Book Follow-up</Button></Link>
          </>
        }
      >
        {selectedRecord && (() => {
          const { appt, doc, name, init } = selectedRecord
          return (
            <div className="space-y-5">
              <div className="flex items-center gap-4 bg-teal-500/8 border border-teal-500/15 rounded-xl p-4">
                <div className="w-13 h-13 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-bold text-slate-900 w-12 h-12">{init}</div>
                <div>
                  <div className="font-bold">{name}</div>
                  <div className="text-sm text-slate-400">{doc?.specialization || '—'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Appointment Date', appt.appointment_date],
                  ['Status', <Badge key="s" status={appt.status} />],
                  ['Doctor Phone', doc?.phone || '—'],
                  ['Available Days', doc?.available_days || '—'],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">{label}</div>
                    <div className="font-semibold text-sm">{val}</div>
                  </div>
                ))}
                <div className="col-span-2">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">Notes</div>
                  <div className="font-semibold text-sm">{appt.notes || '—'}</div>
                </div>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
