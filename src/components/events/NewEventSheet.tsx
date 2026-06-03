import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createEvent } from '../../lib/queries'
import { useT } from '../../lib/i18n'
import { TEMPLATES, applyTemplate, type TemplateId, type TemplateDef } from '../../lib/templates'

type Step = 'template' | 'details'

export function NewEventSheet() {
  const navigate = useNavigate()
  const t = useT()
  const [step, setStep] = useState<Step>('template')
  const [templateId, setTemplateId] = useState<TemplateId>('blank')
  const [name, setName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedTemplate: TemplateDef =
    TEMPLATES.find((tpl) => tpl.id === templateId) ?? TEMPLATES[TEMPLATES.length - 1]!

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setBusy(true)
    try {
      const created = await createEvent({
        name,
        event_date: eventDate || null,
      })
      // Best-effort template apply. If group/category creation fails partway,
      // the event still exists and the user can finish manually — the error
      // logger captures the failure for diagnosis.
      if (selectedTemplate.id !== 'blank') {
        try {
          await applyTemplate(created.id, selectedTemplate, t)
        } catch (tplErr) {
          // eslint-disable-next-line no-console
          console.warn('Template apply failed (event still created)', tplErr)
        }
      }
      navigate(`/events/${created.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('newEvent.couldNotCreate'))
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        {step === 'template' ? (
          <Link to="/" className="text-sm text-slate-500">← {t('common.back')}</Link>
        ) : (
          <button onClick={() => setStep('template')} className="text-sm text-slate-500">
            ← {t('common.back')}
          </button>
        )}
        <h1 className="text-base font-semibold">{t('newEvent.title')}</h1>
        <span className="w-12" />
      </header>

      <main className="flex-1 p-4 max-w-md mx-auto w-full">
        {step === 'template' ? (
          <div className="space-y-4">
            <div className="pt-2">
              <h2 className="text-sm font-semibold text-slate-700">{t('templates.pickTitle')}</h2>
              <p className="text-xs text-slate-500 mt-1">{t('templates.pickSubtitle')}</p>
            </div>

            <ul className="space-y-2">
              {TEMPLATES.map((tpl) => {
                const isSelected = tpl.id === templateId
                return (
                  <li key={tpl.id}>
                    <button
                      onClick={() => setTemplateId(tpl.id)}
                      className={`w-full text-left rounded-lg border p-3 transition [touch-action:manipulation] ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-800">
                            {t(tpl.labelKey)}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {t(tpl.descriptionKey)}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="shrink-0 text-teal-600 text-xs font-bold">✓</span>
                        )}
                      </div>
                      {tpl.groups.length > 0 && (
                        <p className="text-[11px] text-slate-400 mt-2 truncate">
                          {tpl.groups.map((g) => t(g.nameKey)).join(' · ')}
                        </p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>

            <button
              onClick={() => setStep('details')}
              className="w-full bg-teal-600 text-white rounded-lg py-2.5 px-4 text-sm font-medium [touch-action:manipulation]"
            >
              {t('common.next')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t('eventSettings.eventName')}
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('newEvent.namePlaceholder')}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t('newEvent.dateLabel')}{' '}
                <span className="text-slate-400 font-normal">({t('common.optional')})</span>
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
              {t('templates.pickTitle')}: <span className="font-medium">{t(selectedTemplate.labelKey)}</span>
            </p>

            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="w-full bg-teal-600 text-white rounded-lg py-2.5 px-4 text-sm font-medium disabled:opacity-50 [touch-action:manipulation]"
            >
              {busy
                ? selectedTemplate.id === 'blank'
                  ? t('newEvent.creating')
                  : t('templates.applying')
                : t('newEvent.create')}
            </button>

            {error && <p className="text-xs text-red-700 bg-red-50 rounded-lg p-2">{error}</p>}
          </form>
        )}
      </main>
    </div>
  )
}
