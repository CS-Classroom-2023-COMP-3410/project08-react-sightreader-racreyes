import { useState, useEffect } from "react";
import abcjs from "abcjs"; // If you want to use abcjs from npm
import "./App.css"; // Your custom styling, if needed

export default function App() {
  // For demonstration, we store devices, profiles, etc. in state
  const [devices, setDevices] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [files, setFiles] = useState([]);
  const [abcText, setAbcText] = useState("");

  // On mount, populate the lists
  useEffect(() => {
    // In a real app, you might fetch these from an API or keep them in a JSON file.
    setDevices(["Mic 1", "Mic 2"]);
    setProfiles(["Profile 1", "Profile 2", "Profile 3"]);
    setFiles(["example1.abc", "example2.abc", "example3.abc"]);

    // Optionally set an initial ABC content
    setAbcText(`
X:1
T:My Tune
M:4/4
K:C
C D E F|G A B c|
    `);

    // Example: if you want to render ABC right away, you might do so here:
    // abcjs.renderAbc("notation", abcText, {});
  }, []);

  const handleStart = () => {
    console.log("Start pressed - begin mic/pitch detection!");
    // Start pitch detection + ABC rendering or playback logic
  };

  const handleReset = () => {
    console.log("Reset pressed - reset states, scores, etc.");
    // Clear states, stop pitch detection, etc.
  };

  const handleTune = () => {
    console.log("Tuner mode activated!");
    // Tuner logic
  };

  // For live ABC rendering, you might add an effect that re-renders whenever `abcText` changes.
  // Or you can do a "Render" button, your choice.
  useEffect(() => {
    // Attempt to render ABC text whenever it changes
    if (abcText && abcjs) {
      abcjs.renderAbc("notation", abcText.trim(), {});
    }
  }, [abcText]);

  return (
    <div className="main-container">
      <h3>ABC Sightreader</h3>

      <div className="status-bar" title="Status">
        <p>1. Select your mic 2. Select your ABC file 3. Press start</p>
      </div>

      <div className="controls">
        <label htmlFor="devices">Microphone:</label>
        <select id="devices">
          {devices.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

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

        <label htmlFor="file">File:</label>
        <select id="file">
          <option value="">---Custom ABC---</option>
          {files.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

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

      <div className="abc-textarea-container">
        <textarea
          id="abc-textarea"
          value={abcText}
          onChange={(e) => setAbcText(e.target.value)}
        />
      </div>

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

        {/* The rendered ABC notation goes here */}
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
            <label htmlFor="auto-continue">
              Auto-Continue
            </label>
          </span>
          <span className="cb-field">
            <input id="ignore-duration" type="checkbox" />
            <label htmlFor="ignore-duration">
              Ignore Duration
            </label>
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

