import { useState } from 'react'
import { Share, Plus, Home, X } from 'lucide-react'
import { isIOSNonSafari } from '../../lib/pwa'
import { useT } from '../../lib/i18n'

interface Props {
  onDismiss: () => void
}

// Sticky banner for iOS users who haven't installed the PWA yet. Tapping
// "Show me how" expands a 3-step illustrated walkthrough. The dismiss
// button is session-only — banner re-appears next visit until they
// actually install, at which point isStandalone() makes the parent hide
// it permanently.
export function InstallPwaBanner({ onDismiss }: Props) {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const nonSafari = isIOSNonSafari()

  return (
    <div className="bg-teal-50 border-b border-teal-200 text-teal-900">
      <div className="max-w-md mx-auto px-4 py-2.5">
        <div className="flex items-start gap-2">
          <span className="shrink-0 w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center mt-0.5">
            <Share className="w-3.5 h-3.5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold leading-snug">
              {t('install.banner.title')}
            </p>
            <p className="text-[11px] text-teal-800/80 leading-snug mt-0.5">
              {t('install.banner.subtitle')}
            </p>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] text-teal-700 underline mt-1 [touch-action:manipulation]"
            >
              {expanded ? t('install.banner.hide') : t('install.banner.show')}
            </button>
          </div>
          <button
            onClick={onDismiss}
            className="shrink-0 text-teal-700 hover:text-teal-900 p-1 -m-1 [touch-action:manipulation]"
            aria-label={t('common.dismiss')}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-teal-200 space-y-2.5">
            {nonSafari && (
              <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2">
                {t('install.steps.openInSafari')}
              </p>
            )}
            <Step
              n={1}
              text={t('install.steps.step1')}
              icon={<Share className="w-4 h-4" />}
            />
            <Step
              n={2}
              text={t('install.steps.step2')}
              icon={<Plus className="w-4 h-4" />}
            />
            <Step
              n={3}
              text={t('install.steps.step3')}
              icon={<Home className="w-4 h-4" />}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function Step({ n, text, icon }: { n: number; text: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-[11px] text-teal-900 leading-snug">
      <span className="shrink-0 w-5 h-5 rounded-full bg-white border border-teal-300 text-teal-700 font-semibold flex items-center justify-center text-[10px]">
        {n}
      </span>
      <span className="flex-1">{text}</span>
      <span className="shrink-0 text-teal-600">{icon}</span>
    </div>
  )
}
