import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { LoadingSpinner, ErrorBanner } from '../components/LoadingSpinner'
import { toast } from '../components/Toast'

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
  const [txTypes, setTxTypes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFriendMenu, setShowFriendMenu] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Token ${token}`
      fetchData()
    }
  }, [friendId])

  const fetchData = () => {
    setError(null)
    Promise.all([
      axios.get(`${API_URL}/auth/users/me/`),
      axios.get(`${API_URL}/api/users/friends/`),
      axios.get(`${API_URL}/api/friendships/`),
      axios.get(`${API_URL}/api/debt-categories/`),
      axios.get(`${API_URL}/api/transactions/`)
    ])
      .then(([meRes, friendsRes, fsRes, catRes, txRes]) => {
        setCurrentUser(meRes.data)
        const found = friendsRes.data.find(u => u.id === parseInt(friendId))
        setFriend(found || null)
        setFriendships(fsRes.data.results)
        setCategories(catRes.data.results)
        setTransactions(txRes.data.results)
      })
      .catch(err => {
        console.error(err)
        setError('Nem sikerült betölteni az adatokat.')
      })
      .finally(() => setLoading(false))
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
      const amt = parseFloat(tx.amount)
      if (tx.type === 'repayment') {
        if (tx.payer === currentUser?.id) bal -= amt
        else bal += amt
      } else {
        if (tx.payer === currentUser?.id) bal += amt
        else bal -= amt
      }
    })
    return bal
  }, [filteredTransactions, currentUser])

  const totalIPaid = useMemo(() => {
    return filteredTransactions
      .filter(tx => tx.payer === currentUser?.id)
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
  }, [filteredTransactions, currentUser])

  const totalFriendPaid = useMemo(() => {
    return filteredTransactions
      .filter(tx => tx.debtor === currentUser?.id)
      .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
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
      toast('Hiba a kategória létrehozásakor!', 'error')
    }
  }

  const handleCreateTransaction = async (e, categoryId) => {
    e.preventDefault()
    const amount = txAmounts[categoryId] || ''
    const description = txDescriptions[categoryId] || ''
    const txType = txTypes[categoryId] || 'expense'
    if (!amount) {
      toast('Add meg az összeget!', 'error')
      return
    }
    try {
      await axios.post(`${API_URL}/api/transactions/`, {
        amount: amount,
        debtor: parseInt(friendId),
        category: categoryId,
        type: txType,
        currency: 'HUF',
        description: description
      })
      setTxAmounts(prev => ({ ...prev, [categoryId]: '' }))
      setTxDescriptions(prev => ({ ...prev, [categoryId]: '' }))
      setLoading(true)
      fetchData()
    } catch (err) {
      console.error(err)
      toast('Hiba a tranzakció létrehozásakor!', 'error')
    }
  }

  const handleDeleteTransaction = async (txId) => {
    if (!confirm('Biztosan törlöd ezt a tranzakciót?')) return
    try {
      await axios.delete(`${API_URL}/api/transactions/${txId}/`)
      setLoading(true)
      fetchData()
      toast('Tranzakció törölve.', 'success')
    } catch (err) {
      console.error(err)
      toast('Hiba a törléskor!', 'error')
    }
  }

  const handleDeleteCategory = async (catId) => {
    if (!confirm('Biztosan törlöd a kategóriát? A benne lévő tranzakciók megmaradnak.')) return
    try {
      await axios.delete(`${API_URL}/api/debt-categories/${catId}/`)
      setLoading(true)
      fetchData()
      toast('Kategória törölve.', 'success')
    } catch (err) {
      console.error(err)
      toast('Hiba a kategória törlésekor!', 'error')
    }
  }

  const handleUnfriend = async () => {
    if (!friendshipId) return
    if (!confirm('Biztosan törlöd ezt a barátot? Minden közös tranzakció megmarad.')) return
    try {
      await axios.delete(`${API_URL}/api/friendships/${friendshipId}/`)
      navigate('/dashboard')
      toast('Barát törölve.', 'success')
    } catch (err) {
      console.error(err)
      toast('Hiba a barát törlésekor!', 'error')
    }
  }

  const handleSettleUp = async () => {
    const absBal = Math.abs(balance)
    if (absBal < 1) return toast('Nincs mit rendezni!', 'info')
    const label = balance > 0 ? 'tartozik neked' : 'tartozol neki'
    if (!confirm(`Biztosan rögzíted a rendezést? (${absBal.toLocaleString()} Ft ${label})`)) return

    const defaultCat = filteredCategories.length > 0 ? filteredCategories[0].id : null
    try {
      await axios.post(`${API_URL}/api/transactions/`, {
        amount: absBal,
        debtor: parseInt(friendId),
        category: defaultCat,
        type: 'repayment',
        currency: 'HUF',
        description: 'Rendezés'
      })
      setLoading(true)
      fetchData()
      toast('Rendezés rögzítve!', 'success')
    } catch (err) {
      console.error(err)
      toast('Hiba a rendezéskor!', 'error')
    }
  }

  const getTransactionsForCategory = (catId) => {
    return filteredTransactions.filter(tx => tx.category === catId)
  }

  const groupTransactionsByDate = (txs) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 86400000)
    const thisWeekStart = new Date(today.getTime() - today.getDay() * 86400000)
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 86400000)

    const groups = [
      { label: 'Ma', test: d => d >= today },
      { label: 'Tegnap', test: d => d >= yesterday && d < today },
      { label: 'Ezen a héten', test: d => d >= thisWeekStart && d < yesterday },
      { label: 'Múlt héten', test: d => d >= lastWeekStart && d < thisWeekStart },
      { label: 'Korábban', test: () => true },
    ]

    const result = []
    const remaining = [...txs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    groups.forEach(({ label, test }) => {
      const matching = remaining.filter(tx => test(new Date(tx.created_at)))
      if (matching.length > 0) {
        result.push({ label, transactions: matching })
        matching.forEach(tx => {
          const idx = remaining.findIndex(r => r.id === tx.id)
          if (idx !== -1) remaining.splice(idx, 1)
        })
      }
    })

    return result
  }

  if (!friend && !loading && !error) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 text-center py-16">
        <p className="text-gray-400 dark:text-gray-500">Ez a barát nem található.</p>
      </div>
    )
  }

  const totalTxCount = filteredTransactions.length
  const maxSideAmount = Math.max(totalIPaid, totalFriendPaid, 1)

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8">
      {loading && <LoadingSpinner text="Adatok betöltése..." />}
      {error && !loading && (
        <ErrorBanner message={error} onRetry={() => { setLoading(true); fetchData() }} />
      )}
      {!loading && !error && friend && (
        <>
      {/* Back Button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Vissza a barátokhoz
      </button>

      {/* Friend Header */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 mb-6">
        <div className="flex items-center gap-4 mb-1">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0">
            {friend.username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{friend.username}</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">{totalTxCount} tranzakció</p>
          </div>
          <div className="relative shrink-0">
            <button
              onClick={() => setShowFriendMenu(!showFriendMenu)}
              className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="12" cy="19" r="2" />
              </svg>
            </button>
            {showFriendMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFriendMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-20 py-1">
                  <button
                    onClick={() => { setShowFriendMenu(false); handleUnfriend() }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Barát törlése
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Two-Way Balance Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-end px-1">
            <div className={`text-right ${totalFriendPaid > 0 ? 'text-red-500' : 'text-gray-300'}`}>
              <p className="text-xs font-medium">Tartozol</p>
              <p className="text-sm font-bold">{totalFriendPaid.toLocaleString()} Ft</p>
            </div>
            <div className={`text-left ${totalIPaid > 0 ? 'text-green-600' : 'text-gray-300'}`}>
              <p className="text-xs font-medium">Tartozik</p>
              <p className="text-sm font-bold">{totalIPaid.toLocaleString()} Ft</p>
            </div>
          </div>

          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden flex">
            <div className="w-1/2 flex justify-end">
              <div
                className="h-full bg-red-500 rounded-l-full transition-all duration-300"
                style={{ width: `${Math.min((totalFriendPaid / maxSideAmount) * 100, 100)}%` }}
              />
            </div>
            <div className="w-0.5 bg-white shrink-0" />
            <div className="w-1/2 flex justify-start">
              <div
                className="h-full bg-green-500 rounded-r-full transition-all duration-300"
                style={{ width: `${Math.min((totalIPaid / maxSideAmount) * 100, 100)}%` }}
              />
            </div>
          </div>

          <p className={`text-center font-bold text-lg ${
            balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-500' : 'text-gray-500'
          }`}>
            {balance > 0
              ? `Tartozik neked: +${balance.toLocaleString()} Ft`
              : balance < 0
              ? `Tartozol neki: -${Math.abs(balance).toLocaleString()} Ft`
              : 'Rendezve ✓'}
          </p>

          {balance !== 0 && (
            <button
              onClick={handleSettleUp}
              className={`mt-4 w-full text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-[0.98] ${
                balance < 0
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 active:from-indigo-600 active:to-purple-600'
                  : 'bg-emerald-600 active:bg-emerald-700'
              }`}
            >
              {balance < 0
                ? `Kifizetem (${Math.abs(balance).toLocaleString()} Ft)`
                : `Pénz átvéve (${Math.abs(balance).toLocaleString()} Ft)`}
            </button>
          )}
        </div>
      </div>

      {/* Categories Accordion */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Kategóriák</h2>
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              showCategoryForm
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800'
            }`}
          >
            {showCategoryForm ? 'Mégse' : '+ Új'}
          </button>
        </div>

        {/* New Category Form */}
        {showCategoryForm && (
          <form onSubmit={handleCreateCategory} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Kategória neve (pl. kaja, rezsi)..."
                value={catName}
                onChange={e => setCatName(e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="submit"
                className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3.5 rounded-xl text-sm font-semibold active:bg-blue-800 transition-colors"
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
              <div key={cat.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                {/* Accordion Header */}
                <div className="p-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="text-left flex-1 min-w-0"
                  >
                    <h3 className="font-bold text-gray-900 dark:text-white">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{cat.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {catTxs.length} tranzakció — összesen {catTxs.reduce((s, tx) => s + parseFloat(tx.amount), 0).toLocaleString()} Ft
                    </p>
                  </button>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id) }}
                      className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      title="Kategória törlése"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Accordion Content */}
                {isOpen && (
                  <div className="border-t border-gray-100 dark:border-gray-800 px-5 pb-5">
                    {/* Transactions List */}
                    {catTxs.length > 0 ? (
                      <div className="space-y-4 mt-4">
                        {groupTransactionsByDate(catTxs).map(group => (
                          <div key={group.label}>
                            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                              {group.label}
                            </h4>
                            <ul className="space-y-2">
                              {group.transactions.map(tx => {
                                const isCredit = tx.payer === currentUser?.id
                                return (
                                  <li
                                    key={tx.id}
                                    className={`flex justify-between items-center p-3 rounded-xl ${
                                      isCredit ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30'
                                    }`}
                                  >
                                    <div>
                                      <p className={`text-sm font-bold ${isCredit ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                        {isCredit ? 'Kifizetve' : 'Tartozás'}
                                      </p>
                                      {tx.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tx.description}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p className={`text-sm font-bold ${isCredit ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                        {isCredit ? '+' : '-'}{parseFloat(tx.amount).toLocaleString()} Ft
                                      </p>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTransaction(tx.id) }}
                                        className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors p-1"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 text-sm text-center mt-4">Nincs tranzakció</p>
                    )}

                    {/* New Transaction Form */}
                    <form
                      onSubmit={(e) => handleCreateTransaction(e, cat.id)}
                      className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3"
                    >
                      {/* Type Toggle */}
                      <div className="flex bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-1 gap-1">
                        <button
                          type="button"
                          onClick={() => setTxTypes(prev => ({ ...prev, [cat.id]: 'expense' }))}
                          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                            (txTypes[cat.id] || 'expense') === 'expense'
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Új vásárlás
                        </button>
                        <button
                          type="button"
                          onClick={() => setTxTypes(prev => ({ ...prev, [cat.id]: 'repayment' }))}
                          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                            txTypes[cat.id] === 'repayment'
                              ? 'bg-green-600 text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Kifizetés
                        </button>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Összeg"
                          value={txAmounts[cat.id] || ''}
                          onChange={e => setTxAmounts(prev => ({ ...prev, [cat.id]: e.target.value }))}
                          className="sm:w-28 w-full bg-white dark:bg-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Leírás..."
                          value={txDescriptions[cat.id] || ''}
                          onChange={e => setTxDescriptions(prev => ({ ...prev, [cat.id]: e.target.value }))}
                          className="flex-1 bg-white dark:bg-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          type="submit"
                          className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3.5 rounded-xl text-sm font-semibold active:bg-blue-800 transition-colors"
                        >
                          Hozzáadás
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-gray-400 dark:text-gray-500 font-medium">Még nincs kategória</p>
            <p className="text-gray-300 dark:text-gray-600 text-sm mt-1">Hozz létre egyet a fenti gombbal!</p>
          </div>
        )}
      </div>
        </>
      )}
    </div>
  )
}

export default FriendDetail
