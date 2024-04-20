# Smart Entities

Smart Entities is a module that provides classes for managing content with embeddings. It was designed to be used with markdown files for the [Smart Connections](https://github.com/brianpetro/obsidian-smart-connections) Obsidian plugin, but is easily extendable to other file types.

## Usage

```bash
npm install smart-entities
```

## Classes

### SmartEntities

The base class for managing collections of smart entities. It provides methods for:
- loading the entities from storage 
- saving the entities to storage
- embedding the entities using a language model

### SmartEntity

The base class representing an individual smart entity. It provides properties and methods for managing the entity's data, including:
- the entity's file path
- the entity's embedding vector 
- the number of tokens in the entity's content

### SmartNotes

A subclass of `SmartEntities` for managing a collection of smart notes. It adds methods for:  
- importing notes into the collection
- ensuring embeddings exist for all notes
- pruning notes that no longer exist

### SmartNote

A subclass of `SmartEntity` representing an individual smart note. It provides properties and methods for working with a note's data, such as:
- the note's content
- the note's edit history
- the blocks contained within the note

### SmartBlocks

A subclass of `SmartEntities` for managing a collection of smart blocks. It adds methods for:
- importing blocks into the collection  
- pruning blocks that no longer exist

### SmartBlock

A subclass of `SmartEntity` representing an individual smart block. It provides properties and methods for working with a block's data, including:
- the block's text content
- the note containing the block
- the next sequential block in the note
