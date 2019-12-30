# 8base Plugin Invitations

## Installation steps

* Create table "Invitations" with relation `Invited User` to "Users" table;
* Create auth profile with your Auth0;
* Configure Auth0 tenant (add rule and settings, configure login page);
* Create environment variables INVITATIONS_SENDGRID_API_KEY, INVITATIONS_SENDGRID_TEMPLATE_ID, INVITATIONS_LINK_PREFIX, INVITATIONS_FROM_EMAIL;
* Install plugin via `8base plugin install invitations` and deploy it `8base deploy -m=FULL`;

## Coming features

* Invitation expiration time;
* One time invitation usage;