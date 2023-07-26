import { useZodForm } from "@timesheeter/web/utils/zod-form";
import { api } from "@timesheeter/web/utils/api";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { SideOver } from "@timesheeter/web/components/ui/SideOver";
import { BasicForm } from "@timesheeter/web/components/ui/forms/BasicForm/BasicForm";
import { type BasicFormItemProps } from "@timesheeter/web/components/ui/forms/BasicForm/BasicFormItem";
import { useNotifications } from "../../ui/notification/NotificationProvider";
import { fromZodError } from "zod-validation-error";
import { ConfigIcon, InvitationIcon, UserIcon } from "@timesheeter/web/lib/icons";
import { INVITATIONS_HELP_TEXT, MEMBERSHIPS_HELP_TEXT, WORKSPACES_HELP_TEXT, createWorkspaceSchema, customJSONStringify, invitationSchema, updateWorkspaceSchema } from "@timesheeter/web/lib";
import { DualSelectForm } from "../../ui/DualSelectForm";
import { type WorkspaceInfo } from "@timesheeter/web/server";
import { useSession } from "next-auth/react";
import { ListableForm } from "../../ui/forms/BasicForm/ListableForm";

const mutationSchema = z.union([
  createWorkspaceSchema.extend({
    new: z.literal(true),
  }),
  updateWorkspaceSchema.extend({
    new: z.literal(false),
  }),
]);

const roleSelectOptions = [
  {
    label: "Owner",
    value: "owner",
  },
  {
    label: "Member",
    value: "member",
  },
] as const;

type EditWorkspaceSideOverProps = {
  refetchWorkspaces: () => unknown;
  show: boolean;
  onClose: () => void;
  data:
  | {
    new: true;
  }
  | {
    new: false;
    workspace: {
      id: string;
      name: string;
    }
    memberships: WorkspaceInfo['memberships'];
    invitations: WorkspaceInfo['invitations'];
  };
};

export const EditWorkspaceSideOver = ({
  refetchWorkspaces,
  show,
  onClose,
  data,
}: EditWorkspaceSideOverProps) => {
  const { addNotification } = useNotifications();

  const getDefaultValues = () => {
    if (data.new) {
      return {
        new: true as const,
        name: "New workspace",
      }
    }

    return {
      new: false as const,
      ...data.workspace,
      memberships: data.memberships.map((membership) => ({
        role: membership.role,
        userId: membership.user.id,
      })),
      invitations: data.invitations.map((invitation) => invitation.email),
    };
  }

  const methods = useZodForm({
    schema: mutationSchema,
    defaultValues: getDefaultValues(),
  });

  const [oldData, setOldData] = useState(data);


  // Prevents resetting wrongly if just different reference
  useEffect(() => {
    if (customJSONStringify(oldData) === customJSONStringify(data)) {
      return;
    }

    methods.reset(getDefaultValues());
    setOldData(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const handleClose = () => {
    methods.reset();
    onClose();
  };

  const mutationArgs = {
    onSuccess: () => {
      handleClose();

      refetchWorkspaces();
    },
  };

  const { mutate: createWorkspace } =
    api.workspace.management.createWorkspace.useMutation(mutationArgs);

  const { mutate: updateWorkspace } =
    api.workspace.management.updateWorkspace.useMutation(mutationArgs);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let values = methods.getValues();

    // If just updating, filter out the values that are not changed
    if (!data.new) {
      // Filter out undefined values
      values = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined)
      ) as typeof values;


      if (values.name === data.workspace.name) {
        delete values.name;
      }

      if (JSON.stringify(values.memberships) === JSON.stringify(data.memberships)) {
        delete values.memberships;
      }
    }

    // Validate form
    const result = mutationSchema.safeParse(values);

    if (!result.success) {
      addNotification({
        variant: "error",
        primaryText: `Failed to ${data.new ? "create" : "update"} workspace`,
        secondaryText: fromZodError(result.error).toString(),
      });
      return;
    }

    values.new
      ? createWorkspace(values, {
        onError: (error) => {
          addNotification({
            variant: "error",
            primaryText: "Failed to create workspace",
            secondaryText: error.message,
          });
        },
      })
      : updateWorkspace(values, {
        onError: (error) => {
          addNotification({
            variant: "error",
            primaryText: "Failed to update workspace",
            secondaryText: error.message,
          });
        },
      });
  };

  const fields = useProjectFields(methods);

  const { data: sessionData } = useSession()

  const userSelectOptions = useMemo(
    () => {
      if (data.new) {
        return [{
          value: sessionData?.user.id ?? "",
          label: sessionData?.user.name ?? sessionData?.user.email ?? `Unknown user ${sessionData?.user.id ?? "undefined"}`,
        }];
      }

      return data.memberships.map((membership) => ({
        value: membership.user.id,
        label: membership.user.name ?? membership.user.email ?? `Unknown user ${membership.user.id}`,
      }));

    }, [data, sessionData]
  );

  const getMembershipSelectValues = () => {
    const memberships = [...(methods.getValues("memberships") ?? [])];

    if (memberships.length === 0) {
      memberships.push({
        role: "owner",
        userId: sessionData?.user.id ?? "",
      });

    }

    return memberships.map((membership) => ({
      firstSelectValue: membership.role,
      secondSelectValue: membership.userId,
    }));
  }

  const getInvitationValues = () => {
    const invitations = [...(methods.getValues("invitations") ?? [])];

    if (invitations.length === 0) {
      invitations.push("");
    }

    return invitations;
  }

  return (
    <SideOver
      title={data.new ? "Create Workspace" : "Edit Workspace"}
      description={WORKSPACES_HELP_TEXT}
      show={show}
      onClose={handleClose}
      actionButtonLabel={data.new ? "Create" : "Update"}
      onFormSubmit={handleSubmit}
      tabs={{
        multiple: true,
        bodies: [
          {
            icon: ConfigIcon,
            label: "Details",
            body: <BasicForm items={fields} />,
          },
          {
            icon: UserIcon,
            label: "Members",
            body: <DualSelectForm
              firstNullable={false}
              secondNullable={false}
              minRows={1}
              onChange={(newValues) => {
                const mappedValues = newValues.map(({ firstSelectValue, secondSelectValue }) => ({
                  role: firstSelectValue as typeof roleSelectOptions[number]["value"],
                  userId: secondSelectValue,
                }));

                methods.setValue("memberships", mappedValues, {
                  shouldValidate: true,
                })
              }}
              firstSelectOptions={[...roleSelectOptions]}
              secondSelectOptions={userSelectOptions}
              values={getMembershipSelectValues()}
            />,
            subDescription: MEMBERSHIPS_HELP_TEXT
          },
          {
            icon: InvitationIcon,
            label: "Invitations",
            body: <ListableForm
              minRows={0}
              placeholder="Email address"
              values={getInvitationValues()}
              onChange={(newValues) => {
                // Filter out emails that are invalid
                const filteredValues = newValues.filter((value) => invitationSchema.safeParse(value).success);

                methods.setValue("invitations", filteredValues, {
                  shouldValidate: true,
                })
              }}
            />,
            subDescription: INVITATIONS_HELP_TEXT
          }
        ],
      }}
    />
  );
};

const useProjectFields = (
  methods: ReturnType<typeof useZodForm<typeof mutationSchema>>
) => {
  const fields: BasicFormItemProps[] = [
    {
      required: true,
      label: {
        title: "Workspace name",
        description: `Name for the workspace, e.g. "Acme Corp"`,
      },
      field: {
        variant: "text",
        register: methods.register("name"),
        error: methods.formState.errors.name,
      },
    },
  ];

  return fields;
};
