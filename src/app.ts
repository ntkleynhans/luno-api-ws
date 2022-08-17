import * as dotenv from 'dotenv'
dotenv.config()
import WebSocket from 'ws';


const ws = new WebSocket('wss://ws.luno.com/api/1/stream/XBTZAR', {
  perMessageDeflate: false
});

ws.on('open',  () => {
   const apiKey = {
      "api_key_id": process.env.API_KEY_ID,
      "api_key_secret": process.env.API_SECRET
    }
    ws.send(JSON.stringify(apiKey))
})

ws.on('message', (data) =>  {
  console.log('received: %s', data);
});
