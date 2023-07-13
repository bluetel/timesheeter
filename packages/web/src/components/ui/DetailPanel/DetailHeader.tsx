export type DetailHeaderProps = {
  title: string;
  description?: string;
  newButton?: {
    label: string;
    onClick: () => void;
  };
};

export const DetailHeader = ({
  title,
  description,
  newButton,
}: DetailHeaderProps) => (
  <div className="md:flex md:items-center md:justify-between">
    <div className="min-w-0 flex-1">
      <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
        {title}
      </h2>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
    <div className="mt-4 flex md:mt-0 md:ml-4">
      {newButton && (
        <button
          type="button"
          className="items-centser ml-3 inline-flex rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={newButton.onClick}
        >
          {newButton.label}
        </button>
      )}
    </div>
  </div>
);
