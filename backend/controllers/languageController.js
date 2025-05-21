const Language = require('../models/Language');
const Translation = require('../models/Translation');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

// @desc    Get all languages
// @route   GET /api/languages
// @access  Public
const getAllLanguages = asyncHandler(async (req, res) => {
  const languages = await Language.find({ isActive: true }).sort({ isDefault: -1, name: 1 });
  res.json(languages);
});

// @desc    Get language by code
// @route   GET /api/languages/:code
// @access  Public
const getLanguageByCode = asyncHandler(async (req, res) => {
  const language = await Language.findOne({ code: req.params.code.toLowerCase() });
  
  if (language) {
    res.json(language);
  } else {
    res.status(404);
    throw new Error('اللغة غير موجودة');
  }
});

// @desc    Create new language
// @route   POST /api/languages
// @access  Admin
const createLanguage = asyncHandler(async (req, res) => {
  const { code, name, nativeName, direction, icon, isDefault } = req.body;

  // Check if language already exists
  const languageExists = await Language.findOne({ code: code.toLowerCase() });
  if (languageExists) {
    res.status(400);
    throw new Error('اللغة موجودة بالفعل');
  }

  // If this is set as default, unset any existing default language
  if (isDefault) {
    await Language.updateMany({}, { isDefault: false });
  }

  const language = await Language.create({
    code: code.toLowerCase(),
    name,
    nativeName,
    direction: direction || (code === 'ar' ? 'rtl' : 'ltr'),
    icon,
    isDefault: isDefault || false,
    isActive: true
  });

  if (language) {
    res.status(201).json(language);
  } else {
    res.status(400);
    throw new Error('بيانات اللغة غير صالحة');
  }
});

// @desc    Update language
// @route   PUT /api/languages/:code
// @access  Admin
const updateLanguage = asyncHandler(async (req, res) => {
  const { name, nativeName, direction, icon, isActive, isDefault } = req.body;
  const languageCode = req.params.code.toLowerCase();

  const language = await Language.findOne({ code: languageCode });

  if (!language) {
    res.status(404);
    throw new Error('اللغة غير موجودة');
  }

  // If this is set as default, unset any existing default language
  if (isDefault && !language.isDefault) {
    await Language.updateMany({}, { isDefault: false });
  }

  language.name = name || language.name;
  language.nativeName = nativeName || language.nativeName;
  language.direction = direction || language.direction;
  language.icon = icon || language.icon;
  language.isActive = isActive !== undefined ? isActive : language.isActive;
  language.isDefault = isDefault !== undefined ? isDefault : language.isDefault;

  const updatedLanguage = await language.save();
  res.json(updatedLanguage);
});

// @desc    Delete language
// @route   DELETE /api/languages/:code
// @access  Admin
const deleteLanguage = asyncHandler(async (req, res) => {
  const languageCode = req.params.code.toLowerCase();
  const language = await Language.findOne({ code: languageCode });

  if (!language) {
    res.status(404);
    throw new Error('اللغة غير موجودة');
  }

  // Don't allow deletion of default language
  if (language.isDefault) {
    res.status(400);
    throw new Error('لا يمكن حذف اللغة الافتراضية');
  }

  // Delete all translations for this language
  await Translation.deleteMany({ languageCode });
  
  // Delete the language
  await language.remove();
  
  res.json({ message: 'تم حذف اللغة' });
});

// @desc    Get translations for a language
// @route   GET /api/languages/:code/translations
// @access  Public
const getTranslations = asyncHandler(async (req, res) => {
  const languageCode = req.params.code.toLowerCase();
  const includeMetadata = req.query.includeMetadata === 'true';
  
  // Check if language exists
  const language = await Language.findOne({ code: languageCode });
  if (!language) {
    res.status(404);
    throw new Error('اللغة غير موجودة');
  }

  // Get translations for the language
  const translations = await Translation.find({ 
    languageCode,
    isActive: true 
  });

  if (includeMetadata) {
    // Return full translation objects with metadata
    res.json(translations);
  } else {
    // Format translations as key-value pairs (original behavior)
    const formattedTranslations = {};
    translations.forEach(translation => {
      formattedTranslations[translation.key] = translation.value;
    });
    res.json(formattedTranslations);
  }
});

// @desc    Create or update translation
// @route   POST /api/languages/:code/translations
// @access  Admin
const upsertTranslation = asyncHandler(async (req, res) => {
  const languageCode = req.params.code.toLowerCase();
  const { key, value, category } = req.body;

  // Check if language exists
  const language = await Language.findOne({ code: languageCode });
  if (!language) {
    res.status(404);
    throw new Error('اللغة غير موجودة');
  }

  // Upsert the translation (update if exists, create if not)
  const translation = await Translation.findOneAndUpdate(
    { key, languageCode },
    { 
      key, 
      languageCode, 
      value, 
      category: category || 'general',
      isActive: true 
    },
    { new: true, upsert: true }
  );

  res.status(201).json(translation);
});

// @desc    Bulk upsert translations
// @route   POST /api/languages/:code/translations/bulk
// @access  Admin
const bulkUpsertTranslations = asyncHandler(async (req, res) => {
  const languageCode = req.params.code.toLowerCase();
  const { translations } = req.body;

  if (!Array.isArray(translations)) {
    res.status(400);
    throw new Error('الترجمات يجب أن تكون مصفوفة');
  }

  // Check if language exists
  const language = await Language.findOne({ code: languageCode });
  if (!language) {
    res.status(404);
    throw new Error('اللغة غير موجودة');
  }

  const operations = translations.map(translation => ({
    updateOne: {
      filter: { key: translation.key, languageCode },
      update: { 
        key: translation.key,
        languageCode,
        value: translation.value,
        category: translation.category || 'general',
        isActive: true
      },
      upsert: true
    }
  }));

  const result = await Translation.bulkWrite(operations);
  res.status(200).json({
    message: 'تم تحديث الترجمات بنجاح',
    result
  });
});

// @desc    Delete translation
// @route   DELETE /api/languages/:code/translations/:key
// @access  Admin
const deleteTranslation = asyncHandler(async (req, res) => {
  const languageCode = req.params.code.toLowerCase();
  const { key } = req.params;

  const result = await Translation.deleteOne({ key, languageCode });

  if (result.deletedCount === 0) {
    res.status(404);
    throw new Error('الترجمة غير موجودة');
  }

  res.json({ message: 'تم حذف الترجمة' });
});

// @desc    Get default language
// @route   GET /api/languages/default
// @access  Public
const getDefaultLanguage = asyncHandler(async (req, res) => {
  const defaultLanguage = await Language.findOne({ isDefault: true });
  
  if (defaultLanguage) {
    res.json(defaultLanguage);
  } else {
    // If no default language is set, return the first active language
    const firstLanguage = await Language.findOne({ isActive: true });
    
    if (firstLanguage) {
      res.json(firstLanguage);
    } else {
      res.status(404);
      throw new Error('لا توجد لغات متاحة');
    }
  }
});

module.exports = {
  getAllLanguages,
  getLanguageByCode,
  createLanguage,
  updateLanguage,
  deleteLanguage,
  getTranslations,
  upsertTranslation,
  bulkUpsertTranslations,
  deleteTranslation,
  getDefaultLanguage
};
