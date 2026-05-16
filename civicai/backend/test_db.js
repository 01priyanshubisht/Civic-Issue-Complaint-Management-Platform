import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function test() {
  const { data, error } = await supabase.from('complaints').insert([
    { title: "test", description: "test", category: "pothole", severity: "Low", priority: "Normal" }
  ]);
  console.log("Error:", error);
}

test();
