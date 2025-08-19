const express = require('express');
const salesforce_session = require('../../salesforce-session');
const jsforce = require('jsforce');
const { fetchObjectMetadata } = require('../../utils/metadata'); // use shared helper
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

/**
 * @route GET /debug/describe
 * @desc Describe Salesforce object and export metadata
 * @query object=Contact (default: CampaignMember)
 */
router.get('/', async (req, res) => {
  const { accessToken, instanceUrl } = salesforce_session;
  if (!accessToken || !instanceUrl) {
    return res.status(401).json({ error: 'Not authenticated with Salesforce' });
  }

  const conn = new jsforce.Connection({ accessToken, instanceUrl });

  try {
    const objectName = req.query.object || 'CampaignMember';
    console.log(`[describe-schemes] Fetching metadata for: ${objectName}`);

    // ✅ Use shared fetcher
    const fields = await fetchObjectMetadata(conn, objectName);

    // Still save to files (debugging feature)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rawMetadataFile = path.join('descriptions', `${objectName}_raw_metadata_${timestamp}.json`);
    const labelMappingFile = path.join('descriptions', `${objectName}_label_mapping_${timestamp}.txt`);

    await fs.writeFile(rawMetadataFile, JSON.stringify(fields, null, 2), 'utf8');

    let labelMappingContent = `Salesforce Object: ${objectName}\nGenerated: ${new Date().toLocaleString()}\n`;
    labelMappingContent += `Total Fields: ${fields.length}\n${'='.repeat(60)}\n\n`;
    fields.forEach((field, i) => {
      labelMappingContent += `${i + 1}. Label: "${field.label}" → API Name: "${field.name}"\n`;
      labelMappingContent += `   Type: ${field.type}, Custom: ${field.custom}\n\n`;
    });
    await fs.writeFile(labelMappingFile, labelMappingContent, 'utf8');

    res.json({
      success: true,
      objectName,
      fieldCount: fields.length,
      files: {
        rawMetadata: path.resolve(rawMetadataFile),
        labelMapping: path.resolve(labelMappingFile)
      },
      fields
    });

  } catch (err) {
    console.error('❌ Error fetching object metadata:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

//! END Describe Salesforce Object Metadata
