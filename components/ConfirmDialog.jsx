"use client";

import React from "react";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import "./ConfirmDialog.css";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  isLoading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      className="confirm-dialog"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="confirm-dialog-note">
        Please confirm before continuing with this destructive action.
      </p>
    </Modal>
  );
}