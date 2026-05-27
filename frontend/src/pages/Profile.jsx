import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'
import { useTheme } from '../context/ThemeContext'

const API_URL = import.meta.env.VITE_API_URL

function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [saving, setSaving] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const { dark, toggleDark } = useTheme()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Token ${token}`
      fetchProfile()
    }
  }, [])

  const fetchProfile = () => {
    axios.get(`${API_URL}/auth/users/me/`)
      .then(res => {
        setUser(res.data)
        setEmail(res.data.email || '')
        setFirstName(res.data.first_name || '')
        setLastName(res.data.last_name || '')
      })
      .catch(() => toast('Nem sikerült betölteni a profilt.', 'error'))
      .finally(() => setLoading(false))
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await axios.patch(`${API_URL}/auth/users/me/`, {
        email,
        first_name: firstName,
        last_name: lastName
      })
      toast('Profil frissítve!', 'success')
    } catch (err) {
      const data = err.response?.data
      const msg = data ? Object.values(data).flat().join(' ') : 'Hiba a mentéskor.'
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword !== newPasswordConfirm) {
      toast('A két jelszó nem egyezik!', 'error')
      return
    }
    setChangingPassword(true)
    try {
      await axios.post(`${API_URL}/auth/users/set_password/`, {
        current_password: currentPassword,
        new_password: newPassword
      })
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
      toast('Jelszó megváltoztatva!', 'success')
    } catch (err) {
      const data = err.response?.data
      const msg = data ? Object.values(data).flat().join(' ') : 'Hiba a jelszócserénél.'
      toast(msg, 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-400">Betöltés...</div>
  }

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Profil</h2>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 sm:p-6 mb-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Adatok módosítása</h3>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Felhasználónév</label>
            <input
              type="text"
              value={user?.username || ''}
              disabled
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-gray-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Vezetéknév</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Keresztnév</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3.5 rounded-xl text-sm font-semibold active:bg-blue-800 transition-colors disabled:opacity-50"
          >
            {saving ? 'Mentés...' : 'Mentés'}
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 sm:p-6 mb-6">
        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-5">Megjelenés</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${dark ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-amber-100 dark:bg-amber-900/50'}`}>
              {dark ? (
                <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {dark ? 'Sötét mód' : 'Világos mód'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {dark ? 'Kíméli a szemed sötétben' : 'Élénk, tiszta megjelenés'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleDark}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              dark ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                dark ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 sm:p-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Jelszó csere</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Jelenlegi jelszó</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Új jelszó</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Új jelszó megerősítése</label>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={e => setNewPasswordConfirm(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={changingPassword}
            className="w-full sm:w-auto bg-red-600 text-white px-8 py-3.5 rounded-xl text-sm font-semibold active:bg-red-800 transition-colors disabled:opacity-50"
          >
            {changingPassword ? 'Csere...' : 'Jelszó megváltoztatása'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Profile
