import * as R from 'ramda';
import * as sendgridMail from '@sendgrid/mail';
import * as qs from 'qs';
import gql from 'graphql-tag';

const {
  INVITATIONS_SENDGRID_API_KEY,
  INVITATIONS_SENDGRID_TEMPLATE_ID,
  INVITATIONS_LINK_PREFIX,
  INVITATIONS_FROM_EMAIL,
} = process.env;

export const INVITATION_CREATE_MUTATION = gql`
  mutation InvitationCreate($data: InvitationCreateInput!) {
    invitationCreate(data: $data) {
      id
      invitedUser {
        email
        firstName
        lastName
      }
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
  if (
    !INVITATIONS_SENDGRID_API_KEY ||
    !INVITATIONS_SENDGRID_TEMPLATE_ID ||
    !INVITATIONS_LINK_PREFIX ||
    !INVITATIONS_FROM_EMAIL
  ) {
    throw new Error(
      'Please set INVITATIONS_SENDGRID_API_KEY, INVITATIONS_SENDGRID_TEMPLATE_ID, INVITATIONS_LINK_PREFIX, INVITATIONS_FROM_EMAIL environment variables.',
    );
  }

  const { user, authProfileId } = event.data;

  let invitedUser = {
    ...user,
    status: 'invitationPending',
  };

  if (authProfileId) {
    const { authenticationProfile } = await ctx.api.gqlRequest(
      AUTHENTICATION_PROFILE_QUERY,
      {
        id: authProfileId,
      },
      {
        checkPermissions: false,
      },
    );

    invitedUser = {
      ...invitedUser,
      roles: {
        ...invitedUser.roles,
        connect: [...R.pathOr([], ['roles', 'connect'], invitedUser), ...authenticationProfile.roles.items],
      },
    };
  }

  const { invitationCreate } = await ctx.api.gqlRequest(
    INVITATION_CREATE_MUTATION,
    {
      data: {
        invitedUser: {
          create: invitedUser,
        },
      },
    },
    {
      checkPermissions: false,
    },
  );

  sendgridMail.setApiKey(INVITATIONS_SENDGRID_API_KEY);

  const searchString = qs.stringify({
    id: invitationCreate.id,
    email: invitationCreate.invitedUser.email,
    firstName: invitationCreate.invitedUser.firstName,
    lastName: invitationCreate.invitedUser.lastName,
  });

  const msg = {
    to: invitationCreate.invitedUser.email,
    from: INVITATIONS_FROM_EMAIL,
    templateId: INVITATIONS_SENDGRID_TEMPLATE_ID,
    // eslint-disable-next-line @typescript-eslint/camelcase
    dynamic_template_data: {
      invitationLink: `${INVITATIONS_LINK_PREFIX}?${searchString}`,
    },
  };

  await sendgridMail.send(msg);

  return {
    data: {
      invitationId: invitationCreate.id,
    },
  };
};
