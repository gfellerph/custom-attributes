# Custom attributes

If you wished HTML attributes had lifecycles, this one's for you.

## Installation

```shell
npm install custom-attributes
```

## Usage

Custom attributes lets you create classes with lifecycle hooks, similar to custom elements.

```js
import { registerAttribute, CustomAttribute } from 'custom-attributes';

class MyAttribute extends CustomAttribute {
  connectedCallback() {
    console.log(`${this.name} connected on ${this.host}.`);
  }

  changedCallback(newValue, oldValue) {
    console.log(`${this.name} changed from ${oldValue} to ${newValue}.`);
  }

  disconnectedCallback() {
    console.log(`${this.name} disconnected from ${this.host}.`
  }
}

registerAttribute('my-attribute', MyAttribute);
```

## Documentation

### `CustomAttribute`

| Member | Type | Description |
| :--- | :--- | :--- |
| `get name` | `string` | Attribute name |
| `get host` | `HTMLElement` | Host element |
| `get value` | `string` | Attribute value |
| `connectedCallback` | `(value: string) => void` | Called when attribute enters the DOM or after registration if attribute was already present |
| `changedCallback` | `(newValue: string, oldValue: string) => void` | Called when the attribute value changes |
| `disconnectedCallback` | `() => void` | Called when attribute gets deleted or the host element gets removed from DOM |

### `registerAttribute`

| Parameter | Type | Default value | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | | Attribute name. Should contain a dash (and not start with `aria-`) to prevent clashes with standard browser attribute names.  |
| `customAttribute` | `CustomAttribute.constructor` | | A class for registering the custom attribute |
| `scope` | `HTMLElement` | `document.body` | Element scope |
| `childList` | `boolean` | `true` | Sets the `childList` option of mutation observers. Set this to false if you only want to observe the element defined as `scope`. Observes all child elements of `scope` if true. |
