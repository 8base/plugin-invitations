import * as sendgridMail from '@sendgrid/mail';
import * as qs from 'qs';
import gql from 'graphql-tag';

const {
  INVITATIONS_SENDGRID_API_KEY,
  INVITATIONS_SENDGRID_TEMPLATE_ID,
  INVITATIONS_LINK_PREFIX,
  INVITATIONS_FROM_EMAIL,
} = process.env;

export const INVITATION_QUERY = gql`
  query Invitation($id: ID!) {
    invitation(id: $id) {
      id
      invitedUser {
        id
        email
        firstName
        lastName
      }
    }
  }
`;

type InvitationResendResult = {
  data: {
    success: boolean;
  };
};

export default async (event: any, ctx: any): Promise<InvitationResendResult> => {
  let success = false;

  const { id, sendgridTemplateId } = event.data;

  if (
    !INVITATIONS_SENDGRID_API_KEY ||
    (!INVITATIONS_SENDGRID_TEMPLATE_ID && !sendgridTemplateId) ||
    !INVITATIONS_LINK_PREFIX ||
    !INVITATIONS_FROM_EMAIL
  ) {
    throw new Error(
      'Please set INVITATIONS_SENDGRID_API_KEY, INVITATIONS_SENDGRID_TEMPLATE_ID, INVITATIONS_LINK_PREFIX, INVITATIONS_FROM_EMAIL environment variables.',
    );
  }

  const { invitation } = await ctx.api.gqlRequest(
    INVITATION_QUERY,
    {
      id,
    },
    {
      checkPermissions: false,
    },
  );

  sendgridMail.setApiKey(INVITATIONS_SENDGRID_API_KEY);

  const searchString = qs.stringify({
    id: invitation.id,
    email: invitation.invitedUser.email,
    firstName: invitation.invitedUser.firstName,
    lastName: invitation.invitedUser.lastName,
  });

  const msg = {
    to: invitation.invitedUser.email,
    from: INVITATIONS_FROM_EMAIL,
    templateId: sendgridTemplateId || INVITATIONS_SENDGRID_TEMPLATE_ID,
    // eslint-disable-next-line @typescript-eslint/camelcase
    dynamic_template_data: {
      invitationLink: `${INVITATIONS_LINK_PREFIX}?${searchString}`,
      email: invitation.invitedUser.email,
      firstName: invitation.invitedUser.firstName,
      lastName: invitation.invitedUser.lastName,
    },
  };

  await sendgridMail.send(msg);

  success = true;

  return {
    data: {
      success,
    },
  };
};
