const express = require('express');
const path = require('path');
const fs = require('fs');
const mongodb = require('mongodb');
const cors = require('cors');
const ObjectID = mongodb.ObjectID;
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const MongoClient = mongodb.MongoClient;
let db;
const dbConnection = async () => {
  await MongoClient.connect(
    process.env.DB_URI,
    { useUnifiedTopology: true },
    (err, client) => {
      db = client.db('psa');
      console.log('db connected');
    }
  );
};
dbConnection();

// Middleware to log requests
app.use(function requestHandler(request, response, next) {
  console.log('In comes a ' + request.method + ' to: ' + request.url);
  next();
});

// Middleware for static files
app.use(function (req, res, next) {
  var filePath = path.join(__dirname, 'static', req.url);

  fs.stat(filePath, function (err, fileInfo) {
    if (err) {
      next();
      return;
    }
    if (fileInfo.isFile()) {
      return res.sendFile(filePath);
    }
    next();
  });
});

// Get the collection Name
app.param('collectionName', (req, res, next, collectionName) => {
  req.collection = db.collection(collectionName);
  return next();
});

app.get('/', (req, res) => {
  res.json({
    status: 'up',
    message:
      'Api is working, Please select a collection, eg collection/messages..',
  });
});

app.get('/collection/:collectionName', (req, res) => {
  req.collection.find({}).toArray((e, results) => {
    if (e) return next(e);
    res.json({ status: 'success', results });
  });
});

app.post('/order/createOrder', (req, res, next) => {
  db.collection('orders').insertOne(req.body, (e, results) => {
    if (e) return next(e);
    res.json({ status: 'success', results: results.ops });
  });
});

app.post('/collection/:collectionName', (req, res, next) => {
  req.collection.insert(req.body, (e, results) => {
    if (e) return next(e);
    res.json({ status: 'success', results: results.ops });
  });
});

app.put('/collection/:collectionName/:id', (req, res, next) => {
  req.collection.update(
    { _id: new ObjectID(req.params.id) },
    { $set: req.body },
    { safe: true, multi: false },
    (e, result) => {
      if (e) return next(e);
      if (result.result.n === 1) {
        return res.json({ status: 'success', message: 'Update successful' });
      } else {
        return res.json({ status: 'error', message: 'Error updating!' });
      }
    }
  );
});

app.delete('/collection/:collectionName/:id', (req, res, next) => {
  req.collection.deleteOne({ _id: ObjectID(req.params.id) }, (e, result) => {
    if (e) return next(e);
    if (result.result.n === 1) {
      return res.json({ status: 'success', message: 'Delete successful' });
    } else {
      return res.json({ status: 'error', message: 'Error deleting!' });
    }
  });
});

const port = process.env.PORT || 2000;
app.listen(port);
console.log('server running on Port 2000');
