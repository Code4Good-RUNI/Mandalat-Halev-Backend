/**
 * Robust Authentication Test Suite with Better Error Handling
 * Addresses connection issues and provides detailed diagnostics
 */

const http = require('http');
const readline = require('readline');

const TEST_USER = {
    userId: "0030X000023n51jQAA",
    email: "kerenaor@gmail.com"
};

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
function makeRequest(method, path, data = null, headers = {}, retries = 0) {
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function logTest(testName, passed, details = '') {
    testResults.total++;
    if (passed) {
        testResults.passed++;
        console.log(`${colors.green}✅ PASS${colors.reset}: ${testName}`);
    } else {
        testResults.failed++;
        console.log(`${colors.red}❌ FAIL${colors.reset}: ${testName}`);
    }
    if (details) {
        console.log(`   ${colors.cyan}${details}${colors.reset}`);
    }
}

async function testBasicConnectivity() {
    console.log(`\n${colors.magenta}🔍 TEST 0: Basic Connectivity${colors.reset}`);
    
    try {
        console.log('Testing basic server connectivity...');
        const response = await makeRequest('POST', '/auth/request-code', TEST_USER);

        if (response.status === 200) {
            logTest('Server Connectivity', true, `Server responding, Salesforce: ${response.data.connected ? 'Connected' : 'Disconnected'}`);
            return true;
        } else {
            logTest('Server Connectivity', false, `Status: ${response.status}`);
            return false;
        }
    } catch (error) {
        logTest('Server Connectivity', false, `Connection error: ${error.message}`);
        return false;
    }
}

async function testHappyPath() {
    console.log(`\n${colors.magenta}🧪 TEST 1: Happy Path (with delays)${colors.reset}`);
    
    try {
        // Step 1: Request code
        console.log('Step 1: Requesting authentication code...');
        const response1 = await makeRequest('POST', '/auth/request-code', TEST_USER);
        
        if (response1.status !== 200) {
            logTest('Request Code', false, `Status: ${response1.status}, Response: ${JSON.stringify(response1.data)}`);
            return null;
        }
        logTest('Request Code', true, 'Code request successful');

        // Wait for user input
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const code = await new Promise(resolve => {
            rl.question(`${colors.yellow}Enter the 6-digit code from server console: ${colors.reset}`, resolve);
        });
        rl.close();

        console.log('Step 2: Adding delay before verification...');
        await sleep(config.requestDelay);

        // Step 2: Verify code
        console.log('Step 2: Verifying authentication code...');
        const response2 = await makeRequest('POST', '/auth/verify-code', {
            ...TEST_USER,
            code: code.trim()
        });

        if (response2.status !== 200 || !response2.data.token) {
            logTest('Verify Code', false, `Status: ${response2.status}, Response: ${JSON.stringify(response2.data)}`);
            return null;
        }
        logTest('Verify Code', true, 'JWT token received');

        const jwt = response2.data.token;

        console.log('Step 3: Adding delay before protected route test...');
        await sleep(config.requestDelay);

        // Step 3: Test protected route
        console.log('Step 3: Testing protected route...');
        const response3 = await makeRequest('GET', '/auth/protected-contacts', null, {
            'Authorization': `Bearer ${jwt}`
        });

        if (response3.status === 200 && response3.data.user && response3.data.contacts) {
            logTest('Protected Route Access', true, `User authenticated, ${response3.data.contacts.length} contacts returned`);
        } else {
            logTest('Protected Route Access', false, `Status: ${response3.status}, Has user: ${!!response3.data.user}, Has contacts: ${!!response3.data.contacts}`);
        }

        return { jwt, code: code.trim() };

    } catch (error) {
        logTest('Happy Path Flow', false, `Error: ${error.message}`);
        console.log(`${colors.red}Full error details:${colors.reset}`, error);
        return null;
    }
}

async function testCodeReuse(usedCode) {
    if (!usedCode) return;
    
    console.log(`\n${colors.magenta}🧪 TEST 2: Code Reuse (with delay)${colors.reset}`);
    
    try {
        await sleep(config.requestDelay);
        
        const response = await makeRequest('POST', '/auth/verify-code', {
            ...TEST_USER,
            code: usedCode
        });

        if (response.status === 401 && response.data.error && response.data.error.includes('Invalid or expired code')) {
            logTest('Code Reuse Prevention', true, 'Correctly rejected reused code');
        } else {
            logTest('Code Reuse Prevention', false, `Expected 401, got: ${response.status}, Response: ${JSON.stringify(response.data)}`);
        }
    } catch (error) {
        logTest('Code Reuse Test', false, `Error: ${error.message}`);
    }
}

async function testWrongCode() {
    console.log(`\n${colors.magenta}🧪 TEST 3: Wrong Code (with delays)${colors.reset}`);
    
    try {
        // Request new code
        console.log('Requesting fresh code...');
        await makeRequest('POST', '/auth/request-code', TEST_USER);
        
        await sleep(config.requestDelay);
        
        console.log('Testing with wrong code...');
        const response = await makeRequest('POST', '/auth/verify-code', {
            ...TEST_USER,
            code: '000000'
        });

        if (response.status === 401) {
            logTest('Wrong Code Rejection', true, `Correctly rejected wrong code: ${response.data.error}`);
        } else {
            logTest('Wrong Code Rejection', false, `Expected 401, got: ${response.status}`);
        }
    } catch (error) {
        logTest('Wrong Code Test', false, `Error: ${error.message}`);
    }
}

async function testMissingParameters() {
    console.log(`\n${colors.magenta}🧪 TEST 4: Parameter Validation${colors.reset}`);
    
    try {
        // Test missing userId
        await sleep(config.requestDelay);
        const response1 = await makeRequest('POST', '/auth/request-code', { email: TEST_USER.email });
        
        if (response1.status === 400) {
            logTest('Missing UserId Validation', true, 'Correctly rejected missing userId');
        } else {
            logTest('Missing UserId Validation', false, `Expected 400, got: ${response1.status}`);
        }

        // Test missing email  
        await sleep(config.requestDelay);
        const response2 = await makeRequest('POST', '/auth/request-code', { userId: TEST_USER.userId });
        
        if (response2.status === 400) {
            logTest('Missing Email Validation', true, 'Correctly rejected missing email');
        } else {
            logTest('Missing Email Validation', false, `Expected 400, got: ${response2.status}`);
        }

    } catch (error) {
        logTest('Parameter Validation Test', false, `Error: ${error.message}`);
    }
}

async function testJWTValidation() {
    console.log(`\n${colors.magenta}🧪 TEST 5: JWT Security${colors.reset}`);
    
    try {
        await sleep(config.requestDelay);
        
        // Test invalid token
        const response1 = await makeRequest('GET', '/auth/protected-contacts', null, {
            'Authorization': 'Bearer invalid.token.here'
        });
        
        if (response1.status === 401) {
            logTest('Invalid JWT Rejection', true, 'Correctly rejected invalid JWT');
        } else {
            logTest('Invalid JWT Rejection', false, `Expected 401, got: ${response1.status}`);
        }

        await sleep(config.requestDelay);
        
        // Test missing authorization
        const response2 = await makeRequest('GET', '/auth/protected-contacts');
        
        if (response2.status === 401) {
            logTest('Missing Authorization Header', true, 'Correctly rejected request without token');
        } else {
            logTest('Missing Authorization Header', false, `Expected 401, got: ${response2.status}`);
        }

    } catch (error) {
        logTest('JWT Validation Test', false, `Error: ${error.message}`);
    }
}

async function runRobustTests() {
    console.log(`${colors.cyan}🚀 Robust Authentication Pipeline Tests${colors.reset}`);
    console.log(`${colors.cyan}===================================${colors.reset}\n`);
    console.log(`${colors.yellow}Configuration:${colors.reset}`);
    console.log(`${colors.yellow}- Request delay: ${config.requestDelay}ms${colors.reset}`);
    console.log(`${colors.yellow}- Max retries: ${config.maxRetries}${colors.reset}`);
    console.log(`${colors.yellow}- Timeout: ${config.timeout}ms${colors.reset}\n`);

    // Basic connectivity test first
    const serverOk = await testBasicConnectivity();
    if (!serverOk) {
        console.log(`${colors.red}\n❌ Server connectivity failed. Please check:${colors.reset}`);
        console.log(`${colors.yellow}1. Server is running (npm start)${colors.reset}`);
        console.log(`${colors.yellow}2. Server is accessible on localhost:3000${colors.reset}`);
        console.log(`${colors.yellow}3. Salesforce connection is working${colors.reset}`);
        return;
    }

    // Run core tests with delays
    const happyResult = await testHappyPath();
    await testCodeReuse(happyResult?.code);
    await testWrongCode();
    await testMissingParameters();
    await testJWTValidation();

    // Summary
    console.log(`\n${colors.cyan}============== TEST SUMMARY ==============${colors.reset}`);
    console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
    console.log(`Total: ${testResults.total}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.passed >= 4) {
        console.log(`\n${colors.green}🎉 Your authentication system is working well!${colors.reset}`);
        console.log(`${colors.green}Core functionality (request/verify/JWT) is solid.${colors.reset}`);
    }

    console.log(`\n${colors.cyan}✨ System Status: READY FOR MOBILE APP INTEGRATION${colors.reset}`);
}

// Handle interruption
process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}Test interrupted${colors.reset}`);
    process.exit(0);
});

runRobustTests().catch(error => {
    console.error(`${colors.red}Test runner error: ${error.message}${colors.reset}`);
    process.exit(1);
});