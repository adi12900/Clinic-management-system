import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAsync } from '../../hooks'
import { api } from '../../api'
import { StatCard, Card, Badge, Spinner, Modal, Input, Select, Textarea, Button, Alert, Toast } from '../../components/ui'
import { Users, Stethoscope, CalendarCheck, LayoutDashboard } from 'lucide-react'

const doctorSchema = z.object({
  name: z.string().min(2, 'Required'),
  specialization: z.string().min(2, 'Required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  available_days: z.string().optional(),
})

const patientSchema = z.object({
  name: z.string().min(2, 'Required'),
  age: z.coerce.number().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
})

const apptSchema = z.object({
  patient_id: z.coerce.number().min(1, 'Required'),
  doctor_id: z.coerce.number().min(1, 'Required'),
  appointment_date: z.string().min(1, 'Required'),
  status: z.string().default('scheduled'),
  notes: z.string().optional(),
})

function CRUDSection({ title, icon: Icon, columns, data, loading, onAdd, onEdit, onDelete, addLabel = 'Add' }) {
  return (
    <Card>
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/8 flex-wrap gap-3">
        <div className="flex items-center gap-2.5 font-semibold"><Icon size={16} className="text-teal-400" />{title}</div>
        <Button size="sm" onClick={onAdd}><span>+</span> {addLabel}</Button>
      </div>
      {loading ? <Spinner /> : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['#', ...columns.map(c => c.label), 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={columns.length + 2} className="py-12 text-center text-slate-500 text-sm">No data found.</td></tr>
              ) : data.map((row, i) => (
                <tr key={row.id} className="border-t border-white/5 hover:bg-teal-500/[0.04] transition-colors">
                  <td className="px-5 py-3.5 text-sm text-slate-500">{i + 1}</td>
                  {columns.map(col => (
                    <td key={col.key} className="px-5 py-3.5 text-sm text-slate-200">
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => onEdit(row)} className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 text-slate-300 rounded-lg font-semibold hover:bg-white/8">✏</button>
                      <button onClick={() => onDelete(row.id)} className="text-xs px-3 py-1.5 bg-red-500/10 border border-red-500/25 text-red-400 rounded-lg font-semibold hover:bg-red-500/20">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export default function AdminDashboard() {
  const location = useLocation()
  const [section, setSection] = useState(() => {
    const p = location.pathname
    if (p.includes('doctors')) return 'doctors'
    if (p.includes('patients')) return 'patients'
    if (p.includes('appointments')) return 'appointments'
    return 'dashboard'
  })

  useEffect(() => {
    const p = location.pathname
    if (p.includes('doctors')) setSection('doctors')
    else if (p.includes('patients')) setSection('patients')
    else if (p.includes('appointments')) setSection('appointments')
    else setSection('dashboard')
  }, [location.pathname])
  const [toast, setToast] = useState(null)
  const [doctorModal, setDoctorModal] = useState(null)
  const [patientModal, setPatientModal] = useState(null)
  const [apptModal, setApptModal] = useState(null)

  const { data: stats, refetch: rStats } = useAsync(() => api.dashboard())
  const { data: doctors, loading: dLoad, refetch: rDoctors } = useAsync(() => api.getDoctors())
  const { data: patients, loading: pLoad, refetch: rPatients } = useAsync(() => api.getPatients())
  const { data: appts, loading: aLoad, refetch: rAppts } = useAsync(() => api.getAppointments())

  function showToast(message, type = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Doctor form
  const dForm = useForm({ resolver: zodResolver(doctorSchema) })
  async function saveDoctor(values) {
    try {
      if (doctorModal?.data) await api.updateDoctor(doctorModal.data.id, values)
      else await api.createDoctor(values)
      setDoctorModal(null); rDoctors(); rStats()
      showToast(`Doctor ${doctorModal?.data ? 'updated' : 'added'}.`)
    } catch (e) { showToast(e.message, 'error') }
  }
  function openDoctorModal(doc) {
    dForm.reset(doc
      ? { name: doc.name, specialization: doc.specialization, phone: doc.phone || '', email: doc.email || '', available_days: doc.available_days || '' }
      : { name: '', specialization: '', phone: '', email: '', available_days: '' })
    setDoctorModal({ data: doc || null })
  }
  async function deleteDoctor(id) {
    if (!confirm('Delete this doctor?')) return
    try { await api.deleteDoctor(id); rDoctors(); rStats(); showToast('Doctor deleted.') }
    catch (e) { showToast(e.message, 'error') }
  }

  // Patient form
  const pForm = useForm({ resolver: zodResolver(patientSchema) })
  async function savePatient(values) {
    try {
      if (patientModal?.data) await api.updatePatient(patientModal.data.id, values)
      else await api.createPatient(values)
      setPatientModal(null); rPatients(); rStats()
      showToast(`Patient ${patientModal?.data ? 'updated' : 'added'}.`)
    } catch (e) { showToast(e.message, 'error') }
  }
  function openPatientModal(p) {
    pForm.reset(p
      ? { name: p.name, age: p.age || '', gender: p.gender || '', phone: p.phone || '', email: p.email || '', address: p.address || '' }
      : { name: '', age: '', gender: '', phone: '', email: '', address: '' })
    setPatientModal({ data: p || null })
  }
  async function deletePatient(id) {
    if (!confirm('Delete this patient?')) return
    try { await api.deletePatient(id); rPatients(); rStats(); showToast('Patient deleted.') }
    catch (e) { showToast(e.message, 'error') }
  }

  // Appointment form
  const aForm = useForm({ resolver: zodResolver(apptSchema) })
  async function saveAppt(values) {
    try {
      if (apptModal?.data) await api.updateAppointment(apptModal.data.id, values)
      else await api.createAppointment(values)
      setApptModal(null); rAppts(); rStats()
      showToast(`Appointment ${apptModal?.data ? 'updated' : 'added'}.`)
    } catch (e) { showToast(e.message, 'error') }
  }
  function openApptModal(a) {
    aForm.reset(a
      ? { patient_id: a.patient_id, doctor_id: a.doctor_id, appointment_date: a.appointment_date, status: a.status, notes: a.notes || '' }
      : { patient_id: '', doctor_id: '', appointment_date: '', status: 'scheduled', notes: '' })
    setApptModal({ data: a || null })
  }
  async function deleteAppt(id) {
    if (!confirm('Delete this appointment?')) return
    try { await api.deleteAppointment(id); rAppts(); rStats(); showToast('Appointment deleted.') }
    catch (e) { showToast(e.message, 'error') }
  }

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'doctors', label: 'Doctors', icon: Stethoscope },
    { key: 'patients', label: 'Patients', icon: Users },
    { key: 'appointments', label: 'Appointments', icon: CalendarCheck },
  ]

  return (
    <div className="space-y-6">
      <Toast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />

      {/* Sub-nav tabs */}
      <div className="flex gap-2 flex-wrap border-b border-white/8 pb-4">
        {navItems.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSection(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${section === key ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {section === 'dashboard' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Stethoscope} label="Doctors" value={stats?.total_doctors} color="teal" />
            <StatCard icon={Users} label="Patients" value={stats?.total_patients} color="teal" />
            <StatCard icon={CalendarCheck} label="Scheduled" value={stats?.scheduled} color="amber" />
            <StatCard icon={CalendarCheck} label="Completed" value={stats?.completed} color="teal" />
          </div>
          <Card className="p-5 text-slate-400 text-sm">
            Use the tabs above to manage{' '}
            <strong className="text-white">Doctors</strong>,{' '}
            <strong className="text-white">Patients</strong>, and{' '}
            <strong className="text-white">Appointments</strong>.
          </Card>
        </div>
      )}

      {/* Doctors */}
      {section === 'doctors' && (
        <CRUDSection
          title="Doctors" icon={Stethoscope} loading={dLoad} data={doctors ?? []}
          addLabel="Add Doctor" onAdd={() => openDoctorModal(null)}
          onEdit={openDoctorModal} onDelete={deleteDoctor}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'specialization', label: 'Specialization' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
            { key: 'available_days', label: 'Available Days' },
          ]}
        />
      )}

      {/* Patients */}
      {section === 'patients' && (
        <CRUDSection
          title="Patients" icon={Users} loading={pLoad} data={patients ?? []}
          addLabel="Add Patient" onAdd={() => openPatientModal(null)}
          onEdit={openPatientModal} onDelete={deletePatient}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'age', label: 'Age' },
            { key: 'gender', label: 'Gender' },
            { key: 'phone', label: 'Phone' },
            { key: 'email', label: 'Email' },
          ]}
        />
      )}

      {/* Appointments */}
      {section === 'appointments' && (
        <CRUDSection
          title="Appointments" icon={CalendarCheck} loading={aLoad} data={appts ?? []}
          addLabel="Add Appointment" onAdd={() => openApptModal(null)}
          onEdit={openApptModal} onDelete={deleteAppt}
          columns={[
            { key: 'patient_id', label: 'Patient ID', render: r => `#P${r.patient_id}` },
            { key: 'doctor_id', label: 'Doctor ID', render: r => `#D${r.doctor_id}` },
            { key: 'appointment_date', label: 'Date' },
            { key: 'status', label: 'Status', render: r => <Badge status={r.status} /> },
            { key: 'notes', label: 'Notes', render: r => <span className="italic text-slate-500 text-xs">{r.notes || '—'}</span> },
          ]}
        />
      )}

      {/* Doctor Modal */}
      <Modal
        open={!!doctorModal}
        onClose={() => setDoctorModal(null)}
        title={doctorModal?.data ? 'Edit Doctor' : 'Add Doctor'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDoctorModal(null)}>Cancel</Button>
            <Button onClick={dForm.handleSubmit(saveDoctor)} disabled={dForm.formState.isSubmitting}>Save</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input label="Name *" error={dForm.formState.errors.name?.message} {...dForm.register('name')} />
          <Input label="Specialization *" error={dForm.formState.errors.specialization?.message} {...dForm.register('specialization')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" {...dForm.register('phone')} />
            <Input label="Email" type="email" {...dForm.register('email')} />
          </div>
          <Input label="Available Days" placeholder="Mon,Tue,Wed" {...dForm.register('available_days')} />
        </form>
      </Modal>

      {/* Patient Modal */}
      <Modal
        open={!!patientModal}
        onClose={() => setPatientModal(null)}
        title={patientModal?.data ? 'Edit Patient' : 'Add Patient'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPatientModal(null)}>Cancel</Button>
            <Button onClick={pForm.handleSubmit(savePatient)} disabled={pForm.formState.isSubmitting}>Save</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input label="Name *" error={pForm.formState.errors.name?.message} {...pForm.register('name')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Age" type="number" {...pForm.register('age')} />
            <Select label="Gender" {...pForm.register('gender')}>
              <option value="">Select</option>
              <option>Male</option><option>Female</option><option>Other</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" {...pForm.register('phone')} />
            <Input label="Email" type="email" error={pForm.formState.errors.email?.message} {...pForm.register('email')} />
          </div>
          <Textarea label="Address" {...pForm.register('address')} />
        </form>
      </Modal>

      {/* Appointment Modal */}
      <Modal
        open={!!apptModal}
        onClose={() => setApptModal(null)}
        title={apptModal?.data ? 'Edit Appointment' : 'Add Appointment'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setApptModal(null)}>Cancel</Button>
            <Button onClick={aForm.handleSubmit(saveAppt)} disabled={aForm.formState.isSubmitting}>Save</Button>
          </>
        }
      >
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Patient ID *" type="number" error={aForm.formState.errors.patient_id?.message} {...aForm.register('patient_id')} />
            <Input label="Doctor ID *" type="number" error={aForm.formState.errors.doctor_id?.message} {...aForm.register('doctor_id')} />
          </div>
          <Input label="Date *" type="date" error={aForm.formState.errors.appointment_date?.message} style={{ colorScheme: 'dark' }} {...aForm.register('appointment_date')} />
          <Select label="Status" {...aForm.register('status')}>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </Select>
          <Textarea label="Notes" {...aForm.register('notes')} />
        </form>
      </Modal>
    </div>
  )
}
