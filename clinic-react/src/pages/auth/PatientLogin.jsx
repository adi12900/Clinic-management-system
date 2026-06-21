import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react'
import { api } from '../../api'
import { Input, Button, Alert } from '../../components/ui'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export default function PatientLoginPage() {
  const navigate = useNavigate()
  const [showPwd, setShowPwd] = useState(false)
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  async function onSubmit({ email, password }) {
    setServerError('')
    try {
      const data = await api.login({ email, password, expected_role: 'patient' })
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('role', data.role)
      localStorage.setItem('email', email)
      navigate('/patient/dashboard', { replace: true })
    } catch (e) {
      setServerError(e.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0F1E] flex items-center justify-center p-6 font-body">
      <div className="w-full max-w-sm bg-[#0D1426] border border-white/8 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-teal-500 via-teal-700 to-[#0A0F1E] p-8 text-center text-white">
          <div className="w-16 h-16 bg-white/20 border-2 border-white/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={28} />
          </div>
          <h2 className="text-xl font-bold mb-1">Patient Portal</h2>
          <p className="text-sm text-white/65">Access your appointments and medical records</p>
        </div>

        <div className="p-7 space-y-5">
          <Alert message={serverError} type="error" />
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Email Address"
              type="email"
              placeholder="patient@example.com"
              icon={Mail}
              error={errors.email?.message}
              {...register('email')}
            />
            <div className="relative">
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
                className="absolute right-3 top-8 text-slate-500 hover:text-slate-300"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <div className="relative my-4 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" /><span className="text-xs text-slate-500">OR</span><div className="flex-1 h-px bg-white/8" />
          </div>

          <Link to="/patient/register" className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/5 border border-white/8 text-slate-300 rounded-xl text-sm font-semibold hover:border-teal-500/40 hover:text-white transition-all">
            Register as New Patient
          </Link>

          <div className="flex justify-center gap-6 mt-2 text-xs text-slate-500">
            <Link to="/login" className="hover:text-teal-400 transition-colors">👨‍⚕️ Doctor Portal</Link>
            <Link to="/" className="hover:text-teal-400 transition-colors">🏠 Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
