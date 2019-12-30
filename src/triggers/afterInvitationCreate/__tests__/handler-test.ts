import * as sendgridMail from '@sendgrid/mail';

import handler from '../handler';

const { INVITATIONS_SENDGRID_TEMPLATE_ID } = process.env;

const context = {
  api: {
    gqlRequest: jest.fn(),
  },
};

const INVITATION = {
  id: 'INVITATION_ID',
};

const USER = {
  firstName: 'Allan',
  lastName: 'Headington',
  email: 'brethren@overeasiness.co.uk',
};

afterEach(() => {
  jest.resetAllMocks();
});

it('Should send invitation email.', async () => {
  context.api.gqlRequest.mockResolvedValueOnce({
    invitation: {
      ...INVITATION,
      invitedUser: USER,
    },
  });

  const result = await handler({ data: INVITATION }, context);

  expect(sendgridMail.send).toHaveBeenNthCalledWith(1, {
    to: 'brethren@overeasiness.co.uk',
    from: 'vladimir.osipov@8base.com',
    templateId: INVITATIONS_SENDGRID_TEMPLATE_ID,
    // eslint-disable-next-line @typescript-eslint/camelcase
    dynamic_template_data: {
      invitationLink: 'http://localhost:3001/invite?id=INVITATION_ID&email=brethren%40overeasiness.co.uk',
    },
  });

  expect(result).toEqual({ data: INVITATION });
});
