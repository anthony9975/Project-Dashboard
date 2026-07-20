import {
  getProject,
  saveProject,
  saveDiagramFile,
  getDiagramFile,
  deleteDiagramFile,
} from '../../../../lib/projectRepository';
import Busboy from 'busboy';

// Uploads go through here as multipart/form-data, not JSON like every other API route —
// this is the one place in the app that needs Next's default body parser turned off so we
// can hand the raw request stream to busboy ourselves.
export const config = {
  api: {
    bodyParser: false,
  },
};

// Generous enough for a self-contained HTML export with embedded fonts/scripts/icons, but
// still a sane ceiling for a tool built around small JSON files on a local machine.
const MAX_DIAGRAM_BYTES = 15 * 1024 * 1024;

function parseUpload(req) {
  return new Promise((resolve, reject) => {
    let busboy;
    try {
      busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_DIAGRAM_BYTES } });
    } catch (err) {
      return reject(new Error('BAD_REQUEST'));
    }

    let filename = null;
    let tooLarge = false;
    const chunks = [];

    busboy.on('file', (_fieldname, file, info) => {
      filename = info.filename;
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('limit', () => {
        tooLarge = true;
      });
    });

    busboy.on('finish', () => {
      if (tooLarge) return reject(new Error('FILE_TOO_LARGE'));
      if (!filename || chunks.length === 0) return reject(new Error('NO_FILE'));
      resolve({ buffer: Buffer.concat(chunks), filename });
    });

    busboy.on('error', () => reject(new Error('BAD_REQUEST')));
    req.pipe(busboy);
  });
}

export default async function handler(req, res) {
  const { id } = req.query;
  const project = getProject(id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });

  if (req.method === 'GET') {
    const file = getDiagramFile(id);
    if (!file) return res.status(404).json({ error: 'No diagram uploaded for this project.' });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(file);
  }

  if (req.method === 'POST') {
    let upload;
    try {
      upload = await parseUpload(req);
    } catch (err) {
      if (err.message === 'FILE_TOO_LARGE') {
        return res.status(413).json({ error: 'That file is larger than the 15MB limit.' });
      }
      return res.status(400).json({ error: 'No file was received. Try again.' });
    }

    const lowerName = upload.filename.toLowerCase();
    if (!lowerName.endsWith('.html') && !lowerName.endsWith('.htm')) {
      return res.status(400).json({
        error: 'Please upload a .html file — a self-contained interactive export from your diagramming tool.',
      });
    }

    saveDiagramFile(id, upload.buffer);
    const updated = saveProject({
      ...project,
      diagram: { originalFilename: upload.filename, uploadedAt: new Date().toISOString() },
    });
    return res.status(200).json(updated);
  }

  if (req.method === 'DELETE') {
    deleteDiagramFile(id);
    const updated = saveProject({ ...project, diagram: null });
    return res.status(200).json(updated);
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end('Method not allowed');
}
