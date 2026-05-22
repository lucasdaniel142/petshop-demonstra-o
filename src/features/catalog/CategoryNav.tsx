import React from 'react';

interface CategoryNavProps {
  selectedCategory: string;
  categories: ReadonlyArray<{ id: string; label: string }>;
  onCategoryChange: (categoryId: string) => void;
}

export const CategoryNav: React.FC<CategoryNavProps> = ({
  selectedCategory,
  categories,
  onCategoryChange,
}) => {
  return (
    <nav
      className="bg-white border-b border-gray-100 min-h-[56px] py-2 flex items-center shrink-0 w-full shadow-sm"
      aria-label="Categorias de produtos"
      role="navigation"
    >
      <div className="w-full px-3 sm:px-4 md:px-6 overflow-hidden">
        <ul
          className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide text-[12px] sm:text-[13px] font-[600]"
          role="list"
        >
          {categories.map((category) => {
            const isActive = selectedCategory === category.id;
            return (
              <li key={category.id} className="whitespace-nowrap flex shrink-0">
                <button
                  type="button"
                  onClick={() => onCategoryChange(category.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className={`rounded-full px-3 sm:px-4 py-2 transition-all duration-150 border text-[12px] sm:text-[13px] ${
                    isActive
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-[#F8FAF8] text-text border-transparent hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {category.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};
