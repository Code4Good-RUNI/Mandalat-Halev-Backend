// utils/salesforceRetry.js

const jsforce = require('jsforce');
const salesforce_session = require('../salesforce-session');

async function withSalesforceRetry(callbackFn) {
  try {
    const { accessToken, instanceUrl } = await getValidToken();
    const conn = new jsforce.Connection({ accessToken, instanceUrl });
    return await callbackFn(conn);
  } catch (err) {
    if (err.name === 'INVALID_SESSION_ID' || (err.message && err.message.includes('INVALID_SESSION_ID'))) {
      console.warn('⚠️ Token invalid — retrying with fresh token');
      const { accessToken, instanceUrl } = await getValidToken(true); // force reauth
      const conn = new jsforce.Connection({ accessToken, instanceUrl });
      return await callbackFn(conn);
    }
    throw err;
  }
}

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
  salesforce_session.accessToken = data.access_token;
  salesforce_session.instanceUrl = data.instance_url;

  console.log('✅ Access token acquired successfully');
  return salesforce_session;
}
module.exports = { withSalesforceRetry };
