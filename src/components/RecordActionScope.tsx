"use client";

import { createContext, useContext } from "react";

type Dialog = { destroy: () => void };
export const RecordActionScope = createContext<null | { recordKey: string; register: (key: string, dialog: Dialog) => () => void }>(null);
export const useRecordActionScope = () => useContext(RecordActionScope);
