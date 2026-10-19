
const express = require("express");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const PORT = 3000;

// Local MongoDB connection
const client = new MongoClient("mongodb://127.0.0.1:27017");

app.use(express.json());

// Serve files from the public folder
app.use(express.static(path.join(__dirname, "public")));

let foods;

// HOME PAGE
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 1. VIEW ALL FOOD ITEMS
app.get("/foods", async (req, res) => {
    try {
        const result = await foods.find().toArray();
        res.json(result);
    } catch (err) {
        console.error("Fetch error:", err);
        res.status(500).json({ error: "Failed to load food items" });
    }
});

// 2. ADD A FOOD ITEM
app.post("/foods", async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const price = Number(req.body.price);

        if (!name || req.body.price === "" ||
            req.body.price == null || !Number.isFinite(price) ||
            price < 0) {
            return res.status(400).json({
                error: "Enter a valid food name and price"
            });
        }

        const result = await foods.insertOne({ name, price });

        res.status(201).json({
            message: "Food added successfully",
            _id: result.insertedId
        });
    } catch (err) {
        console.error("Add error:", err);
        res.status(500).json({ error: "Failed to add food" });
    }
});

// 3. EDIT / UPDATE A FOOD ITEM
app.put("/foods/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const name = String(req.body.name || "").trim();
        const price = Number(req.body.price);

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid food ID" });
        }

        if (!name || req.body.price === "" ||
            req.body.price == null || !Number.isFinite(price) ||
            price < 0) {
            return res.status(400).json({
                error: "Enter a valid food name and price"
            });
        }

        const result = await foods.updateOne(
            { _id: new ObjectId(id) },
            { $set: { name: name, price: price } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Food item not found" });
        }

        res.json({ message: "Food updated successfully" });
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).json({ error: "Failed to update food" });
    }
});

// 4. DELETE A FOOD ITEM
app.delete("/foods/:id", async (req, res) => {
    try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ error: "Invalid food ID" });
        }

        const result = await foods.deleteOne({
            _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Food item not found" });
        }

        res.json({ message: "Food deleted successfully" });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).json({ error: "Failed to delete food" });
    }
});

// HANDLE UNKNOWN ROUTES
app.use((req, res) => {
    res.status(404).json({
        error: "Route not found: " + req.method + " " + req.originalUrl
    });
});

// CONNECT DATABASE, THEN START SERVER
async function startServer() {
    try {
        await client.connect();

        const db = client.db("foodDB");
        foods = db.collection("foods");

        const server = app.listen(PORT, () => {
            console.log("MongoDB connected successfully!");
            console.log("Food collection: foodDB.foods");
            console.log("Server running at http://localhost:" + PORT);
            console.log("Routes: GET, POST, PUT, DELETE /foods");
        });

        // Close the database connection if the server stops
        process.on("SIGINT", async () => {
            server.close();
            await client.close();
            process.exit(0);
        });
    } catch (err) {
        console.error("Could not start server:", err.message);
        await client.close().catch(() => {});
        process.exitCode = 1;
    }
}

startServer();
