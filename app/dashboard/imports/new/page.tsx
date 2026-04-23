import { PageHeader } from "@/components/app/page-header"
import { ImportSourcePicker } from "@/components/app/import-source-picker"

export default function NewImportPage() {
  return (
    <>
      <PageHeader
        eyebrow="Nouvel import"
        title="Importer un agenda"
        description="Depuis un fichier CSV ou un flux iCalendar (Google Agenda, Apple, Outlook). Chaque import devient un calendrier distinct."
      />
      <section className="px-6 py-6 md:px-8 md:py-8">
        <ImportSourcePicker />
      </section>
    </>
  )
}
