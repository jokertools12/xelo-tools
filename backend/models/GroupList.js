const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const GroupListSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  groups: [
    {
      groupId: {
        type: String,
        required: true
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('groupList', GroupListSchema);
