import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { LoadingSpinner, ErrorBanner } from '../components/LoadingSpinner'
import { toast } from '../components/Toast'

const API_URL = import.meta.env.VITE_API_URL

function Friends() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [transactions, setTransactions] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Token ${token}`
      fetchData()
    }
  }, [])

  const fetchData = () => {
    setError(null)
    Promise.all([
      axios.get(`${API_URL}/auth/users/me/`),
      axios.get(`${API_URL}/api/users/friends/`),
      axios.get(`${API_URL}/api/friend-requests/`),
      axios.get(`${API_URL}/api/transactions/`)
    ])
      .then(([meRes, friendsRes, requestsRes, txRes]) => {
        setCurrentUser(meRes.data)
        setFriends(friendsRes.data)
        setRequests(requestsRes.data.results)
        setTransactions(txRes.data.results)
      })
      .catch(err => {
        console.error(err)
        setError('Nem sikerült betölteni az adatokat.')
      })
      .finally(() => setLoading(false))
  }

  const incomingRequests = requests.filter(req => req.to_user === currentUser?.id)

  const balances = useMemo(() => {
    if (!currentUser) return {}
    const bal = {}
    transactions.forEach(tx => {
      const amt = parseFloat(tx.amount)
      const partner = tx.payer === currentUser.id ? tx.debtor : tx.payer
      if (tx.type === 'repayment') {
        if (tx.payer === currentUser.id) bal[partner] = (bal[partner] || 0) - amt
        else bal[partner] = (bal[partner] || 0) + amt
      } else {
        if (tx.payer === currentUser.id) bal[partner] = (bal[partner] || 0) + amt
        else bal[partner] = (bal[partner] || 0) - amt
      }
    })
    return bal
  }, [transactions, currentUser])

  const { totalPaidByMe, totalPaidToMe, netBalance } = useMemo(() => {
    if (!currentUser) return { totalPaidByMe: 0, totalPaidToMe: 0, netBalance: 0 }
    let paid = 0
    let received = 0
    transactions.forEach(tx => {
      if (tx.payer === currentUser.id) paid += parseFloat(tx.amount)
      if (tx.debtor === currentUser.id) received += parseFloat(tx.amount)
    })
    return { totalPaidByMe: paid, totalPaidToMe: received, netBalance: paid - received }
  }, [transactions, currentUser])

  const handleSearch = async () => {
    if (!searchQuery) return
    try {
      const res = await axios.get(`${API_URL}/api/users/search/?query=${searchQuery}`)
      setSearchResults(res.data)
    } catch (err) {
      console.error(err)
    }
  }

  const sendRequest = async (targetUserId) => {
    try {
      await axios.post(`${API_URL}/api/friend-requests/`, { to_user: targetUserId })
      handleSearch()
      fetchData()
    } catch (err) {
      console.error(err)
      toast('Hiba a kérés küldésekor!', 'error')
    }
  }

  const acceptRequest = async (requestId, senderId) => {
    try {
      await axios.post(`${API_URL}/api/friendships/`, {
        user1: currentUser.id,
        user2: senderId
      })
      await axios.delete(`${API_URL}/api/friend-requests/${requestId}/`)
      fetchData()
    } catch (err) {
      console.error(err)
      toast('Hiba az elfogadáskor!', 'error')
    }
  }

  const rejectRequest = async (requestId) => {
    try {
      await axios.delete(`${API_URL}/api/friend-requests/${requestId}/`)
      fetchData()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      {loading && <LoadingSpinner text="Adatok betöltése..." />}

      {error && !loading && (
        <ErrorBanner message={error} onRetry={() => { setLoading(true); fetchData() }} />
      )}

      {!loading && !error && (
        <>
      {/* Global Statistics Header */}
      <div className="text-center mb-6">
        <p className="text-xs font-medium text-gray-400 tracking-widest uppercase">Teljes egyenleg</p>
        <p className={`text-4xl sm:text-5xl font-black tracking-tight mt-1 ${
          netBalance > 0 ? 'text-green-600' : netBalance < 0 ? 'text-red-500' : 'text-gray-800'
        }`}>
          {netBalance >= 0 ? '+' : '-'}{Math.abs(netBalance).toLocaleString()}
          <span className="text-2xl sm:text-3xl font-bold text-gray-400 ml-1">Ft</span>
        </p>
      </div>

      {/* Split Stats Card */}
      <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8 flex divide-x divide-gray-100">
        <div className="flex-1 p-5 sm:p-6">
          <p className="text-xs font-medium text-gray-400 mb-1.5">Kiadásaid</p>
          <p className="text-xl sm:text-2xl font-extrabold text-green-600 tracking-tight">
            {totalPaidByMe.toLocaleString()}
            <span className="text-sm font-semibold text-green-400 ml-1">Ft</span>
          </p>
        </div>
        <div className="flex-1 p-5 sm:p-6">
          <p className="text-xs font-medium text-gray-400 mb-1.5">Neked fizettek</p>
          <p className="text-xl sm:text-2xl font-extrabold text-red-500 tracking-tight">
            {totalPaidToMe.toLocaleString()}
            <span className="text-sm font-semibold text-red-400 ml-1">Ft</span>
          </p>
        </div>
      </div>

      {/* Incoming Friend Requests */}
      {incomingRequests.length > 0 && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-orange-600 mb-3 flex items-center gap-2">
            <span className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
              {incomingRequests.length}
            </span>
            Bejövő barátkérés
          </h2>
          <ul className="space-y-2">
            {incomingRequests.map(req => (
              <li key={req.id} className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm">
                <span className="font-medium text-gray-800 text-sm">{req.from_user_name}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptRequest(req.id, req.from_user)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-600 transition-colors"
                  >
                    Elfogad
                  </button>
                  <button
                    onClick={() => rejectRequest(req.id)}
                    className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-300 transition-colors"
                  >
                    Elutasít
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Header with Search Toggle */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Barátaid</h2>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
            showSearch
              ? 'bg-gray-200 text-gray-600'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {showSearch ? 'Bezár' : '+ Új barát'}
        </button>
      </div>

      {/* Search Section */}
      {showSearch && (
        <div className="bg-white p-5 rounded-2xl shadow-sm mb-6 border border-gray-100">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Felhasználónév keresése..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSearch}
              className="bg-blue-600 text-white px-4 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shrink-0"
            >
              Keresés
            </button>
          </div>
          {searchResults.length > 0 && (
            <ul className="mt-4 space-y-2">
              {searchResults.map(user => (
                <li key={user.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-800">{user.username}</span>
                  <button
                    onClick={() => sendRequest(user.id)}
                    className="bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors"
                  >
                    Jelölés
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchResults.length === 0 && searchQuery && (
            <p className="text-gray-400 text-center text-sm mt-4">Nincs találat</p>
          )}
        </div>
      )}

      {/* Friends Grid */}
      {friends.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {friends.map(user => {
            const balance = balances[user.id] || 0
            return (
              <button
                key={user.id}
                onClick={() => navigate(`/friend/${user.id}`)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{user.username}</p>
                    <p className={`text-sm font-semibold mt-0.5 ${
                      balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-500' : 'text-gray-400'
                    }`}>
                      {balance > 0
                        ? `Tartozik: +${balance.toLocaleString()} Ft`
                        : balance < 0
                        ? `Tartozol: -${Math.abs(balance).toLocaleString()} Ft`
                        : 'Rendezve ✓'}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="text-gray-400 font-medium">Még nincsenek barátaid</p>
          <p className="text-gray-300 text-sm mt-1">Keress és jelölj be valakit a fenti gombbal!</p>
        </div>
      )}
        </>
      )}
    </div>
  )
}

export default Friends
