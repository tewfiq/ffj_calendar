import { PageHeader } from "@/components/app/page-header"
import { getSettings } from "@/lib/queries"
import { SettingsForm } from "@/components/app/settings-form"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const settings = await getSettings()

  return (
    <>
      <PageHeader
        eyebrow="Réglages"
        title="Préférences de planification"
        description="Ces paramètres pilotent directement la détection des conflits et l'affichage des vacances scolaires."
      />
      <section className="px-6 py-6 md:px-8 md:py-8">
        <div className="max-w-2xl">
          <SettingsForm
            initial={{
              school_zone: settings.school_zone,
              holiday_mode: settings.holiday_mode,
              default_buffer_minutes: settings.default_buffer_minutes,
            }}
          />
        </div>
      </section>
    </>
  )
}
