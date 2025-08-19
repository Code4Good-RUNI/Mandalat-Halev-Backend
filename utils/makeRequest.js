const http = require('http');

// Test configuration
const config = {
    requestDelay: 1000, // 1 second between requests
    maxRetries: 3,
    timeout: 10000 // 10 second timeout
};

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

let testResults = { passed: 0, failed: 0, total: 0 };

/**
 * Improved HTTP request with timeout and retry logic
 */
function createRequest(method, path, data = null, headers = {}, retries = 0) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            timeout: config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Connection': 'keep-alive',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({ 
                        status: res.statusCode, 
                        data: jsonBody,
                        headers: res.headers,
                        body: body
                    });
                } catch (e) {
                    resolve({ 
                        status: res.statusCode, 
                        data: body,
                        headers: res.headers,
                        body: body,
                        parseError: e.message
                    });
                }
            });
        });

        req.on('error', async (error) => {
            console.log(`${colors.yellow}⚠️ Request error: ${error.message}${colors.reset}`);
            
            if (retries < config.maxRetries && (error.code === 'ECONNRESET' || error.code === 'ENOTFOUND')) {
                console.log(`${colors.yellow}   Retrying in 2 seconds... (${retries + 1}/${config.maxRetries})${colors.reset}`);
                await sleep(2000);
                try {
                    const result = await makeRequest(method, path, data, headers, retries + 1);
                    resolve(result);
                } catch (retryError) {
                    reject(retryError);
                }
            } else {
                reject(error);
            }
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout after ${config.timeout}ms`));
        });
        
        if (data) {
            req.write(typeof data === 'string' ? data : JSON.stringify(data));
        }
        req.end();
    });
}

module.exports = {
    createRequest
};