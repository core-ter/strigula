import { useState, useEffect, useCallback } from 'react'

let listeners = []

export function toast(message, type = 'success') {
  const id = Date.now() + Math.random()
  listeners.forEach(fn => fn({ id, message, type }))
}

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((data) => {
    setToasts(prev => [...prev, data])
  }, [])

  useEffect(() => {
    listeners.push(addToast)
    return () => { listeners = listeners.filter(fn => fn !== addToast) }
  }, [addToast])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return { toasts, removeToast }
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  useEffect(() => {
    if (toasts.length > 0) {
      const latest = toasts[toasts.length - 1]
      const timer = setTimeout(() => removeToast(latest.id), 3500)
      return () => clearTimeout(timer)
    }
  }, [toasts, removeToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          className={`pointer-events-auto px-5 py-3.5 rounded-2xl shadow-lg text-sm font-semibold cursor-pointer transition-all animate-slide-in ${
            t.type === 'success'
              ? 'bg-green-600 text-white'
              : t.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          {t.type === 'success' && (
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {t.message}
            </span>
          )}
          {t.type === 'error' && (
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {t.message}
            </span>
          )}
          {t.type === 'info' && (
            <span className="inline-flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t.message}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
