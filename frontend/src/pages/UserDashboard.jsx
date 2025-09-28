import { useState } from "react";
import photo from "../assets/v1.mp4";
import supabase from "../supabaseClient";

export default function UserDashboard() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    file: null,
  });

  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [predictedCategory, setPredictedCategory] = useState(""); // NEW

  //Handle form field change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  //Capture user location
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
        setFormData((prev) => ({ ...prev, location: coords }));
      });
    } else {
      alert("Geolocation not supported");
    }
  };

  // Voice Input (Web Speech API)
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.start();
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setFormData((prev) => ({
        ...prev,
        description: prev.description + " " + transcript,
      }));
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setMessage("Voice input error: " + event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let imageUrl = "";

      if (formData.file) {
        const safeName = formData.file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `${Date.now()}-${safeName}`;

        const { error } = await supabase.storage
          .from("complaint-images")
          .upload(fileName, formData.file);

        if (error) throw error;

        const { data: publicUrl } = supabase.storage
          .from("complaint-images")
          .getPublicUrl(fileName);

        imageUrl = publicUrl.publicUrl;
      }

      const res = await fetch("http://localhost:8000/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          location: formData.location,
          image_url: imageUrl,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage("Report submitted successfully!");
        setPredictedCategory(data.report.category); // NEW
        setFormData({ title: "", description: "", location: "", file: null });
      } else {
        setMessage("Error: " + data.error);
      }
    } catch (err) {
      setMessage("Upload Error: " + err.message);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden font-sans">
      <video
        autoPlay
        loop
        muted
        className="absolute top-0 left-0 w-full h-full object-cover"
      >
        <source src={photo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/60"></div>

      <div className="relative flex items-center justify-center h-full">
        <div className="w-full max-w-xl p-8 rounded-2xl backdrop-blur-lg bg-white/20 shadow-2xl border border-white/30">
          <h2 className="text-4xl font-extrabold mb-6 text-center text-white">
            Submit Complaint
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="text"
              name="title"
              placeholder="Enter Title"
              value={formData.title}
              onChange={handleChange}
              className="w-full p-3 rounded-xl bg-white/30 text-white placeholder-gray-200 border border-white/40 focus:ring-2 focus:ring-pink-400 focus:outline-none backdrop-blur-md"
              required
            />

            <div className="flex items-start gap-2">
              <textarea
                name="description"
                placeholder="Enter Description or use voice"
                value={formData.description}
                onChange={handleChange}
                className="flex-1 p-3 rounded-xl bg-white/30 text-white placeholder-gray-200 border border-white/40 focus:ring-2 focus:ring-pink-400 focus:outline-none backdrop-blur-md"
                rows={3}
                required
              />
              <button
                type="button"
                onClick={startListening}
                className={`px-4 py-3 rounded-xl font-semibold text-white shadow-lg transition ${
                  isListening
                    ? "bg-red-500 animate-pulse"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-indigo-600 hover:to-purple-700"
                }`}
              >
                {isListening ? " Listening" : " Speak"}
              </button>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setFormData({ ...formData, file: e.target.files[0] })
              }
              className="w-full p-3 rounded-xl bg-white/30 text-white placeholder-gray-200 border border-white/40"
            />

            <div className="flex items-center gap-2">
              <input
                type="text"
                name="location"
                placeholder="Location (auto from GPS)"
                value={formData.location}
                onChange={handleChange}
                className="flex-1 p-3 rounded-xl bg-white/30 text-white placeholder-gray-200 border border-white/40 focus:ring-2 focus:ring-pink-400 focus:outline-none backdrop-blur-md"
                required
              />
              <button
                type="button"
                onClick={getLocation}
                className="px-4 py-3   text-white font-bold rounded-xl shadow-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-indigo-600 hover:to-purple-700 transition"
              >
                Auto
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-3 font-bold text-lg text-white rounded-xl shadow-xl bg-gradient-to-r from-blue-500 to-yellow-600 hover:from-blue-600 hover:to-yellow-700 transition"
            >
              Submit Complaint
            </button>
          </form>
          {predictedCategory && (
            <p className="mt-6 text-center text-green-300 font-semibold bg-black/40 p-2 rounded">
              Predicted Category:{" "}
              <span className="capitalize">{predictedCategory}</span>
            </p>
          )}

          {message && (
            <p className="mt-4 text-center text-white font-medium bg-black/30 p-2 rounded">
              {message}
            </p>
          )}
          <div className="text-center mt-6">
            {" "}
            <a
              href="/"
              className="text-blue-300 hover:text-blue-800 font-semibold hover:underline transition"
            >
              {" "}
              ← Back to Home{" "}
            </a>{" "}
          </div>
        </div>
      </div>
    </div>
  );
}
