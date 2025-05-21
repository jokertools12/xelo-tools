const mongoose = require('mongoose');

const languageSchema = mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    nativeName: {
      type: String,
      required: true,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    direction: {
      type: String,
      enum: ['ltr', 'rtl'],
      default: 'ltr'
    },
    icon: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// إنشاء نموذج اللغة
const Language = mongoose.model('Language', languageSchema);

module.exports = Language;
