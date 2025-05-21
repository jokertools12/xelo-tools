const express = require('express');
const router = express.Router();
const { protect } = require('../../middleware/auth');
const GroupList = require('../../models/GroupList');

// @route   GET api/group-lists
// @desc    Get all group lists for the current user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const groupLists = await GroupList.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(groupLists);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/group-lists
// @desc    Create a new group list
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, groups } = req.body;

    const newGroupList = new GroupList({
      user: req.user.id,
      name,
      groups
    });

    const groupList = await newGroupList.save();
    res.json(groupList);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/group-lists/:id
// @desc    Delete a group list
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const groupList = await GroupList.findById(req.params.id);

    if (!groupList) {
      return res.status(404).json({ msg: 'Group list not found' });
    }

    // Check user ownership
    if (groupList.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Update to use deleteOne() instead of remove()
    await GroupList.deleteOne({ _id: req.params.id });
    res.json({ msg: 'Group list removed' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Group list not found' });
    }
    res.status(500).send('Server Error');
  }
});

module.exports = router;
