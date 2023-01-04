type EffectTag = 'UPDATE' | 'PLACEMENT' | 'DELETION';

type MyReactFiber = {
  type: string | FunctionComponent,
  props: MyReactFiberProps,

  dom?: HTMLElement | Text | null,
  alternate?: MyReactFiber | null,
  parent?: MyReactFiber | null,
  child?: MyReactFiber | null,
  sibling?: MyReactFiber | null,
  effectTag?: EffectTag,
};

type MyReactHostFiber = {
  type: string
  props: MyReactFiberProps,
} & MyReactFiber;

type MyReactFunctionFiber = {
  type: FunctionComponent,
  props: MyReactFiberProps,
} & MyReactFiber;

type MyReactFiberProps = {
  [key: string]: any,
  children?: MyReactFiber[],
}

function isFunctionComponent(fiber: MyReactFiber): fiber is MyReactFunctionFiber {
  return fiber.type instanceof Function;
}

let nextUnitOfWork: MyReactFiber | null = null;
let currentRoot: MyReactFiber | null = null;
let wipRoot: MyReactFiber | null = null;
let deletions: MyReactFiber[] | null = null;

type FunctionComponent = (props: any) => MyReactFiber;

function createElement(type: string | FunctionComponent, props: any, ...children: MyReactFiber[]): MyReactFiber {
  return {
      type,
      props: {
          ...props,
          children: children.map(child => {
              return typeof child === 'object' ? child : createTextElement(child);
          }),
      },
  }
}

function createTextElement(text: string): MyReactFiber {
  console.log({type: 'TEXT', props: {nodeValue: text}});
  return {
      type: "TEXT_ELEMENT",
      props: {
          nodeValue: text,
          children: [],
      },
  }
}

function createDom(fiber: MyReactHostFiber): HTMLElement | Text {
  const { type } = fiber;
  const dom = type === "TEXT_ELEMENT"
    ? document.createTextNode("")
    : document.createElement(type);

  updateDom(dom, {}, fiber.props);
  return dom;
}

const isEvent = (key: string) => key.toLowerCase().startsWith('on');
const isProperty = (key: string) => key !== 'children' && !isEvent(key);
const isNew = (prev: MyReactFiberProps, next: MyReactFiberProps) => ((key: string) => prev[key] !== next[key]);
const isGone = (_: MyReactFiberProps, next: MyReactFiberProps) => ((key: string) => !(key in next));

function updateDom(dom: HTMLElement | Text, prevProps: MyReactFiberProps, nextProps: MyReactFiberProps) {

  // remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => {
      return !(key in nextProps) || isNew(prevProps, nextProps)(key);
    })
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      (dom as any)[name] = '';
    });

  // set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      (dom as any)[name] = nextProps[name];
    });

  // add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}


function commitRoot() {
  if (wipRoot == null) return;
  
  // add nodes to dom
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber?: MyReactFiber | null) {
  if (!fiber) {
    return;
  }

  let domParentFiber = fiber.parent;
  if (domParentFiber == null) throw new Error();
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
    if (domParentFiber == null) throw new Error();
  }
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    if (fiber.alternate == null) throw new Error();
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

function commitDeletion(fiber: MyReactFiber, domParent: HTMLElement | Text) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    if (!fiber.child) throw new Error();
    commitDeletion(fiber.child, domParent);
  }
}

function render(fiber: MyReactFiber, container: HTMLElement) {
  wipRoot = {
    type: 'root',
    dom: container,
    props: {
      children: [fiber],
    },
    alternate: currentRoot,
    parent: null,
    child: null,
    sibling: null,
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

// 無限ループ
function workLoop(deadline: IdleDeadline) {

  // Render Pharse
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }

  // Commit Pharse
  if (!nextUnitOfWork) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);

function performUnitOfWork(fiber: MyReactFiber): MyReactFiber | null {

  if (isFunctionComponent(fiber)) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber as MyReactHostFiber);
  }

  // return next unit of work
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber: MyReactFiber | null | undefined = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  return null;
  }

function updateFunctionComponent(fiber: MyReactFunctionFiber) {
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber: MyReactHostFiber) {
  // add dom node
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // create new fibers
  const elements = fiber.props.children;
  if (elements) {
    reconcileChildren(fiber, elements);
  }
}

function reconcileChildren(wipFiber: MyReactFiber, elements: MyReactFiber[]) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling: MyReactFiber | null = null;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];

    let newFiber: MyReactFiber | null = null;

    if (element == null && oldFiber != null) {
      console.log('aaa!');
    };

    if (oldFiber && element.type === oldFiber.type) {
      // same type

      // update the node
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        parent: wipFiber,
        dom: oldFiber.dom,
        child: null,
        sibling: null,
        alternate: oldFiber,
        effectTag: 'UPDATE',
      };

    } else {
      // not same type

      // add this node
      newFiber = {
        type: element.type,
        props: element.props,
        parent: wipFiber,
        dom: null,
        child: null,
        sibling: null,
        alternate: null,
        effectTag: 'PLACEMENT',
      };

      console.log('placement', {newFiber});

      if (oldFiber) {
        // delete the oldFiber's node
        oldFiber.effectTag = 'DELETION';
        deletions?.push(oldFiber);
      }
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
    
    if (index === 0) {
      wipFiber.child = newFiber;
    } else {
      if (prevSibling == null) throw new Error();
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index += 1;
  }
}


export type { MyReactFiber, FunctionComponent };
export { render };
export default { createElement };