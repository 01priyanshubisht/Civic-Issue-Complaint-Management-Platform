import supabase from "../config/supabase.js";

class StorageService {
  async uploadImage(file) {
    if (!file) return null;

    // 1. Generate a unique file name
    // Using timestamp and a random string prevents file overwrites
    const fileExt = file.originalname.split(".").pop();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}.${fileExt}`;
    const filePath = `complaints/${fileName}`;

    // 2. Upload to Supabase Storage
    const { error } = await supabase.storage
      .from("complaint-images") // Updated bucket name
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
      });

    if (error) {
      throw new Error(`Failed to upload image: ${error.message}`);
    }

    // 3. Get the public URL
    const { data } = supabase.storage
      .from("complaint-images") // Updated bucket name
      .getPublicUrl(filePath);

    return data.publicUrl;
  }
}

export default new StorageService();
