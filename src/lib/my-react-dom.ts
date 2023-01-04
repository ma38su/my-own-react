type EffectTag = 'UPDATE' | 'PLACEMENT' | 'DELETION';

type MyReactFiber = {
  type: string,
  dom: HTMLElement | Text | null,
  props: MyReactFiberProps,
  alternate: MyReactFiber | null,
  parent: MyReactFiber | null,
  child: MyReactFiber | null,
  sibling: MyReactFiber | null,
  effectTag?: EffectTag,
};

type MyReactFiberProps = {
  [key: string]: any,
  children?: MyReactFiber[],
}

let nextUnitOfWork: MyReactFiber | null = null;
let currentRoot: MyReactFiber | null = null;
let wipRoot: MyReactFiber | null = null;
let deletions: MyReactFiber[] | null = null;

function createDom(fiber: MyReactFiber): HTMLElement | Text {
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
  
  // TODO add nodes to dom
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}

function commitWork(fiber: MyReactFiber | null) {
  if (!fiber) {
    return;
  }

  if (fiber.parent?.dom == null) throw new Error();
  if (fiber.dom === null) throw new Error();

  const domParent = fiber.parent.dom;
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    if (fiber.alternate == null) throw new Error();
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    domParent.removeChild(fiber.dom);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
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

  // add dom node
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // create new fibers
  const elements = fiber.props.children;
  if (elements) {
    reconcileChildren(fiber, elements);
  }

  // return next unit of work
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber: MyReactFiber | null = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
  return null;
}

function reconcileChildren(wipFiber: MyReactFiber, elements: MyReactFiber[]) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling: MyReactFiber | null = null;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];

    let newFiber: MyReactFiber | null = null;

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

export { render };
