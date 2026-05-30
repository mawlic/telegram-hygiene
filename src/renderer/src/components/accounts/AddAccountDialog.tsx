import { useState, useEffect } from 'react'
import { X, Phone, KeyRound, Lock } from 'lucide-react'
import { Button } from '../ui/button'
import { AuthStep } from '../../../../shared/types'

type Step = 'phone' | 'code' | 'password' | 'done'

export default function AddAccountDialog({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const off = window.api.onAuthStep((data: AuthStep) => {
      if (data.type === 'code') setStep('code')
      if (data.type === 'done') { setStep('done'); setTimeout(onClose, 800) }
      if (data.error) setError(data.error)
    })
    return off
  }, [])

  const handlePhoneSubmit = async () => {
    if (!phone) return
    setError('')
    setLoading(true)
    try {
      await window.api.addPhone(phone)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCodeSubmit = async () => {
    if (!code) return
    setError('')
    setLoading(true)
    try {
      const result = await window.api.verifyCode(phone, code)
      if (result?.needPassword) setStep('password')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async () => {
    if (!password) return
    setError('')
    setLoading(true)
    try {
      await window.api.verifyPassword(phone, password)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-[360px] shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Add Telegram Account</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'phone' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
              <Phone className="w-5 h-5 text-zinc-400" />
              <input
                autoFocus
                type="tel"
                placeholder="+1 234 567 8900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-sm"
              />
            </div>
            <p className="text-xs text-zinc-500">Enter your phone number in international format</p>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button onClick={handlePhoneSubmit} disabled={loading || !phone} className="w-full">
              {loading ? 'Sending code...' : 'Send Code'}
            </Button>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Enter the code sent to <span className="text-white">{phone}</span>
            </p>
            <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
              <KeyRound className="w-5 h-5 text-zinc-400" />
              <input
                autoFocus
                type="text"
                placeholder="12345"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
                className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-sm tracking-widest"
                maxLength={6}
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button onClick={handleCodeSubmit} disabled={loading || !code} className="w-full">
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </div>
        )}

        {step === 'password' && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">Two-step verification is enabled. Enter your password.</p>
            <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg">
              <Lock className="w-5 h-5 text-zinc-400" />
              <input
                autoFocus
                type="password"
                placeholder="Your 2FA password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-sm"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <Button onClick={handlePasswordSubmit} disabled={loading || !password} className="w-full">
              {loading ? 'Verifying...' : 'Sign In'}
            </Button>
          </div>
        )}

        {step === 'done' && (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">✓</div>
            <p className="text-green-400 font-medium">Account added successfully!</p>
          </div>
        )}
      </div>
    </div>
  )
}
