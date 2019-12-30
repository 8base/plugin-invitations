import gql from 'graphql-tag';
import * as sendgridMail from '@sendgrid/mail';
import * as qs from 'qs';

const {
  INVITATIONS_SENDGRID_API_KEY,
  INVITATIONS_SENDGRID_TEMPLATE_ID,
  INVITATIONS_LINK_PREFIX,
  INVITATIONS_FROM_EMAIL,
} = process.env;

const INVITATION_QUERY = gql`
  query Invitation($id: ID!) {
    invitation(id: $id) {
      id
      invitedUser {
        email
      }
    }
  }
`;

type AfterInvitationCreateResult = {
  data: Record<string, any>;
};

export default async (event: any, ctx: any): Promise<AfterInvitationCreateResult> => {
  const { data } = event;

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

  const { invitation } = await ctx.api.gqlRequest(INVITATION_QUERY, {
    id: data.id,
  });

  sendgridMail.setApiKey(INVITATIONS_SENDGRID_API_KEY);

  const searchString = qs.stringify({
    id: data.id,
    email: invitation.invitedUser.email,
  });

  const msg = {
    to: invitation.invitedUser.email,
    from: INVITATIONS_FROM_EMAIL,
    templateId: INVITATIONS_SENDGRID_TEMPLATE_ID,
    // eslint-disable-next-line @typescript-eslint/camelcase
    dynamic_template_data: {
      invitationLink: `${INVITATIONS_LINK_PREFIX}?${searchString}`,
    },
  };

  await sendgridMail.send(msg);

  return { data };
};
