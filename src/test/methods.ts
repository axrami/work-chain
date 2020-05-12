
namespace TestMethods {

    export const addFoo = params => {
        params.foo = 'foo';
        return Promise.resolve(params);
    };

    export const addBar = params => {
        params.bar = 'bar';
        return Promise.resolve(params);
    };

    export const addBaz = params => {
        return Promise.resolve({...params, baz : 'baz'});
    };

    export const concatFoo = params => {
        let {str} = params;
        str += 'foo';
        return Promise.resolve({...params, str})
    };

    export const concatBar = params => {
        let {str} = params;
        str += 'bar';
        return Promise.resolve({...params, str})
    };

    export const concatBaz = params => {
        let {str} = params;
        str += 'baz';
        return Promise.resolve({...params, str})
    };
}

export default TestMethods;
