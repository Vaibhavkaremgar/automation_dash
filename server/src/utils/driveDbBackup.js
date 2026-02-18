import fs from "fs";
import path from "path";
import { google } from "googleapis";

export async function backupSqliteToDrive() {
  const dbPath = process.env.DB_PATH;
  if (!dbPath || !fs.existsSync(dbPath)) {
    console.log("❌ DB file not found, skipping backup");
    return;
  }

  const auth = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    null,
    process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    ["https://www.googleapis.com/auth/drive.file"]
  );

  const drive = google.drive({ version: "v3", auth });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFileName = `hirehero_${timestamp}.db`;

  const response = await drive.files.create({
    requestBody: {
      name: backupFileName,
      parents: [process.env.GOOGLE_DRIVE_BACKUP_FOLDER_ID],
    },
    media: {
      mimeType: "application/x-sqlite3",
      body: fs.createReadStream(dbPath),
    },
    fields: "id, name",
  });

  console.log("✅ SQLite backup uploaded to Drive:", response.data.name);
}
