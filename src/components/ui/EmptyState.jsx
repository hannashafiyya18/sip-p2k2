import React from 'react';

// Adaptasi dari 21st.dev "Empty State" (serafim/empty-state) ke JSX + Tailwind murni
export default function EmptyState({ title, description, icons = [], action, className = '' }) {
  const iconBox = "bg-white dark:bg-gray-800 size-12 grid place-items-center rounded-xl shadow-lg ring-1 ring-gray-200 dark:ring-gray-700 transition duration-500 group-hover:duration-200";
  const iconCls = "w-6 h-6 text-gray-400 dark:text-gray-500";

  return (
    <div className={`text-center border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 rounded-2xl py-14 px-6 w-full group hover:bg-gray-50/80 dark:hover:bg-gray-900/40 transition duration-500 hover:duration-200 ${className}`}>
      <div className="flex justify-center isolate">
        {icons.length === 3 ? (
          <>
            <div className={`${iconBox} relative left-2.5 top-1.5 -rotate-6 group-hover:-translate-x-5 group-hover:-rotate-12 group-hover:-translate-y-0.5`}>
              {React.createElement(icons[0], { className: iconCls })}
            </div>
            <div className={`${iconBox} relative z-10 group-hover:-translate-y-0.5`}>
              {React.createElement(icons[1], { className: iconCls })}
            </div>
            <div className={`${iconBox} relative right-2.5 top-1.5 rotate-6 group-hover:translate-x-5 group-hover:rotate-12 group-hover:-translate-y-0.5`}>
              {React.createElement(icons[2], { className: iconCls })}
            </div>
          </>
        ) : (
          icons[0] && (
            <div className={`${iconBox} group-hover:-translate-y-0.5`}>
              {React.createElement(icons[0], { className: iconCls })}
            </div>
          )
        )}
      </div>
      <h2 className="text-gray-900 dark:text-white font-bold mt-6">{title}</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 whitespace-pre-line">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 rounded-xl text-sm font-bold bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 active:shadow-none transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
