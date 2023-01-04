import MyReact from './lib/my-react';
import * as MyReactDOM from './lib/my-react-dom';

const updateValue = (e) => {
  rerenderer(e.target.value);
}

const container = document.getElementById('root');
if (container == null) {
  throw new Error('container is null');
}

const rerenderer = (value) => {
  console.log('rerenderer')

  /** @jsx MyReact.createElement */
  const element = (
    <div>
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