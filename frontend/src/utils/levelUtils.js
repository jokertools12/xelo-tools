import React from 'react';
import { 
  TrophyOutlined, 
  CrownOutlined, 
  StarOutlined, 
  FireOutlined, 
  ThunderboltOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
  UserSwitchOutlined,
  SketchOutlined,
  GiftOutlined,
  // Add more professional icons for higher levels
  CompassOutlined,
  ExperimentOutlined,
  RiseOutlined,
  FundOutlined,
  InsuranceOutlined,
  TrophyFilled,
  GoldOutlined,
  ApiOutlined,
  AppstoreOutlined,
  ApartmentOutlined,
  DollarCircleOutlined,
  StarFilled,
  GiftFilled,
  CrownTwoTone,
  BankOutlined,
  RobotOutlined,
  ControlOutlined,
  CloudOutlined,
  CloudSyncOutlined,
  CodeOutlined,
  CodeSandboxOutlined,
  ClusterOutlined,
  FlagOutlined,
  DeploymentUnitOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  NodeIndexOutlined,
  HourglassOutlined,
  TagOutlined,
  TagsOutlined,
  PushpinOutlined,
  RadarChartOutlined,
  UsbOutlined,
  SendOutlined,
  SettingOutlined,
  ShakeOutlined,
  SoundOutlined,
  SyncOutlined,
  TrophyTwoTone,
  CrownFilled
} from '@ant-design/icons';

// Constants
export const POINTS_PER_LEVEL = 25000;

/**
 * Calculate level from total points
 * @param {number} allPoints - Total points earned
 * @returns {number} - User's level
 */
export const calculateLevel = (allPoints) => {
  return Math.floor((allPoints || 0) / POINTS_PER_LEVEL) + 1;
};

/**
 * Calculate points needed for next level
 * @param {number} allPoints - Total points earned
 * @returns {number} - Points needed for next level
 */
export const pointsForNextLevel = (allPoints) => {
  const currentLevel = calculateLevel(allPoints);
  const nextLevelPoints = currentLevel * POINTS_PER_LEVEL;
  return nextLevelPoints - (allPoints || 0);
};

/**
 * Calculate level progress percentage
 * @param {number} allPoints - Total points earned
 * @returns {number} - Percentage of progress towards next level (0-100)
 */
export const levelProgressPercentage = (allPoints) => {
  const currentLevel = calculateLevel(allPoints);
  const prevLevelPoints = (currentLevel - 1) * POINTS_PER_LEVEL;
  const pointsInCurrentLevel = (allPoints || 0) - prevLevelPoints;
  return Math.min(100, Math.round((pointsInCurrentLevel / POINTS_PER_LEVEL) * 100));
};

/**
 * Get level tier name based on level
 * @param {number} level - User's level
 * @returns {string} - Level tier name
 */
export const getLevelTierName = (level) => {
  // Group levels in ranges of 5 with distinct names
  if (level <= 5) return "مبتدئ";
  if (level <= 10) return "متعلم";
  if (level <= 15) return "متوسط";
  if (level <= 20) return "متقدم";
  if (level <= 25) return "خبير";
  if (level <= 30) return "محترف";
  if (level <= 35) return "بارع";
  if (level <= 40) return "سيد";
  if (level <= 45) return "أسطوري";
  if (level <= 50) return "نخبة";
  if (level <= 55) return "صاعق";
  if (level <= 60) return "قائد";
  if (level <= 65) return "أسطورة";
  if (level <= 70) return "محارب";
  if (level <= 75) return "فارس";
  if (level <= 80) return "سلطان";
  if (level <= 85) return "ملك";
  if (level <= 90) return "إمبراطور";
  if (level <= 95) return "وحش";
  if (level <= 100) return "أيقونة";
  
  // Special tier for levels above 100
  return "الجوكر";
};

/**
 * Get level category name
 * @param {number} level - User's level
 * @returns {string} - Level category
 */
export const getLevelCategory = (level) => {
  if (level <= 20) return "beginner";
  if (level <= 50) return "intermediate";
  if (level <= 80) return "advanced";
  if (level <= 100) return "elite";
  return "joker";
};

/**
 * Get color for level
 * @param {number} level - User's level
 * @returns {string} - CSS color value
 */
export const getLevelColor = (level) => {
  // Define unique colors for each level (1-100)
  const allLevelColors = [
    // Levels 1-5: مبتدئ (Completely different colors, not just green variants)
    '#52c41a', '#1890ff', '#722ed1', '#eb2f96', '#fa8c16',
    
    // Levels 6-10: متعلم (Different colors)
    '#faad14', '#13c2c2', '#cf1322', '#a0d911', '#2f54eb',
    
    // Levels 11-15: متوسط (Different colors)
    '#c41d7f', '#d4380d', '#9254de', '#5cdbd3', '#f759ab',
    
    // Levels 16-20: متقدم (Different colors)
    '#ffa940', '#36cfc9', '#ff7a45', '#597ef7', '#73d13d',
    
    // Levels 21-25: خبير (Different colors)
    '#ff4d4f', '#69c0ff', '#ffc53d', '#40a9ff', '#9e1068',
    
    // Levels 26-30: محترف (Different colors)
    '#389e0d', '#096dd9', '#d46b08', '#531dab', '#1d39c4',
    
    // Levels 31-35: بارع (Different colors)
    '#08979c', '#d4b106', '#d48806', '#7cb305', '#c41d7f',
    
    // Levels 36-40: سيد (Different colors)
    '#0958d9', '#d32029', '#d84a1b', '#7048e8', '#00474f',
    
    // Levels 41-45: أسطوري (Different colors)
    '#642ab5', '#ad6800', '#874d00', '#003a8c', '#5b8c00',
    
    // Levels 46-50: نخبة (Different colors)
    '#006d75', '#d6204b', '#237804', '#d99614', '#004799',
    
    // Levels 51-55: صاعق (Different colors)
    '#9e1068', '#391085', '#006d75', '#8c8c8c', '#ff7a45',
    
    // Levels 56-60: قائد (Different colors)
    '#0050b3', '#820014', '#613400', '#c41d7f', '#5cdbd3',
    
    // Levels 61-65: أسطورة (Different colors)
    '#873800', '#003eb3', '#dbb10d', '#614700', '#d4380d',
    
    // Levels 66-70: محارب (Different colors)
    '#003a8c', '#770250', '#5c0011', '#254000', '#168cad',
    
    // Levels 71-75: فارس (Different colors)
    '#1677ff', '#00b96b', '#f50057', '#fa541c', '#722ed1',
    
    // Levels 76-80: سلطان (Different colors)
    '#13c2c2', '#2f54eb', '#ff7a45', '#52c41a', '#a8071a',
    
    // Levels 81-85: ملك (Different colors)
    '#1d39c4', '#531dab', '#c41d7f', '#d4b106', '#7cb305',
    
    // Levels 86-90: إمبراطور (Different colors)
    '#a8071a', '#6b34eb', '#006d75', '#1d39c4', '#ff4d4f',
    
    // Levels 91-95: وحش (Different colors)
    '#d32029', '#5b8c00', '#d99614', '#d6204b', '#642ab5',
    
    // Levels 96-100: أيقونة (Different colors)
    '#d4b106', '#d48806', '#d46b08', '#d84a1b', '#d32029'
  ];
  
  // For levels 1-100, use the defined colors
  if (level > 0 && level <= 100) {
    return allLevelColors[level - 1];
  }
  
  // Above level 100: Joker variants (special colors)
  const jokerColors = [
    '#ff4d4f', // Red
    '#a744ff', // Purple
    '#36cfc9', // Cyan
    '#ffd666', // Gold
    '#ff7a45'  // Orange
  ];
  
  return jokerColors[(level - 101) % jokerColors.length];
};

/**
 * Get gradient style for level
 * @param {number} level - User's level
 * @returns {Object} - CSS background gradient
 */
export const getLevelGradient = (level) => {
  const baseColor = getLevelColor(level);
  let secondColor;
  
  // Determine gradient's second color based on level categories
  if (level <= 20) {
    // Beginner levels: lighter gradient
    secondColor = adjustColor(baseColor, 40);
  } else if (level <= 50) {
    // Intermediate levels: medium gradient
    secondColor = adjustColor(baseColor, 30);
  } else if (level <= 80) {
    // Advanced levels: subtle gradient
    secondColor = adjustColor(baseColor, 20);
  } else if (level <= 100) {
    // Elite levels: rich gradient
    secondColor = adjustColor(baseColor, -20);
  } else {
    // Joker levels: dramatic gradient
    secondColor = '#000000';
  }
  
  return { background: `linear-gradient(45deg, ${baseColor}, ${secondColor})` };
};

/**
 * Helper function to adjust a color's brightness
 * @param {string} color - Hex color code
 * @param {number} amount - Amount to lighten (positive) or darken (negative)
 * @returns {string} - Adjusted color
 */
function adjustColor(color, amount) {
  const clamp = (val) => Math.min(255, Math.max(0, val));
  
  // Remove the leading # if it exists
  color = color.replace(/^#/, '');
  
  // Parse the color
  let r = parseInt(color.substring(0, 2), 16);
  let g = parseInt(color.substring(2, 4), 16);
  let b = parseInt(color.substring(4, 6), 16);
  
  // Adjust the color
  r = clamp(r + amount);
  g = clamp(g + amount);
  b = clamp(b + amount);
  
  // Convert back to hex
  r = r.toString(16).padStart(2, '0');
  g = g.toString(16).padStart(2, '0');
  b = b.toString(16).padStart(2, '0');
  
  return `#${r}${g}${b}`;
}

/**
 * Get icon component for level - Fixed to be consistent across all levels
 * @param {number} level - User's level
 * @param {Object} props - Additional props for the icon
 * @returns {React.ReactElement} - Icon component
 */
export const getLevelIcon = (level, props = {}) => {
  // Create a comprehensive mapping of levels to icons to ensure consistency
  // Grouped icons by level ranges (1-5, 6-10, etc.)
  const iconMapping = {
    // Level 1-5: Basic achievement icons (Beginner)
    1: <StarOutlined {...props} />,
    2: <FireOutlined {...props} />,
    3: <ThunderboltOutlined {...props} />,
    4: <RocketOutlined {...props} />,
    5: <SafetyCertificateOutlined {...props} />,
    
    // Level 6-10: Growth icons (Learner)
    6: <SketchOutlined {...props} />,
    7: <CompassOutlined {...props} />,
    8: <ExperimentOutlined {...props} />,
    9: <RiseOutlined {...props} />,
    10: <FundOutlined {...props} />,
    
    // Level 11-15: Professional icons (Intermediate)
    11: <InsuranceOutlined {...props} />,
    12: <GoldOutlined {...props} />,
    13: <ApiOutlined {...props} />,
    14: <AppstoreOutlined {...props} />,
    15: <ApartmentOutlined {...props} />,
    
    // Level 16-20: Advanced icons (Advanced)
    16: <TrophyOutlined {...props} />,
    17: <CrownOutlined {...props} />,
    18: <DollarCircleOutlined {...props} />,
    19: <StarFilled {...props} />,
    20: <TrophyFilled {...props} />,
    
    // Level 21-25: Expert icons
    21: <GiftFilled {...props} />,
    22: <BankOutlined {...props} />,
    23: <RobotOutlined {...props} />,
    24: <ControlOutlined {...props} />,
    25: <CloudOutlined {...props} />,
    
    // Level 26-30: Professional icons
    26: <CloudSyncOutlined {...props} />,
    27: <CodeOutlined {...props} />,
    28: <CodeSandboxOutlined {...props} />,
    29: <ClusterOutlined {...props} />,
    30: <FlagOutlined {...props} />,
    
    // Level 31-35: Skilled icons
    31: <DeploymentUnitOutlined {...props} />,
    32: <DatabaseOutlined {...props} />,
    33: <GiftOutlined {...props} />,
    34: <HistoryOutlined {...props} />,
    35: <NodeIndexOutlined {...props} />,
    
    // Level 36-40: Master icons
    36: <HourglassOutlined {...props} />,
    37: <InsuranceOutlined {...props} />,
    38: <TagOutlined {...props} />,
    39: <TagsOutlined {...props} />,
    40: <PushpinOutlined {...props} />,
    
    // Level 41-45: Legendary icons
    41: <RadarChartOutlined {...props} />,
    42: <RiseOutlined {...props} />,
    43: <RobotOutlined {...props} />,
    44: <SafetyCertificateOutlined {...props} />,
    45: <UsbOutlined {...props} />,
    
    // Level 46-50: Elite icons
    46: <SendOutlined {...props} />,
    47: <SettingOutlined {...props} />,
    48: <ShakeOutlined {...props} />,
    49: <SoundOutlined {...props} />,
    50: <StarOutlined {...props} />,
    
    // Level 51-55: Thunderbolt icons
    51: <SketchOutlined {...props} />,
    52: <SyncOutlined {...props} />,
    53: <TagOutlined {...props} />,
    54: <ThunderboltOutlined {...props} />,
    55: <TrophyOutlined {...props} />,
    
    // Level 56-60: Leader icons
    56: <UserSwitchOutlined {...props} />,
    57: <ApiOutlined {...props} />,
    58: <AppstoreOutlined {...props} />,
    59: <BankOutlined {...props} />,
    60: <CloudOutlined {...props} />,
    
    // Level 61-65: Legendary icons
    61: <CodeOutlined {...props} />,
    62: <ControlOutlined {...props} />,
    63: <CrownOutlined {...props} />,
    64: <DatabaseOutlined {...props} />,
    65: <DeploymentUnitOutlined {...props} />,
    
    // Level 66-70: Warrior icons
    66: <DollarCircleOutlined {...props} />,
    67: <ExperimentOutlined {...props} />,
    68: <FireOutlined {...props} />,
    69: <FlagOutlined {...props} />,
    70: <FundOutlined {...props} />,
    
    // Level 71-75: Knight icons
    71: <GiftOutlined {...props} />,
    72: <GoldOutlined {...props} />,
    73: <HistoryOutlined {...props} />,
    74: <HourglassOutlined {...props} />,
    75: <InsuranceOutlined {...props} />,
    
    // Level 76-80: Sultan icons
    76: <NodeIndexOutlined {...props} />,
    77: <PushpinOutlined {...props} />,
    78: <RadarChartOutlined {...props} />,
    79: <RiseOutlined {...props} />,
    80: <RocketOutlined {...props} />,
    
    // Level 81-85: King icons
    81: <SafetyCertificateOutlined {...props} />,
    82: <SendOutlined {...props} />,
    83: <SettingOutlined {...props} />,
    84: <ShakeOutlined {...props} />,
    85: <SketchOutlined {...props} />,
    
    // Level 86-90: Emperor icons
    86: <SoundOutlined {...props} />,
    87: <StarOutlined {...props} />,
    88: <SyncOutlined {...props} />,
    89: <TagOutlined {...props} />,
    90: <ThunderboltOutlined {...props} />,
    
    // Level 91-95: Beast icons
    91: <TrophyOutlined {...props} />,
    92: <CrownTwoTone {...props} twoToneColor="#ffd700" />,
    93: <StarFilled {...props} />,
    94: <GiftFilled {...props} />,
    95: <TrophyFilled {...props} />,
    
    // Level 96-100: Icon icons (elite gold)
    96: <TrophyFilled {...props} />,
    97: <CrownFilled {...props} />,
    98: <StarFilled {...props} />,
    99: <TrophyTwoTone {...props} twoToneColor="#ffd700" />,
    100: <CrownTwoTone {...props} twoToneColor="#ffd700" />
  };
  
  // For levels above 100 (Joker levels), cycle through special icons
  if (level > 100) {
    const jokerIcons = [
      <TrophyTwoTone {...props} twoToneColor="#ff4d4f" />,
      <CrownTwoTone {...props} twoToneColor="#a744ff" />,
      <StarFilled {...props} style={{...props.style, color: '#36cfc9'}} />,
      <TrophyFilled {...props} style={{...props.style, color: '#ffd666'}} />,
      <CrownFilled {...props} style={{...props.style, color: '#ff7a45'}} />
    ];
    
    return jokerIcons[(level - 101) % 5];
  }
  
  // Return the mapped icon or a default for safety
  return iconMapping[level] || <DashboardOutlined {...props} />;
};

/**
 * Get badge component for level
 * @param {number} level - User's level
 * @returns {Object} - Badge styling properties
 */
export const getLevelBadge = (level) => {
  const color = getLevelColor(level);
  return {
    color,
    text: getLevelTierName(level),
    borderColor: color
  };
};

/**
 * Get progress bar styling for level
 * @param {number} level - User's level
 * @returns {Object} - Progress bar styling properties
 */
export const getLevelProgressBar = (level) => {
  return {
    strokeColor: getLevelColor(level),
    trailColor: `${getLevelColor(level)}20`
  };
};
