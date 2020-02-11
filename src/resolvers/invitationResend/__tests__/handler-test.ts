import * as sendgridMail from '@sendgrid/mail';

import handler, { INVITATION_QUERY } from '../handler';

const { INVITATIONS_SENDGRID_TEMPLATE_ID } = process.env;

const context = {
  api: {
    gqlRequest: jest.fn(),
  },
};

const INVITATION_ID = 'INVITATION_ID';

const USER = {
  firstName: 'Allan',
  lastName: 'Headington',
  email: 'brethren@overeasiness.co.uk',
};

afterEach(() => {
  jest.resetAllMocks();
});

it('Should resend user invitation.', async () => {
  context.api.gqlRequest.mockResolvedValueOnce({
    invitation: {
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
        id: INVITATION_ID,
      },
    },
    context,
  );

  expect(context.api.gqlRequest).toHaveBeenCalledWith(
    INVITATION_QUERY,
    {
      id: INVITATION_ID,
    },
    {
      checkPermissions: false,
    },
  );

  expect(context.api.gqlRequest).toHaveBeenCalledTimes(1);

  expect(result).toEqual({
    data: {
      success: true,
    },
  });

  expect(sendgridMail.send).toHaveBeenNthCalledWith(1, {
    to: 'brethren@overeasiness.co.uk',
    from: 'vladimir.osipov@8base.com',
    templateId: INVITATIONS_SENDGRID_TEMPLATE_ID,
    // eslint-disable-next-line @typescript-eslint/camelcase
    dynamic_template_data: {
      invitationLink:
        'http://localhost:3001/invite?id=INVITATION_ID&email=brethren%40overeasiness.co.uk&firstName=Allan&lastName=Headington',
    },
  });
});
