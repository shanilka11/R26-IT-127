import React from 'react'

export default function ThemeToggle({ isDark, toggleTheme }) {
  return (
    <button
      onClick={toggleTheme}
      className="px-3 py-2 rounded-xl border text-sm"
      style={{
        borderColor: 'var(--line)',
        background: 'var(--bg-1)',
        color: 'var(--text-0)'
      }}
    >
      {isDark ? 'Switch to Light' : 'Switch to Dark'}
    </button>
  )
}
