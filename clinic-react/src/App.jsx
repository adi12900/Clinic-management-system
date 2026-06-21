import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, GuestRoute } from './components/layout/ProtectedRoute'

import LandingPage from './pages/Landing'
import LoginPage from './pages/auth/Login'
import PatientLoginPage from './pages/auth/PatientLogin'
import PatientRegisterPage from './pages/auth/PatientRegister'
import DoctorRegisterPage from './pages/auth/DoctorRegister'

import PatientDashboard from './pages/patient/PatientDashboard'
import PatientAppointments from './pages/patient/PatientAppointments'
import BookAppointment from './pages/patient/BookAppointment'
import MedicalRecords from './pages/patient/MedicalRecords'
import PatientProfile from './pages/patient/PatientProfile'

import DoctorDashboard from './pages/doctor/DoctorDashboard'

import AdminDashboard from './pages/admin/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><DoctorRegisterPage /></GuestRoute>} />
        <Route path="/patient/login" element={<GuestRoute><PatientLoginPage /></GuestRoute>} />
        <Route path="/patient/register" element={<GuestRoute><PatientRegisterPage /></GuestRoute>} />

        {/* Patient portal */}
        <Route path="/patient/dashboard" element={<ProtectedRoute allowedRole="patient"><PatientDashboard /></ProtectedRoute>} />
        <Route path="/patient/appointments" element={<ProtectedRoute allowedRole="patient"><PatientAppointments /></ProtectedRoute>} />
        <Route path="/patient/book" element={<ProtectedRoute allowedRole="patient"><BookAppointment /></ProtectedRoute>} />
        <Route path="/patient/records" element={<ProtectedRoute allowedRole="patient"><MedicalRecords /></ProtectedRoute>} />
        <Route path="/patient/profile" element={<ProtectedRoute allowedRole="patient"><PatientProfile /></ProtectedRoute>} />

        {/* Doctor portal */}
        <Route path="/doctor/dashboard" element={<ProtectedRoute allowedRole="doctor"><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/doctor/appointments" element={<ProtectedRoute allowedRole="doctor"><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/doctor/patients" element={<ProtectedRoute allowedRole="doctor"><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/doctor/profile" element={<ProtectedRoute allowedRole="doctor"><DoctorDashboard /></ProtectedRoute>} />

        {/* Admin portal */}
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/doctors" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/patients" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/appointments" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
