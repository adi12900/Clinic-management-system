import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '../../api'
import { Input, Select, Textarea, Button, Alert } from '../../components/ui'

const schema = z.object({
  name: z.string().min(2, 'Full name is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  phone: z.string().min(6, 'Phone is required'),
  email: z.string().email('Enter a valid email'),
  address: z.string().optional(),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })

const STEPS = ['Personal Info', 'Contact Info', 'Account Security']

export default function PatientRegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [showPwd, setShowPwd] = useState(false)
  const [serverError, setServerError] = useState('')
  const [serverSuccess, setServerSuccess] = useState('')

  const { register, handleSubmit, trigger, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const stepFields = [['name', 'dob', 'gender'], ['phone', 'email'], ['password', 'confirm']]

  async function nextStep() {
    const valid = await trigger(stepFields[step])
    if (valid) setStep(s => s + 1)
  }

  async function onSubmit(values) {
    setServerError('')
    try {
      await api.registerPatient({
        name: values.name, dob: values.dob, gender: values.gender,
        phone: values.phone, email: values.email, address: values.address,
        password: values.password,
      })
      setServerSuccess('Registration successful! Redirecting to login…')
      setTimeout(() => navigate('/patient/login'), 1800)
    } catch (e) {
      setServerError(e.message)
    }
  }

  const pwd = watch('password', '')
  const strength = [pwd.length >= 8, /[a-z]/.test(pwd), /[A-Z]/.test(pwd), /[0-9]/.test(pwd)].filter(Boolean).length
  const strengthColors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-teal-500']

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-start justify-center p-8 font-body">
      <div className="w-full max-w-xl bg-[#0D1426] border border-white/8 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-br from-teal-500 via-teal-700 to-[#0A0F1E] p-8 text-center text-white">
          <div className="text-3xl mb-3">👤</div>
          <h2 className="text-xl font-bold mb-1">Patient Registration</h2>
          <p className="text-sm text-white/65">Create your account to book appointments</p>
        </div>

        <div className="p-8">
          {/* Step dots */}
          <div className="flex justify-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-2.5 rounded-full transition-all duration-300 ${i <= step ? 'bg-teal-400' : 'bg-white/8'} ${i === step ? 'w-7' : 'w-2.5'}`}
              />
            ))}
          </div>

          {serverError && <Alert message={serverError} type="error" className="mb-4" />}
          {serverSuccess && <Alert message={serverSuccess} type="success" className="mb-4" />}

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Step 0 */}
            {step === 0 && (
              <div className="space-y-4">
                <p className="text-center font-bold mb-5">Personal Information</p>
                <Input label="Full Name *" placeholder="John Doe" error={errors.name?.message} {...register('name')} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Date of Birth *" type="date" error={errors.dob?.message} style={{ colorScheme: 'dark' }} {...register('dob')} />
                  <Select label="Gender *" error={errors.gender?.message} {...register('gender')}>
                    <option value="">Select Gender</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </Select>
                </div>
                <div className="flex justify-end mt-6">
                  <Button type="button" onClick={nextStep}>Next →</Button>
                </div>
              </div>
            )}

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <p className="text-center font-bold mb-5">Contact Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Phone *" type="tel" placeholder="+1 234 567 8900" error={errors.phone?.message} {...register('phone')} />
                  <Input label="Email *" type="email" placeholder="john@example.com" error={errors.email?.message} {...register('email')} />
                </div>
                <Textarea label="Address" placeholder="123 Main Street, City, State" {...register('address')} />
                <div className="flex justify-between mt-6">
                  <Button type="button" variant="secondary" onClick={() => setStep(0)}>← Back</Button>
                  <Button type="button" onClick={nextStep}>Next →</Button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-center font-bold mb-5">Account Security</p>
                <div className="relative">
                  <Input label="Password *" type={showPwd ? 'text' : 'password'} placeholder="••••••••" error={errors.password?.message} {...register('password')} />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-8 text-slate-500 hover:text-slate-300">
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <div className="h-1.5 bg-white/8 rounded mt-2 overflow-hidden">
                    <div className={`h-full rounded transition-all duration-300 ${strengthColors[strength - 1] || 'bg-white/8'}`} style={{ width: `${(strength / 4) * 100}%` }} />
                  </div>
                </div>
                <Input label="Confirm Password *" type="password" placeholder="••••••••" error={errors.confirm?.message} {...register('confirm')} />
                <div className="flex items-start gap-2 mt-2">
                  <input type="checkbox" required className="mt-0.5 accent-teal-500" />
                  <span className="text-xs text-slate-400">I agree to the <a href="#" className="text-teal-400">Terms & Conditions</a></span>
                </div>
                <div className="flex justify-between mt-6">
                  <Button type="button" variant="secondary" onClick={() => setStep(1)}>← Back</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Registering…' : '✓ Register'}
                  </Button>
                </div>
              </div>
            )}
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/patient/login" className="text-teal-400 font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
