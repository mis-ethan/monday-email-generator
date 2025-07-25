const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
const BOARD_ID = process.env.BOARD_ID; // Add this in Render environment variables


function NameToEmail(name, domain = "ochsinc.org") {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z\s]/g, '') // remove special characters
    .replace(/\s+/g, '.') + '@' + domain;
}

app.post('/edit-column-text', async (req, res) => {
  const { itemId, sourceColumnId, targetColumnId } = req.body;

  if (!itemId || !sourceColumnId || !targetColumnId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Step 1: Fetch original text from source column
  const query = `
    query {
      items(ids: ${itemId}) {
        column_values(ids: ["${sourceColumnId}"]) {
          id
          text
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      'https://api.monday.com/v2',
      { query },
      {
        headers: {
          Authorization: MONDAY_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    const originalText = response.data.data.items[0]?.column_values[0]?.text;

    if (!originalText) {
      return res.status(404).json({ error: 'No text found in source column' });
    }

    const newText = NameToEmail(originalText);

    // Step 2: Write the edited text to the target column
    const mutation = `
      mutation {
        change_column_value(
          item_id: ${itemId},
          board_id: ${BOARD_ID},
          column_id: "${targetColumnId}",
          value: "${JSON.stringify(newText)}"
        ) {
          id
        }
      }
    `;

    const updateResponse = await axios.post(
      'https://api.monday.com/v2',
      { query: mutation },
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

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


