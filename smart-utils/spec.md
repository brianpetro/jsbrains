# smart-utils Specification

Utility functions with no dependencies. Exports:

| Function | Description |
| --- | --- |
| `create_hash(text)` | SHA-256 hash of input string. Input longer than 100000 chars is truncated. Returns hex string. |
| `murmur_hash_32(input_string, seed)` | 32-bit MurmurHash3. |
| `murmur_hash_32_alphanumeric(input_string, seed)` | MurmurHash3 result converted to base36. |
| `fnv1a_32(input_string)` | 32-bit FNV-1a hash. |
| `fnv1a_32_alphanumeric(input_string)` | FNV-1a result converted to base36. |
| `compute_centroid(points)` | Arithmetic mean of N-dimensional points. |
| `compute_medoid(points)` | Point with minimal sum of distances to others. |
| `escape_html(str)` | Escape HTML special characters. |
| `convert_to_time_ago(timestamp)` | Convert timestamp (ms or s) to human readable difference. |
| `convert_to_human_readable_size(size)` | Format byte size to KB/MB string. |

```mermaid
flowchart TD
				A[Input] --> B(escape_html) --> C[Escaped]

		subgraph Size
				BYTES[bytes] -->|>1000| KB[Kilobytes]
				KB -->|>1000| MB[Megabytes]
		end
```
