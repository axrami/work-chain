import {Work} from "../types";
import {assignWork} from "../helpers";
import TestMethods from "./methods";

export namespace TestWork {

    export const incrementNumWork = ({work}) => {
        const nextWork = {
            name : 'incrementNumber',
            func : params => {
                let {number} = params;
                number++;
                return params;
            }
        };
        return assignWork({work, nextWork});
    };

    export const addToStringWork = () : Work => {
        return {
            name : 'addToString',
            func : params  => {
                const {strToAdd} = params;
                switch(strToAdd) {
                    case 'foo':
                        return TestMethods.addFoo(params);
                    case 'bar':
                        return TestMethods.addBar(params);
                    case 'baz':
                        return TestMethods.addBaz(params);
                    default :
                        throw new Error();
                }
            }
        };
    };

    export const addAttrWork = ({work}) => {
        const nextWork = {
            name : 'attrToConcat',
            func : params  => {
                const {strToAdd} = params;
                switch(strToAdd) {
                    case 'foo':
                        return TestMethods.concatFoo(params);
                    case 'bar':
                        return TestMethods.concatBar(params);
                    case 'baz':
                        return TestMethods.concatBaz(params);
                    default :
                        throw new Error();
                }
            }
        };
        return assignWork({work, nextWork});
    };

}

export default TestWork;
