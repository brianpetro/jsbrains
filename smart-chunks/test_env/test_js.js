/**
 * Represents a book in the library.
 * @class
 */
class Book {
    /**
     * Create a book.
     * @param {string} title - The title of the book.
     * @param {string} author - The author of the book.
     */
    constructor(title, author) {
        this.title = title;
        this.author = author;
    }

    /**
     * Get the book's title.
     * @return {string} The title of the book.
     */
    get_title() {
        return this.title;
    }

    /**
     * Get the book's author.
     * @return {string} The author of the book.
     */
    get_author() {
        return this.author;
    }
}

/**
 * Adds two numbers together.
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @return {number} The sum of the two numbers.
 */
function add(a, b) {
    return a + b;
}

/**
 * Subtracts the second number from the first.
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @return {number} The difference of the two numbers.
 */
function subtract(a, b) {
    return a - b;
}