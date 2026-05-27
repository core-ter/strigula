import { useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from '../components/Toast'

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
      <h2 className="text-xl font-bold text-gray-800 mb-6">Profil</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Adatok módosítása</h3>
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Felhasználónév</label>
            <input
              type="text"
              value={user?.username || ''}
              disabled
              className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Vezetéknév</label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Keresztnév</label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Jelszó csere</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Jelenlegi jelszó</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Új jelszó</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Új jelszó megerősítése</label>
            <input
              type="password"
              value={newPasswordConfirm}
              onChange={e => setNewPasswordConfirm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
