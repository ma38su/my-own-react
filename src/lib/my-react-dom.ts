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
  nextUnitOfWork = {
    type: fiber.type,
    dom: container,
    props: {
      children: [fiber],
    },
    parent: null,
    child: null,
    sibling: null,
  }
}

// 無限ループ
let nextUnitOfWork: MyReactFiber | null = null;
function workLoop(deadline: IdleDeadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
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

  if (fiber.parent?.dom) {
    fiber.parent.dom.appendChild(fiber.dom);
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
      if (prevSibling == null) throw new Error('assert');

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
