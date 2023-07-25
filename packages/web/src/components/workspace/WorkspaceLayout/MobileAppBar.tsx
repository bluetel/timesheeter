import {
  Bars3Icon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import Image from "next/image";

type MobileAppBarProps = {
  setSideBarOpen: (open: boolean) => void;
}

export const MobileAppBar = ({ setSideBarOpen }: MobileAppBarProps) => (
  <div className="lg:hidden">

    <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-1.5">
      <Link href="/" className="group block">
        <Image
          alt="logo"
          className="h-8 w-auto"
          src="/images/logo.png"
          width={225}
          height={225}
        />
      </Link>
      <div className="space-x-4 flex items-center">
        <div>
          <button
            type="button"
            //set maxwidth to 50% to prevent the button from growing too large
            className="-mr-3 inline-flex h-12 w-12 items-center justify-center rounded-md text-gray-500 hover:text-gray-900"
            onClick={() => setSideBarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  </div>
)