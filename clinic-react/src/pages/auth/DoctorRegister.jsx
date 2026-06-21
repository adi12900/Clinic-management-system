import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../../api'
import { Input, Select, Textarea, Button, Alert } from '../../components/ui'

const schema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  dob: z.string().min(1, 'Required'),
  gender: z.string().min(1, 'Required'),
  license_number: z.string().min(1, 'Required'),
  specialization: z.string().min(1, 'Required'),
  experience: z.coerce.number().min(0),
  qualification: z.string().min(1, 'Required'),
  medical_school: z.string().min(1, 'Required'),
  phone: z.string().min(6, 'Required'),
  email: z.string().email('Valid email required'),
  address: z.string().min(1, 'Required'),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

const STEPS = ['Personal', 'Professional', 'Contact', 'Security']
const stepFields = [
  ['first_name', 'last_name', 'dob', 'gender'],
  ['license_number', 'specialization', 'experience', 'qualification', 'medical_school'],
  ['phone', 'email', 'address'],
  ['password', 'confirm'],
]

export default function DoctorRegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [showPwd, setShowPwd] = useState(false)
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, trigger, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  async function nextStep() {
    const valid = await trigger(stepFields[step])
    if (valid) setStep(s => s + 1)
  }

  async function onSubmit(values) {
    setServerError('')
    try {
      await api.registerDoctor(values)
      navigate('/login', { replace: true })
    } catch (e) {
      setServerError(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1c35] to-[#1a3a6c] flex items-start justify-center p-8 font-body">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-center text-white">
          <div className="text-4xl mb-3">👨⚕️</div>
          <h2 className="text-2xl font-bold mb-1">Doctor Registration</h2>
          <p className="text-white/70 text-sm">Create your account to join our medical team</p>
        </div>

        <div className="p-8">
          {/* Step dots */}
          <div className="flex justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className={`h-3 rounded-full transition-all duration-300 ${i <= step ? 'bg-blue-600' : 'bg-slate-200'} ${i === step ? 'w-8' : 'w-3'}`} />
            ))}
          </div>

          {serverError && <Alert message={serverError} type="error" className="mb-4" />}

          <form onSubmit={handleSubmit(onSubmit)} className="[&_input]:text-slate-800 [&_input]:bg-slate-50 [&_input]:border-slate-200 [&_select]:text-slate-800 [&_select]:bg-slate-50 [&_select]:border-slate-200 [&_textarea]:text-slate-800 [&_textarea]:bg-slate-50 [&_textarea]:border-slate-200 [&_label]:text-slate-600 [&_input:focus]:border-blue-500 [&_select:focus]:border-blue-500 [&_textarea:focus]:border-blue-500" noValidate>
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-center mb-5">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name *" placeholder="John" error={errors.first_name?.message} {...register('first_name')} />
                  <Input label="Last Name *" placeholder="Doe" error={errors.last_name?.message} {...register('last_name')} />
                  <Input label="Date of Birth *" type="date" error={errors.dob?.message} {...register('dob')} />
                  <Select label="Gender *" error={errors.gender?.message} {...register('gender')}>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </Select>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-center mb-5">Professional Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="License Number *" placeholder="LIC-123456" error={errors.license_number?.message} {...register('license_number')} />
                  <Select label="Specialization *" error={errors.specialization?.message} {...register('specialization')}>
                    <option value="">Select</option>
                    {['Cardiologist','Dermatologist','General Physician','Neurologist','Orthopedic','Pediatrician','Psychiatrist','Surgeon','Other'].map(s => <option key={s}>{s}</option>)}
                  </Select>
                  <Input label="Years of Experience *" type="number" placeholder="10" error={errors.experience?.message} {...register('experience')} />
                  <Input label="Qualification *" placeholder="MBBS, MD" error={errors.qualification?.message} {...register('qualification')} />
                </div>
                <Input label="Medical School *" placeholder="Harvard Medical School" error={errors.medical_school?.message} {...register('medical_school')} />
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-center mb-5">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Phone *" type="tel" placeholder="+1 234 567 8900" error={errors.phone?.message} {...register('phone')} />
                  <Input label="Email *" type="email" placeholder="doctor@clinic.com" error={errors.email?.message} {...register('email')} />
                </div>
                <Textarea label="Address *" placeholder="123 Medical Plaza, City, State, ZIP" error={errors.address?.message} {...register('address')} />
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-center mb-5">Account Security</h3>
                <div className="relative">
                  <Input label="Password *" type={showPwd ? 'text' : 'password'} placeholder="••••••••" error={errors.password?.message} {...register('password')} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-8 text-slate-400">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <Input label="Confirm Password *" type="password" placeholder="••••••••" error={errors.confirm?.message} {...register('confirm')} />
                <div className="flex items-start gap-2">
                  <input type="checkbox" required className="mt-0.5 accent-blue-600" />
                  <span className="text-xs text-slate-500">I agree to the <a href="#" className="text-blue-600">Terms & Conditions</a> and Privacy Policy. I confirm all information is accurate and I hold a valid medical license.</span>
                </div>
              </div>
            )}

            <div className={`flex mt-8 ${step > 0 ? 'justify-between' : 'justify-end'}`}>
              {step > 0 && (
                <button type="button" onClick={() => setStep(s => s - 1)} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">
                  ← Back
                </button>
              )}
              {step < 3 ? (
                <button type="button" onClick={nextStep} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                  Next →
                </button>
              ) : (
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Registering…' : '✓ Register'}
                </button>
              )}
            </div>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
