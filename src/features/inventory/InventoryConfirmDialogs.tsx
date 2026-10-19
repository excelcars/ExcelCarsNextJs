import { ConfirmDialog } from '@/components/ui'

export function InventoryConfirmDialogs({
  discardOpen,
  deleteOpen,
  onCloseDiscard,
  onDiscard,
  onCloseDelete,
  onDelete,
  isDeleting,
}: {
  discardOpen: boolean
  deleteOpen: boolean
  onCloseDiscard: () => void
  onDiscard: () => void
  onCloseDelete: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  return (
    <>
      <ConfirmDialog open={discardOpen} onClose={onCloseDiscard} onConfirm={onDiscard} title="Discard changes?" confirmLabel="Discard" message="You have unsaved changes in this vehicle form. Discard them and close?" />
      <ConfirmDialog open={deleteOpen} onClose={onCloseDelete} onConfirm={onDelete} title="Delete vehicle?" message="This will permanently delete the vehicle record. This action cannot be undone." confirmLabel={isDeleting ? 'Deleting…' : 'Delete'} confirmDisabled={isDeleting} cancelDisabled={isDeleting} closeOnConfirm={false} isLoading={isDeleting} />
    </>
  )
}
