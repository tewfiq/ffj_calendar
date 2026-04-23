import { PageHeader } from "@/components/app/page-header"
import { ImportWizard } from "@/components/app/import-wizard"

export default function NewImportPage() {
  return (
    <>
      <PageHeader
        eyebrow="Nouvel import"
        title="Importer un fichier CSV"
        description="Déposez un fichier, ajustez la correspondance des colonnes, prévisualisez, puis confirmez. L'import crée un nouveau calendrier."
      />
      <section className="px-6 py-6 md:px-8 md:py-8">
        <ImportWizard />
      </section>
    </>
  )
}
