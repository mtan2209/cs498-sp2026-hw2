const { Datastore } = require("@google-cloud/datastore");
const express = require("express");
const app = express();

const datastore = new Datastore();
app.use(express.json());

app.get("/greeting", (req, res) => {
  res.send("<h1>Hello World!</h1>");
});

app.post("/register", async (req, res) => {
    const username = req.body.username;
    const userKey = datastore.key(["User", username]);
    await datastore.save({
      key: userKey,
      data: { username: username },
    });
    res.status(200).json({ message: "User registered" });
});
app.get("/list", async (req, res) => {
  const query = datastore.createQuery("User");
  const [users] = await datastore.runQuery(query);
  const usernames = users.map((user) => user.username);
  res.json({ users: usernames });
});

app.post("/clear", async (req, res) => {
  const query = datastore.createQuery("User");
  const [users] = await datastore.runQuery(query);
  const keys = users.map((user) => user[datastore.KEY]);
  if (keys.length > 0) {
    await datastore.delete(keys);
  }
  res.status(200).json({ message: "Cleared" });
});

app.listen(8080, "0.0.0.0", () => {
    console.log("Server running on port 8080");
});