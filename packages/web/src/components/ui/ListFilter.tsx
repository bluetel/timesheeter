import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { classNames } from '@timesheeter/web/utils/tailwind';
import { type IconType } from 'react-icons/lib';

export type ListFilter = {
  variant: 'select-group-filter';
  label: string;
  groups: {
    items: {
      active: boolean;
      label: string;
      onClick: () => unknown;
      icon: IconType;
    }[];
  }[];
};

type ListFilterProps = {
  filters: ListFilter[];
};

export const ListFilter = ({ filters }: ListFilterProps) => {
  if (filters.length === 0) {
    return null;
  }

  return (
    <div className="shaddow-sm sticky z-10 inline-flex space-x-1 overflow-visible p-1 shadow">
      {filters.map((filter, index) => (
        <Menu as="div" className="relative inline-block text-left" key={index}>
          <div>
            <Menu.Button className="inline-flex w-full justify-center gap-x-1.5 truncate rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              {filter.label}
              <ChevronDownIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
            </Menu.Button>
          </div>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute left-0 z-10 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              {filter.groups.map((group, index) => (
                <div className="overflow-hidden py-1" key={index}>
                  {group.items.map((item, index) => (
                    <Menu.Item key={index}>
                      {({ active: hoverActive }) => (
                        <button
                          className={classNames(
                            hoverActive ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                            'group flex w-full overflow-hidden px-4 py-2 text-left text-sm'
                          )}
                        >
                          <item.icon
                            className="mr-3 h-5 w-5 overflow-visible text-gray-400 group-hover:text-gray-500"
                            aria-hidden="true"
                          />
                          <span
                            className={classNames(
                              item.active ? 'font-semibold' : 'font-normal',
                              'max-w-1/2 w-4/5 truncate'
                            )}
                          >
                            {item.label}
                          </span>
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              ))}
            </Menu.Items>
          </Transition>
        </Menu>
      ))}
    </div>
  );
};
