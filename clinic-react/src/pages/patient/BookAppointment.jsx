import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useAsync } from '../../hooks'
import { api } from '../../api'
import { Card, Button, Spinner, Alert, Input, Textarea } from '../../components/ui'
import { Stethoscope, Calendar, ClipboardCheck, CheckCircle } from 'lucide-react'

const STEPS = ['Select Doctor', 'Select Date', 'Confirm']

export default function BookAppointment() {
  const { email } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: doctors, loading: loadingDoctors } = useAsync(() => api.getDoctors())
  const { data: patients } = useAsync(() => api.getPatients())

  const myPatient = useMemo(() => patients?.find(p => p.email?.toLowerCase() === email?.toLowerCase()), [patients, email])

  function selectDoctor(doc) {
    setSelectedDoctor(doc)
    setTimeout(() => setStep(1), 280)
  }

  function goStep2() {
    if (!date) { setError('Please select an appointment date.'); return }
    setError('')
    setStep(2)
  }

  async function confirmBooking() {
    setError('')
    if (!myPatient) { setError('Patient profile not found. Contact admin.'); return }
    setLoading(true)
    try {
      await api.createAppointment({
        patient_id: myPatient.id,
        doctor_id: selectedDoctor.id,
        appointment_date: date,
        status: 'scheduled',
        notes: notes || null,
      })
      navigate('/patient/appointments')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const stepIcons = [Stethoscope, Calendar, ClipboardCheck]

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Step progress */}
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const Icon = stepIcons[i]
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 font-bold text-sm transition-all
                  ${i < step ? 'bg-teal-500/15 border-teal-500/40 text-teal-400'
                  : i === step ? 'bg-teal-500 border-teal-500 text-slate-900 shadow-lg shadow-teal-500/30'
                  : 'bg-white/4 border-white/8 text-slate-500'}`}>
                  {i < step ? <CheckCircle size={16} /> : i + 1}
                </div>
                <span className={`text-sm font-semibold hidden sm:block ${i === step ? 'text-white' : 'text-slate-500'}`}>{s}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-white/8 mx-4" />}
            </div>
          )
        })}
      </div>

      {error && <Alert message={error} type="error" />}

      {/* Step 0: Doctor selection */}
      {step === 0 && (
        <Card>
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/8 font-semibold">
            <Stethoscope size={16} className="text-teal-400" /> Select a Doctor
          </div>
          <div className="p-6">
            {loadingDoctors ? <Spinner /> : (
              <div className="grid sm:grid-cols-2 gap-4">
                {doctors?.map(doc => {
                  const init = doc.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                  const isSelected = selectedDoctor?.id === doc.id
                  return (
                    <button
                      key={doc.id}
                      onClick={() => selectDoctor(doc)}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all hover:-translate-y-0.5
                        ${isSelected ? 'border-teal-500 bg-teal-500/8 shadow-lg shadow-teal-500/15' : 'border-white/8 bg-white/[0.03] hover:border-teal-500/40 hover:bg-teal-500/5'}`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-bold text-slate-900 flex-shrink-0">
                        {init}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{doc.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">🩺 {doc.specialization}</div>
                        {doc.available_days && <div className="text-xs text-slate-600 mt-0.5">📅 {doc.available_days}</div>}
                      </div>
                      {isSelected && <CheckCircle size={18} className="text-teal-400 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Step 1: Date selection */}
      {step === 1 && selectedDoctor && (
        <Card>
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/8 font-semibold">
            <Calendar size={16} className="text-teal-400" /> Select Appointment Date
          </div>
          <div className="p-6 space-y-5">
            {/* Selected doctor bar */}
            <div className="flex items-center gap-4 bg-teal-500/8 border border-teal-500/25 rounded-xl p-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-bold text-slate-900 flex-shrink-0">
                {selectedDoctor.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{selectedDoctor.name}</div>
                <div className="text-sm text-slate-400">{selectedDoctor.specialization}</div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setStep(0)}>Change</Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">Appointment Date *</label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/8 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <Textarea label="Notes / Reason" placeholder="Describe your symptoms or reason…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <div className="flex justify-between mt-2">
              <Button variant="secondary" onClick={() => setStep(0)}>← Back</Button>
              <Button onClick={goStep2}>Next →</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Confirm */}
      {step === 2 && selectedDoctor && (
        <Card>
          <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/8 font-semibold">
            <ClipboardCheck size={16} className="text-teal-400" /> Confirm Appointment
          </div>
          <div className="p-6 space-y-6">
            <div className="bg-white/[0.03] border border-dashed border-teal-500/25 rounded-xl p-6 grid sm:grid-cols-2 gap-5">
              {[
                ['Doctor', selectedDoctor.name],
                ['Specialization', selectedDoctor.specialization],
                ['Date', new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })],
                ['Status', <span key="s" className="bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full px-3 py-0.5 text-xs font-semibold">Scheduled</span>],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">{label}</div>
                  <div className="font-semibold text-sm">{val}</div>
                </div>
              ))}
              <div className="sm:col-span-2">
                <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">Notes</div>
                <div className="font-semibold text-sm">{notes || '—'}</div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="secondary" onClick={() => setStep(1)}>← Back</Button>
              <Button onClick={confirmBooking} disabled={loading}>
                {loading ? 'Booking…' : '✓ Confirm Booking'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
