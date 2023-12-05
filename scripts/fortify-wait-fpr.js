const fs = require('node:fs');
const timers = require('node:timers/promises');

const scanId = process.argv[2];
const FORTIFY_USER = process.env.FORTIFY_USER;
const FORTIFY_TOKEN = process.env.FORTIFY_TOKEN;
const FORTIFY_TENANT = process.env.FORTIFY_TENANT;

async function main() {
    const tokenData = await fetch('https://api.ams.fortify.com/oauth/token', {
        method: 'POST',
        headers: {'content-type': 'application/x-www-form-urlencoded'},
        body: `grant_type=password&scope=api-tenant&username=${FORTIFY_TENANT}\\${FORTIFY_USER}&password=${FORTIFY_TOKEN}&security_code=`
    }).then(r => r.json());

    if (!tokenData || !tokenData.access_token) {
        throw new Error("Can't authenticate, check credentials.");
    }

    const token = tokenData.access_token;

    while (true) {
        const summaryResponse = await fetch(`https://api.ams.fortify.com/api/v3/scans/${scanId}/summary`, {
            headers: {Authorization: `Bearer ${token}`}
        });

        if (summaryResponse.status === 200) {
            const summaryData = await summaryResponse.json();

            if (summaryData.analysisStatusType === 'Completed') {
                break;
            }
            console.log(`Scan status: ${summaryData.analysisStatusType}...`);
        } else {
            console.log(`Scan API status: ${summaryResponse.status}...`);
        }
        await timers.setTimeout(5000);
    }

    let buffer;

    while (true) {
        const fileResponse = await fetch(`https://api.ams.fortify.com/api/v3/scans/${scanId}/fpr`, {
            headers: {Authorization: `Bearer ${token}`}
        });

        if (fileResponse.status === 200) {
            buffer = await fileResponse.arrayBuffer();
            break;
        }

        if ([202, 429].includes(fileResponse.status)) {
            console.log(`Waiting FRP file...`);
            await timers.setTimeout(5000);
        } else {
            throw new Error(`Unexpected status code from fpr endpoint: ${fileResponse.status}.`);
        }
    }

    fs.writeFileSync('./scandata.fpr', Buffer.from(buffer));
}

main().catch(console.error);