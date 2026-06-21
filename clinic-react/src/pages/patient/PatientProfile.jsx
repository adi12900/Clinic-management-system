import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth, useAsync } from '../../hooks'
import { api } from '../../api'
import { Card, StatCard, Input, Select, Textarea, Button, Alert, Spinner } from '../../components/ui'
import { CalendarCheck, Clock, CheckCircle, Pen } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2),
  age: z.coerce.number().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
})

export default function PatientProfile() {
  const { email } = useAuth()
  const [editing, setEditing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  const { data: patients, loading, refetch } = useAsync(() => api.getPatients())
  const { data: appointments } = useAsync(() => api.getAppointments())

  const patient = useMemo(() => patients?.find(p => p.email?.toLowerCase() === email?.toLowerCase()), [patients, email])

  const mine = useMemo(() => {
    if (!appointments || !patient) return []
    return appointments.filter(a => a.patient_id === patient.id)
  }, [appointments, patient])

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  function startEdit() {
    if (!patient) return
    reset({
      name: patient.name, age: patient.age || '', gender: patient.gender || '',
      phone: patient.phone || '', email: patient.email || '', address: patient.address || '',
    })
    setEditing(true)
  }

  async function onSubmit(values) {
    setSaveError('')
    try {
      await api.updatePatient(patient.id, {
        name: values.name, age: values.age || null, gender: values.gender || null,
        phone: values.phone || null, email: values.email || null, address: values.address || null,
      })
      setSaveSuccess('Profile updated successfully!')
      setEditing(false)
      refetch()
      setTimeout(() => setSaveSuccess(''), 3000)
    } catch (e) {
      setSaveError(e.message)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="max-w-3xl space-y-6">
      {saveSuccess && <Alert message={saveSuccess} type="success" />}

      {/* Profile card */}
      <Card className="overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-br from-teal-500 via-teal-700 to-[#0A0F1E] p-8 flex items-center gap-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="w-20 h-20 bg-white/20 border-3 border-white/35 rounded-full flex items-center justify-center text-3xl flex-shrink-0">👤</div>
          <div>
            <div className="text-2xl font-extrabold mb-1">{patient?.name || email?.split('@')[0]}</div>
            <div className="text-teal-100/65 text-sm mb-4">{patient ? `Patient ID: #P${patient.id}` : '—'}</div>
            <Button variant="secondary" size="sm" onClick={startEdit} className="!bg-white/15 !border-white/30 !text-white hover:!bg-white/22">
              <Pen size={13} /> Edit Profile
            </Button>
          </div>
        </div>

        {/* View mode */}
        {!editing && patient && (
          <div className="p-8">
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Full Name', patient.name], ['Age', patient.age || '—'],
                ['Gender', patient.gender || '—'], ['Phone', patient.phone || '—'],
                ['Email', patient.email || '—'], ['Patient ID', `#P${patient.id}`],
              ].map(([label, val]) => (
                <div key={label} className="bg-white/[0.03] border border-white/6 rounded-xl p-4">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">{label}</div>
                  <div className="font-semibold text-sm">{val}</div>
                </div>
              ))}
              <div className="col-span-2 bg-white/[0.03] border border-white/6 rounded-xl p-4">
                <div className="text-[11px] text-slate-500 uppercase tracking-wide mb-1">Address</div>
                <div className="font-semibold text-sm">{patient.address || '—'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Edit mode */}
        {editing && (
          <div className="p-8">
            <Alert message={saveError} type="error" />
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full Name" error={errors.name?.message} {...register('name')} />
                <Input label="Age" type="number" {...register('age')} />
                <Select label="Gender" {...register('gender')}>
                  <option value="">Select</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </Select>
                <Input label="Phone" type="tel" {...register('phone')} />
                <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
              </div>
              <Textarea label="Address" {...register('address')} />
              <div className="flex justify-end gap-3 mt-2">
                <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : '💾 Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </Card>

      {/* Appointment stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={CalendarCheck} label="Total Appointments" value={mine.length} color="violet" />
        <StatCard icon={Clock} label="Scheduled" value={mine.filter(a => a.status === 'scheduled').length} color="amber" />
        <StatCard icon={CheckCircle} label="Completed" value={mine.filter(a => a.status === 'completed').length} color="teal" />
      </div>
    </div>
  )
}
