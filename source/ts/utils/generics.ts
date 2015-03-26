module generics {
    export interface IDictionary<T> { [key: string]: T }
    export interface INumericDictionary<T> { [key: number]: T }
}
export = generics
