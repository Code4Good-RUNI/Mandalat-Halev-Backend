// Helper for Salesforce contact lookup
const salesforce_session = require('./salesforce-session');
const jsforce = require('jsforce');

async function getContactByIdAndEmail(userId, email) {
  const { accessToken, instanceUrl } = salesforce_session;
  if (!accessToken || !instanceUrl) return null;
  const conn = new jsforce.Connection({ accessToken, instanceUrl });
  try {
    const result = await conn.query(
      `SELECT Id, Email FROM Contact WHERE Id = '${userId}' AND Email = '${email}' LIMIT 1`
    );
    return result.records[0] || null;
  } catch {
    return null;
  }
}

module.exports = { getContactByIdAndEmail };
