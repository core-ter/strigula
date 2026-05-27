import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

function FriendDetail() {
  const { id: friendId } = useParams()
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [friend, setFriend] = useState(null)
  const [friendships, setFriendships] = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [openCategories, setOpenCategories] = useState({})

  // New category form
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [catName, setCatName] = useState('')

  // Transaction form per category
  const [txAmounts, setTxAmounts] = useState({})
  const [txDescriptions, setTxDescriptions] = useState({})

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Token ${token}`
      fetchData()
    }
  }, [friendId])

  const fetchData = () => {
    axios.get(`${API_URL}/auth/users/me/`)
      .then(res => setCurrentUser(res.data))
      .catch(err => console.error(err))

    axios.get(`${API_URL}/api/users/friends/`)
      .then(res => {
        const found = res.data.find(u => u.id === parseInt(friendId))
        setFriend(found || null)
      })
      .catch(err => console.error(err))

    axios.get(`${API_URL}/api/friendships/`)
      .then(res => setFriendships(res.data.results))
      .catch(err => console.error(err))

    axios.get(`${API_URL}/api/debt-categories/`)
      .then(res => setCategories(res.data.results))
      .catch(err => console.error(err))

    axios.get(`${API_URL}/api/transactions/`)
      .then(res => setTransactions(res.data.results))
      .catch(err => console.error(err))
  }

  const friendshipId = useMemo(() => {
    if (!currentUser) return null
    const fs = friendships.find(
      f => (f.user1?.id === currentUser.id && f.user2?.id === parseInt(friendId)) ||
           (f.user2?.id === currentUser.id && f.user1?.id === parseInt(friendId))
    )
    return fs?.id || null
  }, [friendships, currentUser, friendId])

  const filteredCategories = useMemo(() => {
    if (!friendshipId) return []
    return categories.filter(c => c.friendship === friendshipId)
  }, [categories, friendshipId])

  const filteredTransactions = useMemo(() => {
    const fid = parseInt(friendId)
    return transactions.filter(
      tx => (tx.payer === currentUser?.id && tx.debtor === fid) ||
            (tx.debtor === currentUser?.id && tx.payer === fid)
    )
  }, [transactions, currentUser, friendId])

  const balance = useMemo(() => {
    let bal = 0
    filteredTransactions.forEach(tx => {
      if (tx.payer === currentUser?.id) {
        bal += parseFloat(tx.amount)
      } else {
        bal -= parseFloat(tx.amount)
      }
    })
    return bal
  }, [filteredTransactions, currentUser])

  const toggleCategory = (catId) => {
    setOpenCategories(prev => ({ ...prev, [catId]: !prev[catId] }))
  }

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    if (!catName || !friendshipId) return
    try {
      await axios.post(`${API_URL}/api/debt-categories/`, {
        name: catName,
        friendship: friendshipId,
        description: ''
      })
      setCatName('')
      setShowCategoryForm(false)
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Hiba a kategória létrehozásakor!')
    }
  }

  const handleCreateTransaction = async (e, categoryId) => {
    e.preventDefault()
    const amount = txAmounts[categoryId] || ''
    const description = txDescriptions[categoryId] || ''
    if (!amount) {
      alert('Add meg az összeget!')
      return
    }
    try {
      await axios.post(`${API_URL}/api/transactions/`, {
        amount: amount,
        debtor: parseInt(friendId),
        category: categoryId,
        type: 'expense',
        currency: 'HUF',
        description: description
      })
      setTxAmounts(prev => ({ ...prev, [categoryId]: '' }))
      setTxDescriptions(prev => ({ ...prev, [categoryId]: '' }))
      fetchData()
    } catch (err) {
      console.error(err)
      alert('Hiba a tranzakció létrehozásakor!')
    }
  }

  const getTransactionsForCategory = (catId) => {
    return filteredTransactions.filter(tx => tx.category === catId)
  }

  if (!friend) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Barát betöltése...</p>
      </div>
    )
  }

  const totalTxCount = filteredTransactions.length
  const absBalance = Math.abs(balance)
  const maxBal = Math.max(absBalance, 1000) // minimum bar width for visual

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-4 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Vissza a barátokhoz
      </button>

      {/* Friend Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0">
            {friend.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">{friend.username}</h1>
            <p className="text-sm text-gray-400">{totalTxCount} tranzakció</p>
          </div>
        </div>

        {/* Visual Balance Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className={balance >= 0 ? 'text-green-600' : 'text-gray-400'}>
              Tartozik neked
            </span>
            <span className={balance < 0 ? 'text-red-500' : 'text-gray-400'}>
              Tartozol neki
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
            {balance > 0 && (
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min((balance / maxBal) * 100, 100)}%`, marginLeft: 'auto' }}
              />
            )}
            {balance < 0 && (
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${Math.min((absBalance / maxBal) * 100, 100)}%` }}
              />
            )}
            {balance === 0 && (
              <div className="h-full w-2 bg-gray-300 rounded-full mx-auto" />
            )}
          </div>
          <p className={`text-center font-bold text-lg ${
            balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-500' : 'text-gray-500'
          }`}>
            {balance > 0
              ? `+${balance.toLocaleString()} Ft`
              : balance < 0
              ? `-${absBalance.toLocaleString()} Ft`
              : 'Rendezve ✓'}
          </p>
        </div>
      </div>

      {/* Categories Accordion */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Kategóriák</h2>
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              showCategoryForm
                ? 'bg-gray-200 text-gray-600'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
          >
            {showCategoryForm ? 'Mégse' : '+ Új'}
          </button>
        </div>

        {/* New Category Form */}
        {showCategoryForm && (
          <form onSubmit={handleCreateCategory} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Kategória neve (pl. kaja, rezsi)..."
                value={catName}
                onChange={e => setCatName(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shrink-0"
              >
                Mentés
              </button>
            </div>
          </form>
        )}

        {filteredCategories.length > 0 ? (
          filteredCategories.map(cat => {
            const catTxs = getTransactionsForCategory(cat.id)
            const isOpen = openCategories[cat.id]

            return (
              <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Accordion Header */}
                <button
                  onClick={() => toggleCategory(cat.id)}
                  className="w-full p-5 flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <div className="text-left">
                    <h3 className="font-bold text-gray-900">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{catTxs.length} tranzakció</p>
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Accordion Content */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 pb-5">
                    {/* Transactions List */}
                    {catTxs.length > 0 ? (
                      <ul className="space-y-2 mt-4">
                        {catTxs.map(tx => {
                          const isCredit = tx.payer === currentUser?.id
                          return (
                            <li
                              key={tx.id}
                              className={`flex justify-between items-center p-3 rounded-xl ${
                                isCredit ? 'bg-green-50' : 'bg-red-50'
                              }`}
                            >
                              <div>
                                <p className={`text-sm font-bold ${isCredit ? 'text-green-700' : 'text-red-700'}`}>
                                  {isCredit ? 'Kifizetve' : 'Tartozás'}
                                </p>
                                {tx.description && (
                                  <p className="text-xs text-gray-500 mt-0.5">{tx.description}</p>
                                )}
                              </div>
                              <p className={`text-sm font-bold ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
                                {isCredit ? '+' : '-'}{parseFloat(tx.amount).toLocaleString()} Ft
                              </p>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="text-gray-400 text-sm text-center mt-4">Nincs tranzakció</p>
                    )}

                    {/* New Transaction Form */}
                    <form
                      onSubmit={(e) => handleCreateTransaction(e, cat.id)}
                      className="mt-4 bg-gray-50 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Összeg"
                          value={txAmounts[cat.id] || ''}
                          onChange={e => setTxAmounts(prev => ({ ...prev, [cat.id]: e.target.value }))}
                          className="w-24 bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Leírás..."
                          value={txDescriptions[cat.id] || ''}
                          onChange={e => setTxDescriptions(prev => ({ ...prev, [cat.id]: e.target.value }))}
                          className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          className="bg-blue-600 text-white px-4 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shrink-0"
                        >
                          +
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
            <p className="text-gray-400 font-medium">Még nincs kategória</p>
            <p className="text-gray-300 text-sm mt-1">Hozz létre egyet a fenti gombbal!</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default FriendDetail
