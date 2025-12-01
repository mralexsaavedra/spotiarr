import { useEffect, useState } from "react";

export const useGridColumns = () => {
  const [columns, setColumns] = useState(2);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 2560) {
        setColumns(8); // ultrawide
      } else if (width >= 1920) {
        setColumns(6); // 2k/full hd large
      } else if (width >= 1280) {
        setColumns(5); // xl
      } else if (width >= 1024) {
        setColumns(4); // lg
      } else if (width >= 768) {
        setColumns(3); // md
      } else if (width >= 640) {
        setColumns(2); // sm
      } else {
        setColumns(2); // mobile
      }
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  return columns;
};
