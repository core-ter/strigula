import { useEffect, useState } from 'react'
import axios from 'axios'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token')) // Van-e elmentett kulcs?
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  // Ha változik a token (pl. beléptünk), állítsuk be az Axios-t
  useEffect(() => {
    if (token) {
      // Minden jövőbeli kéréshez csatolja a tokent
      axios.defaults.headers.common['Authorization'] = `Token ${token}`
      fetchProtectedData()
    }
  }, [token])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    try {
      // 1. Postázzuk a felhasználónevet és jelszót
      const response = await axios.post('http://127.0.0.1:8000/auth/token/login/', {
        username: username,
        password: password
      })

      // 2. Ha sikerült, kimentjük a tokent
      const newToken = response.data.auth_token
      localStorage.setItem('token', newToken) // Böngészőbe mentés
      setToken(newToken) // Állapot frissítése

    } catch (err) {
      console.error(err)
      setError('Hibás felhasználónév vagy jelszó!')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setData(null)
    // Töröljük a fejlécből is
    delete axios.defaults.headers.common['Authorization']
  }

  const fetchProtectedData = () => {
    // Most már van tokenünk, át kell engednie a rendszernek!
    axios.get('http://127.0.0.1:8000/api/users/')
      .then(res => setData(res.data))
      .catch(err => console.error("Nem sikerült az adatlekérés", err))
  }

  // --- MEGJELENÍTÉS ---

  // Ha nincs token, mutasd a Login formot
  if (!token) {
    return (
      <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', fontFamily: 'Arial' }}>
        <h1>Bejelentkezés</h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            placeholder="Felhasználónév"
            value={username}
            onChange={e => setUsername(e.target.value)}
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <input
            type="password"
            placeholder="Jelszó"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ padding: '10px', fontSize: '16px' }}
          />
          <button type="submit" style={{ padding: '10px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
            Belépés
          </button>
        </form>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    )
  }

  // Ha van token, mutasd a titkos adatokat
  return (
    <div style={{ padding: '50px', fontFamily: 'Arial' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Üdv a Titkos Klubban! 🕵️‍♂️</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', cursor: 'pointer' }}>
          Kijelentkezés
        </button>
      </div>

      <h3>Felhasználók listája (Backendről):</h3>
      {data ? (
        <ul>
          {data.map(user => (
            <li key={user.id}>
              <strong>{user.username}</strong> ({user.email})
            </li>
          ))}
        </ul>
      ) : (
        <p>Adatok betöltése...</p>
      )}
    </div>
  )
}

export default App