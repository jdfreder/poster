declare module "prismjs" {
    interface IToken {
        content: string;
        type: string;
        length: number;
    }
    
    var x: {
        languages: string[];
        tokenize: (text: string, language: any) => IToken[];
    };
    export = x;
}
