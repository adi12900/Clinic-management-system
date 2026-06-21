import { Link } from 'react-router-dom'
import { ShieldCheck, Calendar, FileText, Lock, Bell, UserPlus, ArrowRight, Hospital } from 'lucide-react'

const features = [
  { icon: UserPlus, label: 'Patient Registration', desc: 'Register new patients with complete medical profiles and history.', color: 'text-teal-400 bg-teal-500/10' },
  { icon: Hospital, label: 'Doctor Scheduling', desc: 'Manage doctor availability and schedule efficiently.', color: 'text-emerald-400 bg-emerald-500/10' },
  { icon: Calendar, label: 'Appointment Management', desc: 'Book, reschedule, and track appointments with ease.', color: 'text-amber-400 bg-amber-500/10' },
  { icon: FileText, label: 'Medical Records', desc: 'Store and retrieve patient records and prescriptions securely.', color: 'text-sky-400 bg-sky-500/10' },
  { icon: Lock, label: 'Secure Login (JWT)', desc: 'Role-based authentication with JWT for staff and patients.', color: 'text-red-400 bg-red-500/10' },
  { icon: Bell, label: 'Appointment Reminders', desc: 'Automated notifications to keep patients and staff on schedule.', color: 'text-violet-400 bg-violet-500/10' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white font-body">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0A0F1E]/80 backdrop-blur-xl border-b border-white/6">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-bold text-slate-900 text-sm">+</div>
            <span className="text-lg font-extrabold">ClinicCare</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/patient/login" className="text-sm px-4 py-2 border border-white/10 rounded-xl text-slate-300 hover:border-teal-500/50 hover:text-white transition-all">
              Patient Portal
            </Link>
            <Link to="/login" className="text-sm px-4 py-2 bg-teal-600 rounded-xl font-semibold hover:bg-teal-700 transition-colors">
              Doctor Portal
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 px-3 py-1.5 rounded-full mb-6">
            <ShieldCheck size={13} /> Trusted Healthcare Platform
          </span>
          <h1 className="text-5xl font-extrabold leading-tight mb-5">
            Smart Clinic <span className="text-teal-400">Appointment</span> Management
          </h1>
          <p className="text-slate-400 text-lg mb-8 leading-relaxed">
            Manage patients, appointments, and medical records efficiently — all in one secure, modern platform.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/login" className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-500/20">
              Get Started <ArrowRight size={16} />
            </Link>
            <a href="#features" className="flex items-center gap-2 border border-white/10 text-slate-300 px-6 py-3 rounded-xl font-semibold hover:border-white/20 hover:text-white transition-all">
              Learn More
            </a>
          </div>
          <div className="flex gap-8 mt-12">
            {[['120+', 'Doctors'], ['5K+', 'Patients'], ['98%', 'Satisfaction']].map(([n, l]) => (
              <div key={l} className="text-center">
                <div className="text-3xl font-extrabold text-teal-400">{n}</div>
                <div className="text-xs text-slate-500 mt-1">{l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Decorative */}
        <div className="hidden md:flex justify-center">
          <div className="relative w-72 h-72">
            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
            <div className="absolute inset-8 rounded-full border border-white/[0.03]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Hospital size={80} className="text-teal-500/30" />
            </div>
            {[['top-4 left-8', '✅ Appointment Booked'], ['bottom-12 right-2', '👨‍⚕️ Dr. available'], ['bottom-4 left-4', '📋 Records Updated']].map(([pos, text]) => (
              <div key={text} className={`absolute ${pos} bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-medium backdrop-blur-sm`}>
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white/[0.02] py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 px-3 py-1 rounded-full">Features</span>
            <h2 className="text-3xl font-extrabold mt-4 mb-2">Everything Your Clinic Needs</h2>
            <p className="text-slate-400">Comprehensive tools to streamline clinic operations</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="bg-white/[0.03] border border-white/6 rounded-2xl p-6 hover:border-teal-500/20 transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-bold mb-2">{label}</h3>
                <p className="text-slate-400 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="flex justify-center">
            <Hospital size={120} className="text-teal-500/20" />
          </div>
          <div>
            <span className="text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/20 px-3 py-1 rounded-full">About Us</span>
            <h2 className="text-3xl font-extrabold mt-4 mb-4">Built for Modern Healthcare</h2>
            <p className="text-slate-400 mb-5">ClinicCare is a full-featured appointment management system designed to reduce administrative burden, improve patient flow, and deliver better care outcomes.</p>
            <ul className="space-y-2.5">
              {['HIPAA-ready data handling', 'Real-time appointment tracking', 'Role-based access control', 'Responsive across all devices'].map(p => (
                <li key={p} className="flex items-center gap-2.5 text-slate-300 text-sm">
                  <span className="text-teal-400">✓</span> {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-white/[0.02] py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold mb-12">Get In Touch</h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {[['📍', 'Address', '123 Medical Plaza, Healthcare City'], ['📞', 'Phone', '+1 (800) 123-4567'], ['✉️', 'Email', 'support@cliniccare.com']].map(([icon, title, val]) => (
              <div key={title} className="bg-white/[0.03] border border-white/6 rounded-2xl p-6">
                <div className="text-3xl mb-3">{icon}</div>
                <h4 className="font-bold mb-1">{title}</h4>
                <p className="text-slate-400 text-sm">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/6 py-8 text-center text-slate-500 text-sm">
        © 2024 ClinicCare. All rights reserved.
      </footer>
    </div>
  )
}
