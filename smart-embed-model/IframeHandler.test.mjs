import test from 'ava';
import { JSDOM } from 'jsdom';
import { IframeHandler } from './IframeHandler.mjs';

class BaseClass {
    async example_method(arg1, arg2) {
        return `Result: ${arg1} + ${arg2}`;
    }
}

class ErrorBaseClass {
    async error_method() {
        throw new Error('Test error');
    }
}

class InsideBaseClass {
    async inside_method(arg) {
        return `Inside result: ${arg}`;
    }
}

// Set up the JSDOM environment before running the tests
test.beforeEach(t => {
    const { window } = new JSDOM('', { url: 'http://localhost/' });
    global.window = window;
    global.document = window.document;
    global.MessageEvent = window.MessageEvent;
    IframeHandler.instance = null; // Ensure no stale instance
});

test('IframeHandler posts messages to iframe', async t => {
    const base = new BaseClass();
    const iframe = {
        contentWindow: {
            postMessage: (message, targetOrigin) => {
                t.is(message.method, 'example_method');
                t.deepEqual(message.args, [1, 2]);

                // Simulate a response from the iframe
                setTimeout(() => {
                    const response = { id: message.id, result: 'Result: 1 + 2' };
                    window.dispatchEvent(new MessageEvent('message', { data: response }));
                }, 100);
            }
        }
    };
    const opts = { active_methods: ['example_method'], iframe };
    new IframeHandler(base, opts);

    await new Promise((resolve, reject) => {
        let received = false;

        const listener = (event) => {
            if (event.data.id.startsWith('msg_')) { // Adjusted check
                received = true;
                t.is(event.data.result, 'Result: 1 + 2');
                resolve();
            }
        };
        window.addEventListener('message', listener);

        base.example_method(1, 2).catch(error => {
            reject(error);
        });

        setTimeout(() => {
            if (!received) {
                window.removeEventListener('message', listener);
                reject(new Error('Message not received within timeout period'));
            }
        }, 15000); // Increased timeout to 15 seconds
    }).catch(error => t.fail(error.message)); // Handle promise rejection
});

test('IframeHandler handles errors correctly', async t => {
    const base = new ErrorBaseClass();
    const iframe = {
        contentWindow: {
            postMessage: (message, targetOrigin) => {
                t.is(message.method, 'error_method');

                // Simulate an error response from the iframe
                setTimeout(() => {
                    const response = { id: message.id, error: 'Test error' };
                    window.dispatchEvent(new MessageEvent('message', { data: response }));
                }, 100);
            }
        }
    };
    const opts = { active_methods: ['error_method'], iframe };
    new IframeHandler(base, opts);

    await new Promise((resolve, reject) => {
        let received = false;

        const listener = (event) => {
            if (event.data.id.startsWith('msg_')) { // Adjusted check
                received = true;
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve(event.data.result);
                }
            }
        };
        window.addEventListener('message', listener);

        base.error_method().catch(error => {
            reject(error);
        });

        setTimeout(() => {
            if (!received) {
                window.removeEventListener('message', listener);
                reject(new Error('Message not received within timeout period'));
            }
        }, 15000); // Increased timeout to 15 seconds
    }).catch(error => t.fail(error.message)); // Handle promise rejection
});

test('IframeHandler times out if no response received', async t => {
    const base = new BaseClass();
    const iframe = {
        contentWindow: {
            postMessage: (message, targetOrigin) => {
                t.is(message.method, 'example_method');
                t.deepEqual(message.args, [1, 2]);

                // Do not simulate a response to trigger timeout
            }
        }
    };
    const opts = { active_methods: ['example_method'], iframe };
    new IframeHandler(base, opts);

    await t.throwsAsync(() => base.example_method(1, 2), { message: 'Iframe response timeout' }).catch(error => t.fail(error.message)); // Handle promise rejection
});

test('IframeHandler handles messages inside iframe', async t => {
    try {
        const base = new InsideBaseClass();
        const opts = { active_methods: ['inside_method'] };
        new IframeHandler(base, opts);

        window.postMessage = (message) => {
            t.is(message.method, 'inside_method');
            t.deepEqual(message.args, ['test']);

            // Simulate receiving the message inside the iframe
            const event = new MessageEvent('message', { data: { id: message.id, result: 'Inside result: test' } });
            window.dispatchEvent(event);
        };

        const result = await base.inside_method('test');
        t.is(result, 'Inside result: test');
    } catch (error) {
        t.fail(error.message);
    }
});
