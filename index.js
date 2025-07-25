const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const BOARD_ID = process.env.BOARD_ID;

// Example transformation function
function transformText(name, domain = "ochsinc.org") {
  if (!name) return "";

  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z\s]/gi, "")   // remove non-letter characters
    .replace(/\s+/g, ".")        // replace spaces with dots
    + "@" + domain;
}

app.post('/edit-column-text', async (req, res) => {
  const { itemId, sourceColumnId, targetColumnId } = req.body;

  if (!itemId || !sourceColumnId || !targetColumnId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Step 1: Fetch original text
  const fetchQuery = `
    query ($itemId: [ID!]) {
      items(ids: $itemId) {
        column_values {
          id
          text
        }
      }
    }
  `;

  try {
    const fetchResponse = await axios.post(
      'https://api.monday.com/v2',
      {
        query: fetchQuery,
        variables: { itemId: Number(itemId) }
      },
      {
        headers: {
          Authorization: MONDAY_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    const columns = fetchResponse.data.data.items[0].column_values;
    const sourceColumn = columns.find(col => col.id === sourceColumnId);
    const originalText = sourceColumn?.text;

    if (!originalText) {
      return res.status(404).json({ error: 'No text found in source column' });
    }

    const newText = transformText(originalText);
    
    // Step 2: Update the target column using GraphQL variables
    const mutation = `
      mutation ($itemId: ID!, $boardId: ID!, $columnId: email!, $value: JSON!) {
        change_column_value(
          item_id: $itemId,
          board_id: $boardId,
          column_id: $columnId,
          value: $value
        ) {
          id
        }
      }
    `;

    const variables = {
      itemId: Number(itemId),
      boardId: Number(BOARD_ID),
      columnId: targetColumnId,
      value: JSON.stringify(newText)
    };

    const updateResponse = await axios.post(
      'https://api.monday.com/v2',
      { query: mutation, variables },
      {
        headers: {
          Authorization: MONDAY_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      success: true,
      itemId,
      originalText,
      newText,
      result: updateResponse.data
    });

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
