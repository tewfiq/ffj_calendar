"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { runConflictDetection } from "@/app/actions/conflicts"

export function DetectButton() {
  const [isPending, startTransition] = useTransition()
  return (
    <>
      <Toaster position="bottom-right" />
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              const n = await runConflictDetection()
              toast.success("Détection terminée", {
                description:
                  n === 0 ? "Aucun conflit détecté." : `${n} conflit${n > 1 ? "s" : ""} détecté${n > 1 ? "s" : ""}.`,
              })
            } catch {
              toast.error("Échec de la détection.")
            }
          })
        }
      >
        <RefreshCcw className={`mr-1 size-4 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Détection…" : "Relancer la détection"}
      </Button>
    </>
  )
}
