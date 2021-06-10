require('dotenv').config();
const express = require('express');
const cors = require('cors');

const routes = require('./routes');

require('./database');

const app = express();

app.use(cors());
app.use(express.json());
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});
app.use(routes);

app.listen(process.env.PORT);