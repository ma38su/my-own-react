import MyReact from './lib/my-react';
import * as MyReactDOM from './lib/my-react';

const updateValue = (e) => {
  rerenderer(e.target.value);
}

const container = document.getElementById('root');
if (container == null) {
  throw new Error('container is null');
}

function Counter() {
  console.log('renderer Count');
  const [state, setState] = MyReact.useState(1);
  return <button onClick={() => setState(c => c + 1)}>Count: {state}</button>
}

function App(props) {
  console.log('renderer App');
  return <h1>Hi {props.name}</h1>
}

const rerenderer = (value) => {
  console.log('renderer main');

  /** @jsx MyReact.createElement */
  const element = (
    <div>
      <App name='foo' />
      <Counter />
      <Counter />
      <div id='foo'>
        <input onInput={updateValue} value={value} />
        <h2>Hello {value}</h2>
        <p>{value}</p>
      </div>
    </div>
  );

  MyReactDOM.render(element, container);
}

rerenderer("World");