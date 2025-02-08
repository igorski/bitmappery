/**
 * MIT License
 *
 * Adapted from Vue 2 code
 * Copyright (c) 2017 Yev Vlasenko
 * https://github.com/euvl/vue-js-toggle-button
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
export const isString = ( value: unknown ): boolean => {
    return typeof value === "string";
};

export const isBoolean = ( value: unknown ): boolean => {
    return typeof value === "boolean";
};

export const isObject = ( value: unknown ): boolean => {
    return typeof value === "object";
};

export const has = ( object: object, key: string ): boolean => {
    return isObject( object ) && object.hasOwnProperty( key );
};

export const get = ( object: object, key: string, defaultValue: string | number ): string | number => {
    // @ts-expect-error TS7053
    return has( object, key ) ? object[ key ] : defaultValue;
};

export const px = ( value: string | number ): string => {
    return `${value}px`;
};

export const translate = ( x: string | number, y: string | number ): string => {
    return `translate(${x}, ${y})`;
};