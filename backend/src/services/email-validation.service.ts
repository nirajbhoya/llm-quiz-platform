import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

const DISPOSABLE_DOMAINS = new Set([
    'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'temp-mail.org', 'dispostable.com',
    'getairmail.com', 'yopmail.com', 'sharklasers.com', 'guerrillamail.biz', 'guerrillamail.de',
    'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com', 'pokemail.net', 'spam4.me',
    'grr.la', 'guerrillamail.info', 'maildrop.cc', 'discard.email', 'trashmail.com',
    'fakeinbox.com', 'mintemail.com', 'mailnesia.com', 'armyspy.com', 'cuvox.de',
    'dayrep.com', 'einrot.com', 'fleckens.hu', 'gustr.com', 'jourrapide.com',
    'rhyta.com', 'superrito.com', 'teleworm.us', 'trbvm.com', 'vmani.com',
    'boximail.com', 'emailfake.com', 'email-fake.com', 'temp-mail.io', 'tempmail.plus',
    'tempmail.net', 'tempmail.com', 'temp-mail.ru', 'temp-mail.be', 'temp-mail.org.ua',
    'dropmail.me', 'eml.monster', 'emlmgr.com', 'emltmp.com', 'internal.ml',
    '0-mail.com', '10mail.org', '20mail.it', '30minutemail.com', '4warding.com',
    'tempmail.de', 'tempemail.co', 'disposable.com', 'tempmail.id', 'tempmail.top',
    'example.com', 'test.com', 'dummy.com', 'tmail.com', 'mailtemp.com',
    '1secmail.com', '1secmail.net', '1secmail.org', '33mail.com', 'anonbox.net',
    'antispam.de', 'boun.cr', 'burnermail.io', 'clicknathan.com', 'despam.it',
    'discardmail.com', 'discardmail.de', 'disposable.com.au', 'emaildie.com',
    'forward.cat', 'getnada.com', 'grr.la', 'harakirimail.com', 'incognitomail.net',
    'mail-temporaire.fr', 'mailcatch.com', 'maildu.de', 'mailexpire.com',
    'mailforspam.com', 'mailnull.com', 'mailtothis.com', 'meltmail.com',
    'mymail-in.net', 'noclickemail.com', 'notsharingmy.info', 'objectmail.com',
    'pwned.com', 'safetymail.info', 'sendmymail.in', 'spam.la', 'spambob.com',
    'spamex.com', 'spamgourmet.com', 'spamherder.com', 'spaminator.de',
    'trash-mail.at', 'trash-mail.com', 'trashmail.at', 'trashmail.me', 'trashmail.net',
    'whyspam.me', 'jetable.org', 'kasmail.com', 'litedrop.com', 'mailinator2.com',
    'sogetthis.com', 'spamherelots.com', 'thisisnotmyrealemail.com', 'zippymail.info'
]);

export const isDisposableEmail = (email: string): boolean => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return true;

    // Check direct match
    if (DISPOSABLE_DOMAINS.has(domain)) return true;

    // Check if it ends with one of the common disposable patterns
    const disposablePatterns = ['tempmail', '10minute', 'disposable', 'guerrillamail', 'mailinator'];
    return disposablePatterns.some(pattern => domain.includes(pattern));
};

export const hasValidMxRecord = async (email: string): Promise<boolean> => {
    const domain = email.split('@')[1];
    if (!domain) return false;

    // Fast-track common real domains
    const commonRealDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'me.com', 'aol.com', 'msn.com'];
    if (commonRealDomains.includes(domain.toLowerCase())) return true;

    try {
        const mxRecords = await resolveMx(domain);
        return mxRecords && mxRecords.length > 0;
    } catch (error: any) {
        if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
            return false;
        }
        console.error(`MX resolution failed for domain ${domain}:`, error);
        return false;
    }
};

export const validateRealEmail = async (email: string): Promise<{ isValid: boolean; error?: string }> => {
    console.log(`[validateRealEmail] Checking: ${email}`);

    if (isDisposableEmail(email)) {
        console.log(`[validateRealEmail] Rejected: Known disposable or pattern (${email})`);
        return { isValid: false, error: `Email domain ${email.split('@')[1]} is a known disposable provider and not allowed.` };
    }

    const hasMx = await hasValidMxRecord(email);
    if (!hasMx) {
        console.log(`[validateRealEmail] Rejected: No MX records for domain (${email})`);
        return { isValid: false, error: `Email domain ${email.split('@')[1]} does not have valid mail records and may not exist.` };
    }

    console.log(`[validateRealEmail] Accepted: ${email}`);
    return { isValid: true };
};
