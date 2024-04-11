# Smart Collections
Smart Collections is a JavaScript library that provides a convenient interface for managing collections of items.

```bash
npm install smart-collections
```

## usage

```javascript
const { Collection, CollectionItem } = require('smart-collections');
class MyCollection extends Collection { ... };
class MyCollectionItem extends CollectionItem { ... };
```

### Collections

- `Collection` is a base collection class that provides functionality for managing a collection of items.
- It includes methods for creating, updating, reading, and deleting items within the collection.
- The class also supports saving and loading the collection data from disk. 
- Additionally, it provides convenience methods for accessing information about the collection and its items.

### Collection Items

- `CollectionItem` is a class that represents an individual item within a collection.
- It encapsulates the data and behavior associated with an item.
- The class includes methods for updating and saving the item's data, as well as initializing and parsing the item.
- These classes are part of a JavaScript library or application that utilizes collections of items and provides a convenient interface for managing and manipulating them.

## about
Smart Collections was built for the [Smart Connections](https://smartconnections.app) Obsidian plugin and [Smart Predictions Framework](https://wfhbrian.com/).