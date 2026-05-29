import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { updateMyProfile } from '../../lib/queries'
import { LOCALE_LABELS, useLocale, type Locale } from '../../lib/i18n'

export function ProfileSettings() {
  const { user, profile, refreshProfile } = useAuth()
  const { locale, setLocale, t } = useLocale()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
    setPhone(profile?.phone_e164 ?? '')
  }, [profile?.display_name, profile?.phone_e164])

  const email = user?.email ?? null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      await updateMyProfile({
        display_name: displayName,
        phone_e164: phone,
      })
      await refreshProfile()
      setInfo(t('common.saved'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.saveFailed'))
    } finally {
      setBusy(false)
    }
  }

  const handleLocaleChange = async (next: Locale) => {
    if (next === locale) return
    setError(null)
    setInfo(null)
    try {
      await setLocale(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.saveFailed'))
    }
  }

  return (
    <div className="min-h-full flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-slate-500"
          >
            ← {t('common.back')}
          </button>
          <h1 className="text-base font-semibold tracking-tight">{t('profile.title')}</h1>
          <span className="w-12" />
        </div>
      </header>

      <main className="flex-1 px-4 pb-10 pt-4 max-w-md mx-auto w-full space-y-4">
        {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}
        {info && <p className="text-xs text-green-800 bg-green-50 rounded-lg p-2">{info}</p>}

        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold mb-3">{t('profile.yourDetails')}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('profile.email')}</label>
              <input
                value={email ?? ''}
                disabled
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-500"
              />
              <p className="text-xs text-slate-400 mt-1">{t('profile.emailHelp')}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t('profile.displayName')}</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('profile.displayNamePlaceholder')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-slate-400 mt-1">{t('profile.displayNameHelp')}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t('profile.phone')} <span className="text-slate-400 font-normal">({t('common.optional')})</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('profile.phonePlaceholder')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <p className="text-xs text-slate-400 mt-1">{t('profile.phoneHelp')}</p>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-teal-600 text-white rounded-lg py-2.5 px-3 text-sm font-medium disabled:opacity-50"
            >
              {busy ? t('common.saving') : t('common.save')}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-4">
          <h2 className="text-sm font-semibold mb-3">{t('profile.language')}</h2>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(LOCALE_LABELS) as Locale[]).map((code) => {
              const active = code === locale
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => handleLocaleChange(code)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'border-teal-600 bg-teal-50 text-teal-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {LOCALE_LABELS[code]}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 mt-2">{t('profile.languageHelp')}</p>
        </section>

        <Link
          to="/events"
          className="block text-center text-xs text-slate-500"
        >
          {t('profile.backToEvents')}
        </Link>
      </main>
    </div>
  )
}
