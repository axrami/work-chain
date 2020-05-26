# Work Chain
A Small functional approach to abstracting asynchronous operations in an easy scalable way.

## Features
  * Provides structure in executing promises / async functions
 

## Development
Install deps

    yarn
    
Compile

    yarn compile
    
Run

    yarn run dev
    
## Examples
There are two main components. `Work` type and `Executor`. Executor receives work to execute or an array 
of work to be synchronously executed.

Submitting as work
```typescript
import {Executor, Work} from "work-chain";
const executor = new Executor();
const workToExecute : Work = {
    name : "firstFunction",
    retry : 3,
    func : ({foo, bar}) => {
        // do something with foo bar
        return Promise.resolve({baz : 'baz'});
    },
    // value is passed to func as argument
    value : {
        foo : 'foo',
        bar : 'bar'
    },
    error : {
        name : 'firstFunctionErrorHandler',
        func : ({foo, bar, error}) => {
            // is called if firstFunction throws an error.
            // receives original arguments and the error that was thrown
            // will call secondFunction if next is NOT defined in error
            return Promise.resolve({baz : 'baz'}) 
        }
    },
    next : {
        name  : 'secondFunction',
        retry : 1,
        func : ({baz}) => {
            // baz received from firstFunction
            return Promise.resolve({value : {}});
        }   
    }
}
const {value} = await executor.submit(workToExecute);
``` 

submitting as work array
```typescript
const errorHandler = (error) => {
    // do something with error
}
const valueToPass = {
    foo : 'foo'
}

const firstWork = ({valueToPass}) => ({
    name  : "firstWork",
    retry : 5,
    func  : valueToPass => myFunction(valueToPass),
    value : valueToPass,
    error : {
        name : "firstWorkErrorHandler",
        func : errorHandler
    }
});

const secondWork = {
    name : 'secondWork',
    func : returnOfFirstWork => myOtherFunction(returnOfFirstWork),
    retry : 3,
    error : {
        name : "secondWorkErrorHandler",
        func : errorHandler
    }
}
const workSequence = [
    firstWork({valueToPass}),
    secondWork
]
const returnOfLastWork = await executor.submit(workSequence);
```

## Work
| attribute  |    type     |   default  | required     |Description
| ---------- | ----------- | -----------| -----------  | ----------- |
| name       |   string    | none       |   true       | title for logging(if enabled)|
| func       |   Function  | none       |   true       | function to execute, will received both current work value and output of previous work|
| error      |   Work      | none       |   false      | function that will be called if `func` throws an error. will receive original arguments and the thrown error|
| next       |   Work      | none       |   false      | The next `Work` to be executed|
| tasks      | Array<Work> | none       |   false      | Collection of `Work` to be executed. will receive output of `func`. `next` normally if defined
| retry      |   number    | 1          |   false      | Number to retry executing `func` before calling `error` (if defined)|   
| id         |   string    | uuid       |   false      | and ID to include in logs|
