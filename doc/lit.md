# Building Applications with Lit: A JavaScript Guide

Lit is a lightweight library for building standards-based web components. At just **5KB minified and compressed**, Lit delivers reactive state, scoped styles, and declarative templating while maximizing interoperability—components work with any framework or none at all. This guide covers everything you need to build production-ready applications with Lit using plain JavaScript.

## What Makes Lit Different

Lit builds directly on native Web Components standards (Custom Elements, Shadow DOM, HTML Templates), adding only what's necessary for a productive development experience. Unlike React or Vue, which create abstraction layers over the DOM, every Lit component is a standard web component that browsers understand natively.

The key benefits are substantial: **no virtual DOM overhead** (Lit tracks only dynamic parts and updates them directly), **framework-agnostic components** that work anywhere HTML works, and **future-ready architecture** designed with web platform evolution in mind.

Lit's core architecture consists of three main pieces: `LitElement` (a reactive base class extending HTMLElement), `lit-html` (an efficient templating system using tagged template literals), and `@lit/reactive-element` (the reactivity engine). These ship together in the `lit` package.

---

## Getting Started

### Installation

The recommended approach uses npm:

```bash
npm install lit
```

For rapid prototyping with Vite:

```bash
npm create vite@latest my-app -- --template lit
```

CDN usage is available for prototypes:

```javascript
import {
  LitElement,
  html,
  css,
} from "https://cdn.jsdelivr.net/gh/lit/dist@3/core/lit-core.min.js";
```

### Your First Component

In plain JavaScript, you define reactive properties using a static `properties` getter and register the custom element with `customElements.define()`:

```javascript
import { LitElement, html, css } from "lit";

export class MyGreeting extends LitElement {
  static properties = {
    name: { type: String },
  };

  static styles = css`
    h1 {
      color: steelblue;
    }
  `;

  constructor() {
    super();
    this.name = "World";
  }

  render() {
    return html`<h1>Hello, ${this.name}!</h1>`;
  }
}

customElements.define("my-greeting", MyGreeting);
```

Use it in HTML:

```html
<script type="module" src="./my-greeting.js"></script>
<my-greeting name="Developer"></my-greeting>
```

---

## Creating Lit Components

### Templates with the `html` Tagged Literal

Lit templates use JavaScript tagged template literals, enabling powerful expressions while maintaining security:

```javascript
render() {
  return html`
    <h1>Hello ${this.name}</h1>
    <p class=${this.highlight ? 'highlighted' : ''}>Content</p>
  `;
}
```

**Binding types** determine how expressions connect to the DOM:

| Syntax              | Purpose           | Example                                                |
| ------------------- | ----------------- | ------------------------------------------------------ |
| `${expr}`           | Child content     | `` html`<p>${this.message}</p>` ``                     |
| `attr=${expr}`      | Attribute         | `` html`<div class=${this.cls}></div>` ``              |
| `?attr=${expr}`     | Boolean attribute | `` html`<button ?disabled=${!this.valid}></button>` `` |
| `.prop=${expr}`     | Property          | `` html`<input .value=${this.text}>` ``                |
| `@event=${handler}` | Event listener    | `` html`<button @click=${this.onClick}></button>` ``   |

### Conditional Rendering and Lists

For conditionals, ternary expressions work well for simple cases:

```javascript
render() {
  return html`
    ${this.loggedIn
      ? html`<user-dashboard></user-dashboard>`
      : html`<login-form></login-form>`
    }
  `;
}
```

The `when` and `choose` directives handle more complex scenarios:

```javascript
import { when } from "lit/directives/when.js";
import { choose } from "lit/directives/choose.js";

// when directive
html`${when(this.user, () => html`Welcome ${this.user.name}`)}`;

// choose directive (switch-like)
html`${choose(this.view, [
  ["home", () => html`<home-view></home-view>`],
  ["settings", () => html`<settings-view></settings-view>`],
])}`;
```

For lists, `Array.map()` handles most cases efficiently:

```javascript
html`
  <ul>
    ${this.items.map((item) => html`<li>${item.name}</li>`)}
  </ul>
`;
```

Use `repeat` when list items have state or you're reordering large lists—it maintains DOM element identity:

```javascript
import { repeat } from "lit/directives/repeat.js";

html`
  <ul>
    ${repeat(
      this.items,
      (item) => item.id, // Key function
      (item) => html`<li>${item.name}</li>`,
    )}
  </ul>
`;
```

### Reactive Properties

Properties declared in `static properties` trigger re-renders when changed:

```javascript
export class MyComponent extends LitElement {
  static properties = {
    name: { type: String },
    count: { type: Number },
    active: { type: Boolean, reflect: true },
    complexData: { attribute: false },
    _internalState: { state: true },
  };

  constructor() {
    super();
    // Set default values in constructor
    this.name = "";
    this.count = 0;
    this.active = false;
    this.complexData = {};
    this._internalState = 0;
  }
}
```

**Property options** control behavior:

| Option       | Description                                                            |
| ------------ | ---------------------------------------------------------------------- |
| `type`       | Converter hint (`String`, `Number`, `Boolean`, `Array`, `Object`)      |
| `attribute`  | String for custom attribute name, `false` to disable attribute binding |
| `reflect`    | `true` to sync property changes back to the attribute                  |
| `state`      | `true` for internal-only reactive state (not exposed as attribute)     |
| `hasChanged` | Custom comparison function for detecting changes                       |

For private reactive state, use the `state: true` option:

```javascript
static properties = {
  _internalCounter: {state: true}
};

constructor() {
  super();
  this._internalCounter = 0;
}
```

This triggers updates but doesn't create a public attribute or API surface.

### Scoped Styles with Shadow DOM

Styles defined in `static styles` are scoped to the component and shared across instances:

```javascript
static styles = css`
  :host {
    display: block;
    background: var(--my-bg, white);
  }

  :host([disabled]) {
    opacity: 0.5;
  }

  h1 { color: steelblue; }
`;
```

**Share styles** between components:

```javascript
// shared-styles.js
import { css } from "lit";

export const buttonStyles = css`
  .btn {
    padding: 8px 16px;
    border-radius: 4px;
  }
`;

// my-component.js
import { LitElement, html, css } from "lit";
import { buttonStyles } from "./shared-styles.js";

export class MyComponent extends LitElement {
  static styles = [
    buttonStyles,
    css`
      :host {
        display: block;
      }
    `,
  ];
}
```

**Theme with CSS custom properties**:

```javascript
static styles = css`
  :host {
    background: var(--component-bg, #fff);
    color: var(--component-color, #333);
  }
`;
```

External code can then customize: `my-component { --component-bg: navy; }`

For dynamic class and style binding, use the directives:

```javascript
import {classMap} from 'lit/directives/class-map.js';
import {styleMap} from 'lit/directives/style-map.js';

render() {
  const classes = {active: this.active, hidden: this.hidden};
  const styles = {backgroundColor: this.bgColor};

  return html`
    <div class=${classMap(classes)} style=${styleMap(styles)}>
      Content
    </div>
  `;
}
```

---

## The Lit Component Lifecycle

Lit combines standard Custom Element lifecycle callbacks with a reactive update cycle.

### Standard Callbacks

```javascript
constructor() {
  super();
  // Initialize properties, no DOM access yet
  this.name = 'default';
}

connectedCallback() {
  super.connectedCallback();
  // Element added to DOM, setup external listeners
  this._handleResize = this._handleResize.bind(this);
  window.addEventListener('resize', this._handleResize);
}

disconnectedCallback() {
  super.disconnectedCallback();
  // Cleanup to prevent memory leaks
  window.removeEventListener('resize', this._handleResize);
}
```

### Reactive Update Cycle

When properties change, Lit batches updates and runs them at microtask timing:

1. **`shouldUpdate(changedProperties)`** — Return `false` to skip update
2. **`willUpdate(changedProperties)`** — Compute values before render (runs on server too)
3. **`update(changedProperties)`** — Reflects attributes, calls render (must call `super.update()`)
4. **`render()`** — Returns template to render (pure function of properties)
5. **`firstUpdated(changedProperties)`** — DOM ready for first time, ideal for focus
6. **`updated(changedProperties)`** — DOM updated, safe to measure or animate

```javascript
willUpdate(changedProperties) {
  if (changedProperties.has('firstName') || changedProperties.has('lastName')) {
    this.fullName = `${this.firstName} ${this.lastName}`;
  }
}

firstUpdated() {
  this.shadowRoot.querySelector('input').focus();
}

updated(changedProperties) {
  if (changedProperties.has('open')) {
    this._animatePanel();
  }
}
```

### Waiting for Updates

The `updateComplete` promise resolves after each update cycle:

```javascript
async handleClick() {
  this.loading = true;
  await this.updateComplete;
  // DOM now reflects loading state
  this.dispatchEvent(new CustomEvent('loading-started'));
}
```

---

## Handling Events and User Interactions

### Declarative Event Binding

Event listeners use the `@` prefix and are automatically bound to the component:

```javascript
render() {
  return html`
    <button @click=${this._handleClick}>Click me</button>
    <input @input=${this._handleInput} @keydown=${this._handleKeydown}>
  `;
}

_handleClick(e) {
  console.log('Clicked!', this.someProp); // 'this' is the component
}
```

### Dispatching Custom Events

Communicate upward with custom events:

```javascript
_handleSelection(item) {
  this.dispatchEvent(new CustomEvent('item-selected', {
    detail: {item},
    bubbles: true,
    composed: true  // Crosses shadow DOM boundaries
  }));
}
```

**Always await `updateComplete`** before dispatching events that depend on rendered state:

```javascript
async _handleToggle() {
  this.expanded = !this.expanded;
  await this.updateComplete;
  this.dispatchEvent(new CustomEvent('toggle', {
    detail: {expanded: this.expanded}
  }));
}
```

### External Event Listeners

Add listeners to window/document in `connectedCallback`, remove in `disconnectedCallback`:

```javascript
constructor() {
  super();
  // Bind once in constructor or use arrow function as class field
  this._handleResize = this._handleResize.bind(this);
}

_handleResize() {
  this.windowWidth = window.innerWidth;
}

connectedCallback() {
  super.connectedCallback();
  window.addEventListener('resize', this._handleResize);
}

disconnectedCallback() {
  window.removeEventListener('resize', this._handleResize);
  super.disconnectedCallback();
}
```

---

## State Management in Lit Applications

### Local State Patterns

Use public properties for external API and internal state properties for private state:

```javascript
static properties = {
  userId: {type: String},           // Set externally
  _userData: {state: true},         // Internal only
  _loading: {state: true}
};

constructor() {
  super();
  this.userId = '';
  this._userData = null;
  this._loading = false;
}
```

For sibling component communication, **lift state to a common parent** (mediator pattern):

```javascript
render() {
  return html`
    <search-input @search=${this._handleSearch}></search-input>
    <result-list .results=${this._results}></result-list>
  `;
}
```

### Context for Dependency Injection

The `@lit/context` package enables sharing data without prop drilling. In JavaScript, you use the `ContextProvider` and `ContextConsumer` classes:

```javascript
// context.js - Create context
import { createContext } from "@lit/context";
export const userContext = createContext("user");

// app-root.js - Provider
import { LitElement, html } from "lit";
import { ContextProvider } from "@lit/context";
import { userContext } from "./context.js";

export class AppRoot extends LitElement {
  _userProvider = new ContextProvider(this, {
    context: userContext,
    initialValue: { name: "Alice", role: "admin" },
  });

  updateUser(newUser) {
    this._userProvider.setValue(newUser);
  }
}

customElements.define("app-root", AppRoot);

// user-badge.js - Consumer (any descendant)
import { LitElement, html } from "lit";
import { ContextConsumer } from "@lit/context";
import { userContext } from "./context.js";

export class UserBadge extends LitElement {
  _userConsumer = new ContextConsumer(this, {
    context: userContext,
    subscribe: true,
  });

  render() {
    const user = this._userConsumer.value;
    return html`<span>${user?.name}</span>`;
  }
}

customElements.define("user-badge", UserBadge);
```

### Reactive Controllers for Reusable Logic

Controllers bundle state and behavior that hook into the component lifecycle:

```javascript
export class MouseController {
  host;
  pos = { x: 0, y: 0 };

  constructor(host) {
    this.host = host;
    host.addController(this);
    this._onMouseMove = this._onMouseMove.bind(this);
  }

  _onMouseMove(e) {
    this.pos = { x: e.clientX, y: e.clientY };
    this.host.requestUpdate();
  }

  hostConnected() {
    window.addEventListener("mousemove", this._onMouseMove);
  }

  hostDisconnected() {
    window.removeEventListener("mousemove", this._onMouseMove);
  }
}

// Usage in a component
import { LitElement, html } from "lit";
import { MouseController } from "./mouse-controller.js";

export class MyElement extends LitElement {
  mouse = new MouseController(this);

  render() {
    return html`<p>Mouse: ${this.mouse.pos.x}, ${this.mouse.pos.y}</p>`;
  }
}

customElements.define("my-element", MyElement);
```

### Signals for Shared Observable State

The `@lit-labs/signals` package provides deep observability:

```javascript
import { LitElement, html } from "lit";
import { SignalWatcher } from "@lit-labs/signals";
import { signal } from "@lit-labs/signals";

// Create a shared signal
export const count = signal(0);

// Create a base class with SignalWatcher
const SignalLitElement = SignalWatcher(LitElement);

export class CounterA extends SignalLitElement {
  render() {
    return html`
      <p>Count: ${count.get()}</p>
      <button @click=${this._increment}>+</button>
    `;
  }

  _increment() {
    count.set(count.get() + 1);
  }
}

customElements.define("counter-a", CounterA);
```

Multiple components using the same signal stay synchronized automatically.

---

## Composition and Component Communication

### The "Properties Down, Events Up" Pattern

Pass data to children via properties, receive notifications via events:

```javascript
// parent-component.js
render() {
  return html`
    <todo-item
      .item=${this.selectedItem}
      @item-deleted=${this._handleDelete}>
    </todo-item>
  `;
}

// todo-item.js
static properties = {
  item: {attribute: false}
};

_delete() {
  this.dispatchEvent(new CustomEvent('item-deleted', {
    detail: {id: this.item.id},
    bubbles: true,
    composed: true
  }));
}
```

### Slots for Content Projection

Default and named slots let consumers provide content:

```javascript
// my-layout.js
render() {
  return html`
    <header><slot name="header">Default Header</slot></header>
    <main><slot></slot></main>
    <footer><slot name="footer"></slot></footer>
  `;
}

// Usage
html`
  <my-layout>
    <h1 slot="header">Page Title</h1>
    <p>Main content goes in default slot</p>
    <nav slot="footer">Footer navigation</nav>
  </my-layout>
`
```

Style slotted content with `::slotted()`:

```css
::slotted(p) {
  margin: 0;
}
::slotted([slot="header"]) {
  font-size: 2em;
}
```

### DOM Queries

Without decorators, query the shadow DOM directly in lifecycle methods or getters:

```javascript
// Using getters for cached queries
get _input() {
  return this.shadowRoot.querySelector('#input');
}

get _button() {
  // Cache the result manually if needed
  if (!this.__button) {
    this.__button = this.shadowRoot.querySelector('#button');
  }
  return this.__button;
}

get _items() {
  return this.shadowRoot.querySelectorAll('.item');
}

// For slotted elements
get _slottedItems() {
  const slot = this.shadowRoot.querySelector('slot[name="items"]');
  return slot ? slot.assignedElements() : [];
}

// Use in methods
firstUpdated() {
  this._input.focus();
}
```

---

## Routing and Building Full Applications

### Client-Side Routing

Lit doesn't include a router, but `@vaadin/router` integrates well:

```javascript
import { Router } from "@vaadin/router";

const router = new Router(document.querySelector("#outlet"));
router.setRoutes([
  { path: "/", component: "home-view" },
  { path: "/users/:id", component: "user-view" },
  {
    path: "/dashboard",
    component: "dashboard-view",
    action: () => import("./views/dashboard.js"), // Lazy loading
  },
]);
```

### Server-Side Rendering

`@lit-labs/ssr` enables SSR with hydration:

```javascript
// Server
import { render } from "@lit-labs/ssr";
import { html } from "lit";

const ssrResult = render(html`<my-app></my-app>`);
const htmlString = await collectResult(ssrResult);

// Client (load hydration support first)
import "@lit-labs/ssr-client/lit-element-hydrate-support.js";
import "./my-app.js";
```

Only `constructor()`, `willUpdate()`, and `render()` execute on the server—use `connectedCallback()` for client-only code.

### Application Architecture

A typical structure:

```
/src
  /components     # Reusable UI components
  /views          # Page-level components
  /services       # API and data services
  /state          # Context providers, stores
  /utils          # Helper functions
  routes.js       # Route configuration
  index.js        # App entry point
```

---

## Testing Lit Components

### Testing Framework Setup

**Web Test Runner** is recommended for browser-based testing:

```bash
npm i -D @web/test-runner @open-wc/testing
```

Configure `web-test-runner.config.js`:

```javascript
export default {
  files: "test/**/*.test.js",
  nodeResolve: true,
};
```

### Writing Tests with @open-wc/testing

```javascript
import { fixture, html, expect, oneEvent } from "@open-wc/testing";
import "../src/my-element.js";

describe("my-element", () => {
  it("renders with default values", async () => {
    const el = await fixture(html`<my-element></my-element>`);
    expect(el.name).to.equal("World");
  });

  it("updates when property changes", async () => {
    const el = await fixture(html`<my-element name="Test"></my-element>`);
    el.name = "Updated";
    await el.updateComplete;
    expect(el.shadowRoot.querySelector("h1").textContent).to.include("Updated");
  });

  it("dispatches event on click", async () => {
    const el = await fixture(html`<my-element></my-element>`);
    setTimeout(() => el.shadowRoot.querySelector("button").click());
    const event = await oneEvent(el, "item-clicked");
    expect(event.detail).to.exist;
  });

  it("is accessible", async () => {
    const el = await fixture(html`<my-element></my-element>`);
    await expect(el).to.be.accessible();
  });
});
```

**Key testing utilities**:

| Utility                              | Purpose                                     |
| ------------------------------------ | ------------------------------------------- |
| `fixture()`                          | Creates element and awaits `updateComplete` |
| `oneEvent(el, name)`                 | Waits for specific event                    |
| `expect(el).to.be.accessible()`      | Runs axe-core accessibility audit           |
| `expect(el).shadowDom.to.equal(...)` | Semantic DOM comparison                     |

---

## Best Practices for Lit Development

### Performance Optimization

Lit's update batching handles most performance concerns automatically. Key optimizations:

**Use static styles** — Evaluated once per class, shared across instances:

```javascript
// Good - evaluated once
static styles = css`h1 { color: blue; }`;

// Avoid - re-parsed every render
render() {
  return html`<style>h1 { color: blue; }</style>`;
}
```

**Prefer `map()` over `repeat()`** — Use `repeat` only when reordering or maintaining DOM state.

**Cache expensive computations** with the `guard` directive:

```javascript
import { guard } from "lit/directives/guard.js";

html`${guard([this.data], () => this.expensiveOperation(this.data))}`;
```

**Cache DOM queries** in getters when accessed frequently:

```javascript
get _expensiveQuery() {
  if (!this.__cached) {
    this.__cached = this.shadowRoot.querySelector('.complex-selector');
  }
  return this.__cached;
}
```

For production builds, minify HTML templates:

```javascript
// rollup.config.js
import minifyHTML from "rollup-plugin-minify-html-literals";
import terser from "@rollup/plugin-terser";

export default {
  plugins: [minifyHTML(), terser({ ecma: 2021 })],
};
```

### Accessibility Considerations

Use `delegatesFocus: true` for composite widgets:

```javascript
static shadowRootOptions = {
  ...LitElement.shadowRootOptions,
  delegatesFocus: true
};
```

Expose interactive elements to assistive technology with proper ARIA attributes. Install `eslint-plugin-lit-a11y` for automated accessibility linting. Test with `@open-wc/testing`'s accessibility assertions.

### Code Organization Principles

When publishing components:

| Do                                        | Don't                             |
| ----------------------------------------- | --------------------------------- |
| Export your element class for subclassing | Bundle Lit (let apps deduplicate) |
| Include file extensions in imports        | Minify (leave to consumers)       |
| Provide JSDoc comments for API            | Create unnecessary dependencies   |

Good component candidates have their own state, their own template, are used in multiple places, and do one thing well.

### JavaScript-Specific Tips

**Always call `super()` in constructor** and set default property values there:

```javascript
constructor() {
  super();
  this.name = 'default';
  this.items = [];
}
```

**Bind event handlers** to preserve `this` context:

```javascript
constructor() {
  super();
  this._handleClick = this._handleClick.bind(this);
}

// Or use arrow functions as class fields (requires bundler support)
_handleClick = (e) => {
  console.log(this.someProp);
}
```

**Use JSDoc for documentation** and better IDE support:

```javascript
/**
 * A greeting component that displays a personalized message.
 * @element my-greeting
 * @prop {string} name - The name to greet
 * @fires greeting-clicked - Fired when the greeting is clicked
 */
export class MyGreeting extends LitElement {
  // ...
}
```

---

## Complete Component Example

Here's a full example bringing together the patterns covered in this guide:

```javascript
import { LitElement, html, css } from "lit";
import { classMap } from "lit/directives/class-map.js";

/**
 * A todo list item component.
 * @element todo-item
 */
export class TodoItem extends LitElement {
  static properties = {
    item: { attribute: false },
    _editing: { state: true },
  };

  static styles = css`
    :host {
      display: block;
      padding: 8px;
      border-bottom: 1px solid #eee;
    }

    .completed {
      text-decoration: line-through;
      opacity: 0.6;
    }

    .actions {
      display: flex;
      gap: 8px;
    }

    button {
      padding: 4px 8px;
      cursor: pointer;
    }
  `;

  constructor() {
    super();
    this.item = null;
    this._editing = false;
  }

  render() {
    if (!this.item) return html``;

    const classes = { completed: this.item.completed };

    return html`
      <div class=${classMap(classes)}>
        ${this._editing
          ? html`
              <input
                .value=${this.item.text}
                @keydown=${this._handleKeydown}
                @blur=${this._saveEdit}
              />
            `
          : html`<span @dblclick=${this._startEdit}>${this.item.text}</span>`}
        <div class="actions">
          <button @click=${this._toggleComplete}>
            ${this.item.completed ? "Undo" : "Done"}
          </button>
          <button @click=${this._delete}>Delete</button>
        </div>
      </div>
    `;
  }

  firstUpdated() {
    if (this._editing) {
      this.shadowRoot.querySelector("input")?.focus();
    }
  }

  _startEdit() {
    this._editing = true;
  }

  async _saveEdit(e) {
    const newText = e.target.value.trim();
    if (newText && newText !== this.item.text) {
      this.dispatchEvent(
        new CustomEvent("item-updated", {
          detail: { ...this.item, text: newText },
          bubbles: true,
          composed: true,
        }),
      );
    }
    this._editing = false;
  }

  _handleKeydown(e) {
    if (e.key === "Enter") {
      e.target.blur();
    } else if (e.key === "Escape") {
      this._editing = false;
    }
  }

  _toggleComplete() {
    this.dispatchEvent(
      new CustomEvent("item-updated", {
        detail: { ...this.item, completed: !this.item.completed },
        bubbles: true,
        composed: true,
      }),
    );
  }

  _delete() {
    this.dispatchEvent(
      new CustomEvent("item-deleted", {
        detail: { id: this.item.id },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

customElements.define("todo-item", TodoItem);
```

---

## Conclusion

Lit delivers a compelling development experience by embracing web standards rather than abstracting them away. Components remain interoperable across frameworks, bundle sizes stay minimal, and the reactive programming model feels familiar to developers from any background.

The key architectural patterns to internalize: properties flow down through the component tree, events bubble up, and shared state lives in Context providers or Signals. Reactive Controllers extract reusable logic, while slots enable flexible composition. This standards-based foundation means Lit components will continue working as the web platform evolves—no major rewrites required.

For JavaScript projects specifically, the static `properties` object and `customElements.define()` approach works seamlessly without any build-time transformation, making Lit an excellent choice for teams that prefer to avoid TypeScript or decorator syntax.
