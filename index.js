const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

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
app.use(cookieParser());

const logger = async (req, res, next) => {
  console.log("called", req.hostname, req.originalUrl);
  next();
};
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

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

    // user auth api
    app.post("/api/v1/auth/jwt", logger, async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
          // sameSite: "strict",
        })

        .send({ success: true });
    });

    app.post("/api/v1/auth/logout", async (req, res) => {
      const user = req.body;
      console.log("logged out user", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

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
    app.get("/api/v1/myPostedJobs", logger, verifyToken, async (req, res) => {
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/api/v1/bidRequests", logger, verifyToken, async (req, res) => {
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      let query = {};

      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await appliedJobCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/api/v1/myBids", async (req, res) => {
      const result = await appliedJobCollection.find().toArray();
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

    app.patch("/api/v1/updateJob/:jobId", async (req, res) => {
      const id = req.params.jobId;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedJob = req.body;

      const updateDoc = {
        $set: {
          email: updatedJob.email,
          title: updatedJob.title,
          deadline: updatedJob.deadline,
          description: updatedJob.description,
          minimumPrice: updatedJob.minimumPrice,
          maximumPrice: updatedJob.maximumPrice,
          category: updatedJob.category,
        },
      };

      const result = await jobCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    app.patch("/api/v1/statusReject/:bidId", async (req, res) => {
      const id = req.params.bidId;
      const filter = { _id: new ObjectId(id) };
      const updatedBidRequest = req.body;
      const updateDoc = {
        $set: {
          status: updatedBidRequest.status,
        },
      };
      const result = await appliedJobCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/api/v1/statusAccept/:bidId", async (req, res) => {
      const id = req.params.bidId;
      const filter = { _id: new ObjectId(id) };
      const updatedBidRequest = req.body;
      const updateDoc = {
        $set: {
          status: updatedBidRequest.status,
        },
      };
      const result = await appliedJobCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    app.patch("/api/v1/statusComplete/:bidId", async (req, res) => {
      const id = req.params.bidId;
      const filter = { _id: new ObjectId(id) };
      const updateBidCompletion = req.body;
      const updateDoc = {
        $set: {
          status: updateBidCompletion.status,
        },
      };
      const result = await appliedJobCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/api/v1/deleteJob/:jobId", async (req, res) => {
      const id = req.params.jobId;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.deleteOne(query);
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
