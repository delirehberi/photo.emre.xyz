/**
 * Organization Profile Send Zap Button Island
 * photo.emre.xyz
 *
 * Renders the interactive "Send Zap" action on organization profiles
 * only when an LNURL or Lightning Address (lud16 / lud06) is configured.
 */

import { useState } from 'react';
import type { OrganizationProfile } from '@/lib/nostr/types';
import type { Locale } from '@/lib/i18n/dictionary';
import { AuthProvider } from '@/lib/nostr/auth/context';
import { I18nProvider, useI18n } from '@/lib/i18n/context';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';
import { OrgZapModal } from './OrgZapModal';

interface OrgZapButtonProps {
  org: OrganizationProfile;
  locale?: Locale;
}

function OrgZapButtonContent({ org }: { org: OrganizationProfile }) {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);

  // If no LNURL or Lightning Address exists in the profile, do not render the button
  const hasLnurl = Boolean(org.lud16 || org.lud06);
  if (!hasLnurl) {
    return null;
  }

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={() => setModalOpen(true)}
        className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-xs text-xs px-3.5 h-9 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      >
        <Zap className="h-4 w-4 fill-amber-200 text-amber-100" />
        <span>{t.org.sendZap}</span>
      </Button>

      <OrgZapModal open={modalOpen} onOpenChange={setModalOpen} org={org} />
    </>
  );
}

export function OrgZapButton({ org, locale }: OrgZapButtonProps) {
  if (!org.lud16 && !org.lud06) {
    return null;
  }

  return (
    <AuthProvider>
      <I18nProvider initialLocale={locale}>
        <OrgZapButtonContent org={org} />
      </I18nProvider>
    </AuthProvider>
  );
}
