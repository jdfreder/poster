// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('../utils/utils');

/**
 * Animation helper.
 */
export class Animator extends utils.PosterClass {
    public duration: number;

    private _start: number;

    public constructor(duration: number) {
        super();
        this.duration = duration;
        this._start = Date.now();
    }

    /**
     * Get the time in the animation
     * @return between 0 and 1
     */
    public time(): number {
        var elapsed: number = Date.now() - this._start;
        return (elapsed % this.duration) / this.duration;
    }

    /**
     * Reset the animation progress to 0.
     */
    public reset(): void {
        this._start = Date.now();
    }
}
