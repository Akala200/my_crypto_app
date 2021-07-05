const express = require('express');
const bodyParser = require('body-parser');
const Blockchain = require('../blockchain');
const P2pServer = require('./p2p-server');
const Wallet = require('../wallet');
const TransactionPool = require('../wallet/transaction-pool');
const Miner = require('./miner');

const HTTP_PORT = process.env.HTTP_PORT || 3001;

const app = express();
const bc = new Blockchain();
const wallet = new Wallet();
const tp = new TransactionPool();
const p2pServer = new P2pServer(bc, tp);
const miner = new Miner(bc, tp, wallet, p2pServer);

app.use(express.json({ limit: "90mb" }));

app.get('/blocks', (req, res) => {
  res.json(bc.chain);
});

app.post('/mine', (req, res) => {
  const block = bc.addBlock(req.body.data);
  console.log(`New block added: ${block.toString()}`);

  p2pServer.syncChains();

  res.redirect('/blocks');
});

app.get('/transactions', (req, res) => {
  res.json(tp.transactions);
});

app.post('/transact', (req, res) => {
  const { recipient, amount } = req.body;
  const transaction = wallet.createTransaction(recipient, amount, bc, tp);
  p2pServer.broadcastTransaction(transaction);
  res.redirect('/transactions');
});

app.post("/new/account", (req, res) => {
  const walletNewAccount = new Wallet();

    res.json({
      publicKey: walletNewAccount.publicKey,
      balance: walletNewAccount.balance,
      keyPair: walletNewAccount.keyPair,
    });
});


app.post("/send", (req, res) => {
  const { recipient, amount, senderWallet } = req.body;
  const transaction = wallet.createTransactionUser(recipient, amount, bc, tp, senderWallet);
  p2pServer.broadcastTransaction(transaction);
  res.json(transaction);
});

app.get("/balance", (req, res) => {
   let tp, bc;
   const { address } = req.query;
   tp = new TransactionPool();
   bc = new Blockchain();

  const result = wallet.calculateBalanceUser(bc, address);
  console.log(result);
  res.json({
    balance: result,
  });
});

app.get('/mine-transactions', (req, res) => {
  const block = miner.mine();
  console.log(`New block added: ${block.toString()}`);
  res.redirect('/blocks');
});

app.get('/public-key', (req, res) => {
  res.json({ publicKey: wallet.publicKey });
});

app.listen(HTTP_PORT, () => console.log(`Listening on port ${HTTP_PORT}`));
p2pServer.listen();