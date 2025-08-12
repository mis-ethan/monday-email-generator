const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;
//const BOARD_ID = process.env.BOARD_ID;

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

//print JSON object to console
function traverseObject(obj){
  for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) { // Ensure it's an own property
          const value = obj[key];
          if (typeof value === 'object' && value !== null) {
              console.log(`Key: ${key}, Value is an object. Recursing...`);
              traverseObject(value); // Recursive call for nested objects
          } else {
              console.log(`Key: ${key}, Value: ${value}`);
          }
      }
  }
}


app.post('/generate-email', async (req, res) => {
    const {
    payload: {
      inboundFieldValues: {
        itemId,
        sourceColumnId,
        targetColumnId,
        boardId
      } = {}
    } = {}
  } = req.body;
  
  
  
  //console.log('Received request from Monday:', req.headers, req.body);

  if (!itemId || !sourceColumnId || !targetColumnId || !boardId) {
    console.log('missing required fields');
    return res.status(200).send('OK');
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
      console.log('no data in source column');
      return res.status(200).send('OK');
    }

    const newText = transformText(originalText);
    
    // Step 2: Update the target column using GraphQL variables
    const mutation = `
      mutation ($itemId: ID!, $boardId: ID!, $columnId: String!, $value: JSON!) {
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
      boardId: Number(boardId),
      columnId: targetColumnId,
      value: JSON.stringify({
        text: newText,
        email: newText,
      })
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

//------------------------------------------------------------------------------------------------//
//loaner fob
app.post('/loaner-fob', async (req, res) => {
    var fobNumber; var fobStatus;
    var columns; var fobId;
    
    console.log('Request recieved...');
    const {
    //should recieve
    payload: {
      inboundFieldValues: {
        itemId,
        numberColumnId,
        fobStatusId,
        boardId
      } = {}
    } = {}
  } = req.body;
  
  
  
  //console.log('Received request from Monday:', req.headers, req.body);

  //check if empty
  if (!itemId || !fobStatusId || !boardId || !numberColumnId) {
    console.log('missing required fields');
    return res.status(200).send('OK');
  }

  // Step 1: Set up query
  const fetchQuery1 = `
    mutation($itemId: ID!){
      delete_item(item_id: $itemId) {
        name
        column_values {
          id
          text
        }
      }
    }
  `;
    

  //query one to get fob #
  try{
    const fetchResponse1 = await axios.post(
      'https://api.monday.com/v2',
      {
        query: fetchQuery1,
        variables: { itemId: Number(itemId)}
      },
      {
        headers: {
          Authorization: MONDAY_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    columns = fetchResponse1.data.data.items[0].column_values;
    const numberColumn = columns.find(col => col.id === numberColumnId);
    const statusColumn = columns.find(col => col.id === fobStatusId);
    fobNumber = numberColumn?.text;
    fobStatus = statusColumn?.text;
    
    console.log("Fob "+ fobNumber);// + " status is " + fobStatus);
    if(!fobNumber){
      console.log('fob number empty');
      return res.status(200).send("OK");
    }
    //return res.status(200).send("OK");
  }
  catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return res.status(200).send("OK");
  }

  
  const fetchQuery2 = `
    query ($boardId: [ID!]){
          boards(ids: $boardId) {
              items_page{
                items{
                  id
                  name
                  column_values{
                    id
                    text
                  }
                }
              }
          }
    }
  `;
  
  try {
    const fetchResponse2 = await axios.post(
      'https://api.monday.com/v2',
      {
        query: fetchQuery2,
        variables: { boardId: Number(boardId) }
      },
      {
        headers: {
          Authorization: MONDAY_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    //const columns = fetchResponse2.data.data.items;
    //const oldItem = 
    //const newItem = 

    
    
    if (!fetchResponse2) {
      console.log('no fob with that number currently in system');
      return res.status(200).send('OK');
    }
    else{
      let item =fetchResponse2.data.data.boards[0].items_page.items;
      
      /*for(const itemKey in fetchResponse2.data.data.boards[0].items_page){
        console.log("searching for items...");
        const item = fetchResponse2.data.data.boards[0].items_page[itemKey];
        const columns = item.column_values;
        for(const columnKey in columns){
          console.log(colums[columnKey]);
        }
      }*/

    //update fob status
    const updateFob = `
      mutation ($fobId: ID!, $boardId: ID!, $columnId: String!, $value: JSON!) {
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

    let variables = {
      fobId: Number(fobId),
      boardId: Number(boardId),
      columnId: fobStatusId,
      value: fobStatus
    };
    
    
      //find correct item from list
      for(key in item){
          console.log("item name: " + item[key].name);
        
          if(item[key].name == ("Fob " + fobNumber)){
              let cValues = item[key].column_values;
              let oldStatus = cValues.find(col => col.id === "status").text;
              console.log("new status is: " + fobStatus);
              fobId = item[key].id;
            //update status
              const updateResponse = await axios.post(
                  'https://api.monday.com/v2',
                  { query: updateFob, variables },
                  {
                    headers: {
                      Authorization: MONDAY_API_TOKEN,
                      'Content-Type': 'application/json'
                    }
                  }
                );

              console.log("updating status...");
              if( fobStatus == "Loaning"){
                          //remove employee name and email
                          console.log("updating name and email...");
              }
              console.log("deleting duplicate...");  
          }
      }
        //else{console.log(Object.entries(data[key].column_values[3].text));}
      }
      //traverseObject(data);

    //console.log(columns);

    /*get other fob itemID
    
    
    // Step 2: Delete old item entry if valid request
    const mutation = `
      mutation ($itemId: ID!, $boardId: ID!, $columnId: String!, $value: JSON!) {
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
      boardId: Number(boardId),
      columnId: targetColumnId,
      value: JSON.stringify({
        text: newText,
        email: newText,
      })
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
    });*/
    console.log('fob status updated');
    return res.status(200).send('OK');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

