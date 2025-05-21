const asyncHandler = require('express-async-handler');
const axios = require('axios');
require('dotenv').config();

// Gemini API configuration
const GEMINI_API_KEY = 'AIzaSyAH7GDFSHSr82_uATda-e4bDAltR5Ypm8U';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_MODEL = 'gemini-2.0-flash';

// Simple language detection function
const detectLanguage = (text) => {
  // Check for Arabic characters (Unicode range for Arabic: \u0600-\u06FF)
  const arabicPattern = /[\u0600-\u06FF]/;
  return arabicPattern.test(text) ? 'ar' : 'en';
};

// System prompts for different types in Arabic and English
const getPromptTemplate = (promptType, language, inputText) => {
  const prompts = {
    ar: {
      'enhance': `
        حوّل النص المدخل إلى أمر احترافي (Prompt) يمكن استخدامه للحصول على أفضل وأدق النتائج من نماذج الذكاء الاصطناعي.
        يرجى كتابة الأمر بأسلوب حواري موجّه إلى محترف في المجال ذي الصلة (بناءً على النص المدخل).
        يجب أن يكون الأمر احترافياً ومفصل ويستخدم نغمة تتحدث مباشرةً إلى شخص متخصص وذو خبرة في الموضوع.

        ملاحظات مهمة يجب الإلتزام بها جميعاً بشكل صارم للغاية:
        1- يجب أن تكون النتيجة النهائية باللغة العربية.
        2- يجب أن يكون النص النهائي مكتوباً بخط عادي — وليس بخط عريض.
        3- يجب أن يكون النص النهائي طويل ويحتوي على تفاصيل متقدمة على شكل نقاط.

        4- يجب أن يكون النص النهائي ذات هيكل إحترافي وهو:
        -مقدمة الأمر 'المخاطبة كمحترف'
        -المحتوى 'كافة تفاصيل الأمر على شكل نقاط'
        -النهاية 'التأكيد على الخبرة و توظيفها للإستفادة منها في تنفيذ الطلب'

        5- يجب أن يكون النص النهائي لا يقل عن 500 حرف.
        6- يجب أن يكون النص النهائي لا يزيد عن 1000 حرف
        7- يُمنع منعاً باتاً تقديم أي ردود أو الدخول في محادثة خارج الهدف الرئيسي، وهو تحويل النص المدخل إلى أمر احترافي فقط.

        النص المدخل: ${inputText}`,
      
      'chat': `
        حوّل النص المدخل إلى أمر احترافي (Prompt) يمكن استخدامه للحصول على أفضل وأدق النتائج من نماذج الذكاء الاصطناعي.
        يرجى كتابة الأمر بأسلوب حواري موجّه إلى محترف في المجال ذي الصلة (بناءً على النص المدخل).
        يجب أن يكون الأمر احترافياً ويستخدم نغمة تتحدث مباشرةً إلى شخص متخصص وذو خبرة في الموضوع.

        ملاحظات مهمة يجب الإلتزام بها جميعاً بشكل صارم للغاية:
        1- يجب أن يكون النص النهائي مكتوباً بخط عادي — وليس بخط عريض.
        2- يجب أن يكون النص النهائي بسيط وعلى شكل فقرة بسيطة بدون شرح أو تفصيل.
        3- يجب أن لا يتعدى النص النهائي 300 حرف.
        4- يُمنع منعاً باتاً تقديم أي ردود أو الدخول في محادثة خارج الهدف الرئيسي، وهو تحويل النص المدخل إلى أمر احترافي فقط.

        النص المدخل: ${inputText}`,
      
      'reasoner': `
        حوّل النص المدخل إلى أمر احترافي (Prompt) يمكن استخدامه للحصول على أفضل وأدق النتائج من نماذج الذكاء الاصطناعي.
        يرجى كتابة الأمر بأسلوب حواري موجّه إلى محترف في المجال ذي الصلة (بناءً على النص المدخل).
        يجب أن يكون الأمر احترافياً ومفصل ويستخدم نغمة تتحدث مباشرةً إلى شخص متخصص وذو خبرة في الموضوع.

        ملاحظات مهمة يجب الإلتزام بها جميعاً بشكل صارم للغاية:
        1- يجب أن تكون النتيجة النهائية باللغة العربية.
        2- يجب أن يكون النص النهائي مكتوباً بخط عادي — وليس بخط عريض.
        3- يجب أن يكون النص النهائي طويل ويحتوي على تفاصيل متقدمة على شكل نقاط.

        4- يجب أن يكون النص النهائي ذات هيكل إحترافي وهو:
        -مقدمة الأمر "المخاطبة كمحترف"
        -المحتوى "كافة تفاصيل الأمر على شكل نقاط"
        -النهاية "التأكيد على الخبرة و توظيفها للإستفادة منها في تنفيذ الطلب"

        5- يجب أن يكون النص النهائي لا يقل عن 500 حرف.
        6- يجب أن يكون النص النهائي لا يزيد عن 1000 حرف
        7- يُمنع منعاً باتاً تقديم أي ردود أو الدخول في محادثة خارج الهدف الرئيسي، وهو تحويل النص المدخل إلى أمر احترافي فقط.

        النص المدخل: ${inputText}`,
      
      'image': `
        قم بتحليل دقيق جداً للنص المدخل ثم حوّل النص المدخل إلى أمر احترافي (Prompt) يمكن استخدامه للحصول على أفضل وأدق النتائج من نماذج توليد الصور بالذكاء الاصطناعي.
        يرجى كتابة الأمر (النص النهائي) بالأسلوب التالي:
        (الموضوع: محور الصورة الرئيسي، الوصف: السياق وتفاصيل الموضوع، الأسلوب/الجمالية: النهج الفني والتأطير البصري.)

        ملاحظات مهمة يجب الإلتزام بها جميعاً بشكل صارم للغاية:
        1- يجب أن يكون النص النهائي (باللغة الإنجليزية)
        2- يجب أن يكون النص النهائي مكتوباً بخط عادي — وليس بخط عريض.
        3- يُمنع منعاً باتاً تقديم أي ردود أو الدخول في محادثة خارج الهدف الرئيسي، وهو تحويل النص المدخل إلى أمر احترافي لتوليد الصور فقط.

        النص المدخل: ${inputText}`,
      
      'checker': `
        هذا النص المدخل عبارة عن أمر موجه لنماذج الذكاء الاصطناعي مثل (ChatGPT و Gemini و Grok) ونود تحليل النص المدخل بدقة عالية حسب المعايير التالية، لمعرفة نقاط ضعف الأمر (النص المدخل):

        المعايير:
        1- هل الأمر واضح ومحدد؟
        بمعنى هل الأمر (النص المدخل) تم من خلاله التعبّير عن الطلب بدقة لتوجيه الذكاء الاصطناعي من أجل الحصول على النتيجة المرجوة. لأنه قد تؤدي التوجيهات الغامضة إلى إجابات مبهمة.

        2- هل الأمر يتوفر له سياق؟
        بمعنى هل الأمر (النص المدخل) يقدم معلومات أساسية ذات صلة تساعد الذكاء الاصطناعي على فهم نطاق الطلب وتفاصيله. يمكن أن يشمل ذلك الغرض، أو الجمهور، أو أي تفاصيل محددة تتعلق بالمهمة.

        3- هل الأمر يحتوي في البداية على تحديد الدور أو الشخصية؟
        بمعنى هل الأمر (النص المدخل) يطلب من الذكاء الاصطناعي أن يتولى دوراً أو منظوراً معيناً، مثل "العمل كمحلل بيانات ذي خبرة"، لتخصيص الاستجابات بشكل مناسب.

        4- هل الأمر يحتوي على التنسيق المطلوب؟
        بمعنى هل الأمر (النص المدخل) يحتوي على الطريقة التي يريد بها تقديم المعلومات، سواء على شكل نقاط، أو جدول، أو ملخص موجز، لتعزيز فائدة الاستجابة.

        5- هل الأمر يحتوي على النبرة والجمهور؟
        بمعنى هل الأمر (النص المدخل) موضح به الجمهور المستهدف ونبرة الاستجابة، مثل الرسمية أو غير الرسمية أو التقنية أو المبسطة للقارئ العام.

        -----------------------

        بعد تحليل النص المدخل ومعرفة نقاط ضعفه والمعايير التي تنقصه يرجى ذكرها على شكل قائمة مرقمة

        ملاحظات مهمة يجب الإلتزام بها جميعاً بشكل صارم للغاية:
        1- يجب أن يكون النص النهائي على شكل قائمة مع إستخدام سمايل ❌ كما هو موضح في المثال المرفق.
        2- يجب أن يكون النص النهائي مكتوباً بخط عادي وليس بخط عريض.
        3- يُمنع منعاً باتاً تقديم أي ردود أو الدخول في محادثة خارج الهدف الرئيسي، وهو فحص الأمر المدخل وتحديد نقاط ضعفه فقط.

        4- تحديد مستوى النص المدخل بـ (ضعيف - مقبول - ممتاز) حسب عدد الأخطاء الموجودة في النص المدخل
        إذا كانت عدد الأخطاء: 2 فأكثر = (ضعيف)
        إذا كانت عدد الأخطاء: خطأ واحد = (مقبول)
        إذا كان لا يوجد أي أخطاء حسب المعايير المذكورة = (ممتاز)

        النص المدخل: ${inputText}`
    },

    en: {
      'enhance': `
        Transform the input text into a professional prompt that can be used to obtain the most accurate and high-quality results from AI models.

        Please structure the prompt as if you're addressing a seasoned expert in the relevant domain (based on the input text). The prompt must be professional, detailed, and written in a tone that speaks directly to someone with specialized knowledge and advanced experience in the subject.

        Important notes that must all be adhered to very strictly:
        1- The final result must be written in English only.
        2- The output must be in plain text — do not use bold formatting.
        3- The output must be long, detailed, and presented in a bullet-point format.

        4- The structure must follow this professional layout:
        - Prompt Introduction: address the expert professionally.
        - Prompt Body: include all key details in structured bullet points.
        - Prompt Conclusion: emphasize the expert's role and how their experience should be applied to fulfill the request.

        5- The final text must be at least 500 characters.
        6- The final text must not exceed 1000 characters.

        7- Absolutely no additional responses or conversations are allowed beyond delivering the professional prompt.

        Input text: ${inputText}`,
      
      'chat': `
        Transform the input text into a professional prompt that can be used to obtain the best and most accurate results from AI models.
        Please write the prompt in a conversational style directed at an expert in the relevant field (based on the input text).
        The prompt should be professional and use a tone that directly addresses a knowledgeable and experienced specialist.

        Strict guidelines to follow:
        1- The final text must be written in plain text — no bold formatting.
        2- The final text must be simple and written as a single, straightforward paragraph without explanation or elaboration.
        3- The final text must not exceed 300 characters.
        4- Absolutely no replies or conversation are allowed beyond the main goal, which is to convert the input text into a professional prompt only.

        Input text: ${inputText}`,
      
      'reasoner': `
        Transform the input text into a professional prompt that can be used to obtain the most accurate and high-quality results from AI models.

        Please structure the prompt as if you're addressing a seasoned expert in the relevant domain (based on the input text). The prompt must be professional, detailed, and written in a tone that speaks directly to someone with specialized knowledge and advanced experience in the subject.

        Important notes that must all be adhered to very strictly:
        1- The final result must be written in English only.
        2- The output must be in plain text — do not use bold formatting.
        3- The output must be long, detailed, and presented in a bullet-point format.

        4- The structure must follow this professional layout:
        -Prompt Introduction: address the expert professionally.
        -Prompt Body: include all key details in structured bullet points.
        -Prompt Conclusion: emphasize the expert's role and how their experience should be applied to fulfill the request.

        5- The final text must be at least 500 characters.
        6- The final text must not exceed 1000 characters.

        7- Absolutely no additional responses or conversations are allowed beyond delivering the professional prompt.

        Input text: ${inputText}`,
      
      'image': `
        Carefully analyze the input text, then transform it into a professional prompt that can be used to obtain the best and most accurate results from AI image generation models.
        The final prompt must follow this structure:
        (subject: the main focus of the image, description: the scene and details, style/aesthetic: the artistic direction and visual framing)

        Strict guidelines to follow:
        1- The final result must be written in English only.
        2- The final text must be in plain text — no bold formatting.
        3- Absolutely no replies or conversation are allowed beyond the main goal, which is to convert the input text into a professional prompt for image generation only.

        Input text: ${inputText}`,
      
      'checker': `
        This input is a prompt directed to AI models such as ChatGPT, Gemini, and Grok. We aim to analyze the input prompt thoroughly based on the following criteria to identify its weaknesses:

        Evaluation Criteria:
        1- Is the prompt clear and specific?
        Does the input clearly express the request to guide the AI toward the intended result? Vague instructions may lead to ambiguous answers.

        2- Does the prompt provide context?
        Does the prompt include relevant background information to help the AI understand the scope and intent of the request? This may include the purpose, target audience, or task-related details.

        3- Does the prompt assign a role or persona?
        Does the prompt instruct the AI to adopt a specific role or perspective, such as 'act as an experienced data analyst,' to help customize the response appropriately?

        4- Does the prompt specify the desired format?
        Does it indicate how the information should be delivered—such as bullet points, a table, or a brief summary—to enhance the usefulness of the response?

        5- Does the prompt define tone and audience?
        Does it specify the tone of voice (formal, informal, technical, simplified) and the intended audience to ensure the response matches expectations?

        -----------------------

        After analyzing the prompt, please list any weaknesses or missing criteria in the form of a numbered list.

        Strict guidelines to follow:
        1- The final response must be written as a plain list using the ❌ emoji, as shown in the example below.

        2- The response must be in plain text — no bold formatting.

        3- No replies or conversation outside the main goal are allowed — your task is only to identify the weaknesses in the input prompt.

        4- Assign a quality rating based on the number of issues found:
        2 or more issues = Weak
        1 issue = Acceptable
        0 issues = Excellent

        Input prompt: ${inputText}`
    }
  };

  return prompts[language][promptType];
};

// Helper function to make request to Gemini API
const makeGeminiRequest = async (prompt, temperature = 0.7, maxTokens = 2000) => {
  const apiUrl = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  try {
    const response = await axios.post(apiUrl, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
      }
    });

    // Extract the text from the response
    if (response.data && 
        response.data.candidates && 
        response.data.candidates[0] && 
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts) {
      
      return response.data.candidates[0].content.parts[0].text.trim();
    }

    throw new Error('Invalid response from AI service');
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
};

// Generate AI Prompt - Enhanced
// @desc    Generate enhanced AI prompt
// @route   POST /api/ai/prompts/enhance
// @access  Private
const generateEnhancedPrompt = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    res.status(400);
    throw new Error('Text is required for generating an enhanced prompt');
  }

  try {
    // Detect language of the input text
    const language = detectLanguage(text);
    
    // Get the prompt template
    const promptTemplate = getPromptTemplate('enhance', language, text);
    
    // Make request to Gemini API
    const enhancedPrompt = await makeGeminiRequest(promptTemplate);
    
    res.json({
      success: true,
      enhancedPrompt
    });
    
  } catch (error) {
    console.error('AI enhanced prompt generation error:', error);
    res.status(500);
    throw new Error(`Failed to generate enhanced prompt: ${error.message}`);
  }
});

// Generate AI Prompt - Chat
// @desc    Generate chat-style AI prompt
// @route   POST /api/ai/prompts/chat
// @access  Private
const generateChatPrompt = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    res.status(400);
    throw new Error('Text is required for generating a chat prompt');
  }

  try {
    // Detect language of the input text
    const language = detectLanguage(text);
    
    // Get the prompt template
    const promptTemplate = getPromptTemplate('chat', language, text);
    
    // Make request to Gemini API
    const chatPrompt = await makeGeminiRequest(promptTemplate);
    
    res.json({
      success: true,
      chatPrompt
    });
    
  } catch (error) {
    console.error('AI chat prompt generation error:', error);
    res.status(500);
    throw new Error(`Failed to generate chat prompt: ${error.message}`);
  }
});

// Generate AI Prompt - Reasoner
// @desc    Generate reasoning AI prompt
// @route   POST /api/ai/prompts/reasoner
// @access  Private
const generateReasonerPrompt = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    res.status(400);
    throw new Error('Text is required for generating a reasoning prompt');
  }

  try {
    // Detect language of the input text
    const language = detectLanguage(text);
    
    // Get the prompt template
    const promptTemplate = getPromptTemplate('reasoner', language, text);
    
    // Make request to Gemini API
    const reasonerPrompt = await makeGeminiRequest(promptTemplate);
    
    res.json({
      success: true,
      reasonerPrompt
    });
    
  } catch (error) {
    console.error('AI reasoner prompt generation error:', error);
    res.status(500);
    throw new Error(`Failed to generate reasoning prompt: ${error.message}`);
  }
});

// Generate AI Prompt - Image
// @desc    Generate image AI prompt
// @route   POST /api/ai/prompts/image
// @access  Private
const generateImagePrompt = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    res.status(400);
    throw new Error('Text is required for generating an image prompt');
  }

  try {
    // Detect language of the input text
    const language = detectLanguage(text);
    
    // Get the prompt template
    const promptTemplate = getPromptTemplate('image', language, text);
    
    // Make request to Gemini API
    const imagePrompt = await makeGeminiRequest(promptTemplate);
    
    res.json({
      success: true,
      imagePrompt
    });
    
  } catch (error) {
    console.error('AI image prompt generation error:', error);
    res.status(500);
    throw new Error(`Failed to generate image prompt: ${error.message}`);
  }
});

// Generate AI Prompt - Checker
// @desc    Check and analyze AI prompts
// @route   POST /api/ai/prompts/checker
// @access  Private
const checkPrompt = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text) {
    res.status(400);
    throw new Error('Prompt text is required for checking');
  }

  try {
    // Detect language of the input text
    const language = detectLanguage(text);
    
    // Get the prompt template
    const promptTemplate = getPromptTemplate('checker', language, text);
    
    // Make request to Gemini API with lower temperature for more predictable analysis
    const analysis = await makeGeminiRequest(promptTemplate, 0.3);
    
    // Determine quality rating from the text
    let quality = "unknown";
    
    if (analysis.includes("ضعيف") || analysis.includes("Weak")) {
      quality = "weak";
    } else if (analysis.includes("مقبول") || analysis.includes("Acceptable")) {
      quality = "acceptable";
    } else if (analysis.includes("ممتاز") || analysis.includes("Excellent")) {
      quality = "excellent";
    }
    
    res.json({
      success: true,
      analysis,
      quality
    });
    
  } catch (error) {
    console.error('AI prompt checking error:', error);
    res.status(500);
    throw new Error(`Failed to check prompt: ${error.message}`);
  }
});

// @desc    Save Prompt to Favorites
// @route   POST /api/ai/prompts/favorites
// @access  Private
const savePromptToFavorites = asyncHandler(async (req, res) => {
  const { promptType, promptText, name } = req.body;
  const userId = req.user._id;

  if (!promptType || !promptText || !name) {
    res.status(400);
    throw new Error('Prompt type, text and name are required');
  }

  try {
    // Logic for saving to database would go here
    // For now, we'll just return success
    
    res.json({
      success: true,
      message: 'Prompt saved to favorites',
      favorite: {
        id: Date.now().toString(),
        userId,
        promptType,
        promptText,
        name,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('Save prompt error:', error);
    res.status(500);
    throw new Error(`Failed to save prompt: ${error.message}`);
  }
});

// Helper function to simulate streaming from Gemini API response
// Gemini doesn't support native streaming like DeepSeek, so we need to simulate it
const simulateStreamingResponse = (text, res) => {
  return new Promise((resolve, reject) => {
    try {
      // Determine chunk size - we want to send smaller chunks for a smoother experience
      const words = text.split(' ');
      const chunkSize = Math.max(1, Math.floor(words.length / 20)); // aim for ~20 chunks
      
      // Start streaming chunks
      let index = 0;
      
      const sendNextChunk = () => {
        if (index >= words.length) {
          // Send end marker in a format that won't cause JSON parse errors
          res.write(`data: {"done":true}\n\n`);
          resolve();
          return;
        }
        
        // Get the next chunk of words
        const chunk = words.slice(index, index + chunkSize).join(' ');
        index += chunkSize;
        
        // Send the chunk
        res.write(`data: ${JSON.stringify({ content: chunk + ' ' })}\n\n`);
        
        // Schedule the next chunk with a small delay for more natural streaming
        setTimeout(sendNextChunk, 50);
      };
      
      // Start sending chunks
      sendNextChunk();
      
    } catch (error) {
      console.error('Error in simulating streaming:', error);
      reject(error);
    }
  });
};

// @desc    Stream AI Prompt Response
// @route   POST /api/ai/prompts/stream/:type
// @route   GET /api/ai/prompts/stream/:type
// @access  Private
const streamPromptResponse = asyncHandler(async (req, res) => {
  const { type } = req.params;
  // Check for text in both query parameters (GET) and request body (POST)
  const text = req.query.text || req.body.text;

  if (!text) {
    res.status(400);
    throw new Error('Text is required for generating a prompt');
  }

  // Validate prompt type
  const validTypes = ['enhance', 'chat', 'reasoner', 'image', 'checker'];
  if (!validTypes.includes(type)) {
    res.status(400);
    throw new Error('Invalid prompt type');
  }

  try {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Detect language of the input text
    const language = detectLanguage(text);
    
    // Get the prompt template
    const promptTemplate = getPromptTemplate(type, language, text);
    
    // Set temperature based on prompt type
    const temperature = type === 'checker' ? 0.3 : 0.7;
    
    // Make request to Gemini API
    const apiUrl = `${GEMINI_API_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await axios.post(apiUrl, {
      contents: [{
        parts: [{
          text: promptTemplate
        }]
      }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 2000,
      }
    });

    // Extract the text from the response
    if (response.data && 
        response.data.candidates && 
        response.data.candidates[0] && 
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts) {
      
      const generatedText = response.data.candidates[0].content.parts[0].text.trim();
      
      // Simulate streaming for the client
      await simulateStreamingResponse(generatedText, res);
      
      // End the response after streaming is complete
      res.end();
    } else {
      throw new Error('Invalid response from AI service');
    }

  } catch (error) {
    console.error(`AI ${type} prompt streaming error:`, error);
    
    // Send error as event
    res.write(`data: ${JSON.stringify({ error: `Failed to generate ${type} prompt: ${error.message}` })}\n\n`);
    res.end();
  }
});

module.exports = {
  generateEnhancedPrompt,
  generateChatPrompt,
  generateReasonerPrompt,
  generateImagePrompt,
  checkPrompt,
  savePromptToFavorites,
  streamPromptResponse
};