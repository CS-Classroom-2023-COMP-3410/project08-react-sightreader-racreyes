import React, { useState, useEffect, useRef } from "react";
import abcjs from "abcjs"
import "../public/css/App.css"; // Your custom styling, if needed

export default function App() {
  // Microphone devices
  const [devices, setDevices] = useState([]);
  // Currently selected mic deviceId
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  // ABC notation text
  const [abcText, setAbcText] = useState("");

  // Keep track of the active MediaStream so we can stop it.
  const streamRef = useRef(null);

  useEffect(() => {
    // Request mic permission so device labels become visible
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(() => navigator.mediaDevices.enumerateDevices())
      .then((allDevices) => {
        const audioInputs = allDevices.filter((d) => d.kind === "audioinput");
        setDevices(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      })
      .catch((err) => {
        console.error("Could not enumerate devices or get mic permission:", err);
      });

    // Example ABC content
    setAbcText(`
X:1
T:My Tune
M:4/4
K:C
C D E F|G A B c|
    `);

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (abcText && abcjs) {
      abcjs.renderAbc("notation", abcText.trim(), {});
    }
  }, [abcText]);

  const handleMicChange = (e) => {
    setSelectedDeviceId(e.target.value);
  };

  const handleStart = async () => {
    console.log("Start pressed - begin mic/pitch detection!");

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined },
      });
      streamRef.current = stream;
      console.log("Got stream from device:", selectedDeviceId);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const handleReset = () => {
    console.log("Reset pressed - reset states, scores, etc.");
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  return (
    <div className="main-container">
      <h3>ABC Sightreader</h3>
      <div className="controls">
        <label htmlFor="devices">Microphone:</label>
        <select id="devices" value={selectedDeviceId} onChange={handleMicChange}>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || d.deviceId}
            </option>
          ))}
        </select>
        <button id="start" onClick={handleStart}>Start</button>
        <button id="reset" onClick={handleReset}>Reset</button>
      </div>
      <div className="abc-textarea-container">
        <textarea
          id="abc-textarea"
          value={abcText}
          onChange={(e) => setAbcText(e.target.value)}
        />
      </div>
      <div id="notation"></div>
    </div>
  );
}
