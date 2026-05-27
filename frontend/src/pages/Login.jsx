import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

function Login({ setToken }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const response = await axios.post(`${API_URL}/auth/token/login/`, {
        username: username,
        password: password
      })
      const newToken = response.data.auth_token
      localStorage.setItem('token', newToken)
      axios.defaults.headers.common['Authorization'] = `Token ${newToken}`
      setToken(newToken)
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      setError('Hibás felhasználónév vagy jelszó!')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Strigula Bejelentkezés</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Felhasználónév"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Jelszó"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold transition-colors">
            Belépés
          </button>
        </form>
        {error && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
        <p className="text-center text-sm text-gray-500 mt-4">
          Nincs még fiókod? <Link to="/register" className="text-blue-600 hover:underline">Regisztrálj itt</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
