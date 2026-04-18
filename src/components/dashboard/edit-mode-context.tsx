"use client";

import { createContext, useContext } from "react";

const EditModeContext = createContext(false);

export function EditModeProvider({
  children,
  isEditing,
}: {
  children: React.ReactNode;
  isEditing: boolean;
}) {
  return <EditModeContext value={isEditing}>{children}</EditModeContext>;
}

export function useEditMode() {
  return useContext(EditModeContext);
}
