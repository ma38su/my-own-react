import MyReact from './lib/my-react';
import * as MyReactDOM from './lib/my-react-dom';

/** @jsx MyReact.createElement */
const element = (
  <div>
    <div id='foo'>
      <a>bar</a>
      <b/>
    </div>
  </div>
);

const container = document.getElementById('root');
if (container == null) {
  throw new Error('container is null');
}
MyReactDOM.render(element, container);
