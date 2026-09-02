import { ConfirmDialog } from '@/components/ui'

export function InventoryConfirmDialogs({
  discardOpen,
  deleteOpen,
  onCloseDiscard,
  onDiscard,
  onCloseDelete,
  onDelete,
}: {
  discardOpen: boolean
  deleteOpen: boolean
  onCloseDiscard: () => void
  onDiscard: () => void
  onCloseDelete: () => void
  onDelete: () => void
}) {
  return (
    <>
      <ConfirmDialog open={discardOpen} onClose={onCloseDiscard} onConfirm={onDiscard} title="Discard changes?" confirmLabel="Discard" message="You have unsaved changes in this vehicle form. Discard them and close?" />
      <ConfirmDialog open={deleteOpen} onClose={onCloseDelete} onConfirm={onDelete} message="This will permanently delete the vehicle record. This action cannot be undone." />
    </>
  )
}
