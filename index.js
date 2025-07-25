const express = require("express");
const bodyParser = require("body-parser");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3000;
const MONDAY_API_URL = "https://api.monday.com/v2";
const API_TOKEN = process.env.MONDAY_API_TOKEN;

app.use(bodyParser.json());

function nameToEmail(name, domain = "example.com") {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z\s]/g, '') // remove special characters
    .replace(/\s+/g, '.') + '@' + domain;
}

app.post("/generate-email", async (req, res) => {
  try {
    const { event } = req.body;

    const itemId = event.pulseId;
    const boardId = event.boardId;

    // 1. Fetch item name
    const query = {
      query: `query {
        items(ids: ${itemId}) {
          name
        }
      }`
    };

    const itemResponse = await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: API_TOKEN
      },
      body: JSON.stringify(query)
    });

    const itemData = await itemResponse.json();
    const itemName = itemData?.data?.items[0]?.name;

    if (!itemName) {
      return res.status(400).json({ error: "Item name not found." });
    }

    const email = nameToEmail(itemName, "yourdomain.com"); // Replace with your actual domain

    // 2. Update email column
    const mutation = {
      query: `mutation {
        change_column_value(
          board_id: ${boardId},
          item_id: ${itemId},
          column_id: "email",
          value: "{\\"email\\": \\"${email}\\", \\"text\\": \\"${email}\\"}"
        ) {
          id
        }
      }`
    };

    const updateResponse = await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: API_TOKEN
      },
      body: JSON.stringify(mutation)
    });

    const updateData = await updateResponse.json();
    res.json({ success: true, data: updateData });
  } catch (err) {
    console.error("Error processing request:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get("/", (req, res) => {
  res.send("Monday.com Email Generator is running.");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
