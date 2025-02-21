const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const port = process.env.PORT || 5000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qgrba.mongodb.net/task-manager?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
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

    // Get all users
    app.get("/user", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Add a new task (Removed verifyToken)
    app.post("/tasks", async (req, res) => {
      try {
        const { title, description, email, category } = req.body;
        const newTask = { title, description, email, category, order: 0 };
        const result = await tasksCollection.insertOne(newTask);
        res.status(201).send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to add task" });
      }
    });

    // Get all tasks for a user (Removed verifyToken)
    app.get("/tasks/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await tasksCollection.find({ email }).sort({ order: 1 }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to retrieve tasks" });
      }
    });

    // Update Task Order (Drag & Drop) (Removed verifyToken)
    app.put("/tasks/reorder", async (req, res) => {
      try {
        const { tasks } = req.body;
        const bulkOps = tasks.map((task, index) => ({
          updateOne: {
            filter: { _id: new ObjectId(task._id) },
            update: { $set: { order: index, category: task.category } },
          },
        }));
        await tasksCollection.bulkWrite(bulkOps);
        io.emit("taskUpdated");
        res.send({ message: "Tasks reordered successfully" });
      } catch (error) {
        res.status(500).send({ error: "Failed to reorder tasks" });
      }
    });

    // Delete a task (Removed verifyToken)
    app.delete("/tasks/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount > 0) {
          res.send({ message: "Task deleted successfully" });
        } else {
          res.status(404).send({ error: "Task not found" });
        }
      } catch (error) {
        res.status(500).send({ error: "Failed to delete task" });
      }
    });

    io.on("connection", (socket) => {
      console.log("New client connected");
      socket.on("disconnect", () => console.log("Client disconnected"));
    });
  } finally {}
}

run().catch(console.dir);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
