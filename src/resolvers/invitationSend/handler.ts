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

type InvitationSendResult = {
  data: {
    invitationId: string | null;
  };
  errors: Record<string, any>[];
};

export default async (event: any, ctx: any): Promise<InvitationSendResult> => {
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

  let invitationCreateResponse;

  try {
    invitationCreateResponse = await ctx.api.gqlRequest(
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
  } catch (e) {
    const err = JSON.parse(e.message);

    if (
      R.propEq('code', 'ValidationError', err) &&
      R.pathEq(['details', 'email'], `Can't insert data. Field 'email' has unique values.`, err)
    ) {
      return {
        data: {
          invitationId: null,
        },
        errors: [
          {
            message: 'The request is invalid.',
            path: ['user', 'email'],
            code: 'ValidationError',
            details: {
              user: {
                email: `User with this email already invited`,
              },
            },
          },
        ],
      };
    } else {
      return {
        data: {
          invitationId: null,
        },
        errors: [
          {
            message: 'Plugin internal error.',
            code: 'PluginInternalError',
          },
        ],
      };
    }
  }

  sendgridMail.setApiKey(INVITATIONS_SENDGRID_API_KEY);

  const searchString = qs.stringify({
    id: invitationCreateResponse.invitationCreate.id,
    email: invitationCreateResponse.invitationCreate.invitedUser.email,
    firstName: invitationCreateResponse.invitationCreate.invitedUser.firstName,
    lastName: invitationCreateResponse.invitationCreate.invitedUser.lastName,
  });

  const msg = {
    to: invitationCreateResponse.invitationCreate.invitedUser.email,
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
      invitationId: invitationCreateResponse.invitationCreate.id,
    },
    errors: [],
  };
};
