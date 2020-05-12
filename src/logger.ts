export interface ILogger {
    trace(msg : string) : void;
    debug(msg : string) : void;
    info (msg : string) : void;
    warn (msg : string) : void;
    error(msg : string) : void;
}

export const DefaultLogger : ILogger = {
    trace  : () => {},
    debug  : () => {},
    info   : () => {},
    warn   : () => {},
    error  : () => {}
};

export const DebugLogger : ILogger = console;
