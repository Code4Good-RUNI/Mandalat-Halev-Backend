// utils/metadata.js
/**
 * Fetch Salesforce object metadata (fields only, no saving to disk)
 *
 * @param {Object} conn - jsforce connection
 * @param {string} objectName - Salesforce object API name (e.g., "Contact", "Campaign")
 * @returns {Promise<Array>} Array of field metadata objects
 */
async function fetchObjectMetadata(conn, objectName) {
  try {
    console.log(`🔎 Fetching metadata for ${objectName}...`);
    const describeResult = await conn.describe(objectName);

    const fields = describeResult.fields.map(f => ({
      name: f.name,
      label: f.label,
      type: f.type,
      length: f.length,
      custom: f.custom
    }));

    console.log(`✅ Retrieved ${fields.length} fields for ${objectName}`);
    return fields;
  } catch (err) {
    console.error(`❌ Error fetching metadata for ${objectName}:`, err.message);
    throw err;
  }
}

module.exports = { fetchObjectMetadata };
