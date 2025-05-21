const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const Template = require('../../models/Template');

// @route   GET api/templates
// @desc    Get all templates for the current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const templates = await Template.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/templates
// @desc    Create a new template
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, type, text, imageUrl, videoUrl, withRandomCode } = req.body;

    const newTemplate = new Template({
      user: req.user.id,
      name,
      type,
      text,
      imageUrl: imageUrl || '',
      videoUrl: videoUrl || '',
      withRandomCode
    });

    const template = await newTemplate.save();
    res.json(template);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/templates/:id
// @desc    Delete a template
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ msg: 'Template not found' });
    }

    // Check user ownership
    if (template.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Update to use deleteOne() instead of remove()
    await Template.deleteOne({ _id: req.params.id });
    res.json({ msg: 'Template removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Template not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
