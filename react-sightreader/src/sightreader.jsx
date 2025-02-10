import React, { useState, useEffect, useRef } from "react";
import Pitchfinder from "pitchfinder";
import * as ABCJS from "abcjs"; 
// You also need to ensure ABCJS is properly imported. 
// For example, if using "abcjs" from npm, you might do:
// import { renderAbc, midi, synth, TimingCallbacks } from 'abcjs';

const ABC_EXT = ".abc";
const PLS_EXT = ".pls";
const NOTE_COLOR_DEFAULT = "#000000";
const NOTE_COLOR_PLAYING = "#3D9AFC";
const DEFAULT_SCALE = 1.5;
const DEFAULT_TEMPO = 60;
const SILENCE = "-";
const MIN_VOLUME = 0.075;
const scales = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiNumberToOctave(number) {
  return parseInt(number / 12) - 1;
}

function midiNumberToScale(number) {
  return scales[number % 12];
}

function midiNumberToString(number) {
  if (number) {
    return midiNumberToScale(number) + midiNumberToOctave(number);
  }
  return SILENCE;
}

function noteFromPitch(frequency) {
  // MIDI note number from frequency
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

function clamp(val, min, max) {
  if (val > max) return max;
  if (val < min) return min;
  return val;
}

function millisecondsPerBeat(qpm) {
  return 60000 / qpm;
}

function millisecondsPerMeasure(qpm, tune) {
  return tune.getBeatsPerMeasure() * millisecondsPerBeat(qpm);
}

// Placeholder for your volume meter logic if you have a custom createAudioMeter function.
// Make sure to replace this with your actual volume meter logic or library usage.
function createAudioMeter(audioContext) {
  // Return an object that keeps track of volume, etc.
  return {
    volume: 0,
    // If you have an update method or a processor node, attach it here
    update: () => {}
  };
}

/**
 * Main React component
 */
export default function AbcReactApp() {
  /**
   * --------------- React States ---------------
   */
  const [abcText, setAbcText] = useState("");                // Contains ABC from textarea or loaded file
  const [originalAbc, setOriginalAbc] = useState(null);      // The original ABC text
  const [loadedAbcFilename, setLoadedAbcFilename] = useState("");
  const [qpm, setQpm] = useState(DEFAULT_TEMPO);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(-1);

  // “score” and note-checking
  const [notesCheckedCount, setNotesCheckedCount] = useState(0);
  const [notesCheckedCorrectCount, setNotesCheckedCorrectCount] = useState(0);
  
  // Current pitch states
  const [currentMidiNumber, setCurrentMidiNumber] = useState(0);
  const [expectedMidiNumber, setExpectedMidiNumber] = useState(0);
  
  // Score stats from server (min/mean/max, etc.)
  const [scoreStats, setScoreStats] = useState(null);

  // “Playlist” states
  const [playlistFiles, setPlaylistFiles] = useState([]);
  const [playlistIndex, setPlaylistIndex] = useState(0);

  // UI toggles (via cookies)  
  const [autoContinue, setAutoContinue] = useState(() => {
    const val = Cookies.get("auto-continue");
    return val ? !!parseInt(val) : false;
  });
  const [ignoreDuration, setIgnoreDuration] = useState(() => {
    const val = Cookies.get("ignore-duration");
    return val ? !!parseInt(val) : false;
  });

  // Selected profile
  const [profile, setProfile] = useState(() => {
    return Cookies.get("profiles") || ""; 
  });
  const [newProfile, setNewProfile] = useState("");
  const [showNewProfileInput, setShowNewProfileInput] = useState(false);

  // Audio input device
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // Status message
  const [statusMessage, setStatusMessage] = useState("");

  /**
   * --------------- React refs (mutable objects) ---------------
   */
  const audioContextRef = useRef(null);
  const sourceStreamRef = useRef(null);
  const volumeMeterRef = useRef(null);
  const pitchDetectorRef = useRef(null);
  const detectPitchRef = useRef(null);

  // ABCJS references for the rendered notation and controlling playback
  const abcSynthRef = useRef(null); 
  const abcTimingRef = useRef(null);
  const abcVisualObjRef = useRef(null);

  // Countdown timer ref (so we can clear intervals)
  const countdownTimeoutRef = useRef(null);

  // Checking intervals
  const pitchGetterIntervalRef = useRef(null);
  const noteCheckerIntervalRef = useRef(null);

  // UI references
  const notationContainerRef = useRef(null);

  /**
   * --------------- Initialization: AudioContext and device enumeration ---------------
   */
  useEffect(() => {
    // Create or resume AudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    // Enumerate devices on mount
    navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const audioIns = devices.filter((d) => d.kind === "audioinput");
        setAudioDevices(audioIns);
        // If we have at least one device, select the first one by default
        if (audioIns.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(audioIns[0].deviceId);
        }
      });
    });

    return () => {
      // Cleanup on unmount
      stopAll(); // make sure we stop playback, intervals, etc.
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * --------------- Watch selectedDeviceId changes and create a new MediaStream ---------------
   */
  useEffect(() => {
    async function initMediaStream() {
      if (!selectedDeviceId) return;
      // If we were recording, stop first
      stopAll(false);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: { exact: selectedDeviceId } }
        });
        sourceStreamRef.current = stream;
        setStatusMessage(`Audio device selected: ${selectedDeviceId}`);
      } catch (err) {
        console.error("Error selecting device:", err);
        setStatusMessage("Error selecting device");
      }
    }
    initMediaStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId]);

  /**
   * --------------- Cookies: autoContinue, ignoreDuration, profile ---------------
   */
  useEffect(() => {
    Cookies.set("auto-continue", autoContinue ? "1" : "0");
  }, [autoContinue]);

  useEffect(() => {
    Cookies.set("ignore-duration", ignoreDuration ? "1" : "0");
  }, [ignoreDuration]);

  useEffect(() => {
    if (!showNewProfileInput && profile) {
      Cookies.set("profiles", profile);
    }
  }, [profile, showNewProfileInput]);

  /**
   * --------------- ABC loading/rendering ---------------
   */
  function loadAbc(abcString) {
    stopAll(false);
    setStatusMessage("Loading ABC...");

    // Determine QPM from abcString or from the tempo select override
    let qpmValue = qpm;
    // If you want to override from text, do so here. Example:
    const tempoMatch = abcString.match(/Q:\s*(\d+)/i);
    if (!tempoMatch && !qpmValue) {
      // fallback
      qpmValue = DEFAULT_TEMPO;
    } else if (tempoMatch) {
      qpmValue = parseInt(tempoMatch[1], 10);
    }

    // Render the ABC in notation
    if (notationContainerRef.current) {
      // ABCJS.renderAbc returns an array of tune objects
      const visualObj = ABCJS.renderAbc(
        notationContainerRef.current,
        abcString,
        {
          responsive: "resize",
          scale: DEFAULT_SCALE,
          add_classes: true
        }
      );
      if (visualObj && visualObj.length > 0) {
        abcVisualObjRef.current = visualObj[0];
      }
    }

    // Initialize the synth if needed
    if (!abcSynthRef.current) {
      abcSynthRef.current = new ABCJS.synth.CreateSynth();
    }

    // Now load the ABC into the synth
    if (abcVisualObjRef.current) {
      abcSynthRef.current
        .init({
          audioContext: audioContextRef.current,
          visualObj: abcVisualObjRef.current,
          millisecondsPerMeasure: millisecondsPerMeasure(
            qpmValue,
            abcVisualObjRef.current
          )
        })
        .then(() => {
          abcSynthRef.current.prime().then(() => {
            setStatusMessage("ABC loaded. Press start to play.");
          });
        })
        .catch((err) => {
          console.error(err);
          setStatusMessage("Error initializing synth with ABCJS.");
        });
    }

    // Update state
    setQpm(qpmValue);
  }

  // Loads from text area
  function loadAbcFromTextarea() {
    if (!abcText) return;
    setLoadedAbcFilename("");
    setOriginalAbc(abcText);
    loadAbc(abcText);
  }

  // Loads from a file (URL/fetch). Example usage:
  async function loadAbcFile(filename) {
    if (!filename) return;
    setLoadedAbcFilename(filename);
    setStatusMessage(`Loading file ${filename}...`);

    try {
      const response = await fetch(`/abc/single/${filename}`);
      const text = await response.text();
      setOriginalAbc(text);
      setAbcText(text);
      loadAbc(text);
      setStatusMessage("File loaded. Press start to play.");
    } catch (err) {
      console.error(err);
      setStatusMessage("Unable to load file.");
    }
  }

  /**
   * --------------- Microphone / Pitch detection ---------------
   */
  function startMic() {
    if (!sourceStreamRef.current) return;
    const audioCtx = audioContextRef.current;
    audioCtx.resume();

    // Volume meter
    if (!volumeMeterRef.current) {
      volumeMeterRef.current = createAudioMeter(audioCtx);
      const mediaSource = audioCtx.createMediaStreamSource(sourceStreamRef.current);
      mediaSource.connect(volumeMeterRef.current);
    }

    // Pitch detector
    detectPitchRef.current = new Pitchfinder.YIN({
      sampleRate: audioCtx.sampleRate
    });

    const analyserNode = audioCtx.createAnalyser();
    const sourceNode = audioCtx.createMediaStreamSource(sourceStreamRef.current);
    sourceNode.connect(analyserNode);

    function getPitch() {
      if (!analyserNode || !volumeMeterRef.current) return;
      const volume = volumeMeterRef.current.volume;
      let current = 0;
      if (volume > MIN_VOLUME) {
        const array32 = new Float32Array(analyserNode.fftSize);
        analyserNode.getFloatTimeDomainData(array32);
        const freq = detectPitchRef.current(array32);
        current = parseInt(noteFromPitch(freq) || 0, 10);
      }
      setCurrentMidiNumber(current);
    }

    // Start polling for pitch
    pitchGetterIntervalRef.current = setInterval(getPitch, 10);
  }

  function stopMic() {
    setRecording(false);
    if (pitchGetterIntervalRef.current) {
      clearInterval(pitchGetterIntervalRef.current);
      pitchGetterIntervalRef.current = null;
    }
    setCurrentMidiNumber(0);
  }

  /**
   * --------------- Note Checking ---------------
   */
  function checkNote() {
    setNotesCheckedCount((prev) => prev + 1);
    setNotesCheckedCorrectCount((prev) => {
      return prev + (expectedMidiNumber === currentMidiNumber ? 1 : 0);
    });
  }

  function startNoteChecker() {
    noteCheckerIntervalRef.current = setInterval(checkNote, 100);
  }

  function stopNoteChecker() {
    if (noteCheckerIntervalRef.current) {
      clearInterval(noteCheckerIntervalRef.current);
      noteCheckerIntervalRef.current = null;
    }
  }

  function getScorePercent() {
    if (notesCheckedCount === 0) return 0;
    return Math.round((notesCheckedCorrectCount / notesCheckedCount) * 100);
  }

  /**
   * --------------- ABCJS TimingCallbacks ---------------
   */
  function eventCallback(event) {
    if (!event) {
      // End of tune
      stopNoteChecker();
      const score = getScorePercent();
      setStatusMessage(`Scored ${score}.`);
      recordScore(score);
      updateScoreStatsDisplay();

      stopAll(false);

      // Auto-continue logic
      if (autoContinue && scoreStats?.mean_score) {
        if (score >= scoreStats.mean_score) {
          // move to next if we haven't reached the end
          if (!atPlaylistEnd()) {
            incrementPlaylist();
          }
        }
        // Start next after 3 seconds
        setTimeout(() => startButtonHandler(), 3000);
      }
      return;
    }

    // If event has a pitch, we set expected
    const midiPitch = event.midiPitches && event.midiPitches[0];
    if (!midiPitch) {
      // rest
      setExpectedMidiNumber(0);
      return;
    }
    setExpectedMidiNumber(midiPitch.pitch);
  }

  function startPlayback() {
    if (!abcVisualObjRef.current) return;
    // Create a TimingCallbacks instance
    const t = new ABCJS.TimingCallbacks(abcVisualObjRef.current, {
      qpm: qpm,
      eventCallback
    });
    abcTimingRef.current = t;
    t.start();

    // Also start the synth
    if (abcSynthRef.current) {
      abcSynthRef.current.start();
    }
  }

  function stopPlayback() {
    if (abcTimingRef.current) {
      abcTimingRef.current.stop();
    }
    if (abcSynthRef.current) {
      abcSynthRef.current.stop();
    }
  }

  function startAll() {
    setRecording(true);
    startMic();
    startNoteChecker();
    startPlayback();
    setStatusMessage("Playing.");
  }

  function stopAll(verbose = true) {
    if (!recording) return;

    stopMic();
    stopNoteChecker();
    stopPlayback();
    setRecording(false);
    if (verbose) {
      setStatusMessage("Stopped.");
    }
  }

  /**
   * --------------- Countdown ---------------
   */
  function beginCountdown() {
    setRecording(true);
    setCountdown(() => {
      // Start from e.g. (beats per measure + 1)
      if (!abcVisualObjRef.current) return 4;
      return abcVisualObjRef.current.getBeatsPerMeasure() + 1;
    });
  }

  // A simple effect to handle countdown “tick”
  useEffect(() => {
    // If countdown < 0 => no active countdown
    if (countdown < 0) return;
    if (countdown === 0) {
      // Start playing
      setCountdown(-1);
      startAll();
      return;
    }
    // Otherwise schedule the next countdown
    countdownTimeoutRef.current = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, millisecondsPerBeat(qpm));

    return () => {
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
      }
    };
  }, [countdown, qpm]);

  /**
   * --------------- Score & Stats ---------------
   */
  async function recordScore(score) {
    if (!loadedAbcFilename) return;
    try {
      await fetch(
        `score/set/${loadedAbcFilename}/${score}/${qpm}/${profile}`,
        { method: "GET" }
      );
      // no real content needed
    } catch (err) {
      console.error("Error saving score:", err);
    }
  }

  async function updateScoreStatsDisplay() {
    if (!loadedAbcFilename) return;
    try {
      const response = await fetch(
        `score/get/${loadedAbcFilename}/${qpm}/${profile}`
      );
      const data = await response.json();
      setScoreStats(data);
    } catch (err) {
      console.error("Error retrieving score statistics:", err);
    }
  }

  /**
   * --------------- Playlist ---------------
   */
  function clearPlaylist() {
    setPlaylistFiles([]);
    setPlaylistIndex(0);
  }

  function atPlaylistEnd() {
    return playlistFiles.length === 0 || playlistIndex === playlistFiles.length - 1;
  }

  function incrementPlaylist() {
    setPlaylistIndex((prev) => {
      return clamp(prev + 1, 0, playlistFiles.length - 1);
    });
  }

  function decrementPlaylist() {
    setPlaylistIndex((prev) => {
      return clamp(prev - 1, 0, playlistFiles.length - 1);
    });
  }

  function gotoPlaylistIndex(i) {
    setPlaylistIndex(clamp(i, 0, playlistFiles.length - 1));
  }

  function updatePlaylist() {
    // After changing playlist index, load the relevant file
    const fn = playlistFiles[playlistIndex];
    if (fn) {
      if (fn.endsWith(ABC_EXT)) {
        loadAbcFile(fn);
      } else if (fn.endsWith(PLS_EXT)) {
        loadPlaylistFile(fn);
      }
    }
  }

  // Whenever playlistIndex changes, update the displayed file
  useEffect(() => {
    updatePlaylist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistIndex]);

  async function loadPlaylistFile(filename) {
    // Clear any old playlist
    clearPlaylist();
    setStatusMessage(`Loading playlist file: ${filename}`);
    try {
      const response = await fetch(`playlist/${filename}`);
      const data = await response.json();
      setPlaylistFiles(data);
      setPlaylistIndex(0);
      setStatusMessage("Playlist loaded.");
    } catch (err) {
      console.error(err);
      setStatusMessage("Unable to load playlist file.");
    }
  }

  /**
   * --------------- Handlers for UI elements ---------------
   */
  function onStartClick() {
    // If we’re already recording, we stop; otherwise, we begin countdown
    if (!abcVisualObjRef.current) {
      setStatusMessage("No ABC data loaded.");
      return;
    }
    if (recording) {
      stopAll();
    } else {
      // Reset score counters
      setNotesCheckedCount(0);
      setNotesCheckedCorrectCount(0);
      beginCountdown();
    }
  }

  function onResetClick() {
    // Stopping + resetting counters
    stopAll(false);
    setNotesCheckedCount(0);
    setNotesCheckedCorrectCount(0);
    setStatusMessage("Reset done.");
  }

  function onTuneClick() {
    if (recording) {
      stopMic();
      setStatusMessage("Tuner stopped.");
    } else {
      // Start mic only
      setRecording(true);
      startMic();
      setStatusMessage("Tuner active.");
    }
  }

  function onDeviceChange(e) {
    setSelectedDeviceId(e.target.value);
  }

  function onFileSelectChange(e) {
    const filename = e.target.value;
    setStatusMessage(`Selected file: ${filename}`);
    if (filename.endsWith(ABC_EXT)) {
      loadAbcFile(filename);
    } else if (filename.endsWith(PLS_EXT)) {
      loadPlaylistFile(filename);
    } else {
      // Show the ABC textarea
      loadAbcFromTextarea();
    }
    Cookies.set("file", filename);
  }

  function onAbcTextareaChange(e) {
    setAbcText(e.target.value);
  }

  function onTempoChange(e) {
    const t = parseInt(e.target.value, 10) || DEFAULT_TEMPO;
    setQpm(t);
    // re-load the ABC if we already have something
    if (originalAbc) {
      loadAbc(originalAbc);
    }
    // refresh stats
    updateScoreStatsDisplay();
  }

  function onAutoContinueChange(e) {
    setAutoContinue(e.target.checked);
  }

  function onIgnoreDurationChange(e) {
    setIgnoreDuration(e.target.checked);
  }

  function onProfileChange(e) {
    const val = e.target.value;
    if (val === "new") {
      setShowNewProfileInput(true);
    } else {
      setProfile(val);
      setShowNewProfileInput(false);
      updateScoreStatsDisplay();
    }
  }

  function onNewProfileKeyDown(e) {
    if (e.keyCode === 27) {
      // Escape
      setNewProfile("");
      setShowNewProfileInput(false);
    } else if (e.keyCode === 13) {
      // Enter
      // Save the new profile
      fetch(`/profile/save/${newProfile}`)
        .then(() => {
          // success
          setProfile(newProfile);
          setNewProfile("");
          setShowNewProfileInput(false);
        })
        .catch(() => {
          console.error("Error saving profile!");
        });
    }
  }

  function startButtonHandler() {
    onStartClick();
  }

  /**
   * --------------- Derived UI states & rendering ---------------
   */
  const scorePercent = getScorePercent();
  let currentNoteText = `${midiNumberToString(expectedMidiNumber)}/${midiNumberToString(currentMidiNumber)}`;
  if (!expectedMidiNumber && !currentMidiNumber) {
    currentNoteText = "-";
  }

  const volumeDisplay = volumeMeterRef.current
    ? Math.round(volumeMeterRef.current.volume * 100)
    : "-";

  // Basic color logic for the current note display
  let currentNoteClass = "";
  if (expectedMidiNumber && expectedMidiNumber === currentMidiNumber) {
    currentNoteClass = "good";
  } else if (expectedMidiNumber) {
    currentNoteClass = "bad";
  }

  // Basic color logic for the score
  let scoreDisplayClass = "";
  if (scoreStats?.mean_score) {
    if (scorePercent >= scoreStats.mean_score) {
      scoreDisplayClass = "good";
    } else {
      scoreDisplayClass = "bad";
    }
  }

  return (
    <div style={{ padding: "1rem" }}>
      <h1>ABC React App</h1>

      <div>
        <label>Devices:</label>
        <select value={selectedDeviceId || ""} onChange={onDeviceChange}>
          {audioDevices.map((dev) => (
            <option key={dev.deviceId} value={dev.deviceId}>
              {dev.label || dev.deviceId}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>File:</label>
        <select onChange={onFileSelectChange}>
          <option value="">- Select -</option>
          {/* 
            You might populate more <option> elements dynamically 
            or you can handle them however you like
          */}
          <option value="example.abc">example.abc</option>
          <option value="example.pls">example.pls</option>
        </select>
      </div>

      <div id="abc-textarea-container">
        <textarea
          id="abc-textarea"
          value={abcText}
          onChange={onAbcTextareaChange}
          rows={8}
          cols={50}
        />
        <button onClick={loadAbcFromTextarea}>Load from Textarea</button>
      </div>

      <div>
        <label>Tempo:</label>
        <input
          type="number"
          value={qpm}
          onChange={onTempoChange}
          style={{ width: "60px" }}
        />
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={autoContinue}
            onChange={onAutoContinueChange}
          />
          Auto Continue
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={ignoreDuration}
            onChange={onIgnoreDurationChange}
          />
          Ignore Duration
        </label>
      </div>

      <div>
        <label>Profile:</label>
        <select
          value={showNewProfileInput ? "new" : profile}
          onChange={onProfileChange}
        >
          <option value="">Default</option>
          {/* Add any known profiles */}
          <option value="profileA">profileA</option>
          <option value="profileB">profileB</option>
          <option value="new">New Profile...</option>
        </select>
        {showNewProfileInput && (
          <input
            type="text"
            value={newProfile}
            onChange={(e) => setNewProfile(e.target.value)}
            onKeyDown={onNewProfileKeyDown}
            placeholder="Enter new profile name, press Enter"
          />
        )}
      </div>

      <hr />

      <button id="tune" onClick={onTuneClick}>
        {recording && !countdown ? "Stop Tuner" : "Tune"}
      </button>
      <button id="start" onClick={startButtonHandler}>
        {recording && countdown < 0 ? "Stop" : "Start"}
      </button>
      <button id="reset" onClick={onResetClick}>
        Reset
      </button>

      <hr />

      <div>
        <h3>Status: {statusMessage}</h3>
      </div>

      <div>
        <h3>Countdown: {countdown >= 0 ? countdown : "-"}</h3>
      </div>

      <div>
        <h3>
          Current Note:{" "}
          <span className={currentNoteClass}>{currentNoteText}</span>
        </h3>
      </div>

      <div>
        <h3>
          Score:{" "}
          <span className={scoreDisplayClass}>
            {notesCheckedCount > 0
              ? `${notesCheckedCorrectCount}/${notesCheckedCount} = ${scorePercent}%`
              : "-"}
          </span>
        </h3>
        <div>
          Score Stats:{" "}
          {scoreStats && scoreStats.most_recent_scores?.length
            ? `${scoreStats.min_score}/${scoreStats.mean_score}/${scoreStats.max_score}`
            : "-"}
        </div>
      </div>

      <div>
        <h3>Volume: {recording ? volumeDisplay : "-"}</h3>
      </div>

      <div>
        <h3>QPM: {qpm}</h3>
      </div>

      <div>
        <h3>Loaded Filename: {loadedAbcFilename || "-"}</h3>
      </div>

      <hr />

      {/* Playlist display */}
      <div>
        <h3>Playlist</h3>
        <ul>
          {playlistFiles.map((pf, i) => (
            <li
              key={i}
              onClick={() => gotoPlaylistIndex(i)}
              style={{
                cursor: "pointer",
                fontWeight: i === playlistIndex ? "bold" : "normal"
              }}
            >
              {pf}
            </li>
          ))}
        </ul>
        <div>
          Position:{" "}
          {playlistFiles.length
            ? `${playlistIndex + 1}/${playlistFiles.length}`
            : ""}
        </div>
        <button onClick={decrementPlaylist}>Previous</button>
        <button onClick={incrementPlaylist}>Next</button>
      </div>

      <hr />

      {/* Container for ABC Notation */}
      <div
        id="notation"
        ref={(el) => {
          // ABCJS needs a direct DOM element. 
          // We'll store the element's ID or the element itself in `notationContainerRef.current`
          if (el) {
            notationContainerRef.current = el;
          }
        }}
        style={{
          opacity: countdown >= 0 ? 0.5 : 1, 
          transition: "opacity 0.5s"
        }}
      ></div>

      {/* 
        If you want an <audio> or <midi> player, add it here. 
        ABCJS has a built-in MIDI player, but in React you usually don't 
        mount raw HTML elements for that; you might let ABCJS handle it 
        or you can set up your own <audio>.
      */}

    </div>
  );
}
