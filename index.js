const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { Server } = require("socket.io");
const http = require("http");
const helmett = require("helmet");
const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:5173",
//     methods: ["GET", "POST"],
//   },
// });

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://task-manager-d91ea.web.app"],
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
const helmet = require("helmet");

app.use(
  helmett({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:"], // Allow base64 images
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qgrba.mongodb.net/task-manager?retryWrites=true&w=majority&appName=Cluster0`;
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
    const db = client.db("task-manager");
    const tasksCollection = db.collection("tasks");
    const usersCollection = db.collection("users");

    // Save user
    app.post("/user", async (req, res) => {
      const userData = req.body;
      const result = await usersCollection.insertOne(userData);
      res.send(result);
    });

    // task Post Route

    // Get all users
    app.get("/user", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // // Add a new task
    app.post("/tasks", async (req, res) => {
      try {
        const { title, description, email, category } = req.body;
        const newTask = { title, description, email, category, order: 0 };
        const result = await tasksCollection.insertOne(newTask);
        res.status(201).send(result); // MongoDB will generate an `_id` automatically
      } catch (error) {
        res.status(500).send({ error: "Failed to add task" });
      }
    });

    // 🔹 GET Tasks by Email
    app.get("/tasks", async (req, res) => {
      const { email } = req.query;
      // console.log(email);
      if (!email) return res.status(400).json({ error: "Email is required" });

      const result = await tasksCollection.find({ user: email }).toArray();
      // console.log(result);
      res.status(200).json(result);
    });

    // 🔹 PATCH: Update Task Category (Drag & Drop)
    app.patch("/drag_tasks", async (req, res) => {
      const { taskId, newCategory } = req.body;
      // console.log(taskId, newCategory);

      const task = await tasksCollection.findOneAndUpdate(
        { id: taskId },
        { $set: { category: newCategory } },
        { returnDocument: "after" }
      );

      if (!task) return res.status(404).json({ error: "Task not found" });

      return res.status(200).json(task);
    });

    // 🔹 PATCH: Update or Insert Task
    app.patch("/tasks", async (req, res) => {
      const { newTask } = req.body;
      if (!newTask || !newTask.id)
        return res
          .status(400)
          .json({ error: "newTask with an id is required" });

      const existingTask = await tasksCollection.findOne({
        id: newTask.id,
      });

      if (existingTask) {
        const updatedTask = await tasksCollection.findOneAndUpdate(
          { id: newTask.id },
          { $set: newTask },
          { returnDocument: "after" }
        );
        return res.status(200).json(updatedTask);
      } else {
        const insertedTask = await tasksCollection.insertOne(newTask);
        return res.status(201).json(insertedTask);
      }
    });

    // 🔹 DELETE: Remove Task
    app.delete("/tasks", async (req, res) => {
      const { taskId } = req.body;
      if (!taskId) return res.status(400).json({ error: "taskId is required" });

      const deletedTask = await tasksCollection.deleteOne({
        id: taskId,
      });

      if (deletedTask.deletedCount === 0)
        return res.status(404).json({ error: "Task not found" });

      res.status(200).json({ message: "Task deleted successfully" });
    });

    app.get("/", (req, res) => {
      res.send("Task Management API is Running!");
    });

  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
