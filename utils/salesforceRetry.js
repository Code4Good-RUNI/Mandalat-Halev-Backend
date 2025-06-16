// utils/salesforceRetry.js

const jsforce = require('jsforce');
const { getValidToken } = require('../services/authManager');

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

module.exports = { withSalesforceRetry };
