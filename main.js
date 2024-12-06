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

/**
 * Extend from this class to create a custom attribute observer
 */
export class CustomAttribute {
  #host;
  #name;

  /**
   * Get the host element that has the custom attribute
   *
   * @return  {HTMLElement}
   */
  get host() {
    return this.#host;
  }

  /**
   * Get the attribute value. Returns a boolean for boolean attributes
   *
   * @return  {string|boolean}  Attribute value
   */
  get value() {
    return this.#host.getAttribute(this.#name);
  }

  /**
   * Attribute name
   *
   * @return {string}
   */
  get name() {
    return this.#name;
  }

  /**
   * Register a new custom attribute
   *
   * @param   {string}  name  Custom attribute name
   * @param   {HTMLElement}  host  Host element
   *
   * @return  {void}
   */
  constructor(name, host) {
    this.#host = host;
    this.#name = name;
  }

  /**
   * Callback when attribute is first seen in DOM. Will also be called on the initial pass after registering a custom attribute if it already exists
   *
   * @param {string} _value Attribute value
   *
   * @return {void}
   */
  connectedCallback(_value) {
    // console.log("native created");
  }

  /**
   * Callback for attribute value changes
   *
   * @param {string} _newValue  New value
   * @param {string} _oldValue  Old value
   *
   * @return {void}
   */
  changedCallback(_newValue, _oldValue) {
    // console.log("native changed");
  }

  /**
   * Callback for when attribute gets removed or the host element gets removed from DOM
   *
   * @return {void}
   */
  disconnectedCallback() {
    // console.log("native removed");
  }
}

/**
 * Register a custom attribute
 * @param {string} name The name of the custom attribute
 * @param {CustomAttribute.constructor} customAttribute Class for the custom attribute
 * @param {HTMLElement} [root=document] Root node for scoping mutation observers
 * @param {boolean} [childList=false] Specify if children of root should be observed as well
 * @returns
 */
export function registerAttribute(
  name,
  customAttribute,
  root = document,
  childList = true
) {
  if (typeof name !== "string") {
    throw new Error(
      `registerAttribute: expected parameter name to be of type string but received ${typeof name}`
    );
  }

  if (!(customAttribute instanceof CustomAttribute)) {
    throw new Error(
      `registerAttribute: expected parameter customAttribute to be an instance of CustomAttribute but received ${customAttribute}`
    );
  }

  if (!(root instanceof HTMLElement)) {
    throw new Error(
      `registerAttribute: expected parameter root to be an instance of HTMLElement but received ${root}`
    );
  }

  if (typeof childList !== "boolean") {
    throw new Error(
      `registerAttribute: expected parameter childList to be of type boolean but received ${typeof childList}`
    );
  }

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
          if (!(removedNode instanceof Element)) {
            continue;
          }
          if (
            removedNode.hasAttribute(name) &&
            observedElements.has(removedNode)
          ) {
            observedElements.get(removedNode)?.disconnectedCallback();
            observedElements.delete(removedNode);
          }

          // Call disconnected callback on all removed child nodes
          removedNode.querySelectorAll(`[${name}]`).forEach((node) => {
            if (observedElements.has(node)) {
              observedElements.get(node)?.disconnectedCallback();
              observedElements.delete(node);
            }
          });
        }
        return;
      }

      // Element with attribute got added
      if (record.type === "childList" && record.addedNodes.length > 0) {
        for (let addedNode of record.addedNodes) {
          if (!(addedNode instanceof Element)) {
            continue;
          }
          if (addedNode.hasAttribute(name)) {
            newAttribute(addedNode);
          }
          addedNode.querySelectorAll(`[${name}]`).forEach((node) => {
            newAttribute(node);
          });
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

  /**
   * Initiate a new instance
   * @param {HTMLElement} element Element with target attribute
   */
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
    throw new Error(
      `Custom Attribute: Can't register custom attribute on root (${root}) of type ${typeof root}. Root must be a valid element node.`
    );
  }
}
