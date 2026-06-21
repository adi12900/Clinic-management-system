import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks'
import {
  LayoutDashboard, CalendarPlus, CalendarCheck, FileText, User,
  LogOut, Users, UserCog, Stethoscope, Menu, X, Plus, ShieldCheck,
} from 'lucide-react'

const patientLinks = [
  { to: '/patient/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/patient/book', icon: CalendarPlus, label: 'Book Appointment' },
  { to: '/patient/appointments', icon: CalendarCheck, label: 'My Appointments' },
  { to: '/patient/records', icon: FileText, label: 'Medical Records' },
  { to: '/patient/profile', icon: User, label: 'My Profile' },
]

const doctorLinks = [
  { to: '/doctor/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/doctor/appointments', icon: CalendarCheck, label: 'My Appointments' },
  { to: '/doctor/patients', icon: Users, label: 'My Patients' },
  { to: '/doctor/profile', icon: UserCog, label: 'My Profile' },
]

const adminLinks = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/doctors', icon: Stethoscope, label: 'Doctors' },
  { to: '/admin/patients', icon: Users, label: 'Patients' },
  { to: '/admin/appointments', icon: CalendarCheck, label: 'Appointments' },
]

function NavLinks({ links }) {
  return (
    <ul className="list-none flex-1">
      <li className="text-[10px] font-semibold tracking-widest text-slate-600 px-4 pt-5 pb-1.5 uppercase">Main Menu</li>
      {links.map(({ to, icon: Icon, label }) => (
        <li key={to}>
          <NavLink
            to={to}
            className={({ isActive }) => `sidebar-link mx-3 my-0.5 ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} className="flex-shrink-0" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

export default function AppLayout({ children }) {
  const { role, email, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const links = role === 'patient' ? patientLinks : role === 'doctor' ? doctorLinks : adminLinks
  const initials = email?.slice(0, 2).toUpperCase() || '??'

  return (
    <div className="flex min-h-screen bg-[#0A0F1E] text-white font-body">
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-60 bg-[#0D1426] border-r border-white/6 flex flex-col z-50 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-7">
          <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/40">
            <Plus size={18} className="text-slate-900" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">ClinicCare</span>
        </div>

        <NavLinks links={links} />

        {/* Account section */}
        <div className="mt-auto px-3 pb-4">
          <p className="text-[10px] font-semibold tracking-widest text-slate-600 px-1 pb-1.5 uppercase">Account</p>
          <button
            onClick={logout}
            className="sidebar-link w-full text-red-400/70 hover:text-red-400 hover:bg-red-500/8 mx-0"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-60">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b border-white/6 bg-[#0A0F1E]/80 backdrop-blur-xl">
          <button className="lg:hidden p-1.5 text-slate-400 hover:text-white" onClick={() => setOpen(v => !v)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-xs font-bold text-slate-900 shadow-md shadow-teal-500/20">
              {initials}
            </div>
            <span className="text-sm text-slate-400 hidden sm:block">{email}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-9">{children}</main>
      </div>
    </div>
  )
}
