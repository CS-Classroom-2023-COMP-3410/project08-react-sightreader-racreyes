import React, { useState, useEffect, useRef } from "react";
import abcjs from "abcjs"; // Or reference window.ABCJS if using a <script> tag
import "../public/css/App.css"; // Your custom styling, if needed

export default function App() {
  // Microphone devices
  const [devices, setDevices] = useState([]);
  // Currently selected mic deviceId
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  // Example: Profiles, ABC files, current ABC text
  const [profiles, setProfiles] = useState([]);
  const [files, setFiles] = useState([]);
  const [abcText, setAbcText] = useState("");

  // Keep track of the active MediaStream so we can stop it.
  const streamRef = useRef(null);

  /**
   * On mount:
   * 1. Request audio permission so we can list mic labels.
   * 2. Enumerate devices -> store in state.
   * 3. Populate sample profiles & files.
   * 4. Set default ABC text (optional).
   */
  useEffect(() => {
    // Request mic permission so device labels become visible
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        // Once we have permission, list devices
        return navigator.mediaDevices.enumerateDevices();
      })
      .then((allDevices) => {
        const audioInputs = allDevices.filter((d) => d.kind === "audioinput");
        setDevices(audioInputs);

        // If there's at least one mic, select it by default
        if (audioInputs.length > 0) {
          setSelectedDeviceId(audioInputs[0].deviceId);
        }
      })
      .catch((err) => {
        console.error("Could not enumerate devices or get mic permission:", err);
      });

    // Example profiles, ABC files (stored in public/music)
    setProfiles(["Profile 1", "Profile 2", "Profile 3"]);
    setFiles(["example1.abc", "example2.abc", "example3.abc"]);

    // Example ABC content
    setAbcText(`
X:1
T:My Tune
M:4/4
K:C
C D E F|G A B c|
    `);

    // Cleanup: if we started a stream just to get labels, stop it (optional).
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /**
   * Re-render ABC notation whenever `abcText` changes
   */
  useEffect(() => {
    if (abcText && abcjs) {
      abcjs.renderAbc("notation", abcText.trim(), {});
    }
  }, [abcText]);

  /**
   * Fetch `.abc` files from /music/ when user selects from the dropdown
   */
  const handleFileChange = async (e) => {
    const filename = e.target.value;
    if (!filename) {
      // User chose "---Custom ABC---"
      // We'll do nothing, letting them edit `abcText` manually
      return;
    }
    // Otherwise, load the .abc from /music/<filename>
    try {
      const response = await fetch(`../public/music/${filename}`);
      const text = await response.text();
      setAbcText(text);
    } catch (err) {
      console.error("Error loading ABC file:", err);
    }
  };

  /**
   * Switch to a new microphone device
   */
  const handleMicChange = (e) => {
    setSelectedDeviceId(e.target.value);
  };

  /**
   * Start using the currently selected microphone for pitch detection
   */
  const handleStart = async () => {
    console.log("Start pressed - begin mic/pitch detection!");

    // Stop any previous stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      // Get a new stream from the selected device
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        },
      });
      streamRef.current = stream;

      // TODO: Insert your pitch detection / volume metering logic here
      // e.g., pass `stream` to an AudioContext, set up an analyser node, etc.
      console.log("Got stream from device:", selectedDeviceId);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  /**
   * Reset everything
   */
  const handleReset = () => {
    console.log("Reset pressed - reset states, scores, etc.");
    // Stop the mic stream if it's active
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    // Clear or reset any other states if needed
  };

  /**
   * Tuner mode
   */
  const handleTune = () => {
    console.log("Tuner mode activated!");
    // Tuner logic - maybe partial pitch detection or a single note check
  };

  return (
    <div className="main-container">
      <h3>ABC Sightreader</h3>

      <div className="status-bar" title="Status">
        <p>1. Select your mic 2. Select your ABC file 3. Press start</p>
      </div>

      <div className="controls">
        {/* Microphone Select */}
        <label htmlFor="devices">Microphone:</label>
        <select id="devices" value={selectedDeviceId} onChange={handleMicChange}>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || d.deviceId}
            </option>
          ))}
        </select>

        {/* Profiles */}
        <label htmlFor="profiles">Profile:</label>
        <select id="profiles">
          {profiles.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="text"
          id="newProfile"
          style={{ display: "none" }}
          placeholder="Enter name and press enter"
        />

        {/* ABC File Select: loads from /music/ */}
        <label htmlFor="file">File:</label>
        <select id="file" onChange={handleFileChange}>
          <option value="">---Custom ABC---</option>
          {files.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        {/* Tempo Select */}
        <label htmlFor="tempo">Tempo:</label>
        <select id="tempo">
          <option value="">inherit</option>
          <option value="30">30</option>
          <option value="60">60</option>
          <option value="90">90</option>
          <option value="120">120</option>
          <option value="180">180</option>
          <option value="240">240</option>
        </select>

        {/* Start, Reset, Tune Buttons */}
        <button id="start" title="Enable mic and begin playing" onClick={handleStart}>
          Start
        </button>
        <button id="reset" onClick={handleReset}>
          Reset
        </button>
        <button id="tune" onClick={handleTune}>
          Tune
        </button>
      </div>

      {/* ABC Text Editor */}
      <div className="abc-textarea-container">
        <textarea
          id="abc-textarea"
          value={abcText}
          onChange={(e) => setAbcText(e.target.value)}
        />
      </div>

      {/* Main Display */}
      <div className="main-display">
        <div className="top-info">
          <div className="playlist-pos" title="Playlist position.">
            -
          </div>
          <div className="qpm-display" title="QPM">
            -
          </div>
          <div className="score-info">
            <span id="current-score" title="Your current score.">
              -
            </span>
            <span id="score-stats" title="Score statistics."></span>
          </div>
        </div>

        {/* Where ABCJS renders */}
        <div id="notation"></div>

        <span id="current-note" title="Note detected on the mic">
          -
        </span>
        <span id="current-volume" title="Microphone volume.">
          -
        </span>
        <div id="midi" style={{ display: "none" }}></div>
        <span id="count-down"></span>
        <span id="loaded-filename">-</span>
      </div>

      <div className="controls">
        <div className="keyboard-legend">
          <span className="cb-field">
            <input id="auto-continue" type="checkbox" />
            <label htmlFor="auto-continue">Auto-Continue</label>
          </span>
          <span className="cb-field">
            <input id="ignore-duration" type="checkbox" />
            <label htmlFor="ignore-duration">Ignore Duration</label>
          </span>
        </div>
      </div>

      <ol id="playlist" className="playlist-list"></ol>

      {/* Example modal structure, optional */}
      <div className="modal fade" id="message-model" role="dialog">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-body" style={{ textAlign: "center" }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
