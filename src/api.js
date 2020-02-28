const { Authenticator } = require('./auth.js');

/**
 * Connects to People API and performs tasks
 * @class
 */
class PeopleAPI {

    /**
     * @param {Authenticator} auth 
     */
    constructor(auth) {
        this.base = 'https://people.googleapis.com';
        this.version = 'v1';
        this.auth = auth || new Authenticator();
    }

    /**
     * Creates contacts. Contacts should conform to Person schema 
     * https://developers.google.com/people/api/rest/v1/people#Person
     * @param  {...Object} contacts 
     * @returns {Object[]}
     * @method
     */
    createContacts(...contacts) {
        const { auth, base, version } = this;

        const token = auth.getToken();

        const requests = contacts.map(contact => {
            return {
                url: `${base}/${version}/people:createContact`,
                method: 'post',
                contentType: 'application/json',
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                muteHttpExceptions: true,
                payload: JSON.stringify(contact)
            };
        });

        const results = UrlFetchApp.fetchAll(requests);

        return results;
    }

    /**
     * Gets contact groups by names
     * @param  {...String} names 
     * @returns {?Object[]}
     * @method
     */
    getGroups(...names) {
        const { auth, base, version } = this;

        const queryNames = names.map(name => `resourceNames=contactGroups/${name}`).join('&');

        const groupUrl = `${base}/${version}/contactGroups:batchGet?${queryNames}`;

        const token = auth.getToken();

        const response = UrlFetchApp.fetch(groupUrl, {
            method: "get",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            muteHttpExceptions: true
        });

        if (!response.getResponseCode() === 200) {
            return null;
        }

        const content = response.getContentText();
        const { responses } = JSON.parse(content);

        return responses.map(group => group.contactGroup);
    }

}