# Smart Events spec

## Purpose
Domain events read like facts, travel as JSON-safe payloads, and are trivial to adopt.

## Event name
Format: domain:action_past
Casing: lowercase with underscores
Examples: chat:submitted, completion:created, user:logged_in, context:compiled

## Payload
JSON-safe object with primitives and small arrays of primitives
Standard fields: id (subject id), at (ISO timestamp)
No env, no functions, no class instances
No nested objects in payload values

## Bus API
create_event_bus() -> { on, off, once, emit }
The bus is configured with opinionated defaults; no runtime options.

## Semantics
emit delivers a frozen shallow copy of the payload
When payload.at is missing, the bus fills it with the current ISO timestamp
The bus never overrides an existing payload.at

## Signals (escape hatch)
create_signal_bus() for in-process coordination payloads that may contain instances
Not for logging, persistence, or replay
Prefer direct method calls when possible

## Helpers
project_instance(instance, key) -> { [key]: primitive } for explicit projections at the call site

## Registration
Central wiring in smart_events/events.map.js for discovery
Handlers colocated with emitters for readability

## Testing
Unit test emitters and listeners together
Assert timestamp behavior and immutability

## Non-goals
Background orchestration inside the bus
Event cascades
Implicit projections or magic decoding of instances
