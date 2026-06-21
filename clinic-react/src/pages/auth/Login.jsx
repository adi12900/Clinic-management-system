import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { api } from '../../api'
import { Input, Button, Alert } from '../../components/ui'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  async function onSubmit({ email, password }) {
    setServerError('')
    try {
      const data = await api.login({ email, password, expected_role: 'doctor' })
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('role', data.role)
      localStorage.setItem('email', email)
      navigate('/doctor/dashboard', { replace: true })
    } catch (e) {
      setServerError(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f1c35] to-[#1a3a6c] flex items-center justify-center p-6 font-body">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden grid md:grid-cols-5">
        {/* Left panel */}
        <div className="md:col-span-2 bg-gradient-to-b from-[#0f1c35] to-[#1a3a6c] p-10 text-white flex flex-col justify-center">
          <div className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center font-bold text-slate-900">+</div>
            <span className="text-xl font-extrabold">ClinicCare</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Doctor Portal</h2>
          <p className="text-slate-400 text-sm mb-8">Sign in to access your dashboard and manage patient appointments securely.</p>
          <ul className="space-y-3 text-sm text-slate-400">
            {['JWT Secured Authentication', 'Role-based Access Control', 'Session timeout protection'].map(t => (
              <li key={t} className="flex items-center gap-2.5">🔒 {t}</li>
            ))}
          </ul>
        </div>

        {/* Right panel */}
        <div className="md:col-span-3 p-10">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Doctor Sign In</h2>
          <p className="text-slate-500 text-sm mb-7">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Alert message={serverError} type="error" />
            <div className="[&_input]:text-slate-800 [&_input]:bg-slate-50 [&_input]:border-slate-200 [&_label]:text-slate-500 [&_input:focus]:border-teal-500 [&_input:focus]:ring-teal-500/10 space-y-5">
              <Input
                label="Email Address"
                type="email"
                placeholder="doctor@clinic.com"
                icon={Mail}
                error={errors.email?.message}
                {...register('email')}
              />
              <div>
                <div className="relative [&_input]:text-slate-800 [&_input]:bg-slate-50 [&_input]:border-slate-200">
                  <Input
                    label="Password"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    icon={Lock}
                    error={errors.password?.message}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <p className="text-center text-slate-500 text-sm">Don't have an account?</p>
            <Link to="/register" className="flex items-center justify-center gap-2 w-full py-2.5 border border-teal-600 text-teal-600 rounded-xl text-sm font-semibold hover:bg-teal-600 hover:text-white transition-all">
              Register as Doctor
            </Link>
            <Link to="/" className="flex justify-center text-sm text-slate-400 hover:text-slate-600 mt-2">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
