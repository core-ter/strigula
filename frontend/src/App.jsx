import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  /* eslint-disable no-unused-vars */
  const [data, setData] = useState(null)
  /* eslint-enable no-unused-vars */
  const [currentUser, setCurrentUser] = useState(null)
  const [friends, setFriends] = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [error, setError] = useState('')

  // Űrlap state
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [debtor, setDebtor] = useState('')
  const [category, setCategory] = useState('')

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Token ${token}`
      fetchProtectedData()
    }
  }, [token])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const response = await axios.post('http://127.0.0.1:8000/auth/token/login/', {
        username: username,
        password: password
      })
      const newToken = response.data.auth_token
      localStorage.setItem('token', newToken)
      setToken(newToken)
    } catch (err) {
      console.error(err)
      setError('Hibás felhasználónév vagy jelszó!')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setData(null)
    delete axios.defaults.headers.common['Authorization']
  }

  const fetchProtectedData = () => {
    axios.get('http://127.0.0.1:8000/api/users/')
      .then(res => setData(res.data))
      .catch(err => console.error("Nem sikerült az adatlekérés", err))

    axios.get('http://127.0.0.1:8000/auth/users/me/')
      .then(res => setCurrentUser(res.data))
      .catch(err => console.error("Nem sikerült a user lekérése", err))

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

  const balances = useMemo(() => {
    if (!currentUser) return {}
    const bal = {}
    transactions.forEach(tx => {
      if (tx.payer === currentUser.id) {
        const partnerName = tx.debtor_name
        bal[partnerName] = (bal[partnerName] || 0) + parseFloat(tx.amount)
      } else if (tx.debtor === currentUser.id) {
        const partnerName = tx.payer_name
        bal[partnerName] = (bal[partnerName] || 0) - parseFloat(tx.amount)
      }
    })
    return bal
  }, [transactions, currentUser])

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
        type: 'expense',
        currency: 'HUF'
      })
      alert("Tranzakció sikeresen rögzítve!")
      setAmount('')
      setDescription('')
      setDebtor('')
      setCategory('')
      fetchProtectedData()
    } catch (err) {
      console.error(err)
      alert("Hiba történt a mentéskor!")
    }
  }

  if (!token) {
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
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto p-4 min-h-screen">
      {/* Fejléc */}
      <div className="flex justify-between items-center mb-8 pt-4">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Strigula</h1>
        <button
          onClick={handleLogout}
          className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Kilépés
        </button>
      </div>

      {/* Egyenleg Kártya */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-100">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Egyenlegek</h2>
        {Object.keys(balances).length > 0 ? (
          <ul className="space-y-3">
            {Object.entries(balances).map(([partner, amount]) => (
              <li key={partner} className="flex justify-between items-center text-lg">
                <span className="text-gray-600">{partner}</span>
                <span className={`font-bold ${amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {amount >= 0 ? `+${amount} Ft` : `-${Math.abs(amount)} Ft`}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400 text-center italic">Nincs rögzített egyenleg.</p>
        )}
      </div>

      {/* Új Tranzakció Űrlap */}
      <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-700 mb-4">Új felírása</h3>
        <form onSubmit={handleTransactionSubmit}>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Összeg</label>
            <input
              type="number"
              min="1"
              placeholder="0 Ft"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900"
              required
            />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Kinek fizettél?</label>
            <select
              value={debtor}
              onChange={e => setDebtor(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Ki tartozik neked? --</option>
              {friends.map(user => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-1 ml-1">Mire?</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>-- Válassz kategóriát --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Megjegyzés (opcionális)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold transition-colors shadow-lg shadow-blue-200">
            Hozzáadás
          </button>
        </form>
      </div>

      {/* Tranzakció Lista */}
      <h3 className="text-xl font-bold text-gray-800 mb-4 px-1">Előzmények</h3>
      {transactions.length > 0 ? (
        <ul className="space-y-3 pb-8">
          {transactions.map(tx => {
            // Is it incoming (positive) or outgoing (negative) from logic perspective?
            // Actually description says: "debtor owes payer". 
            // If current user is Payer, it's money COMING BACK eventually (Positive asset).
            // If current user is Debtor, it's money OWED (Negative liability).
            const isCredit = tx.payer === currentUser?.id;

            return (
              <li key={tx.id} className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 ${isCredit ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">
                      {isCredit ? tx.debtor_name : tx.payer_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {tx.description || 'Nincs megjegyzés'}
                    </p>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md mt-1 inline-block">
                      {categories.find(c => c.id === tx.category)?.name || 'Egyéb'}
                    </span>
                  </div>
                  <div className={`text-right font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                    {isCredit ? '+' : '-'}{parseFloat(tx.amount).toLocaleString()} Ft
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-center text-gray-400 mt-8">Nincs még tranzakció.</p>
      )}
    </div>
  )
}

export default App