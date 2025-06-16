// services/authManager.js

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

let tokenData = {
  accessToken: null,
  instanceUrl: null
};

// הפונקציה המרכזית – מחזירה טוקן תקף, או מתחברת מחדש אם force=true
async function getValidToken(force = false) {
  if (!force && tokenData.accessToken && tokenData.instanceUrl) {
    return tokenData;
  }

  console.log(force ? '🔁 Forcing re-authentication...' : '🔑 Fetching new access token...');
  const response = await fetch(`${process.env.host}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.client_id,
      client_secret: process.env.client_secret
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Salesforce auth error: ${data.error_description || data.error}`);
  }

  tokenData = {
    accessToken: data.access_token,
    instanceUrl: data.instance_url
  };

  console.log('✅ Access token acquired successfully');
  return tokenData;
}

module.exports = { getValidToken };
