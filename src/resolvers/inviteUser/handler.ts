import * as R from 'ramda';
import gql from 'graphql-tag';

export const INVITATION_CREATE_MUTATION = gql`
  mutation InvitationCreate($data: InvitationCreateInput!) {
    invitationCreate(data: $data) {
      id
    }
  }
`;

export const AUTHENTICATION_PROFILE_QUERY = gql`
  query AuthenticationProfile($id: ID!) {
    authenticationProfile(id: $id) {
      roles {
        items {
          id
        }
      }
    }
  }
`;

type InviteUserResult = {
  data: {
    invitationId: string;
  };
};

export default async (event: any, ctx: any): Promise<InviteUserResult> => {
  const { user, authProfileId } = event.data;

  let invitedUser = {
    ...user,
    status: 'invitationPending',
  };

  if (authProfileId) {
    const { authenticationProfile } = await ctx.api.gqlRequest(AUTHENTICATION_PROFILE_QUERY, {
      id: authProfileId,
    });

    invitedUser = {
      ...invitedUser,
      roles: {
        ...invitedUser.roles,
        connect: [...R.pathOr([], ['roles', 'connect'], invitedUser), ...authenticationProfile.roles.items],
      },
    };
  }

  const { invitationCreate } = await ctx.api.gqlRequest(INVITATION_CREATE_MUTATION, {
    data: {
      invitedUser: {
        create: invitedUser,
      },
    },
  });

  return {
    data: {
      invitationId: invitationCreate.id,
    },
  };
};
