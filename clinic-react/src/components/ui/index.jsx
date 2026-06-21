// Button
export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm hover:shadow-teal-500/25 hover:shadow-lg',
    secondary: 'bg-white/5 border border-white/10 text-slate-300 hover:border-white/20 hover:text-white',
    danger: 'bg-red-600/10 border border-red-500/25 text-red-400 hover:bg-red-600/20',
    ghost: 'bg-transparent text-slate-400 hover:text-white hover:bg-white/5',
    outline: 'border border-teal-600 text-teal-600 hover:bg-teal-600 hover:text-white',
  }
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// Badge
const badgeVariants = {
  scheduled: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  completed: 'bg-teal-500/15 text-teal-400 border border-teal-500/30',
  cancelled: 'bg-red-500/12 text-red-400 border border-red-500/25',
  pending: 'bg-violet-500/15 text-violet-400 border border-violet-500/30',
  default: 'bg-slate-500/15 text-slate-400 border border-slate-500/30',
}

export function Badge({ status, children }) {
  const cls = badgeVariants[status] || badgeVariants.default
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {children ?? status}
    </span>
  )
}

// Card
export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white/[0.04] border border-white/8 backdrop-blur-md rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

// Input
export function Input({ label, error, icon: Icon, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</label>}
      <div className="relative">
        {Icon && <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />}
        <input
          className={`w-full bg-white/5 border border-white/8 text-white rounded-xl py-2.5 text-sm
            placeholder:text-slate-600 outline-none transition-all
            focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10
            ${Icon ? 'pl-9 pr-4' : 'px-4'}
            ${error ? 'border-red-500/50' : ''}
            ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// Select
export function Select({ label, error, children, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</label>}
      <select
        className={`w-full bg-white/5 border border-white/8 text-white rounded-xl px-4 py-2.5 text-sm
          outline-none transition-all focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10
          ${error ? 'border-red-500/50' : ''} ${className}`}
        style={{ colorScheme: 'dark' }}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// Textarea
export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</label>}
      <textarea
        className={`w-full bg-white/5 border border-white/8 text-white rounded-xl px-4 py-2.5 text-sm
          placeholder:text-slate-600 outline-none transition-all resize-y min-h-[80px]
          focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/10
          ${error ? 'border-red-500/50' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// Modal
export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0D1426] border border-white/8 rounded-2xl w-full max-w-lg shadow-2xl animate-fadeUp">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
          <h3 className="font-bold text-white text-base">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-white/8 flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  )
}

// Table
export function Table({ columns, data, emptyText = 'No data found.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-5 py-3 text-left text-[11px] font-semibold tracking-widest uppercase text-slate-500">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-slate-500 text-sm">{emptyText}</td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={row.id ?? i} className="border-t border-white/5 hover:bg-teal-500/[0.04] transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-3.5 text-sm text-slate-200">
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

// Avatar
export function Avatar({ name = '', size = 'md' }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-16 h-16 text-xl' }
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center font-bold text-slate-900 shadow-lg shadow-teal-500/20 flex-shrink-0`}>
      {initials}
    </div>
  )
}

// Toast
export function Toast({ message, type = 'success', onDismiss }) {
  if (!message) return null
  const colors = {
    success: 'bg-teal-500/15 border-teal-500/30 text-teal-300',
    error: 'bg-red-500/15 border-red-500/30 text-red-300',
  }
  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-2xl animate-fadeUp ${colors[type]}`}>
      <span>{message}</span>
      <button onClick={onDismiss} className="opacity-60 hover:opacity-100">✕</button>
    </div>
  )
}

// StatCard
export function StatCard({ icon: Icon, label, value, color = 'teal' }) {
  const colors = {
    teal: 'bg-teal-500/15 text-teal-400',
    violet: 'bg-violet-500/15 text-violet-400',
    amber: 'bg-amber-500/15 text-amber-400',
    red: 'bg-red-500/15 text-red-400',
  }
  const textColors = {
    teal: 'text-teal-400', violet: 'text-violet-400', amber: 'text-amber-400', red: 'text-red-400',
  }
  return (
    <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-5 flex items-center gap-4 hover:scale-[1.02] transition-transform">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className={`text-3xl font-extrabold leading-none tracking-tight ${textColors[color]}`}>{value ?? '—'}</div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mt-1">{label}</div>
      </div>
    </div>
  )
}

// Spinner
export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin" />
    </div>
  )
}

// Alert
export function Alert({ message, type = 'error' }) {
  if (!message) return null
  const colors = {
    error: 'bg-red-500/10 border-red-500/25 text-red-400',
    success: 'bg-teal-500/10 border-teal-500/25 text-teal-400',
  }
  return (
    <div className={`px-4 py-3 rounded-xl border text-sm font-medium ${colors[type]}`}>{message}</div>
  )
}
