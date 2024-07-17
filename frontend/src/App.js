import React, { useState } from 'react';
import { processHelmodString } from './main';

function App() {
  const [helmodString, setHelmodString] = useState('');
  const [blueprintString, setBlueprintString] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setBlueprintString('');
    try {
      const result = processHelmodString(helmodString);
      setBlueprintString(result);
    } catch (err) {
      console.error('Error processing Helmod string:', err);
      setError(`Error: ${err.message}`);
    }
  };

  return (
    <div className="App">
      <h1>Helmod to Blueprint Converter</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          value={helmodString}
          onChange={(e) => setHelmodString(e.target.value)}
          placeholder="Enter Helmod string here (multiline input is supported)"
          rows={10}
          cols={50}
        />
        <br />
        <button type="submit">Convert</button>
      </form>
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          {error}
        </div>
      )}
      {blueprintString && (
        <div>
          <h2>Blueprint String:</h2>
          <textarea
            value={blueprintString}
            readOnly
            rows={10}
            cols={50}
          />
        </div>
      )}
    </div>
  );
}

export default App;
