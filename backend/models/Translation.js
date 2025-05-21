const mongoose = require('mongoose');

const translationSchema = mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true
    },
    languageCode: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    value: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true,
      default: 'general'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    // Create a compound index for key and languageCode to ensure uniqueness
    indexes: [
      { 
        fields: { key: 1, languageCode: 1 },
        unique: true
      }
    ]
  }
);

// Create a compound index for key and languageCode
translationSchema.index({ key: 1, languageCode: 1 }, { unique: true });

const Translation = mongoose.model('Translation', translationSchema);

module.exports = Translation;
