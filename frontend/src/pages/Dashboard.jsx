import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'

function Dashboard({ handleLogout, token }) {
    const [currentUser, setCurrentUser] = useState(null)
    const [friends, setFriends] = useState([])
    const [categories, setCategories] = useState([])
    const [transactions, setTransactions] = useState([])

    // Search & Requests State
    const [requests, setRequests] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])

    // Transaction Form State
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

    const fetchProtectedData = () => {
        axios.get('http://127.0.0.1:8000/auth/users/me/')
            .then(res => setCurrentUser(res.data))
            .catch(err => console.error("Nem sikerült a user lekérése", err))

        axios.get('http://127.0.0.1:8000/api/users/friends/')
            .then(res => setFriends(res.data))
            .catch(err => console.error("Nem sikerült a barátok lekérése", err))

        // Fetch incoming friend requests?
        // We need an endpoint for this or filter manually.
        // Let's assume /api/friend-requests/ returns all I can see, we filter for "to_user == me" and "status == pending" (if status existed)
        // Actually our simple model doesn't have status, purely existence defines pending? 
        // Wait, implementation plan says: "Exclude users with pending requests".
        // And "Accept -> request disappears, user appears in friends".
        // So FriendRequest model IS the pending state.
        axios.get('http://127.0.0.1:8000/api/friend-requests/')
            .then(res => {
                // Filter for requests sent TO me
                // NOTE: backend filters: Q(from_user=user) | Q(to_user=user).
                // So we need to filter client side or improve backend queryset.
                // Let's filter client side for now since we don't have 'me' id yet easily inside axios call unless we wait.
                // Actually we can do it after we get currentUser? OR better:
                // The serializer includes "to_user" ID. We can filter list where to_user === currentUser.id
                // But currentUser might not be set yet.
                // Let's just set raw data and filter in render or wait.
                // Actually, let's just use the serializer's `to_user` field if available.
                // Better strategy: Filter by checking if I am NOT the `from_user`.
                setRequests(res.data)
            })
            .catch(err => console.error("Nem sikerült a kérések lekérése", err))

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

    /* --- ACTIONS --- */

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
            fetchProtectedData() // Refresh
        } catch (err) {
            console.error(err)
            alert("Hiba történt a mentéskor!")
        }
    }

    const handleSearch = async () => {
        if (!searchQuery) return
        try {
            const res = await axios.get(`http://127.0.0.1:8000/api/users/search/?query=${searchQuery}`)
            setSearchResults(res.data)
        } catch (err) {
            console.error(err)
        }
    }

    const sendRequest = async (targetUserId) => {
        try {
            await axios.post('http://127.0.0.1:8000/api/friend-requests/', {
                to_user: targetUserId
            })
            alert("Barátkérés elküldve!")
            handleSearch() // Refresh search results to hide the button
            fetchProtectedData() // Refresh requests list
        } catch (err) {
            console.error(err)
            alert("Hiba a kérés küldésekor!")
        }
    }

    const acceptRequest = async (requestId, senderId) => {
        try {
            // 1. Create Friendship
            // Note: Friendship model expects user1, user2.
            // We can set user1=me, user2=sender.
            // Wait, backend expects user1 < user2 constraint?
            // Actually, let's just send user1=me, user2=senderId.
            // The model check constraint might fail if user1==user2 (handled).
            // But uniqueness is (user1, user2). 
            // Let's rely on standard logic: POST to friendships with user2 = senderId (and user1 is me inferred or implicit?)
            // No, FriendshipViewSet doesn't auto-set user1=me, it requires fields.
            // But we don't have user1/user2 logic in Serializer?
            // Let's check FriendshipSerializer. If it uses `fields = '__all__'`, we need to provide both.
            // Or if we customized `perform_create`.
            // Let's try sending { user2: senderId } and assume backend handles it OR send both { user1: currentUser.id, user2: senderId }.
            await axios.post('http://127.0.0.1:8000/api/friendships/', {
                user1: currentUser.id,
                user2: senderId
            })

            // 2. Delete Request
            await axios.delete(`http://127.0.0.1:8000/api/friend-requests/${requestId}/`)

            alert("Barátság elfogadva!")
            fetchProtectedData()
        } catch (err) {
            console.error(err)
            alert("Hiba az elfogadáskor! (Lehet, hogy már barátok vagytok?)")
        }
    }

    const rejectRequest = async (requestId) => {
        try {
            await axios.delete(`http://127.0.0.1:8000/api/friend-requests/${requestId}/`)
            alert("Kérés elutasítva.")
            fetchProtectedData()
        } catch (err) {
            console.error(err)
        }
    }

    // Filter proper incoming requests
    // We only show requests where to_user === currentUser.id
    // Note: API returns objects like { id, from_user, to_user, created_at ... }
    // Wait, serializer might return ID or nested object.
    // FriendRequestSerializer usually has `from_user` and `to_user` as IDs or nested?
    // Let's assume IDs based on simple ModelSerializer unless nested.
    // If nested, we need `req.to_user.id`.
    const incomingRequests = requests.filter(req => req.to_user === currentUser?.id)

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

            {/* BEJÖVŐ KÉRÉSEK */}
            {incomingRequests.length > 0 && (
                <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border-2 border-red-100">
                    <h2 className="text-lg font-bold text-red-600 mb-4">Bejövő Barátkérések 📩</h2>
                    <ul className="space-y-3">
                        {incomingRequests.map(req => (
                            <li key={req.id} className="flex justify-between items-center bg-red-50 p-3 rounded-xl">
                                <span className="font-medium text-gray-800">
                                    {req.from_user_name}
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => acceptRequest(req.id, req.from_user)}
                                        className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-600"
                                    >
                                        ✓
                                    </button>
                                    <button
                                        onClick={() => rejectRequest(req.id)}
                                        className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-600"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ÚJ BARÁT KERESÉSE */}
            <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 border border-gray-100">
                <h2 className="text-lg font-bold text-gray-700 mb-4">Új barát keresése 🔍</h2>
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        placeholder="Felhasználónév..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={handleSearch}
                        className="bg-blue-600 text-white px-4 rounded-xl font-bold hover:bg-blue-700"
                    >
                        Keresés
                    </button>
                </div>
                {searchResults.length > 0 && (
                    <ul className="space-y-2 mt-4">
                        {searchResults.map(user => (
                            <li key={user.id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                                <span className="text-gray-800">{user.username}</span>
                                <button
                                    onClick={() => sendRequest(user.id)}
                                    className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-200"
                                >
                                    Jelölés +
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
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

export default Dashboard
