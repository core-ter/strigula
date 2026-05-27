import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import axios from 'axios'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Friends from './pages/Friends'
import FriendDetail from './pages/FriendDetail'
import Profile from './pages/Profile'
import { ToastContainer } from './components/Toast'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Token ${token}`
    }
  }, [token])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    delete axios.defaults.headers.common['Authorization']
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
        <Route path="/login" element={
          token ? <Navigate to="/dashboard" /> : <Login setToken={setToken} />
        } />
        <Route path="/register" element={
          token ? <Navigate to="/dashboard" /> : <Register />
        } />
        <Route element={token ? <Layout handleLogout={handleLogout} /> : <Navigate to="/login" />}>
          <Route path="/dashboard" element={<Friends />} />
          <Route path="/friend/:id" element={<FriendDetail />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  )
}

export default App
