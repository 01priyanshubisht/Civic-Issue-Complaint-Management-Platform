import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from "./Input";
import Select from "./Select";
import Button from "./Button";
import LocationPickerMap from "./LocationPickerMap";
import complaintService from "../services/complaint.service";

const CreateComplaintForm = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [position, setPosition] = useState(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImage(null);
      setImagePreview(null);
    }
  };

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setIsLocating(false);
      },
      (err) => {
        setLocationError('Unable to retrieve your location. Please check permissions.');
        setIsLocating(false);
      }
    );
  };

  // Initialize Speech Recognition
  let recognition = null;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
  }

  useEffect(() => {
    if (!recognition) setSpeechSupported(false);
  }, []);

  const toggleListen = () => {
    if (!recognition) return;
    
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      recognition.start();
      setIsListening(true);
      
      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentTranscript += event.results[i][0].transcript;
          }
        }
        if (currentTranscript) {
          setDescription(prev => prev + (prev ? ' ' : '') + currentTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
        setIsListening(false);
      };
    }
  };

  const categories = [
    { value: 'pothole', label: 'Pothole' },
    { value: 'broken_streetlight', label: 'Broken Street Light' },
    { value: 'garbage', label: 'Garbage Dump' },
    { value: 'waterlogging', label: 'Waterlogging / Flooding' },
    { value: 'road_damage', label: 'Road Damage' },
    { value: 'others', label: 'Other' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!position) {
      setError('Please click on the map to set the issue location.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('latitude', position[0]);
      formData.append('longitude', position[1]);
      
      if (image) {
        formData.append('image', image);
      }

      const res = await complaintService.createComplaint(formData);
      
      // Notify the user if the ML engine merged their complaint
      if (res.data?.data?._ai_action === "merged_duplicate") {
        const simScore = Math.round((res.data.data._similarity_score || 0) * 100);
        window.alert(`✨ DUPLICATE DETECTED ✨\n\nOur AI engine noticed that this exact issue was already reported in this area (${simScore}% similarity).\n\nInstead of creating a new ticket, we have merged your evidence with the existing report to increase its priority!`);
      }
      
      navigate('/dashboard');
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit complaint.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">
          {error}
        </div>
      )}

      <Input
        label="Issue Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="E.g., Large pothole on Main St."
        required
      />

      <Select
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        options={categories}
        required
      />

      <div>
        <div className="flex justify-between items-end mb-1">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          {speechSupported && (
            <button
              type="button"
              onClick={toggleListen}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-medium transition ${isListening ? 'bg-red-100 text-red-700 animate-pulse ring-1 ring-red-300' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 ring-1 ring-gray-200'}`}
            >
              {isListening ? '🛑 Stop Listening' : '🎤 Dictate'}
            </button>
          )}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Provide more details about the issue... You can type or use the dictate button."
          rows={4}
          required
          className="block w-full rounded-md border-gray-300 shadow-sm p-3 border focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-slate-700">Image Evidence (Optional)</label>
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition"
            />
          </div>
          {imagePreview && (
            <div className="w-24 h-24 rounded border border-slate-200 overflow-hidden bg-slate-50 flex-shrink-0">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <label className="block text-sm font-medium text-slate-700">Incident Location</label>
          <button 
            type="button" 
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded transition disabled:opacity-50 border border-blue-200"
          >
            {isLocating ? 'Fetching GPS...' : '📍 Use My Current Location'}
          </button>
        </div>
        {locationError && <p className="text-sm text-red-600">{locationError}</p>}
        
        <div className="rounded border border-slate-200 overflow-hidden">
          <LocationPickerMap position={position} setPosition={setPosition} />
        </div>
        
        {position && (
          <p className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-100">
            Coordinates: {position[0].toFixed(6)}, {position[1].toFixed(6)}
          </p>
        )}
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          className="mr-3"
          onClick={() => navigate('/dashboard')}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Submit Issue
        </Button>
      </div>
    </form>
  );
};

export default CreateComplaintForm;
