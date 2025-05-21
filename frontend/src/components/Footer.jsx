import React from 'react';
import { Layout } from 'antd';
import '../styles/Footer.css';
import { useLanguage } from '../context/LanguageContext';

const { Footer: AntFooter } = Layout;

const Footer = () => {
  const { direction } = useLanguage();
  
  return (
      <div 
        className="footer-content" 
        style={{ 
          textAlign: "center", 
          padding: "15px", 
          fontSize: "14px", 
          background: "#f0f2f5",
          direction: direction, // Respect language direction
          width: "100%", // Ensure full width
          display: "block" // Block display for better centering
        }}
      >
        <span style={{ display: "inline-block", textAlign: "center" }}>
          <strong>Xelo Tools © {new Date().getFullYear()}</strong> | منصة متكاملة لأدوات السوشيال ميديا واستخراج البيانات بدقة واحترافية.
        </span>
      </div>
  );
};

export default Footer;