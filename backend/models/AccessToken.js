const mongoose = require('mongoose');

const accessTokenSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    fbName: {
      type: String,
      required: true
    },
    accessToken: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const AccessToken = mongoose.model('AccessToken', accessTokenSchema);

module.exports = AccessToken;