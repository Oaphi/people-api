((id) => {
    const module = {
        exports: {},
        id: id,
        loaded: true
    };

    let { exports } = module;

    /**
     * Base64 url encodes input (useful for RS256 alg)
     * @param {String|Byte[]} input 
     * @returns {String}
     */
    const base64urlEncode = (input) => {
        const encoded = Utilities.base64Encode(input);

        const withoutEquals = encoded.replace(/\=/g, '');
        const withoutPluses = withoutEquals.replace(/\+/g, '-');
        const withoutSlashes = withoutPluses.replace(/\//g, '_');

        return withoutSlashes;
    };

    /**
     * Base64 url decodes input
     * @param {String} encoded 
     * @returns {String}
     */
    const base64urlDecode = (encoded) => {
        const withPluses = encoded.replace(/\-/g, '+');
        const withSlashes = withPluses.replace(/_/g, '/');

        const decoded = Utilities.base64Decode(withSlashes);

        return decoded;
    };

    module.exports = exports = {
        base64urlEncode,
        base64urlDecode
    };

    for(const key in exports) {
        this[key] = exports[key];
    }
})('Utilities');