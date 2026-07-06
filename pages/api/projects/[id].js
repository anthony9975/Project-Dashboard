import { getProject, saveProject } from '../../../lib/projectRepository';

export default function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'GET') {
    const project = getProject(id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    return res.status(200).json(project);
  }

  if (req.method === 'PATCH') {
    const project = getProject(id);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    const updated = saveProject({ ...project, ...req.body });
    return res.status(200).json(updated);
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).end('Method not allowed');
}
