import {Work} from "../models/types";

export const assignWork = ({work, nextWork}: {
    work      ?: Work;
    nextWork   : Work;
}) : Work => {
    if (work) {
        if (work.next) {
            return assignWork({work : work.next, nextWork});
        }
        work.next = nextWork;
        return work.next;
    }
    return nextWork;
};

export const linkChain = (workSequence : Work[]) => {
    const initialWork = workSequence[0];
    let work : Work = initialWork;
    for (let i = 0; i < workSequence.length; i++) {
        const nextWork = workSequence[i + 1]
        if (nextWork) {
            work = assignWork({work, nextWork});
        }
    }
    return initialWork;
};

export const uuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

