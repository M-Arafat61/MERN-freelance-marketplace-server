const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.05pkqvm.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const categoryCollection = client
      .db("jobDatabase")
      .collection("categories");
    const jobCollection = client.db("jobDatabase").collection("addedJobs");
    const appliedJobCollection = client
      .db("jobDatabase")
      .collection("appliedJobs");

    app.get("/api/v1/categories", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });
    app.get("/api/v1/jobs-by-category/:category", async (req, res) => {
      const category = req.params.category;
      const result = await jobCollection.find({ category: category }).toArray();

      res.send(result);
    });

    app.get("/api/v1/jobs", async (req, res) => {
      const result = await jobCollection.find().toArray();
      res.send(result);
    });

    app.get("/api/v1/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.send(result);
    });

    app.post("/api/v1/addJobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    });

    app.post("/api/v1/appliedJobs", async (req, res) => {
      const jobApplication = req.body;
      const result = appliedJobCollection.insertOne(jobApplication);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment to MongoDB!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("IT job server");
});

app.listen(port, () => {
  console.log(`IT job server: ${port}`);
});
