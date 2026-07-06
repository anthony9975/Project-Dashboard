import { getAllProjects, createProject } from '../../../lib/projectRepository';

export default function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json(getAllProjects());
  }

  if (req.method === 'POST') {
    const { title, note } = req.body || {};
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required.' });
    }
    const project = createProject({ title: title.trim(), note: (note || '').trim() });
    return res.status(201).json(project);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method not allowed');
}
