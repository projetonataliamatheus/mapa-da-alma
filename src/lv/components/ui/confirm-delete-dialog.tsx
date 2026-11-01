// @ts-nocheck
"use client";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/lv/components/ui/alert-dialog";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Confirmar exclusão",
  description = "Tem certeza que deseja excluir? Esta ação não pode ser desfeita.",
}: ConfirmDeleteDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={loading}
          >
            {loading ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook to manage confirm-delete state.
 * Usage:
 *   const { deleteTarget, requestDelete, confirmDelete, cancelDelete } = useConfirmDelete(actualDeleteFn);
 *   <Button onClick={() => requestDelete(id)} />
 *   <ConfirmDeleteDialog open={!!deleteTarget} onOpenChange={open => !open && cancelDelete()} onConfirm={confirmDelete} />
 */
export function useConfirmDelete<T = string>(onDelete: (target: T) => void | Promise<void>) {
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  const requestDelete = (target: T) => setDeleteTarget(target);
  const cancelDelete = () => setDeleteTarget(null);
  const confirmDelete = async () => {
    if (deleteTarget !== null) {
      await onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  };

  return { deleteTarget, requestDelete, confirmDelete, cancelDelete };
}
