import { assert } from 'console';
import * as dotenv from 'dotenv'
import { OutputFileType } from 'typescript';
dotenv.config()
import WebSocket from 'ws';


type AsksBids = {
  id: string;
  price: string;
  volume: string;
}

type Book = {
  sequence: string;
  asks: AsksBids[];
  bids: AsksBids[];
  status: string;
  timestamp: bigint;
}

type TradeUpdate = {
  base: string;
  counter: string;
  maker_order_id: string;
  taker_order_id: string;
}

type CreateUpdate = { 
  order_id: string;
  type: string;
  price: string;
  volume: string;
}

type DeleteUpdate = {
  order_id: string;
}

type StatusUpdate = {
  status: string | null;
}

type BookUpdate = {
  sequence: string;
  trade_update: TradeUpdate[];
  create_update: CreateUpdate | null;
  delete_update: DeleteUpdate | null;
  status_update: StatusUpdate | null;
  timestamp: bigint;
}

var firstMessage: boolean = true
var book: Book
var canUpdate: boolean = true
var reConnect: boolean = false

const createBook = (data: Book) => {
  book = data
}

const sequenceCheck = (sequence: string) => {
  const biSeq: bigint = BigInt(sequence)
  const curSeq: bigint = BigInt(book.sequence)

  if(curSeq < biSeq) {
    reConnect = true
  }
}

const sequenceUpdate = (sequence: string) => {
  book.sequence = sequence
}

const statusUpdate = (status: StatusUpdate) => {
  if(status?.status) {
    book.status = status.status
    if(book.status === 'ACTIVE') {
      canUpdate = true
    } else {
      canUpdate = false
    }
  }
}

const tradeUpdate = (trade: TradeUpdate[]) => {

}

// BID - highest to lowest
const findBidIndex = (price: string) : number => {
  const fPrice: number = parseFloat(price)
  return book.bids.findIndex(e => parseFloat(e.price) < fPrice)
}

// ASK - lowest to highest
const findAskIndex = (price: string) : number => {
  const fPrice: number = parseFloat(price)
  return book.asks.findIndex(e => parseFloat(e.price) > fPrice)
}

const bookStats = () => {
  const stats = {
    pair: {
      name: 
      'XBTZAR'
    },
    bids: {
      first: book.bids[0].price,
      last: book.bids[book.bids.length-1].price,
      length: book.bids.length
    },
    asks: {
      first: book.asks[0].price,
      last: book.asks[book.asks.length-1].price,
      length: book.asks.length
    }
  }
  console.clear()
  console.table(stats)
}

const createUpdate = (create: CreateUpdate) => {
  assert(create.type === 'ASK' || create.type === 'BID')
  if(create.type === 'ASK') {
    const insertIndex: number = findAskIndex(create.price)
    const nAsk: AsksBids = {
      id: create.order_id,
      price: create.price,
      volume: create.volume
    }
    if(insertIndex !== -1) {
      book.asks.splice(insertIndex, 0, nAsk)
    } else {
      book.asks.push(nAsk)
    }
  } else {
    const insertIndex: number = findBidIndex(create.price)
    const nBid: AsksBids = {
      id: create.order_id,
      price: create.price,
      volume: create.volume
    }
    if(insertIndex !== -1) {
      book.bids.splice(insertIndex, 0, nBid)
    } else {
      book.bids.push(nBid)
    }
  }
  bookStats()
}

const deleteUpdate = (deleteU: DeleteUpdate) => {
  book.asks = book.asks.filter(e => e.id !== deleteU.order_id)
  book.bids = book.bids.filter(e => e.id !== deleteU.order_id)
}

const updateBook = (data: BookUpdate) => {
  sequenceCheck(data.sequence)
  if(canUpdate) {
    if(data?.create_update) {
      createUpdate(data.create_update)
    }
    if(data?.delete_update) {
      deleteUpdate(data.delete_update)
    }
    if(data?.trade_update) {
      tradeUpdate(data.trade_update)
    }
  }

  if(data?.status_update) {
    statusUpdate(data.status_update)
  }
  sequenceUpdate(data.sequence)
}

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
  const jData: any = JSON.parse(data.toString())
  if(!firstMessage) {
    const updateData: BookUpdate = jData as BookUpdate;
    updateBook(updateData)
  } else {    
    const bookData: Book = jData as Book;
    createBook(bookData)
    firstMessage=false
  }
});
