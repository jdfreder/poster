import generics = require('../utils/generics');
import peacock = require('./peacock');
export var styles: generics.IDictionary<{style: generics.IDictionary<any>}> = {
    "peacock": peacock,
};
