import gql from 'graphql-tag';

export const INVITATION_QUERY = gql`
  query Invitation($id: ID!) {
    invitation(id: $id) {
      id
      invitedUser {
        id
      }
    }
  }
`;

export const USER_DELETE_MUTATION = gql`
  mutation UserDelete($id: ID!) {
    userDelete(filter: { id: $id }, force: true) {
      success
    }
  }
`;

type InvitationCancelResult = {
  data: {
    success: boolean;
  };
};

export default async (event: any, ctx: any): Promise<InvitationCancelResult> => {
  let success = false;

  const { id } = event.data;

  const { invitation } = await ctx.api.gqlRequest(
    INVITATION_QUERY,
    {
      id,
    },
    {
      checkPermissions: false,
    },
  );

  await ctx.api.gqlRequest(
    USER_DELETE_MUTATION,
    {
      id: invitation.invitedUser.id,
    },
    {
      checkPermissions: false,
    },
  );

  success = true;

  return {
    data: {
      success,
    },
  };
};
