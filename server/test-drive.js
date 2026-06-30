const { google } = require('googleapis');

async function testDrive() {
  const auth = new google.auth.GoogleAuth({
    keyFile: './credentials/jobportal-492311-465d0e8c2633.json',
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });

  const drive = google.drive({
    version: 'v3',
    auth
  });

  const folderId = '1f2xGW6Nafxc2ScvSRUc2vVbvI0JGyqdl';

  const result = await drive.files.list({
    q: `'${folderId}' in parents`,
    fields: 'files(id,name,mimeType,createdTime)'
  });

  console.log(JSON.stringify(result.data, null, 2));
}

testDrive().catch(console.error);
