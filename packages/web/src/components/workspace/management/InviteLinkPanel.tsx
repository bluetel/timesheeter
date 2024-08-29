import { useNotifications } from "@timesheeter/web/components/ui/notification/NotificationProvider";
import { env } from "@timesheeter/web/env";

type InviteLinkPanelProps = {
  workspaceId: string;
};

export const InviteLinkPanel = ({ workspaceId }: InviteLinkPanelProps) => {
  const { addNotification } = useNotifications();

  const copyInviteLink = () => {
    window.navigator.clipboard.writeText(
      `${env.NEXT_PUBLIC_URL}/accept-invitation-workspace/${workspaceId}`
    );
    addNotification({
      variant: "success",
      primaryText: "Invite link copied!",
    });
  };

  return (
    <div className="bg-blue-100 shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900">
          Invites
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Once you have added an invite to someone, send them this link and
            they will be able to join the workspace.
          </p>
        </div>
        <div className="mt-5">
          <button
            onClick={copyInviteLink}
            type="button"
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            Copy invite link
          </button>
        </div>
      </div>
    </div>
  );
};
