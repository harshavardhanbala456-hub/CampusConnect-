// backend/routes/announcements.js — Announcements + Comments CRUD (Supabase)
const express  = require('express');
const multer   = require('multer');
const { getDb } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const crypto = require('crypto');

const router  = express.Router();

// Memory storage for multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 2 * 1024 * 1024 }, // 2 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed.'));
    }
    cb(null, true);
  },
});

// ─── GET /api/announcements ─────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const supabase = await getDb();
    
    // Fetch announcements with their comments using a joined query
    const { data: rows, error } = await supabase
      .from('announcements')
      .select('*, comments(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const result = rows.map(a => {
      // Sort comments by created_at ascending
      const sortedComments = (a.comments || []).sort(
        (c1, c2) => new Date(c1.created_at) - new Date(c2.created_at)
      );

      const modified = { ...a, comments: sortedComments };

      // Format pdfData if present
      if (a.pdf_data) {
        modified.pdfData = `data:${a.pdf_mime || 'application/pdf'};base64,${a.pdf_data}`;
      } else {
        modified.pdfData = null;
      }
      delete modified.pdf_data;
      
      return modified;
    });

    return res.json({ announcements: result });
  } catch (err) {
    console.error('Get announcements error:', err);
    return res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
});

// ─── POST /api/announcements — Admin only ───────────────────────────────────
router.post(
  '/',
  requireAuth,
  requireAdmin,
  (req, res, next) => upload.single('pdf')(req, res, (err) => {
    if (err) return next(err); 
    next();
  }),
  async (req, res) => {
    try {
      const { title, description, department, year, category } = req.body;
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required.' });
      }

      // Convert Buffer to Base64 string for storage
      const pdfBase64  = req.file ? req.file.buffer.toString('base64') : null;
      const pdfName    = req.file ? req.file.originalname   : null;
      const pdfMime    = req.file ? req.file.mimetype       : null;
      const id         = crypto.randomUUID();

      const supabase = await getDb();
      
      const { error: insertError } = await supabase
        .from('announcements')
        .insert([
          {
            id,
            title,
            description,
            pdf_data: pdfBase64,
            pdf_name: pdfName,
            pdf_mime: pdfMime,
            department: department || 'All',
            year: year || 'All',
            category: category || 'Academic',
            author_id: req.user.id,
            author_name: req.user.name,
          }
        ]);

      if (insertError) throw insertError;

      // Re-fetch all to keep frontend in sync
      const { data: rows, error: fetchError } = await supabase
        .from('announcements')
        .select('*, comments(*)')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const result = rows.map(a => {
        const sortedComments = (a.comments || []).sort(
          (c1, c2) => new Date(c1.created_at) - new Date(c2.created_at)
        );
        const modified = { ...a, comments: sortedComments };
        if (a.pdf_data) {
          modified.pdfData = `data:${a.pdf_mime || 'application/pdf'};base64,${a.pdf_data}`;
        } else {
          modified.pdfData = null;
        }
        delete modified.pdf_data;
        return modified;
      });

      return res.status(201).json({ announcements: result });
    } catch (err) {
      console.error('Post announcement error:', err);
      return res.status(500).json({ error: err.message || 'Failed to post announcement.' });
    }
  }
);

// ─── Multer error handler ────────────────────────────────────────────────────
router.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'PDF file must be less than 2 MB.' });
  }
  if (err.message === 'Only PDF files are allowed.') {
    return res.status(400).json({ error: 'Only PDF files are allowed.' });
  }
  console.error('Announcements router error:', err);
  return res.status(500).json({ error: err.message || 'Internal server error.' });
});

// ─── DELETE /api/announcements/:id — Admin only ─────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const supabase = await getDb();
    
    // Attempt the deletion
    const { count, error } = await supabase
      .from('announcements')
      .delete({ count: 'exact' })
      .eq('id', req.params.id);

    if (error) throw error;
    
    if (count === 0) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }
    
    return res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    console.error('Delete announcement error:', err);
    return res.status(500).json({ error: 'Failed to delete announcement.' });
  }
});

// ─── POST /api/announcements/:id/comments ───────────────────────────────────
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    const supabase = await getDb();

    // Verify announcement exists
    const { data: ann, error: checkError } = await supabase
      .from('announcements')
      .select('id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (checkError) throw checkError;
    if (!ann) return res.status(404).json({ error: 'Announcement not found.' });

    const id = crypto.randomUUID();

    const { error: insertError } = await supabase
      .from('comments')
      .insert([
        {
          id,
          announcement_id: req.params.id,
          text: text.trim(),
          author_id: req.user.id,
          author_name: req.user.name,
        }
      ]);

    if (insertError) throw insertError;

    // Return updated comments for this announcement
    const { data: comments, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('announcement_id', req.params.id)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    return res.status(201).json({ comments });
  } catch (err) {
    console.error('Post comment error:', err);
    return res.status(500).json({ error: 'Failed to post comment.' });
  }
});

module.exports = router;
