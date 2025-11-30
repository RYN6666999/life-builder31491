import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

export async function getGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export async function checkGoogleDriveConnection(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export async function uploadBackupToGoogleDrive(data: object): Promise<string> {
  const drive = await getGoogleDriveClient();
  
  const fileName = `lifebuilder-backup-${new Date().toISOString().split('T')[0]}.json`;
  const fileContent = JSON.stringify(data, null, 2);
  
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: 'application/json',
    },
    media: {
      mimeType: 'application/json',
      body: fileContent,
    },
    fields: 'id,name,webViewLink',
  });
  
  return response.data.id || '';
}

export async function listBackupsFromGoogleDrive(): Promise<Array<{ id: string; name: string; createdTime: string }>> {
  const drive = await getGoogleDriveClient();
  
  const response = await drive.files.list({
    q: "name contains 'lifebuilder-backup' and mimeType='application/json'",
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 10,
  });
  
  return (response.data.files || []).map(file => ({
    id: file.id || '',
    name: file.name || '',
    createdTime: file.createdTime || '',
  }));
}

export async function downloadBackupFromGoogleDrive(fileId: string): Promise<object> {
  const drive = await getGoogleDriveClient();
  
  const response = await drive.files.get({
    fileId,
    alt: 'media',
  });
  
  return response.data as object;
}
