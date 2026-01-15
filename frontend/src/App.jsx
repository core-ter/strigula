import { useEffect, useState } from 'react'
import axios from 'axios'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token')) // Van-e elmentett kulcs?
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [data, setData] = useState(null)
  const [friends, setFriends] = useState([]) // Barátok listája
  const [categories, setCategories] = useState([]) // Kategóriák
  const [transactions, setTransactions] = useState([])
  const [error, setError] = useState('')

  // Űrlap state
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [debtor, setDebtor] = useState('') // Ki tartozik nekem?
  const [category, setCategory] = useState('') // Melyik kategória?

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

    // Barátok lekérése (csak ők lehetnek partnerek)
    axios.get('http://127.0.0.1:8000/api/users/friends/')
      .then(res => setFriends(res.data))
      .catch(err => console.error("Nem sikerült a barátok lekérése", err))

    axios.get('http://127.0.0.1:8000/api/transactions/')
      .then(res => setTransactions(res.data))
      .catch(err => console.error("Nem sikerült a tranzakciók lekérése", err))

    axios.get('http://127.0.0.1:8000/api/debt-categories/')
      .then(res => setCategories(res.data))
      .catch(err => console.error("Nem sikerült a kategóriák lekérése", err))
  }

  const handleTransactionSubmit = async (e) => {
    e.preventDefault()
    if (!amount || !debtor) {
      alert("Kérlek add meg az összeget és válassz partnert!")
      return
    }

    try {
      await axios.post('http://127.0.0.1:8000/api/transactions/', {
        amount: amount,
        description: description,
        debtor: debtor,
        category: category || null,
        type: 'expense', // Alapértelmezett típus
        currency: 'HUF'
      })

      // Siker! Frissítjük a listát és ürítjük az űrlapot
      alert("Tranzakció sikeresen rögzítve!")
      setAmount('')
      setDescription('')
      setDebtor('')
      setCategory('')
      fetchProtectedData() // Újratöltés

    } catch (err) {
      console.error(err)
      alert("Hiba történt a mentéskor!")
    }
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

      <hr style={{ margin: '30px 0' }} />

      <h3>Új Tranzakció Rögzítése:</h3>
      <form onSubmit={handleTransactionSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <input
          type="number"
          min="1"
          placeholder="Összeg (Ft)"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{ padding: '8px' }}
          required
        />
        <input
          type="text"
          placeholder="Leírás"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ padding: '8px' }}
        />

        <select value={debtor} onChange={e => setDebtor(e.target.value)} style={{ padding: '8px' }} required>
          <option value="">-- Ki tartozik neked? --</option>
          {friends.map(user => (
            <option key={user.id} value={user.id}>{user.username}</option>
          ))}
        </select>

        <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: '8px' }}>
          <option value="">-- Kategória (Opcionális) --</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <button type="submit" style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '4px' }}>
          Hozzáadás
        </button>
      </form>

      <h3>Tranzakciók (Backendről):</h3>
      {transactions.length > 0 ? (
        <ul>
          {transactions.map(tx => (
            <li key={tx.id}>
              {tx.debtor_name} tartozik {tx.payer_name}-nek: <strong>{tx.amount} {tx.currency}</strong> ({tx.description})
            </li>
          ))}
        </ul>
      ) : (
        <p>Nincs tranzakció.</p>
      )}
    </div>
  )
}

export default App