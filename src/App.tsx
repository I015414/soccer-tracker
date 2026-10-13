import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import AdminPanel from './components/admin/AdminPanel'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading…</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route element={session ? <Layout session={session} /> : <Navigate to="/login" replace />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
