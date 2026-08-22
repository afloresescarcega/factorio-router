test('renders into #root without crashing', () => {
  const div = document.createElement('div');
  div.id = 'root';
  document.body.appendChild(div);

  // index.js runs its ReactDOM.createRoot(...).render(...) as a side effect
  // at import time, so requiring it here (after #root exists) exercises it.
  expect(() => {
    require('./index');
  }).not.toThrow();

  document.body.removeChild(div);
});
