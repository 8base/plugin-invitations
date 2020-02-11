import handler, { USER_DELETE_MUTATION, INVITATION_QUERY } from '../handler';

const context = {
  api: {
    gqlRequest: jest.fn(),
  },
};

const INVITATION_ID = 'INVITATION_ID';
const USER_ID = 'USER_ID';

afterEach(() => {
  jest.resetAllMocks();
});

it('Should cancel user invitation.', async () => {
  context.api.gqlRequest.mockResolvedValueOnce({
    invitation: {
      id: INVITATION_ID,
      invitedUser: {
        id: USER_ID,
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

  expect(context.api.gqlRequest).toHaveBeenCalledWith(
    USER_DELETE_MUTATION,
    {
      id: USER_ID,
    },
    {
      checkPermissions: false,
    },
  );

  expect(context.api.gqlRequest).toHaveBeenCalledTimes(2);

  expect(result).toEqual({
    data: {
      success: true,
    },
  });
});
