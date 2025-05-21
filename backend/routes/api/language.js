const express = require('express');
const router = express.Router();
const { protect, admin } = require('../../middleware/auth');
const languageController = require('../../controllers/languageController');

// Public routes
router.get('/', languageController.getAllLanguages);
router.get('/default', languageController.getDefaultLanguage);
router.get('/:code', languageController.getLanguageByCode);
router.get('/:code/translations', languageController.getTranslations);

// Admin routes
router.post('/', protect, admin, languageController.createLanguage);
router.put('/:code', protect, admin, languageController.updateLanguage);
router.delete('/:code', protect, admin, languageController.deleteLanguage);
router.post('/:code/translations', protect, admin, languageController.upsertTranslation);
router.post('/:code/translations/bulk', protect, admin, languageController.bulkUpsertTranslations);
router.delete('/:code/translations/:key', protect, admin, languageController.deleteTranslation);

module.exports = router;
