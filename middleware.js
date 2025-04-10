export class Middleware {
    #dbClient;

    /**
     * @param {Object} dbClient 
     */
    constructor(dbClient) {
        this.#dbClient = dbClient;
    }

    /**
     * Checks the database for a valid unexpired apikey from the `api_keys` table
     * @param {Object} req 
     * @param {Object} res 
     * @param {Function} next 
     */
    async onAuthorization(req, res, next) {
        try {
            if (!req.headers['x-authorization']) {
              console.error('INTERNAL_ERROR (Middleware): Could not authorization request. Missing or invalid authorization.');
              res.status(401).send({ message: 'UNAUTHORIZED' });
              return;
            }
      
            const apiKey = req.headers['x-authorization'];
            const CURRENT_DATETIME_MILLIS = new Date().getTime();
            const { data, error } = await this.#dbClient.from('api_keys')
              .select()
              .eq('key', apiKey);
            
            if (error || (!Array.isArray(data))) {
                console.error(`INTERNAL_ERROR (Middleware): Could not authorize request. See details -> ${error?.message}`);
                res.status(401).send({ message: 'UNAUTHORIZED' });
                return;
            }
      
            const [record] = data;
      
            if (!record) {
                console.error('INTERNAL_ERROR (Middleware): Could not authorize request. Missing or invalid authorization.');
                res.status(401).send({ message: 'UNAUTHORIZED' });
                return;
            }

            const CREDENTIAL_EXPIRY_DATETIME_MILLS = new Date(record.expiryDate).getTime();
      
            if (CURRENT_DATETIME_MILLIS > CREDENTIAL_EXPIRY_DATETIME_MILLS) {
                res.status(401).send({ message: 'UNAUTHORIZED' });
                return;
            }
      
            next();
      
        } catch (ex) {
            console.error(`INTERNAL_ERROR (Middleware): Exception encountered during request authorization. See details -> ${ex.message}`);
            next('Middleware exception');
        }
    }
}