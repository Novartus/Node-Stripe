const express = require("express");
const app = express();
const stripe = require("./stripe");
const port = 3000;

app.use(express.json());

app.use("/api/", stripe);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
