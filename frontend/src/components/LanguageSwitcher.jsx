import React from 'react';
import { Select, Tooltip } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useLanguage } from '../context/LanguageContext';
import '../styles/LanguageSwitcher.css';

const LanguageSwitcher = ({ mode = 'dropdown', size = 'middle', showLabel = false }) => {
  const { currentLanguage, languages, changeLanguage, t } = useLanguage();

  // Handle language change
  const handleChange = (value) => {
    changeLanguage(value);
  };

  // If no languages are available yet, show loading state
  if (!languages || languages.length === 0) {
    return null;
  }

  // Dropdown mode
  if (mode === 'dropdown') {
    return (
      <div className="language-switcher">
        {showLabel && <span className="language-label">{t('language')}:</span>}
        <Select
          value={currentLanguage}
          onChange={handleChange}
          size={size}
          className="language-select"
          dropdownClassName="language-dropdown"
          suffixIcon={<GlobalOutlined />}
        >
          {languages.map((lang) => (
            <Select.Option key={lang.code} value={lang.code}>
              <div className="language-option">
                {lang.icon && <img src={lang.icon} alt={lang.name} className="language-flag" />}
                <span>{lang.nativeName}</span>
              </div>
            </Select.Option>
          ))}
        </Select>
      </div>
    );
  }

  // Button mode
  if (mode === 'buttons') {
    return (
      <div className="language-buttons">
        {showLabel && <span className="language-label">{t('language')}:</span>}
        {languages.map((lang) => (
          <Tooltip key={lang.code} title={lang.name}>
            <button
              className={`language-button ${currentLanguage === lang.code ? 'active' : ''}`}
              onClick={() => handleChange(lang.code)}
            >
              {lang.icon ? (
                <img src={lang.icon} alt={lang.name} className="language-flag" />
              ) : (
                <span className="language-code">{lang.code.toUpperCase()}</span>
              )}
            </button>
          </Tooltip>
        ))}
      </div>
    );
  }

  // Enhanced Icon mode with improved layout
  return (
    <div className="language-icon-switcher">
      <Tooltip title={t('change_language')} placement="bottom">
        <div 
          className="language-current" 
          onClick={() => handleChange(currentLanguage === 'ar' ? 'en' : 'ar')}
          aria-label={t('change_language')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleChange(currentLanguage === 'ar' ? 'en' : 'ar');
            }
          }}
        >
          <div className="language-globe-container">
            <GlobalOutlined className="language-globe" />
            <span className="language-ripple"></span>
          </div>
          <div className={`language-code-container language-switch-animation ${currentLanguage === 'ar' ? 'ltr-text' : 'rtl-text'}`}>
            <span className="language-code">{currentLanguage === 'ar' ? 'EN' : 'AR'}</span>
            <span className="language-name">
              {currentLanguage === 'ar' ? 'English' : 'العربية'}
            </span>
          </div>
        </div>
      </Tooltip>
    </div>
  );
};

export default LanguageSwitcher;
