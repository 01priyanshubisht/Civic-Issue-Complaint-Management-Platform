import bgvideo from "./assets/v2.mp4";
export default function App() {
  return (
    <div className="relative h-screen w-screen overflow-hidden">
     
      <video
        autoPlay
        loop
        muted
        className="absolute top-0 left-0 w-full h-full object-cover"
      >
        <source src={bgvideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

    
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>

   
      <nav className="absolute top-0 left-0 w-full flex justify-between items-center px-8 py-4 bg-black/40 backdrop-blur-md text-white">
        <h1 className="text-2xl font-bold text-blue-00">CoreSamadhan</h1>
        <ul className="flex gap-6 text-lg">
          <li>
            <a href="/" className="hover:text-blue-400 transition">
              Home
            </a>
          </li>
          <li>
            <a href="#about" className="hover:text-green-400 transition">
              About
            </a>
          </li>
          <li>
            <a href="#contact" className="hover:text-green-400 transition">
              Contact
            </a>
          </li>
        </ul>
      </nav>


      <div className="relative z-10 flex flex-col items-center justify-center h-full text-center text-white px-6">
        <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">
          CoreSamadhan
        </h1>
        <p className="text-lg text-gray-200 max-w-xl mb-8">
          A Smart Complaint Management System that empowers citizens to report
          problems with ease.
        </p>

        <div className="flex gap-6">
          <a
            href="/user"
            className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-lg hover:bg-green-600 transition transform hover:scale-105"
          >
            User Dashboard
          </a>

          <a
            href="/admin"
            className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg shadow-lg hover:bg-emerald-700 transition transform hover:scale-105"
          >
            Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
