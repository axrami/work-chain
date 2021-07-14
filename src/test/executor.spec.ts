import {assert} from "chai";
import {Executor} from "../executor";
import {Work} from "../models/types";
import {assignWork} from "../utils/helpers";
import TestWork from "./works";
import {NoRetryError} from "../models/error";

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

        it('includes initial delay', (done) => {
            let isDone = false;
            const work = {
                name : 'work-with-delay',
                func : () => {
                    isDone = true;
                    return Promise.resolve(true);
                },
                initialDelay : 1000
            }
            executor.submit(work);
            setTimeout(() => {
                assert.equal(isDone, false);
            }, 500);
            setTimeout(() => {
                assert.equal(isDone, true);
                done()
            }, 1500);
        });

        it('includes retry delay', (done) => {
            let callCount = 0;
            const startTime = Date.now();
            const work = {
                name : 'work-with-delay',
                retry : 2,
                retryDelay : (x) => {
                    assert.equal(callCount, x);
                    return x * 500;
                },
                func : () => {
                    callCount++;
                    throw new Error("failed");
                },
                error : {
                    name : 'work-retry-delay',
                    func : (params) => {
                        assert.equal(callCount, 3);
                        const endTime = Date.now();
                        const processTime = endTime - startTime;
                        if (processTime < 1500) {
                            assert.fail("too fast, retry delay not taken");
                        }
                        done();
                        return Promise.resolve(params);
                    }
                }
            }
            executor.submit(work);
        });

        it('continues chain after no retry error', (done) => {
            let callCount = 0;
            const errorMsg = 'failed no retry';
            const work = {
                name : 'work-with-delay',
                retry : 2,
                func : () => {
                    callCount++;
                    throw new NoRetryError(errorMsg);
                },
                next : {
                    name : 'no-retry-next',
                    func : () => {
                        assert.fail('error handler not called');
                    }
                },
                error : {
                    name : 'work-retry-delay',
                    func : (params) => {
                        const {error} = params;
                        assert.equal(callCount, 1);
                        assert.equal(error.message, errorMsg);
                        done();
                        return Promise.resolve({eject : true});
                    }
                }
            }
            executor.submit(work);
        });

        it("ensure tasks values are properly passed to next work", async () => {
            const myStrs = ['dog', 'cat', 'bird'];
            const tasks : Work[] = myStrs.map(str => {
                return {
                    name : "workFor:" + str,
                    func : params => {
                        const val = params.val;
                        assert(val, str);
                        assert(params.foo, "foo");
                        return Promise.resolve(params);
                    },
                    value : {val : str}
                }
            });
            const work = {
                name : "work",
                func : () => Promise.resolve({foo : "foo"}),
                tasks
            };
            await executor.submit(work);
            return;
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
