import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== passwordConfirm) {
      setError('A két jelszó nem egyezik!')
      return
    }

    try {
      await axios.post(`${API_URL}/auth/users/`, {
        username: username,
        password: password
      })
      setSuccess('Sikeres regisztráció! Átirányítás a belépéshez...')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      console.error(err)
      const data = err.response?.data
      if (data) {
        const messages = Object.values(data).flat().join(' ')
        setError(messages)
      } else {
        setError('Hiba történt a regisztráció során.')
      }
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Regisztráció</h1>
          <p className="text-green-600 font-medium">{success}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Regisztráció</h1>
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Felhasználónév"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Jelszó"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Jelszó megerősítése"
            value={passwordConfirm}
            onChange={e => setPasswordConfirm(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl font-bold transition-colors">
            Regisztráció
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Már van fiókod? <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Jelentkezz be</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
