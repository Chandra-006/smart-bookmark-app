'use client'

import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type Bookmark = {
  id: string
  title: string
  url: string
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(''), 2000)
  }, [])

  const fetchBookmarksForUser = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      showToast('Failed to load bookmarks')
      return
    }

    setBookmarks(data || [])
  }, [showToast])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        fetchBookmarksForUser(data.user.id)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchBookmarksForUser(session.user.id)
        } else {
          setBookmarks([])
        }
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [fetchBookmarksForUser])

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('bookmarks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookmarks',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBookmarksForUser(user.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, fetchBookmarksForUser])

  const normalizeUrl = (rawUrl: string): string | null => {
    const candidate = rawUrl.trim()
    if (!candidate) return null

    const withProtocol = /^https?:\/\//i.test(candidate)
      ? candidate
      : `https://${candidate}`

    try {
      const parsed = new URL(withProtocol)
      return parsed.toString()
    } catch {
      return null
    }
  }

  const addBookmark = async () => {
    if (!user || !title.trim() || !url.trim() || saving) return

    const normalizedUrl = normalizeUrl(url)
    if (!normalizedUrl) {
      showToast('Enter a valid URL')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('bookmarks').insert({
      title: title.trim(),
      url: normalizedUrl,
      user_id: user.id,
    })
    setSaving(false)

    if (error) {
      showToast('Could not add bookmark')
      return
    }

    setTitle('')
    setUrl('')
    showToast('Bookmark added')
  }

  const deleteBookmark = async (id: string) => {
    const { error } = await supabase.from('bookmarks').delete().eq('id', id)
    if (error) {
      showToast('Could not delete bookmark')
      return
    }

    showToast('Bookmark deleted')
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (!user) {
    return (
      <main className="app-shell">
        <section className="panel auth-card">
          <h1 className="heading">Smart Bookmark</h1>
          <p className="subheading">
            Save links, search faster, and keep your research organized.
          </p>
          <button
            onClick={() =>
              supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: `${window.location.origin}/`,
                },
              })
            }
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
          >
            Sign in with Google
          </button>
        </section>
      </main>
    )
  }

  const filteredBookmarks = bookmarks.filter((bookmark) =>
    bookmark.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="app-shell">
      <section className="panel">
        <div className="top-row">
          <p className="email-chip">{user.email}</p>
          <div className="actions">
            <button
              onClick={signOut}
              className="btn btn-danger"
            >
              Logout
            </button>
          </div>
        </div>

        <h1 className="heading">Your bookmarks</h1>
        <p className="subheading">
          {bookmarks.length} saved {bookmarks.length === 1 ? 'link' : 'links'}
        </p>

        <div className="toolbar">
          <input
            className="field"
            placeholder="Bookmark title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="field"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            onClick={addBookmark}
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? 'Adding...' : 'Add link'}
          </button>
        </div>

        <input
          className="field"
          placeholder="Search by title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <ul className="bookmark-list" style={{ marginTop: '0.8rem' }}>
          {filteredBookmarks.map((bookmark) => (
            <li
              key={bookmark.id}
              className="bookmark-item"
            >
              <div>
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bookmark-title"
                >
                  {bookmark.title}
                </a>
                <p className="bookmark-url">{bookmark.url}</p>
              </div>
              <button
                onClick={() => deleteBookmark(bookmark.id)}
                className="btn btn-danger"
                style={{ padding: '0.45rem 0.7rem' }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        {filteredBookmarks.length === 0 && (
          <div className="empty" style={{ marginTop: '0.8rem' }}>
            {bookmarks.length === 0
              ? 'No bookmarks yet. Add your first one above.'
              : 'No matches found for your search.'}
          </div>
        )}
      </section>

      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}
