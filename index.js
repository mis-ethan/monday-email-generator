const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

app.post("/generate-email", async (req, res) => {
  try {
    const { inputFields, event } = req.body;

    const itemId = event.pulseId;
    const boardId = event.boardId;
    const nameColumnId = inputFields.name_column;
    const emailColumnId = inputFields.email_column;

    const name = event.column_values.find(c => c.id === nameColumnId)?.text;

    if (!name) {
      return res.status(400).json({ error: "Name column is empty or missing." });
    }

    // Generate email
    const [first, last] = name.toLowerCase().split(" ");
    const email = `${first}.${last}@ochsinc.org`;

    const query = `
      mutation {
        change_column_value(
          board_id: ${boardId},
          item_id: ${itemId},
          column_id: "${emailColumnId}",
          value: "\\"${email}\\""
        ) {
          id
        }
      }
    `;

    await axios.post("https://api.monday.com/v2", { query }, {
      headers: {
        Authorization: process.env.MONDAY_API_TOKEN,
        "Content-Type": "application/json"
      }
    });

    res.json({ success: true, email });
  } catch (error) {
    console.error("Error generating email:", error);
    res.status(500).json({ error: "Failed to generate email." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
