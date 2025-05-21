const asyncHandler = require('express-async-handler');
const axios = require('axios');
const User = require('../models/User');
const AccessToken = require('../models/AccessToken');
require('dotenv').config();

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyAH7GDFSHSr82_uATda-e4bDAltR5Ypm8U'; // API key from the task
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.0-flash'; // Model specified in the task

// Simple language detection function
const detectLanguage = (text) => {
  // Check for Arabic characters (Unicode range for Arabic: \u0600-\u06FF)
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text) ? 'arabic' : 'english';
};

// @desc    Extract Facebook Access Token
// @route   POST /api/ai/extract-facebook-token
// @access  Private
const extractFacebookToken = asyncHandler(async (req, res) => {
  const { username, password, fa2 } = req.body;

  if (!username || !password || !fa2) {
    res.status(400);
    throw new Error('الرجاء إدخال جميع الحقول المطلوبة');
  }

  try {
    // Attempt to get token using external service
    const encodedUsername = encodeURIComponent(username);
    const encodedPassword = encodeURIComponent(password);
    const encodedFA2 = encodeURIComponent(fa2);
    
    // Log request attempt (without sensitive data)
    console.log(`Attempting to extract token for user: ${req.user.email}`);
    
    // Define possible service endpoints to try
    const serviceEndpoints = [
      `https://xelo.tools/JokerApp/access-token-2FA.php?FA2=${encodedFA2}&country=EG&password=${encodedPassword}&username=${encodedUsername}&clientCountry=EG&ip=`,
      // Fallback URL if the first one fails
      `https://xelo.tools/access-token-2FA.php?FA2=${encodedFA2}&country=EG&password=${encodedPassword}&username=${encodedUsername}&clientCountry=EG`
    ];

    let token = null;
    let serviceError = null;
    
    // Try each endpoint until we get a valid response
    for (const endpoint of serviceEndpoints) {
      try {
        const response = await axios.get(endpoint, { 
          timeout: 15000, // 15 second timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        console.log('Token service response type:', typeof response.data);
        
        // Process the response based on its type
        if (response.data) {
          if (typeof response.data === 'string' && response.data.trim() !== '') {
            token = response.data.trim();
            break; // Valid token found
          } else if (typeof response.data === 'object') {
            // Try to extract token from object response
            if (response.data.access_token) {
              token = response.data.access_token;
              break;
            } else if (response.data.token) {
              token = response.data.token;
              break;
            } else {
              // If none of the expected fields are present, convert object to string as fallback
              const objectString = JSON.stringify(response.data);
              if (objectString && objectString.length > 20) { // Basic validation of token-like string
                token = objectString;
                break;
              }
            }
          }
        }
      } catch (error) {
        serviceError = error;
        console.error(`Error with endpoint ${endpoint}:`, error.message);
        // Continue to next endpoint
      }
    }

    if (!token) {
      // If all external services failed, create a simulated dummy token (for testing only)
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: Creating dummy token for testing');
        token = `FB.${Math.random().toString(36).substring(2, 15)}.${Math.random().toString(36).substring(2, 15)}`;
      } else {
        // In production, return error if all services failed
        res.status(500);
        throw new Error('فشل في الحصول على رمز الوصول. يرجى المحاولة مرة أخرى لاحقًا.');
      }
    }

    // Return the extracted token
    res.json({ 
      success: true, 
      token: token,
      message: 'تم استخراج رمز الوصول بنجاح'
    });
    
  } catch (error) {
    console.error('Token extraction error:', error);
    res.status(500);
    throw new Error(`فشل في استخراج رمز الوصول: ${error.message}`);
  }
});

// @desc    Save Facebook Access Token
// @route   POST /api/ai/save-facebook-token
// @access  Private
const saveFacebookToken = asyncHandler(async (req, res) => {
  const { token, name } = req.body;

  if (!token) {
    res.status(400);
    throw new Error('الرجاء إدخال رمز الوصول');
  }

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error('المستخدم غير موجود');
    }

    // Check if token already exists for this user
    const existingToken = await AccessToken.findOne({
      userId: user._id,
      token: token
    });

    if (existingToken) {
      // If token exists but has a different name, update it
      if (name && existingToken.name !== name) {
        existingToken.name = name;
        await existingToken.save();
        
        return res.json({
          success: true,
          message: 'تم تحديث اسم رمز الوصول بنجاح',
          token: existingToken
        });
      }
      
      return res.json({
        success: true,
        message: 'رمز الوصول مسجل بالفعل',
        token: existingToken
      });
    }

    // Create new token record
    const tokenName = name || `رمز وصول ${new Date().toLocaleDateString('ar-EG')}`;
    
    const newToken = new AccessToken({
      userId: user._id,
      token: token,
      name: tokenName,
      fbName: "Facebook User" // Will be updated when token is used
    });

    await newToken.save();
    
    // Set as active if this is the first token
    const tokenCount = await AccessToken.countDocuments({ userId: user._id });
    if (tokenCount === 1) {
      newToken.isActive = true;
      await newToken.save();
      
      // Update user record with this token
      user.accessToken = token;
      await user.save();
    }

    res.status(201).json({
      success: true,
      message: 'تم حفظ رمز الوصول بنجاح',
      token: newToken
    });
  } catch (error) {
    console.error('Save token error:', error);
    res.status(500);
    throw new Error(`فشل في حفظ رمز الوصول: ${error.message}`);
  }
});

// @desc    Generate content suggestions using Gemini AI
// @route   POST /api/ai/suggestions
// @access  Private
const generateSuggestions = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    res.status(400);
    throw new Error('Text is required for generating suggestions');
  }

  try {
    // Detect language of the input text
    const language = detectLanguage(text);
    
    // Construct the Gemini API request
    const apiUrl = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    // Prepare language-specific prompts
    let prompt;
    if (language === 'arabic') {
      prompt = `
        أنت خبير محتوى متخصص في الغاية في تحليل النصوص وفهم مجالاتها بشكل دقيق وإنتاج محتوى احترافي بأعلى مستويات الجودة.
        
        المهمة: قم أولاً بتحليل النص المدخل وتحديد مجاله بدقة (تسويق، تعليم، تقنية، طب، الخ)، ثم قم بتوليد 3 اقتراحات بديلة مع الحفاظ على المعنى الأساسي.
        
        معايير الصياغة المطلوبة:
        - تنسيق النص بشكل احترافي متناسق مع استخدام الفقرات والتنسيقات المناسبة
        - إضافة الرموز أو الإيموجي المناسبة للمجال إذا كان ذلك يحسن من عرض المحتوى (مثلاً: ✅، 📊، 🚀، 📱، الخ)
        - استخدام اللغة الرسمية والمصطلحات المتخصصة المناسبة لمجال النص
        - مراعاة الأسلوب والنبرة المثالية للجمهور المستهدف في هذا المجال
        - استخدام ترتيب منطقي للأفكار مع روابط انتقالية سلسة
        - تنظيم النص بأسطر واضحة ومنسقة بشكل احترافي
        - استخدام العناوين الفرعية والنقاط عند الحاجة للتوضيح
        
        تنبيه هام: احرص على تقديم النص المقترح فقط بدون أي كلمات تمهيدية أو تعليقات أو ملاحظات. لا تكتب "الاقتراح الأول" أو "البديل" أو أي عبارات توضيحية. لا تستخدم عبارات مثل "إليك اقتراحي" أو "يمكنك استخدام". قدم النص المقترح فقط بصورته النهائية الاحترافية.
        
        النص الأصلي: ${text}
      `;
    } else {
      prompt = `
        You are a highly specialized content expert with exceptional skills in analyzing text, understanding its domain, and producing professional content of the highest quality.
        
        Task: First, analyze the input text and precisely determine its domain (marketing, education, technology, medicine, etc.), then generate 3 alternative suggestions while preserving the core meaning.
        
        Required formatting standards:
        - Format the text professionally with appropriate paragraphs and formatting
        - Add relevant icons or emojis if they enhance content presentation (e.g., ✅, 📊, 🚀, 📱, etc.)
        - Use formal language and specialized terminology appropriate to the text's domain
        - Consider the ideal tone and style for the target audience in this field
        - Use logical idea ordering with smooth transitions
        - Organize text with clear, professionally formatted lines
        - Use subheadings and bullet points when needed for clarity
        
        CRITICAL INSTRUCTION: Provide ONLY the suggested text with no introductory words, comments, or notes. Do NOT include phrases like "Suggestion 1" or "Alternative" or any explanatory statements. Do NOT use phrases like "Here's my suggestion" or "You can use". Present only the final professional text.
        
        Original text: ${text}
      `;
    }

    const response = await axios.post(apiUrl, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    });

    // Extract the suggestions from the response
    let suggestions = [];
    if (response.data && 
        response.data.candidates && 
        response.data.candidates[0] && 
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts) {
      
      // Get the full text from the response
      const fullText = response.data.candidates[0].content.parts[0].text;
      
      // Clean the response: remove any text that looks like instructions, numbering, or meta-commentary
      const cleanText = fullText
        .replace(/^(suggestion|alternative|option|example)\s*\d*\s*:?\s*/gim, '') // Remove any "Suggestion 1:" type text
        .replace(/^(here'?s?|the following is|i suggest|you can use)\s/gim, '') // Remove any "Here is" or "I suggest" type text
        .replace(/^[\d\.\-\*]+\s/gm, ''); // Remove any numbered or bulleted list markers
      
      // Split the text into separate suggestions while preserving internal line breaks
      // First try to identify natural boundaries in the AI's response
      const possibleBoundaries = [
        /(?:\n\s*\n\s*\n)/, // Triple line breaks (strong boundary)
        /(?:\n\s*\n)(?=[A-Z]|[\u0600-\u06FF]|\d|\*|•|✅|📊|🚀)/, // Double line break followed by uppercase letter, Arabic letter, digit, or common marker
        /\n(?=[A-Z]|[\u0600-\u06FF])(?![a-z]|[\u0600-\u06FF])/, // New line followed by uppercase letter or Arabic letter, not followed by lowercase
        /\n(?=\d+\.\s|\*\s|•\s|✅\s|📊\s|🚀\s)/, // New line followed by numbered list, bullet points, or emoji markers
      ];
      
      // Try each boundary pattern from strongest to weakest until we get 2-4 suggestions
      let candidateSuggestions = [];
      let foundGoodBoundary = false;
      
      for (const pattern of possibleBoundaries) {
        // Split but preserve the original formatting including empty lines within each suggestion
        candidateSuggestions = cleanText.split(pattern)
          .filter(text => text.trim().length > 10); // Only consider non-trivial content
        
        if (candidateSuggestions.length >= 2 && candidateSuggestions.length <= 4) {
          foundGoodBoundary = true;
          break;
        }
      }
      
      // If we still don't have good suggestions, use simple paragraph breaks
      if (!foundGoodBoundary || candidateSuggestions.length < 2) {
        candidateSuggestions = cleanText.split(/\n{2,}/)
          .filter(text => text.trim().length > 10);
      }
      
      // Last resort: if we still don't have proper suggestions, use the whole text as one suggestion
      if (candidateSuggestions.length === 0) {
        candidateSuggestions = [cleanText];
      }
      
      // Prepare final suggestions, limiting to 3 max
      suggestions = candidateSuggestions.slice(0, 3).map(text => {
        // Ensure we preserve empty lines within each suggestion
        return text.trim();
      });
    }

    res.json({
      success: true,
      suggestions: suggestions
    });
    
  } catch (error) {
    console.error('AI suggestion generation error:', error);
    res.status(500);
    throw new Error(`فشل في توليد الاقتراحات: ${error.message}`);
  }
});

// @desc    Rephrase text using Gemini AI
// @route   POST /api/ai/rephrase
// @access  Private
const rephraseText = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    res.status(400);
    throw new Error('Text is required for rephrasing');
  }

  try {
    // Detect language of the input text
    const language = detectLanguage(text);
    
    // Construct the Gemini API request
    const apiUrl = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    // Prepare language-specific prompts
    let prompt;
    if (language === 'arabic') {
      prompt = `
        أنت محترف متخصص في إعادة صياغة المحتوى بأعلى مستويات الاحترافية في جميع المجالات.
        
        المهمة: أولاً، حلل النص المدخل وحدد مجاله بدقة، ثم قم بإعادة صياغته بصورة تحافظ على هويته المهنية وتعزز من جودته.
        
        معايير الصياغة المطلوبة:
        - تنسيق النص بشكل فائق الاحترافية مع استخدام الفقرات والترقيم حيثما يناسب
        - إضافة أيقونات أو رموز مناسبة لتعزيز القراءة في المجال المحدد (مثل ✅، 📊، 🚀، ⚠️، الخ)
        - تطبيق مبادئ التصميم النصي المتميز (تباعد، تنظيم، تسلسل منطقي)
        - استخدام المصطلحات التخصصية المناسبة للمجال بدقة عالية
        - تعزيز الانسيابية وسهولة القراءة مع الحفاظ على العمق المهني
        - إضافة تنسيقات إبراز للنقاط الرئيسية أو الحقائق المهمة
        - الحفاظ على أي أرقام، إحصائيات، أو بيانات مهمة
        - تقديم النص بأسطر واضحة ومنظمة ومنسقة بشكل احترافي
        
        تعليمات حاسمة: قدم النص المعاد صياغته فقط دون أي عبارات مقدمة أو تعليقات أو ملاحظات. لا تكتب عبارات مثل "النص المعاد صياغته" أو "إليك إعادة الصياغة" أو "يمكنك استخدام" أو أي تعبيرات شرح. قدم النص المنسق النهائي فقط كأنه جاهز للنشر مباشرة.
        
        النص الأصلي: ${text}
      `;
    } else {
      prompt = `
        You are a professional specialist in content rephrasing with the highest levels of professionalism across all domains.
        
        Task: First, analyze the input text and determine its domain precisely, then rephrase it in a way that maintains its professional identity and enhances its quality.
        
        Required formatting standards:
        - Format the text with superior professionalism using paragraphs and numbering where appropriate
        - Add suitable icons or symbols to enhance readability in the specific domain (such as ✅, 📊, 🚀, ⚠️, etc.)
        - Apply principles of excellent textual design (spacing, organization, logical sequence)
        - Use domain-specific terminology with high precision
        - Enhance flow and readability while maintaining professional depth
        - Add formatting highlights for key points or important facts
        - Preserve any important numbers, statistics, or data
        - Present text with clear, organized, and professionally formatted lines
        
        CRITICAL INSTRUCTIONS: Provide ONLY the rephrased text without any introductory phrases or explanatory comments. Do NOT include phrases like "Rephrased text:" or "Here's the rephrasing" or "You can use". Deliver only the final formatted text as if ready for immediate publication.
        
        Original text: ${text}
      `;
    }

    const response = await axios.post(apiUrl, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: 0.4, // Lower temperature for more focused output
        maxOutputTokens: 1024,
      }
    });

    // Extract the rephrased text from the response
    let rephrasedText = '';
    if (response.data && 
        response.data.candidates && 
        response.data.candidates[0] && 
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts) {
      
      // Get the raw text from the response
      let rawText = response.data.candidates[0].content.parts[0].text.trim();
      
      // Clean the response: remove any text that looks like instructions or meta-commentary
      rephrasedText = rawText
        .replace(/^(rephrased|edited|revised)\s*(text|version|content)?\s*:?\s*/i, '') // Remove "Rephrased text:" type openings
        .replace(/^(here'?s?|the following is|i've rephrased)\s/i, '') // Remove "Here is" or "I've rephrased" type openings
        .replace(/^[\d\.\-\*]+\s/gm, '') // Remove any numbered or bulleted list markers at start of lines
        .trim();
    }

    if (!rephrasedText) {
      throw new Error('لم يتم استلام رد من خدمة إعادة الصياغة');
    }

    res.json({
      success: true,
      rephrasedText: rephrasedText
    });
    
  } catch (error) {
    console.error('AI text rephrasing error:', error);
    res.status(500);
    throw new Error(`فشل في إعادة صياغة النص: ${error.message}`);
  }
});

module.exports = {
  extractFacebookToken,
  saveFacebookToken,
  generateSuggestions,
  rephraseText
};