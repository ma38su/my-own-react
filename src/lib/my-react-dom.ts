type MyReactFiber = {
  type: string,
  dom: HTMLElement | Text | null,
  props: {
    [key: string]: any,
    children: MyReactFiber[],
  },
  parent: MyReactFiber | null,
  child: MyReactFiber | null,
  sibling: MyReactFiber | null,
};


function render(fiber: MyReactFiber, container: HTMLElement) {
  wipRoot = {
    type: 'root',
    dom: container,
    props: {
      children: [fiber],
    },
    parent: null,
    child: null,
    sibling: null,
  };
  nextUnitOfWork = wipRoot;
}

let wipRoot: MyReactFiber | null = null;
let nextUnitOfWork: MyReactFiber | null = null;

function commitRoot() {
  if (wipRoot == null) return;
  
  // TODO add nodes to dom
  commitWork(wipRoot.child);
  wipRoot = null;
}

function commitWork(fiber: MyReactFiber | null) {
  if (!fiber) {
    return;
  }

  if (fiber.parent?.dom == null) throw new Error();
  if (fiber.dom === null) throw new Error();

  const domParent = fiber.parent.dom;
  domParent.appendChild(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
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

function createDom(fiber: MyReactFiber): HTMLElement | Text {
  const { type } = fiber;
  const dom = type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(type);

  const isProperty = (key: string) => key !== 'children';
  Object.keys(fiber.props)
    .filter(isProperty)
    .forEach(name => {
      (dom as any)[name] = fiber.props[name];
    })
  return dom;
}

function performUnitOfWork(fiber: MyReactFiber): MyReactFiber | null {

  // add dom node
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  // create new fibers
  const elements = fiber.props.children;
  let index = 0;
  let prevSibling: MyReactFiber | null = null;
  while (index < elements.length) {
    const element = elements[index];
    const newFiber = {
      type: element.type,
      dom: null,
      props: element.props,
      parent: fiber,
      child: null,
      sibling: null,
    };

    if (index === 0) {
      fiber.child = newFiber;
    } else {
      if (prevSibling == null) throw new Error();
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index += 1;
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

export { render };
