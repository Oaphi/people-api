const { base64urlEncode } = require('./utils.js');

/**
 * Controls 2-legged OAuth 2.0 flow
 * @class
 */
class Authenticator {

    /**
     * @param {String} [param] parameter name
     */
    constructor(param) {
        this.param = param || 'people_oauth';

        this.key = null;
        this.impersonate = null;
        this.issuer = null;

        this.urls = Object.freeze({
            auth: 'https://oauth2.googleapis.com/token'
        });

        this.scopes = new Set();
    }

    /**
     * Gets token from property store
     * @private
     * @method
     */
    _getTokenFromStore() {
        return PropertiesService
            .getScriptProperties()
            .getProperty(this.param);
    }

    /**
     * Gets number of seconds since unix epoch
     * @returns {Number}
     */
    static now() {
        return Math.floor(Date.now() / 1000);
    }

    /**
     * Gets access token
     * @returns {String}
     */
    get token() {
        const { impersonate, issuer, key, scopes, urls } = this;

        const header = {
            alg: "RS256",
            typ: "JWT"
        };

        const issuedAt = Authenticator.now();

        const expiresIn = 3600;

        const expiresAt = issuedAt + expiresIn;

        const payload = {
            aud: urls.auth,
            exp: expiresAt,
            iat: issuedAt,
            iss: issuer,
            scope: [...scopes.values()]
        };

        impersonate && (payload.sub = impersonate);

        const encodedHeader = base64urlEncode(JSON.stringify(header));
        const encodedPayload = base64urlEncode(JSON.stringify(payload));

        const token = `${encodedHeader}.${encodedPayload}`;

        const privateKey = key;

        const signature = Utilities.computeRsaSha256Signature(token, privateKey);

        const encodedSignature = base64urlEncode(signature);

        const signedToken = `${token}.${encodedSignature}`;

        return signedToken;
    }

    /**
     * Adds scope to issue token with. Using Set 
     * ensures scopes won't be duplicated.
     * @param {String} scope
     * @returns {Authenticator}
     */
    addScope(scope) {
        scope && this.scopes.add(scope);
        return this;
    }

    /**
     * Gets access token from properties store 
     * or requests a new one (if no token or expired)
     * @returns {String}
     */
    getToken() {
        const existing = this._getTokenFromStore();

        const token = existing ?
            this.isExpired(existing) ?
                this.issueToken() :
                existing.split(':')[0] :
            this.issueToken();

        return token;
    }

    /**
     * Checks if access token is expired
     * @param {String} value 
     * @returns {Boolean}
     */
    isExpired(value) {
        const [token, expires] = value.split(':');

        const expired = PeopleAPI.now() >= expires;

        return expired;
    }

    /**
     * Attempts to issue access token
     */
    issueToken() {
        const { param, token, urls } = this;

        const response = UrlFetchApp.fetch(urls.auth, {
            method: "post",
            payload: {
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion: token
            },
            muteHttpExceptions: true
        });

        if (response.getResponseCode() !== 200) {
            throw new Error(`Could not issue access token`);
        }

        const content = response.getContentText();

        const { access_token, expires_in } = JSON.parse(content);

        const props = PropertiesService.getScriptProperties();

        const expires = PeopleAPI.now() + expires_in;

        props.setProperty(param, `${access_token}:${expires}`);

        return access_token;
    }

    /**
     * Removes specified scope. \
     * Pops the last one if called without scope provided
     * @param {String} [scope] 
     * @returns {Authenticator}
     * @method
     */
    removeScope(scope) {
        const { scopes } = this;

        const setScopes = [...scopes.values()];

        scopes.delete(scope || setScopes[setScopes.length - 1]);
    }

    /**
     * For service account OAuth flow,
     * sets account email on whose behalf 
     * to act when access token is issued
     * @param {String} email 
     * @returns {Authenticator}
     * @method
     */
    setImpersonate(email) {
        email && (this.impersonate = email);
        return this;
    }

    /**
     * Sets token issuer for "iss" payload claim
     * @param {String} issuer 
     * @returns {Authenticator}
     */
    setIssuer(issuer) {
        issuer && (this.issuer = issuer);
        return this;
    }

    /**
     * Revokes access token (removes from store)
     * Most of access tokens are not revokable
     * @returns {Authenticator}
     */
    revoke() {
        const existing = this._getTokenFromStore();

        if (!existing) {
            return this;
        }

        PropertiesService
            .getScriptProperties()
            .deleteProperty(this.param);

        return this;
    }

}