import { useState } from 'react'
import SignUpGeniusImport from './SignUpGeniusImport'
import VenmoImport from './VenmoImport'
import ZelleImport from './ZelleImport'
import CashEntry from './CashEntry'
import RentConfigPanel from './RentConfig'
import InitialBalancePanel from './InitialBalance'
import ResetData from './ResetData'
import AdminDashboard from './AdminDashboard'

type ImportTab = 'signupgenius' | 'venmo' | 'zelle' | 'cash'
type SettingsTab = 'rent' | 'balance' | 'reset'
type MainTab = 'dashboard' | 'import' | 'settings'

function TabBar<T extends string>({
  tabs, active, onChange,
}: { tabs: { id: T; label: string }[]; active: T; onChange: (t: T) => void }) {
  return (
    <div className="flex gap-1 border-b border-gray-200 mb-4">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            active === tab.id
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export default function AdminPanel() {
  const [mainTab, setMainTab] = useState<MainTab>('dashboard')
  const [importTab, setImportTab] = useState<ImportTab>('signupgenius')
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('rent')

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-800">Admin Panel</h1>

      <TabBar
        tabs={[
          { id: 'dashboard' as MainTab, label: 'Ledger' },
          { id: 'import' as MainTab, label: 'Import Payments' },
          { id: 'settings' as MainTab, label: 'Settings' },
        ]}
        active={mainTab}
        onChange={setMainTab}
      />

      {mainTab === 'dashboard' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <AdminDashboard />
        </div>
      )}

      {mainTab === 'import' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <TabBar
            tabs={[
              { id: 'signupgenius' as ImportTab, label: 'SignUpGenius' },
              { id: 'venmo' as ImportTab, label: 'Venmo' },
              { id: 'zelle' as ImportTab, label: 'Zelle / Bank' },
              { id: 'cash' as ImportTab, label: 'Cash' },
            ]}
            active={importTab}
            onChange={setImportTab}
          />
          {importTab === 'signupgenius' && <SignUpGeniusImport />}
          {importTab === 'venmo' && <VenmoImport />}
          {importTab === 'zelle' && <ZelleImport />}
          {importTab === 'cash' && <CashEntry />}
        </div>
      )}

      {mainTab === 'settings' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <TabBar
            tabs={[
              { id: 'rent' as SettingsTab, label: 'Court Rent' },
              { id: 'balance' as SettingsTab, label: 'Initial Balance' },
              { id: 'reset' as SettingsTab, label: 'Reset Data' },
            ]}
            active={settingsTab}
            onChange={setSettingsTab}
          />
          {settingsTab === 'rent' && <RentConfigPanel />}
          {settingsTab === 'balance' && <InitialBalancePanel />}
          {settingsTab === 'reset' && <ResetData />}
        </div>
      )}
    </div>
  )
}
