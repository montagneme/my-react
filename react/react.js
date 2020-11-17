let nextUnitOfWork = null; //存放下个待处理的fiber
let fiberRoot = null;
let currentRoot = null;
let deletions = null; //
//以下变量用于hooks
let wipFiber = null;
let hookIndex = null;
const isProps = key => key !== 'children';
const isEvent = key => key.startsWith('on');
function createElement (type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => (typeof child === 'object' ? child : createTextElement(child)))
    }
  };
}
function createTextElement (text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: []
    }
  };
}
function createDom (fiber) {
  const dom = fiber.type === 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type);
  Object.keys(fiber.props).filter(isEvent).forEach(eventKey => {
    const eventType = eventKey.toLowerCase().substring(2);
    dom.addEventListener(eventType, fiber.props[eventKey]);
  });

  Object.keys(fiber.props).filter(isProps).forEach(name => (dom[name] = fiber.props[name]));
  return dom;
}
function render (element, container) {
  fiberRoot = {
    //初始化Rootfiber
    dom: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  };
  deletions = [];
  nextUnitOfWork = fiberRoot;
  requestIdleCallback(renderWork);
}
function renderWork (dl) {
  while (nextUnitOfWork) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork); //单元work
    if (dl.timeRemaining() < 1) {
      break;
    }
  }
  if (nextUnitOfWork) {
    requestIdleCallback(renderWork);
  } else {
    commitRoot();
  }
}
function performUnitOfWork (fiber) {
  const isFunction = fiber.type instanceof Function;
  isFunction ? updateFunctionComponent(fiber) : updateHostComponent(fiber);
  //返回下一个处理单元
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.return;
  }
}
function updateFunctionComponent (fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = []; //此处为数组，因为用户会多次调用useState
  const elements = [fiber.type(fiber.props)]; //调用fiber.type(fiber.props)时可能内部就会有调用useState()
  reconcileChildren(fiber, elements);
}
function updateHostComponent (fiber) {
  //处理真实dom节点
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  //处理子fiber节点
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);
}
function reconcileChildren (fiber, elements) {
  //在这个函数做diff
  let index = 0;
  let oldFiber = fiber.alternate && fiber.alternate.child;
  let siblingFiber = null;
  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;
    ///
    const sameType = oldFiber && element && element.type === oldFiber.type;
    if (sameType) {
      //新旧节点同时存在并且type相同 需要更新
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        return: fiber,
        alternate: oldFiber,
        effectTag: 'UPDATE' //effectTag标志符在commit阶段使用
      };
    }
    if (element && !sameType) {
      //新节点存在 并且与旧节点type不相同 需要新增
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        return: fiber,
        alternate: null,
        effectTag: 'PLACEMENT'
      };
    }
    if (oldFiber && !sameType) {
      //旧节点存在 并且与新节点type不相同 需要删除
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }
    ///
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
    if (index === 0) {
      //如果为第一个节点,那么为child
      fiber.child = newFiber;
    } else {
      //如果不为第一个节点,那么为child的兄弟节点
      siblingFiber.sibling = newFiber;
    }
    siblingFiber = newFiber;
    index++;
  }
}
function commitRoot () {
  deletions.forEach(commitWork);
  commitWork(fiberRoot.child);
  currentRoot = fiberRoot;
  fiberRoot = null;
}
function commitWork (fiber) {
  if (!fiber) {
    return;
  }
  let parentFiber = fiber.return;
  while (!parentFiber.dom) {
    //需要循环查找因为存在组件层 {type:App(),dom:null}
    parentFiber = parentFiber.return;
  }
  const parentDom = parentFiber.dom;
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    parentDom.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, parentDom); //单独用一个函数处理删除标记，因为需要用递归查找带有dom的元素
  }
  // parentDom.appendChild(fiber.dom);
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
function commitDeletion (fiber, parentDom) {
  if (fiber.dom) {
    parentDom.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, parentDom);
  }
}
function updateDom (dom, prevProps, nextProps) {
  //处理事件(移除)
  Object.keys(prevProps).filter(isEvent).forEach(eventKey => {
    if (!nextProps[eventKey] || nextProps[eventKey] !== prevProps[eventKey]) {
      const eventType = eventKey.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[eventKey]);
    }
  });
  //处理普通属性(移除)
  Object.keys(prevProps).filter(isProps).forEach(key => !nextProps[key] && (dom[key] = ''));
  //处理普通属性(新增)
  Object.keys(nextProps)
    .filter(isProps)
    .forEach(key => nextProps[key] !== prevProps[key] && (dom[key] = nextProps[key]));
  //处理事件(新增)
  Object.keys(nextProps).filter(isEvent).forEach(eventKey => {
    if (nextProps[eventKey] !== prevProps[eventKey]) {
      const eventType = eventKey.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[eventKey]);
    }
  });
}
export function useState (initial) {
  const oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex];
  const hook = { state: oldHook ? oldHook.state : initial, queue: [] };
  const actions = oldHook ? oldHook.queue : [];
  actions.forEach(action => {
    hook.state = action instanceof Function ? action(hook.state) : action;
  });
  const setState = action => {
    hook.queue.push(action);
    if (!fiberRoot) {
      fiberRoot = {
        //初始化Rootfiber
        dom: currentRoot.dom,
        props: currentRoot.props,
        alternate: currentRoot
      };
      deletions = [];
      nextUnitOfWork = fiberRoot;
      requestIdleCallback(renderWork);
    }
  };
  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}
export function useEffect (fn, dependencies) {}
const React = {
  createElement,
  render
};
export default React;
