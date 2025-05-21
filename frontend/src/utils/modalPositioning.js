/**
 * Modal Positioning Utility (DISABLED)
 * 
 * This utility has been disabled in favor of a pure CSS solution
 * for modal positioning and centering. The functions remain
 * to prevent import errors but have no meaningful functionality.
 */

// Empty function that does nothing - preserves API compatibility
const updateModalPositioning = () => {
  // Intentionally empty - modal positioning now handled by CSS
  return;
};

// Initialize function now only adds CSS - no JS observers
const initModalPositioning = () => {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* Force modals to be centered with CSS only */
    .ant-modal-wrap {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .ant-modal {
      top: 50% !important;
      left: 50% !important;
      margin: 0 !important;
      transform: translate(-50%, -50%) !important;
      position: relative !important;
      max-height: 90vh !important;
    }
    
    /* Mobile-specific modal improvements */
    @media (max-width: 768px) {
      .ant-modal {
        max-width: 92vw !important;
        max-height: 80vh !important;
        margin: 0 auto !important;
      }
      
      .ant-modal-body {
        padding: 16px !important;
        max-height: calc(80vh - 110px) !important;
        overflow-y: auto !important;
      }
      
      .ant-modal-footer {
        padding: 10px 16px !important;
      }
      
      /* Improve modal buttons on mobile */
      .ant-modal-footer .ant-btn {
        padding: 6px 12px !important;
        height: auto !important;
        font-size: 14px !important;
      }
    }
  `;
  document.head.appendChild(styleElement);
  
  return;
};

// Export the empty functions to maintain compatibility
export { updateModalPositioning, initModalPositioning };