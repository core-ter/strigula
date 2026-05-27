import { useState } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

function Categories({ categories, friendships, currentUser, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [friendshipId, setFriendshipId] = useState('')

  const getFriendName = (friendship) => {
    if (!currentUser) return ''
    if (friendship.user1?.id === currentUser.id) {
      return friendship.user2?.username || ''
    }
    return friendship.user1?.username || ''
  }

  const getCategoryFriendName = (cat) => {
    const friendship = friendships.find(f => f.id === cat.friendship)
    return friendship ? getFriendName(friendship) : ''
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name || !friendshipId) {
      alert('Adj meg nevet és válassz barátot!')
      return
    }
    try {
      await axios.post(`${API_URL}/api/debt-categories/`, {
        name: name,
        description: description,
        friendship: friendshipId
      })
      setName('')
      setDescription('')
      setFriendshipId('')
      setShowForm(false)
      onRefresh()
    } catch (err) {
      console.error(err)
      console.log(err.response?.data)
      const messages = err.response?.data
        ? Object.values(err.response.data).flat().join(' ')
        : 'Hiba a kategória létrehozásakor!'
      alert(messages)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Biztosan törlöd a kategóriát?')) return
    try {
      await axios.delete(`${API_URL}/api/debt-categories/${id}/`)
      onRefresh()
    } catch (err) {
      console.error(err)
      alert('Hiba a törléskor!')
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm mb-6 border border-gray-100 dark:border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-gray-700 dark:text-white">Kategóriák</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
            showForm
              ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800'
          }`}
        >
          {showForm ? 'Mégse' : '+ Új'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">Barát</label>
            <select
              value={friendshipId}
              onChange={e => setFriendshipId(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Válassz barátot --</option>
              {friendships.map(f => (
                <option key={f.id} value={f.id}>{getFriendName(f)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">Név</label>
            <input
              type="text"
              placeholder="Pl. kaja, rezsi, buli..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 ml-1">Leírás (opcionális)</label>
            <input
              type="text"
              placeholder="Rövid leírás..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white dark:bg-gray-700 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl font-bold transition-colors text-sm"
          >
            Létrehozás
          </button>
        </form>
      )}

      {categories.length > 0 ? (
        <ul className="space-y-2">
          {categories.map(cat => (
            <li key={cat.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
              <div>
                <span className="font-medium text-gray-800 dark:text-white">{cat.name}</span>
                {cat.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{cat.description}</p>
                )}
                <span className="text-xs text-gray-400 dark:text-gray-500"> · {getCategoryFriendName(cat)}</span>
              </div>
              <button
                onClick={() => handleDelete(cat.id)}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-400 text-xs font-bold px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400 dark:text-gray-500 text-center text-sm italic">Nincs még kategória.</p>
      )}
    </div>
  )
}

export default Categories
