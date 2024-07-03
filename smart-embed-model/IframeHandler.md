# IframeHandler Class Documentation

## Overview

The `IframeHandler` class is designed to facilitate communication between a parent window and an iframe. It allows methods in a base class to be called from the parent window, with the results being sent back from the iframe.

## Constructor

### Syntax

```javascript
new IframeHandler(base_class, opts);
```

### Parameters

- `base_class` (Object): The base class instance containing the methods to be proxied.
- `opts` (Object): An options object containing the following properties:
  - `active_methods` (Array): A list of method names from the base class that need to be handled by the `IframeHandler`.
  - `iframe` (Object) (optional): A reference to the iframe element. If not provided, the handler assumes it is running inside the iframe.

## Methods

### setup_iframe_communication(iframe)

Sets up the communication mechanism to post messages to the iframe for the specified active methods.

### setup_message_listener()

Sets up the message listener to handle incoming messages when running inside the iframe.

### handle_iframe_response(event)

Handles the response received from the iframe and resolves or rejects the corresponding promise based on the response.

### add_global_message_listener()

Adds a global message listener to handle messages from the iframe.

## Usage

### Example: Parent Window

```javascript
class BaseClass {
    async example_method(arg1, arg2) {
        return `Result: ${arg1} + ${arg2}`;
    }
}

const base = new BaseClass();
const iframe = document.getElementById('myIframe');
const opts = { active_methods: ['example_method'], iframe };
new IframeHandler(base, opts);

// Call the proxied method
base.example_method(1, 2).then(result => console.log(result)).catch(error => console.error(error));
```

### Example: Inside Iframe

```javascript
class BaseClass {
    async example_method(arg1, arg2) {
        return `Result: ${arg1} + ${arg2}`;
    }
}

const base = new BaseClass();
const opts = { active_methods: ['example_method'] };
new IframeHandler(base, opts);
```

In the above examples, if the `iframe` property is provided, the `example_method` calls will be proxied through the iframe. If running inside the iframe, the `example_method` will be executed and the result will be posted back to the parent window.

## Error Handling

Errors are communicated via an `error` property in the message payloads, and the class outside the iframe should re-throw the same error when detected.

## Timeout

A 10-second timeout is used when waiting for a response from the iframe. If no response is received within this period, an error will be thrown.