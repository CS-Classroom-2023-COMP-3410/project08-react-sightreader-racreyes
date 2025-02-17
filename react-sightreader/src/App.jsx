import { useState } from 'react';

function App() {
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [tempo, setTempo] = useState('');

  return (
    <div className="container">
      <h3>ABC Sightreader</h3>
      <div className="row-fluid">
        <div className="span12" id="status">
          1. Select your mic 2. Select your ABC file 3. Press start
        </div>
      </div>
      <div className="row-fluid controls">
        <div className="span12">
          <label htmlFor="devices">Microphone:</label>
          <select id="devices" value={selectedMic} onChange={(e) => setSelectedMic(e.target.value)}>
            <option value="">Select a microphone</option>
            {/* Populate microphone options dynamically in the future */}
          </select>

          <label htmlFor="file">File:</label>
          <select id="file" value={selectedFile} onChange={(e) => setSelectedFile(e.target.value)}>
               <option value="">---Custom ABC---</option>
               <option value="cecilio-lesson3-exercise-1.abc">Lesson 3 - Exercise 1</option>
               <option value="cecilio-lesson3-exercise-2.abc">Lesson 3 - Exercise 2</option>
               <option value="lesson1-open-string-exercise-1.abc">Open String Exercise 1</option>
               <option value="cecilio-lesson2-twinkle-twinkle-little-star.abc">cecilio-lesson3-exercise-1.abc</option>
               <option value="cecilio-lesson3-exercise-1.abc">cecilio-lesson3-exercise-1.abc</option>
               <option value="cecilio-lesson3-exercise-2.abc">cecilio-lesson3-exercise-2.abc</option>
               <option value="cecilio-lesson3-exercise-3.abc">cecilio-lesson3-exercise-3.abc</option>
               <option value="cecilio-lesson3-exercise-4.abc">cecilio-lesson3-exercise-4.abc</option>
               <option value="cecilio-lesson3-jingle-bells.abc">cecilio-lesson3-jingle-bells.abc</option>
               <option value="cecilio-lesson3-mary-had-a-little-lamb.abc">cecilio-lesson3-mary-had-a-little-lamb.abc</option>
               <option value="cecilio-lesson4-camptown-races.abc">cecilio-lesson4-camptown-races.abc</option>
               <option value="cecilio-lesson4-lightly-row.abc">cecilio-lesson4-lightly-row.abc</option>
               <option value="cecilio-lesson4-russian-dance-tune.abc">cecilio-lesson4-russian-dance-tune.abc</option>
               <option value="cecilio-lesson5-eighth-notes.abc">cecilio-lesson5-eighth-notes.abc</option>
               <option value="cecilio-lesson5-hungarian-folk-song-1.abc">cecilio-lesson5-hungarian-folk-song-1.abc</option>
               <option value="cecilio-lesson5-the-old-gray-goose.abc">cecilio-lesson5-the-old-gray-goose.abc</option>
               <option value="cecilio-lesson6-first-position-d-string.abc">cecilio-lesson6-first-position-d-string.abc</option>
               <option value="cecilio-lesson6-ode-to-joy.abc">cecilio-lesson6-ode-to-joy.abc</option>
               <option value="cecilio-lesson6-scherzando.abc">cecilio-lesson6-scherzando.abc</option>
               <option value="cecilio-lesson7-can-can.abc">cecilio-lesson7-can-can.abc</option>
               <option value="cecilio-lesson7-country-gardens.abc">cecilio-lesson7-country-gardens.abc</option>
               <option value="cecilio-lesson7-gavotte.abc">cecilio-lesson7-gavotte.abc</option>
               <option value="cecilio-lesson8-dixie.abc">cecilio-lesson8-dixie.abc</option>
               <option value="cecilio-lesson8-largo.abc">cecilio-lesson8-largo.abc</option>
               <option value="hot-cross-buns.abc">hot-cross-buns.abc</option>
               <option value="lesson1-open-string-exercise-1.abc">lesson1-open-string-exercise-1.abc</option>
               <option value="lesson1-open-string-exercise-2.abc">lesson1-open-string-exercise-2.abc</option>
               <option value="lesson1-open-string-exercise-3.abc">lesson1-open-string-exercise-3.abc</option>
               <option value="lesson1-open-string-exercise-4.abc">lesson1-open-string-exercise-4.abc</option>
               <option value="lesson1-open-string-exercise-5.abc">lesson1-open-string-exercise-5.abc</option>
               <option value="lesson2-1st-finger-exercise-1.abc">lesson2-1st-finger-exercise-1.abc</option>
               <option value="lesson2-1st-finger-exercise-2.abc">lesson2-1st-finger-exercise-2.abc</option>
               <option value="lesson2-1st-finger-exercise-3.abc">lesson2-1st-finger-exercise-3.abc</option>
               <option value="lesson2-1st-finger-exercise-4.abc">lesson2-1st-finger-exercise-4.abc</option>
               <option value="lesson2-1st-finger-exercise-5.abc">lesson2-1st-finger-exercise-5.abc</option>
               <option value="lesson2-1st-finger-exercise-6.abc">lesson2-1st-finger-exercise-6.abc</option>
          </select>

          <label htmlFor="tempo">Tempo:</label>
          <select id="tempo" value={tempo} onChange={(e) => setTempo(e.target.value)}>
            <option value="">inherit</option>
            <option value="30">30</option>
            <option value="60">60</option>
            <option value="90">90</option>
            <option value="120">120</option>
          </select>

          <button id="start" disabled title="Enable mic and begin playing along to sheet music.">
            Start
          </button>
          <button id="reset">Reset</button>
          <button id="tune">Tune</button>
        </div>
      </div>
    </div>
  );
}

export default App;
