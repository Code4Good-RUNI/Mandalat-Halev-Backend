// Shared Salesforce session state
// This is a shared session state for the Salesforce connection
// It is used to store the access token and instance URL for the Salesforce connection
const salesforce_session = {
    accessToken: null,
    instanceUrl: null
};

module.exports = salesforce_session; 