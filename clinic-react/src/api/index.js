const BASE = import.meta.env.VITE_API_URL || 'https://clinic-management-api.onrender.com'

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  })
  if (res.status === 401) {
    localStorage.clear()
    window.location.href = '/login'
    return
  }
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Request failed')
  return data
}

export const api = {
  // Auth
  login: (body) => request('/login', { method: 'POST', body: JSON.stringify(body) }),
  registerPatient: (body) => request('/patient/register', { method: 'POST', body: JSON.stringify(body) }),
  registerDoctor: (body) => request('/doctor/register', { method: 'POST', body: JSON.stringify(body) }),

  // Dashboard
  dashboard: () => request('/dashboard'),

  // Doctors
  getDoctors: () => request('/doctors'),
  getDoctor: (id) => request(`/doctors/${id}`),
  createDoctor: (body) => request('/doctors', { method: 'POST', body: JSON.stringify(body) }),
  updateDoctor: (id, body) => request(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDoctor: (id) => request(`/doctors/${id}`, { method: 'DELETE' }),

  // Patients
  getPatients: () => request('/patients'),
  getPatient: (id) => request(`/patients/${id}`),
  createPatient: (body) => request('/patients', { method: 'POST', body: JSON.stringify(body) }),
  updatePatient: (id, body) => request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePatient: (id) => request(`/patients/${id}`, { method: 'DELETE' }),

  // Appointments
  getAppointments: () => request('/appointments'),
  getAppointment: (id) => request(`/appointments/${id}`),
  createAppointment: (body) => request('/appointments', { method: 'POST', body: JSON.stringify(body) }),
  updateAppointment: (id, body) => request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAppointment: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),
  updateAppointmentStatus: (id, action) =>
    request(`/appointments/${id}/status`, { method: 'PATCH', body: JSON.stringify({ action }) }),
}
