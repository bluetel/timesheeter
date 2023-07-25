import { UserIcon } from "../lib/icons";

type UserListProps = {
  title: string;
  subtitle?: string;
  users: {
    name: string;
    email?: string;
    imageUrl?: string;
  }[]
  emptyText: string;
}

export const UserList = ({ title, subtitle, users, emptyText }: UserListProps) => (<div>
  <div className="px-4 sm:px-0">
    <h3 className="text-base font-semibold leading-7 text-gray-900">{title}</h3>
    {subtitle && <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">{subtitle}</p>}
  </div>
  <div className="mt-6 border-t border-gray-100 mr-16">
    {users.length > 0 ?
      (<ul role="list" className="divide-y divide-gray-100">
        {users.map((user) => (
          <li key={user.email} className="flex gap-x-4 py-5">
            {user.imageUrl ?
              // eslint-disable-next-line @next/next/no-img-element
              <img className="h-12 w-12 flex-none rounded-full bg-gray-50" src={user.imageUrl} alt="" />
              :
              <div className="h-12 w-12 rounded-full bg-slate-500 flex items-center justify-center">
                <UserIcon className="h-8 w-8 flex-none rounded-full bg-gray-80 text-white" />
              </div>
            }
            <div className="min-w-0 flex flex-col align-items-start justify-center">
              <p className="text-sm font-semibold leading-6 text-gray-900">{user.name}</p>
              {user.email && user.email !== user.name && <p className="mt-1 truncate text-xs leading-5 text-gray-500">{user.email}</p>}
            </div>
          </li>
        ))}
      </ul>)
      : <div className="p-5 flex justify-center">
        <p className="text-sm text-gray-500">{emptyText}</p>
      </div>}
  </div>
</div>
)