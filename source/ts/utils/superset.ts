// Copyright (c) Jonathan Frederic, see the LICENSE file for more info.

import utils = require('./utils');

export interface IState extends Array<any> { 0: number; 1: number; 2: any; }

/**
 * Superset
 */
export class Superset extends utils.PosterClass {
    private _array: IState[];
    
    public constructor() {
        super();
        this._array = [];
    }
        
    public get array(): IState[] {
        this._clean();
        return this._array;
    }

    /**
     * Clears the set
     */
    public clear(): void {
        utils.clear_array(this._array);
    }

    /**
     * Set the state of a region.
     * @param start - index, inclusive
     * @param stop - index, inclusive
     * @param state
     */
    public set(start: number, stop: number, state: any): void {
        this._set(start, stop, state, 0);
    }

    /**
     * Set the state of a region.
     * @param start - index, inclusive
     * @param stop - index, inclusive
     * @param state
     * @param index - current recursion index
     */
    private _set(start: number, stop: number, state: any, index: number): void {
        // Make sure start and stop are in correct order.
        if (start > stop) {
            return;
        }
        var ns: number = start;
        var ne: number = stop;

        // Handle intersections.
        for (; index < this._array.length; index++) {
            var s: number = this._array[index][0];
            var e: number = this._array[index][1];
            var old_state: any = this._array[index][2];
            if (ns <= e && ne >= s) {
                this._array.splice(index, 1);
                // keep
                this._insert(index, s, ns - 1, old_state);
                // replace
                this._insert(index, Math.max(s, ns), Math.min(e, ne), state);
                // keep
                this._insert(index, ne + 1, e, old_state);
                // new
                this._set(ns, s - 1, state, index);
                this._set(e + 1, ne, state, index);
                return;
            }
        }

        // Doesn't intersect with anything.
        this._array.push([ns, ne, state]);
    }

    /**
     * Inserts an entry.
     */
    private _insert(index: number, start: number, end: number, state: any) {
        if (start > end) return;
        this._array.splice(index, 0, [start, end, state]);
    }

    /**
     * Joins consequtive states.
     */
    private _clean(): void {

        // Sort.
        this._array.sort((a, b) => a[0] - b[0]);

        // Join consequtive.
        for (var i = 0; i < this._array.length - 1; i++) {
            if (this._array[i][1] === this._array[i+1][0]-1 && this._array[i][2] === this._array[i+1][2]) {
                this._array[i][1] = this._array[i+1][1];
                this._array.splice(i+1, 1);
                i--;
            }
        }
    }
}
