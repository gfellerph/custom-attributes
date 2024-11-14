// https://github.com/WICG/webcomponents/issues/1029

const observerConfig = {
  attributes: true,
  subtree: true,
  attributeOldValue: true,
  characterData: false,
  characterDataOldValue: false,
  childList: true,
};

const registries = new WeakMap();

export class CustomAttribute {
  #host;
  #name;

  get host() {
    return this.#host;
  }

  get value() {
    return this.#host.getAttribute(this.#name);
  }

  constructor(name, host) {
    this.#host = host;
    this.#name = name;
  }

  connectedCallback(_value) {
    // console.log("native created");
  }

  changedCallback(_newValue, _oldValue) {
    // console.log("native changed");
  }

  disconnectedCallback() {
    // console.log("native removed");
  }
}

export function registerAttribute(
  name,
  customAttribute,
  root = document,
  childList = true
) {
  const observedElements = new WeakMap();
  const existingObserver = registries.get(root);
  let observer;
  let attributeFilter = [name];

  if (existingObserver) {
    // Attribute observer already defined
    if (existingObserver.attributes.includes(name)) {
      console.error(
        `Failed to execute 'registerAttribute': the name "${name}" has already been used within the scope of ${root}.`
      );
      return;
    }
    observer = existingObserver.observer;
    attributeFilter = [...attributeFilter, ...existingObserver.attributes];
    // Reset observer to start observing with new attribute filter
    observer.disconnect();
  } else {
    observer = new MutationObserver(mutationHandler);
  }

  function mutationHandler(mutationList) {
    for (let record of mutationList) {
      // Element (or parent of element) got removed
      if (record.type === "childList" && record.removedNodes.length > 0) {
        for (let removedNode of record.removedNodes) {
          if (removedNode instanceof Element) {
            if (removedNode.hasAttribute(name)) {
              if (observedElements.has(removedNode))
                observedElements.get(removedNode)?.disconnectedCallback();
            } else {
              removedNode.querySelectorAll(`[${name}]`).forEach((node) => {
                if (observedElements.has(node))
                  observedElements.get(node)?.disconnectedCallback();
              });
            }
          }
        }
        return;
      }
      // Element with attribute got added
      if (record.type === "childList" && record.addedNodes.length > 0) {
        for (let addedNode of record.addedNodes) {
          if (addedNode instanceof Element) {
            if (addedNode.hasAttribute(name)) {
              newAttribute(addedNode);
            } else {
              addedNode.querySelectorAll(`[${name}]`).forEach((node) => {
                newAttribute(node);
              });
            }
          }
        }
        return;
      }

      if (record.type === "attributes" && record.target instanceof Element) {
        const newValue = record.target.getAttribute(name);
        const oldValue = record.oldValue;

        if (oldValue === null) {
          // New attribute
          newAttribute(record.target);
        } else if (newValue === null && observedElements.has(record.target)) {
          // Deleted
          const cls = observedElements.get(record.target);
          cls.disconnectedCallback();
          observedElements.delete(record.target);
        } else if (
          newValue !== record.oldValue &&
          observedElements.has(record.target)
        ) {
          // Change
          const cls = observedElements.get(record.target);
          cls.changedCallback(newValue, record.oldValue);
        }
      }
    }
  }

  function newAttribute(element) {
    const cls = new customAttribute(name, element);
    cls.connectedCallback(element.getAttribute(name));
    observedElements.set(element, cls);
  }

  // Start listening to changes
  observer.observe(root, { ...observerConfig, attributeFilter, childList });

  // Initial pass
  if (childList) {
    root.querySelectorAll(`[${name}]`).forEach((element) => {
      newAttribute(element);
    });
  } else if (root instanceof Element) {
    newAttribute(root);
  } else {
    // Throw error or what?
  }
}
