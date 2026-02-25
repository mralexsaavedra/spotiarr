import { ReactNode, FC } from "react";

interface SearchGridSectionProps {
  title: string;
  children: ReactNode;
}

export const SearchGridSection: FC<SearchGridSectionProps> = ({ title, children }) => (
  <section className="w-full min-w-0">
    <h2 className="mb-4 text-2xl font-bold text-white">{title}</h2>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {children}
    </div>
  </section>
);
