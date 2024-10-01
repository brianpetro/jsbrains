import test from 'ava';
import { javascript_to_blocks } from "./javascript_to_blocks.js";

test('Example 1: Functions and Classes', t => {
  const code = `function foo() {
  console.log("foo");
  function bar() {
    console.log("bar");
  }
}

class MyClass {
  constructor() {
    this.value = 0;
  }
  myMethod() {
    console.log("method");
  }
}

const arrowFunc = () => {
  console.log("arrow function");
};

if (condition) {
  doSomething();
} else {
  doSomethingElse();
}
`;

  const expected = {
    "#function foo()": [1,7],
    "#function foo()#function bar()": [3,5],
    "#class MyClass": [8,16],
    "#class MyClass#constructor()": [9,11],
    "#class MyClass#myMethod()": [12,14],
    "#const arrowFunc = () =>": [17,20],
    "#if (condition)": [21,26],
    "#if (condition)#else": [23,26]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Example 2: Async Functions and Try-Catch', t => {
  const code = `async function fetchData() {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(error);
  }
}

class DataService {
  constructor(apiEndpoint) {
    this.apiEndpoint = apiEndpoint;
  }
  
  getData() {
    return fetchData(this.apiEndpoint);
  }
  
  processData() {
    const data = this.getData();
    // Process data
    return data;
  }
}
`;

  const expected = {
    "#async function fetchData()": [1,10],
    "#async function fetchData()#try": [2,8],
    "#async function fetchData()#try#catch (error)": [6,8],
    "#class DataService": [11,25],
    "#class DataService#constructor(apiEndpoint)": [12,14],
    "#class DataService#getData()": [16,18],
    "#class DataService#processData()": [20,24]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Example 3: Object Methods and Anonymous Functions', t => {
  const code = `const utils = {
  calculate() {
    return (a, b) => a + b;
  },
  log(message) {
    console.log(message);
  }
};

function wrapper() {
  const sum = utils.calculate();
  console.log(sum(5, 3));
}
`;

  const expected = {
    "#const utils = {": [1,9],
    "#const utils = {#calculate()": [2,4],
    "#const utils = {#calculate()#<anonymous>": [3,3],
    "#const utils = {#log(message)": [5,7],
    "#function wrapper()": [10,14]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Example 4: IIFE and Control Structures', t => {
  const code = `(() => {
  console.log("IIFE Arrow Function");
  if (true) {
    console.log("Inside IIFE");
  }
})();
`;

  const expected = {
    "#<anonymous>": [1,7],
    "#<anonymous>#if (true)": [3,5]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Example 5: Classes with Inheritance', t => {
  const code = `class Vehicle {
  constructor(type) {
    this.type = type;
  }
  startEngine() {
    console.log("Engine started");
  }
}

class Car extends Vehicle {
  constructor(type, model) {
    super(type);
    this.model = model;
  }
  drive() {
    console.log("Driving");
  }
}
`;

  const expected = {
    "#class Vehicle": [1,9],
    "#class Vehicle#constructor(type)": [2,4],
    "#class Vehicle#startEngine()": [5,7],
    "#class Car extends Vehicle": [10,19],
    "#class Car extends Vehicle#constructor(type, model)": [11,14],
    "#class Car extends Vehicle#drive()": [15,17]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Multiple Functions with Same Name at Same Level', t => {
  const code = `function duplicate() {
  console.log("First duplicate");
}

function duplicate() {
  console.log("Second duplicate");
}
`;

  const expected = {
    "#function duplicate()": [1,3],
    "#function duplicate()[2]": [5,7]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Nested Control Structures', t => {
  const code = `if (a > b) {
  while (condition) {
    for (let i = 0; i < 10; i++) {
      doSomething();
    }
  }
}
`;

  const expected = {
    "#if (a > b)": [1,8],
    "#if (a > b)#while (condition)": [2,7],
    "#if (a > b)#while (condition)#for (let i = 0; i < 10; i++)": [3,5]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Anonymous Functions Not Assigned to Variables', t => {
  const code = `setTimeout(function() {
  console.log("Timeout");
}, 1000);
`;

  const expected = {
    "#<anonymous>": [1,4]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Code Outside Any Block', t => {
  const code = `console.log("This is global code");

function doSomething() {
  console.log("Inside function");
}
`;

  const expected = {
    "#": [1,1],
    "#function doSomething()": [3,6]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Strings and Comments Handling', t => {
  const code = `function tricky() {
  const str = "function inside string { }";
  /* Comment with { } */
  // Single line comment with { }
  console.log(str);
}
`;

  const expected = {
    "#function tricky()": [1,7]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Generator and Async Functions', t => {
  const code = `async function asyncFunc() {
  await doAsyncTask();
}

function* generatorFunc() {
  yield 1;
  yield 2;
}
`;

  const expected = {
    "#async function asyncFunc()": [1,4],
    "#function* generatorFunc()": [5,9]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Arrow Functions Assigned to Variables', t => {
  const code = `const add = (a, b) => {
  return a + b;
};

const multiply = function(a, b) {
  return a * b;
};
`;

  const expected = {
    "#const add = (a, b) =>": [1,4],
    "#const multiply = function(a, b)": [5,8]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Immediately Invoked Function Expressions (IIFE)', t => {
  const code = `(function() {
  console.log("IIFE");
})();
`;

  const expected = {
    "#<anonymous>": [1,4]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Nested Classes and Methods', t => {
  const code = `class OuterClass {
  constructor() {}

  class InnerClass {
    constructor() {}
    method() {}
  }
}
`;

  const expected = {
    "#class OuterClass": [1,8],
    "#class OuterClass#constructor()": [2,3],
    "#class OuterClass#class InnerClass": [4,7],
    "#class OuterClass#class InnerClass#constructor()": [5,5],
    "#class OuterClass#class InnerClass#method()": [6,6]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Complex Control Structures Without Braces', t => {
  const code = `if (condition) doSomething();

for (let i = 0; i < 5; i++) console.log(i);
`;

  const expected = {
    "#if (condition)": [1,2],
    "#for (let i = 0; i < 5; i++)": [3,4]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('ES6 Modules', t => {
  const code = `import { moduleA } from './moduleA';
export function exportedFunc() {
  console.log("Exported function");
}
`;

  const expected = {
    "#": [1,1],
    "#export function exportedFunc()": [2,5]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Special Characters in Labels', t => {
  const code = `class $Special_Class {
  constructor() {}
}

function _privateFunction() {}

async function* specialGenerator() {}
`;

  const expected = {
    "#class $Special_Class": [1,4],
    "#class $Special_Class#constructor()": [2,2],
    "#function _privateFunction()": [5,6],
    "#async function* specialGenerator()": [7,8]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Multiple Occurrences of Blocks with Same Name at Different Levels', t => {
  const code = `function duplicate() {
  function duplicate() {
    console.log("Nested duplicate");
  }
}

function duplicate() {
  console.log("Another duplicate");
}
`;

  const expected = {
    "#function duplicate()": [1,6],
    "#function duplicate()#function duplicate()": [2,4],
    "#function duplicate()[2]": [7,10]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Nested Anonymous Functions', t => {
  const code = `const outer = function() {
  return function() {
    return function() {
      console.log("Deeply nested anonymous function");
    };
  };
};
`;

  const expected = {
    "#const outer = function()": [1,8],
    "#const outer = function()#<anonymous>": [2,6],
    "#const outer = function()#<anonymous>#<anonymous>": [3,5]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Methods in Object Literals', t => {
  const code = `const obj = {
  methodOne() {
    console.log("Method One");
  },
  methodTwo: function() {
    console.log("Method Two");
  },
  methodThree: () => {
    console.log("Method Three");
  }
};
`;

  const expected = {
    "#const obj = {": [1,12],
    "#const obj = {#methodOne()": [2,4],
    "#const obj = {#methodTwo: function()": [5,7],
    "#const obj = {#methodThree: () =>": [8,10]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});

test('Complex Mixed Content', t => {
  const code = `import moduleA from 'moduleA';

class MainClass {
  constructor() {
    this.name = "Main";
  }

  mainMethod() {
    function helperFunction() {
      console.log("Helper");
    }
    if (this.name) {
      helperFunction();
    }
  }
}

export default MainClass;
`;

  const expected = {
    "#": [1,2],
    "#class MainClass": [3,17],
    "#class MainClass#constructor()": [4,7],
    "#class MainClass#mainMethod()": [8,15],
    "#class MainClass#mainMethod()#function helperFunction()": [9,11],
    "#class MainClass#mainMethod()#if (this.name)": [12,14],
    "#export default MainClass;": [18,19]
  };

  const result = javascript_to_blocks(code);
  t.deepEqual(result, expected);
});
