function (user, context, callback) {
  const CREATE_USER_MUTATION = `
    mutation CreateUser($data: UserCreateInput!) {
      userCreate(data: $data) {
        id
      }
    }
  `;

  const UPDATE_USER_MUTATION = `
    mutation UpdateUser($data: UserUpdateInput!, $filter: UserKeyFilter) {
      userUpdate(data: $data, filter: $filter) {
        id
      }
    }
  `;

  const INVITATION_QUERY = `
    query Invitation($id: ID!) {
      invitation(id: $id) {
        invitedUser {
          email
        }
      }
    }
  `;

  user.user_metadata = user.user_metadata || {};

  if (user.user_metadata.initialized) {
      return callback(null, user, context);
  }

  const { API_ENDPOINT, API_TOKEN } = configuration;

  const { GraphQLClient } = require('graphql-request');

  const graphQLClient = new GraphQLClient(API_ENDPOINT, {
    headers: {
      authorization: 'Bearer ' + API_TOKEN,
    },
  });

  async function rule() {
    let userData = {
      email: user.email,
      firstName: user.user_metadata.given_name || user.given_name,
      lastName: user.user_metadata.family_name || user.family_name,
      status: 'active',
    };

    if (context.request.query.invitation_id) {
      try {
        const {
          invitation
        } = await graphQLClient.request(INVITATION_QUERY, {
          id: context.request.query.invitation_id,
        });

        await graphQLClient.request(UPDATE_USER_MUTATION, {
          data: userData,
          filter: {
            email: invitation.invitedUser.email
          },
        });
      } catch (err) {
        console.log('USER INVITE STAGE ERROR', err);

        return callback(err);
      }
    } else {
      try {
        await graphQLClient.request(CREATE_USER_MUTATION, {
          data: userData,
        });
      } catch (err) {
        console.log('USER CREATE STAGE ERROR', err);

        return callback(err);
      }
    }

    user.user_metadata.initialized = true;

    try {
      await auth0.users.updateUserMetadata(user.user_id, user.user_metadata);
    } catch (err) {
      console.log('USER META DATA UPDATE STAGE ERROR', err);

      return callback(err);
    }

    callback(null, user, context);
  }

  rule();
}