import * as sendgridMail from '@sendgrid/mail';

import handler, { INVITATION_CREATE_MUTATION, AUTHENTICATION_PROFILE_QUERY } from '../handler';

const { INVITATIONS_SENDGRID_TEMPLATE_ID } = process.env;

const context = {
  api: {
    gqlRequest: jest.fn(),
  },
};

const INVITATION_ID = 'INVITATION_ID';
const ROLE_ID = 'ROLE_ID';
const AUTH_PROFILE_ID = 'AUTH_PROFILE_ID';

const USER = {
  firstName: 'Allan',
  lastName: 'Headington',
  email: 'brethren@overeasiness.co.uk',
};

afterEach(() => {
  jest.resetAllMocks();
});

it('Should create user invitation.', async () => {
  context.api.gqlRequest.mockResolvedValueOnce({
    invitationCreate: {
      id: INVITATION_ID,
      invitedUser: {
        email: USER.email,
        firstName: USER.firstName,
        lastName: USER.lastName,
      },
    },
  });

  const result = await handler(
    {
      data: {
        user: USER,
      },
    },
    context,
  );

  expect(context.api.gqlRequest).toHaveBeenCalledWith(
    INVITATION_CREATE_MUTATION,
    {
      data: {
        invitedUser: {
          create: {
            ...USER,
            status: 'invitationPending',
          },
        },
      },
    },
    {
      checkPermissions: false,
    },
  );

  expect(context.api.gqlRequest).toHaveBeenCalledTimes(1);

  expect(result).toEqual({
    data: {
      invitationId: INVITATION_ID,
    },
    errors: [],
  });

  expect(sendgridMail.send).toHaveBeenNthCalledWith(1, {
    to: 'brethren@overeasiness.co.uk',
    from: 'vladimir.osipov@8base.com',
    templateId: INVITATIONS_SENDGRID_TEMPLATE_ID,
    // eslint-disable-next-line @typescript-eslint/camelcase
    dynamic_template_data: {
      invitationLink:
        'http://localhost:3001/invite?id=INVITATION_ID&email=brethren%40overeasiness.co.uk&firstName=Allan&lastName=Headington',
      email: USER.email,
      firstName: USER.firstName,
      lastName: USER.lastName,
    },
  });
});

it('Should create user invitation with auth profile.', async () => {
  context.api.gqlRequest.mockResolvedValueOnce({ authenticationProfile: { roles: { items: [{ id: ROLE_ID }] } } });

  context.api.gqlRequest.mockResolvedValueOnce({
    invitationCreate: {
      id: INVITATION_ID,
      invitedUser: {
        email: USER.email,
        firstName: USER.firstName,
        lastName: USER.lastName,
      },
    },
  });

  const result = await handler(
    {
      data: {
        user: USER,
        authProfileId: AUTH_PROFILE_ID,
      },
    },
    context,
  );

  expect(context.api.gqlRequest).toHaveBeenNthCalledWith(
    1,
    AUTHENTICATION_PROFILE_QUERY,
    {
      id: AUTH_PROFILE_ID,
    },
    {
      checkPermissions: false,
    },
  );

  expect(context.api.gqlRequest).toHaveBeenNthCalledWith(
    2,
    INVITATION_CREATE_MUTATION,
    {
      data: {
        invitedUser: {
          create: {
            ...USER,
            status: 'invitationPending',
            roles: {
              connect: [{ id: ROLE_ID }],
            },
          },
        },
      },
    },
    {
      checkPermissions: false,
    },
  );

  expect(context.api.gqlRequest).toHaveBeenCalledTimes(2);

  expect(result).toEqual({
    data: {
      invitationId: INVITATION_ID,
    },
    errors: [],
  });

  expect(sendgridMail.send).toHaveBeenNthCalledWith(1, {
    to: 'brethren@overeasiness.co.uk',
    from: 'vladimir.osipov@8base.com',
    templateId: INVITATIONS_SENDGRID_TEMPLATE_ID,
    // eslint-disable-next-line @typescript-eslint/camelcase
    dynamic_template_data: {
      invitationLink:
        'http://localhost:3001/invite?id=INVITATION_ID&email=brethren%40overeasiness.co.uk&firstName=Allan&lastName=Headington',
      email: USER.email,
      firstName: USER.firstName,
      lastName: USER.lastName,
    },
  });
});

it('Should returns correct error for already invited user.', async () => {
  context.api.gqlRequest.mockRejectedValueOnce({
    message: `{"message":"The request is invalid.","details":{"email":"Can't insert data. Field 'email' has unique values."},"code":"ValidationError"}`,
  });

  const result = await handler(
    {
      data: {
        user: USER,
      },
    },
    context,
  );

  expect(context.api.gqlRequest).toHaveBeenNthCalledWith(
    1,
    INVITATION_CREATE_MUTATION,
    {
      data: {
        invitedUser: {
          create: {
            ...USER,
            status: 'invitationPending',
          },
        },
      },
    },
    {
      checkPermissions: false,
    },
  );

  expect(context.api.gqlRequest).toHaveBeenCalledTimes(1);

  expect(result).toEqual({
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
  });
});
