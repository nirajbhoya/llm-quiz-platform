import { validateRealEmail } from './src/services/email-validation.service';

async function testEmailValidation() {
    const testCases = [
        { email: 'test@gmail.com', expectedValid: true, description: 'Valid Gmail' },
        { email: 'test@mailinator.com', expectedValid: false, description: 'Disposable Email' },
        { email: 'test@thisdomainshouldnotexist123456.com', expectedValid: false, description: 'Non-existent domain' },
        { email: 'invalid-email', expectedValid: false, description: 'Invalid Format (no domain)' },
    ];

    console.log('--- Email Validation Results ---');

    for (const test of testCases) {
        process.stdout.write(`Testing: ${test.description.padEnd(25)} (${test.email.padEnd(40)}) `);
        try {
            const result = await validateRealEmail(test.email);
            const isCorrect = (result.isValid === test.expectedValid);

            if (result.isValid) {
                console.log(`[PASS] Result: VALID`);
            } else {
                console.log(`[PASS] Result: INVALID (Error: ${result.error})`);
            }

            if (!isCorrect) {
                console.log(`  !! FAILURE !! Expected ${test.expectedValid} but got ${result.isValid}`);
            }
        } catch (err) {
            console.log(`[ERROR] ${err}`);
        }
    }
    console.log('--------------------------------');
}

testEmailValidation().catch(console.error);
