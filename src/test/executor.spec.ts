import {assert} from "chai";
import {Executor} from "../executor";
import {Work} from "../types";
import {assignWork} from "../helpers";
import TestWork from "./works";

const executor = new Executor();
// const execute = executor.submit;

// TODO: Executor no longer supports primitives, fix text to reflect
describe('Executor', () => {

    describe('executor static methods', () => {
        it('assigns work chains', () => {

        });

        it('assigns work values', () => {

        })
    });

    describe('work resolves', () => {

        it('single work sequence', async () => {
            const initialWork = {
                name : 'initial',
                func : params => Promise.resolve(params),
                value : {
                    testString : '',
                    strToAdd : 'foo'
                }
            };
            const workSequence = [
                initialWork,
                TestWork.addToStringWork()
            ];
            const result = await executor.submit(workSequence);
            assert.exists(result.foo);
            assert.equal(result.strToAdd , result.foo);
        });

        it('multiple work incrementing single value'), () => {
            const initialWork =  ({
                name : 'initial',

            });
        };

        it('multiple work incrementing single value', async () => {
            const initialValue = {value : 1};
            const expectedValue = {value : 2};
            const work = {
                name : 'testWork',
                func : () => Promise.resolve(initialValue),
                next : {
                    name : 'testWork:next',
                    func : (params) => {
                        assert.equal(params.value, initialValue.value);
                        params.value++;
                        return Promise.resolve(params);
                    }
                },
                tasks : [
                    {
                        name : 'testWork:task',
                        func : (params) => {
                            assert.equal(params, initialValue);
                            return Promise.resolve();
                        }
                    }
                ]
            };
            const result = await executor.submit(work);
            assert.equal(result.value, expectedValue.value);
        });

        it('receives work chain w/o error work', async () => {
            const index = 5;
            let tracker = {
                val : 0
            };
            const headWork = {
                name : `testWork`,
                func : () => Promise.resolve()
            };
            let work = headWork;
            for(let i = 0; i < index; i++) {
                tracker.val++;
                const val = tracker.val;
                const nextWork : Work = {
                    name : `testWork:${val}`,
                    func : (param) => {
                        if (param.val) {
                            assert.equal(param.val, (val - 1))
                        }
                        return Promise.resolve({val});
                    }
                };
                assignWork({work, nextWork});
                work = nextWork;
            }
            const result = await executor.submit(headWork);
            assert.equal(result.val, index);
        });

        it('work with retry and succeeds', async () => {
            const retries = 3;
            let retryCounter = 0;
            const work : Work = {
                name : 'retriesAfterFailure',
                func : () => {
                    retryCounter++;
                    if (retryCounter < retries) {
                        throw new Error('initialFailure');
                    }
                    assert.equal(retryCounter, retries);
                    return Promise.resolve({retryCounter});
                },
                retry : retries,
                next : {
                    name : 'retriesNext',
                    func : (params) => {
                        assert.equal(retries, params.retryCounter);
                        return Promise.resolve(params);
                    }
                },
                error : {
                    name : 'testWorkError',
                    func : () => {
                        assert.fail();
                        // return Promise.resolve({});
                    }
                }
            };
            const result = await executor.submit(work);
            assert.equal(result.retryCounter, retries);
        });

        // TODO: FIX TEST
        it.skip('errors handles to rescue flow', async () => {
            const work : Work = {
                name : 'testWork',
                func : () => {
                    throw new Error('initialFailure');
                },
                next : {
                    name : 'testWorkNext',
                    func : (params) => {
                        params++;
                        assert.equal(params, 2);
                        return Promise.resolve(params);
                    }
                },
                error : {
                    name : 'testWorkError',
                    func : (params) => {
                        const error = params.error;
                        assert.equal(error.message, 'initialFailure');
                        return Promise.resolve(1)
                    }
                }
            };
            const result = await executor.submit(work);
            assert.equal(result, 2);
        });

        // TODO: FIX TEST
        it.skip('errors handles to redirect flow', async () => {
            const work : Work = {
                name : 'testWork',
                func : () => {
                    throw new Error('initialFailure');
                },
                next : {
                    name : 'testWorkNext',
                    func : () => {
                        assert.fail();
                        // return Promise.resolve();
                    }
                },
                error : {
                    name : 'testWorkError',
                    func : () => {
                        return Promise.resolve(1);
                    },
                    next : {
                        name : 'testWorkError:next',
                        func : params => {
                            params++;
                            return Promise.resolve(params);
                        }
                    }
                }
            };
            const result = await executor.submit(work);
            assert.equal(result, 2);
        });
    })

});
