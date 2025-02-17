import React, { useState, useEffect, useRef } from 'react';
import Pitchfinder from 'pitchfinder';
import ABCJS from 'abcjs';

const ABC_EXT = '.abc';
const PLS_EXT = '.pls';
const NOTE_COLOR_DEFAULT = '#000000';
const NOTE_COLOR_PLAYING = '#3D9AFC';
const DEFAULT_SCALE = 1.5;
const DEFAULT_TEMPO = 60;
const SILENCE = '-';
const MIN_VOLUME = 0.075;
const scales = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SightReader = () => {
    const [audioContext, setAudioContext] = useState(new AudioContext());
    const [currentMidiNumber, setCurrentMidiNumber] = useState(0);
    const [expectedMidiNumber, setExpectedMidiNumber] = useState(0);
    const [currentQpm, setCurrentQpm] = useState(null);
    const [tunebook, setTunebook] = useState(null);
    const [recording, setRecording] = useState(false);
    const [sourceStream, setSourceStream] = useState(null);
    const [loadedAbc, setLoadedAbc] = useState(null);
    const [synth, setSynth] = useState(null);
    const [pitchDetector, setPitchDetector] = useState(null);
    const [volumeMeter, setVolumeMeter] = useState(null);
    const notationDisplayRef = useRef(null);

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
            setSourceStream(stream);
        }).catch(err => console.error("Error accessing microphone:", err));
    }, []);

    const loadAbc = (abcString) => {
        let qpm = DEFAULT_TEMPO;
        const match = abcString.match(/Q:\s*(\d+)/i);
        if (match) {
            qpm = parseInt(match[1]);
        }
        setCurrentQpm(qpm);

        const newTunebook = ABCJS.renderAbc("notation", abcString, {
            responsive: "resize",
            scale: DEFAULT_SCALE,
            add_classes: true
        });
        setTunebook(newTunebook);

        if (!synth) {
            const newSynth = new ABCJS.synth.CreateSynth();
            setSynth(newSynth);
        }
    };

    const startMic = async () => {
        setRecording(true);
        audioContext.resume();
        setPitchDetector(new Pitchfinder.YIN({ sampleRate: audioContext.sampleRate }));
        const sourceNode = audioContext.createMediaStreamSource(sourceStream);
        const analyser = audioContext.createAnalyser();
        sourceNode.connect(analyser);
        const detectPitch = () => {
            const array32 = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(array32);
            const freq = pitchDetector(array32);
            setCurrentMidiNumber(freq ? Math.round(12 * (Math.log(freq / 440) / Math.log(2)) + 69) : 0);
        };
        setInterval(detectPitch, 10);
    };

    const stopMic = () => {
        setRecording(false);
        setCurrentMidiNumber(0);
    };

    const updateQpmDisplay = () => {
        return currentQpm ? currentQpm : '-';
    };

    return (
        <div>
            <h2>Sight Reader</h2>
            <button onClick={startMic} disabled={recording}>Start Mic</button>
            <button onClick={stopMic} disabled={!recording}>Stop Mic</button>
            <div id="notation" ref={notationDisplayRef}></div>
            <p>Current Note: {currentMidiNumber ? scales[currentMidiNumber % 12] : SILENCE}</p>
            <p>QPM: {updateQpmDisplay()}</p>
        </div>
    );
};

export default SightReader;
