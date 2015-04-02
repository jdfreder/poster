module generics {
    export interface IDictionary<T> { [key: string]: T }
    export interface INumericDictionary<T> { [key: number]: T }
    export interface IClass<T> { new (...args: any[]): T };
}
export = generics
