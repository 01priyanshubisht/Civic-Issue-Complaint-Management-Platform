import supabase from "./src/config/supabase.js";

const test = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("*");

  console.log(data);
  console.log(error);
};

test();