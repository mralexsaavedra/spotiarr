import { useEffect, useState } from "react";
import { APP_CONFIG } from "@/config/app";

const { BREAKPOINTS, COLUMNS } = APP_CONFIG.GRID;

export const useGridColumns = () => {
  const [columns, setColumns] = useState<number>(COLUMNS.MOBILE);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= BREAKPOINTS.ULTRAWIDE) {
        setColumns(COLUMNS.ULTRAWIDE);
      } else if (width >= BREAKPOINTS.LARGE) {
        setColumns(COLUMNS.LARGE);
      } else if (width >= BREAKPOINTS.XL) {
        setColumns(COLUMNS.XL);
      } else if (width >= BREAKPOINTS.LG) {
        setColumns(COLUMNS.LG);
      } else if (width >= BREAKPOINTS.MD) {
        setColumns(COLUMNS.MD);
      } else if (width >= BREAKPOINTS.SM) {
        setColumns(COLUMNS.SM);
      } else {
        setColumns(COLUMNS.MOBILE);
      }
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  return columns;
};
