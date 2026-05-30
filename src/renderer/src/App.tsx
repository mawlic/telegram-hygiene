import { useEffect } from 'react'
import AccountsSidebar from './components/accounts/AccountsSidebar'
import ChannelsList from './components/channels/ChannelsList'
import { useEventListeners, loadAccounts } from './hooks/useApi'
import { useAppStore } from './store/app'

export default function App() {
  useEventListeners()

  useEffect(() => {
    loadAccounts().then((accounts) => {
      if (accounts.length > 0 && !useAppStore.getState().selectedAccountId) {
        // Auto-select first account
        const { setSelectedAccount } = useAppStore.getState()
        setSelectedAccount(accounts[0].id)
        import('./hooks/useApi').then(({ loadEntities }) => loadEntities(accounts[0].id))
      }
    })
  }, [])

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* macOS traffic lights space */}
      <div className="fixed top-0 left-0 right-0 h-8 app-drag-region" />

      <div className="flex flex-1 mt-8">
        <AccountsSidebar />
        <ChannelsList />
      </div>
    </div>
  )
}
