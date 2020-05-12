import {Work, WorkInternal}                     from "./types";
import {assignWork, linkChain, uuid}            from "./helpers";
import {DebugLogger, DefaultLogger, ILogger}    from "./logger";

export type ExecutorParams = {
    logger          ?: ILogger;
    retry           ?: number;
    debug           ?: boolean;
    errorWithValue  ?: boolean;
}

export class Executor {
    private readonly module         : string;
    private readonly retryDefault   : number;
    private readonly log            : ILogger;
    private readonly errorWithValue : boolean;
    private activeWork              : number;

    constructor(params ?: ExecutorParams) {
        this.module = '[Executor]';
        this.activeWork = 0;
        this.retryDefault = params?.retry || 0;
        this.errorWithValue = params?.errorWithValue || false;
        this.log = params?.debug ? (params?.logger || DebugLogger) : DefaultLogger;
    }

    public async submit(work : Work | Work[]) {
        const workToRun = Array.isArray(work) ? linkChain(work) : work;
        this.activeWork++; // TODO: support queue size definition
        workToRun.retry = workToRun.retry || this.retryDefault;
        workToRun.id = workToRun.id || uuid();
        return this.run(workToRun as WorkInternal);
    }

    public static assignWork = assignWork;

    public static linkChain = linkChain;

    private async run(work : WorkInternal) {
        const workToExecute = work;
        const arg = workToExecute.value;
        const name = workToExecute.name;
        const id = workToExecute.id;
        try {
            this.log.debug(`${this.module} job begin, name:${name}, id:${id}`);
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
                    task.value = value;
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
            this.log.error(`${this.module} job failed with error:${error.mesage}, name:${name}, id:${id}`);
            if (workToExecute.retry > 1) {
                workToExecute.retry--;
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
            this.activeWork--;
            this.log.error(`${this.module} FATAL job failed, name:${name}, id:${id}`);
            if (this.errorWithValue) {
                error.workValue = workToExecute.value;
            }
            throw error;
        }
    }
}



