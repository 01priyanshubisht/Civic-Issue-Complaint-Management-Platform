const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//Insert into DB
app.post("/report", async (req, res) => {
  const { title, description, location, image_url } = req.body;

  // Call ML API
  let category = "Uncategorized";
  try {
    const mlRes = await fetch(
      "https://civic-issue-complaint-management.onrender.com/predict",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: description }),
      }
    );
    const mlData = await mlRes.json();
    category = mlData.category || category;
  } catch (err) {
    console.error("ML service error:", err.message);
  }

  // Insert into Supabase
  const { data, error } = await supabase
    .from("reports")
    .insert([
      { title, description, location, image_url, status: "Pending", category },
    ])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: "Report created", report: data[0] });
});


//Fetch all reports
app.get("/", (req, res) => {
  res.send("CoreSamadhan backend is running!");
});

app.get("/reports", async (req, res) => {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.status(200).json(data);
});
// Update report status
app.put("/report/:id", async (req, res) => {
  try {
    const id = req.params.id;  // keep as string
    const { status } = req.body;

    console.log("PUT request received for ID:", id, "with status:", status);

    const { data, error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", Number(id)) // force cast
      .select();

    console.log("Supabase response:", { data, error });
    if (error) throw error;
    if (!data || data.length === 0) {
      console.log(" No report found with ID:", id);
      return res.status(404).json({ error: "Report not found" });
    }

    console.log("Report updated:", data[0]);
    res.status(200).json({ message: "Report updated", report: data[0] });
  } catch (err) {
    console.error("Error updating report:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete a report
app.delete("/report/:id", async (req, res) => {
  try {
    const id = req.params.id;  // keep as string

    console.log("DELETE request received for ID:", id);

    const { data, error } = await supabase
      .from("reports")
      .delete()
      .eq("id", id)   // pass id as string
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      console.log("No report found with ID:", id);
      return res.status(404).json({ error: "Report not found" });
    }

    console.log("Report deleted:", data[0]);
    res.status(200).json({ message: "Report deleted", report: data[0] });
  } catch (err) {
    console.error("Error deleting report:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
