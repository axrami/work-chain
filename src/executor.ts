import {Work, WorkInternal}                     from "./models/types";
import {assignWork, linkChain, uuid}            from "./utils/helpers";
import {DebugLogger, DefaultLogger, ILogger}    from "./utils/logger";
import {NoRetryError} from "./models/error";

export type ExecutorParams = {
    logger          ?: ILogger;
    retry           ?: number;
    retryDelay      ?: (x: number) => number;
    module          ?: string;
    debug           ?: boolean;
    errorWithValue  ?: boolean;
}

export class Executor {
    private readonly module         : string;
    private readonly retryDefault   : number;
    private readonly retryDelay    ?: (x : number) => number;
    private readonly log            : ILogger;
    private readonly errorWithValue : boolean;
    private activeWork              : number;

    constructor(params ?: ExecutorParams) {
        this.module = params?.module || '[Executor]';
        this.activeWork = 0;
        this.retryDefault = params?.retry || 0;
        this.errorWithValue = params?.errorWithValue || false;
        this.retryDelay = params?.retryDelay;
        this.log = params?.debug ? (params?.logger || DebugLogger) : DefaultLogger;
    }

    private async timeout(time) {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve();
            }, time);
        });
    }

    public async submit(work : Work | Work[]) {
        const submittedWork : Work = Array.isArray(work) ? linkChain(work) : work;
        const workToRun : WorkInternal = {
            ...submittedWork,
            attempted : 0,
            id : submittedWork.id|| uuid(),
            retry : submittedWork.retry || this.retryDefault
        }
        if (workToRun.initialDelay) {
            await this.timeout(workToRun.initialDelay);
        }
        return this.run(workToRun);
    }

    public assignWork = assignWork;

    public linkChain = linkChain;

    private async run(work : WorkInternal) {
        const workToExecute = work;
        const arg = workToExecute.value;
        const name = workToExecute.name;
        const id = workToExecute.id;
        try {
            work.attempted++;
            this.log.debug(`${this.module} job begin, name:${name}, id:${id}, attempt:${work.attempted}`);
            const value = Object.assign({}, await workToExecute.func(arg));
            this.activeWork--;
            this.log.debug(`${this.module} job complete, name:${name}, id:${id}`);
            if (value.eject === true) { // job has decided to no longer continue chain
                this.log.debug(`${this.module} job ejected, name:${name}, id:${id}`);
                delete workToExecute.tasks;
                delete workToExecute.next;
                delete value.tasks;
            }
            if (workToExecute.tasks || value.tasks) {
                const tasks = workToExecute.tasks || value.tasks;
                delete value.tasks;
                tasks.forEach((task: Work) => {
                    this.log.debug(`${this.module} submitting task next task:${work.name}, name:${name}, id:${id}`);
                    task.value = {...task.value, ...value};
                    task.id = id;
                    this.submit(task); // fire and forget
                });
            }
            if (workToExecute.next) {
                this.log.debug(`${this.module} submitting next job:${workToExecute.next.name}, name:${name}, id:${id}`);
                workToExecute.next.value = {...workToExecute.next.value, ...value};
                workToExecute.next.id = id;
                return this.submit(workToExecute.next);
            } else {
                this.log.debug(`${this.module} chain complete name:${name}, id:${id}`);
                return value;
            }
        } catch (error) {
            this.log.error(`${this.module} job failed with error:${error.message}, name:${name}, id:${id}`);
            const isNoRetry = error instanceof NoRetryError;
            if (isNoRetry) {
                this.log.debug(`error of type no retry. ignoring retries:${workToExecute.retry}, with attempts:${workToExecute.attempted}`);
            }
            if (workToExecute.retry > 0 && !isNoRetry) {
                workToExecute.retry--;
                const retryDelayFunc = workToExecute.retryDelay || this.retryDelay;
                if (retryDelayFunc) {
                    const retryDelay = retryDelayFunc(workToExecute.attempted);
                    await this.timeout(Number.isInteger(retryDelay) ? retryDelay : 0);
                }
                this.log.debug(`${this.module} job retrying remaining attempts:${workToExecute.retry}, name:${name}, id:${id}`);
                return this.run(workToExecute);
            }
            if (workToExecute.error) { // call work error handler
                this.log.error(`${this.module} job failed submitting error handler:${workToExecute.error.name}, name:${name}, id:${id}`);
                workToExecute.error.value =  {...workToExecute.value, ...{error}};
                workToExecute.error.id = id;
                if (!workToExecute.error.next) { // if error has next, allow it to re-route work logic
                    workToExecute.error.next = workToExecute.next; // attempt to rescue flow with error work
                    const errTasks = workToExecute?.error?.tasks || [];
                    workToExecute.error.tasks = errTasks.concat(workToExecute?.tasks || []);
                }
                this.activeWork--;
                return this.submit(workToExecute.error);
            }
            // Work failed all retries, drop and log
            this.activeWork--;
            this.log.error(`${this.module} FATAL job failed, name:${name}, id:${id}, message:${error.message}`);
        }
    }
}



